import os
from flask import Flask
from flask import request
from flask_cors import CORS
from flask import jsonify
from flask import send_file
import zipfile
import geopyspark as gps
from pyspark import SparkContext

from geoPy import geopy

app = Flask("NetCDF-Server")
CORS(app)
basedir = os.path.abspath(os.path.dirname(__file__))

conf = gps.geopyspark_conf(appName="gwf", master="local[*]")
sc = SparkContext(conf=conf)


def parse_json(obj):
    date_range = obj["selectDate"]
    request_variables = obj["variables"]
    geojson = obj["geoJson"]

    return geojson, date_range, request_variables


@app.route('/getBoundary', methods=['GET'])
def getBoundary():
    boundary = [[41.0270393371582, -93.11832427978516], [49.424442291259766, -75.28765258789062]]
    return jsonify(boundary)


@app.route('/fetchResult', methods=['POST'])
def fetchResult():
    print(request.get_json())

    geojson, daterange, variables = parse_json(request.get_json())
    geopy.process_query(geojson, daterange, variables, sc)

    if daterange:
        rv = None
        compression = zipfile.ZIP_DEFLATED
        zf = zipfile.ZipFile("result.zip", mode="w")
        try:
            for v in variables:
                zf.write('gddp' + v + daterange.replace(',', '-') + '.nc', compress_type=compression)

        except FileNotFoundError:
            print("No files generated")
        finally:
            zf.close()
            rv = send_file("result.zip", mimetype='application/zip')
            return rv
    else:
        return '{message: "Server Error"}'

if __name__ == '__main__':
    app.run()
