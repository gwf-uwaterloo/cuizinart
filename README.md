
# GWF Cuizinart

## Dependencies
- PySpark backend: (Possibly incomplete list:) `pyspark, geopyspark, numpy, netCDF4, flask, flask_cors`
- Frontend: Run `npm install` in `frontend/backend-{pyspark | slurm}`

## Run

### PySpark Backend
- start the backend server: run `python main.py` in the project's root directory
- start the frontend server: run `npm start` in the `frontend/backend-pyspark` directory

### SLURM Backend
- start the backend server: run `python graham-scp.py` in the project's root directory
- start the frontend server: run `npm start` in the `frontend/backend-slurm` directory

The frontend server will serve on port 3000.

