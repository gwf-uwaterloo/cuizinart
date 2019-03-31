import React, {Component} from "react";
import {Button, Form, FormGroup, FormControl, FormLabel, Modal} from "react-bootstrap";
import "./Signup.css";

export default class Signup extends Component {
    constructor(props) {
        super(props);

        this.state = {
            email: "",
            password: "",
            confirmPassword: ""
        };
    }

    validateForm() {
        return (
            this.state.email.length > 0 &&
            this.state.password.length > 0 &&
            this.state.password === this.state.confirmPassword
        );
    }

    handleChange = (event) => {
        this.setState({
            [event.target.id]: event.target.value
        });
    }

    handleSubmit = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
            return;
        }
        this.props.onSignup(this.state.email, this.state.password);
    }

    render() {
        return (
            <div className="Signup">
                <Modal show={this.props.showSignupModal} onHide={this.props.onClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Sign Up</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={(e) => this.handleSubmit(e)}>
                            <FormGroup controlId="email" bssize="large">
                                <FormLabel>Email</FormLabel>
                                <FormControl
                                    autoFocus
                                    type="email"
                                    value={this.state.email}
                                    onChange={this.handleChange}
                                />
                            </FormGroup>
                            <FormGroup controlId="password" bssize="large">
                                <FormLabel>Password</FormLabel>
                                <FormControl
                                    value={this.state.password}
                                    onChange={this.handleChange}
                                    type="password"
                                />
                            </FormGroup>
                            <FormGroup controlId="confirmPassword" bssize="large">
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl
                                    value={this.state.confirmPassword}
                                    onChange={this.handleChange}
                                    type="password"
                                />
                            </FormGroup>
                            <div className="row">
                                <div className="col col-lg-9">
                                    <Button block bssize="large" variant="primary"
                                            disabled={!this.validateForm()} type="submit">
                                        Sign Up
                                    </Button>
                                </div>
                                <div className="col col-lg-3">
                                    <Button block bssize="small" onClick={this.props.onClose} variant="secondary">
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}
