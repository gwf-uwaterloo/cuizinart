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
import DataSetComp from './components/dataSetsComp';
import UserInputComp from "./components/userInputComp";
import Login from "./components/Login";
import {AppBar, Button, Card, CardContent, Toolbar} from '@material-ui/core';
import Settings from "./components/Settings";
import GWF_logo from "./GWF_logo.png";
import logo_usask from "./logo_usask.png";
import logo_uw_horizontal from "./logo_uw_horizontal.png";
import github_logo from "./GitHub-Mark-32px.png";
import "./index.css";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import createMuiTheme from "@material-ui/core/styles/createMuiTheme";
import MuiThemeProvider from "@material-ui/core/styles/MuiThemeProvider";
import Fab from "@material-ui/core/Fab";
import SendIcon from "@material-ui/icons/Send"
import {SnackbarProvider, withSnackbar} from 'notistack';
import AccountCircle from '@material-ui/icons/AccountCircle';
import PropTypes from 'prop-types';
import Paper from "@material-ui/core/Paper";
import ArrowLeftIcon from "@material-ui/icons/ArrowLeft";
import ArrowRightIcon from "@material-ui/icons/ArrowRight";
import Disclaimer from "./components/Disclaimer"

const backends = [
    {value: 'slurm', label: 'Graham'},
    {value: 'pyspark', label: 'Pyspark'}
];

const theme = createMuiTheme({
    palette: {
        primary: {
            light: '#60d4ea',
            main: '#17a2b8',
            dark: '#007388',
            contrastText: '#fff',
        },
        secondary: {
            light: '#60d4ea',
            main: '#17a2b8',
            dark: '#007388',
            contrastText: '#fff',
        },
    },
    typography: {
        useNextVariants: true,
    },
});

class CuizinartApp extends Component {
    state = {
        showLoginModal: false,
        showSettingsModal: false,
        showDisclaimerModal: false,
        isLoading: false,
        isLoggedIn: false,
        selectDateSet: null,
        products: [],
        selectedBackend: null,
        globusId: '',
        agreedToDisclaimer: false,
        sidebarOpen: true
    };

    constructor(props) {
        super(props);
        this.child = React.createRef();
        this.userInputs = {};
        this.features = [];
    }

    componentDidMount() {
        let self = this;
        let authToken = this.getAuthToken();
        this.setState({isLoggedIn: authToken != null});
        let products = [];
        axios.get('/getBoundaries')
            .then(res => {
                if (res.data.length > 0) {
                    //console.log(res.data);
                    products = self.formalizeProducts(res.data);
                }
                self.setState({products: products});
            });
        if (authToken != null) {
            this.getUserInfo();
        }
    }

    formalizeProducts = (prods) => {
        let products = [];
        prods.forEach(function (p) {
            /*
                swap (lon, lat) to (lat, lon)
             */
            let coord = p.domain.extent.coordinates[0].map(function (arr) {
                return [arr[1], arr[0]];
            });
            //console.log(coord);
            let product = {
                id: p.product_id,
                value: p.key,
                label: p.name,
                vars: _.map(p.variables, function (i) {
                    return {key: i.key, description: i.name, selected: false}
                }),
                horizons: _.map(p.horizons, function (i) {
                    return {key: i.horizon_id, description: i.horizon, selected: false}
                }),
                issues: _.map(p.issues, function (i) {
                    return {key: i.issue_id, description: i.issue.slice(0, 5), selected: false}
                }),
                color: '#17a2b8',
                bbox: coord,
                valid_start_time: p.start_date,
                valid_end_time: p.end_date
            };
            products.push(product);
        });
        return products;
    };

    updateDateSet = (dataSet) => {
        this.setState(dataSet);
    };

    updateUserInputs = (userInputs) => {
        this.userInputs = _.assign(this.userInputs, userInputs);
    };

    updateFeatures = (features) => {
        this.features = features;
    };

    filterProducts = (features) => {
        let self = this;
        if (!this.state.selectDateSet) {
            let bounds = {
                "features": features
            };
            axios.post('/filterProducts', bounds)
                .then(function (response) {
                    if (response.data.length === 0) {
                        self.props.enqueueSnackbar("No corresponding products found!", {variant: 'warning'});
                    } else {
                        self.setState({products: self.formalizeProducts(response.data)});
                    }
                })
                .catch(function (error) {
                    self.props.enqueueSnackbar(error.message, {variant: 'error'});
                });
        }
    };

