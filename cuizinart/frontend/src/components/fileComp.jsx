import React, {Component} from 'react';
import Select from 'react-select';
import shp from 'shpjs';
import {NotificationManager} from "react-notifications";

const fileTypes = [
    { value: 'shape_file', label: 'Shapefile' },
    { value: 'geo_json', label: 'GeoJSON' }
];
export default class FileComp extends Component {
    constructor(props) {
        super(props);
        this.fileRef = React.createRef();
    }

    state = {
        selectedFileType: null
    };

    handleSelectFileType = (selectedOption) => {
        this.setState({selectedFileType: selectedOption});
        //console.log(`Option selected:`, selectedOption);
    };

    handleSelectedFile = (event) =>{
        let self = this;
        let geoJson = null;
        if(!this.state.selectedFileType){
            return NotificationManager.error('No file type selected.');
        }
        try {
            if(this.state.selectedFileType.value === "shape_file"){
                let reader = new FileReader();
                reader.onload = function(e) {
                    shp(reader.result).then(function(geojson){
                        let features = self.parseGeoJson(geojson.features);
                        self.props.renderGeoJSON(features);
                        self.props.uploadFileCallback(features);
                    });
                };
                reader.readAsArrayBuffer(event.target.files[0]);
            }
            else{
                let reader = new FileReader();
                reader.onload = function(e) {
                    geoJson = JSON.parse(reader.result);
                    let features = self.parseGeoJson(geoJson.features);
                    self.props.renderGeoJSON(features);
                    self.props.uploadFileCallback(features);
                };
                reader.readAsText(event.target.files[0]);
            }
        }
        catch(error) {
            return NotificationManager.error('Parsing file error');
        }
    };

    parseGeoJson(features){
        let featureList = [];
        features.forEach(function (feature) {
            if(feature["geometry"]["type"] === "Polygon"){
                feature["geometry"]["coordinates"].forEach(function (coord) {
                    coord.forEach(function (c) {
                        if(c[0] > 180){
                            c[0] -= 360;
                        }
                    });
                });
                featureList.push(feature);
            }
            else if(feature["geometry"]["type"] === "Point"){
                let coord = feature["geometry"]["coordinates"];
                if(coord[0] > 180){
                    coord[0] -= 360;
                }
                featureList.push(feature);
            }
            else if(feature["geometry"]["type"] === "MultiPolygon"){
                let coord = feature["geometry"]["coordinates"];
                coord.forEach(function (c) {
                    c.forEach(function (m) {
                        if(m[0] > 180){
                            m[0] -= 360;
                        }
                    });
                });
                featureList.push(feature);
            }
        });
        return featureList;
    }

    render() {
        const { selectedFileType } = this.state;
        return (
            <div>
                <Select
                    value={selectedFileType}
                    placeholder={"Choose file type..."}
                    onChange={this.handleSelectFileType}
                    options={fileTypes}
                />
                <div className="mt-2 mb-2">
                    <input type="file" ref={this.fileRef} name="fileUpload" id="fileUpload" onChange={this.handleSelectedFile} />
                </div>
            </div>
        );
    }
}
