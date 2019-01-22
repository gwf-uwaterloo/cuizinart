from os import listdir
from os.path import isfile, join

import netCDF4
import numpy as np
from netCDF4 import Dataset, date2index, num2date
from dateutil.parser import parse
from datetime import time, timedelta, datetime
from dateutil.relativedelta import relativedelta
import geopyspark as gps
from shapely.geometry import Polygon


def open_file(path):
    return Dataset(path, 'r', format='NETCDF4')


def get_indexes(lat_array, lon_array, shape, lat, lon):
    flattened_lat = lat_array.flatten()
    flattened_lon = lon_array.flatten()

    index = (np.square(flattened_lat - lat) + np.square(flattened_lon - lon)).argmin()

    return int(index / shape[1]), int(index % shape[1])  # y, x


def get_bounding_box_polygon(lat_array, lon_array, shape, polygon_extent):
    # Transforms a lat/lon-polygon to x/y-coordinates
    # todo: investigate better ways
    y_slice_start, x_slice_start = get_indexes(lat_array, lon_array, shape, polygon_extent.ymin, polygon_extent.xmin)
    y_slice_stop, x_slice_stop = get_indexes(lat_array, lon_array, shape, polygon_extent.ymax, polygon_extent.xmax)

    return x_slice_start, x_slice_stop, y_slice_start, y_slice_stop


