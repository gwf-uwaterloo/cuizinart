import React, {Component} from 'react';
import "./userInputComp.css";
import Select from 'react-select';
import {Button} from "@material-ui/core";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

/*
    show date range picker, headers checkbox
 */

export default class UserInputComp extends Component {
    state = {
        selectedProduct: null
    };


    handleSelectProduct = (selectedOption) => {
        this.setState({selectedProduct: selectedOption});
        this.props.updateDateSet({selectDateSet: selectedOption});
    };

    handleChange = (key, event) => {
        this.props.updateUserInputs({[key]: event.target.value});
    };

    render() {
        return (
            <form>
                <div>
                    <Select
                        isClearable={true}
                        id="product"
                        value={this.state.selectedProduct}
                        placeholder={"Choose product..."}
                        onChange={this.handleSelectProduct}
                        options={this.props.products}
                        className={'select-product'}
                    />
                    {(this.state.selectedProduct != null && this.state.selectedProduct.doi != null) ?
                        <div className={"row justify-content-end m-0"}>
                            <Button size="small" href={this.state.selectedProduct.doi} target="_blank">
                                View Metadata <OpenInNewIcon style={{height: "18px"}} className={"ml-1"}/>
                            </Button>
                        </div> : <div className={"mb-2"}></div>}
                </div>
            </form>


        );
    }
}

