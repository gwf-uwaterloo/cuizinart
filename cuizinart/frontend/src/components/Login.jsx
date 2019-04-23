import React, {Component} from "react";
import {Modal} from "react-bootstrap";
import "./Login.css";
import LoaderButton from "./LoaderButton";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

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
                        <form onSubmit={e => this.handleSubmit(e)}>
                            <div className={"row m-2"}>
                                <TextField id={"email"}
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
                                           variant="outlined"
                                           label="Password"
                                           required={!this.state.forgotPassword}
                                           disabled={this.state.forgotPassword}
                                           value={this.state.password}
                                           onChange={this.handleChange}
                                           type="password"
                                />
                                <Button className={"ml-auto"} onClick={this.forgotPassword}>Forgot
                                    Password?</Button>
                            </div>
                            <div className="row">
                                <div className="col d-flex justify-content-end">
                                    {!this.state.forgotPassword &&
                                    <LoaderButton disabled={!this.validateForm()} type="submit"
                                                  isLoading={this.props.isLoading} text="Login"
                                                  loadingText="Logging in…" size={"large"}/>}
                                    {this.state.forgotPassword &&
                                    <LoaderButton disabled={!this.validateForm()} type="submit"
                                                  isLoading={this.props.isLoading} text="Reset Password"
                                                  loadingText="Loading…"/>}
                                </div>
                                <div className="col-3">
                                    <Button onClick={this.props.onClose}>Close</Button>
                                </div>
                            </div>
                        </form>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}
