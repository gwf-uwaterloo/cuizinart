from os import listdir
from os.path import isfile, join
import sys

import netCDF4
import numpy as np
from netCDF4 import Dataset, date2index
from pyspark import SparkContext
from dateutil.parser import parse
from datetime import time, timedelta, datetime
import geopyspark as gps
from shapely.geometry import Polygon


def open_file(path):
    return Dataset(path, "r", format="NETCDF4")


def get_indexes(lat_array, lon_array, shape, lat, lon):
    flattened_lat = lat_array[:].flatten()
    flattened_lon = lon_array[:].flatten()

    index = (np.square(flattened_lat - lat) + np.square(flattened_lon - lon)).argmin()

    return int(index / shape[1]), index % shape[1]  # y,x


def get_bounding_box_polygon(lat_array, lon_array, shape, polygon_extent):
    # Transforms a lat/lon-polygon to x/y-coordinates
    # todo: verify correctness
    y_slice_start, x_slice_start = get_indexes(lat_array, lon_array, shape, polygon_extent.xmin, polygon_extent.ymin)
    y_slice_stop, x_slice_stop = get_indexes(lat_array, lon_array, shape, polygon_extent.xmax, polygon_extent.ymax)

    print("{} {}".format(x_slice_start, x_slice_stop))
    print("{} {}".format(y_slice_start, y_slice_stop))

    return x_slice_start, x_slice_stop, y_slice_start, y_slice_stop


def read_input(path):
    return open_file(path)


