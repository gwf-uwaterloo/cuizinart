import shortid from 'shortid';
import {Component} from "react";
import React from "react";
import _ from 'lodash';
import {InlineDatePicker} from "material-ui-pickers";
import {Checkbox, FormGroup} from "@material-ui/core";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import moment from 'moment';
import {MuiPickersUtilsProvider} from "material-ui-pickers";
import MomentUtils from "@date-io/moment";


export default class SideBar extends Component {
    state = {
        startDate: null,
        endDate: null
    };

    handleCheckbox(property, key, event) {
        let curr = _.assign({}, this.props.selectDateSet);
        let variable = curr[property].find(function (v) {
            return v.key === key;
        });
        const target = event.target;

        variable["selected"] = target.checked;
        this.props.updateDateSet({selectDateSet: curr});
    }

    updateStartDate(date) {
        this.props.updateUserInputs({
            start_time: date.format("YYYY-MM-DD")
        });
        this.setState({startDate: date});
    }

    updateEndDate(date) {
        this.props.updateUserInputs({
            end_time: date.format("YYYY-MM-DD")
        });
        this.setState({endDate: date});
    }

    handleInvalidDate = (date) => {
        if (this.props.selectDateSet) {
            if (date.isBefore(this.props.selectDateSet.valid_start_time) || date.isAfter(this.props.selectDateSet.valid_end_time)) {
                return true;
            }
        }
        return false;
    };

    render() {
        let d = this.props.selectDateSet;
        return (
            <div className="row m-0 mt-2 mb-2">
                {
                    d ?
                        <div key={d.id} className="mt-2">
                            <h5 className={"mb-3"}><span className="label label-default">Date Range:</span></h5>
                            <MuiPickersUtilsProvider utils={MomentUtils}>
                                <div className={"row m-0"}>
                                    <div className={"col pr-1"}>
                                        <InlineDatePicker
                                            emptyLabel={"Start date"}
                                            label="Start date"
                                            initialFocusedDate={moment(d.valid_start_time).format("YYYY-MM-DD")}
                                            value={this.state.startDate}
                                            onChange={(date) => this.updateStartDate(date)}
                                            variant="outlined"
                                            shouldDisableDate={(date) => this.handleInvalidDate(date)}
                                            format={"YYYY-MM-DD"}
                                        />
                                    </div>
                                    <div className={"col pl-1"}>
                                        <InlineDatePicker
                                            emptyLabel={"End date"}
                                            label="End date"
                                            initialFocusedDate={moment(d.valid_end_time).format("YYYY-MM-DD")}
                                            value={this.state.endDate}
                                            onChange={(date) => this.updateEndDate(date)}
                                            variant="outlined"
                                            shouldDisableDate={(date) => this.handleInvalidDate(date)}
                                            format={"YYYY-MM-DD"}
                                        />
                                    </div>
                                </div>
                            </MuiPickersUtilsProvider>

                            <h5 className={"mt-3"}><span className="label label-default">Variables: </span></h5>
                            <FormGroup key={`div-${shortid.generate()}`}>
                                {d.vars.map(va =>
                                    <FormControlLabel key={`div-${shortid.generate()}`} control={
                                        <Checkbox checked={va.selected}
                                                  onChange={(e) => this.handleCheckbox('vars', va.key, e)}/>
                                    } label={va["key"] + ": " + va["description"]}/>
                                )}
                            </FormGroup>
                            <h5 className="mt-3"><span className="label label-default">Forecast Windows: </span></h5>
                            <FormGroup row={true}>
                                {d.horizons.map(va =>
                                    <FormControlLabel key={`div-${shortid.generate()}`} control={
                                        <Checkbox checked={va.selected}
                                                  onChange={(e) => this.handleCheckbox('horizons', va.key, e)}/>
                                    } label={va["description"]}/>
                                )}
                            </FormGroup>
                            <h5 className="mt-3"><span className="label label-default">Forecast Issues: </span></h5>
                            <FormGroup row={true}>
                                {d.issues.map(va =>
                                    <FormControlLabel key={`div-${shortid.generate()}`} control={
                                        <Checkbox checked={va.selected}
                                                  onChange={(e) => this.handleCheckbox('issues', va.key, e)}/>
                                    } label={va["description"]}/>
                                )}
                            </FormGroup>

                        </div>
                        : <div></div>
                }
            </div>
        );
    }
}