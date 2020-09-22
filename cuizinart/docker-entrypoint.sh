if [ ! -f /tmp/gwf/migrations/env.py  ]
then
    echo "db init"
    flask db init --directory /tmp/gwf/migrations/tmp_migration  # Can't init on an existing empty folder, so we init on a temporary one and then move contents to the mounted volume
    mv /tmp/gwf/migrations/tmp_migration/* /tmp/gwf/migrations/  # Move content to mounted volume so it persists across builds
    rm -rf /tmp/gwf/migrations/tmp_migration
fi

flask db migrate --directory /tmp/gwf/migrations
flask db upgrade --directory /tmp/gwf/migrations

flask pyspark-init ${CUIZINART_PYSPARK_PASSWORD}

cd cuizinart
python3 monitor.py ${NC_INPUT_PATH} &
uwsgi --socket 0.0.0.0:5000 --manage-script-name --mount /home/gwf/cuizinart=main:app --master --processes 4 --threads 2 --logto ${LOG_DIRECTORY}/cuizinart_uwsgi.log --logfile-chmod 666
