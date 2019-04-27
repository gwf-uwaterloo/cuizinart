import React, {Component} from 'react';
import {Map, TileLayer, FeatureGroup, Tooltip, Polygon} from 'react-leaflet';
import {EditControl} from "react-leaflet-draw"
import L from 'leaflet';
import shp from "shpjs";
import PropTypes from "prop-types";
import {SnackbarProvider, withSnackbar} from "notistack";
import file_icon from "../baseline-folder-24px.svg"

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

//L.Marker.prototype.options.icon = DefaultIcon;
const stamenTonerTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const stamenTonerAttr = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const zoomLevel = 4;
let mapCenter = [43.4643, -80.5204];

class MapComp extends Component {
    constructor(props) {
        super(props);
        this.geojsonLayers = [];
    }

    state = {
        currentZoomLevel: zoomLevel
    };

    componentDidMount() {
        const leafletMap = this.leafletMap.leafletElement;
        leafletMap.on('zoomend', () => {
            const updatedZoomLevel = leafletMap.getZoom();
            this.handleZoomLevelChange(updatedZoomLevel);
        });

        let self = this;
        leafletMap.removeControl(leafletMap.zoomControl);
        L.control.zoom({position: 'bottomright'}).addTo(leafletMap);
        let fileControl = L.control({position: 'topright'});
        fileControl.onAdd = function (map) {
            let controlContainer = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            controlContainer.style.backgroundColor = 'white';
            controlContainer.style.backgroundSize = "20px 20px";
            controlContainer.style.backgroundRepeat = "no-repeat";
            controlContainer.style.backgroundPosition = '50%';
            controlContainer.style.width = '34px';
            controlContainer.style.height = '34px';
            controlContainer.style.backgroundImage = "url(" + file_icon + ")";
            controlContainer.style.cursor = 'pointer';
            controlContainer.title = "Upload shapefile or GeoJSON"

            controlContainer.onclick = function () {
                self.fileInput.click();
            }
            return controlContainer;
        }
        fileControl.addTo(leafletMap);
    }

    handleSelectedFile = (event) => {
        let self = this;
        let geoJson = null;
        try {
            if (event.target.files[0].name.endsWith(".zip")) {
                let reader = new FileReader();
                reader.onload = function (e) {
                    shp(reader.result).then(function (geojson) {
                        let features = self.parseGeoJson(geojson.features);
                        self.renderGeoJson(features);
                        self.props.uploadFileCallback(features);
                    }).catch(function (error) {
                        self.props.enqueueSnackbar('Error reading shapefile', {variant: 'error'});
                    });
                };
                reader.readAsArrayBuffer(event.target.files[0]);
            } else {
                let reader = new FileReader();
                let features = null;
                reader.onload = function (e) {
                    try {
                        geoJson = JSON.parse(reader.result);
                        features = self.parseGeoJson(geoJson.features);
                        self.renderGeoJson(features);
                    } catch (e) {
                        self.props.enqueueSnackbar('Parsing file error', {variant: 'error'});
                    }
                    self.props.drawCallback(features);
                };
                reader.readAsText(event.target.files[0]);
            }
        } catch (error) {
            self.props.enqueueSnackbar('Parsing file error', {variant: 'error'});
        }
    };

    parseGeoJson(features) {
        let featureList = [];
        features.forEach(function (feature) {
            if (feature["geometry"]["type"] === "Polygon") {
                feature["geometry"]["coordinates"].forEach(function (coord) {
                    coord.forEach(function (c) {
                        if (c[0] > 180) {
                            c[0] -= 360;
                        }
                    });
                });
                featureList.push(feature);
            } else if (feature["geometry"]["type"] === "MultiPolygon") {
                feature["geometry"]["coordinates"].forEach(function (polygon) {
                    polygon.forEach(function (coord) {
                        coord.forEach(function (c) {
                            if (c[0] > 180) {
                                c[0] -= 360;
                            }
                        });
                    });
                });
                featureList.push(feature);
            } else if (feature["geometry"]["type"] === "Point") {
                let coord = feature["geometry"]["coordinates"];
                if (coord[0] > 180) {
                    coord[0] -= 360;
                }
                featureList.push(feature);
            } else if (feature["geometry"]["type"] === "MultiPolygon") {
                let coord = feature["geometry"]["coordinates"];
                coord.forEach(function (c) {
                    c.forEach(function (m) {
                        if (m[0] > 180) {
                            m[0] -= 360;
                        }
                    });
                });
                featureList.push(feature);
            }
        });
        return featureList;
    }

