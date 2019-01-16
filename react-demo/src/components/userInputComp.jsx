import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
/*
    show date range picker, headers checkbox
 */

export default class UserInputComp extends Component {
    constructor(props) {
        super(props);
    }

    handleDateEvent(event, picker) {
        this.props.updateUserInputs({start_time: picker.startDate.format("YYYY-MM-DD"), end_time: picker.endDate.format("YYYY-MM-DD")});
    }

    render() {
        return (
            <div>
                <DateRangePicker showDropdowns onApply={(e, picker) => this.handleDateEvent(e, picker)}>
                    <button className="btn btn-info">Select Date</button>
                </DateRangePicker>
            </div>
        );
    }
}

