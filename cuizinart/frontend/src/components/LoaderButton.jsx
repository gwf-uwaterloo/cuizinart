import React from "react";
import "./LoaderButton.css";
import Button from "@material-ui/core/Button";
import {CircularProgress} from "@material-ui/core";

export default ({
        isLoading,
        text,
        loadingText,
        className = "",
        disabled = false,
        ...props
    }) =>
    <Button className={`LoaderButton ${className}`} variant="contained"
            color="primary"
            disabled={disabled || isLoading} {...props}>
        {isLoading && <CircularProgress className={"spinning"} as="span" animation="border" size={24}/>}
        {!isLoading ? text : loadingText}
    </Button>;
