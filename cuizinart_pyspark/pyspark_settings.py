import logging
import os
from logging.config import dictConfig

from dotenv import load_dotenv

load_dotenv()

SPARK_MASTER = os.getenv('SPARK_MASTER')
CUIZINART_URL = os.getenv('CUIZINART_URL')
CUIZINART_PYSPARK_PASSWORD = os.getenv('CUIZINART_PYSPARK_PASSWORD')

NC_INPUT_PATH = os.getenv('NC_INPUT_PATH')
NC_OUTPUT_PATH = os.getenv('NC_OUTPUT_PATH')

LOG_LEVEL = logging.DEBUG if os.getenv('LOG_LEVEL') == 'DEBUG' else logging.INFO
LOG_DIRECTORY = os.getenv('LOG_DIRECTORY')

dictConfig({
    'version': 1,
    'formatters': {
        'default': {
            'format': '[%(asctime)s] %(name)s - %(levelname)s: %(message)s',
        }
    },
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOG_DIRECTORY, 'pyspark.log'),
            'formatter': 'default'
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'default',
            'level': 'WARNING',
            'stream': 'ext://sys.stdout'
        }
    },
    'root': {
        'level': LOG_LEVEL,
        'handlers': ['file', 'console']
    }
})
