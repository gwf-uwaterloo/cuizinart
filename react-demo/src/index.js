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
import {NotificationContainer, NotificationManager} from 'react-notifications';
import saveAs from 'file-saver';
import FileComp from './components/fileComp';
import DataSetComp from './components/dataSetsComp';
import UserInputComp from "./components/userInputComp";

/*
let vars = [
    {key: "PREC", description: "Grid-scale precipitation (accumulated over 1 hour)", selected: false},
    {key: "T2", description: "Temperature", selected: false},
    {key: "LH", description: "Latent heat flux", selected: false},
    {key: "HFX", description: "Upward heat flux", selected: false},
    {key: "QFX", description: "Upward moisture flux", selected:false},
    {key: "GLW", description: "Downward long wave flux", selected:false},
    {key: "SWDOWN", description: "Downward short wave flux", selected:false},
    {key: "PSFC", description: "Surface pressure", selected:false},
    {key: "Q2", description: "Mixing ratio", selected:false},
    {key: "U10", description: "U-component of the wind (along grid X axis)", selected:false},
    {key: "V10", description: "V-component of the wind (along grid Y axis)", selected:false}
];
*/
class App extends Component {
    state = {
        selectDateSet: null,
        products: []
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
                    res.data.forEach(function (p) {
                        let pJson = p[Object.keys(p)[0]];
                        let valid_start_time;
                        let valid_end_time;
                        if(pJson.product === "ctl-wrf-wca" || pJson.product === "pgw-wrf-wca"){
                            valid_start_time = "2000-10-01";
                            valid_end_time = "2015-09-30";
                        }
                        else if(pJson.product === "ctl-wrf-conus" || pJson.product === "pgw-wrf-conus"){
                            valid_start_time = "2000-10-01";
                            valid_end_time = "2013-09-30";
                        }
                        else{
                            valid_start_time = pJson.time[0];
                            valid_end_time = pJson.time[pJson.time.length-1];
                        }
                        let product = {
                            value: pJson.product,
                            label: pJson.product,
                            vars: _.map(pJson.variables, function(i){
                                return {key: i.short_name, description: i.long_name, select: false}
                            }),
                            color: '#17a2b8',
                            bbox: pJson.domain[0].geometry.coordinates,
                            valid_start_time: valid_start_time,
                            valid_end_time: valid_end_time
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
        if(!self.userInputs || !self.userInputs.start_time || !self.userInputs.end_time){
            NotificationManager.error('No date range selected.');
            return;
        }

        if(moment(self.userInputs.start_time).isBefore(self.state.selectDateSet.valid_start_time) || moment(self.userInputs.end_time).isAfter(self.state.selectDateSet.valid_end_time)){
            NotificationManager.error('Valid time range is: '+self.state.selectDateSet.valid_start_time +' to '+self.state.selectDateSet.valid_end_time);
            return;
        }

        if(!self.validateEmail(self.userInputs.user_email)){
            NotificationManager.error('Please enter a valid email address.');
            return;
        }

        if(self.features.length === 0){
            NotificationManager.error('No geometry data found.');
            return;
        }

        let passLoad = {
            variables: Array.from(variables),
            product: self.state.selectDateSet.value,
            bounding_geom: self.features
        };
        passLoad = _.assign(passLoad, self.userInputs);
        console.log(JSON.stringify(passLoad));
        if (window.confirm("Do you want to process?")) {
            axios.post('http://127.0.0.1:5000/processJson', passLoad)
                .then(function (response) {
                    console.log("success");
                })
                .catch(function (error) {
                    console.log(error);
                });

        }
        else{
            // cancel
        }
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