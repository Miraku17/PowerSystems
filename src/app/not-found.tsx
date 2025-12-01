'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Float, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

// --- 3D Generator Component ---
function GeneratorModel(props: any) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Animation for a subtle idle vibration
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(time * 20) * 0.005; // High frequency rumble
      groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.05; // Slow drift
    }
  });

  const brandBlue = new THREE.Color('#2B4C7E');
  const brandRed = new THREE.Color('#D32F2F');
  const steelGray = new THREE.Color('#607D8B');
  const darkMetal = new THREE.Color('#2C2C2C');

  return (
    <group ref={groupRef} {...props}>
      {/* Base Skids */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[3.2, 0.2, 1.5]} />
        <meshStandardMaterial color={darkMetal} roughness={0.7} metalness={0.8} />
      </mesh>

      {/* Main Engine Block */}
      <mesh position={[-0.5, -0.2, 0]}>
        <boxGeometry args={[1.8, 1.2, 1.1]} />
        <meshStandardMaterial color={brandBlue} roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Alternator (The cylindrical part) */}
      <mesh position={[1, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 1.4, 32]} />
        <meshStandardMaterial color={brandBlue} roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Radiator / Front Grill */}
      <mesh position={[-1.5, -0.1, 0]}>
        <boxGeometry args={[0.2, 1.4, 1.15]} />
        <meshStandardMaterial color={darkMetal} />
      </mesh>
      {/* Grill Slats */}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((y, i) => (
         <mesh key={i} position={[-1.61, y - 0.1, 0]}>
            <boxGeometry args={[0.05, 0.1, 1]} />
            <meshStandardMaterial color="#111" />
         </mesh>
      ))}

      {/* Exhaust Pipe */}
      <group position={[0, 0.4, 0]}>
        <mesh position={[-0.5, 0.5, 0.3]}>
            <cylinderGeometry args={[0.1, 0.1, 1, 16]} />
            <meshStandardMaterial color={steelGray} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Exhaust Cap/Flapper */}
        <mesh position={[-0.5, 1.05, 0.3]} rotation={[0, 0, 0.5]}>
            <cylinderGeometry args={[0.12, 0.12, 0.2, 16]} />
            <meshStandardMaterial color="#111" />
        </mesh>
        {/* Smoke Particle hint (simple sphere for now) */}
        <CloudParticle position={[-0.5, 1.5, 0.3]} />
      </group>

      {/* Control Panel */}
      <group position={[1.2, 0.2, 0.6]}>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.5, 0.2]} />
          <meshStandardMaterial color={steelGray} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0.1, 0.11]}>
            <planeGeometry args={[0.4, 0.2]} />
            <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
        </mesh>
        {/* Emergency Stop Button */}
        <mesh position={[0.2, -0.1, 0.11]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.05]} />
            <meshStandardMaterial color={brandRed} />
        </mesh>
      </group>
      
      {/* Fan (Hidden inside but visible from side) */}
       <mesh position={[-1.35, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.1, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>

    </group>
  );
}

// --- Simple Smoke Particle ---
function CloudParticle({ position }: { position: [number, number, number] }) {
    const mesh = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if(!mesh.current) return;
        const time = state.clock.getElapsedTime();
        // Reset loop
        const t = (time * 0.5) % 1; 
        mesh.current.position.y = position[1] + t * 2;
        mesh.current.position.x = position[0] + Math.sin(time) * 0.2;
        mesh.current.scale.setScalar(0.5 + t);
        const material = mesh.current.material as THREE.MeshBasicMaterial;
        material.opacity = 1 - t;
    })

    return (
        <mesh ref={mesh} position={position}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#aaa" transparent opacity={0.5} depthWrite={false} />
        </mesh>
    )
}

// --- Scene Setup ---
function Scene() {
    return (
        <>
             <PerspectiveCamera makeDefault position={[4, 2, 5]} fov={45} />
             <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 4} />
             
             <Environment preset="city" />
             <ambientLight intensity={0.5} />
             <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
             <pointLight position={[-10, -10, -10]} intensity={0.5} color="#2B4C7E" />

             <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <GeneratorModel />
             </Float>

             <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.5} far={10} color="#000000" />
             
             {/* 3D Text Floating in scene */}
             <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5} position={[0, 2, 0]}>
                <Text
                    fontSize={1.5}
                    color="#D32F2F"
                    anchorX="center"
                    anchorY="middle"
                    font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff" // Default fallback font
                >
                    404
                    <meshStandardMaterial emissive="#D32F2F" emissiveIntensity={2} toneMapped={false} />
                </Text>
             </Float>
        </>
    )
}

export default function NotFound() {
  return (
    <div className="w-full h-screen bg-[#1A2F4F] relative overflow-hidden">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 2]}>
            <Scene />
        </Canvas>
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-20 pointer-events-none">
        <div className="bg-[#1A2F4F]/80 backdrop-blur-sm p-8 rounded-2xl border border-[#455A64] text-center max-w-lg mx-4 shadow-2xl pointer-events-auto">
            <h2 className="text-3xl font-bold text-white mb-2">Generator Not Found</h2>
            <p className="text-[#B0BEC5] mb-6">
                We couldn't generate the page you're looking for. It might be out of fuel or disconnected from the grid.
            </p>
            
            <div className="flex gap-4 justify-center">
                <Link 
                    href="/"
                    className="px-6 py-3 bg-[#D32F2F] text-white rounded-lg font-semibold hover:bg-[#b71c1c] transition-colors shadow-lg shadow-red-900/20"
                >
                    Return Home
                </Link>
                <button 
                    onClick={() => window.history.back()}
                    className="px-6 py-3 bg-transparent border border-[#607D8B] text-[#F5F5F0] rounded-lg font-semibold hover:bg-[#607D8B]/20 transition-colors"
                >
                    Go Back
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}