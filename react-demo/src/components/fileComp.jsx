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
        this.geoJson = null;
    }

    state = {
        selectedFileType: null
    };

    handleProcess = () => {
        //this.fileRef.current.value = "";
        this.props.uploadFileCallback(this.geoJson);
    };

    handleSelectFileType = (selectedOption) => {
        this.setState({selectedFileType: selectedOption});
        console.log(`Option selected:`, selectedOption);
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
                        self.props.renderGeoJSON(geojson);
                        self.geoJson = geojson;
                    });
                };
                reader.readAsArrayBuffer(event.target.files[0]);
            }
            else{
                let reader = new FileReader();
                reader.onload = function(e) {
                    geoJson = JSON.parse(reader.result);
                    self.props.renderGeoJSON(geoJson);
                    self.geoJson = geoJson;
                };
                reader.readAsText(event.target.files[0]);
            }
        }
        catch(error) {
            return NotificationManager.error('Parsing file error');
        }
    };

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
                <button className="btn btn-primary" onClick={this.handleProcess}>Process</button>
            </div>
        );
    }
}
