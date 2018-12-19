import React, { Component } from 'react';
import { Map, TileLayer, Rectangle, FeatureGroup, Tooltip} from 'react-leaflet';
import { EditControl } from "react-leaflet-draw"
import axios from 'axios';
import saveAs from 'file-saver';

const colors = ["#f2740b", "#2cb42c", "#5d9598", "#ff0000", "#000000", "#8E44AD", "#154360","#F4D03F"];
const stamenTonerTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const stamenTonerAttr = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const zoomLevel = 8;
//let rectangle = [[0.0000, 0.0000], [0.0000, 0.0000]];
let mapCenter = [43.4643, -80.5204];
let datasets = [];

class Dataset {
    constructor(id, boundary, color, description, headerAttributes){
        this.id = id;
        this.boundary = boundary; // rect
        this.color = color;
        this.description = description;
        this.headerAttributes = headerAttributes;
    }
}

export default class MapComp extends Component {
    constructor(props) {
        super(props);
        this.state = { currentZoomLevel: zoomLevel };
    }

    componentDidMount() {
        axios.get(`http://127.0.0.1:5000/getBoundary`)
            .then(res => {
                // console.log(res.data);
                let dataset1 = new Dataset(0, res.data, '#'+Math.floor(Math.random()*16777215).toString(16), "Five Lakes", ["temperature", "humidity"]);
                let dataset2 = new Dataset(1, [[43.6764444,-80.7178777],[43.862008,-80.272744]], '#'+Math.floor(Math.random()*16777215).toString(16), "Ontario", ["air_pressure", "humidity"]);
                datasets.push(dataset1);
                datasets.push(dataset2);
                this.props.event(datasets);
                console.log(this.props);
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
        let postSetting = this.props.settings;
        console.log(geojsonData);
        console.log(postSetting);
        if (window.confirm("Do you want to process?")) {
            axios.post('http://127.0.0.1:5000/fetchResult', geojsonData.features[0].geometry, {responseType: 'blob'})
                .then(function (response) {
                    saveAs(new Blob([response.data], {type:'image/png'}));
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
        else{

        }

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
            <Map
                ref={m => { this.leafletMap = m; }}
                center={mapCenter}
                zoom={zoomLevel}
            >
                <TileLayer
                    attribution={stamenTonerAttr}
                    url={stamenTonerTiles}
                />
                {datasets.map(d =>
                    <Rectangle key={d.id} bounds={d.boundary} color={d.color}>
                        <Tooltip sticky>{d.description}</Tooltip>
                    </Rectangle>
                )}

                <FeatureGroup ref={ (reactFGref) => {this._onFeatureGroupReady(reactFGref);} }>
                    <EditControl
                        position='topright'
                        onEdited={this._onEdited}
                        onCreated={this._onCreated}
                        onDeleted={this._onDeleted}
                    />
                </FeatureGroup>
            </Map>

        );
    }
}
