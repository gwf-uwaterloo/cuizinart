import React, {Component} from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import Map from "./components/map";
import {render} from "react-dom";
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'bootstrap-daterangepicker/daterangepicker.css'
import 'react-notifications/lib/notifications.css';
import SideBar from "./components/sideBar";

class App extends Component {

    state = {
        value: [],
        setting: {}
    };
    handleDataSets = (datasets) => {
        this.setState({value: datasets});
    };

    updateSetting = (setting) => {
        //console.log(setting);
        this.setState({setting: setting});
    };

    renderSideBar = () => {
        if(this.state.value.length > 0){
            return <SideBar datasets={this.state.value} updateEvent={this.updateSetting} ></SideBar>;
        }
    };

    render() {
        return (
            <div className="row">
                <div className="col col-lg-3">
                    {this.renderSideBar()}
                </div>
                <div className="col col-lg-9">
                    <Map event={this.handleDataSets} settings={this.state.setting}></Map>
                </div>
            </div>

        );
    }
}

render(
    <App />,
    document.getElementById('content')
);

export default App;