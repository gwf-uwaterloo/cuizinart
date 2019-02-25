import os
from dotenv import load_dotenv

load_dotenv()
postgres_user = os.getenv('POSTGRES_USER')
postgres_pw = os.getenv('POSTGRES_PW')
postgres_url = os.getenv('POSTGRES_URL')
postgres_db = os.getenv('POSTGRES_DB')

BACKEND_SLURM = 'slurm'
BACKEND_PYSPARK = 'pyspark'
BACKEND = os.getenv('BACKEND')
if BACKEND == BACKEND_SLURM:
    SSH_KEYFILE_PATH = os.getenv('SSH_KEYFILE_PATH')
    SSH_USER_NAME = os.getenv('SSH_USER_NAME')