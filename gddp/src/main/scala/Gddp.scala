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

  //Find (x and y) indexes for a given point (lat, lon)
  def getIndexes(latArray:Array[Float], lonArray:Array[Float], shape: Array[Int], lat:Double, lon:Double): Tuple2[Integer, Integer] = {
    var minSquareDis = Double.MaxValue
    var index = 0
    for(i <- 0 until latArray.length){
      val squareDis = Math.sqrt(latArray(i)-lat)+Math.sqrt(lonArray(i)-lon)
      if(squareDis < minSquareDis){
        minSquareDis = squareDis
        index = i
      }
    }

    (index/shape(1), index%shape(1)) // y,x

    /*
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
    /*
    x = index % width
    y = index / width
    or

    x = index / height
    y = index % height
     */
    val yIndex = minIndexLat / shape(1) // y,x
    val xIndex = minIndexLat % shape(1)

    val yIndex1 = minIndexLon / shape(1)
    val xIndex1 = minIndexLon % shape(1)


    return Array[Int](yIndex, xIndex, yIndex1, xIndex1)
    */
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
    
    NetcdfFile.open(uri)
  }


  /**
    * Main
    */
  def main(args: Array[String]) : Unit = {
    val netcdfUri = args(0)
      // else "/tmp/temp_day_BCSD_rcp85_r1i1p1_inmcm4_2099.nc"
    val geojsonUri =
      if (args.size > 1) args(1)
      else "./geojson/LAMI.geo.json"
  

    // Get first tile and NODATA value and arrays of x, y, lat and lon
    val ncfile = open(netcdfUri)
    val vs = ncfile.getVariables()
    val ucarType = vs.get(1).getDataType() // lat
    val latArray2D = vs.get(1).read()
    val latArray = latArray2D.get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
    val lonArray2D = vs.get(3).read()
    val lonArray = lonArray2D.get1DJavaArray(ucarType).asInstanceOf[Array[Float]] //long
   

    val ucarTypeX = vs.get(2).getDataType()
    val xArray = vs.get(2).read().get1DJavaArray(ucarTypeX).asInstanceOf[Array[Float]]
    val yArray = vs.get(5).read().get1DJavaArray(ucarTypeX).asInstanceOf[Array[Float]]


    val temp = vs.asScala
      .filter({ v => v.getFullName == "LST_LWST_avg_daily" })
      .head

    //--
    val nodata = temp
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
    //---
    // Get polygon of the bounding box
    val polygon =
      scala.io.Source.fromFile(geojsonUri, "UTF-8")
        .getLines
        .mkString
        .extractGeometries[Polygon]
        .head
    val polygonExtent = polygon.envelope // ymin: lat, xmin: long

    // todo: verify correctness
    val PolyMinIndexes = getIndexes(latArray, lonArray, lonArray2D.getShape, polygonExtent.ymin, polygonExtent.xmin)
    val PolyMaxIndexes = getIndexes(latArray, lonArray,lonArray2D.getShape, polygonExtent.ymax, polygonExtent.xmax)
    /*
        //1,3:x, 0,2: y
        val xSliceStart = Math.min(Math.min(PolyMaxIndexes(1), PolyMinIndexes(1)), Math.min(PolyMaxIndexes(3), PolyMinIndexes(3)))
        val xSliceStop = Math.max(Math.max(PolyMaxIndexes(1), PolyMinIndexes(1)), Math.max(PolyMaxIndexes(3), PolyMinIndexes(3)))
        val ySliceStart = Math.min(Math.min(PolyMaxIndexes(0), PolyMinIndexes(0)), Math.min(PolyMaxIndexes(2), PolyMinIndexes(2)))
        val ySliceStop = Math.max(Math.max(PolyMaxIndexes(0), PolyMinIndexes(0)), Math.max(PolyMaxIndexes(2), PolyMinIndexes(2)))

        */

     val xSliceStart = PolyMinIndexes._2
     val xSliceStop = PolyMaxIndexes._2
     val ySliceStart = PolyMinIndexes._1
     val ySliceStop = PolyMaxIndexes._1

    println(xSliceStart + "  " + xSliceStop)
    println(ySliceStart + "  " + ySliceStop)
 
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

    // Get RDD of tiles for all days (currently just one day)
    val rdd1 = sc.parallelize(Range(0, 1))
      .mapPartitions({ itr =>
        val ncfile = open(netcdfUri)
        val temp = ncfile
          .getVariables.asScala
          .filter({ v => v.getFullName == "LST_LWST_avg_daily"})
          .head

        itr.map({ t =>
          val array = temp
            .read(s"$t,$ySliceStart:$ySliceStop,$xSliceStart:$xSliceStop")
            .get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
          FloatUserDefinedNoDataArrayTile(array, x, y, FloatUserDefinedNoDataCellType(nodata))
          
        })
      })
      .persist(StorageLevel.MEMORY_AND_DISK_SER)

    // Save first tile to disk as a PNG
    // dump(rdd1.first().renderPng(ramp).bytes, new File("gddp2.png"))
    //todo: remove first()
    dump(rdd1.first().mask(extent, polygon).renderPng(ramp).bytes, new File("gddp1.png"))

    // Compute means, mins for the given query polygon
    // val polyVals = rdd1.map({ tile => tile.mask(extent, polygon)})
    // val mins = polyVals.map({ tile => MinDoubleSummary.handleFullTile(tile) }).collect().toList
    // val means = polyVals.map({ tile => MeanSummary.handleFullTile(tile).mean }).collect().toList
    // val maxs = polyVals.map({ tile => MaxDoubleSummary.handleFullTile(tile) }).collect().toList

    // Get values for the given query point
    // val values = sc.parallelize(Range(0, 1))
    //   .mapPartitions({ itr =>
    //     val ncfile = open(netcdfUri)
    //     val temp = ncfile
    //       .getVariables.asScala
    //       .filter({ v => v.getFullName == "LST_LWST_avg_daily"})
    //       .head

    //     itr.map({ t =>
    //       temp
    //         .read(s"0,$yIndex,$xIndex")
    //         // .read()
    //         .getFloat(0)
    //     })
    //   })
    //   .collect()
    //   .toList
      
    // val polyVals = temp.read(s"0,$ySliceStart:$ySliceStop,$xSliceStart:$xSliceStop") 
    //   .get1DJavaArray(ucarType).asInstanceOf[Array[Float]].toList

    sparkContext.stop

    // println(s"Value of the given point: $values")
    // println(s"Values inside the polygon: $polyVals")
  }
}
