import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
/*
    show date range picker, headers checkbox
 */
export default class Banner extends Component {
    render() {
        return (
            <div>
                <DateRangePicker startDate="1/1/2014" endDate="3/1/2014">
                    <button>Click Me To Open Picker!</button>
                </DateRangePicker>
            </div>
        );
    }
}

