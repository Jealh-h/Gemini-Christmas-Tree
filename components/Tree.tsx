import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMode } from '../types';
import { PHOTOS_DATA as DATA_CONST } from '../constants';

const PHOTOS = DATA_CONST || [];

interface TreeProps {
  mode: TreeMode;
  onPhotoSelect: (id: string) => void;
  selectedPhotoId: string | null;
  cursorPosition: { x: number, y: number } | null;
  isClicking: boolean;
}

const LIGHT_COLORS = ['#ffaa00', '#ff5500', '#ffcc00', '#ff4400'];

const TreeLights = () => {
    const lightsRef = useRef<(THREE.PointLight | null)[]>([]);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        lightsRef.current.forEach((light, i) => {
            if (light) {
                const noise = Math.sin(t * (2 + (i % 3))) + Math.cos(t * (4.5 + (i % 2)));
                light.intensity = 1.8 + noise * 0.8;
            }
        });
    });

    const lights = useMemo(() => {
        const items = [];
        const count = 16; 
        for(let i=0; i<count; i++) {
            const h = (i / count);
            const y = -1.0 + h * 4.5; 
            const angle = h * Math.PI * 6 + (i * 0.5); 
            const r = 1.4 * (1 - h) + 0.3; 
            
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            items.push({ x, y, z, color: LIGHT_COLORS[i % LIGHT_COLORS.length] });
        }
        return items;
    }, []);

    return (
        <>
            {lights.map((l, i) => (
                <pointLight
                    key={i}
                    ref={(el) => { lightsRef.current[i] = el; }}
                    position={[l.x, l.y, l.z]}
                    color={l.color}
                    distance={5}
                    decay={2}
                    // Shadows disabled to prevent MAX_TEXTURE_IMAGE_UNITS error
                />
            ))}
        </>
    );
};

