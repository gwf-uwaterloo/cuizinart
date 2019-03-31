import React, {Component} from "react";
import {Modal, Button, Form, FormGroup, FormControl, FormLabel, Col} from "react-bootstrap";
import "./Login.css";

export default class Login extends Component {
    constructor(props) {
        super(props);

        this.state = {
            email: "",
            password: "",
            forgotPassword: false
        };
    }

    validateEmail(email) {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    validateForm() {
        return this.validateEmail(this.state.email) && (this.state.password.length > 0 || this.state.forgotPassword);
    }

    handleChange = event => {
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
        if (!this.state.forgotPassword) {
            this.props.onLogin(this.state.email, this.state.password);
        } else {
            this.props.onResetPassword(this.state.email);
        }
    }

    forgotPassword = () => {
        this.setState({forgotPassword: !this.state.forgotPassword});
    }

    render() {
        return (
            <div className="Login">
                <Modal show={this.props.showLoginModal} onHide={this.props.onClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Login</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={e => this.handleSubmit(e)}>
                            <FormGroup controlId="email" bssize="large">
                                <FormLabel>Email</FormLabel>
                                <FormControl
                                    autoFocus
                                    required
                                    type="email"
                                    value={this.state.email}
                                    onChange={this.handleChange}
                                />
                                <FormControl.Feedback type="invalid">abc</FormControl.Feedback>
                            </FormGroup>
                            <FormGroup controlId="password" bssize="large">
                                <FormLabel>Password</FormLabel>
                                <FormControl
                                    required={this.state.forgotPassword}
                                    disabled={this.state.forgotPassword}
                                    value={this.state.password}
                                    onChange={this.handleChange}
                                    type="password"
                                />
                                <Button variant="link" bssize="small" onClick={this.forgotPassword}>Forgot
                                    Password?</Button>
                            </FormGroup>
                            <div className="row">
                                <div className="col col-lg-9">
                                    {!this.state.forgotPassword && <Button block bssize="large" variant="primary"
                                                                           disabled={!this.validateForm()}
                                                                           type="submit">
                                        Login
                                    </Button>}
                                    {this.state.forgotPassword && <Button block bssize="large" variant="primary"
                                                                          disabled={!this.validateForm()} type="submit">
                                        Reset Password
                                    </Button>}
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
