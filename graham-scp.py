import os
from flask import Flask
from flask import request
from flask_cors import CORS

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


if __name__ == '__main__':
    app.run()
