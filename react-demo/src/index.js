import React, {Component} from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import Map from "./components/map";
import {render} from "react-dom";
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'bootstrap-daterangepicker/daterangepicker.css'

class App extends Component {
    render() {
        return (
            <Map/>
        );
    }
}

render(
    <App />,
    document.getElementById('root')
);

export default App;