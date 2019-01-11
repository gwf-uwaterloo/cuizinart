from os import listdir
from os.path import isfile, join
import sys
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

        no_data = nc_file[var_name].getncattr('_FillValue')

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
        array = nc_file[var_name][start_time_index:end_time_index+1, ySliceStart:ySliceStop+1, xSliceStart:xSliceStop+1]

        #proj = nc_file['lambert_azimuthal_equal_area'].getncattr('crs_wkt')
        #instant = datetime.combine(request_start_date, time(0, 0))
        #bounds = gps.Bounds(gps.SpaceTimeKey(col=0, row=0, instant=instant),
        #                    gps.SpaceTimeKey(col=0, row=0, instant=instant))
        #layout=gps.TileLayout(1, 1, x, y)
        #layout_definition = gps.LayoutDefinition(polygon_extent, layout)
        #metadata = gps.Metadata(bounds=bounds, crs='+proj=longlat +datum=WGS84 +no_defs ',
        #                        cell_type='float32ud-1.0', extent=polygon_extent, layout_definition=layout_definition)

        tile = gps.Tile.from_numpy_array(array, no_data)
        #polygon_shape = Polygon(polygon_array)
        extent = gps.ProjectedExtent(extent=bounding_box, epsg=3857)
        rdd = spark_ctx.parallelize([(extent, tile)])
        raster_layer = gps.RasterLayer.from_numpy_rdd(gps.LayerType.SPATIAL, numpy_rdd=rdd)

        histogram = raster_layer.get_histogram()
        color_ramp = [0x2791C3FF, 0x5DA1CAFF, 0x83B2D1FF, 0xA8C5D8FF,
                      0xCCDBE0FF, 0xE9D3C1FF, 0xDCAD92FF, 0xD08B6CFF,
                      0xC66E4BFF, 0xBD4E2EFF]
        color_map = gps.ColorMap.from_histogram(histogram, color_ramp)

        # Write image to file
        png = raster_layer.to_png_rdd(color_map).collect()
        with open('gddp{}{}.png'.format(var_name, date_range.replace(',','-')),'wb') as f:
            f.write(png[0][1])


    #rdd = spark_ctx.parallelize(zip(files_to_analyze.keys(), files_to_analyze.values()).map(lambda x: spark_process(x[0],x[1]))
    for var_name in files_to_analyze.keys():
        process(var_name, files_to_analyze[var_name])
    #rdd.persist()
    #rdd.foreach(lambda s: print(s))

    #spark_ctx.stop()
