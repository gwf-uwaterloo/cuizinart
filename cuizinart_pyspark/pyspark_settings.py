import os

from dotenv import load_dotenv

load_dotenv()

SPARK_MASTER = os.getenv('SPARK_MASTER')

NC_INPUT_PATH = os.getenv('NC_INPUT_PATH')
NC_OUTPUT_PATH = os.getenv('NC_OUTPUT_PATH')