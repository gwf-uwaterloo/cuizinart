import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
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
        this.props.updateUserInputs({start_time: picker.startDate.format("YYYY-MM-DD"), end_time: picker.endDate.format("YYYY-MM-DD")});
    }

    handleSelectProduct = (selectedOption) => {
        this.setState({selectedProduct: selectedOption});
        this.props.updateDateSet({selectDateSet: selectedOption});
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
                            options={this.props.products}
                        />
                    </div>
                </form>
                <DateRangePicker showDropdowns onApply={(e, picker) => this.handleDateEvent(e, picker)}>
                    <button className="btn btn-info ">Select Date</button>
                </DateRangePicker>
            </div>

        );
    }
}

