from logging.config import dictConfig


def configure_logging(log_file_path, log_level):
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
                'filename': log_file_path,
                'formatter': 'default'
            },
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'default',
                'level': log_level,
                'stream': 'ext://sys.stdout'
            }
        },
        'root': {
            'level': log_level,
            'handlers': ['file', 'console'],
        }
    })
