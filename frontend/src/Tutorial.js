import React, { useState, useEffect, useRef } from "react";
import Button from '@material-ui/core/Button';

function TutorialText(additional) {
    return <>
    <div class="text-center">
      <p>Your task is to <b>estimate</b> the <b>number of clusters</b> by looking at the following scatter plot. Please click at the center of each cluster.</p>
      </div>
      <div class="text-center">
      <p>{additional}</p>
      </div>
      <div class="text-center">
      <p>Once you <b>successfully selected</b> the center the marker will turn <b>green</b>. You can <b>remove a marker</b> by clicking it.</p>
      </div>
    </>
}

function StartText() {
    return <>
    <div class="text-center">
      <h3>Tutorial completed</h3>
      </div>
    <div class="text-center">
      <p>You have <b>successfully</b> completed the <b>tutorial</b>.</p>
    </div>
    <div class="text-center">
      <p>In total, you have to complete <b>55 tasks</b>. When you hit next, the study starts. Note, the markers will <b>not turn green</b> anymore!</p>
    </div>   
    </>
}

function Buttons(props) {
    const next_clicked = () => {
        if (props.fetch) {
            fetch("/api/user_id").then(result=>result.json()).then((data)=>{fetch("/api/user/"+data["user_id"]).then(() => {window.location.href=props.next})})
        } else {
            window.location.href=props.next;
        }
    }
    const next_button = () => {
        return <Button style={{float:'right'}} id="next_button" variant="contained" color="primary" onClick={next_clicked} >Next</Button>
    }
    const back_button =() => {
        if (props.back)
            return <Button style={{float:'left'}} id="back_button" variant="contained" color="primary" onClick={e=>window.location.href=props.back} >Back</Button>
        else
            return <></>
    }
    return <div class="right">
            {next_button()}
            {back_button()}
            </div>
}

function Slide(props) {
    const [data, setData] = useState();
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
    
    
    if (ended)  return <>This study has ended.</>
    return <>
    <div> 
      <div class="text-center">
      <h3>{props.title}</h3>
      </div>
      {props.text}
      </div>    
      <img src={props.src} />  
      <Buttons back={props.back} next={props.next} />
    </>
}

function TutorialSlide0() {
    return <Slide title="Tutorial (1/3)" text={TutorialText("In this example we show only a single cluster.")} next="/tutorial1" src="a.jpg" />
}

function TutorialSlide1() {
    return <Slide title="Tutorial (2/3)" text={TutorialText("In this example we show two clusters.")} next="/tutorial2" back="/tutorial0" src="b.jpg" />
}

function TutorialSlide2() {
    return <Slide title="Tutorial (3/3)" text={TutorialText("In this example we show three clusters.")} next="/start" back="/tutorial1" src="c.jpg" />
}

function TutorialSlide3() {
    return <> 
    {StartText()}
    <Buttons next="/sample_task" back="/tutorial2" success={true} fetch={true}/>
    </>
}


export {
    TutorialSlide0,
    TutorialSlide1,
    TutorialSlide2,
    TutorialSlide3
}