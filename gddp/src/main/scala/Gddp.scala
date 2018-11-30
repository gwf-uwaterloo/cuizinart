package com.example.gddp

// import scala.tools.nsc.Interpreter._
import geotrellis.raster._
import geotrellis.raster.histogram.StreamingHistogram
import geotrellis.raster.io._
import geotrellis.raster.render.ColorRamps
import geotrellis.raster.summary.polygonal.{MaxDoubleSummary, MinDoubleSummary, MeanSummary}
import geotrellis.spark._
import geotrellis.spark.io._
import geotrellis.spark.io.hadoop._
import geotrellis.spark.io.index._
import geotrellis.vector._
import geotrellis.vector.io._

import org.apache.log4j.Logger
import org.apache.spark.rdd.RDD
import org.apache.spark.{SparkConf, SparkContext}
import org.apache.spark.storage.StorageLevel

import ucar.nc2._

import java.io._

import scala.collection.JavaConverters._
 

object Gddp {

  val logger = Logger.getLogger(Gddp.getClass)
  val earth_radius = 6371

  //Find the indexes for a given point
  def getIndexes(latArray:Array[Float], lonArray:Array[Float], lat:Double, lon:Double): Array[Int] = { 
    var diffLonArray = collection.mutable.ArrayBuffer[Double]()
    for(i <- 0 to lonArray.length-1){
      diffLonArray += Math.abs(lonArray(i) - lon)
    }
    var minDiffLon = Double.MaxValue
    var minIndexLon = -1
    for( i <- 0 to lonArray.length-1){
      if (diffLonArray(i) < minDiffLon){
        minDiffLon = diffLonArray(i)
        minIndexLon = i
      }
    } 
    var diffLatArray = collection.mutable.ArrayBuffer[Double]()
    for(i <- 0 to lonArray.length-1){
      diffLatArray += Math.abs(latArray(i) - lat)
    }
    var minDiffLat = Double.MaxValue
    var minIndexLat = -1
    for( i <- 0 to latArray.length-1){
      if (diffLatArray(i) < minDiffLat){
        minDiffLat = diffLatArray(i)
        minIndexLat = i
      }
    }
    var yIndex = Math.floor(minIndexLat / 1771).toInt
    var xIndex = (minIndexLon % 1178).toInt

    return Array[Int](yIndex, xIndex) 
  }

  /**
    * Dump bytes to disk [1]
    *
    * 1. https://stackoverflow.com/questions/29978264/how-to-write-the-contents-of-a-scala-stream-to-a-file
    */
  def dump(data: Array[Byte], file: File ) = {
    val target = new BufferedOutputStream( new FileOutputStream(file) );
    try data.foreach( target.write(_) ) finally target.close;
  }

  /**
    * Return a ucar.nc2.NetcdfFile
    */
  def open(uri: String) = {
    if (uri.startsWith("s3:")) {
      val raf = new ucar.unidata.io.s3.S3RandomAccessFile(uri, 1<<15, 1<<24)
      NetcdfFile.open(raf, uri, null, null)
    } else {
      NetcdfFile.open(uri)
    }
  }


