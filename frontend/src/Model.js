import React, { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from 'react-three-fiber'
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

function load_model(path, callback) {
    new OBJLoader().load( path, function ( object ) {
        object.scale.set(10,10,10);
        callback(object);
    });
}

export default function Model(props) {
    const [obj, set] = useState()
    useMemo(() => load_model(props.url, set), [props.url])
    useFrame(state => {
        if (obj) {
            const time = state.clock.getElapsedTime()
            obj.rotation.y = time * 0.5
            obj.needsUpdate = true
        }        
      })
    return obj ? <primitive {...props} object={obj} /> : null
}
