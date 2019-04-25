import React, {Component} from "react";
import {Modal} from "react-bootstrap";
import LoaderButton from "./LoaderButton";
import {CardContent, TextField} from "@material-ui/core";
import Card from "@material-ui/core/Card";

export default class Settings extends Component {
    constructor(props) {
        super(props);

        this.state = {
            password: "",
            oldPassword: "",
            confirmPassword: "",
            globusId: ""
        };
    }

    validateGlobusId = () => {
        return (
            this.state.globusId.length > 0
        );
    }

    handleChangeGlobusClick = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
            return;
        }
        this.props.onChangeGlobusId(this.state.globusId);

    };

    validateChangePassword = () => {
        return (
            this.state.oldPassword.length > 0 &&
            this.state.password.length > 0 &&
            this.state.password === this.state.confirmPassword
        );
    }

    handleChange = (event) => {
        this.setState({
            [event.target.id]: event.target.value
        });
    };

    handleChangePasswordClick = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
            return;
        }
        this.props.onChangePassword(this.state.email, this.state.oldPassword, this.state.password);

    };

    render() {
        return (
            <div className="Settings">
                <Modal show={this.props.showSettingsModal} onHide={this.props.onClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Settings</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Card className={"m-2"}>
                            <CardContent>
                                <form onSubmit={(e) => this.handleChangeGlobusClick(e)}>
                                    <div className={"row m-2"}>
                                        <TextField
                                            fullWidth={true}
                                            id={"globusId"}
                                            variant="outlined"
                                            label="Globus Id"
                                            placeholder={"foobar@globusid.org"}
                                            type="text"
                                            onChange={this.handleChange}
                                            defaultValue={this.props.globusId}
                                        />
                                    </div>
                                    <div className="row">
                                        <div className="col d-flex m-2 justify-content-end">
                                            <LoaderButton disabled={!this.validateGlobusId()} type="submit"
                                                          isLoading={this.props.isLoading} text="Change Globus Id"
                                                          loadingText="Loading…"/>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                        <Card className={"m-2"}>
                            <CardContent>
                                <form onSubmit={(e) => this.handleChangePasswordClick(e)}>
                                    <div className={"row m-2"}>
                                        <TextField
                                            fullWidth={true}
                                            id={"oldPassword"}
                                            variant="outlined"
                                            label="Old password"
                                            type="password"
                                            onChange={this.handleChange}
                                            value={this.state.oldPassword}
                                        />
                                    </div>
                                    <div className={"row m-2"}>
                                        <TextField
                                            fullWidth={true}
                                            id={"password"}
                                            variant="outlined"
                                            label="New password"
                                            type="password"
                                            value={this.state.password}
                                            onChange={this.handleChange}
                                        />
                                    </div>
                                    <div className={"row m-2"}>
                                        <TextField
                                            fullWidth={true}
                                            id={"confirmPassword"}
                                            variant="outlined"
                                            label="Confirm password"
                                            type="password"
                                            onChange={this.handleChange}
                                            value={this.state.confirmPassword}
                                        />
                                    </div>
                                    <div className="row">
                                        <div className="col d-flex m-2 justify-content-end">
                                            <LoaderButton disabled={!this.validateChangePassword()} type="submit"
                                                          isLoading={this.props.isLoading} text="Change Password"
                                                          loadingText="Loading…"/>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}
