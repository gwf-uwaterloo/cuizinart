import React, { Component } from 'react';
import { render } from 'react-dom';
import { Map, TileLayer, Rectangle, FeatureGroup, Circle, Polygon } from 'react-leaflet';
import { EditControl } from "react-leaflet-draw"
import axios from 'axios';


const stamenTonerTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const stamenTonerAttr = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const zoomLevel = 10;
const initialBounds = window.location.hash ? window.location.hash.replace(/^#/,'') : null;
let rectangle = [[0.0000, 0.0000], [0.0000, 0.0000]];
let mapCenter = [43.4643, -80.5204];
if(initialBounds){
    if(validateStringAsBounds(initialBounds)){
        let splitBounds = initialBounds.split(',');
        rectangle = [[splitBounds[0],splitBounds[1]], [splitBounds[2],splitBounds[3]]];
        mapCenter = rectangle[0];
    }
}

function validateStringAsBounds(bounds) {
    let splitBounds = bounds ? bounds.split(',') : null;
    return ((splitBounds !== null) &&
        (splitBounds.length === 4) &&
        ((-90.0 <= parseFloat(splitBounds[0]) <= 90.0) &&
            (-180.0 <= parseFloat(splitBounds[1]) <= 180.0) &&
            (-90.0 <= parseFloat(splitBounds[2]) <= 90.0) &&
            (-180.0 <= parseFloat(splitBounds[3]) <= 180.0)) &&
        (parseFloat(splitBounds[0]) < parseFloat(splitBounds[2]) &&
            parseFloat(splitBounds[1]) < parseFloat(splitBounds[3])))
}

export default class App extends Component {
    constructor(props) {
        super(props);
        this.state = { currentZoomLevel: zoomLevel };
    }

    componentDidMount() {
        axios.get(`https://httpbin.org/get`)
            .then(res => {
               console.log(res);
            });
        const leafletMap = this.leafletMap.leafletElement;
        leafletMap.on('zoomend', () => {
            const updatedZoomLevel = leafletMap.getZoom();
            this.handleZoomLevelChange(updatedZoomLevel);
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
        console.log(`_onEdited: edited ${numEdited} layers`, e);

        this._onChange();
    };

    _onCreated = (e) => {
        let type = e.layerType;
        let layer = e.layer;
        if (type === 'marker') {
            // Do marker specific actions
            console.log("_onCreated: marker created", e);
        }
        else {
            console.log("_onCreated: something else created:", type, e);
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
        console.log(geojsonData);
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
                    <Rectangle bounds={rectangle} color="black" />
                    <FeatureGroup ref={ (reactFGref) => {this._onFeatureGroupReady(reactFGref);} }>
                        <EditControl
                            position='topright'
                            onEdited={this._onEdited}
                            onCreated={this._onCreated}
                            onDeleted={this._onDeleted}
                        />
                    </FeatureGroup>
                </Map>
            </div>
        );
    }
}

render(
    <App />,
    document.getElementById('root')
);
