
# GWF Cuizinart

## Setup

### Dependencies (if not using Docker)
- Install packages: `pip install -r requirements.txt`
- PySpark backend: 
  - Make sure `$SPARK_HOME` is set
  - Run `geopyspark install-jar`
- Frontend: Run `npm install` in `frontend`

### Backend and Database
- Create a file `.env` in the base folder, containing:
```
FLASK_APP=cuizinart/main.py

BACKEND=pyspark
PYSPARK_URL=pyspark:5001  # if not using Docker, use localhost:5001

SSH_USER_NAME=<graham_user>
SSH_KEYFILE_PATH=<path_to_keyfile>

POSTGRES_USER=<user>
POSTGRES_PW=<pwd>
POSTGRES_URL=postgres:5432  # if not using Docker, use localhost:5432
POSTGRES_DB=cuizinart

EMAIL_SMTP_SERVER=<server>
EMAIL_SMTP_PORT=465
EMAIL_SMTP_USERNAME=<user>
EMAIL_ADDRESS=<address>
EMAIL_PASSWORD=<pwd>
```

- Create a file `cuizinart_pyspark/.env`, containing:
```
CUIZINART_URL=backend:5000  # if not using Docker, use localhost:5000
SPARK_MASTER=local[*]

NC_INPUT_PATH=<path to NetCDF files>
NC_OUTPUT_PATH=<path to store output NetCDF files>
```

- If not using Docker: Create the metadata database:
  - In a `psql` shell, type: `create database cuizinart`
  - In `cuizinart/`, run `flask db init`, `flask db migrate`, `flask db upgrade` to create the tables.

## Run

### Docker
- Run `docker-compose up` or start containers `frontend`, `backend`, `postgres`, `pyspark` as needed.

### Without Docker
- Run `python cuizinart/main.py` to start the backend facade.

- Run `python cuizinart_pyspark/pyspark_app.py` to start the PySpark cuizinart.

- Run `npm start` in `frontend/` to start the frontend server on port 3000.

