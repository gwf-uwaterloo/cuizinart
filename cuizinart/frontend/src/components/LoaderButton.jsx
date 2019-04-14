import React from "react";
import {Button, Spinner} from "react-bootstrap";
import "./LoaderButton.css";

export default ({
        isLoading,
        text,
        loadingText,
        className = "",
        disabled = false,
        ...props
    }) =>
    <Button className={`LoaderButton ${className}`} disabled={disabled || isLoading} {...props}>
        {isLoading && <Spinner className="spinning" as="span" animation="border" size="sm" role="status"
                               aria-hidden="true"/>}
        {!isLoading ? text : loadingText}
    </Button>;