  /**
    * Main
    */
  def main(args: Array[String]) : Unit = {
    val netcdfUri =
      if (args.size > 0) args(0)
      else "s3://nasanex/NEX-GDDP/BCSD/rcp85/day/atmos/tasmin/r1i1p1/v1.0/tasmin_day_BCSD_rcp85_r1i1p1_inmcm4_2099.nc"
      // else "/tmp/tasmin_day_BCSD_rcp85_r1i1p1_inmcm4_2099.nc"
    val geojsonUri =
      if (args.size > 1) args(1)
      else "./geojson/LAMI.geo.json"
    val latLng =
      if (args.size > 2) args(2)
      else "46.01213,-71.1232"

    val Array(lat, lon) = latLng.split(",").map(_.toDouble)

    // Get first tile and NODATA value
    val ncfile = open(netcdfUri)
    val vs = ncfile.getVariables()
    val ucarType = vs.get(1).getDataType()
    val latArray = vs.get(1).read().get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
    val lonArray = vs.get(3).read().get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
   

    val ucarTypeX = vs.get(2).getDataType()
    val xArray = vs.get(2).read().get1DJavaArray(ucarTypeX).asInstanceOf[Array[Float]]
    val yArray = vs.get(5).read().get1DJavaArray(ucarTypeX).asInstanceOf[Array[Float]]

    //Finding the Bounding Box

    var minLon = Double.MaxValue

    for( i <- 0 to lonArray.length-1){
      if (lonArray(i) < minLon){
        minLon = lonArray(i)
      }
    }

    var minLat = Double.MaxValue

    for( i <- 0 to latArray.length-1){
      if (latArray(i) < minLat){
        minLat = latArray(i)
      }
    }

    var maxLon = Double.MinValue

    for( i <- 0 to lonArray.length-1){
      if (lonArray(i) > maxLon){
        maxLon = lonArray(i)
      }
    }

    var maxLat = Double.MinValue

    for( i <- 0 to latArray.length-1){
      if (latArray(i) > maxLat){
        maxLat = latArray(i)
      }
    }

    println("Bounding Box: " + minLat + ", " + minLon + " <-> " + maxLat + ", " + maxLon)
   
    // println("LAT.length: " + latArray.length)
    // println("LON.length: " + lonArray.length)

    // println("lonArray: " + latArray.mkString(" "))
  
    var indexes = getIndexes(latArray, lonArray, lat, lon)
    // println(indexes(0))
    // println(indexes(1))
    val xIndex = indexes(1)
    val yIndex = indexes(0)

    val tempArray = vs.asScala
      .filter({ v => v.getFullName == "LST_LWST_avg_daily" || v.getFullName == "tasmin" || v.getFullName == "pr" })
      .head
    println("tempreature size: " + tempArray.getSize())

    val tasmin = vs.asScala
      .filter({ v => v.getFullName == "LST_LWST_avg_daily" || v.getFullName == "tasmin" || v.getFullName == "pr" })
      .head

    val nodata = tasmin
      .getAttributes.asScala
      .filter({ v => v.getFullName == "_FillValue" })
      .head.getValues.getFloat(0)

    val wholeTile = {
      val tileData = vs.get(4).slice(0, 0)
      val Array(y, x) = tileData.getShape()
      val array = tileData.read().get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
      FloatUserDefinedNoDataArrayTile(array, x, y, FloatUserDefinedNoDataCellType(nodata))
    }

    // Save whole data to disk as a PNG
    val histogram = StreamingHistogram.fromTile(wholeTile)
    val breaks = histogram.quantileBreaks(1<<15)
    val ramp = ColorRamps.BlueToRed.toColorMap(breaks)
    val png = wholeTile.renderPng(ramp).bytes
    dump(png, new File("gddp.png"))

    // Get polygon
    val polygon =
      scala.io.Source.fromFile(geojsonUri, "UTF-8")
        .getLines
        .mkString
        .extractGeometries[Polygon]
        .head
    val polygonExtent = polygon.envelope

    // Get extent, slice positions, and tile size (in pixels) for the
    // area around the query polygon
    var PolyMinIndexes = getIndexes(latArray, lonArray, polygonExtent.ymin, polygonExtent.xmin)
    var PolyMaxIndexes = getIndexes(latArray, lonArray, polygonExtent.ymax, polygonExtent.xmax)

    val xSliceStart = PolyMaxIndexes(1)
    val xSliceStop = PolyMinIndexes(1)
    val ySliceStart = PolyMaxIndexes(0)
    val ySliceStop = PolyMinIndexes(0)
 
    val extent = Extent( // Probably only works in intersection of Northern and Western hemispheres
      polygonExtent.xmin,
      polygonExtent.ymin,
      polygonExtent.xmax,
      polygonExtent.ymax)
    val x = xSliceStop - xSliceStart + 1
    val y = ySliceStop - ySliceStart + 1

    // Establish Spark Context
    val sparkConf = (new SparkConf())
      .setAppName("GDDP")
      .set("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
      .set("spark.kryo.registrator", "geotrellis.spark.io.kryo.KryoRegistrator")
      .set("spark.kryo.unsafe", "true")
      .set("spark.rdd.compress", "true")
      .set("spark.ui.enabled", "false")
    val sparkContext = new SparkContext(sparkConf)
    implicit val sc = sparkContext

    // Get RDD of tiles for entire year
    val rdd1 = sc.parallelize(Range(0, 1))
      .mapPartitions({ itr =>
        val ncfile = open(netcdfUri)
        val tasmin = ncfile
          .getVariables.asScala
          .filter({ v => v.getFullName == "tasmin" || v.getFullName == "LST_LWST_avg_daily" || v.getFullName == "pr" })
          .head

        itr.map({ t =>
          // println(s"t: $t xSliceStart: $xSliceStart xSliceStop: $xSliceStop ySliceStart: $ySliceStart ySliceStop: $ySliceStop")
          val array = tasmin
            .read(s"0,$ySliceStart:$ySliceStop,$xSliceStart:$xSliceStop")
            // .read()
            .get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
          FloatUserDefinedNoDataArrayTile(array, x, y, FloatUserDefinedNoDataCellType(nodata))
          
        })
      })
      .persist(StorageLevel.MEMORY_AND_DISK_SER)

    rdd1.count

    // Save first tile to disk as a PNG
    dump(rdd1.first().renderPng(ramp).bytes, new File("gddp1.png"))
    dump(rdd1.first().mask(extent, polygon).renderPng(ramp).bytes, new File("gddp2.png"))

    // Compute means, mins for the given query polygon
    // val polyVals = rdd1.map({ tile => tile.mask(extent, polygon)})
    // val mins = polyVals.map({ tile => MinDoubleSummary.handleFullTile(tile) }).collect().toList
    // val means = polyVals.map({ tile => MeanSummary.handleFullTile(tile).mean }).collect().toList
    // val maxs = polyVals.map({ tile => MaxDoubleSummary.handleFullTile(tile) }).collect().toList

    // Get values for the given query point
    val values = sc.parallelize(Range(0, 1))
      .mapPartitions({ itr =>
        val ncfile = open(netcdfUri)
        val tasmin = ncfile
          .getVariables.asScala
          .filter({ v => v.getFullName == "LST_LWST_avg_daily" || v.getFullName == "tasmin" || v.getFullName == "pr" })
          .head

        itr.map({ t =>
          tasmin
            .read(s"0,$yIndex,$xIndex")
            // .read()
            .getFloat(0)
        })
      })
      .collect()
      .toList

      // println(ySliceStart + " " + ySliceStop)
      // println(xSliceStart + " " + xSliceStop)
      
    val polyVals = tasmin.read(s"0,$ySliceStart:$ySliceStop,$xSliceStart:$xSliceStop") 
      .get1DJavaArray(ucarType).asInstanceOf[Array[Float]].toList

    sparkContext.stop

    // println(s"Value of the given point: $values")
    println(s"Values inside the polygon: $polyVals")
  }
}
