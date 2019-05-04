
# GWF Cuizinart

The Cuizinart is a cloud-based platform that provides an interactive portal for researchers to "slice and dice" large NetCDF datasets across the GWF program and beyond.
The platform provides an easy-to-use interface similar to Google Maps: researchers select products and variables of interest, provide geographical bounds, and after a short wait, are delivered a custom dataset that meets their exact specifications.

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
APP_SECRET_KEY=<secret-key>
PASSWORD_SALT=<salt>
LOG_DIRECTORY=<path>
LOG_LEVEL=DEBUG  # optional

BACKEND=pyspark
PYSPARK_URL=pyspark:5001  # if not using Docker, use localhost:5001
SSH_USER_NAME=<graham_user>
SSH_KEYFILE_PATH=<path_to_keyfile>
SSH_KNOWN_HOSTS_PATH=<path_to_file>

POSTGRES_USER=<user>
POSTGRES_PW=<pwd>
POSTGRES_URL=postgres:5432  # if not using Docker, use localhost:5432
POSTGRES_DB=cuizinart
DB_MIGRATIONS_FOLDER=<path>  # only needed when using Docker (allows DB migrations across container builds) 

EMAIL_SMTP_SERVER=<server>
EMAIL_SMTP_PORT=465
EMAIL_SMTP_USERNAME=<user>
EMAIL_ADDRESS=<address>
EMAIL_PASSWORD=<pwd>


# PySpark ENV variables
CUIZINART_URL=https://tuna.cs.uwaterloo.ca  # if not using Docker, use localhost:5000
SPARK_MASTER=local[*]

NC_INPUT_PATH=<path to NetCDF files>
NC_OUTPUT_PATH=<path to store output NetCDF files>

CUIZINART_PYSPARK_PASSWORD=<pwd>  # password to authenticate PySpark-slicer in Cuizinart
```

- If not using Docker: Create the metadata database:
  - In a `psql` shell, type: `create database cuizinart`
  - In the base directory, run `flask db init`, `flask db migrate`, `flask db upgrade` to create the tables.
  - Run `flask pyspark-init <pwd>` to create a user for the PySpark slicer.

## Run

### Docker
- For initial setup of the Let's Encrypt certificates, run `./init-letsencrypt.sh` (only needed once)
- Run `docker-compose up` or start containers `nginx`, `cuizinart`, `postgres`, `pyspark` as needed. nginx will serve the application on tuna.cs.uwaterloo.ca.

### Without Docker
- Serving the frontend:
  - For development and debugging, run `npm start` in `cuizinart/frontend/` to start the frontend server on port 3000.
  - To deploy for production, run `npm run build` in `cuininart/frontend/`

- Run `python cuizinart/main.py` to start the backend facade. 
In case you chose `npm run build` in the previous step, this Flask app will serve the webpage.

- Run `python cuizinart_pyspark/pyspark_app.py` to start the PySpark cuizinart.

### Adding Users
- Run `flask users create <email> --password <pwd> -a`. (When using Docker, you need to run this in the `cuizinart` container.)

