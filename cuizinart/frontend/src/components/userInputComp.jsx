import React, {Component} from 'react';
import "./userInputComp.css";
import Select from 'react-select';
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
                <div className={"mb-2 pr-2"}>
                    <Select
                        isClearable={true}
                        id="product"
                        value={this.state.selectedProduct}
                        placeholder={"Choose product..."}
                        onChange={this.handleSelectProduct}
                        options={this.props.products}
                        className={'select-product'}
                    />
                </div>
            </form>


        );
    }
}

