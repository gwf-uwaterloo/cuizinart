flask db init
flask db migrate
flask db upgrade

flask pyspark-init ${CUIZINART_PYSPARK_PASSWORD}

# $1 is path to input files
cd cuizinart
python3 monitor.py $1 &
python3 main.py
