import shortid from 'shortid';
import {Component} from "react";
import React from "react";
import _ from 'lodash';
export default class SideBar extends Component {
    constructor(props) {
        super(props);
    }

    handleCheckbox(key,event){
        let curr = _.assign({}, this.props.selectDateSet);
        let variable = curr.vars.find(function (v) {
            return v.key === key;
        });
        const target = event.target;

        variable["selected"] = target.checked;
        this.props.updateDateSet({selectDateSet: curr});
    }

    render() {
        let d = this.props.selectDateSet;
        return (
            <div>
                {
                    d ?
                    <div key={d.id} className="card mt-2">
                        <div className="card-header" style={{backgroundColor: d.color}}>
                            {d.value}
                        </div>
                        <div className="card-body">
                            {
                                d.vars.map( va =>
                                    <div key={`div-${shortid.generate()}`} className="form-check">
                                        <label className="form-check-label">
                                            <input type="checkbox" className="form-check-input" checked={va.selected} onChange={(e) => this.handleCheckbox(va.key, e)}/>{va["key"]}: {va["description"]}
                                        </label>
                                    </div>
                                )
                            }

                        </div>
                    </div>
                    : <div></div>
                }
            </div>
        );
    }
}