import os
from flask import Flask
from flask import request
from flask_cors import CORS
from flask import jsonify
app = Flask("graham-scp")
CORS(app)


@app.route('/processJson', methods=['POST'])
def processJson():
    json_request = request.get_json()

    if json_request['user_email'] != 'juliane.mai@uwaterloo.ca' or json_request['user_id'] != 'julemai':
        return '{message: "Invalid user or email"}', 401

    request_string = str(json_request).replace("'", '"')
    print(request_string)

    file_name = '__cuizinart-graham-request-{}-{}.dat'.format(json_request['user_id'],
                                                              json_request['request_id'])
    with open(file_name, 'w') as f:
        f.write(request_string)

    os.system("scp -i '~/.ssh/id_rsa_graham' {} mgauch@graham.computecanada.ca:/project/6008034/WRF-REQUEST/INBOX/".format(file_name))

    return '{message: "success"}'


@app.route('/getBoundaries', methods=['GET'])
def getBoundaries():
    files = os.listdir('data/boundaries')
    file_json = []
    for file_name in files:
        with open('data/boundaries/{}'.format(file_name)) as f:
            file_json.append(f.read())

    return jsonify(file_json)


if __name__ == '__main__':
    app.run()
