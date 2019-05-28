import logging
import os
import sys
import time
from datetime import datetime

from dotenv import load_dotenv
from netCDF4 import Dataset
from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer

import logging_config
from extract_netcdf_header import parse_time
from metadata_schema import db, Product, NCFile, Issue, Horizon

load_dotenv()
log_level = logging.DEBUG if os.getenv('LOG_LEVEL') == 'DEBUG' else logging.INFO
logging_config.configure_logging(os.path.join(os.getenv('LOG_DIRECTORY'), 'monitor.log'), log_level)
logger = logging.getLogger('monitor')


def parse_str_time(strs):
    return datetime.strptime(strs, '%Y-%m-%d %H:%M:%S')


def add_metadata(src_path):
    product_name = os.path.basename(os.path.dirname(src_path))
    file_name = os.path.basename(src_path)
    is_forecast = False
    if product_name.startswith('forecast_'): # Folder name starts with forecast is forecast files
        product_name = product_name[9:]
        is_forecast = True

    product = Product.query.filter_by(key=product_name).first()
    if product is None:
        logger.error('Only support existing products')
    else:
        try:
            f = Dataset(src_path,'r')
        except Exception as e:
            logger.error('Missing File {}'.format(src_path))
            raise e

        times = parse_time(f)
        if parse_str_time(times[0]) < product.start_date:
            product.start_date = times[0]
        if parse_str_time(times[-1]) > product.end_date:
            product.end_date = times[-1]
        new_file = NCFile(file_name=file_name, start_date=times[0], end_date=times[-1], product=product)
        db.session.add(new_file)
        if is_forecast:
            issue = file_name[-7:-3]
            if Issue.query.filter_by(issue=issue).first() is None:
                new_issue = Issue(issue=issue, product=product)
                db.session.add(new_issue)
            start_time = parse_str_time(times[0])
            for t in times:
                t = parse_str_time(t)
                horizon = (t - start_time).days*24 + (t - start_time).seconds/3600 # hourly
                if Horizon.query.filter_by(horizon=horizon).first() is None:
                    db.session.add(Horizon(horizon=horizon, product=product))

        db.session.add(product)
        db.session.commit()


class MonitorHandler(PatternMatchingEventHandler):
    def on_created(self, event):
        # This function is called when a file is created
        db.session.remove()
        add_metadata(event.src_path)

        logger.info('event path: {} , event type: {}, is Dir: {}!'.format(event.src_path, event.event_type,
                                                                          event.is_directory))

    def on_deleted(self, event):
        # This function is called when a file is deleted
        logger.info('Someone deleted {}!'.format(event.src_path))


def update_existing_file_changes(prod_path):
    db.session.remove()
    all_nc_files = NCFile.query.all()
    file_names = list(map(lambda f: f.file_name, all_nc_files))
    for (path, subdirs, files) in os.walk(prod_path):
        if path != products_path:
            f_names = list(filter(lambda n: n.endswith('.nc'), files))
            added_files, deleted_files = list(set(f_names) - set(file_names)), list(set(file_names) - set(f_names))
            for name in added_files:
                logger.info('New added file {}'.format(os.path.join(path, name)))
                add_metadata(os.path.join(path, name))
            for name in deleted_files:
                logger.info('Deleted {}'.format(os.path.join(path, name)))


if __name__ == '__main__':
    if len(sys.argv) == 2:
        products_path = sys.argv[1]
    else:
        logger.error('Usage {} product_path'.format(sys.argv[0]))
        logger.error('Invalid argument')
        sys.exit(1)

    logger.info('path: {}'.format(products_path))

    update_existing_file_changes(products_path)

    event_handler = MonitorHandler(patterns=['*.nc'],
                                   ignore_patterns=[],
                                   ignore_directories=True)
    observer = Observer()
    observer.schedule(event_handler, products_path, recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
