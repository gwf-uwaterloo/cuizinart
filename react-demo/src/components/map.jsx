import React, { Component } from 'react';
import { Map, TileLayer, Rectangle, FeatureGroup, Tooltip} from 'react-leaflet';
import { EditControl } from "react-leaflet-draw"
import axios from 'axios';
import {NotificationContainer, NotificationManager} from 'react-notifications';
import saveAs from 'file-saver';
import L from 'leaflet';

const stamenTonerTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const stamenTonerAttr = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const zoomLevel = 8;
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
                let dataset1 = new Dataset(0, res.data, "#5d9598", "Five Lakes",
                    {
                        LST_LWST_avg_daily: "Daily Average Temperature(LST_LWST_avg_daily)",
                        LST_LWST_avg_day: "Average Daytime Temperature(LST_LWST_avg_day)",
                        LST_LWST_avg_night: "Average Night Temperature(LST_LWST_avg_night)",
                        N_obs_avg_daily: "Average N Observed Daily Temperature(N_obs_avg_daily)",
                        N_obs_avg_day: "Average N Observed Daytime Temperature(N_obs_avg_day)",
                        avg_night_temp: "Average Night Temperature(avg_night_temp)",
                        N_obs_avg_night: "Average N Observed Night Temperature(N_obs_avg_night)"
                    });

                //let dataset2 = new Dataset(1, [[43.6764444,-80.7178777],[43.862008,-80.272744]], '#'+Math.floor(Math.random()*16777215).toString(16), "Ontario", ["air_pressure", "humidity"]);
                datasets.push(dataset1);
                //datasets.push(dataset2);
                this.props.event(datasets);
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
        let postSetting = this.props.settings;
        let lastIndex = geojsonData.features.length-1;
        let variables = [];
        if(postSetting.headers && postSetting.headers.length > 0){
            Object.keys(postSetting.headers[0]).forEach(hkey => {
                if(postSetting.headers[0][hkey]){
                    variables.push(hkey);
                }
            });
        }
        if(variables.length === 0){
            NotificationManager.error('No variable selected.');
            return;
        }
        if(postSetting.selectDate.length === 0){
            NotificationManager.error('No date range selected.');
            return;
        }
        let passLoad = {
            geoJson: geojsonData.features[lastIndex].geometry,
            selectDate: postSetting.selectDate.toString(),
            variables: variables.toString()
        };
        if (window.confirm("Do you want to process?")) {
            axios.post('http://127.0.0.1:5000/fetchResult', passLoad, {responseType: 'blob'})
                .then(function (response) {
                    saveAs(new Blob([response.data], {type:'application/zip'}));
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
        else{
            // cancel
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
                            draw={{
                                rectangle: {
                                    showArea: false
                                }
                            }}
                        />
                    </FeatureGroup>
                </Map>
                <NotificationContainer/>
            </div>
        );
    }
}
