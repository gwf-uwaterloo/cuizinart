
# Compiling And Running #

## Dependencies ##

This code relies on two main dependencies to do most of the work: NetCDF Java and GeoTrellis.

### NetCDF Java ###

Because the S3 and HDFS reading capability are not present in mainline NetCDF Java, you must compile and locally-publish a [particular feature branch](https://github.com/Unidata/thredds/tree/feature/s3+hdfs) that was recently contributed by the present author and will hopefully make its way into the mainline at some point.
To compile and locally-publish the feature branch, try something like the following:

```bash
git clone 'git@github.com:Unidata/thredds.git'
cd thredds/
git fetch origin 'feature/s3+hdfs:feature/s3+hdfs'
git checkout 'feature/s3+hdfs'
./gradlew assemble
./gradlew publishToMavenLocal
```

### GeoTrellis ###

This code requires a [1.2.0-SNAPSHOT](https://github.com/locationtech/geotrellis) or later version of GeoTrellis.
That is due to the fact that recently-added tile transformation functions are used in this code which are not present in earlier version of GeoTrellis.
To compile and locally-publish GeoTrellis, try this:

```bash
git clone 'git@github.com:locationtech/geotrellis.git'
cd geotrellis/
./scripts/publish-local.sh
```

## Compile ##

With the dependencies in place, compiling the code in this repository is straightforward:

```bash
sbt "project gddp" assembly
```

## Run ##

To run the code from the root directory of the project, try this:

```bash
$SPARK_HOME/bin/spark-submit --master 'local[*]' \
   gddp/target/scala-2.11/gddp-assembly-0.22.7.jar \
   /tmp/gddp.nc /tmp/boundary.json '32.856388889,-90.4075'
```

where the first argument (after the name of the jar file) is the name of a GDDP NetCDF file, the second argument is the name of a file that contains a polygon in GeoJSON format, and the third argument is a latitude-longitude pair.

The program will produce several outputs:
   - A png of all data
   - A png of the data in the given polygon
   - The value of tempreature for the given location point
   - The values of all points inside the given polygon.
   


# Structure Of This Code #

In this section, we will address some of the key points that can be found in this code.


## Whole Tile Read ##

[This code](https://github.com/geotrellis/geotrellis-netcdf/tree/f6ba0279a306a629a6712500746fe8d211447de0/gddp/src/main/scala/Gddp.scala#L65-L78):
```scala
val ncfile = open(netcdfUri)
val vs = ncfile.getVariables()
val ucarType = vs.get(1).getDataType()
val latArray = vs.get(1).read().get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
val lonArray = vs.get(2).read().get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
val attribs = vs.get(3).getAttributes()
val nodata = attribs.get(0).getValues().getFloat(0)
val wholeTile = {
  val tileData = vs.get(3).slice(0, 0)
  val Array(y, x) = tileData.getShape()
  val array = tileData.read().get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
  FloatUserDefinedNoDataArrayTile(array, x, y, FloatUserDefinedNoDataCellType(nodata)).rotate180.flipVertical
}
```
is where the whole first tile (tile for day zero) is read into a GeoTrellis tile.

Notice the assignments `latArray = vs.get(1)...`, `lonArray = vs.get(2)...`, and `tileData = vs.get(3)...`.
These are enabled by prior knowledge that in GDDP files, the variable with index 1 is an array of latitudes, the variable with index 2 is an array of longitudes, and the variable with index 3 is three-dimensional temperature data.
Perhaps a more robust way to do that would be to iterate through the list of variables and match against the string returned by `vs.get(i).getFullName()`, but the present approach is good enough for government work.

The dimensions of the temperature data are time (in units of days), latitude, and longitude, in that order.
`vs.get(3).slice(0, 0)` requests a slice with the first (0th) index of the first dimension fixed; it requests the whole tile from the first (0th) day.

The assignment `nodata = attribs.get(0).getValues().getFloat(0)` gets the "fill value" for the temperature data which is used as the `NODATA` value for the GeoTrellis tile that is constructed.

## Partial Tile Read ##

[This code](https://github.com/geotrellis/geotrellis-netcdf/tree/f6ba0279a306a629a6712500746fe8d211447de0/gddp/src/main/scala/Gddp.scala#L132-L135):
```scala
val array = tasmin
  .read(s"$t,$ySliceStart:$ySliceStop,$xSliceStart:$xSliceStop")
  .get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
FloatUserDefinedNoDataArrayTile(array, x, y, FloatUserDefinedNoDataCellType(nodata)).rotate180.flipVertical
```
is where the partial tiles (matched to the extent of the query polygon) are read.
Here, instead of using the `slice` method, the slicing functionality of the `read` method is used.
The string that results from `s"$t,$ySliceStart:$ySliceStop,$xSliceStart:$xSliceStop"` will contain three descriptors separated by commas;
the first is a time (specified by an integral index), the second is a latitude range (a range of integral indices with the start and end separated by a colon) and the last is a longitude range (again, a range of integral indices).

## Point Read ##

[This code](https://github.com/geotrellis/geotrellis-netcdf/tree/f6ba0279a306a629a6712500746fe8d211447de0/gddp/src/main/scala/Gddp.scala#L158-L160):
```scala
tasmin
  .read(s"$t,$ySlice,$xSlice")
  .getFloat(0)
```
uses the slicing capability of the `read` method to get the temperature value at a particular time, at a particular latitude, and at a particular longitude.

