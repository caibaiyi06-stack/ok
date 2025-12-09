import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Image as DreiImage, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PostcardData } from '../types';

interface Postcard3DProps {
  data: PostcardData;
  onClose: () => void;
}

// Simple Calendar Widget 3D
const CalendarWidget = ({ date }: { date: string }) => {
  return (
    <group position={[1.5, 1, 0.2]} scale={[0.5, 0.5, 0.5]}>
      {/* Background Plane */}
      <mesh>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial color="#000" transparent opacity={0.9} side={THREE.DoubleSide} />
        <lineSegments>
             <edgesGeometry args={[new THREE.PlaneGeometry(3, 3)]} />
             <lineBasicMaterial color="#d4af37" />
        </lineSegments>
      </mesh>
      
      {/* Header */}
      <mesh position={[0, 1.2, 0.01]}>
         <planeGeometry args={[3, 0.6]} />
         <meshBasicMaterial color="#d4af37" />
      </mesh>
      <Text position={[0, 1.2, 0.02]} fontSize={0.3} color="#000">CALENDAR</Text>
      
      {/* Date */}
      <Text position={[0, 0.2, 0.02]} fontSize={0.8} color="#fff" font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff">
         {date.split('/')[2] || "12"}
      </Text>
      <Text position={[0, -0.6, 0.02]} fontSize={0.3} color="#aaa">
         {date}
      </Text>
      
      {/* Grid decorative */}
      {Array.from({length: 5}).map((_, i) => (
         <line key={i} position={[0, -1 + i * 0.1, 0.01]}>
            <bufferGeometry>
               <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-1.2, 0, 0, 1.2, 0, 0])} itemSize={3} />
            </bufferGeometry>
            <lineBasicMaterial color="#333" />
         </line>
      ))}
    </group>
  )
}

const InteractiveText = ({ text, position, onClick, fontSize = 0.15, label = "" }: any) => {
    const [hover, setHover] = useState(false);
    return (
        <group position={position} 
               onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
               onPointerOut={(e) => { e.stopPropagation(); setHover(false); document.body.style.cursor = 'auto'; }}
               onClick={(e) => { if(onClick) { e.stopPropagation(); onClick(); } }}
        >
            <Text 
                fontSize={fontSize} 
                color={hover ? "#fff" : "#aaa"} 
                anchorX="left"
            >
                {label} {text}
            </Text>
            {hover && (
                <mesh position={[label.length * 0.05 + 0.5, -0.1, 0]}>
                    <planeGeometry args={[2, 0.01]} />
                    <meshBasicMaterial color="#d4af37" />
                </mesh>
            )}
        </group>
    )
}

const Postcard3D: React.FC<Postcard3DProps> = ({ data, onClose }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [flipped, setFlipped] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { mouse } = useThree();
  
  // Animation State
  const animationProgress = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current) {
      
      // --- Entrance Animation Logic ---
      if (animationProgress.current < 1.0) {
        animationProgress.current += delta * 1.5; // Speed of entrance
        if (animationProgress.current > 1.0) animationProgress.current = 1.0;
        
        const p = animationProgress.current;
        const easeOut = 1 - Math.pow(1 - p, 3); // Cubic ease out
        
        // Scale up from 0
        groupRef.current.scale.setScalar(easeOut);
        
        // Rotate in (spin around Y initially)
        // We add this on top of interactive rotation below
        // Start from -PI rotation and unwind to 0 (or target)
        const entranceRot = (1 - easeOut) * Math.PI * 2;
        groupRef.current.rotation.y = entranceRot;
      }
      // --------------------------------

      // Standard Logic (only applies fully after entrance largely done for smoothness, or blended)
      // Base rotation target
      const targetRotY = flipped ? Math.PI : 0;
      
      // Mouse Interaction
      const tiltX = -mouse.y * 0.05; 
      const tiltY = mouse.x * 0.05; 

      if (animationProgress.current >= 0.9) {
          // Normal interactive state
          groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY + tiltY, 0.08);
          groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, tiltX, 0.08);
      } else {
          // Blending entrance rotation with tilt
          // (Handled implicitly by setting rotation.y above in entrance block, 
          // but we might want to let the tilt fade in. For now, entrance dominates).
      }
      
      // Gentle Floating
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.05;
    }
  });

  return (
    <group 
      ref={groupRef} 
      scale={[0, 0, 0]} // Start invisible/small
      onClick={(e) => { 
          // Only flip if we aren't interacting with specific back widgets
          if (!showCalendar) setFlipped(!flipped); 
      }}
      onPointerOver={() => !showCalendar && (document.body.style.cursor = 'pointer')}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      {/* Front of Card */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[4, 6]} />
        <meshBasicMaterial color="#1a1a1a" side={THREE.FrontSide} />
      </mesh>
      
      {/* Image on Front */}
      <DreiImage 
        url={data.imageUrl} 
        position={[0, 1, 0.02]} 
        scale={[3.5, 3.5]} 
        transparent 
        opacity={0.9}
      />

      {/* Text on Front */}
      <Text
        position={[0, -1.5, 0.02]}
        fontSize={0.15}
        color="#e0e0e0"
        maxWidth={3.5}
        textAlign="center"
        font="https://fonts.gstatic.com/s/notoserifsc/v12/H4clBXKMp9juaqM87vKSowt7w9Q.woff" // Fallback or standard font
        anchorX="center"
        anchorY="middle"
      >
        {data.summary}
      </Text>

      {/* Decorative Border */}
      <lineSegments position={[0, 0, 0.02]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(3.8, 5.8)]} />
        <lineBasicMaterial color="#d4af37" transparent opacity={0.5} />
      </lineSegments>

      {/* Little glowing "Man" / Spirit walking */}
      <mesh position={[1.5, -2.5, 0.05]}>
         <sphereGeometry args={[0.05, 16, 16]} />
         <meshBasicMaterial color="#fff" />
      </mesh>


      {/* Back of Card */}
      <group rotation={[0, Math.PI, 0]}>
         <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[4, 6]} />
          <meshBasicMaterial color="#111" side={THREE.FrontSide} />
        </mesh>
        
        <Text position={[0, 2, 0.02]} fontSize={0.2} color="#d4af37">MEMORY LOG</Text>
        
        {/* Interactive Fields */}
        <InteractiveText 
            label="DATE:" 
            text={data.date} 
            position={[-1, 1, 0.02]} 
            onClick={() => setShowCalendar(!showCalendar)}
        />
        
        <InteractiveText 
            label="TIME:" 
            text={data.time} 
            position={[-1, 0.5, 0.02]} 
        />
        
        <InteractiveText 
            label="VIEWS:" 
            text={data.viewCount.toString()} 
            position={[-1, 0, 0.02]} 
        />
        
        <InteractiveText 
            label="PARTICLES:" 
            text={data.particles.toString()} 
            position={[-1, -0.5, 0.02]} 
        />

        {showCalendar && <CalendarWidget date={data.date} />}
        
        {/* Stamp */}
        <mesh position={[1.2, 2.2, 0.02]}>
           <circleGeometry args={[0.4, 32]} />
           <meshBasicMaterial color="#333" />
        </mesh>
      </group>

      {/* UI Interaction Hint */}
      <Html position={[0, -3.5, 0]} center>
        <div className="text-xs text-white/50 tracking-widest uppercase font-serif">
            {flipped ? "Click Date for details" : "Click to Flip"}
        </div>
      </Html>
    </group>
  );
};

export default Postcard3D;