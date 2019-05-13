import React, {Component} from "react";
import {Modal} from "react-bootstrap";
import jmai from "../images/jmai.jpg";
import jlin from "../images/jlin.jpg";
import mgauch from "../images/mgauch.jpg";
import Avatar from "@material-ui/core/Avatar";
import Grid from "@material-ui/core/Grid";

const team = [["Juliane Mai", jmai], ["Jimmy Lin", jlin], ["Bhaleka Persaud"], ["Martin Gauch", mgauch],
    ["Ethan Wang"], ["Alex Weatherhead"], ["Bryan Tolson"], ["Homa Kheyrollah Pour"],
    ["Zhenhua Li"]];

let teamHtml = [];
for (let i = 0; i < team.length; i++) {
    let person = team[i];
    let avatar = (person.length < 2) ?
        <Avatar component={'h5'}>{person[0][0]}</Avatar>
        : <Avatar alt={person[0]} src={person[1]} component={'h5'}/>

    teamHtml.push(
        <Grid item xs={6} className={"container"}>
            <div className={"row"}>
                {avatar}
                <div className={"row m-2"}>{person[0]}</div>
            </div>
        </Grid>
    );
}

export default class About extends Component {

    render() {
        return (
            <div>
                <Modal show={this.props.showAboutModal} onHide={this.props.onClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>About</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className={"container"}>
                        <div className={"col m-0"}>
                            <h5 className={"row"}>
                                Global Water Futures (GWF) Data Cuizinart
                            </h5>
                            <p className={"row"}>
                                GWF aims to position Canada as a global leader in water science for cold regions and
                                will address the strategic needs of the Canadian economy in adapting to change and
                                managing risks of uncertain water futures and extreme events. The GWF-Cuizinart to
                                crop and subset geo-referenced data is developed at the University of Waterloo.
                            </p>
                            <h5 className={"row"}>
                                Team Members
                            </h5>
                            <div className={"row"}>
                                <Grid container>
                                    {teamHtml}
                                </Grid>
                            </div>
                            <div className={"row mt-2"}>
                                <a href="mailto:gwf.cuizinart@uwaterloo.ca">gwf.cuizinart@uwaterloo.ca</a>
                                <a className="ml-auto" href="https://gwf.usask.ca" target="_blank"
                                   rel="noopener noreferrer">https://gwf.usask.ca</a>
                            </div>
                        </div>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}
