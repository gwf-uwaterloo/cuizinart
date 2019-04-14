import logging
import os
import smtplib
import ssl
import time
import traceback
from email.message import EmailMessage

import flask_login
import requests
from flask import jsonify
from flask import request, render_template, send_from_directory
from flask_cors import CORS
from flask_principal import RoleNeed, Permission
from flask_security import auth_token_required

from metadata_schema import ProductSchema, Product
from settings import app, BACKEND_SLURM, BACKEND_PYSPARK, PYSPARK_URL, SSH_KEYFILE_PATH, SSH_USER_NAME, EMAIL_ADDRESS, \
    EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT, EMAIL_PASSWORD, EMAIL_SMTP_USERNAME

logger = logging.getLogger('cuizinart')
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
pyspark_permission = Permission(RoleNeed('pyspark'))


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


@app.route('/', methods=['GET'])
def get_main_page():
    return render_template('index.html')


@app.route('/getBoundaries', methods=['GET'])
def get_boundaries():
    products = Product.query.all()
    product_schema = ProductSchema(many=True)
    output = product_schema.dump(products).data
    return jsonify(output)


@app.route('/fetchResult', methods=['POST'])
@auth_token_required
def fetch_result():
    """
    This is the main REST endpoint. It receives the processing request as a JSON string.
    Depending on the specified backend, it passes the request on to be processed by Slurm or PySpark.
    """
    json_request = request.get_json()
    logger.info(json_request)

    user = flask_login.current_user
    backend, product, geojson, start_time, end_time, variables, horizons, issues = parse_json(json_request)

    request_id = '{}_{}'.format(user.email, int(time.time()))
    if Request.query.filter_by(request_name=request_id).first() is not None:
        request_id = request_id + '-1'
    request_db_entry = Request(request_name=request_id, user=user, request_status='Received')

    if backend == BACKEND_SLURM:
        json_request['request_id'] = request_id
        json_request['user_email'] = user.email
        request_db_entry.backend = BACKEND_SLURM
        result = process_slurm(json_request)
    elif backend == BACKEND_PYSPARK:
        request_db_entry.backend = BACKEND_PYSPARK
        result = process_pyspark(request_id, user.email, product, geojson, start_time, end_time, variables, horizons,
                               issues)
    else:
        request_db_entry.request_status = 'Unknown Backend'
        result = '{message: "Unknown Backend {}"}'.format(backend), 400

    db.session.add(request_db_entry)
    db.session.commit()

    return result


@app.route('/reportJobResult', methods=['POST'])
@auth_token_required
@pyspark_permission.require()
def report_job_result():
    """
    REST endpoint to report success or failure of a job.
    """
    job_result = request.get_json()
    request_id = job_result['request_id']

    request_user_email = job_result['user_email']
    request_status = job_result['request_status']
    request_files = job_result['file_location']
    num_files = job_result['n_files']
    file_size = job_result['file_size_MB']
    processing_time = job_result['processing_time_s']

    request_db_entry = Request.query.filter_by(request_name=request_id).first()
    if request_db_entry is None:
        print('Request not found in database')
    else:
        request_db_entry.request_status = request_status
        request_db_entry.file_location = request_files
        request_db_entry.n_files = num_files
        request_db_entry.processing_time_s = processing_time
        request_db_entry.file_size_mb = file_size
        db.session.add(request_db_entry)
        db.session.commit()

    subject = 'Cuizinart request {} completed with status {}'.format(request_id, request_status)
    message = 'Your Cuizinart request with id {} was processed with status {}.\n\n'.format(request_id, request_status) \
              + 'The job generated {} file{} in {} seconds. \n'.format(num_files, 's' if num_files != 1 else '',
                                                                       processing_time) \
              + 'You can now locate your files under the following path: {}'.format(request_files)

    try:
        send_notification_email(request_user_email, subject, message)
    except:
        logger.info(traceback.format_exc())
        return '{message: "Error when sending notification email"}', 500

    return '{message: "Success"}'


def process_pyspark(request_id, user_email, product, geojson, start_time, end_time, variables, horizons, issues):
    """
    Process request using PySpark.
    """
    payload = {'request_id': request_id, 'user_email': user_email, 'product': product, 'geojson_shape': geojson,
               'start_time': start_time, 'end_time': end_time, 'request_vars': variables, 'horizons': horizons,
               'issues': issues}

    r = requests.post('http://{}/process_query'.format(PYSPARK_URL), json=payload)

    if r.status_code != requests.codes.ok:
        logger.error(r.status_code, r.text)
        return '{{message: Server Error: "{}, {}"}}'.format(r.status_code, r.text), 400

    return 'Request with id {} submitted successfully.'.format(request_id)


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

    return 'Request with id {} submitted successfully.'.format(json_request['request_id'])


def send_notification_email(recipient_address, subject, content):
    """
    Sends an email with the passed content to the passed address
    """
    context = ssl.create_default_context()

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = recipient_address
    msg.set_content(content)

    logger.debug('Sending email "{}"'.format(subject))
    try:
        with smtplib.SMTP_SSL(EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT, context=context) as server:
            server.login(EMAIL_SMTP_USERNAME, EMAIL_PASSWORD)
            server.send_message(msg)
    except smtplib.SMTPConnectError:
        logger.error('Error while connecting to SMTP server.')
    except smtplib.SMTPAuthenticationError:
        logger.error('Error while authenticating to SMTP server.')
    except smtplib.SMTPException:
        logger.error('Error while trying to send notification email.')


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'frontend', 'public'), 'favicon.ico',
                               mimetype='image/vnd.microsoft.icon')


if __name__ == '__main__':
    app.run(port=5000)
