import React, {Component} from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import Map from "./components/map";
import {render} from "react-dom";
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'bootstrap-daterangepicker/daterangepicker.css'
import 'react-notifications/lib/notifications.css';
import _ from 'lodash';
import moment from 'moment';
import axios from "axios";
import Select from 'react-select';
import {NotificationContainer, NotificationManager} from 'react-notifications';
import saveAs from 'file-saver';
import FileComp from './components/fileComp';
import DataSetComp from './components/dataSetsComp';
import UserInputComp from "./components/userInputComp";

const backends = [
    { value: 'slurm', label: 'Graham' },
    { value: 'pyspark', label: 'Pyspark' }
];
class App extends Component {
    state = {
        selectDateSet: null,
        products: [],
        selectedBackend: null
    };

    constructor(props) {
        super(props);
        this.child = React.createRef();
        this.userInputs= {};
        this.features=[];
    }

    componentDidMount() {
        let self = this;
        let products = [];
        axios.get(`http://127.0.0.1:5000/getBoundaries`)
            .then(res => {
                if(res.data.length > 0){
                    //console.log(res.data);
                    res.data.forEach(function (p) {
                        /*
                            swap (lon, lat) to (lat, lon)
                         */
                        let coord = p.domain.extent.coordinates[0].map(function (arr) {
                            return [arr[1],arr[0]];
                        });
                        //console.log(coord);
                        let product = {
                            value: p.key,
                            label: p.name,
                            vars: _.map(p.variables, function(i){
                                return {key: i.key, description: i.name, selected: false}
                            }),
                            horizons:  _.map(p.horizons, function(i){
                                return {key: i.horizon_id, description: i.horizon, selected: false}
                            }),
                            issues:  _.map(p.issues, function(i){
                                return {key: i.issue_id, description: i.issue.slice(0, 5), selected: false}
                            }),
                            color: '#17a2b8',
                            bbox: coord,
                            valid_start_time: p.start_date,
                            valid_end_time: p.end_date
                        };
                        products.push(product);
                    });
                }
                self.setState({products: products});
            });
    }

    updateDateSet = (dataSet) => {
        this.setState(dataSet);
    };

    updateUserInputs = (userInputs) => {
        this.userInputs = _.assign(this.userInputs, userInputs);
    };

    updateFeatures = (features) => {
        this.features = features;
    };

    postJsonToServer = () => {
        let self = this;
        let variables = new Set();
        let horizons = new Set();
        let issues = new Set();

        if(!self.state.selectDateSet){
            NotificationManager.error('No product selected.');
            return;
        }
        self.state.selectDateSet.vars.forEach(v => {
            if(v.selected){
                variables.add(v.key);
            }
        });

        if(variables.size === 0){
            NotificationManager.error('No variable selected.');
            return;
        }
        // add selected horizons(forecast windows)
        self.state.selectDateSet.horizons.forEach(v => {
            if(v.selected){
                horizons.add(v.description);
            }
        });

        // add selected issues(forecast issues)
        self.state.selectDateSet.issues.forEach(v => {
            if(v.selected){
                issues.add(v.description);
            }
        });

        if(!self.userInputs || !self.userInputs.start_time || !self.userInputs.end_time){
            NotificationManager.error('No date range selected.');
            return;
        }

        if(!self.state.selectedBackend){
            NotificationManager.error('No backend processor selected.');
            return;
        }

        if(moment(self.userInputs.start_time).isBefore(self.state.selectDateSet.valid_start_time) || moment(self.userInputs.end_time).isAfter(self.state.selectDateSet.valid_end_time)){
            NotificationManager.error('Valid time range is: '+self.state.selectDateSet.valid_start_time +' to '+self.state.selectDateSet.valid_end_time);
            return;
        }

        if(self.state.selectedBackend.value === "slurm"){
            if(!self.validateEmail(self.userInputs.user_email)){
                NotificationManager.error('Please enter a valid email address.');
                return;
            }
        }

        if(self.features.length === 0){
            NotificationManager.error('No geometry data found.');
            return;
        }

        let passLoad = {
            variables: Array.from(variables),
            window: Array.from(horizons),
            release: Array.from(issues),
            product: self.state.selectDateSet.value,
            backend: self.state.selectedBackend.value,
            bounding_geom: self.features
        };
        passLoad = _.assign(passLoad, self.userInputs);
        //console.log(passLoad);
        if (window.confirm("Do you want to process?")) {
            axios.post('http://127.0.0.1:5000/fetchResult', passLoad)
                .then(function (response) {
                    if(self.state.selectedBackend.value === "pyspark" ){
                        saveAs(new Blob([response.data], {type:'application/x-netcdf'}));
                    }
                    else{
                        NotificationManager.success("success");
                    }
                })
                .catch(function (error) {
                    NotificationManager.error(error.message);
                });

        }
        else{
            // cancel
        }
    };

    handleSelectBackend = (selectedOption) => {
        this.setState({selectedBackend: selectedOption});
    };

    renderGeoJSON = (geojson) => {
        this.child.current.renderGeoJson(geojson);
    };

    validateEmail(email) {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    render() {
        return (
            <div className="row">
                <div className="col col-lg-12">
                    <UserInputComp updateUserInputs={this.updateUserInputs} products={this.state.products} updateDateSet={this.updateDateSet}/>
                </div>
                <div className="col col-lg-3">
                    <DataSetComp selectDateSet={this.state.selectDateSet} updateDateSet={this.updateDateSet} />
                    <div className="card mt-2">
                        <div className="card-body">
                            <FileComp uploadFileCallback={this.updateFeatures} renderGeoJSON={this.renderGeoJSON} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <label htmlFor="backend">Process on...</label>
                        <Select
                            id="backend"
                            value={this.state.selectedBackend}
                            placeholder={"Choose Backend..."}
                            onChange={this.handleSelectBackend}
                            options={backends}
                        />
                    </div>
                    <div className="mt-2">
                        <button className="btn btn-info" onClick={this.postJsonToServer}>Process</button>
                    </div>
                </div>
                <div className="col col-lg-9">
                    <Map ref={this.child} selectDateSet={this.state.selectDateSet} drawCallback={this.updateFeatures} />
                </div>
                <NotificationContainer/>
            </div>

        );
    }
}

render(
    <App />,
    document.getElementById('content')
);

export default App;