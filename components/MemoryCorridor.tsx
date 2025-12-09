import React, { useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Image as DreiImage, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PostcardData } from '../types';
import { useDrag } from '@use-gesture/react';

// Puzzle piece shape generator
const createPuzzleShape = (x: number, y: number, width: number, height: number) => {
  const shape = new THREE.Shape();
  shape.moveTo(x, y);
  shape.lineTo(x + width / 2 - 0.2, y);
  shape.absarc(x + width / 2, y, 0.2, Math.PI, 0, true); // Tab out
  shape.lineTo(x + width, y);
  shape.lineTo(x + width, y + height / 2 - 0.2);
  shape.absarc(x + width, y + height / 2, 0.2, 1.5 * Math.PI, 0.5 * Math.PI, false); // Tab in
  shape.lineTo(x + width, y + height);
  shape.lineTo(x, y + height);
  shape.lineTo(x, y);
  return shape;
};

interface PuzzlePieceProps {
  data: PostcardData;
  position: [number, number, number];
}

const PuzzlePiece: React.FC<PuzzlePieceProps> = ({ data, position }) => {
  const [pos, setPos] = useState<[number, number, number]>(position);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Simple drag logic
  const bind = useDrag(({ offset: [x, y] }) => {
    // Mapping screen drag to 3D space roughly
    const aspect = window.innerWidth / window.innerHeight;
    setPos([x / 100 * aspect, -y / 100, 0]);
  });

  useFrame((state) => {
    if(meshRef.current) {
        // Breathing effect for outline
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.01;
        meshRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group position={pos} {...(bind() as any)}>
      <mesh ref={meshRef}>
        <planeGeometry args={[2, 2]} />
        {/* Using a shader here for dissolution edges would be ideal, using simple texture for now */}
        <meshBasicMaterial color="#000" transparent opacity={0.8} />
      </mesh>
      
      <DreiImage 
        url={data.imageUrl} 
        scale={[1.8, 1.8]} 
        position={[0, 0, 0.01]} 
        transparent 
        opacity={0.8}
        grayscale={0.5} // Vintage feel
        onPointerOver={(e) => { e.object.material.grayscale = 0; }}
        onPointerOut={(e) => { e.object.material.grayscale = 0.5; }}
      />
    </group>
  );
};

interface MemoryCorridorProps {
  memories: PostcardData[];
  onBack: () => void;
}

const MemoryCorridor: React.FC<MemoryCorridorProps> = ({ memories, onBack }) => {
  return (
    <>
      <group>
        {memories.map((mem, i) => (
          <PuzzlePiece 
            key={mem.id} 
            data={mem} 
            position={[(i % 3 - 1) * 2.5, (Math.floor(i / 3) * -2.5) + 2, 0]} 
          />
        ))}
      </group>
      
      <Html position={[0, -4, 0]} center>
         <button 
           onClick={onBack}
           className="px-6 py-2 border border-yellow-600 text-yellow-600 font-serif hover:bg-yellow-600/10 transition-all tracking-widest"
         >
           返回入口
         </button>
      </Html>
    </>
  );
};

export default MemoryCorridor;