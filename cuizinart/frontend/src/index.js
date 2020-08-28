import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import Map from "./components/map";
import { render } from "react-dom";
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
import Register from "./components/Register";
import { AppBar, Button, Card, CardContent, Toolbar } from '@material-ui/core';
import Settings from "./components/Settings";
import GWF_logo from "./images/GWF_logo.png";
import logo_usask from "./images/logo_usask.png";
import logo_uw_horizontal from "./images/logo_uw_horizontal.png";
import github_logo from "./images/GitHub-Mark-32px.png";
import "./index.css";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import createMuiTheme from "@material-ui/core/styles/createMuiTheme";
import MuiThemeProvider from "@material-ui/core/styles/MuiThemeProvider";
import Fab from "@material-ui/core/Fab";
import SendIcon from "@material-ui/icons/Send"
import { SnackbarProvider, withSnackbar } from 'notistack';
import AccountCircle from '@material-ui/icons/AccountCircle';
import PropTypes from 'prop-types';
import Paper from "@material-ui/core/Paper";
import ArrowLeftIcon from "@material-ui/icons/ArrowLeft";
import ArrowRightIcon from "@material-ui/icons/ArrowRight";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import Disclaimer from "./components/Disclaimer"
import About from "./components/About";
import SplitPane from 'react-split-pane';

