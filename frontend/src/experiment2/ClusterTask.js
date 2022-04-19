import React, { useEffect, useRef, useState } from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@material-ui/core";

function ClusterSelection(props) {
    const canvas = useRef();
    const ctx = useRef();
    const img = useRef();
    const [annotation, setAnnotation] = useState([]);
    const circle_size = 10;
   
    // initialize the canvas context
    useEffect(() => {
        // dynamically assign the width and height to canvas
        const canvasEle = canvas.current;
        canvasEle.width = canvasEle.clientWidth;
        canvasEle.height = canvasEle.clientHeight;

        // get context of the canvas
        ctx.current = canvasEle.getContext("2d");
        img.current = new Image();
        img.current.onload = drawBackground;
        img.current.src = props.src;
        if (!props.disable_selection) {
            canvasEle.onclick = click;
        }
    }, [props.src]);
   
    const drawBackground =() => {
        if (ctx.current) {
            ctx.current.drawImage(img.current, 0, 0, props.width, props.height);
            drawPoints();
        }
    }

    const getColor =(center) => {
        if (props.ground_truth) {
            const idx = props.ground_truth.findIndex(c => distance(c, center) < 20);
            return idx >= 0?"green":"blue";
        } else {
            return "blue"
        }
    }

    const drawPoints =() => {
        if (annotation) {
            annotation.forEach(center => {
                ctx.current.beginPath();
                ctx.current.arc(center.x, center.y, circle_size, 0, 2 * Math.PI);
                ctx.current.fillStyle = getColor(center);
                ctx.current.fill();
            })
        }
    }

    const distance =(a,b) => {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
    }

    const click =(evt) => {
        let center = {'x': evt.layerX, 'y': evt.layerY};
        setAnnotation(oldArray => {
            let targetIndex = oldArray.findIndex(c => distance(c, center) <= circle_size);
            if (targetIndex < 0)
                return [...oldArray, center];
            return oldArray.filter(c => distance(c, center) > circle_size);
        });
    }

    useEffect(() => {
        if (props.annotation)
            setAnnotation(props.annotation);
    }, [props.annotation])

    useEffect(() => {
        if (props.onChange) {
            props.onChange(annotation);
        }
        drawBackground()
    }, [annotation])
   
    return (
        <div style={{'width':'100%'}}>
            <div style={{'margin': '0 auto', 'width': props.width, 'height': props.height+100}}>
                <canvas ref={canvas} style={{'border': '1px solid black', 'width': props.width, 'height': props.height}}></canvas>
                {props.children}
            </div>
        </div>
    );
}

function ClusterCounting(props) {
    const handleChange = (evt) => {
        let selected_index = evt.target.value + data_points[0];
        props.onChange([selected_index]);
    }
    const data_points = [4,5,6,7,8];
    return (
        <ClusterSelection src={props.src} width={props.width} height={props.height} disable_selection={true}>
            <FormControl fullWidth>
                <InputLabel id="select_label">Select number of clusters</InputLabel>
                <Select
                    labelId="select_label"
                    id="select_label"
                    label="Select the number of clusters."
                    onChange={handleChange}
                >
                {data_points.map((item, index) => (
                    <MenuItem value={index}>{item}</MenuItem>
                ))}
                </Select>
                </FormControl>
        </ClusterSelection>
    );
}

export {
    ClusterCounting,
    ClusterSelection
}