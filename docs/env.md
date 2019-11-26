## `.env` Variables

|Name|Value|Explanation|
|---|---|---|
|FLASK_APP|`cuizinart/main.py`|Environment variable needed so Flask knows which app to start|
|APP_SECRET_KEY|`<secret-key>`|Random string used by password encryption|
|PASSWORD_SALT|`<salt>`|Random string used by password encryption (Don't reuse secret key)|
|LOG_DIRECTORY|`<path>`|Directory to put log files|
|LOG_LEVEL|`DEBUG`|optional. If `DEBUG`, will log on debug level, else on info|
||||
|PYSPARK_URL|`pyspark:5001`|URL where Cuizinart can send jobs to the pyspark slicer. If not using Docker, use `localhost:5001`|
|SSH_USER_NAME|`<graham_user>`|User on tuna that is used to `scp` jobs to Graham|
|SSH_KEYFILE_PATH|`<path_to_keyfile>`|Path to keyfile (generated through `ssh-keygen`) for above user|
|SSH_TARGET_PATH|`host:path`|Host and path where incoming processing requests will be scp'ed to|
|SSH_KNOWN_HOSTS_PATH|`<path_to_file>`|Path to `known_host` file that will be mapped into Cuizinart container so `scp` to Graham works immediately|
||||
|POSTGRES_USER|`<user>`|Username of postgres db|
|POSTGRES_PW|`<pwd>`|Password of postgres user|
|POSTGRES_URL|`postgres:5432`|URL where to access the postgres container. If not using Docker, use `localhost:5432`|
|POSTGRES_DB|`cuizinart`|Name of postgres db|
|DB_MIGRATIONS_FOLDER|`<path>`|Folder to mount into Cuizinart container that will contain migrations files. Only needed when using Docker (allows DB migrations across container builds)|
||||
|EMAIL_SMTP_SERVER|`mailservices.uwaterloo.ca`|Server to use for sending emails|
|EMAIL_SMTP_PORT|`465`|Server SMTP port|
|EMAIL_SMTP_USERNAME|`<user>`|Username for email account|
|EMAIL_ADDRESS|`<address>`|Email address to send from|
|EMAIL_PASSWORD|`<pwd>`|Password of email user|
||||
|**PySpark slicer variables**|||
|CUIZINART_URL|`https://tuna.cs.uwaterloo.ca`|Address where pyspark can report job results to. If not using Docker, use `localhost:5000`|
|SPARK_MASTER|`local[*]`|PySpark configuration|
||||
|NC_INPUT_PATH|`<path to NetCDF files>`|Path to NetCDF input files|
|NC_OUTPUT_PATH|`<path to store output NetCDF files>`|Path where to store sliced output files|
||||
|CUIZINART_PYSPARK_PASSWORD|`<pwd>`|Password to authenticate PySpark-slicer in Cuizinart|
