import React from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import './App.css';
import Finish from "./Finish";
import Error from "./Error";
import { SampleTask } from "./Job";
import { TutorialSlide0, TutorialSlide1, TutorialSlide2, TutorialSlide3 } from "./Tutorial";

export default function App() {
  return (
    <Router>
      <Route exact path="/tutorial0"                component={()=>{return <TutorialSlide0 />                                 }} />
      <Route exact path="/tutorial1"                component={()=>{return <TutorialSlide1 />                                 }} />
      <Route exact path="/tutorial2"                component={()=>{return <TutorialSlide2 />                                 }} />
      <Route exact path="/start"                    component={()=>{return <TutorialSlide3 />                                 }} />
      <Route exact path="/sample_task"              component={()=>{return <SampleTask />       }} />
      <Route exact path="/finished"                 component={()=>{return <Finish />                                 }} />
      <Route exact path="/error"                    component={()=>{return <Error />                                  }} />
    </Router>
  );
}
