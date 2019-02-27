
# GWF Cuizinart

## Setup

### Dependencies
- PySpark backend: 
  - Make sure `$SPARK_HOME` is set
  - Install packages: `pyspark, geopyspark, numpy, netCDF4, Flask, Flask-Cors, Flask-SQLAlchemy, Flask-Migrate, python-dotenv, flask-marshmallow, marshmallow-sqlalchemy`
  - Run `geopyspark install-jar`
- Frontend: Run `npm install` in `frontend`

### Backend and Database
- Create a file `cuizinart/.env`, containing:
```
FLASK_APP=main.py

BACKEND=pyspark

SSH_USER_NAME=<graham_user>
SSH_KEYFILE_PATH=<path_to_keyfile>

POSTGRES_USER=<user>
POSTGRES_PW=<pwd>
POSTGRES_URL=localhost
POSTGRES_DB=cuizinart
```

- Create a file `cuizinart_pyspark/.env`, containing:
```
SPARK_MASTER=local[*]

NC_INPUT_PATH=<path to NetCDF files>
NC_OUTPUT_PATH=<path to store output NetCDF files>
```

- Create the metadata database:
  - In a `psql` shell, type: `create database cuizinart`
  - In `cuizinart/`, run `flask db init`, `flask db migrate`, `flask db upgrade` to create the tables.

## Run
- Run `python cuizinart/main.py` to start the backend facade.

- Run `python cuizinart_pyspark/pyspark_app.py` to start the PySpark cuizinart.

- Run `npm start` in `frontend/` to start the frontend server on port 3000.

