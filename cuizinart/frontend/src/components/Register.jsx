import React, { Component } from "react";
import { Modal } from "react-bootstrap";
import LoaderButton from "./LoaderButton";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import {Checkbox} from "@material-ui/core";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import Select from "react-select";

const areasOfInterest = ["Water Resources", "Water Quality", "Water Treatment", "Health", "Drought Forecasting",
    "Hydraulics", "Ecohydrology", "Forestry", "Georesources", "Regulation", "Law Enforcement", "Transportation",
    "Agriculture", "Flood Forecasting", "Public Safety", "Meteorology", "Climate Change", "Forensic Hydrometeorology",
    "Aviation", "Emergency Management", "Energy", "Renewable Energy", "Planning", "Environmental Impact Assessment",
    "Academic Research", "Operations", "Other"]

function get_clean_state() {
    return {first_name: "",
            last_name: "",
            email: "",
            password: "",
            re_password: "",
            globus_id: "",
            organization: "",
            usage_proposal: "",
            caspar_terms_accepted: false,
            eccc_terms_accepted: false,
            areas_of_interest: [],
            aoiMenuIsOpen: undefined,
            aoiInputValue: ""
        };
}

export default class Register extends Component {
    constructor(props) {
        super(props);

        this.state = get_clean_state();
    }

