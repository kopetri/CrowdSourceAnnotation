import React, { useState, useEffect, useRef } from "react";
import { Redirect } from "react-router-dom";
import Button from '@material-ui/core/Button';
import {ClusterSelection, ClusterCounting} from "./ClusterTask";

export default function ClusterEstimation(props) {
  document.body.style.overflow = 'hidden';
  document.querySelector('html').scrollTop = window.scrollY;
  const [data, setData] = useState();
  const [name, setName] = useState();
  const [active, setActive] = useState(false);
  const [ended, setEnded] = useState(false);
  const [userdata, setUserData] = useState([]);
  const [state, clearState] = useState([]);
  const DIMENSIONS = 550;
  
  useEffect(()=>{
      fetch('/api/user_id').then(result=>result.json()).then((data)=>{
          setData(data);
      });
  },[])

  useEffect(()=>{
    if (userdata.length > 0)
        setActive(true)
    else
        setActive(false);
  },[userdata])

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
    payload["annotation"] = userdata;
    payload["canvas_dims"] = DIMENSIONS;
    fetch('/api/submit/' + data["user_id"] + "/" + data["batch"][0]["name"], {
      method: 'post',
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    }).then(response=>response.json()).then((result)=>{
        if (result["success"]) {
          clearState([]);
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

  const button = () =>{
    if (active) {
      return <Button id="confirm_button" variant="contained" color="primary" onClick={submitData} style={{width:'100%'}}>Submit</Button>
    } else {
      return <Button id="confirm_button" variant="contained" color="primary" disabled onClick={submitData} style={{width:'100%'}}>Submit</Button>
    }
  }

  const get_task = () => {
      if (props.selection) {
        return <ClusterSelection annotation={state} src={"/api/image/"+name} width={DIMENSIONS} height={DIMENSIONS} onChange={setUserData}>
          <div style={{margin: '0 auto', width:'100px'}}>
          {button()}
          </div>
        </ClusterSelection>
      }
      if (props.counting) {
        return <ClusterCounting annotation={state} src={"/api/image/"+name} width={DIMENSIONS} height={DIMENSIONS} onChange={setUserData} />
      }
      return <></>
  }

  const get_text = () => {
    if (props.selection) {
        return <p>Please <b>mark the center of each cluster</b> by clicking at the corresponding area. You can <b>remove</b> a marker by clicking at it once.</p>
    }
    if (props.counting) {
      return <p>Please use the dropdown menu to select a number.</p>
    }
    return <></>
    }

  if (ended)  return <>This study has ended.</>
  if (!data) return <>Loading page...</>
  //if (!data["started"]) return <Redirect to={"/"} />
  if (data["isDone"])  return <Redirect to={"/finished"} />
  if (!name) return <>Loading page...</>
  return (<>
  <div> 
    <div class="center" style={{width: "100%"}}>Remaining tasks: {data["batch"].length}</div>
    <div class="text-center">
    <h3>Cluster Estimation</h3>
    </div>
    <div class="text-center">
    <p>Your task is to <b>estimate</b> the <b>number of clusters</b> by looking at the following scatter plot.</p>
    </div>
    <div class="text-center">
    {get_text()}
    </div>
    </div>
    {get_task()}
  </>);
}