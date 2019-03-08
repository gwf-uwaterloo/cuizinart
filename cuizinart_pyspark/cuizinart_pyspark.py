import re
from os import path
import os

import netCDF4
import numpy as np
from netCDF4 import Dataset, date2index, num2date
from dateutil.parser import parse
from datetime import datetime
from dateutil.relativedelta import relativedelta
import geopyspark as gps
from shapely.geometry import Polygon

from pyspark_settings import NC_INPUT_PATH, NC_OUTPUT_PATH


def open_file(path):
    return Dataset(path, 'r', format='NETCDF4')


def parse_file_name(file_name):
    """ Get a file's product name and start date based on its file name """
    name_components = re.search(r'(.*)_(\d{12}).nc', file_name)
    if name_components:
        product_name = name_components.group(1)
        try:
            product_start_time = datetime.strptime(name_components.group(2), '%Y%m%d%H%M')
        except ValueError:
            raise Exception('Invalid product file name: ', file_name)
    else:
        raise Exception('Could not parse product file name: ', file_name)

    return file_name, product_name, product_start_time


def get_indexes(lat_array, lon_array, shape, lat, lon):
    """
    Calculates the indexes of lat, lon into the lat_array and lon_array
    :param lat_array: Array containing each grid cell's latitude
    :param lon_array: Array containing each grid cell's longitude
    :param shape: Grid shape
    :param lat: Latitude to search
    :param lon: Longitude to search
    :return: y/x-index of lat/lon in the lat_/lon_arrays
    """
    flattened_lat = lat_array.flatten()
    flattened_lon = lon_array.flatten()

    index = (np.square(flattened_lat - lat) + np.square(flattened_lon - lon)).argmin()

    return int(index / shape[1]), int(index % shape[1])  # y, x


def get_bounding_box_polygon(lat_array, lon_array, shape, polygon_extent):
    """ Transforms a lat/lon-polygon into x/y-coordinates """
    # todo: investigate better ways
    y_slice_start, x_slice_start = get_indexes(lat_array, lon_array, shape, polygon_extent.ymin, polygon_extent.xmin)
    y_slice_stop, x_slice_stop = get_indexes(lat_array, lon_array, shape, polygon_extent.ymax, polygon_extent.xmax)

    return x_slice_start, x_slice_stop, y_slice_start, y_slice_stop


def get_slice_indexes_and_extent(nc_file, geojson_shape):
    """
    Calculates x/y slice indexes in the nc file for the given shape.
    :param nc_file: NetCDF File
    :param geojson_shape: Requested shape
    :return: x/y-indexes of shape bounding box, geopyspark extent of bounding box,
                geojson features as polygons in x/y coordinates
    """
    lat_array = nc_file['lat'][:]
    lon_array = nc_file['lon'][:]

    # Transform the geojson into shapes. We need the shapes represented both as
    # indices into the lat-/lon-arrays (to read only the required slices from NetCDF)
    # and as x-/y-values (to mask the constructed layout).
    x_coords = nc_file['rlon'][:]
    y_coords = nc_file['rlat'][:]
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

    # Get the slices to read from NetCDF
    y_slice_start = int(min(s[:, 0].min() for s in mask_shapes_indices))
    x_slice_start = int(min(s[:, 1].min() for s in mask_shapes_indices))
    y_slice_stop = int(max(s[:, 0].max() for s in mask_shapes_indices))
    x_slice_stop = int(max(s[:, 1].max() for s in mask_shapes_indices))

    x_min = float(min(s.bounds[0] for s in mask_shapes_xy))
    y_min = float(min(s.bounds[1] for s in mask_shapes_xy))
    x_max = float(max(s.bounds[2] for s in mask_shapes_xy))
    y_max = float(max(s.bounds[3] for s in mask_shapes_xy))
    extent = gps.Extent(x_min, y_min, x_max, y_max)

    return x_slice_start, x_slice_stop, y_slice_start, y_slice_stop, extent, mask_shapes_xy


def read_metadata(nc_file, request_vars):
    """
    Reads metadata given NetCDF file's metadata
    :param nc_file: NetCDF file
    :param request_vars: Request variables
    :return: file metadata, projection variable, file's temporal resolution, file's no-data value, metadata per variable
    """
    file_metadata = {attr: nc_file.getncattr(attr) for attr in nc_file.ncattrs()}
    proj_var = nc_file.get_variables_by_attributes(grid_mapping_name=lambda v: v is not None)[0]

    temp_resolution = nc_file[request_vars[0]].getncattr('temporal_resolution')
    no_data_value = nc_file[request_vars[0]].getncattr('_FillValue')
    variables_metadata = {}
    for var_name in request_vars:
        variable = nc_file[var_name]
        var_long_name = variable.getncattr('long_name')
        var_unit = variable.getncattr('units')
        variables_metadata[var_name] = {'long_name': var_long_name, 'units': var_unit,
                                        'dtype': variable.datatype}

    return file_metadata, proj_var, temp_resolution, no_data_value, variables_metadata


