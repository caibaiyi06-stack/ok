import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useThree, useLoader, useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PostcardData } from '../types';
import { useDrag } from '@use-gesture/react';

// --- Puzzle Shape Generator ---
const createPuzzleShape = (width: number, height: number, seed: number) => {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const radius = width * 0.25;

  const rand = (idx: number) => {
     const s = Math.sin(seed * 12.9898 + idx * 78.233) * 43758.5453;
     return s - Math.floor(s) > 0.5;
  };

  shape.moveTo(x, y);
  shape.lineTo(x + width / 2 - radius, y);
  shape.absarc(x + width / 2, y, radius, Math.PI, 0, rand(1)); 
  shape.lineTo(x + width, y);
  shape.lineTo(x + width, y + height / 2 - radius);
  shape.absarc(x + width, y + height / 2, radius, 1.5 * Math.PI, 0.5 * Math.PI, rand(2));
  shape.lineTo(x + width, y + height);
  shape.lineTo(x + width / 2 + radius, y + height);
  shape.absarc(x + width / 2, y + height, radius, 0, Math.PI, rand(3));
  shape.lineTo(x, y + height);
  shape.lineTo(x, y + height / 2 + radius);
  shape.absarc(x, y + height / 2, radius, 0.5 * Math.PI, 1.5 * Math.PI, rand(4));
  shape.lineTo(x, y);

  return shape;
};

interface PuzzlePieceProps {
  data: PostcardData;
  initialPos: [number, number, number];
  isNew: boolean;
  onSelect: (data: PostcardData) => void;
}