const backends = [
    { value: 'slurm', label: 'Graham' },
    { value: 'pyspark', label: 'Pyspark' }
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
        showRegisterModal: false,
        showSettingsModal: false,
        showDisclaimerModal: false,
        showAboutModal: false,
        isLoading: false,
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
        let products = [];
        axios.get('/getBoundaries')
            .then(res => {
                if (res.data.length > 0) {
                    //console.log(res.data);
                    products = self.formalizeProducts(res.data);
                }
                self.setState({ products: products });
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
                label: p.key + ' - ' + p.name,
                vars: _.map(p.variables, function (i) {
                    return { key: i.key, description: i.name, selected: false }
                }),
                horizons: _.map(p.horizons, function (i) {
                    return { key: i.horizon_id, description: i.horizon, selected: false }
                }),
                issues: _.map(p.issues, function (i) {
                    return { key: i.issue_id, description: i.issue.slice(0, 5), selected: false }
                }),
                color: '#17a2b8',
                bbox: coord,
                valid_start_time: p.start_date,
                valid_end_time: p.end_date,
                doi: p.doi
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
                        self.props.enqueueSnackbar("No corresponding products found!", { variant: 'warning' });
                    } else {
                        self.setState({ products: self.formalizeProducts(response.data) });
                    }
                })
                .catch(function (error) {
                    self.props.enqueueSnackbar(error.message, { variant: 'error' });
                });
        }
    };

    postJsonToServer = () => {
        let self = this;
        let variables = new Set();
        let horizons = new Set();
        let issues = new Set();

        if (!self.isLoggedIn()) {
            self.props.enqueueSnackbar('Please log in before processing.', { variant: 'error' });
            this.toggleLoginModal();
            return;
        }

        if (!self.state.agreedToDisclaimer) {
            self.props.enqueueSnackbar('Please agree to the disclaimer and privacy notice before processing.',
                { variant: 'error' });
            this.toggleDisclaimerModal();
            return;
        }

        if (!self.state.selectDateSet) {
            self.props.enqueueSnackbar('No product selected.', { variant: 'error' });
            return;
        }
        self.state.selectDateSet.vars.forEach(v => {
            if (v.selected) {
                variables.add(v.key);
            }
        });

        if (variables.size === 0) {
            self.props.enqueueSnackbar('No variable selected.', { variant: 'error' });
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
            self.props.enqueueSnackbar('No date range selected.', { variant: 'error' });
            return;
        }

        if (!self.state.selectedBackend || self.state.selectedBackend === '') {
            self.props.enqueueSnackbar('No backend processor selected.', { variant: 'error' });
            return;
        }

        if (moment.utc(self.userInputs.start_time).isBefore(moment.utc(self.state.selectDateSet.valid_start_time)) ||
            moment.utc(self.userInputs.end_time).isAfter(moment.utc(self.state.selectDateSet.valid_end_time))) {
            self.props.enqueueSnackbar('Valid time range is: ' + self.state.selectDateSet.valid_start_time + ' to '
                + self.state.selectDateSet.valid_end_time, { variant: 'error' });
            return;
        }

        if (self.features.length === 0) {
            self.props.enqueueSnackbar('No geometry data found.', { variant: 'error' });
            return;
        }

        let passLoad = {
            variables: Array.from(variables),
            fcst_window: Array.from(horizons),
            issues: Array.from(issues),
            product: self.state.selectDateSet.value,
            backend: self.state.selectedBackend.value,
            bounding_geom: self.features,
            auth_token: self.getAuthToken()
        };
        //console.log(JSON.stringify(passLoad));
        passLoad = _.assign(passLoad, self.userInputs);
        //console.log(JSON.stringify(passLoad));
        if (window.confirm("Do you want to process?")) {
            this.setState({ isLoading: true });
            axios.post('/fetchResult', passLoad)
                .then(function (response) {
                    self.props.enqueueSnackbar(response.data, { variant: 'success' });
                })
                .catch(function (error) {
                    self.errorHandling(error);
                })
                .finally(() => self.setState({ isLoading: false }));
        } else {
            // cancel
        }
    };

    handleSelectBackend = (selectedOption) => {
        this.setState({ selectedBackend: selectedOption });
    };

    renderGeoJSON = (geojson) => {
        this.child.current.renderGeoJson(geojson);
    };

    toggleLoginModal = () => {
        this.setState({ showLoginModal: !this.state.showLoginModal });
    }

    toggleRegisterModal = () => {
        this.setState({ showRegisterModal: !this.state.showRegisterModal });
    }

    toggleSettingsModal = () => {
        this.setState({ showSettingsModal: !this.state.showSettingsModal });
    }

    toggleDisclaimerModal = () => {
        this.setState({ showDisclaimerModal: !this.state.showDisclaimerModal });
    }

    toggleAboutModal = () => {
        this.setState({ showAboutModal: !this.state.showAboutModal });
    }

    errorHandling = (error) => {
        let message = '';
        if (error.response.status === 401) {
            localStorage.removeItem('auth_token');
            message = 'Authentication expired. Please log in again.'
        } else if (error.response.status === 413) {
            message = 'Payload too large. Use a smaller shapefile or GeoJSON.'
        } else if (error.response && error.response.data) {
            if (error.response.data.message) {
                message = error.response.data.message;
            } else if (error.response.data.response && error.response.data.response.errors) {
                let err = error.response.data.response.errors;
                message = err[Object.keys(err)[0]][0];
            }
        }
        if (message === "") {
            console.log(error);
            if (error.message) {
                message = error.message;
            } else {
                message = "Unknown error.";
            }
        }
        this.props.enqueueSnackbar(message, { variant: 'error' });
    };

    login = (email, password) => {
        let self = this;
        this.setState({ isLoading: true });
        axios.post('/login', { 'email': email, 'password': password })
            .then(response => {
                if (response.data && response.data.response && response.data.response.user
                    && response.data.response.user.authentication_token) {
                    this.setAuthToken(response.data.response.user.authentication_token);
                    self.toggleLoginModal();
                } else {
                    self.props.enqueueSnackbar("Login failed.", { variant: 'error' });
                }
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => {
                self.setState({ isLoading: false });
                if (self.isLoggedIn()) {
                    self.getUserInfo();
                }
            });
    };

    register = (email, password) => {
        let self = this;
        this.setState({ isLoading: true });
        axios.post('/register', { 'email': email, 'password': password })
            .then(function (response) {
                self.props.enqueueSnackbar("New user created successfully. The activation link has been sent to your email.", { variant: 'success'});
                self.toggleRegisterModal();
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({ isLoading: false }));
    };

    logout = () => {
        localStorage.removeItem('auth_token');
        this.setState({ globusId: '' });
    };

    changePassword = (email, oldPassword, password) => {
        let self = this;
        this.setState({ isLoading: true });
        axios.post('/change', {
            'password': oldPassword,
            'new_password': password, 'new_password_confirm': password, 'auth_token': self.getAuthToken()
        })
            .then(function (response) {
                self.props.enqueueSnackbar("Password changed successfully.", { variant: 'success' });
                self.toggleSettingsModal();
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({ isLoading: false }));
    }

    resetPassword = (email) => {
        let self = this;
        this.setState({ isLoading: true });
        axios.post('/reset', { 'email': email })
            .then(function (response) {
                self.props.enqueueSnackbar("Password reset request sent. Check your email.", { variant: 'success' });
                self.toggleLoginModal();
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({ isLoading: false }));
    };

    setAuthToken = (token) => {
        localStorage.setItem('auth_token', token);
    }

    getAuthToken = () => {
        return localStorage.getItem('auth_token');
    }

    isLoggedIn = () => {
        return this.getAuthToken() != null;
    }

    getUserInfo = () => {
        let self = this;
        if (this.state.globusId != null && this.state.globusId !== '') {
            return this.state.globusId;
        }
        this.setState({ isLoading: true });
        axios.post('/getUserInfo', { 'auth_token': this.getAuthToken() })
            .then(function (response) {
                if (response.data.length === 0) {
                    self.props.enqueueSnackbar("Error retrieving user information!", { variant: 'error' });
                } else {
                    self.setState({ globusId: response.data.globusId });
                    self.setState({ agreedToDisclaimer: response.data.agreedToDisclaimer });
                }
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({ isLoading: false }));
    }

    changeGlobusId = (newId) => {
        let self = this;
        this.setState({ isLoading: true });
        axios.post('/setUserInfo', { 'globusId': newId, 'auth_token': this.getAuthToken() })
            .then(function (response) {
                if (response.data.length === 0) {
                    self.props.enqueueSnackbar("Error setting user information!", { variant: 'error' });
                } else {
                    self.setState({ globusId: newId });
                    self.props.enqueueSnackbar("Globus ID updated successfully.", { variant: 'success' });
                }
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({ isLoading: false }));
    }

    toggleSidebar = () => {
        if (this.state.sidebarOpen) {
            this.setState({ sidebarOpen: false });
        } else {
            this.setState({ sidebarOpen: true });
        }
    }

    agreeDisclaimer = () => {
        let self = this;
        if (!this.isLoggedIn()) {
            self.props.enqueueSnackbar("Please Log in to your account first.", { variant: 'error' });
            return;
        }
        if (this.state.agreedToDisclaimer) {
            self.props.enqueueSnackbar("You already agreed to the disclaimer.", { variant: 'info' });
            return;
        }
        this.setState({ isLoading: true });
        axios.post('/setUserInfo', { 'agreedToDisclaimer': true, 'auth_token': this.getAuthToken() })
            .then(function (response) {
                if (response.data.length === 0) {
                    self.props.enqueueSnackbar("Error updating user information!", { variant: 'error' });
                } else {
                    self.setState({ agreedToDisclaimer: true });
                    self.props.enqueueSnackbar("Updated user information successfully.", { variant: 'success' });
                    self.toggleDisclaimerModal();
                }
            })
            .catch(function (error) {
                self.errorHandling(error);
            })
            .finally(() => this.setState({ isLoading: false }));
    }

    render() {
        return (
            <React.Fragment>
                <MuiThemeProvider theme={theme}>
                    <AppBar position={"sticky"} color={"primary"}>
                        <Toolbar className={"p-0"}>
                            <IconButton className={"menuButton"} color="inherit" aria-label="Menu">
                                <img className="img-right" src={GWF_logo} alt="GWF logo" />
                            </IconButton>
                            <Typography className={"mr-auto"} variant="h5" color="inherit" noWrap>GWF
                                Cuizinart</Typography>
                            <a href="https://uwaterloo.ca/global-water-futures/"><img className="img-right"
                                src={logo_uw_horizontal}
                                alt="UW logo" /></a>
                            <a href="https://gwf.usask.ca/"><img className="img-right" src={logo_usask}
                                alt="USask logo" /></a>
                            <a href="https://github.com/gwf-uwaterloo/cuizinart"><img className="img-right mr-sm-4"
                                src={github_logo}
                                alt="Github logo" /></a>
                            {!this.isLoggedIn() &&
                                <Button variant="outlined" color={"inherit"} className={"mr-2"}
                                    onClick={this.toggleLoginModal}>Login</Button>}
                            {!this.isLoggedIn() && 
                                <Button variant="outlined" color={"inherit"} className={"mr-2"}
                                onClick={this.toggleRegisterModal}>Register</Button>}
                            {this.isLoggedIn() &&
                                <Button variant="outlined" color={"inherit"} className={"mr-2"}
                                    onClick={this.logout}>Logout</Button>}
                            {this.isLoggedIn() &&
                                <IconButton color="inherit" fontSize="large" onClick={this.toggleSettingsModal}>
                                    <AccountCircle />
                                </IconButton>}
                            <IconButton className={"mr-2"} onClick={this.toggleAboutModal} color="inherit" fontSize="large">
                                <InfoOutlinedIcon />
                            </IconButton>
                        </Toolbar>
                    </AppBar>

                    <div className="container-fluid">

                        <div className="row">

                        <SplitPane className="sidebar" split="vertical" minSize={100} defaultSize={500}>
                            <div>

                                <Card className="m-0 p-0" style={{ overflow: "visible" }}>
                                        <CardContent className="p-3">
                                            <UserInputComp
                                                updateUserInputs={this.updateUserInputs}
                                                products={this.state.products}
                                                updateDateSet={this.updateDateSet} />
                                            <DataSetComp selectDateSet={this.state.selectDateSet}
                                                updateDateSet={this.updateDateSet}
                                                updateUserInputs={this.updateUserInputs} />
                                            <div className={"row mr-0 mt-2"}>
                                                <Select className={"col-7"}
                                                    id="backend"
                                                    value={this.state.selectedBackend}
                                                    placeholder={"Choose Backend..."}
                                                    onChange={this.handleSelectBackend}
                                                    options={backends} />
                                                <Fab variant="extended" color={"primary"} className={"ml-auto mt-auto"}
                                                    onClick={this.postJsonToServer}
                                                    disabled={this.state.selectDateSet == null || this.state.isLoading}>
                                                    <SendIcon className={"mr-2"} />Process
                                                </Fab>
                                            </div>
                                            <div className={"row justify-content-end mr-0 mt-1"}>
                                                <Button size="small" href="#" onClick={this.toggleDisclaimerModal}
                                                    style={{ color: "gray", fontSize: "x-small", textTransform: "none" }}>
                                                    Disclaimer & Privacy Notice</Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Login showLoginModal={this.state.showLoginModal}
                                        onLogin={(email, password) => this.login(email, password)}
                                        onResetPassword={(email) => this.resetPassword(email)}
                                        onClose={this.toggleLoginModal} isLoading={this.state.isLoading} />
                                    <Register showRegisterModal={this.state.showRegisterModal}
                                        onRegister={(email, password, re_password) => this.register(email, password, re_password)}
                                        onClose={this.toggleRegisterModal}/>
                                    <Settings showSettingsModal={this.state.showSettingsModal}
                                        onChangePassword={(email, oldPassword, password) => this.changePassword(email, oldPassword, password)}
                                        onClose={this.toggleSettingsModal} isLoading={this.state.isLoading}
                                        globusId={this.state.globusId}
                                        onChangeGlobusId={(globusId) => this.changeGlobusId(globusId)} />
                                    <Disclaimer showDisclaimerModal={this.state.showDisclaimerModal}
                                        showAgreeButton={this.isLoggedIn() && !this.state.agreedToDisclaimer}
                                        isLoading={this.state.isLoading} agreeDisclaimer={this.agreeDisclaimer}
                                        onClose={this.toggleDisclaimerModal} />
                                    <About showAboutModal={this.state.showAboutModal}
                                        onClose={this.toggleAboutModal} />

                                </div>
                                <div>

                                    <main className={"col-12 p-0"}>
                                        <Map ref={this.child} selectDateSet={this.state.selectDateSet}
                                            drawCallback={this.updateFeatures} filterProd={this.filterProducts}
                                            uploadFileCallback={this.updateFeatures} />
                                    </main>

                                </div>

                            </SplitPane>
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
        <App />
    </SnackbarProvider>,
    document.getElementById('content')
);

export default App;
