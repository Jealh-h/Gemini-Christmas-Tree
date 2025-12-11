
import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMode, PhotoData } from '../types';

interface Props {
  photos: PhotoData[];
  mode: TreeMode;
  cursorPosition: { x: number; y: number } | null;
  isClicking: boolean; // Mapped to PINCH (OK Gesture)
  selectedPhotoId: string | null;
  onPhotoSelect: (id: string | null) => void;
}

interface PhotoItemProps {
  data: PhotoData;
  index: number;
  total: number;
  mode: TreeMode;
  cursorPosition: { x: number; y: number } | null;
  isClicking: boolean;
  isSelected: boolean;
  anySelected: boolean;
  onSelect: (id: string | null) => void;
}

const PhotoItem: React.FC<PhotoItemProps> = ({ 
  data, 
  index, 
  total, 
  mode, 
  cursorPosition, 
  isClicking, 
  isSelected, 
  anySelected, 
  onSelect 
}) => {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useTexture(data.url) as THREE.Texture;
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  // Aspect Ratio Calculation
  const aspect = useMemo(() => {
     if (texture.image) {
        return texture.image.width / texture.image.height;
     }
     return 1;
  }, [texture]);

  // Track animation scale separately from mesh.scale because mesh.scale includes aspect ratio
  const animScale = useRef(0);

  // Parse initial position from data
  const initialPos = useMemo(() => new THREE.Vector3(...data.position), [data.position]);
  
  // Calculate Ring Position for Exploded Mode
  // We want them on the same horizontal line (Y plane) forming a circle.
  // We use the index to distribute them evenly to avoid overlap.
  const ringPos = useMemo(() => {
      const angle = (index / total) * Math.PI * 2;
      const radius = 5.0; // Radius of the ring
      const height = 2.0; // Height of the ring
      return new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
  }, [index, total]);

  // Reusable objects to avoid GC
  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const targetWorldPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    if (!mesh.current.parent) return;

    // LERP Speeds
    const moveSpeed = delta * 5;
    const rotSpeed = delta * 5;
    const scaleSpeed = delta * 6;

    // --- TARGET STATE CALCULATION ---
    let targetPos = new THREE.Vector3();
    let targetQuat = new THREE.Quaternion();
    let targetBaseScale = 0; 

    if (isSelected) {
      // CENTERED PREVIEW MODE
      const distInFront = 4.0;
      targetWorldPos.copy(camera.position).add(new THREE.Vector3(0, 0, -distInFront).applyQuaternion(camera.quaternion));
      
      // Convert to Local Space
      targetPos.copy(targetWorldPos);
      mesh.current.parent.worldToLocal(targetPos);

      // Rotation: Face Camera
      const localCamPos = camera.position.clone();
      mesh.current.parent.worldToLocal(localCamPos);

      dummyObj.position.copy(targetPos);
      dummyObj.lookAt(localCamPos);
      targetQuat.copy(dummyObj.quaternion);

      // Adjust scale for preview
      targetBaseScale = 2.5; 
      if (aspect > 1.8) targetBaseScale = 2.0; // Reduce size for very wide images

    } else if (mode === TreeMode.NORMAL) {
       // --- HIDE IN NORMAL MODE ---
       targetBaseScale = 0;
       targetPos.copy(initialPos);
       targetQuat.copy(mesh.current.quaternion); // Maintain rotation
    } else if (anySelected && !isSelected) {
       // Hide others when one is selected
       targetBaseScale = 0; 
       targetPos.copy(initialPos);
       targetQuat.copy(mesh.current.quaternion);
    } else {
      // EXPLODED MODE (Ring Orbit)
      targetPos.copy(ringPos);
      
      // Look at camera (billboard effect)
      // Since parent rotates, we calculate lookAt dynamically in local space relative to camera
      const localCamPos = camera.position.clone();
      mesh.current.parent.worldToLocal(localCamPos);

      dummyObj.position.copy(targetPos);
      dummyObj.lookAt(localCamPos);
      targetQuat.copy(dummyObj.quaternion);
      
      targetBaseScale = hovered ? 1.5 : 1.0; 
    }

    // --- INTERACTION LOGIC ---
    // Only calculate hit test if potentially visible AND not in NORMAL (shrinking/assembled) mode
    if (mode !== TreeMode.NORMAL && animScale.current > 0.05) {
        if (cursorPosition) {
           worldPos.copy(mesh.current.position);
           mesh.current.parent.localToWorld(worldPos);
           
           const screenPos = worldPos.project(camera);
           
           const ndcX = (cursorPosition.x * 2) - 1;
           const ndcY = -(cursorPosition.y * 2) + 1;

           const dist = Math.sqrt(
              Math.pow(screenPos.x - ndcX, 2) + 
              Math.pow(screenPos.y - ndcY, 2)
           );

           const isOver = dist < 0.15; // Hit radius
           
           if ((!anySelected || isSelected)) {
               if (isOver !== hovered) setHovered(isOver);
               if (isOver && isClicking) {
                 onSelect(data.id);
               }
           }
        } else {
          if (hovered) setHovered(false);
        }
    } else {
        if (hovered) setHovered(false);
    }

    // --- APPLY ANIMATION (LERP) ---
    mesh.current.position.lerp(targetPos, moveSpeed);
    mesh.current.quaternion.slerp(targetQuat, rotSpeed);

    // Lerp the base scalar value
    animScale.current = THREE.MathUtils.lerp(animScale.current, targetBaseScale, scaleSpeed);
    
    // Apply Aspect Ratio to the final scale
    // Width = BaseScale * Aspect, Height = BaseScale
    mesh.current.scale.set(
        animScale.current * aspect,
        animScale.current,
        1 // Z scale is 1
    );
  });

  return (
    <group>
      <mesh ref={mesh}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial 
          map={texture} 
          side={THREE.DoubleSide} 
          transparent 
          opacity={1}
        />
        {/* Glow Border on Hover - inherits aspect scale from parent */}
        {hovered && !isSelected && (
           <mesh position={[0, 0, -0.01]} scale={[1.08, 1.08, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#ffff00" />
           </mesh>
        )}
      </mesh>
    </group>
  );
};

export const PhotoGallery: React.FC<Props> = ({ 
  photos,
  mode, 
  cursorPosition, 
  isClicking, 
  selectedPhotoId, 
  onPhotoSelect 
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
      if (!groupRef.current) return;

      if (selectedPhotoId) {
          // Stop rotation when viewing a photo
      } else if (mode === TreeMode.NORMAL) {
          // Spin slowly even when hidden
          groupRef.current.rotation.y += delta * 0.15;
      } else if (mode === TreeMode.EXPLODED) {
          // Orbit rotation
          groupRef.current.rotation.y += delta * 0.10; 
      }
  });

  return (
    <group ref={groupRef} position={[0, -1.2, 0]}>
      {photos.map((photo, index) => (
        <PhotoItem
          key={photo.id}
          index={index}
          total={photos.length}
          data={photo}
          mode={mode}
          cursorPosition={cursorPosition}
          isClicking={isClicking}
          isSelected={selectedPhotoId === photo.id}
          anySelected={selectedPhotoId !== null}
          onSelect={onPhotoSelect}
        />
      ))}
    </group>
  );
};
