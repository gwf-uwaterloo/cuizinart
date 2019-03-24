flask db init
flask db migrate
flask db upgrade

# $1 is path to input files
python3 cuizinart/monitor.py $1 &
python3 cuizinart/main.py
