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
import Login from "./components/Login";
import {Navbar, Nav, Button} from "react-bootstrap";
import Signup from "./components/Signup";
import Settings from "./components/Settings";

const backends = [
    { value: 'slurm', label: 'Graham' },
    { value: 'pyspark', label: 'Pyspark' }
];
class App extends Component {
    state = {
        showLoginModal: false,
        showSignupModal: false,
        showSettingsModal: false,
        auth_token: null,
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
            bounding_geom: self.features,
            auth_token: self.state.auth_token
        };
        passLoad = _.assign(passLoad, self.userInputs);
        //console.log(passLoad);
        if (window.confirm("Do you want to process?")) {
            axios.post('http://127.0.0.1:5000/fetchResult', passLoad)
                .then(function (response) {
                    NotificationManager.success(response.data);
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

    toggleLoginModal = () => {
        this.setState({showLoginModal: !this.state.showLoginModal});
    }

    toggleSignupModal = () => {
        this.setState({showSignupModal: !this.state.showSignupModal});
    }

    toggleSettingsModal = () => {
        this.setState({showSettingsModal: !this.state.showSettingsModal});
    }

    login = (email, password) => {
        let self = this;
        axios.post('http://127.0.0.1:5000/login', {'email': email, 'password': password})
            .then(function (response) {
                if (response.data.response.user.authentication_token) {
                    self.setState({auth_token: response.data.response.user.authentication_token});
                    self.toggleLoginModal();
                } else {
                    NotificationManager.error("Login failed.");
                }
            })
            .catch(function (error) {
                NotificationManager.error(error.message);
            });
    }

    logout = () => {
        let self = this;
        axios.get('http://127.0.0.1:5000/logout')
            .then(function (response) {
                self.setState({auth_token: null});
            })
            .catch(function (error) {
                NotificationManager.error(error.message);
            });
    }

    signup = (email, password) => {
        let self = this;
        axios.post('http://127.0.0.1:5000/register', {'email': email, 'password': password})
            .then(function (response) {
                if (response.data.response.user.authentication_token) {
                    self.setState({auth_token: response.data.response.user.authentication_token});
                    self.toggleSignupModal();
                } else {
                    NotificationManager.error("Signup failed.");
                }
            })
            .catch(function (error) {
                let message = JSON.stringify(error.response.data.response.errors);
                if (message === "") {
                    message = error.message;
                }
                NotificationManager.error(message);
            });
    }

    changePassword = (email, oldPassword, password) => {
        let self = this;
        axios.post('http://127.0.0.1:5000/change', {
            'password': oldPassword,
            'new_password': password, 'new_password_confirm': password, 'auth_token': self.state.auth_token
        })
            .then(function (response) {
                NotificationManager.success("Password changed successfully.");
                self.toggleSettingsModal();
            })
            .catch(function (error) {
                let message = JSON.stringify(error.response.data.response.errors);
                if (message === "") {
                    message = error.message;
                }
                NotificationManager.error(message);
            });
    }

    resetPassword = (email) => {
        let self = this;
        axios.post('http://127.0.0.1:5000/reset', {'email': email})
            .then(function (response) {
                NotificationManager.success("Password reset request sent. Check your email.");
            })
            .catch(function (error) {
                let message = JSON.stringify(error.response.data.response.errors);
                if (message === "") {
                    message = error.message;
                }
                NotificationManager.error(message);
            });
    }

    render() {
        return (
            <React.Fragment>
                <Navbar bg="info">
                    <Navbar.Brand href="#" style={{color: "white"}}>GWF Cuizinart</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ml-auto">
                            <img className="img-right" src="GWF_logo.png"/>
                            <img className="img-right" src="logo_uw_horizontal.png"/>
                            <img className="img-right mr-sm-4" src="logo_usask.png"/>
                        </Nav>
                            {this.state.auth_token == null &&
                            <Button variant="outline-light" className="mr-sm-2" onClick={this.toggleSignupModal}>Sign
                                Up</Button>}
                            {this.state.auth_token == null &&
                            <Button variant="outline-light"
                                    onClick={this.toggleLoginModal}>Login</Button>}
                            {this.state.auth_token != null &&
                            <Button variant="outline-light" className="mr-sm-2"
                                    onClick={this.logout}>Logout</Button>}
                            {this.state.auth_token != null &&
                            <Button variant="outline-light"
                                    onClick={this.toggleSettingsModal}>Settings</Button>}
                    </Navbar.Collapse>
                </Navbar>
                <div className="container-fluid">
                    <div className="row">
                        <div className="col col-lg-12">
                            < UserInputComp
                                updateUserInputs={this.updateUserInputs}
                                products={this.state.products}
                                updateDateSet={this.updateDateSet}
                            />
                        </div>
                        <div className="col col-lg-3">
                            <DataSetComp selectDateSet={this.state.selectDateSet} updateDateSet={this.updateDateSet}/>
                            <div className="card mt-2">
                                <div className="card-body">
                                    <FileComp uploadFileCallback={this.updateFeatures}
                                              renderGeoJSON={this.renderGeoJSON}/>
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
                            <Map ref={this.child} selectDateSet={this.state.selectDateSet}
                                 drawCallback={this.updateFeatures}/>
                        </div>
                        <NotificationContainer/>
                        <Login showLoginModal={this.state.showLoginModal}
                               onLogin={(email, password) => this.login(email, password)}
                               onResetPassword={(email) => this.resetPassword(email)}
                               onClose={this.toggleLoginModal}/>
                        <Signup showSignupModal={this.state.showSignupModal}
                                onSignup={(email, password) => this.signup(email, password)}
                                onClose={this.toggleSignupModal}/>
                        <Settings showSettingsModal={this.state.showSettingsModal}
                                  onChangePassword={(email, oldPassword, password) => this.changePassword(email, oldPassword, password)}
                                  onClose={this.toggleSettingsModal}/>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

render(
    <App />,
    document.getElementById('content')
);

export default App;