def slice(product, geojson_shape, start_time, end_time, request_vars, horizons, issues, spark_ctx):
    """
    Slices the given product into specified shape.
    :param product: Product name
    :param geojson_shape: Shape to be extracted
    :param start_time: Requested start time
    :param end_time: Requested end time
    :param request_vars: Requested variables
    :param spark_ctx: Spark context
    :param horizons: Requested horizons
    :param issues: Requested issues
    :return: Output file name
    """
    request_start_time = parse(start_time)
    request_end_time = parse(end_time)
    print('Request time range: {} - {}'.format(request_start_time, request_end_time))
    print('Request variables: {}'.format(request_vars))

    product_path = path.join(NC_INPUT_PATH, product)
    if not path.isdir(product_path):
        raise Exception('Product directory not found.')

    # Get product files, ignore files that are out of request date range
    product_files = sorted(map(parse_file_name, os.listdir(product_path)), key=lambda f: f[2])
    matching_files = []
    for i in range(len(product_files) - 1):
        if product_files[i][2] <= request_end_time and product_files[i+1][2] > request_start_time:
            matching_files.append(product_files[i])
    if product_files[-1][2] <= request_end_time:
        matching_files.append(product_files[-1])
    if len(matching_files) == 0:
        raise Exception('No matching NetCDF files in product directory.')

    # Get x/y slice indexes based on first nc file, so we don't need to calculate this for every file.
    nc_file = open_file(path.join(product_path, matching_files[0][0]))
    x_slice_start, x_slice_stop, y_slice_start, y_slice_stop, extent, xy_polygons = \
        get_slice_indexes_and_extent(nc_file, geojson_shape)
    x = x_slice_stop - x_slice_start + 1
    y = y_slice_stop - y_slice_start + 1
    print('x: {}, y: {}, (x_start x_stop y_start y_stop): {}'.format(x, y, (x_slice_start, x_slice_stop,
                                                                            y_slice_start, y_slice_stop)))

    # Read the x/y- and lat/lon-coordinates specified by the request
    x_coords = nc_file['rlon'][x_slice_start:x_slice_stop + 1]
    y_coords = nc_file['rlat'][y_slice_start:y_slice_stop + 1]
    lats = nc_file['lat'][y_slice_start:y_slice_stop + 1, x_slice_start:x_slice_stop + 1]
    lons = nc_file['lon'][y_slice_start:y_slice_stop + 1, x_slice_start:x_slice_stop + 1]

    # Get the file and variable metadata
    file_metadata, proj_var, temp_resolution, no_data_value, variables_metadata = read_metadata(nc_file, request_vars)
    if temp_resolution == 'daily':
        time_delta = relativedelta(days=1)
    elif temp_resolution == 'monthly':
        time_delta = relativedelta(months=1)
    else:
        raise Exception('Unknown temporal resolution')
    if proj_var.name == 'lambert_azimuthal_equal_area':
        crs = '+proj=laea +lat_0=90 +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m no_defs'
    elif proj_var.name == 'latitude_longitude':
        crs = '+proj=longlat +datum=WGS84 +no_defs'
    else:
        raise Exception('Unsupported projection:', proj_var)

    # Create the output NetCDF file scaffold (i.e., the dimensions and metadata but no variable data so far)
    out_file_name = '{}_{}_{}_{}.nc'.format(product, '+'.join(request_vars), request_start_time.strftime('%Y%m%d-%H%M'),
                                            request_end_time.strftime('%Y%m%d-%H%M'))
    out_file_path = path.join(NC_OUTPUT_PATH, out_file_name)
    out_file = generate_output_netcdf(out_file_path, x_coords, y_coords, lats, lons, variables_metadata,
                                      temp_resolution, no_data_value, file_metadata, proj_var)

    nc_file.close()

    # Go though input files and add the content of their time slices to the output file
    for nc_file_name, _, _ in matching_files:
        nc_file = open_file(path.join(product_path, nc_file_name))
        file_vars = nc_file.variables.keys()
        if any(v not in file_vars for v in request_vars):
            raise Exception('Product file does not contain all variables.')

        # Calculate start and end time for this file in this request
        file_instants = num2date(nc_file['time'][:], nc_file['time'].getncattr('units'),
                                 nc_file['time'].getncattr('calendar'))
        current_start_date = max(file_instants.min(), request_start_time)
        current_end_date = min(file_instants.max(), request_end_time)
        print('Matched file: {} and period {} - {}'.format(nc_file_name, current_start_date, current_end_date))

        # Get indices of the request's time range
        start_instant = file_instants[file_instants <= current_start_date][-1]
        end_instant = file_instants[file_instants >= current_end_date][0]
        start_time_index, end_time_index = date2index([start_instant, end_instant], nc_file['time'])
        time_slices = end_time_index - start_time_index + 1
        print('time slice indices: {} - {}'.format(start_time_index, end_time_index))

        variables_data = np.ndarray(shape=(time_slices, len(request_vars), y, x))
        for i, var_name in enumerate(request_vars):
            variable = nc_file[var_name]

            if variable.getncattr('temporal_resolution') != temp_resolution or \
                    variable.getncattr('long_name') != variables_metadata[var_name]['long_name'] or \
                    variable.getncattr('units') != variables_metadata[var_name]['units'] or \
                    variable.getncattr('_FillValue') != no_data_value:
                raise Exception('Inconsistent variable metadata.')

            variables_data[:, i] = variable[start_time_index:end_time_index + 1, y_slice_start:y_slice_stop + 1,
                                            x_slice_start:x_slice_stop + 1]

            # Load data into geopyspark
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

            masked_layer = tiled_raster_layer.mask(xy_polygons)
            masked_var_tiles = masked_layer.to_numpy_rdd().collect()
            masked_var_data = np.array(list(tile.cells for _, tile in masked_var_tiles))

            append_output_netcdf(out_file, time_instants, variables_metadata, masked_var_data)

        nc_file.close()

    out_file.close()
    return out_file_path


