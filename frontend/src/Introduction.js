import React, { useState, useEffect, useRef } from "react";
import Button from '@material-ui/core/Button';
import TrendLine from "./TrendLine";

function TutorialText() {
    return <>
    <div class="text-center">
      <p>Your task is to <b>estimate</b> a <b>slope</b> looking at the following scatter plot. Please use the slider to adjust the slope of the line accordingly.</p>
      </div>
      <div class="text-center">
      <p>For this tutorial the line turns <b>green</b> if your selected slope is <b>correct</b>.</p>
      </div>
    </>
}

function Slide1() {
    const line = useRef();
    const [correct, setCorrect] = useState(false);
    const [ended, setEnded] = useState(false);
    useEffect(()=>{
        fetch('/api/user_id').then(result=>result.json()).then((data)=>{
            if (data["batch"].length > 0) {
                let task = data["batch"][0];
                if (task["name"] === "out_of_data") {
                    setEnded(true);
                }
            }
        });
    },[])
    const evaluate = (isCorrect) => {
        setCorrect(isCorrect);
    }
    const button = (disabled) => {
        if (!disabled) {
            return <Button style={{float:'right'}} id="next_button" variant="contained" color="primary" onClick={e=>window.location.href="/tutorial1"} >Next</Button>
        }
        else {
            return <Button style={{float:'right'}} id="next_button" disabled variant="contained" color="primary" onClick={e=>window.location.href="/tutorial1"} >Next</Button>
        }
    }
    if (ended)  return <>This study has ended.</>
    return <>
    <div> 
      <div class="text-center">
      <h3>Tutorial (1/3)</h3>
      </div>
      {TutorialText()}
      </div>
      <TrendLine ref={line} src="slope0.5.jpg" start_value={0.5} width={700} height={700} size={1000} ground_truth={0.5} onResult={evaluate}/>
      <div style={{margin: '0 auto', width:'100px'}}>
      {button(!correct)}
      </div>
    </>
}

function Slide2() {
    const [correct, setCorrect] = useState(false);
    const evaluate = (isCorrect) => {
        setCorrect(isCorrect);
    }
    const button = (disabled) => {
        if (!disabled) {
            return <Button style={{float:'right'}} id="back_button" variant="contained" color="primary" onClick={e=>window.location.href="/tutorial2"} >Next</Button>
        }
        else {
            return <Button style={{float:'right'}} id="back_button" disabled variant="contained" color="primary" onClick={e=>window.location.href="/tutorial2"} >Next</Button>
        }
    }
    return <>
    <div> 
      <div class="text-center">
      <h3>Tutorial (2/3)</h3>
      </div>
      {TutorialText()}
      </div>
      <TrendLine src="slope-1.jpg" start_value={-1} width={700} height={700} size={1000} ground_truth={-1} onResult={evaluate}/>
      <div class="right">
      {button(!correct)}
      <Button style={{float:'left'}} id="back_button" variant="contained" color="primary" onClick={e=>window.location.href="/tutorial0"} >Back</Button>
      </div>
    </>
}

function Slide3() {
    const [correct, setCorrect] = useState(false);
    const evaluate = (isCorrect) => {
        setCorrect(isCorrect);
    }
    const button = (disabled) => {
        if (!disabled) {
            return <Button style={{float:'right'}} id="next_button" variant="contained" color="primary" onClick={e=>window.location.href="/tutorial3"} >Next</Button>
        }
        else {
            return <Button style={{float:'right'}} id="next_button" variant="contained" color="primary" disabled onClick={e=>window.location.href="/tutorial3"} >Next</Button>
        }
    }
    return <>
    <div> 
      <div class="text-center">
      <h3>Tutorial (3/3)</h3>
      </div>
      {TutorialText()}
      </div>
      <TrendLine src="slope0.3.jpg" start_value={0.3} width={700} height={700} size={1000} ground_truth={0.3} onResult={evaluate}/>
      <div class="right">
        {button(!correct)}
        <Button style={{float:'left'}} id="back_button" variant="contained" color="primary" onClick={e=>window.location.href="/tutorial1"} >Back</Button>
        </div>
    </>
}

function Slide4() {
    const [data, setData] = useState();
    useEffect(()=>{fetch("/api/user_id").then(result=>result.json()).then((data)=>{
        setData(data);
    })}, []);
    const button = (disabled) => {
        if (!disabled) {
            return <Button style={{float:'right'}} id="next_button" variant="contained" color="primary" onClick={e=>fetch("/api/user/"+data["user_id"]).then(() => {window.location.href="/correlation"})} >Start</Button>
        }
        else {
            return <Button style={{float:'right'}} id="next_button" variant="contained" color="primary" disabled >Start</Button>
        }
    }
    return (<>
        <div class="text-center">
            <h3>Tutorial complete!</h3>
        </div>
        <div class="text-center">
            <p>You have completed the tutorial and will continue with the main study.</p>
        </div>
        <div class="text-center">
            <p>During the study there will be <b>no indication</b> if your selection was correct.</p>
        </div>
        <div class="text-center">
            <p>You will be presented a total of <b>55</b> point clouds.</p>
        </div>
        <div class="text-center">
            <p>Try to be as <b>precise</b> as possible estimating the slope.</p>
        </div>
        <div style={{height:"400px"}}></div>
        <div class="right">
        {button(!data)}
        <Button style={{float:'left'}} id="back_button" variant="contained" color="primary" onClick={e=>window.location.href="/tutorial2"} >Back</Button>
        </div>
        </>);
}

export {
    Slide1,
    Slide2,
    Slide3,
    Slide4
}