import React, {Component} from 'react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import shortid from 'shortid';
/*
    show date range picker, headers checkbox
 */

export default class SideBar extends Component {
    handleDateEvent(event, picker) {
        let newSetting = Object.assign({}, this.props.setting);
        newSetting.select_date = [picker.startDate.format("YYYY-MM-DD"), picker.endDate.format("YYYY-MM-DD")];
        this.props.updateEvent({setting: newSetting});

    }

    handleCheckbox(setId,key,event){
        let datasets = this.props.datasets.slice();
        let ds = datasets.find(function (s) {
            return s.id === setId;
        });
        let variable = ds.variables.find(function (v) {
            return v.key === key;
        });
        const target = event.target;

        variable["selected"] = target.checked;
        this.props.updateEvent({datasets: datasets});
    }

    render() {
        return (
            <div>
                <DateRangePicker showDropdowns onApply={(e, picker) => this.handleDateEvent(e, picker)}>
                    <button className="btn btn-info m-2">Select Date</button>
                </DateRangePicker>
                {this.props.datasets.map(d =>
                    <div key={d.id} className="card m-2">
                        <div className="card-header" style={{backgroundColor: d.color}}>
                            {d.description}
                        </div>
                        <div className="card-body">
                            {
                                d.variables.map( va =>
                                    <div key={`div-${shortid.generate()}`} className="form-check">
                                        <label className="form-check-label">
                                            <input type="checkbox" className="form-check-input" checked={va.selected} onChange={(e) => this.handleCheckbox(d.id, va.key, e)}/>{va["description"]}
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

