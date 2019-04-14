import logging
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

from pyspark_settings import NC_INPUT_PATH

logger = logging.getLogger('pyspark')


def open_file(path):
    return Dataset(path, 'r', format='NETCDF4')


def filter_files(file_list, start_time, end_time, issues, is_forecast_product):
    """
    Filter files in file_list for matching time range and issues. If is_forecast_product is False,
    treats product as non-forecast. This means it will match files only based on start and end time.
    :param file_list: List of file names
    :param start_time: Request start time
    :param end_time: Request end time
    :param issues: Issues to match or empty list or None
    :param is_forecast_product: True iff the product is to be treated as forecast product, with issues and horizons
    :return: List of matched file names, sorted by start date
    """
    parsed_files = []
    for file_name in file_list:
        name_components = re.search(r'(.*)_(\d{12}).nc', file_name)
        if name_components:
            try:
                file_start_datetime = datetime.strptime(name_components.group(2), '%Y%m%d%H%M')
                parsed_files.append((file_name, file_start_datetime))
            except ValueError:
                raise Exception('Invalid product file name: ', file_name)
        else:
            raise Exception('Could not parse product file name: ', file_name)

    matched_files = []
    for file_name, file_start_datetime in sorted(parsed_files, key=lambda f: f[1]):
        if not is_forecast_product:
            if file_start_datetime <= start_time and len(matched_files) > 0:
                matched_files.pop()  # the previous file contains data that is too early. Remove it.
            if file_start_datetime <= end_time:
                matched_files.append(file_name)
        elif file_start_datetime.time() in issues \
                and (start_time.date() <= file_start_datetime.date() <= end_time.date()):
            # Forecast product
            matched_files.append(file_name)

    return matched_files


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
    :return: file metadata, projection variable, metadata per variable, variables' fillvalues, variables' dtypes
    """
    file_metadata = {attr: nc_file.getncattr(attr) for attr in nc_file.ncattrs()}
    proj_var = nc_file.get_variables_by_attributes(grid_mapping_name=lambda v: v is not None)[0]

    variables_metadata = {}
    variables_fillvals = {}
    variables_dtypes = {}
    for var_name in request_vars:
        variable = nc_file[var_name]
        variables_metadata[var_name] = {attr: variable.getncattr(attr) for attr in variable.ncattrs()}
        variables_dtypes[var_name] = variable.datatype
        if '_FillValue' in variables_metadata[var_name]:
            variables_fillvals[var_name] = variables_metadata[var_name]['_FillValue']
        else:
            variables_fillvals[var_name] = netCDF4.default_fillvals[variable.dtype.str[1:]]

    return file_metadata, proj_var, variables_metadata, variables_fillvals, variables_dtypes


def slice(product, out_dir, geojson_shape, start_time, end_time, request_vars, horizons, issues, spark_ctx):
    """
    Slices the given product into specified shape.
    :param product: Product name
    :param out_dir: Directory to save output files in
    :param geojson_shape: Shape to be extracted
    :param start_time: Requested start time
    :param end_time: Requested end time
    :param request_vars: Requested variables
    :param spark_ctx: Spark context
    :param horizons: Requested horizons
    :param issues: Requested issues
    :return: Number of generated output files
    """
    request_start_time = parse(start_time)
    request_end_time = parse(end_time)

    # If requested range is empty or user requests issues but no horizon or vice versa, raise exception.
    # If both issues and horizons are empty, we try processing the product as a non-forecast product
    # and return a single file.
    if request_end_time < request_start_time or (len(horizons) == 0 and len(issues) > 0) \
            or (len(horizons) > 0 and len(issues) == 0):
        raise Exception('Request inconsistent.')

    is_forecast_product = True
    if len(horizons) == len(issues) == 0:
        is_forecast_product = False
        logger.info('Treating as non-forecast product.')

    request_issues = list(map(lambda i: parse(i).time(), issues))
    logger.info('Request time range: {} - {}, issues {}, horizons {}'.format(request_start_time, request_end_time,
                                                                             request_issues, horizons))
    logger.info('Request variables: {}'.format(request_vars))

    # Look for a forecast_productName folder first. If it doesn't exist, check if there's a productName folder.
    product_path = path.join(NC_INPUT_PATH, 'forecast_' + product)
    if not path.isdir(product_path):
        product_path = path.join(NC_INPUT_PATH, product)
        if not path.isdir(product_path):
            raise Exception('Directory for product not found (neither forecast_{p} nor {p} exist).'.format(p=product))

    # Get product files, ignore files that are out of request date range
    product_files = filter_files(os.listdir(product_path), request_start_time, request_end_time, request_issues,
                                 is_forecast_product)
    if len(product_files) == 0:
        raise Exception('No matching NetCDF files in product directory.')

    # Get x/y slice indexes based on first nc file, so we don't need to calculate this for every file.
    nc_file = open_file(path.join(product_path, product_files[0]))
    x_slice_start, x_slice_stop, y_slice_start, y_slice_stop, extent, xy_polygons = \
        get_slice_indexes_and_extent(nc_file, geojson_shape)
    x = x_slice_stop - x_slice_start + 1
    y = y_slice_stop - y_slice_start + 1
    logger.info('x: {}, y: {}, (x_start x_stop y_start y_stop): {}'.format(x, y, (x_slice_start, x_slice_stop,
                                                                                  y_slice_start, y_slice_stop)))

    # Read the x/y- and lat/lon-coordinates specified by the request
    x_coords = nc_file['rlon'][x_slice_start:x_slice_stop + 1]
    y_coords = nc_file['rlat'][y_slice_start:y_slice_stop + 1]
    lats = nc_file['lat'][y_slice_start:y_slice_stop + 1, x_slice_start:x_slice_stop + 1]
    lons = nc_file['lon'][y_slice_start:y_slice_stop + 1, x_slice_start:x_slice_stop + 1]

    # Get the file and variable metadata
    file_metadata, proj_var, variables_metadata, var_fillvals, var_dtypes = read_metadata(nc_file, request_vars)

    if proj_var.name == 'lambert_azimuthal_equal_area':
        crs = '+proj=laea +lat_0=90 +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m no_defs'
    elif proj_var.name == 'latitude_longitude':
        crs = '+proj=longlat +datum=WGS84 +no_defs'
    else:
        raise Exception('Unsupported projection:', proj_var)

    # Create the output NetCDF files' scaffolds (i.e., the dimensions and metadata but no variable data so far)
    # For forecast products, we create one output file per requested date and issue.
    # For non-forecast products, we create only one output file.
    out_files = []
    date = request_start_time
    if is_forecast_product:
        while date <= request_end_time:
            for issue in request_issues:
                out_file_name = '{}_{}_{}{}.nc'.format(product, '+'.join(request_vars), date.strftime('%Y%m%d'),
                                                       issue.strftime('%H%M'))
                out_file_path = path.join(out_dir, out_file_name)
                out_files.append(generate_output_netcdf(out_file_path, x_coords, y_coords, lats, lons,
                                                        variables_metadata, var_fillvals, var_dtypes, file_metadata,
                                                        proj_var, nc_file['rlon'], nc_file['rlat']))
            date += relativedelta(days=1)
    else:
        out_file_name = '{}_{}_{}_{}.nc'.format(product, '+'.join(request_vars),
                                                request_start_time.strftime('%Y%m%d%H%M'),
                                                request_end_time.strftime('%Y%m%d%H%M'))
        out_file_path = path.join(out_dir, out_file_name)
        out_files.append(generate_output_netcdf(out_file_path, x_coords, y_coords, lats, lons, variables_metadata,
                                                var_fillvals, var_dtypes, file_metadata, proj_var,
                                                nc_file['rlon'], nc_file['rlat']))
    nc_file.close()

    # Go though input files and add the content of their time slices to the output file
    for k, nc_file_name in enumerate(product_files):
        nc_file = open_file(path.join(product_path, nc_file_name))
        file_vars = nc_file.variables.keys()
        if any(v not in file_vars for v in request_vars):
            raise Exception('Product file does not contain all variables.')

        # Calculate start and end time for this file in this request
        file_instants = num2date(nc_file['time'][:], nc_file['time'].getncattr('units'),
                                 nc_file['time'].getncattr('calendar'))
        if not is_forecast_product:
            current_start_date = max(file_instants.min(), request_start_time)
            current_end_date = min(file_instants.max(), request_end_time)
            logger.info('Matched file: {} and period {} - {}'.format(nc_file_name, current_start_date,
                                                                     current_end_date))

            # Get indices of the request's time range
            start_instant = file_instants[file_instants <= current_start_date][-1]
            end_instant = file_instants[file_instants >= current_end_date][0]
            start_time_index, end_time_index = date2index([start_instant, end_instant], nc_file['time'])
            time_slices = range(start_time_index, end_time_index + 1)
        else:
            time_slices = date2index([file_instants[0] + relativedelta(hours=h) for h in horizons], nc_file['time'])
            if len(horizons) == 1:
                time_slices = [time_slices]
        logger.info('time slice indices: {}'.format(time_slices))

        variables_data = np.ndarray(shape=(len(time_slices), len(request_vars), y, x))
        for i, var_name in enumerate(request_vars):
            variable = nc_file[var_name]

            if any(variable.getncattr(meta_key) != variables_metadata[var_name][meta_key]
                   for meta_key in variables_metadata[var_name].keys()) or variable.datatype != var_dtypes[var_name]:
                raise Exception('Inconsistent variable metadata.')

            variables_data[:, i] = variable[time_slices, y_slice_start:y_slice_stop + 1,
                                            x_slice_start:x_slice_stop + 1]

        # Load data into geopyspark
        time_instants = file_instants[time_slices]
        tiles = []
        for var_data_at_instant, instant in zip(variables_data, time_instants):
            temporal_projected_extent = gps.TemporalProjectedExtent(extent=extent, proj4=crs,
                                                                    instant=instant)
            tile = gps.Tile.from_numpy_array(var_data_at_instant, var_fillvals[request_vars[0]])
            tiles.append((temporal_projected_extent, tile))

        rdd = spark_ctx.parallelize(tiles)
        raster_layer = gps.RasterLayer.from_numpy_rdd(layer_type=gps.LayerType.SPACETIME, numpy_rdd=rdd)
        tiled_raster_layer = raster_layer.tile_to_layout(gps.LocalLayout(y, x))  # todo use smaller tiles

        masked_layer = tiled_raster_layer.mask(xy_polygons)
        masked_var_tiles = masked_layer.to_numpy_rdd().collect()
        masked_var_data = np.array(list(tile.cells for _, tile in masked_var_tiles))

        out_file = out_files[k] if is_forecast_product else out_files[0]
        append_output_netcdf(out_file, time_instants, variables_metadata, masked_var_data)

        nc_file.close()

    for f in out_files:
        f.close()

    logger.info('Slicing completed.')
    return len(out_files)


def generate_output_netcdf(out_file_path, x_coords, y_coords, lats, lons, variables_metadata, var_fillvals, var_dtypes,
                           file_meta, proj_var, x_var, y_var, lat_name='lat', lon_name='lon'):
    """ Creates scaffolding of output NetCDF file, without actual variable data """
    out_nc = netCDF4.Dataset(out_file_path, 'w')

    # define dimensions
    out_nc.createDimension(x_var.name, len(x_coords))
    out_nc.createDimension(y_var.name, len(y_coords))
    out_nc.createDimension('time', None)

    # create variables
    # original coordinate variables
    proj_x = out_nc.createVariable(x_var.name, x_coords.dtype, (x_var.name,))
    for attr in x_var.ncattrs():
        proj_x.setncattr(attr, x_var.getncattr(attr))
    proj_x[:] = x_coords

    proj_y = out_nc.createVariable(y_var.name, x_coords.dtype, (y_var.name,))
    for attr in y_var.ncattrs():
        proj_y.setncattr(attr, y_var.getncattr(attr))
    proj_y[:] = y_coords

    # auxiliary coordinate variables lat and lon
    lat = out_nc.createVariable(lat_name, 'f4', (y_var.name, x_var.name,))
    lat.units = 'degrees_north'
    lat.standard_name = 'latitude'
    lat.long_name = 'latitude coordinate'
    lat[:] = lats

    lon = out_nc.createVariable(lon_name, 'f4', (y_var.name, x_var.name,))
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
    grid_map = out_nc.createVariable(proj_var.name, 'c', )
    for attr in proj_var.ncattrs():
        grid_map.setncattr(attr, proj_var.getncattr(attr))

    # create data variables
    for i, (var_name, var_metadata) in enumerate(variables_metadata.items()):
        var_data = out_nc.createVariable(var_name, var_dtypes[var_name], ('time', y_var.name, x_var.name,),
                                         fill_value=var_fillvals[var_name])
        var_data.setncatts(var_metadata)

    file_meta.pop('DATETIME', None)
    file_meta.pop('DOCUMENTNAME', None)
    out_nc.setncatts(file_meta)

    return out_nc


def append_output_netcdf(out_file, time_instants, variables_metadata, variables_data):
    """ Appends time slices of variable data to output NetCDF file """
    # append time dimension
    var_time = out_file['time']
    previous_num_slices = var_time[:].shape[0]
    var_time[:] = np.append(var_time[:], netCDF4.date2num(time_instants, units=var_time.units,
                                                          calendar=var_time.calendar))

    # append actual variable data
    for i, var_name in enumerate(variables_metadata.keys()):
        var_data = out_file[var_name]
        var_data[previous_num_slices:previous_num_slices + len(time_instants)] = variables_data[:, i]
