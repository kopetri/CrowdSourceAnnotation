import React, { useEffect, useRef, useState } from "react";
import Slider from '@material-ui/core/Slider';

function Line(ctx) {
    var me = this;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    this.draw = function() {
        ctx.beginPath();
        ctx.moveTo(me.x1, me.y1);
        ctx.lineTo(me.x2, me.y2);
        ctx.stroke();
    }
}

function transform(x, a_low, a_high, b_low, b_high) {
    x = (x - a_low) / (a_high - a_low); // [0,1]
    x = x * (b_high - b_low) + b_low;
    return x
}

function randSign() {
    if (Math.random() >= 0.5) {
        return 1.0
    } else {
        return -1.0
    }
}

export default function TrendLine(props) {
    const canvas = useRef();
    const ctx = useRef();
    const img = useRef();
    const line = useRef();
    const [slope, setSlope] = useState(props.start_value + randSign() * transform(Math.random(), 0, 1, 0.15, 0.3));
    const scale = 10000000;

   
    // initialize the canvas context
    useEffect(() => {
      // dynamically assign the width and height to canvas
      const canvasEle = canvas.current;
      canvasEle.width = canvasEle.clientWidth;
      canvasEle.height = canvasEle.clientHeight;
   
      // get context of the canvas
      ctx.current = canvasEle.getContext("2d");
      ctx.current.lineWidth = 10;
      ctx.current.strokeStyle = '#0000ff';
      line.current = new Line(ctx.current);
      img.current = new Image();
      img.current.onload = start;
      img.current.src = props.src;
    }, [props.src]);
   
   
    // draw a line
    const updateLine = (e, value, skip) => {
        let value_ = value / scale;
        if (props.ground_truth) {
            if (Math.abs(value_ - props.ground_truth) < 0.02) {
                ctx.current.strokeStyle = '#00ff00';
                props.onResult(true);
            } else {
                ctx.current.strokeStyle = '#0000ff';
                props.onResult(false);
            }
        }
        setSlope(value_);
        let x1, x2, y1, y2 = 0;
        //let alpha = transform(value / 100, -1, 1, -Math.PI / 4, Math.PI / 4) + Math.PI * 0.5

        //x1 = Math.sin(alpha) * (props.size / 2) + props.width / 2
        //y1 = Math.cos(alpha) * (props.size / 2) + props.height / 2

        //x2 = Math.sin(alpha + Math.PI) * (props.size / 2) + props.width / 2
        //y2 = Math.cos(alpha + Math.PI) * (props.size / 2) + props.height / 2

        let s = transform(value, -scale, scale, 0, 1)
        x1 = 0
        y1 = s * props.height 

        x2 = props.width
        y2 = (1-s) * props.height 

        line.current.x1 = x1;
        line.current.y1 = y1;
        line.current.x2 = x2;
        line.current.y2 = y2;
        ctx.current.drawImage(img.current, 0, 0, props.width, props.height);
        line.current.draw();
        if (props.onNewSlope && !skip) props.onNewSlope(value_);
    }

    const start =() => {
        ctx.current.drawImage(img.current, 0, 0, props.width, props.height);
        updateLine(undefined, slope*scale, true);
    }
   
    return (
        <div style={{'width':'100%'}}>
            <div style={{'margin': '0 auto', 'width': props.width, 'height': props.height+100}}>
                <canvas ref={canvas} style={{'border': '1px solid black', 'width': props.width, 'height': props.height}}></canvas>
                <Slider defaultValue={slope * scale} min={-1.5 * scale} max={1.5 * scale} step={1}  size="small" onChange={updateLine}/>
            </div>
        </div>
    );
}