import React, { Component } from 'react';
import { Map, TileLayer, Rectangle, FeatureGroup, Tooltip} from 'react-leaflet';
import { EditControl } from "react-leaflet-draw"
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import L from 'leaflet';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});

L.Marker.prototype.options.icon = DefaultIcon;
const stamenTonerTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const stamenTonerAttr = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const zoomLevel = 4;
let mapCenter = [43.4643, -80.5204];


export default class MapComp extends Component {
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
        this.setState({ currentZoomLevel: newZoomLevel });
    }

    _onEdited = (e) => {

        let numEdited = 0;
        e.layers.eachLayer( (layer) => {
            numEdited += 1;
        });
        //console.log(`_onEdited: edited ${numEdited} layers`, e);

        this._onChange();
    };

    _onCreated = (e) => {
        let type = e.layerType;
        let layer = e.layer;
        if (type === 'marker') {
            // Do marker specific actions
           // console.log("_onCreated: marker created", e);
        }
        else {
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

        const geojsonData = this._editableFG.leafletElement.toGeoJSON();
        //let lastIndex = geojsonData.features.length-1;
        //console.log(geojsonData.features[lastIndex]);
        this.props.drawCallback(geojsonData.features);

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
            <div>
                <Map
                    ref={m => { this.leafletMap = m; }}
                    center={mapCenter}
                    zoom={zoomLevel}
                >
                    <TileLayer
                        attribution={stamenTonerAttr}
                        url={stamenTonerTiles}
                    />

                    {
                        d && d.bbox ?
                            <Rectangle bounds={d.bbox} color={d.color}>
                                <Tooltip sticky>{d.label}</Tooltip>
                            </Rectangle>
                            : ""
                    }


                    <FeatureGroup ref={ (reactFGref) => {this._onFeatureGroupReady(reactFGref);} }>
                        <EditControl
                            position='topright'
                            onEdited={this._onEdited}
                            onCreated={this._onCreated}
                            draw={{
                                rectangle: {
                                    showArea: false
                                },
                                circle: false,
                                marker: false,
                                polyline: false,
                                circlemarker: false

                            }}
                        />
                    </FeatureGroup>
                </Map>
            </div>
        );
    }
}
