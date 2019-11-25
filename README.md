
# GWF Cuizinart

The Cuizinart is a cloud-based platform that provides an interactive portal for researchers to "slice and dice" large NetCDF datasets across the GWF program and beyond.
The platform provides an easy-to-use interface similar to Google Maps: researchers select products and variables of interest, provide geographical bounds, and after a short wait, are delivered a custom dataset that meets their exact specifications.

## Setup

For the production setup of Cuizinart and CaSPAr, refer to https://github.com/gwf-uwaterloo/production.

### Dependencies (if not using Docker)
- Install packages: `pip install -r requirements.txt`
- PySpark backend: 
  - Make sure `$SPARK_HOME` is set
  - Run `geopyspark install-jar`
- Frontend: Run `npm install` in `frontend`

### Backend and Database
- Create a file `.env` in the base folder, as described in `docs/env.md`:

- If not using Docker: Create the metadata database:
  - In a `psql` shell, type: `create database cuizinart`
  - In the base directory, run `flask db init`, `flask db migrate`, `flask db upgrade` to create the tables.
  - Run `flask pyspark-init <pwd>` to create a user for the PySpark slicer.

## Run

Currently, we have a development deployment in `tuna` under `/home/mgauch/dev-cuizinart/` (running the `master` branch, no nginx server) and 
- a cuizinart production deployment in `/home/mgauch/cuizinart-prod/` (running the `cuizinart-prod` branch)
- a CaSPAr production deployment in `/home/mgauch/caspar-prod/` (running the `caspar-prod` branch).
The production deployments are accessed through an nginx server, deployed from `/home/mgauch/production`.
Once code is known to run fine on `dev-cuizinart`, we `git merge` `master` into `*-prod`.

### Docker
- Run `docker-compose up` or start containers `cuizinart`, `postgres`, `pyspark` as needed.
- To deploy code changes, run `docker-compose stop cuizinart`, `docker-compose build cuizinart`, `docker-compose up cuizinart`.

### Without Docker
- Serving the frontend:
  - For development and debugging, run `npm start` in `cuizinart/frontend/` to start the frontend server on port 3000.
  - To deploy for production, run `npm run build` in `cuininart/frontend/`

- Run `python cuizinart/main.py` to start the backend facade. 
In case you chose `npm run build` in the previous step, this Flask app will serve the webpage.

- Run `python cuizinart_pyspark/pyspark_app.py` to start the PySpark cuizinart.

### Adding Users
- Run `flask users create <email> --password <pwd> -a`. (When using Docker, you need to run this in the `cuizinart` container.)