    postJsonToServer = () => {
        let self = this;
        let variables = new Set();
        let horizons = new Set();
        let issues = new Set();

        if (self.getAuthToken() == null) {
            self.props.enqueueSnackbar('Please log in before processing.', {variant: 'error'});
            this.toggleLoginModal();
            return;
        }

        if (!self.state.agreedToDisclaimer) {
            self.props.enqueueSnackbar('Please agree to the disclaimer and privacy notice before processing.',
                {variant: 'error'});
            this.toggleDisclaimerModal();
            return;
        }

        if (!self.state.selectDateSet) {
            self.props.enqueueSnackbar('No product selected.', {variant: 'error'});
            return;
        }
        self.state.selectDateSet.vars.forEach(v => {
            if (v.selected) {
                variables.add(v.key);
            }
        });

        if (variables.size === 0) {
            self.props.enqueueSnackbar('No variable selected.', {variant: 'error'});
            return;
        }
        // add selected horizons(forecast windows)
        self.state.selectDateSet.horizons.forEach(v => {
            if (v.selected) {
                horizons.add(v.description);
            }
        });

        // add selected issues(forecast issues)
        self.state.selectDateSet.issues.forEach(v => {
            if (v.selected) {
                issues.add(v.description);
            }
        });

        if (!self.userInputs || !self.userInputs.start_time || !self.userInputs.end_time) {
            self.props.enqueueSnackbar('No date range selected.', {variant: 'error'});
            return;
        }

        if (!self.state.selectedBackend || self.state.selectedBackend === '') {
            self.props.enqueueSnackbar('No backend processor selected.', {variant: 'error'});
            return;
        }

        if (moment(self.userInputs.start_time).isBefore(self.state.selectDateSet.valid_start_time) || moment(self.userInputs.end_time).isAfter(self.state.selectDateSet.valid_end_time)) {
            self.props.enqueueSnackbar('Valid time range is: ' + self.state.selectDateSet.valid_start_time + ' to ' + self.state.selectDateSet.valid_end_time, {variant: 'error'});
            return;
        }

        if (self.features.length === 0) {
            self.props.enqueueSnackbar('No geometry data found.', {variant: 'error'});
            return;
        }

        let passLoad = {
            variables: Array.from(variables),
            window: Array.from(horizons),
            release: Array.from(issues),
            product: self.state.selectDateSet.value,
            backend: self.state.selectedBackend.value,
            bounding_geom: self.features,
            auth_token: self.getAuthToken()
        };
        //console.log(JSON.stringify(passLoad));
        passLoad = _.assign(passLoad, self.userInputs);
        //console.log(JSON.stringify(passLoad));
        if (window.confirm("Do you want to process?")) {
            this.setState({isLoading: true});
            axios.post('/fetchResult', passLoad)
                .then(function (response) {
                    self.props.enqueueSnackbar(response.data, {variant: 'success'});
                })
                .catch(function (error) {
                    self.errorHandling(error);
                })
                .finally(() => self.setState({isLoading: false}));
        } else {
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

    toggleSettingsModal = () => {
        this.setState({showSettingsModal: !this.state.showSettingsModal});
    }

    toggleDisclaimerModal = () => {
        this.setState({showDisclaimerModal: !this.state.showDisclaimerModal});
    }

    errorHandling = (error) => {
        let message = '';
        if (error.response && error.response.data) {
            if (error.response.data.message) {
                message = error.response.data.message;
            } else if (error.response.data.response && error.response.data.response.errors) {
                let err = error.response.data.response.errors;
                message = err[Object.keys(err)[0]][0];
            }
        } else {
            message = error.message;
        }
        this.props.enqueueSnackbar(message, {variant: 'error'});
    };

    login = (email, password) => {
        let self = this;
        this.setState({isLoading: true});
        axios.post('/login', {'email': email, 'password': password})
            .then(response => {
                if (response.data && response.data.response && response.data.response.user
                    && response.data.response.user.authentication_token) {
                    this.setAuthToken(response.data.response.user.authentication_token);
                    self.toggleLoginModal();
                } else {
                    self.props.enqueueSnackbar("Login failed.", {variant: 'error'});
                }
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => {
                self.setState({isLoading: false});
                if (self.getAuthToken() != null) {
                    self.getUserInfo();
                }
            });
    };

    logout = () => {
        let self = this;
        axios.get('/logout')
            .then(function (response) {
                localStorage.removeItem('auth_token');
                self.setState({isLoggedIn: false, globusId: ''});
            })
            .catch(function (error) {
                self.errorHandling(error);
            });
    };

    changePassword = (email, oldPassword, password) => {
        let self = this;
        this.setState({isLoading: true});
        axios.post('/change', {
            'password': oldPassword,
            'new_password': password, 'new_password_confirm': password, 'auth_token': self.getAuthToken()
        })
            .then(function (response) {
                self.props.enqueueSnackbar("Password changed successfully.", {variant: 'success'});
                self.toggleSettingsModal();
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({isLoading: false}));
    }

    resetPassword = (email) => {
        let self = this;
        this.setState({isLoading: true});
        axios.post('/reset', {'email': email})
            .then(function (response) {
                self.props.enqueueSnackbar("Password reset request sent. Check your email.", {variant: 'success'});
                self.toggleLoginModal();
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({isLoading: false}));
    };

    setAuthToken = (token) => {
        localStorage.setItem('auth_token', token);
        if (token != null) {
            this.setState({isLoggedIn: true});
        } else {
            this.setState({isLoggedIn: false});
        }
    }

    getAuthToken = () => {
        return localStorage.getItem('auth_token');
    }

    getUserInfo = () => {
        let self = this;
        if (this.state.globusId != null && this.state.globusId !== '') {
            return this.state.globusId;
        }
        this.setState({isLoading: true});
        axios.post('/getUserInfo', {'auth_token': this.getAuthToken()})
            .then(function (response) {
                if (response.data.length === 0) {
                    self.props.enqueueSnackbar("Error retrieving user information!", {variant: 'error'});
                } else {
                    self.setState({globusId: response.data.globusId});
                    self.setState({agreedToDisclaimer: response.data.agreedToDisclaimer});
                }
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({isLoading: false}));
    }

    changeGlobusId = (newId) => {
        let self = this;
        this.setState({isLoading: true});
        axios.post('/setUserInfo', {'globusId': newId, 'auth_token': this.getAuthToken()})
            .then(function (response) {
                if (response.data.length === 0) {
                    self.props.enqueueSnackbar("Error setting user information!", {variant: 'error'});
                } else {
                    self.setState({globusId: newId});
                    self.props.enqueueSnackbar("Globus ID updated successfully.", {variant: 'success'});
                }
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({isLoading: false}));
    }

    toggleSidebar = () => {
        if (this.state.sidebarOpen) {
            this.setState({sidebarOpen: false});
        } else {
            this.setState({sidebarOpen: true});
        }
    }

    agreeDisclaimer = () => {
        let self = this;
        if (!this.state.isLoggedIn) {
            self.props.enqueueSnackbar("Please Log in to your account first.", {variant: 'error'});
            return;
        }
        if (this.state.agreedToDisclaimer) {
            self.props.enqueueSnackbar("You already agreed to the disclaimer.", {variant: 'info'});
            return;
        }
        this.setState({isLoading: true});
        axios.post('/setUserInfo', {'agreedToDisclaimer': true, 'auth_token': this.getAuthToken()})
            .then(function (response) {
                if (response.data.length === 0) {
                    self.props.enqueueSnackbar("Error updating user information!", {variant: 'error'});
                } else {
                    self.setState({agreedToDisclaimer: true});
                    self.props.enqueueSnackbar("Updated user information successfully.", {variant: 'success'});
                    self.toggleDisclaimerModal();
                }
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({isLoading: false}));
    }

    render() {
        return (
            <React.Fragment>
                <MuiThemeProvider theme={theme}>
                    <AppBar position={"sticky"} color={"primary"}>
                        <Toolbar className={"p-0"}>
                            <IconButton className={"menuButton"} color="inherit" aria-label="Menu">
                                <img className="img-right" src={GWF_logo} alt="GWF logo"/>
                            </IconButton>
                            <Typography className={"mr-auto"} variant="h6" color="inherit" noWrap>GWF
                                Cuizinart</Typography>
                            <a href="https://uwaterloo.ca/global-water-futures/"><img className="img-right"
                                                                                      src={logo_uw_horizontal} alt="UW logo"/></a>
                            <a href="https://gwf.usask.ca/"><img className="img-right" src={logo_usask} alt="USask logo"/></a>
                            <a href="https://github.com/gwf-uwaterloo/cuizinart"><img className="img-right mr-sm-4"
                                                                                      src={github_logo} alt="Github logo"/></a>
                            {!this.state.isLoggedIn &&
                            <Button variant="outlined" color={"inherit"} className={"mr-2"}
                                    onClick={this.toggleLoginModal}>Login</Button>}
                            {this.state.isLoggedIn &&
                            <Button variant="outlined" color={"inherit"} className={"mr-2"}
                                    onClick={this.logout}>Logout</Button>}
                            {this.state.isLoggedIn &&
                            <IconButton className={"mr-2"} color="inherit" fontSize="large"
                                        onClick={this.toggleSettingsModal}>
                                <AccountCircle/>
                            </IconButton>}
                        </Toolbar>
                    </AppBar>
                    <div className="container-fluid">
                        <div className="row">
                            <main className={"col-12 p-0"}>
                                <Map ref={this.child} selectDateSet={this.state.selectDateSet}
                                     drawCallback={this.updateFeatures} filterProd={this.filterProducts}
                                     uploadFileCallback={this.updateFeatures}/>
                            </main>
                            <div className="sidebar-sticky ml-0 col-3 p-2"
                                 style={{display: this.state.sidebarOpen ? "" : "none"}}>
                                <Card className="m-0 p-0" style={{overflow: "visible"}}>
                                    <CardContent>
                                        <UserInputComp
                                            updateUserInputs={this.updateUserInputs}
                                            products={this.state.products}
                                            updateDateSet={this.updateDateSet}/>
                                        <DataSetComp selectDateSet={this.state.selectDateSet}
                                                     updateDateSet={this.updateDateSet}
                                                     updateUserInputs={this.updateUserInputs}/>
                                        <div className={"row mr-0"}>
                                            <Select className={"col-7"}
                                                    id="backend"
                                                    value={this.state.selectedBackend}
                                                    placeholder={"Choose Backend..."}
                                                    onChange={this.handleSelectBackend}
                                                    options={backends}/>
                                            <Fab variant="extended" color={"primary"} className={"ml-auto mt-auto"}
                                                 onClick={this.postJsonToServer}
                                                 disabled={this.state.selectDateSet == null || this.state.isLoading}>
                                                <SendIcon className={"mr-2"}/>Process
                                            </Fab>
                                        </div>
                                        <div className={"row justify-content-end mr-0 mt-2"}>
                                            <Button size="small" href="#" onClick={this.toggleDisclaimerModal}>Disclaimer & Privacy Notice</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Paper className={"col-1 closeSidebar"} onClick={this.toggleSidebar}>
                                {this.state.sidebarOpen ? <ArrowLeftIcon/> : <ArrowRightIcon/>}</Paper>
                            <Login showLoginModal={this.state.showLoginModal}
                                   onLogin={(email, password) => this.login(email, password)}
                                   onResetPassword={(email) => this.resetPassword(email)}
                                   onClose={this.toggleLoginModal} isLoading={this.state.isLoading}/>
                            <Settings showSettingsModal={this.state.showSettingsModal}
                                      onChangePassword={(email, oldPassword, password) => this.changePassword(email, oldPassword, password)}
                                      onClose={this.toggleSettingsModal} isLoading={this.state.isLoading}
                                      globusId={this.state.globusId}
                                      onChangeGlobusId={(globusId) => this.changeGlobusId(globusId)}/>
                            <Disclaimer showDisclaimerModal={this.state.showDisclaimerModal}
                                        hasAgreed={this.state.agreedToDisclaimer} isLoading={this.state.isLoading}
                                        agreeDisclaimer={this.agreeDisclaimer} onClose={this.toggleDisclaimerModal}/>
                        </div>
                    </div>
                </MuiThemeProvider>
            </React.Fragment>
        );
    }
}

CuizinartApp.propTypes = {
    enqueueSnackbar: PropTypes.func.isRequired,
};

const App = withSnackbar(CuizinartApp);

render(
    <SnackbarProvider maxSnack={3}>
        <App/>
    </SnackbarProvider>,
    document.getElementById('content')
);

export default App;