    validateEmail(email) {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    validateForm() {
        return (this.validateEmail(this.state.email)
            && this.state.password.length > 5
            && this.state.password === this.state.re_password
            && this.state.first_name.length > 0 && this.state.last_name.length > 0
            && this.state.organization.length > 0 && this.state.usage_proposal.length > 0
            && this.state.areas_of_interest.length > 0
            && this.state.caspar_terms_accepted && this.state.eccc_terms_accepted
            && this.validateEmail(this.state.globus_id)  // a GlobusID has the same format as an email address
        );
    }

    handleChange = event => {
        this.setState({
            [event.target.id]: event.target.value
        });
    }

    handleCheckbox(key, event) {
        const target = event.target;
        if (key === 'caspar_terms') {
            this.setState({caspar_terms_accepted: target.checked});
        } else if (key === 'eccc_terms') {
            this.setState({eccc_terms_accepted: target.checked});
        }
    }

    onAreasOfInterestInputChange = (inputValue, {action}) => {
        switch (action) {
            case 'input-change':
                this.setState({aoiInputValue: inputValue});
                return;
            case 'menu-close':
                let menuIsOpen = undefined;
                if (this.state.aoiInputValue) {
                    menuIsOpen = true;
                }
                this.setState({aoiMenuIsOpen: menuIsOpen});
                return;
            default:
                return;
        }
    };

    onAreasOfInterestChange = (selectedAreas, {action}) => {
        this.setState({areas_of_interest: selectedAreas});
    };

    handleSubmit = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
            return;
        }
        let user_info = {
            'first_name': this.state.first_name,
            'last_name': this.state.last_name,
            'email': this.state.email,
            'password': this.state.password,
            'globus_id': this.state.globus_id,
            'organization': this.state.organization,
            'areas_of_interest': this.state.areas_of_interest.map((aoi) => aoi.label).sort().join(","),
            'usage_proposal': this.state.usage_proposal,
            'caspar_terms_accepted': this.state.caspar_terms_accepted,
            'eccc_terms_accepted': this.state.eccc_terms_accepted
        };
        this.props.onRegister(user_info);
        this.setState(get_clean_state());
    }

    onClose = () => {
        this.setState(get_clean_state());
        this.props.onClose();
    }

    render() {
        return (
            <div className="Register">
                <Modal show={this.props.showRegisterModal} onHide={this.onClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Register</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={e => this.handleSubmit(e)}>
                            <div className={"row m-2"}>
                                <TextField id={"first_name"} className={"col mr-2"}
                                    fullWidth={true}
                                    variant="outlined"
                                    label="First Name"
                                    disabled={false}
                                    required
                                    value={this.state.first_name}
                                    onChange={this.handleChange}
                                />
                                <TextField id={"last_name"} className={"col"}
                                    fullWidth={true}
                                    variant="outlined"
                                    label="Last Name"
                                    disabled={false}
                                    required
                                    value={this.state.last_name}
                                    onChange={this.handleChange}
                                />
                            </div>
                            <div className={"row m-2"}>

                            </div>
                            <div className={"row m-2"}>
                                <TextField id={"email"}
                                    error={this.state.email.length > 0 && !this.validateEmail(this.state.email)}
                                    fullWidth={true}
                                    variant="outlined"
                                    label="Email"
                                    disabled={false}
                                    required
                                    type="email"
                                    value={this.state.email}
                                    onChange={this.handleChange}
                                />
                            </div>
                            <div className={"row m-2"}>
                                <TextField id={"password"}
                                    fullWidth={true}
                                    error={this.state.password.length > 0 && this.state.password.length < 6}
                                    variant="outlined"
                                    label="Password (at least six characters)"
                                    required
                                    value={this.state.password}
                                    onChange={this.handleChange}
                                    type="password"
                                />
                            </div>
                            <div className={"row m-2"}>
                                <TextField id={"re_password"}
                                    error={this.state.re_password.length > 0 &&
                                        this.state.password !== this.state.re_password}
                                    fullWidth={true}
                                    variant="outlined"
                                    label="Confirm Password"
                                    required
                                    value={this.state.re_password}
                                    onChange={this.handleChange}
                                    type="password"
                                />
                            </div>
                            <div className={"row m-2"}>
                                <TextField id={"organization"}
                                    fullWidth={true}
                                    variant="outlined"
                                    label="Organization"
                                    disabled={false}
                                    required
                                    value={this.state.organization}
                                    onChange={this.handleChange}
                                />
                            </div>
                            <div className={"row m-2"}>
                                <TextField id={"globus_id"}
                                    fullWidth={true}
                                    variant="outlined"
                                    label="Globus ID (e.g. name@globusid.org)"
                                    disabled={false}
                                    required
                                    value={this.state.globus_id}
                                    onChange={this.handleChange}
                                />
                            </div>
                            <div className={"row m-2"}>
                                <TextField id={"usage_proposal"}
                                    fullWidth={true}
                                    variant="outlined"
                                    label="Short Proposal for CaSPAr Use"
                                    disabled={false}
                                    required
                                    value={this.state.usage_proposal}
                                    onChange={this.handleChange}
                                />
                            </div>
                            <Select className={"m-2"}
                                isMulti isClearable isSearchable
                                inputValue={this.state.aoiInputValue}
                                onInputChange={this.onAreasOfInterestInputChange}
                                value={this.state.areas_of_interest}
                                onChange={this.onAreasOfInterestChange}
                                name="areas_of_interest"
                                placeholder={"Areas of Interest *"}
                                options={areasOfInterest.map((aoi) => {
                                    return {value: aoi, label: aoi};
                                })}
                                hideSelectedOptions={false}
                                menuIsOpen={this.state.aoiMenuIsOpen}
                            />
                            <div className={"row m-2"}>
                                <FormControl component="fieldset" required>
                                    <FormControlLabel control={
                                        <Checkbox checked={this.state.caspar_terms_accepted} className={"pb-1 pt-1"}
                                                  onChange={(e) => this.handleCheckbox('caspar_terms', e)}/>
                                    } label={<div>I accept the <a href={"/caspar_terms.txt"} target={"blank"}>CaSPAr Terms of Service</a> *</div>}/>
                                </FormControl>
                                <FormControl component="fieldset" required>
                                    <FormControlLabel control={
                                        <Checkbox checked={this.state.eccc_terms_accepted} className={"pb-1 pt-1"}
                                                  onChange={(e) => this.handleCheckbox('eccc_terms', e)}/>
                                    } label={<div>I accept the <a href={"/eccc_terms.txt"} target={"blank"}>Environment and Climate Change Canada Terms of Service</a> *</div>}/>
                                </FormControl>
                            </div>
                            <div className="row">
                                <div className="col d-flex justify-content-end">
                                    {<LoaderButton disabled={!this.validateForm()} type="submit"
                                            isLoading={this.props.isLoading} text="Register"
                                            loadingText="Creating new user..." size={"large"} />}
                                </div>
                                <div className="col-3">
                                    <Button onClick={this.onClose}>Close</Button>
                                </div>
                            </div>
                        </form>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}
