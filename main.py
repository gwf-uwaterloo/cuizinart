import os
import pdb
from subprocess import call as proccall
from flask import Flask
from flask import request


app = Flask("NetCDF-Server")
basedir = os.path.abspath(os.path.dirname(__file__))

def parse_json(obj):
	pass



@app.route('/')
def main():
	if request.method == 'GET': 
		return 'First page'
	elif request.method == 'POST':
		# data is supposed to be a JSON object
		# make the geoJson polygon and pass it to process call
		data = parse_json(request.get_json())
		if data:
			# proccall([
			# 	'cd',
			# 	basedir + '../geotrellis-netcdf'
			# ])
			proccall([
				'spark-submit',
				'--master',
				'\'local[*]\'',
				'gddp/target/scala-2.11/gddp-assembly-0.22.7.jar',
				'/tmp/gddp.nc',
				# geojson here
			])
			# process completed.

			pass
		else: 
			return '{message: "Server Error"}'


if __name__ == '__main__':
	app.run()