const PuzzlePiece: React.FC<PuzzlePieceProps> = ({ data, initialPos, isNew, onSelect }) => {
  const [pos, setPos] = useState<[number, number, number]>(initialPos);
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, data.imageUrl);
  const progress = useRef(0);
  
  const size = 3;

  const { geometry, shape } = useMemo(() => {
    const s = createPuzzleShape(size, size, parseInt(data.id.slice(-4)));
    const geo = new THREE.ExtrudeGeometry(s, {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 4
    });

    geo.computeBoundingBox();
    if(geo.boundingBox) {
        const min = geo.boundingBox.min;
        const max = geo.boundingBox.max;
        const range = new THREE.Vector3().subVectors(max, min);
        const uvAttribute = geo.attributes.uv;
        for(let i = 0; i < uvAttribute.count; i++) {
             const x = geo.attributes.position.getX(i);
             const y = geo.attributes.position.getY(i);
             const u = (x - min.x) / range.x;
             const v = (y - min.y) / range.y;
             uvAttribute.setXY(i, u, v);
        }
        uvAttribute.needsUpdate = true;
    }
    geo.center();
    return { geometry: geo, shape: s };
  }, [data.id, size]);

  const bind = useDrag(({ offset: [x, y], first, last }) => {
    if (first) document.body.style.cursor = 'grabbing';
    if (last) document.body.style.cursor = 'grab';
    const factor = 0.015; 
    setPos([initialPos[0] + x * factor, initialPos[1] - y * factor, initialPos[2]]);
  }) as any;

  // Animation Logic
  useFrame((state, delta) => {
      // Dynamic Entrance Animation: Fly in from camera Z
      if (isNew && progress.current < 1) {
          progress.current += delta * 1.0;
          const ease = 1 - Math.pow(1 - Math.min(progress.current, 1), 3);
          if (groupRef.current) {
              groupRef.current.scale.setScalar(ease);
              // Move from Z=5 to final Z position
              groupRef.current.position.z = THREE.MathUtils.lerp(8, active ? 1.5 : pos[2], ease);
              // Rotate slightly as it enters
              groupRef.current.rotation.z = (1 - ease) * 0.5;
          }
      } else if (groupRef.current) {
          // Standard interactive loop
          const t = state.clock.elapsedTime;
          const floatY = Math.sin(t + parseInt(data.id) % 10) * 0.08;
          
          groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, pos[0], 0.1);
          groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, pos[1] + floatY, 0.1);
          
          // Levitate forward when active
          groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, active ? 3.5 : pos[2], 0.1);

          if(active) {
               groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
               groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.1);
          }
      }

      // Material Glow Pulse
      if (meshRef.current) {
         const mat0 = (meshRef.current.material as THREE.MeshStandardMaterial[])[0];
         if (mat0) {
             const targetEmissive = active ? new THREE.Color("#ffaa00") : new THREE.Color("#000000");
             mat0.emissive.lerp(targetEmissive, 0.1);
             mat0.emissiveIntensity = active ? 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.3 : 0;
         }
      }
  });

  // Handle single click to open postcard
  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect(data);
  };

  return (
    <group 
        ref={groupRef} 
        {...(bind() as any)} 
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true); setActive(true); }} 
        onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); setActive(false); }}
    >
      {/* Dynamic Point Light for Active Piece */}
      {active && <pointLight distance={4} intensity={2} color="#ffaa00" decay={2} />}

      {/* Shadow */}
      <mesh position={[0.1, -0.1, -0.2]}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color="black" transparent opacity={0.4} />
      </mesh>

      <mesh ref={meshRef} geometry={geometry}>
         {/* Side Material */}
         <meshStandardMaterial attach="material-0" color="#5c4d28" roughness={0.3} metalness={0.8} />
         {/* Front Image Material */}
         <meshStandardMaterial attach="material-1" map={texture} roughness={0.5} />
      </mesh>
      
      {/* Gloss Overlay */}
      <mesh position={[0, 0, 0.11]}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color="white" transparent opacity={active ? 0.15 : 0.05} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>

      {/* Hover Info Display */}
      {active && (
          <group position={[0, -2.5, 0]}>
              <Text 
                fontSize={0.15} 
                color="#ffdb7d" 
                font="https://fonts.gstatic.com/s/cinzel/v11/8vIJ7ww63mVu7gt78Uk.woff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#3a2a10"
                position={[0, 1.2, 0]}
              >
                {data.time}
              </Text>
              
              <Text
                fontSize={0.25}
                color="white"
                font="https://fonts.gstatic.com/s/notoserifsc/v12/H4clBXKMp9juaqM87vKSowt7w9Q.woff"
                anchorX="center"
                anchorY="top"
                maxWidth={5}
                textAlign="center"
                lineHeight={1.4}
                outlineWidth={0.01}
                outlineColor="#000"
                position={[0, 0.8, 0]}
              >
                {data.summary}
              </Text>
              
              <Text
                fontSize={0.12}
                color="#ccc"
                anchorX="center"
                anchorY="top"
                maxWidth={5}
                textAlign="center"
                position={[0, 0.1, 0]}
              >
                 {data.summaryEn}
              </Text>

              <mesh position={[0, 0.6, -0.1]}>
                  <planeGeometry args={[5.2, 1.8]} />
                  <meshBasicMaterial color="#000" transparent opacity={0.6} />
              </mesh>
          </group>
      )}
    </group>
  );
};

interface MemoryCorridorProps {
  memories: PostcardData[];
  onBack: () => void;
  onSelectMemory: (data: PostcardData) => void;
}

const MemoryCorridor: React.FC<MemoryCorridorProps> = ({ memories, onBack, onSelectMemory }) => {
  return (
    <>
      <group>
        {memories.map((mem, index) => (
          <PuzzlePiece 
            key={mem.id} 
            data={mem} 
            initialPos={mem.position} 
            isNew={index === memories.length - 1}
            onSelect={onSelectMemory}
          />
        ))}
      </group>
      
      <Html position={[0, -6.5, 0]} center>
         <div className="flex flex-col items-center gap-4 animate-fade-in">
            <h2 className="text-yellow-500/30 text-2xl font-serif tracking-[0.5em] pointer-events-none uppercase">
                Archive
            </h2>
            <button 
            onClick={onBack}
            className="px-8 py-3 border border-white/10 text-white/50 font-serif hover:text-white hover:border-yellow-500/50 hover:bg-yellow-900/10 transition-all tracking-widest text-xs uppercase"
            >
            Upload New Memory
            </button>
         </div>
      </Html>
    </>
  );
};

export default MemoryCorridor;