import React, { Component } from "react";
import { Modal } from "react-bootstrap";
import LoaderButton from "./LoaderButton";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

export default class Register extends Component {
    constructor(props) {
        super(props);

        this.state = {
            email: "",
            password: "",
            re_password: ""
        };
    }

    validateEmail(email) {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    validateForm() {
        return this.validateEmail(this.state.email) && this.state.password.length > 0 && this.state.password == this.state.re_password;
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
        this.props.onRegister(this.state.email, this.state.password, this.state.re_password);
        this.setState({ email: "", password: "", re_password: "" });
    }

    onClose = () => {
        this.setState({ email: "", password: "", re_password: "" });
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
                                    required
                                    value={this.state.password}
                                    onChange={this.handleChange}
                                    type="password"
                                />
                            </div>
                            <div className={"row m-2"}>
                                <TextField id={"re_password"}
                                    fullWidth={true}
                                    variant="outlined"
                                    label="Confirm Password"
                                    required
                                    value={this.state.re_password}
                                    onChange={this.handleChange}
                                    type="password"
                                />
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
