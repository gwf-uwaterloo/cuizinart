flask db init
flask db migrate
flask db upgrade

flask pyspark-init ${CUIZINART_PYSPARK_PASSWORD}

cd cuizinart
python3 monitor.py ${NC_INPUT_PATH} &
python3 main.py
