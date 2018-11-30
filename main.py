import os
import pdb
import json
from flask import send_file
from subprocess import call as proccall
from flask import Flask
from flask import request
from flask_cors import CORS
from flask import jsonify


app = Flask("NetCDF-Server")
CORS(app)
basedir = os.path.abspath(os.path.dirname(__file__))

def parse_json(obj):
	all_coordinates = obj["coordinates"][0]
	geo_type = obj["type"]
	top_left = all_coordinates[0]
	top_right = all_coordinates[1]
	bottom_right = all_coordinates[2]
	bottom_left = all_coordinates[3]
	center = all_coordinates[4]

	top_left_lon = top_left[0]
	bottom_left_lon = bottom_left[0]

	top_right_lon = top_right[0]
	bottom_right_lon = bottom_right[0]

	# min_lon = min(top_left_lon, bottom_left_lon)
	# max_lon = max(top_right_lon, bottom_right_lon)

	top_left_lat = top_left[1]
	bottom_left_lat = bottom_left[1]

	top_right_lat = top_right[1]
	bottom_right_lat = bottom_right[1]

	# min_lat = min(bottom_right_lat, bottom_left_lat)
	# max_lat = max(top_right_lat, top_left_lat)
	geojson = {
			  "type": "FeatureCollection",
			  "features": [
			    {
			      "type": "Feature",
			      "geometry": {
			        "type": geo_type,
			        "coordinates": [
			          [
			            [
			              top_left_lon,
			              top_left_lat
			            ],
			            [
			              top_right_lon,
			              top_right_lat
			            ],
			            [
			              bottom_right_lon,
			              bottom_right_lat
			            ],
			            [
			              bottom_left_lon,
			              bottom_left_lat
			            ],
			            [
			              center[0],
			              center[1]
			            ]
			          ]
			        ]
			      }
			    }
			  ]
			}
	with open("geojson.json", 'w') as f:
		f.write(json.dumps(geojson))

	return geojson


@app.route('/getBoundary',methods = ['GET'])
def getBoundary():
	boundary = [[38.2270393371582,-95.11832427978516], [51.424442291259766, -71.68765258789062]]
	return jsonify(boundary)

@app.route('/fetchResult',methods = ['POST'])
def fetchResult():
	data = parse_json(request.get_json())
	print(request.get_json())
	if data:
		proccall("spark-submit --master 'local[*]' gddp/target/scala-2.11/gddp-assembly-0.22.7.jar data/test.nc",
			shell = True
		)
		# process completed.
		return send_file('gddp1.png', mimetype='image/png')
		pass
	else: 
		return '{message: "Server Error"}'


if __name__ == '__main__':
	app.run()