def process_query(input_file, geojson_shape, start_time, end_time, request_vars, spark_ctx):

    nc_base_path = 'data/converted_netcdf'
    nc_file_name = nc_base_path + '/' + input_file

    if not nc_file_name.endswith('.nc') or not isfile(nc_file_name):
        raise Exception('No appropriate product file found.')

    request_start_date = parse(start_time).date()
    request_end_date = parse(end_time).date()
    print('Request time range: {} - {}'.format(request_start_date, request_end_date))
    print('Request variables: {}'.format(request_vars))

    nc_file = open_file(nc_file_name)
    file_vars = nc_file.variables.keys()

    file_time_range = nc_file['time'][:]
    file_start_date = (datetime(1990, 1, 1, 0, 0) + timedelta(hours=float(file_time_range.min()))).date()
    file_end_date = (datetime(1990, 1, 1, 0, 0) + timedelta(hours=float(file_time_range.max()))).date()

    if file_start_date <= request_end_date <= file_end_date \
            or file_start_date <= request_start_date <= file_end_date:
        if all(v in file_vars for v in request_vars):
            if request_start_date < file_start_date:
                request_start_date = file_start_date
            if request_end_date > file_end_date:
                request_end_date = file_end_date

        else:
            raise Exception('Product does not contain all variables.')
    else:
        raise Exception('No matching files found.')
    print('Matched file: {} and period {} - {}'.format(nc_file_name, request_start_date, request_end_date))

    lat_array = nc_file['lat'][:]
    lon_array = nc_file['lon'][:]

    nc_metadata = {attr: nc_file.getncattr(attr) for attr in nc_file.ncattrs()}
    proj_var = nc_file.get_variables_by_attributes(grid_mapping_name=lambda v: v is not None)[0]
    if proj_var.name == 'lambert_azimuthal_equal_area':
        crs = '+proj=laea +lat_0=90 +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m no_defs'
    else:
        raise Exception('Unsupported projection: {}'.format(proj_var))

    # Transform the geojson into shapes. We need the shapes represented both as
    # indices in the lat-/lon-arrays (to read only the required slices from netcdf)
    # and as x-/y-values (to mask the constructed layout).
    x_coords = nc_file['x'][:]
    y_coords = nc_file['y'][:]
    mask_shapes_indices = []
    mask_shapes_xy = []
    for feature in geojson_shape:
        # Get each vertex's index in the lat- and lon-arrays
        vertex_indices = np.array(list(get_indexes(lat_array, lon_array, lon_array.shape,
                                                   vertex[1], vertex[0])
                                       for vertex in feature['geometry']['coordinates'][0]))
        mask_shapes_indices.append(vertex_indices)

        # Get the corresponding x and y values
        vertex_xs = x_coords[np.array(vertex_indices)[:, 1]]
        vertex_ys = y_coords[np.array(vertex_indices)[:, 0]]

        # Transform into a polygon
        polygon = Polygon(zip(vertex_xs, vertex_ys))
        mask_shapes_xy.append(polygon)

    # Get the slices to read from netcdf
    y_slice_start = int(min(s[:, 0].min() for s in mask_shapes_indices))
    x_slice_start = int(min(s[:, 1].min() for s in mask_shapes_indices))
    y_slice_stop = int(max(s[:, 0].max() for s in mask_shapes_indices))
    x_slice_stop = int(max(s[:, 1].max() for s in mask_shapes_indices))

    # Get indices of the request's time range
    file_instants = num2date(nc_file['time'][:], nc_file['time'].getncattr('units'), nc_file['time'].getncattr('calendar'))
    start_instant = file_instants[file_instants <= datetime.combine(request_start_date, time(0, 0))][-1]
    end_instant = file_instants[file_instants >= datetime.combine(request_end_date, time(0, 0))][0]
    start_time_index, end_time_index = date2index([start_instant, end_instant],
                                                  nc_file['time'])

    x = x_slice_stop - x_slice_start + 1
    y = y_slice_stop - y_slice_start + 1
    time_slices = end_time_index - start_time_index + 1
    print('time slice indices: {} - {}'.format(start_time_index, end_time_index))
    print('x: {}, y: {}, (x_start x_stop y_start y_stop): {}'.format(x, y, (x_slice_start, x_slice_stop,
                                                                            y_slice_start, y_slice_stop)))

    # Read the section specified by the request (i.e. specified time and x/y-section)
    x_coords = nc_file['x'][x_slice_start:x_slice_stop + 1]
    y_coords = nc_file['y'][y_slice_start:y_slice_stop + 1]
    lats = nc_file['lat'][y_slice_start:y_slice_stop + 1, x_slice_start:x_slice_stop + 1]
    lons = nc_file['lon'][y_slice_start:y_slice_stop + 1, x_slice_start:x_slice_stop + 1]
    var_temp_resolution = nc_file[request_vars[0]].getncattr('temporal_resolution')
    no_data_value = nc_file[request_vars[0]].getncattr('_FillValue')
    variables_metadata = {}
    variables_data = np.ndarray(shape=(time_slices, len(request_vars), y, x))
    for i, var_name in enumerate(request_vars):
        variable = nc_file[var_name]
        if variable.getncattr('temporal_resolution') != var_temp_resolution or \
                variable.getncattr('_FillValue') != no_data_value:  # todo we might actually be support this
            raise Exception('Different temporal resolutions or no_data_values in one file')

        var_long_name = variable.getncattr('long_name')
        var_unit = variable.getncattr('units')
        variables_metadata[var_name] = {'long_name': var_long_name, 'unit': var_unit}

        variables_data[:,i] = variable[start_time_index:end_time_index + 1, y_slice_start:y_slice_stop + 1,
                                       x_slice_start:x_slice_stop + 1]

    x_min = float(min(s.bounds[0] for s in mask_shapes_xy))
    y_min = float(min(s.bounds[1] for s in mask_shapes_xy))
    x_max = float(max(s.bounds[2] for s in mask_shapes_xy))
    y_max = float(max(s.bounds[3] for s in mask_shapes_xy))
    extent = gps.Extent(x_min, y_min, x_max, y_max)

    # Load data into geopyspark
    if var_temp_resolution == 'daily':
        time_delta = relativedelta(days=1)
    elif var_temp_resolution == 'monthly':
        time_delta = relativedelta(months=1)
    else:
        raise Exception('Unknown temporal resolution')
    time_instants = list(start_instant + i * time_delta for i in range(time_slices))
    tiles = []
    for var_data_at_instant, instant in zip(variables_data, time_instants):
        temporal_projected_extent = gps.TemporalProjectedExtent(extent=extent, proj4=crs,
                                                                instant=instant)
        tile = gps.Tile.from_numpy_array(var_data_at_instant, no_data_value)
        tiles.append((temporal_projected_extent, tile))

    rdd = spark_ctx.parallelize(tiles)
    raster_layer = gps.RasterLayer.from_numpy_rdd(layer_type=gps.LayerType.SPACETIME, numpy_rdd=rdd)
    tiled_raster_layer = raster_layer.tile_to_layout(gps.LocalLayout(y, x))  # todo use smaller tiles

    masked_layer = tiled_raster_layer.mask(mask_shapes_xy)
    masked_var_tiles = masked_layer.to_numpy_rdd().collect()
    masked_var_data = np.array(list(tile.cells for _, tile in masked_var_tiles))
    out_file_name = 'gwf-{}-{}-{}.nc'.format('+'.join(request_vars), start_instant.strftime('%Y%m%d-%H%M'),
                                             end_instant.strftime('%Y%m%d-%H%M'))
    generate_output_netcdf(out_file_name, x_coords, y_coords, lats, lons, time_instants, masked_var_data,
                           variables_metadata, var_temp_resolution, no_data_value, nc_metadata, proj_var)

    #histograms = masked_layer.get_histogram()
    #if len(request_vars) == 1:
    #    histograms = [histograms]
    #color_ramp = [0x2791C3FF, 0x5DA1CAFF, 0x83B2D1FF, 0xA8C5D8FF,
    #              0xCCDBE0FF, 0xE9D3C1FF, 0xDCAD92FF, 0xD08B6CFF,
    #              0xC66E4BFF, 0xBD4E2EFF]
    #color_maps = list(gps.ColorMap.from_histogram(h, color_ramp) for h in histograms)

    # Write image to file
    #for i, (var_name, color_map) in enumerate(zip(request_vars, color_maps)):
    #    png = masked_layer.bands(i).to_png_rdd(color_map).collect()
    #    for png_at_instant, instant in zip(png, time_instants):
    #        with open('gwf-{}-{}.png'.format(var_name, instant.strftime('%Y-%m-%d_%H%M')), 'wb') as f:
    #            f.write(png_at_instant[1])

    nc_file.close()

    return out_file_name


