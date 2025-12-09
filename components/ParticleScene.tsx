import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleConfig } from '../types';

// Custom Shader Material for particles
const ParticleShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: 2.0 },
    uAudio: { value: 0.0 }, // Audio reactivity
    uTexture: { value: null },
    uColor: { value: new THREE.Color('#ffffff') },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uDispersion: { value: 0.0 },
    uCurvature: { value: 0.0 },
    uRoughness: { value: 1.0 }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uSize;
    uniform float uAudio;
    uniform float uDispersion;
    uniform float uCurvature;
    uniform float uRoughness;
    uniform vec2 uMouse;
    attribute vec3 originalPos;
    attribute vec3 color;
    attribute float sizeRandom;
    attribute vec2 uvPos; // Normalized position -0.5 to 0.5
    
    varying vec3 vColor;
    varying float vAlpha;
    varying float vHover;

    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; 
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857; 
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ ); 
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vColor = color;
      vec3 pos = originalPos;

      // Base Noise
      float noiseVal = snoise(vec3(pos.x * 0.4, pos.y * 0.4, uTime * 0.3));
      
      // --- Organic Radial Edge Dissipation ---
      // Distance from center (0,0) of UVs
      float dist = length(uvPos); 
      
      // Complex noise for the edge shape
      float edgeNoise = snoise(vec3(uvPos * 4.0, uTime * 0.15)) * 0.15;
      edgeNoise += snoise(vec3(uvPos * 10.0, uTime * 0.2)) * 0.05;
      
      // Dynamic Threshold: roughly 0.45 creates a circle fitting in the 0.5x0.5 UV space (since UV is -0.5 to 0.5, max dist is ~0.707)
      // We want edges to fade out organically around radius 0.4 to 0.5
      float threshold = 0.4 + edgeNoise;
      
      // Calculate alpha based on distance vs threshold
      float edgeAlpha = 1.0 - smoothstep(threshold - 0.1, threshold + 0.05, dist);

      // Scatter particles that are fading out
      if (edgeAlpha < 0.9) {
         float scatterFactor = (1.0 - edgeAlpha);
         pos.z += noiseVal * 4.0 * scatterFactor; 
         pos.x += (uvPos.x / dist) * scatterFactor * 1.5; // Push outward radially
         pos.y += (uvPos.y / dist) * scatterFactor * 1.5;
      }
      // -----------------------------

      // Standard Movement (Roughness/Breathing)
      float movement = (noiseVal * 0.8 + (uAudio * 8.0 * noiseVal));
      pos.z += movement * uRoughness;
      
      // Curvature
      float distFromCenter = length(pos.xy);
      pos.z -= (distFromCenter * distFromCenter) * uCurvature * 0.15;
      
      // Dispersion
      pos += normal * uDispersion * noiseVal * 4.0;

      // Mouse Interaction
      vec2 distortedPos = pos.xy + vec2(
          snoise(vec3(pos.xy * 2.0, uTime)),
          snoise(vec3(pos.xy * 2.0 + 100.0, uTime))
      ) * 1.5;

      float organicDist = distance(uMouse, distortedPos);
      float influence = 1.0 - smoothstep(0.0, 3.5, organicDist);
      
      pos.z += influence * 4.0 * (0.8 + 0.4 * noiseVal);

      vHover = influence;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      gl_PointSize = uSize * sizeRandom * (12.0 / -mvPosition.z);
      gl_PointSize *= (1.0 + vHover * 1.0);
      
      vAlpha = edgeAlpha; 
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    varying float vHover;
    
    void main() {
      // Hard discard for fully dissipated particles
      if (vAlpha < 0.05) discard;

      vec2 coord = gl_PointCoord - vec2(0.5);
      float r = length(coord);
      if (r > 0.5) discard;
      
      float particleInternalAlpha = 1.0 - smoothstep(0.3, 0.5, r);

      vec3 glowColor = vec3(1.0, 0.85, 0.5); 
      vec3 finalColor = mix(vColor, glowColor, vHover * 0.6);
      
      if (vHover > 0.2) {
         finalColor += vec3(0.15 * vHover);
      }

      // Final alpha combines particle shape + edge dissipation
      gl_FragColor = vec4(finalColor, 0.8 * particleInternalAlpha * vAlpha);
    }
  `
};

interface ParticleSceneProps {
  imageUrl: string;
  config: ParticleConfig;
  audioData: number; // 0 to 1 normalized
}

const ParticleScene: React.FC<ParticleSceneProps> = ({ imageUrl, config, audioData }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, mouse } = useThree();

  // Generate particles from image
  const { positions, colors, sizes, uvs } = useMemo(() => {
    const count = 25000; 
    return { 
        positions: new Float32Array(count * 3), 
        colors: new Float32Array(count * 3), 
        sizes: new Float32Array(count),
        uvs: new Float32Array(count * 2) // For edge calculation
    };
  }, []);

  // Effect to sample image color when URL changes
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const width = 180; 
      const height = (img.height / img.width) * width;
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      
      const count = width * height;
      const posArray = new Float32Array(count * 3);
      const colArray = new Float32Array(count * 3);
      const sizeArray = new Float32Array(count);
      const uvArray = new Float32Array(count * 2);
      
      for(let i = 0; i < count; i++) {
        const i4 = i * 4;
        const r = data[i4] / 255;
        const g = data[i4 + 1] / 255;
        const b = data[i4 + 2] / 255;
        const a = data[i4 + 3] / 255;
        
        if (a < 0.1) {
            posArray[i*3] = 0; posArray[i*3+1] = 0; posArray[i*3+2] = 5000; 
            continue;
        }

        const x = (i % width) / width - 0.5;
        const y = 0.5 - (Math.floor(i / width) / height);
        
        posArray[i * 3] = x * 12;
        posArray[i * 3 + 1] = y * 12 * (height/width);
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.5; 
        
        // Store Normalized coordinates for shader edge calculation
        uvArray[i * 2] = x; // -0.5 to 0.5
        uvArray[i * 2 + 1] = y; // -0.5 to 0.5
        
        colArray[i * 3] = r;
        colArray[i * 3 + 1] = g;
        colArray[i * 3 + 2] = b;
        
        sizeArray[i] = Math.random();
      }

      if(pointsRef.current) {
        pointsRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        pointsRef.current.geometry.setAttribute('originalPos', new THREE.BufferAttribute(posArray, 3)); 
        pointsRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
        pointsRef.current.geometry.setAttribute('sizeRandom', new THREE.BufferAttribute(sizeArray, 1));
        pointsRef.current.geometry.setAttribute('uvPos', new THREE.BufferAttribute(uvArray, 2));
        
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
        pointsRef.current.geometry.attributes.color.needsUpdate = true;
        pointsRef.current.geometry.attributes.uvPos.needsUpdate = true;
      }
    }
  }, [imageUrl]);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      shaderRef.current.uniforms.uAudio.value = THREE.MathUtils.lerp(shaderRef.current.uniforms.uAudio.value, audioData, 0.1);
      shaderRef.current.uniforms.uSize.value = config.size;
      shaderRef.current.uniforms.uDispersion.value = config.dispersion;
      shaderRef.current.uniforms.uCurvature.value = config.curvature;
      shaderRef.current.uniforms.uRoughness.value = config.roughness;
      
      shaderRef.current.uniforms.uMouse.value.x = THREE.MathUtils.lerp(shaderRef.current.uniforms.uMouse.value.x, mouse.x * 14, 0.1);
      shaderRef.current.uniforms.uMouse.value.y = THREE.MathUtils.lerp(shaderRef.current.uniforms.uMouse.value.y, mouse.y * 14, 0.1);
    }
    
    if (pointsRef.current) {
       const time = state.clock.elapsedTime;
       pointsRef.current.rotation.y = Math.sin(time * 0.1) * 0.15;
       pointsRef.current.rotation.x = Math.cos(time * 0.08) * 0.05;
       pointsRef.current.rotation.z = Math.sin(time * 0.05) * 0.03;
    }
  });

  return (
    <points ref={pointsRef} rotation={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-originalPos" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-sizeRandom" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-uvPos" count={uvs.length / 2} array={uvs} itemSize={2} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[ParticleShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ParticleScene;