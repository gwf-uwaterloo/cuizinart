import os

from dotenv import load_dotenv

load_dotenv()

SPARK_MASTER = os.getenv('SPARK_MASTER')
CUIZINART_URL = os.getenv('CUIZINART_URL')
CUIZINART_PYSPARK_PASSWORD = os.getenv('CUIZINART_PYSPARK_PASSWORD')

NC_INPUT_PATH = os.getenv('NC_INPUT_PATH')
NC_OUTPUT_PATH = os.getenv('NC_OUTPUT_PATH')