def generate_output_netcdf(path, x_coords, y_coords, lats, lons, time_instants, variables_data, variables_metadata,
                           var_temp_resolution, no_data_value, meta, proj_var,
                           lat_name='lat', lon_name='lon', dim_x_name='x', dim_y_name='y'):

    out_nc = netCDF4.Dataset(path, 'w')

    # define dimensions
    out_nc.createDimension(dim_x_name, variables_data.shape[3])
    out_nc.createDimension(dim_y_name, variables_data.shape[2])
    out_nc.createDimension('time', None)

    grid_map_name = proj_var.getncattr('grid_mapping_name')
    proj_units = proj_var.getncattr('units')

    # create variables
    # original coordinate variables
    proj_x = out_nc.createVariable(dim_x_name, x_coords.dtype, (dim_x_name, ))
    proj_x.units = proj_units
    proj_x.standard_name = 'projection_x_coordinate'
    proj_x.long_name = 'x coordinate of projection'
    proj_x[:] = x_coords

    proj_y = out_nc.createVariable(dim_y_name, x_coords.dtype, (dim_y_name, ))
    proj_y.units = proj_units
    proj_y.standard_name = 'projection_y_coordinate'
    proj_y.long_name = 'y coordinate of projection'
    proj_y[:] = y_coords

    # auxiliary coordinate variables lat and lon
    lat = out_nc.createVariable(lat_name, 'f4', (dim_y_name, dim_x_name, ))
    lat.units = 'degrees_north'
    lat.standard_name = 'latitude'
    lat.long_name = 'latitude coordinate'
    lat[:] = lats

    lon = out_nc.createVariable(lon_name, 'f4', (dim_y_name, dim_x_name, ))
    lon.units = 'degrees_east'
    lon.standard_name = 'longitude'
    lon.long_name = 'longitude coordinate'
    lon[:] = lons

    # time variable
    var_time = out_nc.createVariable('time', 'i4', ('time', ))
    var_time.units = 'hours since 1990-01-01 00:00:00'
    var_time.calendar = 'gregorian'
    var_time.standard_name = 'time'
    var_time.axis = 'T'

    # data for time variable
    var_time[:] = netCDF4.date2num(time_instants, units=var_time.units, calendar=var_time.calendar)

    # grid mapping variable
    grid_map = out_nc.createVariable(grid_map_name, 'c', )
    for attr in proj_var.ncattrs():
        grid_map.setncattr(attr, proj_var.getncattr(attr))

    # create data variables
    i = 0
    for i, (var_name, var_metadata) in enumerate(variables_metadata.items()):
        var_data = out_nc.createVariable(var_name, variables_data.dtype, ('time', dim_y_name, dim_x_name, ),
                                         fill_value=no_data_value)

        var_data.units = var_metadata['unit']
        var_data.long_name = var_metadata['long_name']
        var_data.coordinates = '{} {}'.format(lat_name, lon_name)
        var_data.grid_mapping = grid_map_name

        # assign the array to data variable
        var_data[:] = variables_data[:, i]
        i += 1

        # temporal resolution attribute for the data variable
        var_data.setncattr('temporal_resolution', var_temp_resolution)

    meta.pop('DATETIME', None)
    meta.pop('DOCUMENTNAME', None)
    out_nc.setncatts(meta)

    out_nc.close()
