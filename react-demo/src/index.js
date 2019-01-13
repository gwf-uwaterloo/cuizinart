import React, {Component} from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import Map from "./components/map";
import {render} from "react-dom";
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'bootstrap-daterangepicker/daterangepicker.css'
import 'react-notifications/lib/notifications.css';
import SideBar from "./components/sideBar";
import axios from "axios";
import {NotificationContainer, NotificationManager} from 'react-notifications';
import saveAs from 'file-saver';

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
        datasets: [],
        setting: {
            select_date: [],
            uploadFile: {}
        },
        geoJson: null
    };

    constructor(props) {
        super(props);
        this.child = React.createRef();
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

    updateState = (state) => {
        //console.log(setting);
        this.setState(state);
    };

    mapDrawCallback = (geojson) => {
        //geojson[0].push(geojson[0][0]); // close coordinates
        this.postJsonToServer(geojson);
    };

    uploadFileCallback = (geojson) => {

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
        if(this.state.setting && this.state.setting.select_date.length === 0){
            NotificationManager.error('No date range selected.');
            return;
        }
        let passLoad = {
            variables: Array.from(variables),
            geoJson: jsonData,
            selectDate: this.state.setting.select_date.toString()
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
                    <SideBar datasets={this.state.datasets} setting={this.state.setting}
                             updateEvent={this.updateState} uploadFileCallback={this.uploadFileCallback} renderGeoJSON={this.renderGeoJSON}></SideBar>
                </div>
                <div className="col col-lg-9">
                    <Map ref={this.child} datasets={this.state.datasets} setting={this.state.setting} drawCallback={this.mapDrawCallback}></Map>
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