    renderGeoJson(features) {
        let self = this;
        this.geojsonLayers.forEach(function (layer, index) {
            self.leafletMap.leafletElement.removeLayer(layer);
        });
        features.forEach(function (feature) {
            let layer = L.geoJSON(feature, {
                style: function (fea) {
                    return {color: '#3388ff'};
                }
            }).bindPopup(function (layer) {
                return layer.feature.properties.name;
            }).addTo(self.leafletMap.leafletElement);
            self.geojsonLayers.push(layer);
        });
    }

    handleZoomLevelChange(newZoomLevel) {
        this.setState({currentZoomLevel: newZoomLevel});
    }

    callbackUpdate() {
        const geojsonData = this._editableFG.leafletElement.toGeoJSON();
        if (this.props.selectDateSet) {
            this.props.drawCallback(geojsonData.features);
        } else {
            this.props.filterProd(geojsonData.features);
            this.props.drawCallback(geojsonData.features);
        }
    }

    _onEdited = (e) => {

        let numEdited = 0;
        e.layers.eachLayer((layer) => {
            numEdited += 1;
        });
        //console.log(`_onEdited: edited ${numEdited} layers`, e);

        this._onChange();
    };

    _onDeleted = (e) => {
        this.callbackUpdate();
    };

    _onCreated = (e) => {
        let type = e.layerType;
        let layer = e.layer;
        if (type === 'marker') {
            // Do marker specific actions
            // console.log("_onCreated: marker created", e);
        } else {
            //console.log("_onCreated: something else created:", type, e);
        }
        // Do whatever else you need to. (save to db; etc)

        this._onChange();
    };

    _onChange = () => {

        // this._editableFG contains the edited geometry, which can be manipulated through the leaflet API

        //const { onChange } = this.props;

        // if (!this._editableFG || !onChange) {
        //     return;
        // }
        this.callbackUpdate();

        //let lastIndex = geojsonData.features.length-1;
        //console.log(geojsonData.features[lastIndex]);


        //onChange(geojsonData);
    };

    _editableFG = null;

    _onFeatureGroupReady = (reactFGref) => {

        // populate the leaflet FeatureGroup with the geoJson layers

        // let leafletGeoJSON = new L.GeoJSON(getGeoJson());
        // let leafletFG = reactFGref.leafletElement;
        //
        // leafletGeoJSON.eachLayer( (layer) => {
        //     leafletFG.addLayer(layer);
        // });

        // store the ref for future access to content

        this._editableFG = reactFGref;
    };

    render() {
        let d = this.props.selectDateSet;
        return (
            <SnackbarProvider maxSnack={3}>
                <div>
                    <Map id={"map"}
                         ref={m => {
                             this.leafletMap = m;
                         }}
                         center={mapCenter}
                         zoom={zoomLevel}
                    >
                        <TileLayer
                            attribution={stamenTonerAttr}
                            url={stamenTonerTiles}
                        />

                        {
                            d && d.bbox ?
                                <Polygon positions={d.bbox} color={d.color}>
                                    <Tooltip sticky>{d.label}</Tooltip>
                                </Polygon>
                                : ""
                        }


                        <FeatureGroup ref={(reactFGref) => {
                            this._onFeatureGroupReady(reactFGref);
                        }}>
                            <EditControl
                                position='topright'
                                onEdited={this._onEdited}
                                onCreated={this._onCreated}
                                onDeleted={this._onDeleted}
                                draw={{
                                    rectangle: {
                                        showArea: false
                                    },
                                    circle: false,
                                    marker: true,
                                    polyline: false,
                                    circlemarker: false
                                }}
                            />
                        </FeatureGroup>
                        <input style={{display: "none"}} ref={fileInput => this.fileInput = fileInput} type="file"
                           onChange={this.handleSelectedFile}/>
                    </Map>
                </div>
            </SnackbarProvider>
        );
    }
}

MapComp.propTypes = {
    enqueueSnackbar: PropTypes.func.isRequired,
};

export default withSnackbar(MapComp);
