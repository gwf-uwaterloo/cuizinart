"""
Read NetCDF Attributes and print JSON string of attributes

Author
------
Kurt C. Kornelsen

Written
-------
October 2017
"""

import json
import sys
import logging
import numpy as np
from netCDF4 import Dataset, num2date
from osgeo import ogr

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s][%(name)s][%(levelname)s][%(message)s]')
LOGGER = logging.getLogger(__name__)


def fromgrid(y, x):
    # converts NetCDF grid into geometry object
    assert y.shape == x.shape
    ptsgeo = ogr.Geometry(ogr.wkbMultiPoint)
    
    for point in zip(*(x.ravel(), y.ravel())):
        pgeo = ogr.Geometry(ogr.wkbPoint)
        pgeo.AddPoint(*point)
        ptsgeo.AddGeometry(pgeo)
    
    return ptsgeo



def parse_variables(filename, variable):
    """
    Arguments
    ---------
    variable <type 'netCDF4._netCDF4.Variable'>: netcdf variable

    Return
    ------
    vbl_dict  dictionary

    Purpose
    -------
    Read a variable from the NetCDF and turn the attributes into a dict
    """
    shortname = filename.variables[variable]._name         # e.g. GDPS_P_UUC_09950
    try:
        longname = filename.variables[variable].long_name
    except Exception as e:
        LOGGER.exception('Could not parse long_name from NC file')
        raise e

    vbl_dict = {'short_name': shortname,
                'long_name':  longname,
                'units':      filename.variables[variable].units,
                'islive':     'True'}

    return vbl_dict


def parse_time(f):
    """
    Arguments
    ---------
    file <type 'netCDF4._netCDF4.Variable'>

    Return
    ------
    dict horizon

    Purpose
    -------
    Parse the time stamps in file in format YYYY-MM-DD HH:MM:SS
    """

    try:
        time_array    = f.variables['time'][:]
        time_unit     = f.variables['time'].units
        time_calendar = f.variables['time'].calendar
    except Exception as e:
        LOGGER.exception('Cannot read time')
        raise e

    # convert to datetime 
    time_stamps = num2date(time_array,time_unit,calendar=time_calendar)
    time_stamps = [ dd.strftime('%Y-%m-%d %H:%M:%S') for dd in time_stamps ]

    return time_stamps


def parse_domain(f):
    """
    Arguments
    ---------
    file <type 'netCDF4._netCDF4.Variable'>

    Return
    ------
    dict domain - in GeoJSON format containing convex hull of the domain covered by the data


    Purpose
    -------
    Get the outer shape of the data in this file.
    """

    ylat = np.array(f.variables['lat'][:],dtype=float)
    xlon = np.array(f.variables['lon'][:],dtype=float)

    pgeo = fromgrid(ylat, xlon)

    ch = pgeo.ConvexHull()
    ch_dict = json.loads(ch.ExportToJson())

    domain = [{'type':'Feature',
               'properties':{},
               'geometry':ch_dict}]

    domain[0]['geometry']['coordinates'] = [ np.array(ch_dict['coordinates'])[0,:,0:2].tolist() ]

    return domain


def ncatt2json(filelist):
    """
     Read NetCDF Attributes and print JSON string of attributes

     Arguments
     ---------
     filelist - List of GWF-Cuizinart nc files to read

     Return
     ------
     issue int
     date string 'YYYY-MM-DD'

     Purpose
     -------
     Pull useful info from filename assuming constant convention
     """

    output_dict = {}
    # In case file is put in instead of list
    if not isinstance(filelist, list):
        filelist = [filelist]

    for filename in filelist:
        try:
            f = Dataset(filename,'r')
        except Exception as e:
            LOGGER.exception('Missing File {}'.format(filename))
            raise e

        var_list = []

        for v in f.variables:
            # Skip these...may need to add others
            if not any([v == u'time', v == u'lon', v == u'lat', v == u'rlat', v == u'rlon', v == u'rotated_pole']):
                var_list.append(parse_variables(f, v))

        # all available time stamps in this file in YYYY-MM-DD HH:MM:SS format
        times_tamps = parse_time(f)

        # get domain covered by data
        domain = parse_domain(f)

        # product is a global attribute in NetCDF file
        product = f.gwf_product

        output_dict[product] = {'product':   product,
                                'variables': var_list,
                                'time':      times_tamps,
                                'domain':    domain}

    output = json.dumps(output_dict)

    return output


if __name__ == '__main__':

    if len(sys.argv) > 1:
        inputs = []
        for arg in sys.argv[1:]:
            inputs.append(arg)
    else:
        print('Usage {} <file1.nc> <file2.nc>'.format(sys.argv[0]))
        LOGGER.error('Invalid invocation of ncatt2json')
        sys.exit(1)

    try:
        out = ncatt2json(inputs)
    except Exception as e:
        LOGGER.exception('ncatt2json error')
        raise e

    print('{}'.format(out))
