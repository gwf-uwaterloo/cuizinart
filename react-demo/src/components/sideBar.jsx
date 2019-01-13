import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import shortid from 'shortid';
import Select from 'react-select';
import {NotificationContainer, NotificationManager} from 'react-notifications';
import shp from 'shpjs'
/*
    show date range picker, headers checkbox
 */

const fileTypes = [
    { key: 'shape_file', label: 'Shapefile' },
    { key: 'geo_json', label: 'GeoJSON' }
];
export default class SideBar extends Component {
    constructor(props) {
        super(props);
        this.fileRef = React.createRef();
    }

    state = {
        selectedFileType: null,
        geoJson: null
    };

    handleDateEvent(event, picker) {
        let newSetting = Object.assign({}, this.props.setting);
        newSetting.select_date = [picker.startDate.format("YYYY-MM-DD"), picker.endDate.format("YYYY-MM-DD")];
        this.props.updateEvent({setting: newSetting});

    }

    handleCheckbox(setId,key,event){
        let datasets = this.props.datasets.slice();
        let ds = datasets.find(function (s) {
            return s.id === setId;
        });
        let variable = ds.variables.find(function (v) {
            return v.key === key;
        });
        const target = event.target;

        variable["selected"] = target.checked;
        this.props.updateEvent({datasets: datasets});
    }

    handleSelectFileType = (selectedOption) => {
        let newState = Object.assign({}, this.state);
        newState.selectedFileType = selectedOption;
        this.setState(newState);
        console.log(`Option selected:`, selectedOption);
    };

    handleSelectedFile = (event) =>{
        let self = this;
        let geoJson = null;
        if(!this.state.selectedFileType){
            return NotificationManager.error('No file type selected.');
        }
        try {
            if(this.state.selectedFileType.key === "shape_file"){
                let reader = new FileReader();
                reader.onload = function(e) {
                    shp(reader.result).then(function(geojson){
                        self.props.renderGeoJSON(geojson);
                        self.state.geoJson = geojson;
                    });
                };
                reader.readAsArrayBuffer(event.target.files[0]);
            }
            else{
                let reader = new FileReader();
                reader.onload = function(e) {
                    geoJson = JSON.parse(reader.result);
                    self.props.renderGeoJSON(geoJson);
                    self.state.geoJson = geoJson;
                };
                reader.readAsText(event.target.files[0]);
            }
        }
        catch(error) {
            return NotificationManager.error('Parsing file error');
        }
    };

    handleProcess = () => {
        this.fileRef.current.value = "";
        this.props.uploadFileCallback(this.state.geoJson);
    };

    render() {
        return (
            <div>
                <DateRangePicker showDropdowns onApply={(e, picker) => this.handleDateEvent(e, picker)}>
                    <button className="btn btn-info m-2">Select Date</button>
                </DateRangePicker>
                <div className="card m-2">
                    <div className="card-body">
                        <Select
                            value={this.state.selectedFileType}
                            placeholder={"Choose file type..."}
                            onChange={this.handleSelectFileType}
                            options={fileTypes}
                        />
                        <div className="mt-2 mb-2">
                            <input type="file" ref={this.fileRef} name="fileUpload" id="fileUpload" onChange={this.handleSelectedFile} />
                        </div>
                        <button className="btn btn-primary" onClick={this.handleProcess}>Process</button>
                    </div>
                </div>

                {this.props.datasets.map(d =>
                    <div key={d.id} className="card m-2">
                        <div className="card-header" style={{backgroundColor: d.color}}>
                            {d.description}
                        </div>
                        <div className="card-body">
                            {
                                d.variables.map( va =>
                                    <div key={`div-${shortid.generate()}`} className="form-check">
                                        <label className="form-check-label">
                                            <input type="checkbox" className="form-check-input" checked={va.selected} onChange={(e) => this.handleCheckbox(d.id, va.key, e)}/>{va["description"]}
                                        </label>
                                    </div>
                                )
                            }

                        </div>
                    </div>
                )}
            </div>
        );
    }
}

