import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const Snow = ({ count = 3000 }) => {
  const mesh = useRef<THREE.Points>(null);
  
  // Generate random initial positions, speeds, and turbulence offsets
  const { positions, velocities, turbulence } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vels = new Float32Array(count);
    const turb = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Spread snow across a wide area (x: -15 to 15, y: 0 to 20, z: -15 to 10)
      pos[i * 3] = (Math.random() - 0.5) * 30;     // x
      pos[i * 3 + 1] = Math.random() * 20;         // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30; // z
      
      // Random fall speed
      vels[i] = Math.random() * 0.05 + 0.02;
      
      // Random turbulence offset (0 to 2PI)
      turb[i] = Math.random() * Math.PI * 2;
    }
    
    return { positions: pos, velocities: vels, turbulence: turb };
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    
    const time = state.clock.elapsedTime;
    const geometry = mesh.current.geometry;
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      let y = posArray[i * 3 + 1];
      
      // Update Y position (falling down)
      y -= velocities[i];
      posArray[i * 3 + 1] = y;
      
      // Calculate dynamic wind based on height and time
      // Wind is stronger higher up (y > 0)
      const heightFactor = Math.max(0.2, (y + 5) / 20); 
      
      // Unique movement per particle using turbulence array + time
      const windX = Math.sin(time * 0.5 + turbulence[i] + y * 0.1) * 0.01 * heightFactor;
      const windZ = Math.cos(time * 0.3 + turbulence[i] * 0.5 + y * 0.1) * 0.01 * heightFactor;
      
      // Apply wind drift
      posArray[i * 3] += windX;
      posArray[i * 3 + 2] += windZ;
      
      // Reset if below ground
      if (y < -5) {
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