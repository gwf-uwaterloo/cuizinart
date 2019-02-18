
# GWF Cuizinart

## Setup

### Dependencies
- PySpark backend: 
  - Make sure `$SPARK_HOME` is set
  - Install packages: `pyspark, geopyspark, numpy, netCDF4, Flask, Flask-Cors, Flask-SQLAlchemy, Flask-Migrate, python-dotenv`
  - Run `geopyspark install-jar`
- Frontend: Run `npm install` in `frontend`

### Backend and Database
- Create a file `Cuizinart/.env`, containing:
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

- Create the metadata database:
  - In a `psql` shell, type: `create database cuizinart`
  - In `Cuizinart/`, run `flask db init`, `flask db migrate`, `flask db upgrade` to create the tables.

## Run
- Run `python main.py` to start the backend facade.

- Run `npm start` in `frontend/` to start the frontend server on port 3000.