def process_query(lat_min, lat_max, lon_min, lon_max, date_range, request_variables, spark_ctx):
    request_vars = request_variables.split(',')

    nc_base_path = 'data'
    nc_files = [nc_base_path + '/' + f for f in listdir(nc_base_path) if
                isfile(join(nc_base_path, f)) and f.endswith('.nc')]

    request_date_range = date_range.split(",")
    request_start_date = parse(request_date_range[0]).date()
    request_end_date = parse(request_date_range[1]).date()
    print("Request time range: {} - {}".format(request_start_date, request_end_date))
    print("Request variables: {}".format(request_vars))

    files_to_analyze = dict()
    for f in nc_files:
        nc_file = open_file(f)
        file_vars = nc_file.variables.keys()
        print("File {} has variables {}".format(f, file_vars))

        file_time_range = nc_file['time'][:]
        file_start_date = (datetime(1990, 1, 1, 0, 0) + timedelta(hours=float(file_time_range.min()))).date()
        file_end_date = (datetime(1990, 1, 1, 0, 0) + timedelta(hours=float(file_time_range.max()))).date()
        print("File has time range {} - {}".format(file_start_date, file_end_date))

        if file_start_date <= request_end_date and file_end_date >= request_start_date:
            contained_vars = set(request_vars).intersection(file_vars)
            for v in contained_vars:
                if v not in files_to_analyze:
                    files_to_analyze[v] = [f]
                else:
                    files_to_analyze[v] = files_to_analyze[v].append(f)

    print("Matching files: {}".format(files_to_analyze))

    #conf = gps.geopyspark_conf(appName="gwf", master="local[*]")
    #conf.set("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
    #conf.set("spark.kryo.registrator", "geotrellis.spark.io.kryo.KryoRegistrator")
    #conf.set("spark.kryo.unsafe", "true")
    #conf.set("spark.rdd.compress", "true")
    #conf.set("spark.ui.enabled", "false")
    #sc = SparkContext(conf=conf)

    #polygon_array = np.array(polygon_coords)
    #lat_min = polygon_array[:,1].min()
    #lat_max = polygon_array[:,1].max()
    #lon_min = polygon_array[:,0].min()
    #lon_max = polygon_array[:,0].max()
    bounding_box = gps.Extent(lat_min, lon_min, lat_max, lon_max)

    def process(var_name, nc_file_list):
        print("variable: {}, files {}".format(var_name, nc_file_list))

        # At some point, we'll want to support partitioned files. For now, just take the first one.
        nc_file = open_file(nc_file_list[0])

        lat_array = nc_file['lat']
        lon_array = nc_file['lon']

        no_data_value = nc_file[var_name].getncattr('_FillValue')

        # Get x/y-range
        (xSliceStart, xSliceStop, ySliceStart, ySliceStop) = get_bounding_box_polygon(lat_array, lon_array,
                                                                                      lon_array.shape,
                                                                                      bounding_box)
        x = xSliceStop - xSliceStart + 1
        y = ySliceStop - ySliceStart + 1
        print("x: {}, y: {}, {}".format(x, y, (xSliceStart, xSliceStop, ySliceStart, ySliceStop)))

        # Get indices of the request's time range
        start_time_index, end_time_index = date2index([datetime.combine(request_start_date, time(0, 0)),
                                                       datetime.combine(request_end_date, time(0, 0))],
                                                      nc_file['time'])

        print("time slice indices: {} - {}".format(start_time_index, end_time_index))

        # Read the section specified by the request (i.e. specified time and x/y-location)
        variable = nc_file[var_name]
        var_data = variable[start_time_index:end_time_index+1, ySliceStart:ySliceStop+1, xSliceStart:xSliceStop+1]
        var_long_name = variable.getncattr('long_name')
        var_unit = variable.getncattr('units')
        var_temp_resolution = variable.getncattr('temporal_resolution')
        x_coords = nc_file['x'][xSliceStart:xSliceStop+1]
        y_coords = nc_file['y'][ySliceStart:ySliceStop+1]
        lats = nc_file['lat'][ySliceStart:ySliceStop+1, xSliceStart:xSliceStop+1]
        lons = nc_file['lon'][ySliceStart:ySliceStop+1, xSliceStart:xSliceStop+1]
        start_instant = datetime.combine(request_start_date, time(0, 0))
        end_instant = datetime.combine(request_end_date, time(0, 0))

        proj_var = nc_file.get_variables_by_attributes(grid_mapping_name = lambda v: v is not None)[0]
        metadata = {attr: nc_file.getncattr(attr) for attr in nc_file.ncattrs()}
        generate_output_netcdf('gddp{}{}.nc'.format(var_name, date_range.replace(',','-')), x_coords, y_coords, lats,
                               lons, start_instant, end_instant, var_name, var_long_name, var_unit, var_temp_resolution,
                               var_data, no_data_value, metadata, proj_var)

        #bounds = gps.Bounds(gps.SpaceTimeKey(col=0, row=0, instant=start_instant),
        #                    gps.SpaceTimeKey(col=0, row=0, instant=end_instant))
        #layout = gps.TileLayout(1, 1, x, y)
        #layout_definition = gps.LayoutDefinition(bounding_box, layout)
        #metadata = gps.Metadata(
        #    bounds=bounds,
        #    crs='+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +a=6378137 +b=6378137 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs ',
        #    cell_type='float32ud-1.0',
        #    extent=bounding_box,
        #    layout_definition=layout_definition)

        #tile = gps.Tile.from_numpy_array(variable, no_data_value)
        ##polygon_shape = Polygon(polygon_array)
        #extent = gps.TemporalProjectedExtent(extent=bounding_box, epsg=3857, instant=start_instant)
        #rdd = spark_ctx.parallelize([(extent, tile)])
        #
        ##raster_layer = gps.TiledRasterLayer.from_numpy_rdd(layer_type=gps.LayerType.SPACETIME,
        ##                                                   numpy_rdd=rdd, metadata=metadata)
        #raster_layer = gps.RasterLayer.from_numpy_rdd(gps.LayerType.SPACETIME, numpy_rdd=rdd)
        #
        #histogram = raster_layer.get_histogram()
        #color_ramp = [0x2791C3FF, 0x5DA1CAFF, 0x83B2D1FF, 0xA8C5D8FF,
        #              0xCCDBE0FF, 0xE9D3C1FF, 0xDCAD92FF, 0xD08B6CFF,
        #              0xC66E4BFF, 0xBD4E2EFF]
        #color_map = gps.ColorMap.from_histogram(histogram, color_ramp)
        #
        ## Write image to file
        #png = raster_layer.to_png_rdd(color_map).collect()
        #with open('gddp{}{}.png'.format(var_name, date_range.replace(',','-')),'wb') as f:
        #    f.write(png[0][1])

    #rdd = spark_ctx.parallelize(zip(files_to_analyze.keys(), files_to_analyze.values()).map(lambda x: spark_process(x[0],x[1]))
    for var_name in files_to_analyze.keys():
        process(var_name, files_to_analyze[var_name])
    #rdd.persist()
    #rdd.foreach(lambda s: print(s))

    #spark_ctx.stop()


