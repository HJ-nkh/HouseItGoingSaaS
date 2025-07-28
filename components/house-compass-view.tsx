import React, { useState, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { House } from './house-outline';

// Fixed top-down camera - positioned well above the house
function TopDownCamera({ roofHeight = 5 }: { roofHeight?: number }) {
  const { camera } = useThree();
  
  React.useEffect(() => {
    // Position camera well above the highest point of the house
    // Calculate the actual roof peak height first
    const maxRoofHeight = roofHeight * 2; // Ensure we're well above any roof geometry
    const cameraHeight = maxRoofHeight + 17; // Much higher above the roof
    camera.position.set(0, cameraHeight, 0);
    // Look straight down at the house center
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, -1); // Reset to normal orientation (north up)
    
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 45; // Narrower field of view for better perspective
      camera.updateProjectionMatrix();
    }
  }, [camera, roofHeight]);

  return null; // Camera component doesn't render anything
}

// 3D House component - wrapper around imported House with drag functionality
function House3D({ 
  width = 10, 
  height = 4, 
  depth = 6, 
  roofType = 'duopitch',
  flatRoofEdgeType = 'sharp',
  parapetHeight = 0.5,
  edgeRadius = 0.2,
  bevelAngle = 45,
  roofPitch = 15,
  hippedMainPitch = 15,
  hippedHipPitch = 20,
  rotation = 0,
  onRotationChange
}: {
  width: number;
  height: number;
  depth: number;
  roofType: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  flatRoofEdgeType?: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  roofPitch?: number;
  hippedMainPitch?: number;
  hippedHipPitch?: number;
  rotation: number;
  onRotationChange: (rotation: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, raycaster, pointer } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ angle: 0, rotation: 0 });

  // Drag functionality
  const handlePointerDown = (event: any) => {
    event.stopPropagation();
    setIsDragging(true);
    
    // Calculate current angle from pointer to house center
    raycaster.setFromCamera(pointer, camera);
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const plane = new THREE.Plane(planeNormal, 0);
    const intersection = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      // Convert to wind direction convention: 0° = North, clockwise
      const mathAngle = Math.atan2(intersection.x, -intersection.z) * (180 / Math.PI);
      const windAngle = ((-mathAngle + 90) % 360 + 360) % 360;
      setDragStart({ angle: windAngle, rotation });
    }
  };
  
  const handlePointerMove = () => {
    if (!isDragging) return;
    
    raycaster.setFromCamera(pointer, camera);
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const plane = new THREE.Plane(planeNormal, 0);
    const intersection = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      // Convert to wind direction convention: 0° = North, clockwise
      const mathAngle = Math.atan2(intersection.x, -intersection.z) * (180 / Math.PI);
      const currentWindAngle = ((-mathAngle + 90) % 360 + 360) % 360;
      const deltaAngle = currentWindAngle - dragStart.angle;
      // Fix rotation direction: drag clockwise should rotate clockwise
      const newRotation = ((dragStart.rotation - deltaAngle) % 360 + 360) % 360;
      onRotationChange(newRotation);
    }
  };
  
  const handlePointerUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (groupRef.current) {
      // Convert wind direction (0° = North, clockwise) to Three.js rotation
      // Three.js uses radians and 0° = +Z direction, so we need to convert
      const threeJsRotation = ((-rotation + 90) * Math.PI) / 180;
      groupRef.current.rotation.y = threeJsRotation;
    }
  }, [rotation]);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointermove', handlePointerMove);
      
      return () => {
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointermove', handlePointerMove);
      };
    }
  }, [isDragging, dragStart.angle, dragStart.rotation]);

  return (
    <group 
      ref={groupRef} 
      onPointerDown={handlePointerDown}
    >
      {/* Use the imported House component */}
      <House
        width={width}
        height={height}
        depth={depth}
        roofType={roofType}
        flatRoofEdgeType={flatRoofEdgeType}
        parapetHeight={parapetHeight}
        edgeRadius={edgeRadius}
        bevelAngle={bevelAngle}
        roofPitch={roofPitch}
        hippedMainPitch={hippedMainPitch}
        hippedHipPitch={hippedHipPitch}
        disableRotation={true}
      />
      
      {/* Direction indicator lines - extends from house center in width and depth directions */}
      <group>
        {/* Visible thin red line - width direction */}
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 14]} />
          <meshBasicMaterial color="#FF0000" />
        </mesh>
        
        {/* Arrow head for width direction - pointing towards positive X (when rotation=0, points East) */}
        <mesh position={[7, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.3, 0.8, 8]} />
          <meshBasicMaterial color="#FF0000" />
        </mesh>
        
        {/* Invisible thicker cylinder for easier dragging - width direction */}
        <mesh 
          position={[0, 0.1, 0]} 
          rotation={[0, 0, Math.PI / 2]}
          onPointerDown={handlePointerDown}
        >
          <cylinderGeometry args={[0.2, 0.2, 14]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        
        {/* Visible thin red line - depth direction (90 degrees rotated) */}
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 14]} />
          <meshBasicMaterial color="#FF0000" />
        </mesh>
        
        {/* Arrow head for depth direction - pointing towards positive Z (when rotation=0, points South) */}
        <mesh position={[0, 0.1, 7]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#FF0000" />
        </mesh>
        
        {/* Invisible thicker cylinder for easier dragging - depth direction */}
        <mesh 
          position={[0, 0.1, 0]} 
          rotation={[Math.PI / 2, 0, 0]}
          onPointerDown={handlePointerDown}
        >
          <cylinderGeometry args={[0.2, 0.2, 14]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>
    </group>
  );
}

