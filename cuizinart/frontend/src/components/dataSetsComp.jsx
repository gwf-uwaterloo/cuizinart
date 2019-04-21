import shortid from 'shortid';
import {Component} from "react";
import React from "react";
import _ from 'lodash';
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import {Checkbox, FormGroup} from "@material-ui/core";
import FormControlLabel from "@material-ui/core/FormControlLabel";

export default class SideBar extends Component {
    constructor(props) {
        super(props);
    }

    handleCheckbox(property, key,event){
        let curr = _.assign({}, this.props.selectDateSet);
        let variable = curr[property].find(function (v) {
            return v.key === key;
        });
        const target = event.target;

        variable["selected"] = target.checked;
        this.props.updateDateSet({selectDateSet: curr});
    }

    render() {
        let d = this.props.selectDateSet;
        return (
            <Card className="row m-0 mt-2 mb-2">
                {
                    d ?
                    <div key={d.id} className="mt-2 scroll">
                        <CardContent>
                            <h5><span className="label label-default">Variables: </span></h5>
                            <FormGroup key={`div-${shortid.generate()}`}>
                                {d.vars.map( va =>
                                        <FormControlLabel control={
                                            <Checkbox checked={va.selected} onChange={(e) => this.handleCheckbox('vars', va.key, e)}/>
                                            } label={va["key"] + ": " + va["description"]}/>
                                )}
                            </FormGroup>
                            <h5 className="mt-3"><span className="label label-default">Forecast Windows: </span></h5>
                            <FormGroup key={`div-${shortid.generate()}`} row={true}>
                                {d.horizons.map( va =>
                                        <FormControlLabel control={
                                            <Checkbox checked={va.selected}
                                                      onChange={(e) => this.handleCheckbox('horizons', va.key, e)}/>
                                        } label={va["description"]}/>

                                )}
                            </FormGroup>
                            <h5 className="mt-3"><span className="label label-default">Forecast Issues: </span></h5>
                                <FormGroup key={`div-${shortid.generate()}`} row={true}>
                                    {d.issues.map( va =>
                                        <FormControlLabel control={
                                            <Checkbox checked={va.selected} onChange={(e) => this.handleCheckbox('issues', va.key, e)}/>
                                        } label={va["description"]}/>
                                    )}
                                </FormGroup>
                        </CardContent>
                    </div>
                    : <div></div>
                }
            </Card>
        );
    }
}