import React from "react";
import Button from '@material-ui/core/Button';

export default function Tutorial() {
    return (<>
        <h2 class="text-center">Tutorial</h2>
        <div class="text-center"><p>Please select the <b>best</b> and the <b>worst</b> view by <b>drag</b> and <b>dropping</b> an image into the corresponding box.</p></div>
        <div style={{'margin': 'auto', 'width': '100%', 'padding': '10px', 'maxWidth': '800px', 'minWidth': '500px'}}>
        <img src="/tutorial.gif" alt="tutorial" style={{'width': 'inherit'}}/>
        </div>
        <div class="right">
        <Button id="start_button" variant="contained" color="primary" onClick={e=>window.location.href="/view_quality"} >Start</Button>
        </div>
        </>);
}