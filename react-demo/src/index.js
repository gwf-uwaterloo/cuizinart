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

class Dataset {
    constructor(id, boundary, color, description, variables){
        this.id = id;
        this.boundary = boundary; // rect
        this.color = color;
        this.description = description;
        this.variables = variables;
    }
}
class App extends Component {
    state = {
        datasets: []
    };

    constructor(props) {
        super(props);
        this.child = React.createRef();
        this.userInputs= {}
    }

    componentDidMount() {
        let self = this;
        axios.get(`http://127.0.0.1:5000/getBoundary`)
            .then(res => {
                // console.log(res.data);
                let dataset1 = new Dataset(0, res.data, "#5d9598", "Five Lakes",
                    [
                        {key: "LST_LWST_avg_daily", description: "Daily Average Temperature(LST_LWST_avg_daily)", selected: false},
                        {key: "LST_LWST_avg_day", description: "Average Daytime Temperature(LST_LWST_avg_day)", selected: false},
                        {key: "LST_LWST_avg_night", description: "Average Night Temperature(LST_LWST_avg_night)", selected: false},
                        {key: "N_obs_avg_daily", description: "Average N Observed Daily Temperature(N_obs_avg_daily)", selected: false},
                        {key: "N_obs_avg_day", description: "Average N Observed Daytime Temperature(N_obs_avg_day)", selected:false},
                        {key: "N_obs_avg_night", description: "Average N Observed Night Temperature(N_obs_avg_night)", selected:false}
                    ]);

                //let dataset2 = new Dataset(1, [[43.6764444,-80.7178777],[43.862008,-80.272744]], '#'+Math.floor(Math.random()*16777215).toString(16), "Ontario", ["air_pressure", "humidity"]);
                self.setState({
                    datasets: [...this.state.datasets, dataset1]
                });
                //datasets.push(dataset2);
            });
    }

    updateDateSets = (dataSets) => {
        this.setState(dataSets);
    };

    updateUserInputs = (userInputs) => {
        this.userInputs = _.assign(this.userInputs, userInputs);
    };

    mapDrawCallback = (geojson) => {
        //geojson[0].push(geojson[0][0]); // close coordinates
        this.postJsonToServer(geojson);
    };

    uploadFileCallback = (geojson) => {
        this.postJsonToServer(geojson);
    };

    postJsonToServer = (jsonData) => {
        let variables = new Set();
        this.state.datasets.forEach(ds => {
            ds.variables.forEach(v => {
                if(v.selected){
                    variables.add(v.key);
                }
            })
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
            bounding_geom: jsonData,
            start_time: this.userInputs.start_time,
            end_time: this.userInputs.end_time
        };
        /*
        let passLoad = {
            product: "ctl-wrf-wca",
            user_id: "julemai",
            user_email: "juliane.mai@uwaterloo.ca",
            request_id: "testrequest_999",
            "bounding geom":[{
                rings: jsonData,
                spatialReference: {wkid: 4326, latestWkid: 4326}
            }],
            start_time: this.state.setting.select_date[0],
            end_time: this.state.setting.select_date[1],
            variables: Array.from(variables)
        };
        */
        //console.log(passLoad);
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
    };

    renderGeoJSON = (geojson) => {
        this.child.current.renderGeoJson(geojson);
    };



    render() {
        return (
            <div className="row">
                <div className="col col-lg-3">
                    <div className="card m-2">
                        <div className="card-body">
                            <FileComp uploadFileCallback={this.uploadFileCallback} renderGeoJSON={this.renderGeoJSON} />
                        </div>
                    </div>
                    <div className="card m-2">
                        <div className="card-body">
                            <UserInputComp updateUserInputs={this.updateUserInputs} />
                        </div>
                    </div>
                    <DataSetComp datasets={this.state.datasets} updateDateSets={this.updateDateSets} />
                </div>
                <div className="col col-lg-9">
                    <Map ref={this.child} datasets={this.state.datasets} drawCallback={this.mapDrawCallback} />
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