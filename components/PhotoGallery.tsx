
import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, Text } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMode, PhotoData } from '../types';
import { PHOTOS_DATA } from '../constants';

interface Props {
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

const PhotoItem = ({ 
  data, 
  index, 
  total, 
  mode, 
  cursorPosition, 
  isClicking, 
  isSelected, 
  anySelected, 
  onSelect 
}: PhotoItemProps) => {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useTexture(data.url) as THREE.Texture;
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  // Base orbit parameters
  const radius = 3.5;
  const angleStep = (Math.PI * 2) / total;
  const initialAngle = index * angleStep;

  useFrame((state, delta) => {
    if (!mesh.current) return;

    const time = state.clock.elapsedTime;
    const isExploded = mode === TreeMode.EXPLODED;
    
    // LERP Speeds
    const moveSpeed = delta * 5;
    const rotSpeed = delta * 5;
    const scaleSpeed = delta * 6;

    // --- TARGET STATE CALCULATION ---
    let targetPos = new THREE.Vector3();
    let targetQuat = new THREE.Quaternion();
    let targetScale = 0; // Default hidden

    if (isSelected) {
      // PREVIEW MODE (HUD Style)
      // Position: Fixed distance in front of the camera
      const distanceInFront = 4.0;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      targetPos.copy(camera.position).add(forward.multiplyScalar(distanceInFront));

      // Rotation: Face the camera
      // We calculate the lookAt rotation manually to slerp towards it
      const dummy = new THREE.Object3D();
      dummy.position.copy(targetPos);
      dummy.lookAt(camera.position);
      targetQuat.copy(dummy.quaternion);

      targetScale = 2.0; // Large preview
    } else if (!isExploded || anySelected) {
      // HIDDEN (Tree is Normal OR Another photo selected)
      targetScale = 0;
      if (anySelected) {
         targetPos.set(0, -10, 0); // Drop away
      } else {
         targetPos.set(0, 0, 0); // Inside tree
      }
      targetQuat.identity();
    } else {
      // ORBIT MODE (Exploded, nothing selected)
      const currentAngle = initialAngle + time * 0.2;
      
      targetPos.set(
        Math.sin(currentAngle) * radius,
        Math.sin(time + index) * 0.3, // Gentle bobbing
        Math.cos(currentAngle) * radius
      );

      // Rotation: Face the camera for better visibility
      const dummy = new THREE.Object3D();
      dummy.position.copy(targetPos);
      dummy.lookAt(camera.position);
      targetQuat.copy(dummy.quaternion);
      
      targetScale = hovered ? 1.5 : 1.0; 
    }

    // --- INTERACTION LOGIC ---
    if (isExploded && !anySelected && cursorPosition) {
      const ndcX = (cursorPosition.x * 2) - 1;
      const ndcY = -(cursorPosition.y * 2) + 1;

      const screenPos = mesh.current.position.clone().project(camera);
      const dist = Math.sqrt(
        Math.pow(screenPos.x - ndcX, 2) + 
        Math.pow(screenPos.y - ndcY, 2)
      );

      const isOver = dist < 0.15;
      if (isOver !== hovered) setHovered(isOver);

      if (isOver && isClicking) {
        onSelect(data.id);
      }
    } else {
      if (hovered) setHovered(false);
    }

    // --- APPLY ANIMATION (LERP) ---
    mesh.current.position.lerp(targetPos, moveSpeed);
    mesh.current.quaternion.slerp(targetQuat, rotSpeed);

    const currentScale = mesh.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, scaleSpeed);
    mesh.current.scale.setScalar(newScale);
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
        {/* Glow Border on Hover */}
        {hovered && !isSelected && (
           <mesh position={[0, 0, -0.01]} scale={[1.1, 1.1, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#ffff00" />
           </mesh>
        )}
      </mesh>
    </group>
  );
};

export const PhotoGallery: React.FC<Props> = ({ 
  mode, 
  cursorPosition, 
  isClicking, 
  selectedPhotoId, 
  onPhotoSelect 
}) => {
  return (
    <group>
      {PHOTOS_DATA.map((photo, index) => (
        <PhotoItem
          key={photo.id}
          index={index}
          total={PHOTOS_DATA.length}
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
