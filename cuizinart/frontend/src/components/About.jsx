import React, {Component} from "react";
import {Modal} from "react-bootstrap";
import jmai from "../images/jmai.jpg";
import jlin from "../images/jlin.jpg";
import mgauch from "../images/mgauch.jpg";
import btolson from "../images/btolson.jpg";
import Avatar from "@material-ui/core/Avatar";
import Grid from "@material-ui/core/Grid";
import CardContent from "@material-ui/core/CardContent";
import Card from "@material-ui/core/Card";

const team = [{name: "Juliane Mai", website: "http://www.civil.uwaterloo.ca/jmai/", img: jmai},
    {name: "Jimmy Lin", website: "https://cs.uwaterloo.ca/~jimmylin/", img: jlin},
    {name: "Bhaleka Persaud"}, {name: "Martin Gauch", img: mgauch},
    {name: "Ethan Wang"}, {name: "Alex Weatherhead"},
    {name: "Bryan Tolson", website: "http://www.civil.uwaterloo.ca/btolson/", img: btolson},
    {name: "Homa Kheyrollah Pour", website: "https://uwaterloo.ca/ecohydrology/people-profiles/homa-kheyrollah-pour"},
];

let teamHtml = [];
for (let i = 0; i < team.length; i++) {
    let person = team[i];
    let avatar = person.img ?
        <Avatar alt={person.name} src={person.img} component={'h5'}/> :
        <Avatar component={'h5'}>{person.name[0]}</Avatar>

    teamHtml.push(
        <Grid item xs={6} md={4} className={"container"}>
            {person.website ?
                <a href={person.website} target="_blank" rel="noopener noreferrer" className={"row"}>
                    {avatar}
                    <div className={"row m-2"}>{person.name}</div>
                </a> :
                <div className={"row"}>
                    {avatar}
                    <div className={"row m-2"}>{person.name}</div>
                </div>
            }
        </Grid>
    );
}

export default class About extends Component {

    render() {
        return (
            <Modal className="Disclaimer" show={this.props.showAboutModal} onHide={this.props.onClose}>
                <Modal.Header closeButton>
                    <Modal.Title>About</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Card>
                        <CardContent>
                            <h5>Global Water Futures (GWF) Data Cuizinart</h5>
                            <p>
                                GWF aims to position Canada as a global leader in water science for cold regions and
                                will address the strategic needs of the Canadian economy in adapting to change and
                                managing risks of uncertain water futures and extreme events. The Cuizinart is a
                                cloud-based platform that provides an interactive portal for researchers to "slice and
                                dice" large NetCDF datasets across the GWF program and beyond. The platform provides an
                                easy-to-use interface similar to Google Maps: researchers select products and variables
                                of interest, provide geographical bounds, and after a short wait, are delivered a custom
                                dataset that meets their exact specifications.
                            </p>
                            <a href="mailto:gwf.cuizinart@uwaterloo.ca">gwf.cuizinart@uwaterloo.ca</a><br/>
                            <a className="ml-auto" href="https://gwf.usask.ca" target="_blank"
                               rel="noopener noreferrer">https://gwf.usask.ca</a>
                        </CardContent>
                    </Card>
                    <Card className={"mt-2 mb-2"}>
                        <CardContent>
                            <h5>Team Members</h5>
                            <div>
                                <Grid container>
                                    {teamHtml}
                                </Grid>
                            </div>
                        </CardContent>
                    </Card>
                </Modal.Body>
            </Modal>
        );
    }
}
