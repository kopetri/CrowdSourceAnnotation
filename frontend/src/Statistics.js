import React, { useState, useEffect } from "react";
import ProgressBar from "@ramonak/react-progress-bar";
import Scene from "./GlobeVis";
import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';

function Overview() {
    const [data, setData] = useState({
        n_batches:   -1,
        n_pending:   -1,
        n_completed: -1,
        n_failed:    -1,
        categories: []
    });
    useEffect(()=>{fetch("/api/database/overview").then(result=>result.json()).then((data)=>{setData(data);})}, []);
    return (<>
        <h2 class="text-center">Overview</h2>        
        <div style={{'margin': 'auto', 'width': '100%', 'padding': '10px', 'maxWidth': '1080px', 'minWidth': '500px'}}>
        <p style={{backgroundColor: "#ecf4ff", width: "120px"}}>Batches:   {data.n_batches}</p>
        <p style={{backgroundColor: "#ffffc7", width: "120px"}}>Pending:   {data.n_pending}</p>
        <p style={{backgroundColor: "#9aff99", width: "120px"}}>Completed: {data.n_completed}</p>
        <p style={{backgroundColor: "#ffccc9", width: "120px"}}>Failed:    {data.n_failed}</p>
        
        {data.categories.map((value, index) => {
            return  <div style={{width: "600px", height: "30px", overflow: "hidden   "}}>
                        <div style={{width: "100px", float: "left", textAlign: "center"}}><b>{value.name}</b></div>
                        <div style={{width: "400px", float: "left"}}><ProgressBar borderRadius={0} isLabelVisible={false} completed={value.n_annotated / value.n_total * 100}/></div>
                        <div style={{width: "100px", float: "left", textAlign: "center"}}>{value.n_annotated}/{value.n_total}</div>
                    </div>
        })}
        </div>    
        </>);
}

function Results() {
    const [categories, setCategories] = useState([])
    const [category, setCategory] = useState()
    const [current_category, setCurrent_category] = useState("airplane")
    useEffect(() => {fetch("/api/heatmaps").then(result=>result.json()).then((data)=>{setCategories(data)})}, [])
    useEffect(() => {
       setCurrent_category(categories[0])
    }, [categories])
    useEffect(() => {
        fetch("/api/heatmap/"+current_category).then(result=>result.json()).then((data)=>{setCategory(data)})
    }, [current_category])
    const onSelect = (value) => {
        setCurrent_category(value["label"])
    }
    if (!category) return <></>
    return (
        <div style={{width: "250px", height: "500px", overflow: "hidden"}}>
        <Dropdown options={categories} onChange={onSelect} value={current_category} placeholder="Select an option" />
        <div style={{width: "250px", float: "left", textAlign: "center"}}><Scene size={500} best={category[0]} worst={category[1]} model={category[2]} /></div>
        </div>
        );
}

export {
    Results,
    Overview
}