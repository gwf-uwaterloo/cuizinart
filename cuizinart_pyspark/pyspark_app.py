import os
import time
import traceback
from threading import Thread

import requests
from flask import Flask, request
# for strange reasons, one has to import netCDF4 before geopyspark on some systems, otherwise reading nc-files fails.
import netCDF4
import geopyspark as gps
from pyspark import SparkContext

from cuizinart_pyspark import slice
from pyspark_settings import SPARK_MASTER, CUIZINART_URL, NC_OUTPUT_PATH, CUIZINART_PYSPARK_PASSWORD

app = Flask('cuizinart_pyspark')

conf = gps.geopyspark_conf(appName='gwf', master=SPARK_MASTER)
sc = SparkContext(conf=conf)


@app.route('/process_query', methods=['POST'])
def process_query():
    request_json = request.get_json()
    request_id = request_json['request_id']
    user_email = request_json['user_email']
    product = request_json['product']
    geojson_shape = request_json['geojson_shape']
    start_time = request_json['start_time']
    end_time = request_json['end_time']
    request_vars = request_json['request_vars']
    horizons = request_json['horizons']
    issues = request_json['issues']

    thread = Thread(target=execute_query, args=(request_id, user_email, product, geojson_shape, start_time, end_time,
                                                request_vars, horizons, issues, sc))
    thread.start()

    return '{message: "Job started"}'


def execute_query(request_id, user_email, product, geojson_shape, start_time, end_time, request_vars, horizons,
                  issues, sc):
    """
    Wrapper to execute the slicing job and report results back to the Cuizinart main backend.
    """
    out_file_path = os.path.join(NC_OUTPUT_PATH, request_id)
    if not os.path.exists(out_file_path):
        os.makedirs(out_file_path)

    num_out_files = 0
    wall_time = time.time()
    try:
        num_out_files = slice(product, out_file_path, geojson_shape, start_time, end_time, request_vars, horizons,
                              issues, sc)
        status = 'COMPLETED-CHECKED'
    except:
        print(traceback.format_exc())
        status = 'FAILED-UNCHECKED'
    finally:
        elapsed_time = time.time() - wall_time

    login_request = requests.post('http://{}/login'.format(CUIZINART_URL), json={'email': 'pyspark',
                                                                         'password': CUIZINART_PYSPARK_PASSWORD})
    if login_request.status_code != requests.codes.ok or \
            'user' not in login_request.json()['response'] or \
            'authentication_token' not in login_request.json()['response']['user']:
        print('Error authenticating on Cuizinart')
        return

    auth_token = login_request.json()['response']['user']['authentication_token']
    response_json = {'request_id': request_id, 'user_email': user_email, 'request_status': status,
                     'file_location': out_file_path, 'n_files': num_out_files, 'processing_time_s': elapsed_time,
                     'auth_token': auth_token}
    r = requests.post('http://{}/reportJobResult'.format(CUIZINART_URL), json=response_json)

    if r.status_code != requests.codes.ok:
        print('Error reporting job results. Status code: {}, reason: {}'.format(r.status_code, r.reason))


if __name__ == '__main__':
    app.run(port=5001)
