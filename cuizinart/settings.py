import os
from dotenv import load_dotenv

load_dotenv()
postgres_user = os.getenv('POSTGRES_USER')
postgres_pw = os.getenv('POSTGRES_PW')
postgres_url = os.getenv('POSTGRES_URL')
postgres_db = os.getenv('POSTGRES_DB')

PYSPARK_URL = os.getenv('PYSPARK_URL')

BACKEND_SLURM = 'slurm'
BACKEND_PYSPARK = 'pyspark'
BACKEND = os.getenv('BACKEND')
if BACKEND == BACKEND_SLURM:
    SSH_KEYFILE_PATH = os.getenv('SSH_KEYFILE_PATH')
    SSH_USER_NAME = os.getenv('SSH_USER_NAME')

EMAIL_SMTP_SERVER = os.getenv('EMAIL_SMTP_SERVER')
EMAIL_SMTP_PORT = os.getenv('EMAIL_SMTP_PORT')
EMAIL_SMTP_USERNAME = os.getenv('EMAIL_SMTP_USERNAME')
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