def generate_output_netcdf(path, x_coords, y_coords, lats, lons, start_datetime, end_datetime, var_name, var_long_name,
                           var_unit, var_temp_resolution, variable, no_data_value, meta, proj_var,
                           lat_name='lat', lon_name='lon', dim_x_name = 'x', dim_y_name = 'y'):

    out_nc = netCDF4.Dataset(path, 'w')

    # define dimensions
    out_nc.createDimension(dim_x_name, variable.shape[2])
    out_nc.createDimension(dim_y_name, variable.shape[1])
    out_nc.createDimension('time', None)

    grid_map_name = proj_var.getncattr('grid_mapping_name')
    proj_units = proj_var.getncattr('units')

    # create variables
    # original coordinate variables
    proj_x = out_nc.createVariable('x', x_coords.dtype, (dim_x_name, ))
    proj_x.units = proj_units
    proj_x.standard_name = 'projection_x_coordinate'
    proj_x.long_name = 'x coordinate of projection'
    proj_x[:] = x_coords

    proj_y = out_nc.createVariable('y', x_coords.dtype, (dim_y_name, ))
    proj_y.units = proj_units
    proj_y.standard_name = 'projection_y_coordinate'
    proj_y.long_name = 'y coordinate of projection'
    proj_y[:] = y_coords

    # auxiliary coordinate variables lat and lon
    lat = out_nc.createVariable(lat_name, 'f4', (dim_y_name, dim_x_name, ))
    lat.units = 'degrees_north'
    lat.standard_name = 'latitude'
    lat.long_name = 'latitude coordinate'
    lat[:] = lats[:]

    lon = out_nc.createVariable(lon_name, 'f4', (dim_y_name, dim_x_name, ))
    lon.units = 'degrees_east'
    lon.standard_name = 'longitude'
    lon.long_name = 'longitude coordinate'
    lon[:] = lons[:]

    # time variable
    var_time = out_nc.createVariable('time', 'i4', ('time', ))
    var_time.units = 'hours since 1990-01-01 00:00:00'
    var_time.calendar = 'gregorian'
    var_time.standard_name = 'time'
    var_time.axis = 'T'

    # data for time variable
    var_time[:] = netCDF4.date2num([start_datetime], units=var_time.units, calendar=var_time.calendar)

    # grid mapping variable
    grid_map = out_nc.createVariable(grid_map_name, 'c', )
    for attr in proj_var.ncattrs():
        grid_map.setncattr(attr, proj_var.getncattr(attr))

    # create data variable
    var_data = out_nc.createVariable(var_name, variable.dtype, ('time', dim_y_name, dim_x_name, ),
                                     fill_value=no_data_value)

    var_data.units = var_unit
    var_data.long_name = var_long_name
    var_data.coordinates = '{} {}'.format(lat_name, lon_name)
    var_data.grid_mapping = grid_map_name

    # assign the masked array to data variable
    data = np.ma.masked_invalid(variable)
    data.set_fill_value(no_data_value)
    var_data[:] = data

    # temporal resolution attribute for the data variable
    var_data.setncattr('temporal_resolution', var_temp_resolution)

    meta.pop('DATETIME', None)
    meta.pop('DOCUMENTNAME', None)
    out_nc.setncatts(meta)

    out_nc.close()
