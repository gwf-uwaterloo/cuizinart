if [ ! -f migrations/env.py  ]
then
    echo "db init"
    flask db init --directory tmp_migration  # Can't init on an existing empty folder, so we init on a temporary one and then move contents to the mounted volume
    mv tmp_migration/* migrations/  # Move content to mounted volume so it persists across builds
    rm -rf tmp_migration
fi

flask db migrate
flask db upgrade

flask pyspark-init ${CUIZINART_PYSPARK_PASSWORD}

cd cuizinart
python3 monitor.py ${NC_INPUT_PATH} &
uwsgi --socket 0.0.0.0:5000 --manage-script-name --mount /cuizinart=main:app --master --processes 4 --threads 2 --logto ${LOG_DIRECTORY}/cuizinart_uwsgi.log --logfile-chmod 666
