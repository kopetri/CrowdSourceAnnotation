import React, { useRef, useState } from 'react'
import * as THREE from "three"
import { Canvas, useFrame, useThree, useLoader } from 'react-three-fiber'
import Model from "./Model";

const tempObject = new THREE.Object3D();

export default function Scene(props) {
  const sphere = useRef()
  return <div style={{width:props.size / 2, height:props.size}}>
          <Canvas camera={{ zoom: 9, position: [0, 0, 100] }} > 
          <color attach="background" args={["gray"]} />
          <ambientLight />
          <pointLight position={[10, 10, 10]} />          
          <Sphere src={props.best}  position={[0,5,0]} coords={[[0,0], [100,0], [0,100], [100,100]]}/>
          <Sphere src={props.worst} position={[0,0,0]} coords={[[0,0], [100,0], [0,100], [100,100]]}/>
          <Model url={props.model}  position={[0,-5,0]}/>
          </Canvas>
        </div>
}

const Sphere = (props) => {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(props.src);
  texture.minFilter = THREE.LinearFilter;
  const ref = useRef();
  useFrame(state => {
    const time = state.clock.getElapsedTime()
    ref.current.rotation.y = time * 0.5
    ref.current.needsUpdate = true
  })
  return (
    <mesh ref={ref} {...props}>
      <sphereBufferGeometry args={[2.3, 32, 32]} />
      <meshBasicMaterial attach="material" map={texture} />
    </mesh>
  );
};

