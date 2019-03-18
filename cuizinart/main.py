import requests
from flask import Flask
from flask import request
from flask_cors import CORS
from flask import jsonify
from flask import send_file
from metadata_schema import *
from settings import *

CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))

def parse_json(obj):
    backend = obj['backend']
    product = obj['product']
    start_time = obj['start_time']
    end_time = obj['end_time']
    request_variables = obj['variables']
    geojson = obj['bounding_geom']
    horizons = obj['window']
    issues = obj['release']

    return backend, product, geojson, start_time, end_time, request_variables, horizons, issues


@app.route('/getBoundaries', methods=['GET'])
def get_boundaries():
    products = Product.query.all()
    product_schema = ProductSchema(many=True)
    output = product_schema.dump(products).data
    return jsonify(output)


@app.route('/fetchResult', methods=['POST'])
def fetch_result():
    """
    This is the main REST endpoint. It receives the processing request as a JSON string.
    Depending on the specified backend, it passes the request on to be processed by Slurm or PySpark.
    """
    json_request = request.get_json()
    print(json_request)

    backend, product, geojson, start_time, end_time, variables, horizons, issues = parse_json(json_request)

    if backend == BACKEND_SLURM:
        return process_slurm(json_request)
    elif backend == BACKEND_PYSPARK:
        return process_pyspark(product, geojson, start_time, end_time, variables, horizons, issues)
    else:
        return '{message: "Unknown Backend {}"}'.format(backend), 400


def process_pyspark(product, geojson, start_time, end_time, variables, horizons, issues):
    """
    Process request using PySpark.
    """
    payload = {'product': product, 'geojson_shape': geojson, 'start_time': start_time, 'end_time': end_time,
               'request_vars': variables, 'horizons': horizons, 'issues': issues}

    r = requests.post('http://{}/process_query'.format(PYSPARK_URL), json=payload)

    if r.status_code != requests.codes.ok:
        print(r.status_code, r.reason)
        return '{{message: Server Error: "{}, {}"}}'.format(r.status_code, r.text), 400

    out_file_path = r.json()['out_file_path']
    try:
        rv = send_file(out_file_path, mimetype='application/x-netcdf')
    except FileNotFoundError:
        print('No files generated')
        rv = '{message: "No files generated"}'
    finally:
        return rv


def process_slurm(json_request):
    """
    scp the request json to Graham, where it will be processed.
    """
    request_string = str(json_request).replace("'", '"')

    file_name = '__cuizinart-graham-request-{}-{}.dat'.format(json_request['globus_id'],
                                                              json_request['request_id'])
    with open(file_name, 'w') as f:
        f.write(request_string)

    os.system(
        'scp -i "{}" {} {}@graham.computecanada.ca:/project/6008034/cuizinart/INBOX/'.format(
            SSH_KEYFILE_PATH, file_name, SSH_USER_NAME))

    os.remove(file_name)

    return '{message: "success"}'


if __name__ == '__main__':
    app.run(port=5000)