export const ChristmasTree: React.FC<TreeProps> = ({ mode, onPhotoSelect, selectedPhotoId, cursorPosition, isClicking }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const giftsRef = useRef<THREE.InstancedMesh>(null);
  const ballsRef = useRef<THREE.InstancedMesh>(null);
  const flakesRef = useRef<THREE.InstancedMesh>(null);
  
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null);
  const { camera } = useThree();

  const { leafData, giftData, ballData, flakeData } = useMemo(() => {
    
    const createArrays = () => ({
        pos: [] as number[],
        col: [] as number[],
        exp: [] as number[], 
        rot: [] as number[], 
        scale: [] as number[],
    });

    const leaves = createArrays();
    const gifts = createArrays();
    const balls = createArrays();
    const flakes = createArrays();

    const addItem = (arrays: any, x: number, y: number, z: number, colorHex: string, sx=1, sy=1, sz=1) => {
      const jitter = 0.15;
      const jx = (Math.random() - 0.5) * jitter;
      const jy = (Math.random() - 0.5) * jitter;
      const jz = (Math.random() - 0.5) * jitter;

      arrays.pos.push(x + jx, y + jy, z + jz);

      const c = new THREE.Color(colorHex);
      c.offsetHSL(0, 0.05, (Math.random() - 0.5) * 0.1); 
      arrays.col.push(c.r, c.g, c.b);

      if (arrays.scale) arrays.scale.push(sx, sy, sz);

      arrays.rot.push(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      // Reduced explosion radius to keep particles visible on screen
      const r = 3.0 + Math.random() * 4.0; 
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const ex = r * Math.sin(phi) * Math.cos(theta);
      const ey = r * Math.sin(phi) * Math.sin(theta) + 2.0;
      const ez = r * Math.cos(phi);
      arrays.exp.push(ex, ey, ez);
    };

    const treeHeight = 5.2; 
    const treeBottomY = -1.0;
    const treeBaseRadius = 1.8;

    const greenMain = "#0d5c0d"; 
    const greenLight = "#1a7a1a"; 
    const redPure = "#e60000"; 
    const goldPure = "#ffcc00";
    const snowWhite = "#e0f7fa";
    const giftBlue = "#0044aa";
    const giftGreen = "#006633";

    for (let y = treeBottomY; y < treeBottomY + treeHeight; y += 0.1) {
       const h = (y - treeBottomY) / treeHeight;
       const invH = 1 - h; 
       
       let currentMaxR = (treeBaseRadius) * invH;
       currentMaxR += (Math.sin(y * 10) * 0.25 * invH); 
       currentMaxR = Math.max(0, currentMaxR);

       for (let x = -currentMaxR; x <= currentMaxR; x += 0.12) {
         for (let z = -currentMaxR; z <= currentMaxR; z += 0.12) {
            const dist = Math.sqrt(x*x + z*z);
            
            if (dist < currentMaxR) {
               if (Math.random() < 0.6 && dist > 0.3) continue;

               const rand = Math.random();
               
               if (rand < 0.04 && dist > 0.4 && h < 0.5) {
                   const giftColor = Math.random() > 0.5 ? redPure : (Math.random() > 0.5 ? giftBlue : giftGreen);
                   addItem(gifts, x, y, z, giftColor, 1.3, 1.3, 1.3);
               }
               else if (rand < 0.08 && dist > currentMaxR * 0.7) {
                   addItem(flakes, x, y, z, snowWhite, 0.7, 0.7, 0.7);
               }
               else if (rand < 0.15 && dist > 0.5) {
                   const ballColor = Math.random() > 0.7 ? redPure : goldPure;
                   addItem(balls, x, y, z, ballColor, 1.0, 1.0, 1.0);
               }
               else {
                   const isTip = dist > currentMaxR * 0.8;
                   const color = isTip ? greenLight : greenMain;
                   const s = 0.8 + Math.random() * 0.4;
                   addItem(leaves, x, y, z, color, s, s, s);
               }
            }
         }
       }
    }

    const starY = treeBottomY + treeHeight;
    for(let i=0; i<40; i++) {
        const r = 0.3 * Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = starY + r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        addItem(balls, x, y, z, goldPure, 0.6, 0.6, 0.6);
    }

    const finalize = (arrays: any) => ({
        count: (arrays.pos && arrays.pos.length) ? arrays.pos.length / 3 : 0,
        positions: new Float32Array(arrays.pos || []),
        colors: new Float32Array(arrays.col || []),
        explodedPositions: new Float32Array(arrays.exp || []),
        originalPositions: new Float32Array(arrays.pos || []),
        rotations: new Float32Array(arrays.rot || []),
        scales: new Float32Array(arrays.scale || [])
    });

    return {
        leafData: finalize(leaves),
        giftData: finalize(gifts),
        ballData: finalize(balls),
        flakeData: finalize(flakes),
    };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.y += delta * 0.15;

    const time = state.clock.elapsedTime;
    const isExploded = mode === TreeMode.EXPLODED;
    const safeDelta = Math.min(delta, 0.1);
    const lerpSpeed = safeDelta * 3.0;

    const animateMesh = (ref: React.RefObject<THREE.InstancedMesh>, data: any, baseScale = 1.0, spin = false) => {
        if (!ref.current || !data || !data.count) return;
        const mesh = ref.current;
        const count = data.count;
        
        if (!data.currentPositions) {
            data.currentPositions = Float32Array.from(data.originalPositions);
        }
        const currentPos = data.currentPositions;

        for (let i = 0; i < count; i++) {
            const ix = i * 3; const iy = i * 3 + 1; const iz = i * 3 + 2;
            let tx, ty, tz;

            if (isExploded) {
                tx = data.explodedPositions[ix] + Math.sin(time + iy) * 0.5;
                ty = data.explodedPositions[iy] + Math.cos(time + ix) * 0.5;
                tz = data.explodedPositions[iz] + Math.sin(time * 0.8 + iz) * 0.5;
            } else {
                tx = data.originalPositions[ix];
                ty = data.originalPositions[iy];
                tz = data.originalPositions[iz];
            }

            currentPos[ix] += (tx - currentPos[ix]) * lerpSpeed;
            currentPos[iy] += (ty - currentPos[iy]) * lerpSpeed;
            currentPos[iz] += (tz - currentPos[iz]) * lerpSpeed;

            dummy.position.set(currentPos[ix], currentPos[iy], currentPos[iz]);

            let sx = baseScale, sy = baseScale, sz = baseScale;
            if (data.scales && data.scales.length > 0) {
                sx = data.scales[ix] * baseScale;
                sy = data.scales[iy] * baseScale;
                sz = data.scales[iz] * baseScale;
            }

            if (isExploded) {
                dummy.rotation.set(time + i, time + i, 0);
                // Keep particles visible, scale them down slightly instead of 0
                dummy.scale.set(sx * 0.6, sy * 0.6, sz * 0.6); 
            } else {
                const rx = data.rotations[ix];
                const ry = data.rotations[iy];
                const rz = data.rotations[iz];
                
                if (spin) {
                   dummy.rotation.set(rx + time * 0.5, ry + time * 0.3, rz);
                } else {
                   dummy.rotation.set(rx, ry, rz);
                }
                
                dummy.scale.set(sx, sy, sz);
            }

            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            
            const r = data.colors[ix];
            const g = data.colors[iy];
            const b = data.colors[iz];
            mesh.setColorAt(i, new THREE.Color(r, g, b));
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    animateMesh(leavesRef, leafData, 1.0);
    animateMesh(giftsRef, giftData, 1.0);
    animateMesh(ballsRef, ballData, 1.0);
    animateMesh(flakesRef, flakeData, 1.0, true);

    if (cursorPosition) {
        const cursorClipX = (cursorPosition.x * 2) - 1;
        const cursorClipY = -(cursorPosition.y * 2) + 1;
        let foundHover = null;

        PHOTOS.forEach(photo => {
            const angle = groupRef.current!.rotation.y;
            const x = photo.position[0];
            const y = photo.position[1];
            const z = photo.position[2];

            const worldX = x * Math.cos(angle) + z * Math.sin(angle);
            const worldZ = -x * Math.sin(angle) + z * Math.cos(angle);
            
            const posMultiplier = isExploded ? 2.5 : 1.0;
            const finalX = worldX * posMultiplier;
            const finalY = y * posMultiplier + (-1.2); 
            const finalZ = worldZ * posMultiplier;

            const vec = new THREE.Vector3(finalX, finalY, finalZ);
            vec.project(camera);

            const dist = Math.sqrt(Math.pow(vec.x - cursorClipX, 2) + Math.pow(vec.y - cursorClipY, 2));

            if (dist < 0.15) foundHover = photo.id;
        });

        setHoveredPhoto(foundHover);
        if (foundHover && isClicking && selectedPhotoId !== foundHover) {
            onPhotoSelect(foundHover);
        }
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.2, 0]}> 
      
      {/* 1. LEAVES */}
      <instancedMesh ref={leavesRef} args={[undefined, undefined, leafData.count]} castShadow receiveShadow>
        <tetrahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial 
            roughness={0.8}
            metalness={0.1}
            emissive="#0d5c0d"
            emissiveIntensity={0.2}
            toneMapped={true}
        />
      </instancedMesh>

      {/* 2. GIFTS - Using Standard BoxGeometry for reliability */}
      <instancedMesh ref={giftsRef} args={[undefined, undefined, giftData.count]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial 
            roughness={0.3} 
            metalness={0.6} 
            emissiveIntensity={0.2}
            toneMapped={true} 
        />
      </instancedMesh>

      {/* 3. ORNAMENTS */}
      <instancedMesh ref={ballsRef} args={[undefined, undefined, ballData.count]} castShadow receiveShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
            roughness={0.1} 
            metalness={0.9} 
            emissiveIntensity={2.0}
            toneMapped={false} 
        />
      </instancedMesh>

      {/* 4. SNOWFLAKES */}
      <instancedMesh ref={flakesRef} args={[undefined, undefined, flakeData.count]}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial 
            color="#e0f7fa"
            emissive="#e0f7fa"
            emissiveIntensity={3.0} 
            toneMapped={false}
            transparent
            opacity={0.9}
        />
      </instancedMesh>

      <TreeLights />

    </group>
  );
};
