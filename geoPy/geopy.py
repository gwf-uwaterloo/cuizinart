import os
import sys
import pdb
import math
from netCDF4 import Dataset
from pyspark import SparkContext, SparkConf

# This code does the same thing as gddp.scala. Excpet that it cannot create a PNG file and currently it is not using spark.
# You need to install PySpark and GeoPySpark and netCDF4 in order to run this code.

y_array = None
x_array = None
lat_array = None
lon_array = None
total_temp = None
temperature = None

def openFile(path):
	return Dataset(path, "r", format="NETCDF4")

def getIndexes(lat, lon):
	global lat_array, lon_array
	minDiffLatIndex = -1
	minDiffLat = sys.maxsize

	for i, latItem in enumerate(lat_array.flatten()):
		if abs(latItem - lat) < minDiffLat:
			minDiffLat = abs(latItem - lat)
			minDiffLatIndex = i

	minDiffLonIndex = -1
	minDiffLon = sys.maxsize

	for i, lonItem in enumerate(lon_array.flatten()):
		if abs(lonItem - lon) < minDiffLon:
			minDiffLon = abs(lonItem - lon)
			minDiffLonIndex = i

	return [
		int(math.floor(minDiffLatIndex / 1178)),
		int(math.floor(minDiffLatIndex % 1178)),
		int(math.floor(minDiffLonIndex / 1178)),
		int(math.floor(minDiffLonIndex % 1178)),
	]

	

def readInput(path):
	global total_temp, x_array, y_array, lon_array, lat_array, temperature
	data = openFile(path)
	temperature = data.get_variables_by_attributes(long_name="daily average temperature")[0]
	lat = data.get_variables_by_attributes(long_name="latitude coordinate")[0]
	lon = data.get_variables_by_attributes(long_name="longitude coordinate")[0]
	x = data.get_variables_by_attributes(long_name="x coordinate of projection")[0]
	y = data.get_variables_by_attributes(long_name="y coordinate of projection")[0]

	total_temp = temperature[:][0]
	lat_array = lat[:]
	lon_array = lon[:]
	x_array = x[:]
	y_array = y[:]


def slice(array, xstart, xend, ystart, yend):
	result = []

	for item in array[xstart:xend]:
		result.append(item[ystart:yend])

	# pdb.set_trace()
	return result


def process_query(latMin, latMax, lonMin, lonMax):

	global total_temp, x_array, y_array, lon_array, lat_array
	geopy.readInput('data/test.nc') 

	PolyMinIndexes = getIndexes(latMin, lonMin)
	PolyMaxIndexes = getIndexes(latMax, lonMax)

	ySliceStart = min(min(PolyMaxIndexes[1], PolyMinIndexes[1]), min(PolyMaxIndexes[3], PolyMinIndexes[3]))
	ySliceStop = max(max(PolyMaxIndexes[1], PolyMinIndexes[1]), max(PolyMaxIndexes[3], PolyMinIndexes[3]))
	xSliceStart = min(min(PolyMaxIndexes[0], PolyMinIndexes[0]), min(PolyMaxIndexes[2], PolyMinIndexes[2]))
	xSliceStop = max(max(PolyMaxIndexes[0], PolyMinIndexes[0]), max(PolyMaxIndexes[2], PolyMinIndexes[2]))

	xSize = xSliceStop - xSliceStart + 1
	ySize = ySliceStop - ySliceStart + 1

	# conf = SparkConf()
	# conf.set("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
	# conf.set("spark.kryo.registrator", "geotrellis.spark.io.kryo.KryoRegistrator")
	# conf.set("spark.kryo.unsafe", "true")
	# conf.set("spark.rdd.compress", "true")
	# conf.set("spark.ui.enabled", "false")
	# sc = SparkContext(conf=conf)

	# Currently it is reading one file (one day) and we don't need spark, I commented out the spark conf building. If we want to use pyspark, you should use a map or flat map for reading several files or creating any other RDDs.
	sliced_temp = slice(total_temp, xSliceStart, xSliceStop, ySliceStart, ySliceStop)
	
	for item in sliced_temp[:]:
		item.dump("result.txt")
			



def main():
	global total_temp, x_array, y_array, lon_array, lat_array
	path = "../data/test.nc"
	readInput(path)


if __name__ == "__main__":
	main()