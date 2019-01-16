import os
from flask import Flask
from flask import request
from flask_cors import CORS

app = Flask("graham-scp")
CORS(app)


@app.route('/processJson', methods=['POST'])
def processJson():
    str = str(request.get_json())
    print(str)

    with open('__graham-request.dat', 'w') as f:
        f.write(str)

    os.system("scp -i '~/.ssh/id_rsa_graham' __graham-request.dat mgauch@graham.computecanada.ca:/project/6008034/WRF-REQUEST/INBOX/")


if __name__ == '__main__':
    app.run()
