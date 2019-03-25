import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import Select from 'react-select';
import moment from 'moment';
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
        this.props.updateUserInputs({start_time: picker.startDate.format("YYYY-MM-DD"), end_time: picker.endDate.format("YYYY-MM-DD")});
    }

    handleSelectProduct = (selectedOption) => {
        this.setState({selectedProduct: selectedOption});
        this.props.updateDateSet({selectDateSet: selectedOption});
    };

    handleChange = (key, event) => {
        this.props.updateUserInputs({[key]: event.target.value});
    };

    handleInvalidDate = (date) => {
        if(this.state.selectedProduct){
            if (moment(date).isBefore(this.state.selectedProduct.valid_start_time) || moment(date).isAfter(this.state.selectedProduct.valid_end_time)) {
                return true;
            }
        }
        return false;
    };

    render() {
        return (
            <div>
                <form className="row">
                    <div className="form-group col-lg-4">
                        <label htmlFor="product">Select a Product</label>
                        <Select
                            id="product"
                            value={this.state.selectedProduct}
                            placeholder={"Choose product..."}
                            onChange={this.handleSelectProduct}
                            options={this.props.products}
                        />
                    </div>
                    <div className="form-group col-lg-4">
                        <label htmlFor="userEmail">Email</label>
                        <input type="email" className="form-control" id="userEmail" aria-describedby="emailHelp"
                               placeholder="Enter email"  onChange={this.handleChange.bind(this, "user_email")}/>
                    </div>
                    <div className="form-group col-lg-4">
                        <label htmlFor="userId">Globus ID</label>
                        <input type="text" className="form-control" id="userId"
                               placeholder="Enter Globus ID"  onChange={this.handleChange.bind(this, "globus_id")}/>
                    </div>
                </form>
                <DateRangePicker  startDate={this.state.selectedProduct? moment(this.state.selectedProduct.valid_start_time).format("MM/DD/YYYY") : moment().format("MM/DD/YYYY")}
                                 isInvalidDate={(date) => this.handleInvalidDate(date)}
                                 showDropdowns onApply={(e, picker) => this.handleDateEvent(e, picker)}>
                    <button className="btn btn-info ">Select Date</button>
                </DateRangePicker>
            </div>

        );
    }
}

