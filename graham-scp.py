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
        return

    request_string = str(json_request)
    print(request_string)

    with open('__cuizinart-graham-request.dat', 'w') as f:
        f.write(request_string)

    os.system("scp -i '~/.ssh/id_rsa_graham' __cuizinart-graham-request.dat mgauch@graham.computecanada.ca:/project/6008034/WRF-REQUEST/INBOX/")


if __name__ == '__main__':
    app.run()
