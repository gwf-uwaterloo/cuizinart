import logging
import os

from dotenv import load_dotenv
from flask import Flask
from flask_mail import Mail
from flask_wtf import CSRFProtect

import logging_config

load_dotenv()
postgres_user = os.getenv('POSTGRES_USER')
postgres_pw = os.getenv('POSTGRES_PW')
postgres_url = os.getenv('POSTGRES_URL')
postgres_db = os.getenv('POSTGRES_DB')

PYSPARK_URL = os.getenv('PYSPARK_URL')

BACKEND_SLURM = 'slurm'
BACKEND_PYSPARK = 'pyspark'
BACKEND = os.getenv('BACKEND')
SSH_KEYFILE_PATH = os.getenv('SSH_KEYFILE_PATH')
SSH_USER_NAME = os.getenv('SSH_USER_NAME')

EMAIL_SMTP_SERVER = os.getenv('EMAIL_SMTP_SERVER')
EMAIL_SMTP_PORT = os.getenv('EMAIL_SMTP_PORT')
EMAIL_SMTP_USERNAME = os.getenv('EMAIL_SMTP_USERNAME')
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

LOG_LEVEL = logging.DEBUG if os.getenv('LOG_LEVEL') == 'DEBUG' else logging.INFO
LOG_DIRECTORY = os.getenv('LOG_DIRECTORY')
logging_config.configure_logging(os.path.join(LOG_DIRECTORY, 'cuizinart.log'), LOG_LEVEL)

app = Flask('cuizinart', static_folder=os.path.join(os.path.dirname(__file__), 'frontend', 'build', 'static'), 
            template_folder=os.path.join(os.path.dirname(__file__), 'frontend', 'build'))
CSRFProtect(app)
DB_URL = 'postgresql://{user}:{pw}@{url}/{db}'.format(user=postgres_user, pw=postgres_pw,
                                                      url=postgres_url, db=postgres_db)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_DATABASE_URI'] = DB_URL
app.secret_key = os.getenv('APP_SECRET_KEY')
app.config['SECURITY_PASSWORD_SALT'] = os.getenv('PASSWORD_SALT')
app.config['SECURITY_CONFIRMABLE'] = False
app.config['SECURITY_REGISTERABLE'] = False
app.config['SECURITY_RECOVERABLE'] = True
app.config['SECURITY_CHANGEABLE'] = True
app.config['SECURITY_EMAIL_SENDER'] = EMAIL_ADDRESS
app.config['SECURITY_EMAIL_SUBJECT_REGISTER'] = 'Welcome to Cuizinart'
app.config['WTF_CSRF_ENABLED'] = False

app.config['MAIL_SERVER'] = EMAIL_SMTP_SERVER
app.config['MAIL_PORT'] = EMAIL_SMTP_PORT
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = EMAIL_SMTP_USERNAME
app.config['MAIL_PASSWORD'] = EMAIL_PASSWORD
mail = Mail(app)
