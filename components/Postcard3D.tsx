import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Image as DreiImage, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PostcardData } from '../types';

interface Postcard3DProps {
  data: PostcardData;
  onClose: () => void;
}

const Postcard3D: React.FC<Postcard3DProps> = ({ data, onClose }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [flipped, setFlipped] = useState(false);
  const { mouse } = useThree();
  const [userNote, setUserNote] = useState("");
  
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
        
        // Rotate in 
        const entranceRot = (1 - easeOut) * Math.PI * 2;
        groupRef.current.rotation.y = entranceRot;
      }

      // Base rotation target
      const targetRotY = flipped ? Math.PI : 0;
      
      // Mouse Interaction (Parallax)
      const tiltX = -mouse.y * 0.1; 
      const tiltY = mouse.x * 0.1; 

      if (animationProgress.current >= 0.9) {
          // Normal interactive state with damping
          groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY + tiltY, 0.05);
          groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, tiltX, 0.05);
      } 
      
      // Gentle Floating
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group 
      ref={groupRef} 
      scale={[0, 0, 0]} // Start invisible/small
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {/* === GROUP 1: FRONT SIDE === */}
      {/* We use a slight offset to prevent Z-fighting */}
      <group position={[0, 0, 0.01]}>
        
        {/* Card Body - Front */}
        <mesh>
          <planeGeometry args={[4.2, 6.2]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.1} />
        </mesh>
        
        {/* Gold Border */}
        <lineSegments position={[0, 0, 0.001]}>
           <edgesGeometry args={[new THREE.PlaneGeometry(4.0, 6.0)]} />
           <lineBasicMaterial color="#9e8a58" />
        </lineSegments>

        {/* Image Area - Mounted Style */}
        <group position={[0, 1, 0.02]}>
            <mesh position={[0, 0, -0.005]}>
                <planeGeometry args={[3.6, 3.6]} />
                <meshBasicMaterial color="#000" />
            </mesh>
            <DreiImage 
                url={data.imageUrl} 
                scale={[3.5, 3.5]} 
                transparent 
            />
        </group>

        {/* Text Area */}
        <group position={[0, -1.8, 0.02]}>
             <Text
                position={[0, 0.5, 0]}
                fontSize={0.22}
                color="#e8e0cc"
                font="https://fonts.gstatic.com/s/notoserifsc/v12/H4clBXKMp9juaqM87vKSowt7w9Q.woff"
                maxWidth={3.5}
                textAlign="center"
                lineHeight={1.4}
              >
                {data.summary}
              </Text>

              <Text
                position={[0, -0.2, 0]}
                fontSize={0.09}
                color="#888"
                maxWidth={3.5}
                textAlign="center"
                letterSpacing={0.15}
                font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff"
              >
                {data.summaryEn.toUpperCase()}
              </Text>
              
              <mesh position={[0, -0.6, 0]}>
                 <planeGeometry args={[0.5, 0.005]} />
                 <meshBasicMaterial color="#9e8a58" />
              </mesh>
        </group>
        
        {/* Click target for flipping (invisible overlay) */}
        <mesh position={[0, 0, 0.1]} onClick={() => setFlipped(true)} visible={false}>
            <planeGeometry args={[4.2, 6.2]} />
        </mesh>
      </group>


      {/* === GROUP 2: BACK SIDE === */}
      <group rotation={[0, Math.PI, 0]} position={[0, 0, -0.01]}>
         {/* Card Body - Back (Dark Paper) */}
         <mesh>
          <planeGeometry args={[4.2, 6.2]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>

        <group position={[0, 0, 0.01]}>
            {/* Header */}
            <Text position={[0, 2.5, 0]} fontSize={0.15} color="#444" letterSpacing={0.3} font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff">
                MEMORY LOG
            </Text>

            {/* Metadata Grid */}
            <group position={[-1.2, 1.5, 0]} scale={0.8}>
                 {/* DATE */}
                 <Text position={[0, 0, 0]} fontSize={0.12} color="#666" anchorX="left" letterSpacing={0.1}>DATE</Text>
                 <Text position={[0, -0.25, 0]} fontSize={0.18} color="#e8e0cc" anchorX="left" font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff">{data.date}</Text>
                 
                 {/* TIME */}
                 <Text position={[2, 0, 0]} fontSize={0.12} color="#666" anchorX="left" letterSpacing={0.1}>DURATION</Text>
                 <Text position={[2, -0.25, 0]} fontSize={0.18} color="#e8e0cc" anchorX="left" font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff">{data.duration}</Text>
                 
                 {/* VIEW COUNT */}
                 <Text position={[0, -1.0, 0]} fontSize={0.12} color="#666" anchorX="left" letterSpacing={0.1}>REVISIT</Text>
                 <Text position={[0, -1.25, 0]} fontSize={0.18} color="#e8e0cc" anchorX="left" font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff">NO. 0{data.viewCount}</Text>
            </group>

            {/* Mood Stamp */}
            <group position={[1.2, -0.5, 0.02]} rotation={[0, 0, -0.2]}>
                <mesh>
                    <ringGeometry args={[0.5, 0.52, 32]} />
                    <meshBasicMaterial color="#9e8a58" transparent opacity={0.6} />
                </mesh>
                <Text fontSize={0.15} color="#9e8a58" letterSpacing={0.1} font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff">
                    {data.mood.toUpperCase()}
                </Text>
            </group>
            
            {/* Writing Lines */}
            <group position={[0, -1.5, 0]}>
                <mesh position={[0, 0.4, 0]}>
                    <planeGeometry args={[3, 0.01]} />
                    <meshBasicMaterial color="#333" />
                </mesh>
                <mesh position={[0, -0.4, 0]}>
                    <planeGeometry args={[3, 0.01]} />
                    <meshBasicMaterial color="#333" />
                </mesh>
                
                {/* HTML Input Overlay - Only visible when flipped to back */}
                {flipped && (
                    <Html transform position={[0, 0.1, 0.05]} occlude="blending" scale={0.3}>
                        <textarea 
                            value={userNote}
                            onChange={(e) => setUserNote(e.target.value)}
                            placeholder="Write your thoughts here..."
                            className="w-[800px] h-[300px] bg-transparent text-gray-300 font-serif text-4xl text-center border-none outline-none resize-none placeholder-gray-700 leading-[3em]"
                            style={{ 
                                background: 'transparent',
                                fontFamily: '"Noto Serif SC", serif'
                            }}
                        />
                    </Html>
                )}
            </group>
            
            {/* Return Button */}
            <group position={[0, -2.5, 0]} onClick={(e) => { e.stopPropagation(); setFlipped(false); }}>
                 <Text fontSize={0.1} color="#444" letterSpacing={0.2} font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff">
                    FLIP BACK
                 </Text>
            </group>
        </group>

        {/* Click target for flipping back (if clicking outside input) */}
        <mesh position={[0, 0, -0.1]} onClick={() => setFlipped(false)} visible={false}>
             <planeGeometry args={[4.2, 6.2]} />
        </mesh>

      </group>

      {/* Helper UI Text Floating below */}
      {!flipped && (
        <Html position={[0, -3.8, 0]} center>
            <div className="text-[10px] text-yellow-500/40 tracking-[0.4em] uppercase font-serif animate-pulse pointer-events-none">
                Click Card to Inspect
            </div>
        </Html>
      )}
    </group>
  );
};

export default Postcard3D;