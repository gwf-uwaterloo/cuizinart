flask db init
flask db migrate
flask db upgrade

flask pyspark-init ${CUIZINART_PYSPARK_PASSWORD}

cd cuizinart
python3 monitor.py ${NC_INPUT_PATH} &
uwsgi -s 0.0.0.0:5000 --manage-script-name --mount /cuizinart=main:app --master --processes 4 --threads 2 --logto ${LOG_DIRECTORY}/cuizinart_uwsgi.log --logfile-chmod 666
