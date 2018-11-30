import os
import pdb
from subprocess import call as proccall
from flask import Flask
from flask import request
from flask_cors import CORS
from flask import jsonify


app = Flask("NetCDF-Server")
CORS(app)
basedir = os.path.abspath(os.path.dirname(__file__))

def parse_json(obj):
	pass



@app.route('/getBoundary',methods = ['GET'])
def getBoundary():
	boundary = [[38.2270393371582,-95.11832427978516], [51.424442291259766, -71.68765258789062]]
	return jsonify(boundary)

@app.route('/fetchResult',methods = ['POST'])
def fetchResult():
	data = parse_json(request.get_json())
	print(request.get_json())
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