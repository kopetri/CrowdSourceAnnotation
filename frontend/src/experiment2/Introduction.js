import React, { useState, useEffect, useRef } from "react";
import Button from '@material-ui/core/Button';
import { ClusterSelection } from "./ClusterTask";

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
        if (props.success) {
            return <Button style={{float:'right'}} id="next_button" variant="contained" color="primary" onClick={next_clicked} >Next</Button>
        }
        else {
            return <Button style={{float:'right'}} id="next_button" disabled variant="contained" color="primary" onClick={next_clicked} >Next</Button>
        }
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
    const [success, updateSuccess] = useState(false);
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
    const distance =(a,b) => {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
    }
    
    const validate =(annotation) => {
        const correct = props.ground_truth.filter(a => annotation.findIndex(b => distance(a, b) < 20) >= 0)
        const success = correct.length === props.ground_truth.length && annotation.length === props.ground_truth.length        
        updateSuccess(success);
    }
    if (ended)  return <>This study has ended.</>
    return <>
    <div> 
      <div class="text-center">
      <h3>{props.title}</h3>
      </div>
      {props.text}
      </div>      
      <ClusterSelection ground_truth={props.ground_truth} src={props.src} width={550} height={550} onChange={validate}>
      <Buttons back={props.back} next={props.next} success={success} />
      </ClusterSelection>
    </>
}

function ClusterSlide1() {
    const ground_truth = [{'x': 280, 'y':550-250}];
    return <Slide title="Tutorial (1/3)" text={TutorialText("In this example we show only a single cluster.")} next="/tutorial1" ground_truth={ground_truth} src="a.jpg" />
}

function ClusterSlide2() {
    const ground_truth = [
        {'x': 200, 'y':550-200},
        {'x': 400, 'y':550-400}
    ];
    return <Slide title="Tutorial (2/3)" text={TutorialText("In this example we show two clusters.")} next="/tutorial2" back="/tutorial0" ground_truth={ground_truth} src="b.jpg" />
}

function ClusterSlide3() {
    const ground_truth = [
        {'x': 200, 'y':550-450},
        {'x': 300, 'y':550-200},
        {'x': 400, 'y':550-50}
    ];
    return <Slide title="Tutorial (3/3)" text={TutorialText("In this example we show three clusters.")} next="/start" back="/tutorial1" ground_truth={ground_truth} src="c.jpg" />
}

function ClusterSlide4() {
    return <> 
    {StartText()}
    <Buttons next="/cluster_selection" back="/tutorial2" success={true} fetch={true}/>
    </>
}


export {
    ClusterSlide1,
    ClusterSlide2,
    ClusterSlide3,
    ClusterSlide4
}