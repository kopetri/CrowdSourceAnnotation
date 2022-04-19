import React, { useState, useEffect } from "react";
import { Redirect } from "react-router-dom";
import Button from '@material-ui/core/Button';

export default function Finish() {
    const [data, setData] = useState();
    const [mturkId, setMturkId] = useState("generating MTurk key...");
    const outFunc = () => {
        var tooltip = document.getElementById("myTooltip");
        tooltip.innerHTML = "Copy to clipboard";
      }
    const copyClipboard = () => {      
      var copyText = document.getElementById("mturkKey");
      copyText.select();
      copyText.setSelectionRange(0, 99999); /* For mobile devices */
      document.execCommand("copy");
      var tooltip = document.getElementById("myTooltip");
      tooltip.innerHTML = "Copied Key to clipboard. ";
    }
    useEffect(()=>{fetch("/api/user_id").then(result=>result.json()).then((data)=>{
      setData(data);
    })}, []);
    useEffect(()=>{
        if (!data) return
        fetch("/api/user/finished/"+data["user_id"]).then(response=>response.json()).then(result=>setMturkId(result["mturkId"]))
    },[data])
    if (!data) return <>Loading page...</>
    if (!data["started"] && data["isDone"]) return <Redirect to={"/"} />
    if (!data["started"]) return <Redirect to={"/"} />
    if (!data["isDone"]) return <Redirect to={"/correlation"} />
    return (
        <div class="center">
            <h1 class="text-center">Finished!</h1>
            <p class="text-center">Thank you for participating.</p>
            <p class="text-center">Your Amazon MTurk key</p>
            <h2 class="text-center">
            <input type="text" value={mturkId} id="mturkKey" style={{width:'300px'}}/> 
            <div class="tooltip">
            <Button id="keybutton" variant="contained" color="primary" onClick={copyClipboard} onMouseOut={outFunc}>
                <span class="tooltiptext" id="myTooltip">Copy to clipboard</span>
            Copy to clipboard.
            </Button>
            </div>
            </h2>
        </div>
    )
  }