import React from "react";
import Button from '@material-ui/core/Button';

export default function Error() {
    return (<>
        <h2 class="text-center">Oops!</h2>
        <p class="text-center">Some error occured :(</p>
        
        <div class="center">
            <p class="text-center">If you keep getting this error please contact: sebastian.hartwig@uni-ulm.de</p>
            <p class="text-center">You can continue your task by clicking the resume button.</p>
            <p class="text-center">We are sorry for the inconvenience.</p>
        </div>    
        <div class="right">
        <Button id="resume_button" variant="contained" color="primary" onClick={() => {window.location.href="/"}} >Resume</Button>
        </div>
        </>);
}