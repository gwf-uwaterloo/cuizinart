import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import Select from 'react-select';
/*
    show date range picker, headers checkbox
 */
const products = [
    { value: 'ctl-wrf-wca', label: 'ctl-wrf-wca' },
    { value: 'pgw-wrf-wca', label: 'pgw-wrf-wca' },
    { value: 'ctl-wrf-conus', label: 'ctl-wrf-conus' },
    { value: 'pgw-wrf-conus', label: 'pgw-wrf-conus' }
];
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
        this.props.updateUserInputs({product: selectedOption.value});
    };

    handleChange = (key, event) => {
        this.props.updateUserInputs({[key]: event.target.value});
    };

    render() {
        return (
            <div>
                <form className="row">
                    <div className="form-group col-lg-3">
                        <label htmlFor="product">Select a Product</label>
                        <Select
                            id="product"
                            value={this.state.selectedProduct}
                            placeholder={"Choose product..."}
                            onChange={this.handleSelectProduct}
                            options={products}
                        />
                    </div>
                    <div className="form-group col-lg-3">
                        <label htmlFor="userEmail">Email</label>
                        <input type="email" className="form-control" id="userEmail" aria-describedby="emailHelp"
                               placeholder="Enter email"  onChange={this.handleChange.bind(this, "user_email")}/>
                    </div>
                    <div className="form-group col-lg-3">
                        <label htmlFor="userId">User ID</label>
                        <input type="text" className="form-control" id="userId"
                               placeholder="Enter User ID"  onChange={this.handleChange.bind(this, "user_id")}/>
                    </div>
                    <div className="form-group col-lg-3">
                        <label htmlFor="requestId">Request ID</label>
                        <input type="text" className="form-control" id="requestId"
                               placeholder="Enter Request ID"  onChange={this.handleChange.bind(this, "request_id")}/>
                    </div>
                </form>
                <DateRangePicker showDropdowns onApply={(e, picker) => this.handleDateEvent(e, picker)}>
                    <button className="btn btn-info ">Select Date</button>
                </DateRangePicker>
            </div>

        );
    }
}

