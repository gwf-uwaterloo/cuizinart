import json
import os

import numpy as np
from flask import Flask
from flask import request
from flask_cors import CORS
from flask import jsonify
from flask import send_file
import netCDF4  # for strange reasons, one has to import netCDF4 before geopyspark on some systems, otherwise reading nc-files fails.
import geopyspark as gps
from pyspark import SparkContext

from geoPy import geopy


BACKEND_SLURM = 'slurm'
BACKEND_PYSPARK = 'pyspark'

app = Flask('Cuizinart')
CORS(app)
basedir = os.path.abspath(os.path.dirname(__file__))

conf = gps.geopyspark_conf(appName='gwf', master='local[*]')
sc = SparkContext(conf=conf)

product_dict = {}


def parse_json(obj):
    backend = obj['backend']
    product = obj['product']
    start_time = obj['start_time']
    end_time = obj['end_time']
    request_variables = obj['variables']
    geojson = obj['bounding_geom']

    return backend, product, geojson, start_time, end_time, request_variables


@app.route('/getBoundaries', methods=['GET'])
def get_boundaries():
    files = os.listdir('data/boundaries')
    files_json = []
    for file_name in files:
        if file_name.endswith('.info'):
            with open('data/boundaries/{}'.format(file_name)) as f:
                file_str = f.read()
                if file_str.startswith('\''):
                    file_str = file_str[1:]
                if file_str.endswith('\'\n'):
                    file_str = file_str[:-2]
                elif file_str.endswith('\''):
                    file_str = file_str[:-1]
                js = json.loads(file_str)
                product_name = list(js.keys())[0]
                coords = np.array(js[product_name]['domain'][0]['geometry']['coordinates'])
                js[product_name]['domain'][0]['geometry']['coordinates'] = coords[:, :, ::-1].tolist()
                files_json.append(js)

            product_dict[product_name] = file_name.replace('.info', '')

    return jsonify(files_json)


@app.route('/fetchResult', methods=['POST'])
def fetch_result():
    """
    This is the main REST endpoint. It receives the processing request as a JSON string.
    Depending on the specified backend, it passes the request on to be processed by Slurm or PySpark.
    """
    json_request = request.get_json()
    print(json_request)

    backend, product, geojson, start_time, end_time, variables = parse_json(json_request)

    if backend == BACKEND_SLURM:
        return process_slurm(json_request)
    elif backend == BACKEND_PYSPARK:
        return process_pyspark(product, geojson, start_time, end_time, variables)
    else:
        return '{message: "Unknown Backend {}"}'.format(backend), 400


def process_pyspark(product, geojson, start_time, end_time, variables):
    """
    Process request using PySpark.
    """
    input_file_name = product_dict[product]
    try:
        out_file_name = geopy.process_query(input_file_name, geojson, start_time, end_time, variables, sc)
    except Exception as e:
        print(str(e))
        return '{message: "' + str(e) + '"}'

    if start_time and end_time:
        try:
            rv = send_file(out_file_name, mimetype='application/x-netcdf')
        except FileNotFoundError:
            print('No files generated')
            rv = '{message: "No files generated"}'
        finally:
            return rv
    else:
        return '{message: "Server Error"}', 500


def process_slurm(json_request):
    """
    scp the request json to Graham, where it will be processed.
    """
    request_string = str(json_request).replace("'", '"')
    print(request_string)

    file_name = '__cuizinart-graham-request-{}-{}.dat'.format(json_request['user_id'],
                                                              json_request['request_id'])
    with open(file_name, 'w') as f:
        f.write(request_string)

    os.system(
        'scp -i "~/.ssh/id_rsa_graham" {} mgauch@graham.computecanada.ca:/project/6008034/cuizinart/INBOX/'.format(
            file_name))

    os.remove(file_name)

    return '{message: "success"}'


if __name__ == '__main__':
    app.run()
