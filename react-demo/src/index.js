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
    {key: "LST_LWST_avg_daily", description: "Daily Average Temperature(LST_LWST_avg_daily)", selected: false},
    {key: "LST_LWST_avg_day", description: "Average Daytime Temperature(LST_LWST_avg_day)", selected: false},
    {key: "LST_LWST_avg_night", description: "Average Night Temperature(LST_LWST_avg_night)", selected: false},
    {key: "N_obs_avg_daily", description: "Average N Observed Daily Temperature(N_obs_avg_daily)", selected: false},
    {key: "N_obs_avg_day", description: "Average N Observed Daytime Temperature(N_obs_avg_day)", selected:false},
    {key: "N_obs_avg_night", description: "Average N Observed Night Temperature(N_obs_avg_night)", selected:false}

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
        axios.get(`http://127.0.0.1:5000/getBoundary`)
            .then(res => {
                // console.log(res.data);
                let products = [
                    { value: 'great_lakes', label: 'Great Lakes', vars: vars, color: '#5d9598', bbox: res.data}
                ];
                self.setState({products: products});
            });

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
            bounding_geom: features
        };
        passLoad = _.assign(passLoad, this.userInputs);
        console.log(JSON.stringify(passLoad));
        if (window.confirm("Do you want to process?")) {
            axios.post('http://127.0.0.1:5000/fetchResult', passLoad, {responseType: 'blob'})
                .then(function (response) {
                    saveAs(new Blob([response.data], {type:'application/x-netcdf'}));
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