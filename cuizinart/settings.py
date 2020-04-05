import logging
import os

from dotenv import load_dotenv
from flask import Flask
from flask_mail import Mail
from flask_wtf import CSRFProtect
from flask import g
from flask.sessions import SecureCookieSessionInterface
from flask_login import user_loaded_from_header

import logging_config

load_dotenv()
postgres_user = os.getenv('POSTGRES_USER')
postgres_pw = os.getenv('POSTGRES_PW')
postgres_url = os.getenv('POSTGRES_URL')
postgres_db = os.getenv('POSTGRES_DB')

PYSPARK_URL = os.getenv('PYSPARK_URL')

BACKEND_SLURM = 'slurm'
BACKEND_PYSPARK = 'pyspark'
SSH_TARGET_PATH = os.getenv('SSH_TARGET_PATH')
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
app.config['SECURITY_CONFIRMABLE'] = True
app.config['SECURITY_MSG_CONFIRMATION_REQUIRED'] = ("Email requires activation.", "error")
app.config['SECURITY_REGISTERABLE'] = True
app.config['SECURITY_SEND_REGISTER_EMAIL'] = True
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


# Do not set session cookie as we're using token-based authentication
# https://flask-login.readthedocs.io/en/latest/#disabling-session-cookie-for-apis
class CustomSessionInterface(SecureCookieSessionInterface):
    """Prevent creating session from API requests."""
    def save_session(self, *args, **kwargs):
        return

app.session_interface = CustomSessionInterface()

@user_loaded_from_header.connect
def user_loaded_from_header(self, user=None):
    g.login_via_header = True

app.config['SECURITY_TOKEN_MAX_AGE'] = 7*24*60*60  # 1 week
