from flask import Flask, request, jsonify
# for strange reasons, one has to import netCDF4 before geopyspark on some systems, otherwise reading nc-files fails.
import netCDF4
import geopyspark as gps
from pyspark import SparkContext

from cuizinart_pyspark import slice
from pyspark_settings import SPARK_MASTER

app = Flask('cuizinart_pyspark')

conf = gps.geopyspark_conf(appName='gwf', master=SPARK_MASTER)
sc = SparkContext(conf=conf)


@app.route('/process_query', methods=['POST'])
def process_query():
    request_json = request.get_json()
    product = request_json['product']
    geojson_shape = request_json['geojson_shape']
    start_time = request_json['start_time']
    end_time = request_json['end_time']
    request_vars = request_json['request_vars']
    horizons = request_json['horizons']
    issues = request_json['issues']

    try:
        out_file_path = slice(product, geojson_shape, start_time, end_time, request_vars, horizons, issues, sc)
        return jsonify(out_file_path=out_file_path)
    except Exception as e:
        print(e)
        return '{message: "Server Error"}', 500


if __name__ == '__main__':
    app.run(port=5001)
