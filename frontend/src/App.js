import React from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import './App.css';
import { Slide1, Slide2, Slide3, Slide4} from './Introduction';
import Task from "./Task";
import Finish from "./Finish";
import Error from "./Error";
import ClusterEstimation from "./experiment2/ClusterEstimation";
import { ClusterSlide1, ClusterSlide2, ClusterSlide3, ClusterSlide4 } from "./experiment2/Introduction";

export default function App() {
  return (
    <Router>
      <Route exact path="/"                         component={()=>{return <ClusterSlide1 />                                 }} />
      <Route exact path="/tutorial0"                component={()=>{return <ClusterSlide1 />                                 }} />
      <Route exact path="/tutorial1"                component={()=>{return <ClusterSlide2 />                                 }} />
      <Route exact path="/tutorial2"                component={()=>{return <ClusterSlide3 />                                 }} />
      <Route exact path="/start"                    component={()=>{return <ClusterSlide4 />                                 }} />
      <Route exact path="/correlation"              component={()=>{return <Task />                                   }} />
      <Route exact path="/cluster_selection"        component={()=>{return <ClusterEstimation selection={true}/>      }} />
      <Route exact path="/cluster_counting"         component={()=>{return <ClusterEstimation counting={true}/>       }} />
      <Route exact path="/finished"                 component={()=>{return <Finish />                                 }} />
      <Route exact path="/error"                    component={()=>{return <Error />                                  }} />
      <Route exact path="/demo"                     component={()=>{return <Slide1 />                                 }} />
    </Router>
  );
}
