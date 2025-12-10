import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const Snow = ({ count = 3000 }) => {
  const mesh = useRef<THREE.Points>(null);
  
  // Generate random initial positions and speeds for snow particles
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vels = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Spread snow across a wide area (x: -15 to 15, y: 0 to 20, z: -15 to 10)
      pos[i * 3] = (Math.random() - 0.5) * 30;     // x
      pos[i * 3 + 1] = Math.random() * 20;         // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30; // z
      
      // Random fall speed
      vels[i] = Math.random() * 0.05 + 0.02;
    }
    
    return { positions: pos, velocities: vels };
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;
    
    const geometry = mesh.current.geometry;
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Update Y position (falling down)
      posArray[i * 3 + 1] -= velocities[i];
      
      // Add slight horizontal drift (wind)
      posArray[i * 3] += Math.sin(posArray[i * 3 + 1] * 0.5) * 0.005;
      
      // Reset if below ground
      if (posArray[i * 3 + 1] < -5) {
        posArray[i * 3 + 1] = 15; // Reset to top
        posArray[i * 3] = (Math.random() - 0.5) * 30; // Randomize X again
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 30; // Randomize Z again
      }
    }
    
    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="white"
        transparent
        opacity={0.8}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};
