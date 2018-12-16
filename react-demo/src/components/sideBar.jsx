import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import shortid from 'shortid';
/*
    show date range picker, headers checkbox
 */

class Setting {
    constructor(datasets){
        this.headers = datasets.map(d => {
            let header = {};
            header.id = d.id;
            d.headerAttributes.forEach(att => {
                header[att] = false;
            });
            return header;
        });
        this.selectDate = [];
    }
}

export default class SideBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            datasets: this.props.datasets,
            setting: new Setting(this.props.datasets)
        };
    }


    handleDateEvent(event, picker) {
        let newState = Object.assign({}, this.state);
        newState.setting.selectDate = [picker.startDate.format("YYYY-MM-DD"), picker.endDate.format("YYYY-MM-DD")];
        this.props.updateEvent(newState.setting);

    }

    handleCheckbox(setID,event){
        let newState = Object.assign({}, this.state);
        const target = event.target;
        let header = newState.setting.headers.find(function (h) {
           return h.id === setID;
        });
        header[target.value] = target.checked;
        this.props.updateEvent(newState.setting);
    }

    render() {
        return (
            <div>
                <DateRangePicker onApply={(e, picker) => this.handleDateEvent(e, picker)}>
                    <button className="btn btn-info m-2">Select Date</button>
                </DateRangePicker>
                {this.state.datasets.map(d =>
                    <div key={d.id} className="card m-2">
                        <div className="card-header" style={{backgroundColor: d.color}}>
                            {d.description}
                        </div>
                        <div className="card-body">
                            {
                                d.headerAttributes.map( item =>
                                   <div key={`div-${shortid.generate()}`} className="form-check">
                                        <label className="form-check-label">
                                            <input type="checkbox" className="form-check-input" onChange={(e) => this.handleCheckbox(d.id, e)} value={item}/>{item}
                                        </label>
                                    </div>
                                )
                            }

                        </div>
                    </div>
                )}
            </div>
        );
    }
}

