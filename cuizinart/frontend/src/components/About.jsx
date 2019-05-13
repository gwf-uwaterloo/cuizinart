import React, {Component} from "react";
import {Modal} from "react-bootstrap";

export default class About extends Component {

    render() {
        return (
            <div>
                <Modal show={this.props.showAboutModal} onHide={this.props.onClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>About</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>
                            <h5>Global Water Futures (GWF) Data Cuizinart</h5>
                        </p>
                        <p>
                            <a href="mailto:gwf.cuizinart@uwaterloo.ca">gwf.cuizinart@uwaterloo.ca</a><br/>
                            <a href="https://gwf.usask.ca" target="_blank"
                               rel="noopener noreferrer">https://gwf.usask.ca</a>
                        </p>
                        <p>
                            GWF aims to position Canada as a global leader in water science for cold regions and will
                            address the strategic needs of the Canadian economy in adapting to change and managing risks
                            of uncertain water futures and extreme events. The GWF-Cuizinart to crop and subset
                            geo-referenced data is developed at the University of Waterloo.
                        </p>
                        <p>
                            <h5>Team Members</h5>
                        </p>
                        <p>
                            Juliane Mai, Jimmy Lin, Bhaleka Persaud, Martin Gauch, Ethan Wang, Alex Weatherhead,
                            Bryan Tolson, Homa Kheyrollah, Pour, Zhenhua Li
                        </p>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}