def generate_output_netcdf(out_file_path, x_coords, y_coords, lats, lons, variables_metadata, var_temp_resolution,
                           no_data_value, meta, proj_var, lat_name='lat', lon_name='lon', dim_x_name='rlon',
                           dim_y_name='rlat'):
    """ Creates scaffolding of output NetCDF file, without actual variable data """
    out_nc = netCDF4.Dataset(out_file_path, 'w')

    # define dimensions
    out_nc.createDimension(dim_x_name, len(x_coords))
    out_nc.createDimension(dim_y_name, len(y_coords))
    out_nc.createDimension('time', None)

    grid_map_name = proj_var.getncattr('grid_mapping_name')
    proj_units = proj_var.getncattr('units')

    # create variables
    # original coordinate variables
    proj_x = out_nc.createVariable(dim_x_name, x_coords.dtype, (dim_x_name,))
    proj_x.units = proj_units
    proj_x.standard_name = 'projection_x_coordinate'
    proj_x.long_name = 'x coordinate of projection'
    proj_x[:] = x_coords

    proj_y = out_nc.createVariable(dim_y_name, x_coords.dtype, (dim_y_name,))
    proj_y.units = proj_units
    proj_y.standard_name = 'projection_y_coordinate'
    proj_y.long_name = 'y coordinate of projection'
    proj_y[:] = y_coords

    # auxiliary coordinate variables lat and lon
    lat = out_nc.createVariable(lat_name, 'f4', (dim_y_name, dim_x_name,))
    lat.units = 'degrees_north'
    lat.standard_name = 'latitude'
    lat.long_name = 'latitude coordinate'
    lat[:] = lats

    lon = out_nc.createVariable(lon_name, 'f4', (dim_y_name, dim_x_name,))
    lon.units = 'degrees_east'
    lon.standard_name = 'longitude'
    lon.long_name = 'longitude coordinate'
    lon[:] = lons

    # time variable
    var_time = out_nc.createVariable('time', 'i4', ('time',))
    var_time.units = 'hours since 1990-01-01 00:00:00'
    var_time.calendar = 'gregorian'
    var_time.standard_name = 'time'
    var_time.axis = 'T'

    # grid mapping variable
    grid_map = out_nc.createVariable(grid_map_name, 'c', )
    for attr in proj_var.ncattrs():
        grid_map.setncattr(attr, proj_var.getncattr(attr))

    # create data variables
    for i, (var_name, var_metadata) in enumerate(variables_metadata.items()):
        var_data = out_nc.createVariable(var_name, var_metadata['dtype'], ('time', dim_y_name, dim_x_name,),
                                         fill_value=no_data_value)

        var_data.units = var_metadata['units']
        var_data.long_name = var_metadata['long_name']
        var_data.coordinates = '{} {}'.format(lat_name, lon_name)
        var_data.grid_mapping = grid_map_name

        # temporal resolution attribute for the data variable
        var_data.setncattr('temporal_resolution', var_temp_resolution)

    meta.pop('DATETIME', None)
    meta.pop('DOCUMENTNAME', None)
    out_nc.setncatts(meta)

    return out_nc


def append_output_netcdf(out_file, time_instants, variables_metadata, variables_data):
    """ Appends time slices of variable data to output NetCDF file """
    # append time dimension
    var_time = out_file['time']
    previous_num_slices = var_time[:].shape[0]
    var_time[:] = np.append(var_time[:], netCDF4.date2num(time_instants, units=var_time.units,
                                                          calendar=var_time.calendar))

    # append actual variable data
    for i, (var_name, var_metadata) in enumerate(variables_metadata.items()):
        var_data = out_file[var_name]
        var_data[previous_num_slices:previous_num_slices + len(time_instants)] = variables_data[:, i]
