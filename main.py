import json
import os

import numpy as np
from flask import Flask
from flask import request
from flask_cors import CORS
from flask import jsonify
from flask import send_file
import zipfile
import netCDF4  # for strange reasons, one has to import netCDF4 before geopyspark on some systems, otherwise reading nc-files fails.
import geopyspark as gps
from pyspark import SparkContext

from geoPy import geopy

app = Flask("NetCDF-Server")
CORS(app)
basedir = os.path.abspath(os.path.dirname(__file__))

conf = gps.geopyspark_conf(appName="gwf", master="local[*]")
sc = SparkContext(conf=conf)

product_dict = {}

def parse_json(obj):
    product = obj["product"]
    start_time = obj["start_time"]
    end_time = obj["end_time"]
    request_variables = obj["variables"]
    geojson = obj["bounding_geom"]

    return product, geojson, start_time, end_time, request_variables


@app.route('/getBoundary', methods=['GET'])
def getBoundary():
    boundary = [[41.0270393371582, -93.11832427978516], [49.424442291259766, -75.28765258789062]]
    return jsonify(boundary)


@app.route('/getBoundaries', methods=['GET'])
def getBoundaries():
    files = os.listdir('data/boundaries')
    files_json = []
    for file_name in files:
        with open('data/boundaries/{}'.format(file_name)) as f:
            js = json.load(f)
            product_name = list(js.keys())[0]
            coords = np.array(js[product_name]['domain'][0]['geometry']['coordinates'])
            js[product_name]['domain'][0]['geometry']['coordinates'] = coords[:,::-1]
            files_json.append(js)

        product_dict[product_name] = file_name.replace('.info', '')

    return jsonify(files_json)


@app.route('/fetchResult', methods=['POST'])
def fetchResult():
    print(request.get_json())

    product, geojson, start_time, end_time, variables = parse_json(request.get_json())
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
        return '{message: "Server Error"}'


if __name__ == '__main__':
    app.run()
