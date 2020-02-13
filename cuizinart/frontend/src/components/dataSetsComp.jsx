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
import Select from "react-select";


export default class SideBar extends Component {
    state = {
        startDate: null,
        endDate: null,
        varInputValue: "",
        menuIsOpen: undefined,
        variables: []
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
        let utcDate = moment.utc(date.valueOf() + date.utcOffset() * 60000);  // Ignore local timezone
        this.props.updateUserInputs({
            start_time: utcDate.format("YYYY-MM-DD")
        });
        this.setState({startDate: utcDate});
    }

    updateEndDate(date) {
        let utcDate = moment.utc(date.valueOf() + date.utcOffset() * 60000);  // Ignore local timezone
        this.props.updateUserInputs({
            end_time: utcDate.format("YYYY-MM-DD")
        });
        this.setState({endDate: utcDate});
    }

    handleInvalidDate = (date) => {
        let utcDate = moment.utc(date.valueOf() + date.utcOffset() * 60000);  // Ignore local timezone
        if (this.props.selectDateSet) {
            if (utcDate.valueOf() < moment.utc(this.props.selectDateSet.valid_start_time).valueOf() ||
                utcDate.valueOf() > moment.utc(this.props.selectDateSet.valid_end_time).valueOf()) {
                return true;
            }
        }
        return false;
    };

    onInputChange = (inputValue, {action}) => {
        switch (action) {
            case 'input-change':
                this.setState({varInputValue: inputValue});
                return;
            case 'menu-close':
                let menuIsOpen = undefined;
                if (this.state.varInputValue) {
                    menuIsOpen = true;
                }
                this.setState({menuIsOpen: menuIsOpen});
                return;
            default:
                return;
        }
    };

    onVarChange = (selectedVars, {action}) => {
        this.setState({variables: selectedVars});

        let selectedKeys = selectedVars.map((v) => v.value);
        let curr = _.assign({}, this.props.selectDateSet);
        for (let i = 0; i < curr.vars.length; i++) {
            curr["vars"][i]["selected"] = selectedKeys.includes(curr["vars"][i].key);
        }
        this.props.updateDateSet({selectDateSet: curr});
    };

    render() {
        let d = this.props.selectDateSet;
        return (
            <div className="row m-0 mb-2">
                {d ?
                    <div key={d.id} className="col p-0 mt-2">
                        <div className={"row m-0 mb-3"}>
                            <h5 className={"col-fluid p-0"}><span className="label label-default">Date Range:</span></h5>
                            <small className={"col-fluid p-0 ml-auto align-self-center"}>
                                ({moment.utc(d.valid_start_time).format("YYYY/MM/DD")} &ndash; {moment.utc(d.valid_end_time).format("YYYY/MM/DD")})
                            </small>
                        </div>
                        <MuiPickersUtilsProvider utils={MomentUtils}>
                            <div className={"row m-0"}>
                                <div className={"col pr-1 pl-0"}>
                                    <InlineDatePicker keyboard
                                        label="Start date"
                                        initialFocusedDate={moment.utc(d.valid_start_time).format("YYYY-MM-DD")}
                                        value={this.state.startDate}
                                        onChange={(date) => this.updateStartDate(date)}
                                        variant="outlined"
                                        shouldDisableDate={(date) => this.handleInvalidDate(date)}
                                        format={"YYYY-MM-DD"}
                                        minDate={moment(d.valid_start_time).format("YYYY-MM-DD")}
                                        maxDate={moment(d.valid_end_time).format("YYYY-MM-DD")}
                                        mask={[/\d/, /\d/, /\d/, /\d/, "-", /\d/, /\d/, "-", /\d/, /\d/]}
                                    />
                                </div>
                                <div className={"col pl-1 pr-0"}>
                                    <InlineDatePicker keyboard
                                        label="End date"
                                        initialFocusedDate={moment.utc(d.valid_start_time).format("YYYY-MM-DD")}
                                        value={this.state.endDate}
                                        onChange={(date) => this.updateEndDate(date)}
                                        variant="outlined"
                                        shouldDisableDate={(date) => this.handleInvalidDate(date)}
                                        minDate={moment(d.valid_start_time).format("YYYY-MM-DD")}
                                        maxDate={moment(d.valid_end_time).format("YYYY-MM-DD")}
                                        format={"YYYY-MM-DD"}
                                        mask={[/\d/, /\d/, /\d/, /\d/, "-", /\d/, /\d/, "-", /\d/, /\d/]}
                                    />
                                </div>
                            </div>
                        </MuiPickersUtilsProvider>

                        <h5 className={"mt-3"}><span className="label label-default">Variables: </span></h5>
                        <Select className={"mb-3"}
                                isMulti isClearable isSearchable
                                inputValue={this.state.varInputValue}
                                onInputChange={this.onInputChange}
                                value={this.state.vars}
                                onChange={this.onVarChange}
                                name="variables"
                                placeholder={"Select variables..."}
                                options={d.vars.map((v) => {
                                    return {value: v.key, label: v.key + ": " + v.description};
                                })}
                                hideSelectedOptions={false}
                                menuIsOpen={this.state.menuIsOpen}
                        />
                        {(d.horizons.length > 0) ?
                            <div>
                                <h5 className={"mb-0"}><span className="label label-default">Forecast Windows: </span>
                                </h5>
                                < FormGroup row={true}>
                                    {d.horizons
                                    .sort((a, b) => a.description- b.description)
                                    .map(va =>
                                        <FormControlLabel key={`div-${shortid.generate()}`} control={
                                            <Checkbox checked={va.selected} className={"pr-1"}
                                                      onChange={(e) => this.handleCheckbox('horizons', va.key, e)}/>
                                        } label={va["description"]}/>
                                    )}
                                </FormGroup>
                            </div> : <div></div>
                        }
                        {(d.issues.length > 0) ?
                            <div>
                                <h5 className={"mb-0"}><span className="label label-default">Forecast Issues: </span>
                                </h5>
                                <FormGroup row={true}>
                                    {d.issues
                                    .sort((a, b) => new Date('1970/01/01 ' + a.description) - new Date('1970/01/01 ' + b.description))
                                    .map(va =>
                                        <FormControlLabel key={`div-${shortid.generate()}`} control={
                                            <Checkbox checked={va.selected} className={"pr-1"}
                                                      onChange={(e) => this.handleCheckbox('issues', va.key, e)}/>
                                        } label={va["description"]}/>
                                    )}
                                </FormGroup>
                            </div> : <div></div>
                        }
                    </div> : <div></div>
                }
            </div>
        );
    }
}