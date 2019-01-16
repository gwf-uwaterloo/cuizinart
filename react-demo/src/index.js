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
        let dataset1 = new Dataset(0, null, "#5d9598", "Variables",
            [
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
            ]);
        self.setState({
            datasets: [...this.state.datasets, dataset1]
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
        this.postJsonToServer(geojson.features);
    };

    uploadFileCallback = (geojson) => {
        this.postJsonToServer(geojson);
    };

    postJsonToServer = (features) => {
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
                    <UserInputComp updateUserInputs={this.updateUserInputs} />
                </div>
                <div className="col col-lg-3">
                    <DataSetComp datasets={this.state.datasets} updateDateSets={this.updateDateSets} />
                    <div className="card mt-2">
                        <div className="card-body">
                            <FileComp uploadFileCallback={this.uploadFileCallback} renderGeoJSON={this.renderGeoJSON} />
                        </div>
                    </div>
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