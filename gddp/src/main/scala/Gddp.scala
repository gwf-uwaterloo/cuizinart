package com.example.gddp

import geotrellis.raster._
import geotrellis.raster.histogram.StreamingHistogram
import geotrellis.raster.render.ColorRamps
import geotrellis.vector._
import geotrellis.vector.io._
import org.apache.log4j.Logger
import org.apache.spark.{SparkConf, SparkContext}
import org.apache.spark.storage.StorageLevel
import ucar.nc2._
import java.io._
import java.time.{LocalDate, LocalDateTime}
import java.time.format.DateTimeFormatter

import scala.collection.JavaConverters._


object Gddp {

  val logger: Logger = Logger.getLogger(Gddp.getClass)
  val earth_radius = 6371

  //Find (x and y) indexes for a given point (lat, lon)
  def getIndexes(latArray:Array[Float], lonArray:Array[Float], shape: Array[Int], lat:Double,
                 lon:Double) : (Int, Int) = {
    var minPowDis = Double.MaxValue
    var index = 0
    for(i <- 0 until latArray.length){
      val powDis = Math.pow(latArray(i)-lat, 2)+Math.pow(lonArray(i)-lon, 2)
      if(powDis < minPowDis){
        minPowDis = powDis
        index = i
      }
    }

    (index/shape(1), index%shape(1)) // y,x
  }

  /**
    * Dump bytes to disk [1]
    *
    * 1. https://stackoverflow.com/questions/29978264/how-to-write-the-contents-of-a-scala-stream-to-a-file
    */
  def dump(data: Array[Byte], file: File ) : Unit = {
    val target = new BufferedOutputStream( new FileOutputStream(file) )
    try data.foreach( target.write(_) ) finally target.close()
  }

  /**
    * Return a ucar.nc2.NetcdfFile
    */
  def open(uri: String) : NetcdfFile = {

    NetcdfFile.open(uri)
  }

  /**
    * Lists all .nc file names in the directory
    */
  def getListOfFiles(dir: String) : List[String] = {
    val d = new File(dir)
    if (d.exists && d.isDirectory) {
      d.listFiles.filter(f => f.isFile && f.getName.endsWith(".nc")).map(_.getAbsolutePath).toList
    } else {
      List[String]()
    }
  }

  /**
    * Transforms a lat/lon-polygon to x/y-coordinates
    */
  def getBoundingBoxPolygon(latArray: Array[Float], lonArray: Array[Float], shape: Array[Int],
                            polygonExtent: Extent) : (Int, Int, Int, Int, Extent) = {
    // todo: verify correctness
    val PolyMinIndexes = getIndexes(latArray, lonArray, shape, polygonExtent.ymin, polygonExtent.xmin)
    val PolyMaxIndexes = getIndexes(latArray, lonArray, shape, polygonExtent.ymax, polygonExtent.xmax)

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

    (xSliceStart, xSliceStop, ySliceStart, ySliceStop, extent)
  }


