import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import moment from 'moment';
import "./userInputComp.css";
import Card from "@material-ui/core/Card";
import Button from "@material-ui/core/Button";
import {CardContent, TextField} from "@material-ui/core";
import Select from 'react-select';
/*
    show date range picker, headers checkbox
 */

export default class UserInputComp extends Component {
    constructor(props) {
        super(props);
    }

    state = {
        selectedProduct: null
    };

    handleDateEvent(event, picker) {
        this.props.updateUserInputs({
            start_time: picker.startDate.format("YYYY-MM-DD"),
            end_time: picker.endDate.format("YYYY-MM-DD")
        });
    }

    handleSelectProduct = (selectedOption) => {
        this.setState({selectedProduct: selectedOption});
        this.props.updateDateSet({selectDateSet: selectedOption});
    };

    handleChange = (key, event) => {
        this.props.updateUserInputs({[key]: event.target.value});
    };

    handleInvalidDate = (date) => {
        if (this.state.selectedProduct) {
            if (moment(date).isBefore(this.state.selectedProduct.valid_start_time) || moment(date).isAfter(this.state.selectedProduct.valid_end_time)) {
                return true;
            }
        }
        return false;
    };

    render() {
        return (
            <Card className="m-0 p-0" style={{overflow: "visible"}}>
                <CardContent>
                    <form>
                        <div className={"row mb-2 pr-2"}>
                            <div className={"col-8"}>
                                <div className="form-group">
                                    <Select
                                        isClearable={true}
                                        id="product"
                                        value={this.state.selectedProduct}
                                        placeholder={"Choose product..."}
                                        onChange={this.handleSelectProduct}
                                        options={this.props.products}
                                        className={'select-product'}
                                    />
                                </div>
                            </div>
                            <div className={"ml-auto align-self-center"}>
                                <DateRangePicker
                                    startDate={this.state.selectedProduct ? moment(this.state.selectedProduct.valid_start_time).format("MM/DD/YYYY") : moment().format("MM/DD/YYYY")}
                                    isInvalidDate={(date) => this.handleInvalidDate(date)}
                                    showDropdowns onApply={(e, picker) => this.handleDateEvent(e, picker)}>
                                    <Button variant="contained" size="small" color="primary">Select Date</Button>
                                </DateRangePicker>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

        );
    }
}

