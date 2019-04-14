import React, {Component} from "react";
import {Form, FormGroup, FormControl, FormLabel, Button, Modal} from "react-bootstrap";
import "./Settings.css";
import LoaderButton from "./LoaderButton";

export default class Settings extends Component {
    constructor(props) {
        super(props);

        this.state = {
            password: "",
            oldPassword: "",
            confirmPassword: ""
        };
    }

    validateForm() {
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

    handleChangeClick = (event) => {
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
                        <Form onSubmit={(e) => this.handleChangeClick(e)}>
                            <FormGroup bssize="large" controlId="oldPassword">
                                <FormLabel>Old Password</FormLabel>
                                <FormControl
                                    type="password"
                                    onChange={this.handleChange}
                                    value={this.state.oldPassword}
                                />
                            </FormGroup>
                            <hr/>
                            <FormGroup bssize="large" controlId="password">
                                <FormLabel>New Password</FormLabel>
                                <FormControl
                                    type="password"
                                    value={this.state.password}
                                    onChange={this.handleChange}
                                />
                            </FormGroup>
                            <FormGroup bssize="large" controlId="confirmPassword">
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl
                                    type="password"
                                    onChange={this.handleChange}
                                    value={this.state.confirmPassword}
                                />
                            </FormGroup>
                            <LoaderButton block bssize="large" disabled={!this.validateForm()} type="submit"
                                          isLoading={this.props.isLoading} text="Change Password"
                                          variant="primary" loadingText="Loading…"/>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}
