import React, {Component} from "react";
import {Modal} from "react-bootstrap";
import jmai from "../images/jmai.jpg";
import jlin from "../images/jlin.jpg";
import mgauch from "../images/mgauch.jpg";
import hkpour from "../images/hkpour.jpg";
import btolson from "../images/btolson.jpg";
import khuang from "../images/khuang.jpg";
import Avatar from "@material-ui/core/Avatar";
import Grid from "@material-ui/core/Grid";
import CardContent from "@material-ui/core/CardContent";
import Card from "@material-ui/core/Card";

const team = [{name: "Juliane Mai", website: "http://www.civil.uwaterloo.ca/jmai/", img: jmai},
    {name: "Jimmy Lin", website: "https://cs.uwaterloo.ca/~jimmylin/", img: jlin},
    {name: "Bhaleka Persaud"}, {name: "Martin Gauch", img: mgauch, website: "https://gauchm.github.io"},
    {name: "Ethan Wang"}, {name: "Alex Weatherhead"},
    {name: "Bryan Tolson", website: "http://www.civil.uwaterloo.ca/btolson/", img: btolson},
    {name: "Homa Kheyrollah Pour", website: "https://uwaterloo.ca/ecohydrology/people-profiles/homa-kheyrollah-pour", img: hkpour},
    {name: "Kaisong Huang", img: khuang}
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
                            <h5>The Canadian Surface Prediction Archive (CaSPAr)</h5>
                            <p>
                            CaSPAr provides easily accessible archives for a range of Environment and Climate Change Canada's operational numerical weather predictions for researchers and end-users. CaSPAr was formed by a partnership between the NSERC Canadian FloodNet, Environment and Climate Change Canada, Esri Canada and several Canadian universities such as the University of Waterloo and McMaster University.
                            </p>
                            <a href="mailto:caspar.data@uwaterloo.ca">caspar.data@uwaterloo.ca</a><br/>
                            <a className="ml-auto" href="http://www.caspar-data.ca" target="_blank"
                               rel="noopener noreferrer">http://www.caspar-data.ca</a>
                            <h5>Citation</h5>
                            <p>
                            Mai et al. (2019).<br/> The Canadian Surface Prediction Archive (CaSPAr): A Platform to Enhance Environmental Modeling in Canada and Globally.Bulletin of the American Meteorological Society, https://doi.org/10.1175/BAMS-D-19-0143.1.
                            </p>
                        </CardContent>
                    </Card>
                </Modal.Body>
            </Modal>
        );
    }
}
