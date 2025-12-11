import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Image as DreiImage, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { PostcardData } from '../types';

interface Postcard3DProps {
  data: PostcardData;
  onClose: () => void;
  onSave: (note: string) => void;
}

// Generates a Bauhaus-style abstract pattern based on the ID
const AbstractBackPattern = ({ id }: { id: string }) => {
  const seed = parseInt(id.slice(-4));
  
  const shapes = useMemo(() => {
    const items = [];
    const colors = ["#8a6a4b", "#2a2a2a", "#d4af37", "#555555", "#9e8a58"];
    
    for (let i = 0; i < 5; i++) {
        const type = (seed + i) % 3; // 0: Sphere, 1: Cone, 2: Torus
        const scale = 0.5 + Math.random() * 0.8;
        const x = (Math.random() - 0.5) * 3;
        const y = (Math.random() - 0.5) * 4;
        const z = Math.random() * 0.5;
        const color = colors[(seed + i) % colors.length];
        items.push({ type, position: [x, y, z] as [number, number, number], scale, color });
    }
    return items;
  }, [seed]);

  return (
    <group position={[0, 0, -0.1]}>
        {shapes.map((s, i) => (
            <Float key={i} speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <mesh position={s.position} scale={s.scale}>
                    {s.type === 0 && <sphereGeometry args={[0.5, 32, 32]} />}
                    {s.type === 1 && <coneGeometry args={[0.5, 1, 32]} />}
                    {s.type === 2 && <torusGeometry args={[0.4, 0.15, 16, 100]} />}
                    <meshStandardMaterial color={s.color} roughness={0.4} metalness={0.6} />
                </mesh>
            </Float>
        ))}
         {/* Background Plane for geometric composition */}
         <mesh position={[0, 0, -0.5]}>
            <planeGeometry args={[4, 6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
    </group>
  );
};

const Postcard3D: React.FC<Postcard3DProps> = ({ data, onClose, onSave }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [flipped, setFlipped] = useState(false);
  const [userNote, setUserNote] = useState(data.userNote || "");
  const animationProgress = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Entrance Animation: Spiral from far back
      if (animationProgress.current < 1.0) {
        animationProgress.current += delta * 1.2;
        const p = Math.min(animationProgress.current, 1.0);
        const ease = 1 - Math.pow(1 - p, 4); 

        groupRef.current.position.z = THREE.MathUtils.lerp(-10, 0, ease);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(Math.PI, 0, ease);
        groupRef.current.scale.setScalar(ease);
      } else {
        // Interactive Flip State
        const targetRotY = flipped ? Math.PI : 0;
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.08);
        
        // Idle Float
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* === FRONT SIDE === */}
      <group visible={!flipped || (groupRef.current?.rotation.y || 0) < Math.PI / 2}>
        {/* Card Base */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.2, 6.2, 0.05]} />
          <meshStandardMaterial color="#111" roughness={0.5} />
        </mesh>
        
        {/* Gold Border Frame */}
        <mesh position={[0, 0, 0.03]}>
           <ringGeometry args={[0, 0, 4, 1]} /> 
           <meshBasicMaterial color="transparent" /> 
        </mesh>
        <lineSegments position={[0, 0, 0.04]}>
            <edgesGeometry args={[new THREE.PlaneGeometry(4.0, 6.0)]} />
            <lineBasicMaterial color="#9e8a58" />
        </lineSegments>

        {/* Image */}
        <group position={[0, 1.2, 0.04]}>
            <DreiImage url={data.imageUrl} scale={[3.6, 3.6]} transparent />
        </group>

        {/* Typography */}
        <group position={[0, -1.8, 0.06]}>
             <Text
                fontSize={0.2}
                color="#e8e0cc"
                font="https://fonts.gstatic.com/s/notoserifsc/v12/H4clBXKMp9juaqM87vKSowt7w9Q.woff"
                maxWidth={3.5}
                textAlign="center"
                lineHeight={1.5}
              >
                {data.summary}
              </Text>
              <Text
                position={[0, -0.6, 0]}
                fontSize={0.08}
                color="#666"
                maxWidth={3.5}
                textAlign="center"
                letterSpacing={0.1}
              >
                {data.summaryEn.toUpperCase()}
              </Text>
              
              {/* Metadata strip */}
              <group position={[0, -1.1, 0]}>
                  <Text fontSize={0.08} color="#9e8a58" letterSpacing={0.2}>
                      {data.date} — {data.time} — {data.duration}
                  </Text>
              </group>
        </group>

        {/* Flip Button Area (Invisible Interactor) */}
        <mesh position={[1.8, -2.8, 0.1]} onClick={() => setFlipped(true)} onPointerOver={() => document.body.style.cursor='pointer'} onPointerOut={() => document.body.style.cursor='auto'}>
             <circleGeometry args={[0.3, 32]} />
             <meshBasicMaterial color="#9e8a58" transparent opacity={0.2} />
        </mesh>
         <Text position={[1.8, -2.8, 0.11]} fontSize={0.15} color="#fff">↻</Text>
      </group>


      {/* === BACK SIDE === */}
      <group rotation={[0, Math.PI, 0]} visible={flipped || (groupRef.current?.rotation.y || 0) > Math.PI / 2}>
         {/* Card Base */}
         <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.2, 6.2, 0.05]} />
          <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.5} />
        </mesh>

        {/* Abstract Geometry Art */}
        <group position={[0, 1, 0.1]}>
             <AbstractBackPattern id={data.id} />
        </group>
        
        {/* Mood/Input Section */}
        <group position={[0, -1.5, 0.04]}>
            <Text position={[0, 1, 0]} fontSize={0.12} color="#9e8a58" letterSpacing={0.2}>
                REFLECTIONS
            </Text>
            
             <Html transform position={[0, -0.2, 0]} occlude="blending" scale={0.4}>
                <div className="w-[300px] flex flex-col items-center gap-4">
                    <textarea 
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="Write down your feelings at this moment..."
                        className="w-full h-32 bg-white/5 border border-white/10 p-4 text-white font-serif text-sm focus:border-yellow-500/50 outline-none resize-none text-center placeholder-white/20"
                    />
                    <button 
                        onClick={() => onSave(userNote)}
                        className="px-6 py-2 bg-yellow-900/20 border border-yellow-500/20 text-yellow-100 font-serif tracking-widest text-xs hover:bg-yellow-900/40 transition-all uppercase"
                    >
                        Store Memory
                    </button>
                </div>
            </Html>
        </group>
        
        {/* Return Flip */}
        <mesh position={[1.8, -2.8, 0.1]} onClick={() => setFlipped(false)} onPointerOver={() => document.body.style.cursor='pointer'} onPointerOut={() => document.body.style.cursor='auto'}>
             <circleGeometry args={[0.3, 32]} />
             <meshBasicMaterial color="#9e8a58" transparent opacity={0.2} />
        </mesh>
         <Text position={[1.8, -2.8, 0.11]} fontSize={0.15} color="#fff">↻</Text>
      </group>
    </group>
  );
};

export default Postcard3D;