  /**
    * Main
    */
  def main(args: Array[String]) : Unit = {

    val netcdfBasePath = args(0)
    val netcdfFiles = getListOfFiles(netcdfBasePath)
    logger.info(" Files in directory: " + netcdfFiles.mkString(","))

    val geojsonUri = args(1)

    val requestDateRange = args(2).split(",")
    val format = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    val requestStartTime = LocalDate.parse(requestDateRange(0), format)
    val requestEndTime = LocalDate.parse(requestDateRange(1), format)
    logger.info("Request time range: " + requestStartTime + " - " + requestEndTime)

    val requestVariables = args(3).split(",")
    logger.info("Request variables: " + requestVariables.mkString(","))

    // Search for files matching the query
    var filesToAnalyze = scala.collection.mutable.Map[String, List[NetcdfFile]]()
    for (f <- netcdfFiles) {
      val ncfile = open(f)
      val vs = ncfile.getVariables
      val fileVariables = vs.asScala.map(_.getFullName)
      logger.info("File " + f + " has variables " + fileVariables.mkString(","))

      val fileTimeRange = vs.get(0).read().get1DJavaArray(vs.get(0).getDataType).asInstanceOf[Array[Int]]
      val fileStartDate = LocalDateTime.of(1990, 1, 1, 0, 0)
        .plusHours(fileTimeRange.min).toLocalDate
      val fileEndDate =  LocalDateTime.of(1990, 1, 1, 0, 0)
        .plusHours(fileTimeRange.max).toLocalDate
      logger.info("File has time range " + fileStartDate + " - " + fileEndDate)

      if (fileStartDate.compareTo(requestEndTime) <= 0
        && fileEndDate.compareTo(requestStartTime) >= 0) {
        requestVariables.intersect(fileVariables).foreach(v => {
          // Add the file to the list of files to be analyzed for this variable
          filesToAnalyze(v) = ncfile +: filesToAnalyze.getOrElse(v, List[NetcdfFile]())
        })
      }
    }
    logger.info("Matching files: " + filesToAnalyze.mapValues(fs => fs.map(_.getId)).mkString(","))

    // Get polygon of the bounding box
    val polygon =
      scala.io.Source.fromFile(geojsonUri, "UTF-8")
        .getLines
        .mkString
        .extractGeometries[Polygon]
        .head
    val polygonExtent = polygon.envelope // ymin: lat, xmin: long
    logger.info("Polygon extent: " + polygonExtent.toString())

    // Establish Spark Context
    val sparkConf = new SparkConf()
      .setAppName("GDDP")
      .set("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
      .set("spark.kryo.registrator", "geotrellis.spark.io.kryo.KryoRegistrator")
      .set("spark.kryo.unsafe", "true")
      .set("spark.rdd.compress", "true")
      .set("spark.ui.enabled", "false")
    val sparkContext = new SparkContext(sparkConf)
    implicit val sc: SparkContext = sparkContext

    // Get RDD of tiles for all days (currently just one day)
    val rdd1 = sc.parallelize((filesToAnalyze.keys, filesToAnalyze.values).zipped.toSeq)
      .map({ case (variableName, ncfileList) =>
        var logstring = ""
        logstring += "variable: " + variableName + ", files: " + ncfileList.mkString(",") + "\n"

        // At some point, we'll want to support partitioned files. For now, just take the first one.
        val ncfile = ncfileList.head
        val vs = ncfile.getVariables

        val time = vs.get(0).read().get1DJavaArray(vs.get(0).getDataType).asInstanceOf[Array[Int]](0)
        val startDate = LocalDateTime.of(1990, 1, 1, 0, 0)
          .plusHours(time).toLocalDate

        // Read lat/lon-values
        val ucarType = vs.get(1).getDataType // lat
        val latArray2D = vs.get(1).read()
        val latArray = latArray2D.get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
        val lonArray2D = vs.get(3).read()
        val lonArray = lonArray2D.get1DJavaArray(ucarType).asInstanceOf[Array[Float]] //long

        val variableDescriptor = vs.asScala
          .filter({ v => v.getFullName == variableName })
          .head

        val nodata = variableDescriptor
          .getAttributes.asScala
          .filter({ v => v.getFullName == "_FillValue" })
          .head.getValues.getFloat(0)

        // Get histogram color steps from whole tile so it's consistent across selections
        // Right now, we don't do that for better performance. So different areas will have different color mappings.
        /*val wholeTile = {
          val tileData = variableDescriptor.slice(0, 0)
          val Array(y, x) = tileData.getShape()
          val array = tileData.read().get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
          FloatUserDefinedNoDataArrayTile(array, x, y, FloatUserDefinedNoDataCellType(nodata))
        }
        val histogram = StreamingHistogram.fromTile(wholeTile)
        val breaks = histogram.quantileBreaks(1<<15)
        val ramp = ColorRamps.BlueToRed.toColorMap(breaks)*/

        // Get x/y-range
        val (xSliceStart, xSliceStop, ySliceStart, ySliceStop, extent) = getBoundingBoxPolygon(latArray, lonArray,
          lonArray2D.getShape, polygonExtent)
        val x = xSliceStop - xSliceStart + 1
        val y = ySliceStop - ySliceStart + 1
        logstring += "x: " + x + ", y: " + y + " " + (xSliceStart, xSliceStop, ySliceStart, ySliceStop) + "\n"

        // Get indices of the request's time range
        val fileTimeRange = vs.get(0).read().get1DJavaArray(vs.get(0).getDataType).asInstanceOf[Array[Int]]
          .map(timeNum =>
            LocalDateTime.of(1990, 1, 1, 0, 0).plusHours(timeNum))
        val startTimeIndex = fileTimeRange.zipWithIndex
          .filter(time => time._1.compareTo(requestStartTime.atTime(0, 0)) >= 0).map(_._2).min
        val endTimeIndex = fileTimeRange.zipWithIndex
          .filter(time => time._1.compareTo(requestEndTime.atTime(23, 59)) <= 0).map(_._2).max
        logstring += "file time range: " + fileTimeRange.mkString(",") + "\n"
        logstring += "time slice indices: " + startTimeIndex.toString + " - " + endTimeIndex.toString + "\n"

        // Read the section specified by the request (i.e. specified time and x/y-location)
        val array = variableDescriptor
          .read(s"$startTimeIndex:$endTimeIndex,$ySliceStart:$ySliceStop,$xSliceStart:$xSliceStop")
          .get1DJavaArray(ucarType).asInstanceOf[Array[Float]]
        logstring += "array 1st 10 entries: " + array.take(10).mkString(",") + "\n"
        val resultTile = FloatUserDefinedNoDataArrayTile(array, x, y, FloatUserDefinedNoDataCellType(nodata))

        val histogram = StreamingHistogram.fromTile(resultTile)
        val breaks = histogram.quantileBreaks(1<<15)
        val ramp = ColorRamps.BlueToRed.toColorMap(breaks)

        // Save as png
        dump(resultTile.mask(extent, polygon).renderPng(ramp).bytes,
          new File("gddp" + variableName + requestDateRange.mkString("-") + ".png"))

         logstring
      })
      .persist(StorageLevel.MEMORY_AND_DISK_SER)

    logger.info("Logs during spark execution:")
    rdd1.foreach(logger.info)
    sparkContext.stop

  }
}
