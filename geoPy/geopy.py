from os import listdir
from os.path import isfile, join
import sys
from netCDF4 import Dataset, date2index
from pyspark import SparkContext
from dateutil.parser import parse
from datetime import time, timedelta, datetime
import geopyspark as gps


def open_file(path):
    return Dataset(path, "r", format="NETCDF4")


def get_indexes(lat_array, lon_array, shape, lat, lon):
    flattened_lat = lat_array[:].flatten()
    flattened_lon = lon_array[:].flatten()
    min_pow_dis = sys.maxsize
    index = 0
    for i in range(0, len(flattened_lat)):
        pow_dis = pow(flattened_lat[i] - lat, 2) + pow(flattened_lon[i] - lon, 2)
        if pow_dis < min_pow_dis:
            min_pow_dis = pow_dis
            index = i

    return int(index / shape[1]), index % shape[1]  # y,x


# Transforms a lat/lon-polygon to x/y-coordinates
def get_bounding_box_polygon(lat_array, lon_array, shape, polygon_extent):
    # todo: verify correctness
    y_slice_start, x_slice_start = get_indexes(lat_array, lon_array, shape, polygon_extent.xmin, polygon_extent.ymin)
    y_slice_stop, x_slice_stop = get_indexes(lat_array, lon_array, shape, polygon_extent.xmax, polygon_extent.ymax)

    print("{} {}".format(x_slice_start, x_slice_stop))
    print("{} {}".format(y_slice_start, y_slice_stop))

    return x_slice_start, x_slice_stop, y_slice_start, y_slice_stop


def read_input(path):
    return open_file(path)


def slice(array, xstart, xend, ystart, yend):
    result = []

    for item in array[xstart:xend]:
        result.append(item[ystart:yend])

    return result


def process_query(lat_min, lat_max, lon_min, lon_max, date_range, request_variables):
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
                    files_to_analyze[v] = [nc_file]
                else:
                    files_to_analyze[v] = files_to_analyze[v].append(nc_file)

    print("Matching files: {}".format(files_to_analyze))

    conf = gps.geopyspark_conf(appName="gwf", master="local[*]")
    conf.set("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
    conf.set("spark.kryo.registrator", "geotrellis.spark.io.kryo.KryoRegistrator")
    conf.set("spark.kryo.unsafe", "true")
    conf.set("spark.rdd.compress", "true")
    conf.set("spark.ui.enabled", "false")
    sc = SparkContext(conf=conf)

    polygon_extent = gps.Extent(lat_min, lon_min, lat_max, lon_max)

    def spark_process(var_name, nc_file_list):
        print("variable: {}, files {}".format(var_name, nc_file_list))

        # At some point, we'll want to support partitioned files. For now, just take the first one.
        nc_file = nc_file_list[0]
        vs = nc_file.variables

        lat_array = nc_file['lat']
        lon_array = nc_file['lon']

        no_data = nc_file[var_name].getncattr('_FillValue')

        # Get x/y-range
        (xSliceStart, xSliceStop, ySliceStart, ySliceStop) = get_bounding_box_polygon(lat_array, lon_array,
                                                                                              lon_array.shape,
                                                                                              polygon_extent)
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
        print("array 1st 10 entries: {}".format(array[:10]))

        proj = nc_file['lambert_azimuthal_equal_area'].getncattr('crs_wkt')
        instant = datetime.combine(request_start_date, time(0, 0))
        bounds = gps.Bounds(gps.SpaceTimeKey(col=0, row=0, instant=instant),
                            gps.SpaceTimeKey(col=0, row=0, instant=instant))
        layout=gps.TileLayout(1, 1, x, y)
        layout_definition = gps.LayoutDefinition(polygon_extent, layout)
        metadata = gps.Metadata(bounds=bounds, crs='+proj=longlat +datum=WGS84 +no_defs ',
                                cell_type='float32ud-1.0', extent=polygon_extent, layout_definition=layout_definition)
        tile = gps.Tile.from_numpy_array(array, no_data)

        layer = [(gps.SpatialKey(row=0, col=0), tile)]
        rdd = sc.parallelize(layer)

        result_tile = gps.TiledRasterLayer.from_numpy_rdd(layer_type=gps.LayerType.SPATIAL,
                                                          numpy_rdd=rdd, metadata=metadata)

    for v in request_vars:
        spark_process(v, files_to_analyze[v])