// Compass directions as HTML overlays
function CompassDirectionsHTML() {
  const directions = [
    { name: 'N', angle: 0, degrees: '0°' },
    { name: 'NNØ', angle: 30, degrees: '30°' },
    { name: 'ØNØ', angle: 60, degrees: '60°' },
    { name: 'Ø', angle: 90, degrees: '90°' },
    { name: 'ØSØ', angle: 120, degrees: '120°' },
    { name: 'SSØ', angle: 150, degrees: '150°' },
    { name: 'S', angle: 180, degrees: '180°' },
    { name: 'SSV', angle: 210, degrees: '210°' },
    { name: 'VSV', angle: 240, degrees: '240°' },
    { name: 'V', angle: 270, degrees: '270°' },
    { name: 'VNV', angle: 300, degrees: '300°' },
    { name: 'NNV', angle: 330, degrees: '330°' }
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {directions.map((dir, index) => {
        const radius = 45; // percentage from center - increased for more space
        const degreesRadius = 35; // percentage from center for degrees - increased
        const angleRad = (dir.angle * Math.PI) / 180;
        const x = 50 + Math.sin(angleRad) * radius; // 50% is center
        const y = 50 - Math.cos(angleRad) * radius; // 50% is center, minus because Y increases downward
        const degreesX = 50 + Math.sin(angleRad) * degreesRadius;
        const degreesY = 50 - Math.cos(angleRad) * degreesRadius;
        
        return (
          <div key={index}>
            {/* Direction name */}
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-95 px-2 py-1 rounded-md text-sm font-semibold text-gray-800 border border-gray-300 shadow-sm min-w-[32px] text-center z-20"
              style={{ 
                left: `${x}%`, 
                top: `${y}%` 
              }}
            >
              {dir.name}
            </div>
            
            {/* Degrees */}
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-blue-50 bg-opacity-90 px-2 py-1 rounded text-xs text-gray-600 shadow-sm min-w-[28px] text-center z-20"
              style={{ 
                left: `${degreesX}%`, 
                top: `${degreesY}%` 
              }}
            >
              {dir.degrees}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompassMarkers() {
  const directions = [
    { angle: 0 }, { angle: 30 }, { angle: 60 }, { angle: 90 },
    { angle: 120 }, { angle: 150 }, { angle: 180 }, { angle: 210 },
    { angle: 240 }, { angle: 270 }, { angle: 300 }, { angle: 330 }
  ];

  return (
    <>
      {directions.map((dir, index) => {
        const radius = 12; // Increased radius to avoid overlap with text
        const angleRad = (dir.angle * Math.PI) / 180;
        const x = Math.sin(angleRad) * radius;
        const z = -Math.cos(angleRad) * radius;
        
        return (
          <mesh key={index} position={[x, 0.05, z]}>
            <cylinderGeometry args={[0.15, 0.15, 0.1]} />
            <meshBasicMaterial color={dir.angle % 90 === 0 ? "#FF5722" : "#999999"} />
          </mesh>
        );
      })}
    </>
  );
}

export default function HouseCompassView({
  width = 24,
  depth = 16,
  height = 12,
  roofType = 'duopitch',
  flatRoofEdgeType = 'sharp',
  parapetHeight = 0.5,
  edgeRadius = 0.2,
  bevelAngle = 45,
  roofPitch = 15,
  hippedMainPitch = 15,
  hippedHipPitch = 20,
  roofHeight = 5,
  rotation = 0,
  onRotationChange
}: {
  width?: number;
  depth?: number;
  height?: number;
  roofType?: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  flatRoofEdgeType?: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  roofPitch?: number;
  hippedMainPitch?: number;
  hippedHipPitch?: number;
  roofHeight?: number;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
}) {
  const [houseRotation, setHouseRotation] = useState(rotation);
  
  // Update house rotation when the rotation prop changes
  React.useEffect(() => {
    setHouseRotation(rotation);
  }, [rotation]);
  
  // Calculate scale factor to ensure house fits within compass view
  // Target maximum dimension is about 8 units to fit nicely within the compass
  const maxTargetDimension = 6;
  const maxActualDimension = Math.max(width, depth);
  const scale = maxTargetDimension / maxActualDimension;
  
  const handleHouseRotationChange = (rotation: number) => {
    setHouseRotation(rotation);
    onRotationChange?.(rotation);
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
      <div className="absolute inset-0 bg-gray-50 rounded border overflow-hidden">
        {/* HTML compass directions overlay */}
        <CompassDirectionsHTML />
        <Canvas style={{ width: '100%', height: '100%' }}>
          <TopDownCamera roofHeight={roofHeight} />
          {/* Ambient lighting - same as house-outline */}
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} />
          {/* Grid background */}
          <gridHelper args={[24, 24, '#CCCCCC', '#EEEEEE']} position={[0, -1, 0]} />
          {/* Compass markers */}
          <CompassMarkers />
          {/* House (draggable for rotation) - using imported House component */}
          <House3D
            width={width * scale}
            depth={depth * scale}
            height={height * scale}
            roofType={roofType}
            flatRoofEdgeType={flatRoofEdgeType}
            parapetHeight={parapetHeight * scale}
            edgeRadius={edgeRadius * scale}
            bevelAngle={bevelAngle}
            roofPitch={roofPitch}
            hippedMainPitch={hippedMainPitch}
            hippedHipPitch={hippedHipPitch}
            rotation={houseRotation}
            onRotationChange={handleHouseRotationChange}
          />
          {/* Center point */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        </Canvas>
      </div>
    </div>
  );
}
