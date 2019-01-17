import React, {Component} from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import Map from "./components/map";
import {render} from "react-dom";
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'bootstrap-daterangepicker/daterangepicker.css'
import 'react-notifications/lib/notifications.css';
import _ from 'lodash';
import axios from "axios";
import {NotificationContainer, NotificationManager} from 'react-notifications';
import saveAs from 'file-saver';
import FileComp from './components/fileComp';
import DataSetComp from './components/dataSetsComp';
import UserInputComp from "./components/userInputComp";

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
class App extends Component {
    state = {
        selectDateSet: null,
        products: []
    };

    constructor(props) {
        super(props);
        this.child = React.createRef();
        this.userInputs= {};
    }

    componentDidMount() {
        let self = this;
        let products = [
            { value: 'ctl-wrf-wca', label: 'ctl-wrf-wca', vars: vars, color: '#5d9598', bbox: null},
            { value: 'pgw-wrf-wca', label: 'pgw-wrf-wca', vars: vars, color: '#7142f4', bbox: null },
            { value: 'ctl-wrf-conus', label: 'ctl-wrf-conus', vars: vars, color: '#f441c1', bbox: null },
            { value: 'pgw-wrf-conus', label: 'pgw-wrf-conus', vars: vars, color: '#b5f441', bbox: null }
        ];
        self.setState({products: products})
    }

    updateDateSet = (dataSet) => {
        this.setState(dataSet);
    };

    updateUserInputs = (userInputs) => {
        this.userInputs = _.assign(this.userInputs, userInputs);
    };

    mapDrawCallback = (geojson) => {
        this.postJsonToServer(geojson.features);
    };

    uploadFileCallback = (geojson) => {
        this.postJsonToServer(geojson);
    };

    postJsonToServer = (features) => {
        let variables = new Set();
        if(!this.state.selectDateSet){
            NotificationManager.error('No product selected.');
            return;
        }
        this.state.selectDateSet.vars.forEach(v => {
            if(v.selected){
                variables.add(v.key);
            }
        });

        if(variables.size === 0){
            NotificationManager.error('No variable selected.');
            return;
        }
        if(!this.userInputs || !this.userInputs.start_time || !this.userInputs.end_time){
            NotificationManager.error('No date range selected.');
            return;
        }
        let passLoad = {
            variables: Array.from(variables),
            product: this.state.selectDateSet.value,
            bounding_geom: features
        };
        passLoad = _.assign(passLoad, this.userInputs);
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
                            <FileComp uploadFileCallback={this.uploadFileCallback} renderGeoJSON={this.renderGeoJSON} />
                        </div>
                    </div>
                </div>
                <div className="col col-lg-9">
                    <Map ref={this.child} selectDateSet={this.state.selectDateSet} drawCallback={this.mapDrawCallback} />
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