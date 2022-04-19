import React, { useState, useEffect } from "react";
import { Redirect } from "react-router-dom";
import TrendLine from "./TrendLine";
import Button from '@material-ui/core/Button';

export default function Task() {
  document.body.style.overflow = 'hidden';
  document.querySelector('html').scrollTop = window.scrollY;
  const [data, setData] = useState();
  const [name, setName] = useState();
  const [active, setActive] = useState(false);
  const [slope, setSlope] = useState();
  const [ended, setEnded] = useState(false);
  
  useEffect(()=>{
      fetch('/api/user_id').then(result=>result.json()).then((data)=>{
          setData(data);
      });
  },[])

  useEffect(()=>{
      if (!data) return
      if (data["isDone"]) return
      if (data["batch"].length > 0) {
          let task = data["batch"][0];
        if (task["name"] === "out_of_data") {
          setEnded(true);
        } else {
          setName(task["name"])
        }
      } else {
          data["isDone"] = true;
          setData(currentData => ({data, ...currentData}));
      }
  },[data])

  const submitData=()=>{
    setActive(false);
    let payload = data["batch"][0]
    payload["slope"] = slope;
    fetch('/api/submit/' + data["user_id"] + "/" + data["batch"][0]["name"], {
      method: 'post',
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    }).then(response=>response.json()).then((result)=>{
        if (result["success"]) {
          data["batch"].shift();
          setData(currentData => ({data, ...currentData}));
        } else {
          console.log("Failed to submit data!");
        }
    }).catch(error=>{
      console.error(error);
      window.location.href="/"
    })
  }

  const button = (a) =>{
    if (a) {
      return <Button id="confirm_button" variant="contained" color="primary" onClick={submitData} style={{width:'100%'}}>Submit</Button>
    } else {
      return <Button id="confirm_button" variant="contained" color="primary" disabled onClick={submitData} style={{width:'100%'}}>Submit</Button>
    }
  }

  const activateButton = (slope) => {
    setActive(true);
    setSlope(slope);
  }
  
  if (ended)  return <>This study has ended.</>
  if (!data) return <>Loading page...</>
  if (!data["started"]) return <Redirect to={"/"} />
  if (data["isDone"])  return <Redirect to={"/finished"} />
  if (!name) return <>Loading page...</>
  return (<>
  <div> 
    <div class="center" style={{width: "100%"}}>Remaining tasks: {data["batch"].length}</div>
    <div class="text-center">
    <h3>Correlation Estimation</h3>
    </div>
    <div class="text-center">
    <p>Your task is to <b>estimate</b> a <b>slope</b> looking at the following scatter plot. Please use the slider to adjust the slope of the line accordingly.</p>
    </div>
    </div>
    <TrendLine src={"/api/image/"+name} start_value={0} width={700} height={700} size={1500} onNewSlope={activateButton}/> 
    <div style={{margin: '0 auto', width:'100px'}}>
    {button(active)}
    </div>
  </>);
}