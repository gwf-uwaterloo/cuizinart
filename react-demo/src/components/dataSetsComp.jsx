import shortid from 'shortid';
import {Component} from "react";
import React from "react";
export default class SideBar extends Component {
    constructor(props) {
        super(props);
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
        this.props.updateDateSets({datasets: datasets});
    }

    render() {
        return (
            <div>
                {this.props.datasets.map(d =>
                    <div key={d.id} className="card mt-2">
                        <div className="card-header" style={{backgroundColor: d.color}}>
                            {d.description}
                        </div>
                        <div className="card-body">
                            {
                                d.variables.map( va =>
                                    <div key={`div-${shortid.generate()}`} className="form-check">
                                        <label className="form-check-label">
                                            <input type="checkbox" className="form-check-input" checked={va.selected} onChange={(e) => this.handleCheckbox(d.id, va.key, e)}/>{va["key"]}: {va["description"]}
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