import React from 'react';
import WindowBorder from './WindowBorder';
import Icons from "./Icons";


const BaseWindow = ({ title, children }) => {
    return (
        <WindowBorder title={title}> {/* Pass the title to WindowBorder */}
            {children} {/* Render the window's children within the border */}
            <Icons />
        </WindowBorder>
    );
};

export default BaseWindow;
