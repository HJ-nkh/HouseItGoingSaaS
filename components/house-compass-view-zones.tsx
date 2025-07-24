import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { House } from './house-outline';

// 3D House component - fixed orientation, no dragging
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
  hippedHipPitch = 20
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
}) {
  const groupRef = useRef<THREE.Group>(null);

  // House always stays in the same orientation (depth pointing east/west)
  // Rotated 90 degrees counter-clockwise from the original orientation
  React.useEffect(() => {
    if (groupRef.current) {
      // House stays fixed - depth dimension points east/west (90° counter-clockwise)
      groupRef.current.rotation.y = Math.PI / 2; // 90 degrees counter-clockwise
    }
  }, []);

  return (
    <group ref={groupRef}>
      {/* Use the imported House component - fixed orientation */}
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
      
      {/* Direction indicator lines - fixed to show house orientation */}
      <group>
        {/* Visible thin red line - width direction (now north/south after 90° rotation) */}
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 14]} />
          <meshBasicMaterial color="#FF0000" />
        </mesh>
        
        {/* Visible thin red line - depth direction (now east/west after 90° rotation) */}
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 14]} />
          <meshBasicMaterial color="#FF0000" />
        </mesh>
        
        {/* Dashed lines at 45-degree angles from wall intersections */}
        {/* Right wall intersection (North) - two 45° lines relative to north-south red line */}
        <group position={[0, 0.1, depth / 2]}>
          {/* 45° to the east (right when looking north) */}
          <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.01, 0.01, 8]} />
            <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
          </mesh>
          {/* 45° to the west (left when looking north) */}
          <mesh rotation={[Math.PI / 2, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.01, 0.01, 8]} />
            <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
          </mesh>
        </group>
        
        {/* Left wall intersection (South) - two 45° lines relative to north-south red line */}
        <group position={[0, 0.1, -depth / 2]}>
          {/* 45° to the east (right when looking south) */}
          <mesh rotation={[Math.PI / 2, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.01, 0.01, 8]} />
            <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
          </mesh>
          {/* 45° to the west (left when looking south) */}
          <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.01, 0.01, 8]} />
            <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
          </mesh>
        </group>
        
        {/* Upward pointing wall intersection - two 45° lines relative to east-west red line */}
        <group position={[width / 2, 0.1, 0]}>
          {/* 45° to the north (right when looking east) */}
          <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.01, 0.01, 8]} />
            <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
          </mesh>
          {/* 45° to the south (left when looking east) */}
          <mesh rotation={[Math.PI / 2, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.01, 0.01, 8]} />
            <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
          </mesh>
        </group>
        
        {/* Downward pointing wall intersection - two 45° lines relative to east-west red line */}
        <group position={[-width / 2, 0.1, 0]}>
          {/* 45° to the north (left when looking west) */}
          <mesh rotation={[Math.PI / 2, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.01, 0.01, 8]} />
            <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
          </mesh>
          {/* 45° to the south (right when looking west) */}
          <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.01, 0.01, 8]} />
            <meshBasicMaterial color="#0066FF" transparent opacity={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// Compass directions as HTML overlays - rotates with house direction from settings
function CompassDirectionsHTML({ houseRotation = 0 }: { houseRotation?: number }) {
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
        
        // Apply house rotation to compass direction
        // Use negative house rotation to rotate compass in opposite direction
        const adjustedAngle = (dir.angle - houseRotation + 360) % 360;
        const angleRad = (adjustedAngle * Math.PI) / 180;
        
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

// 2D House walls overlay - hover to reveal wall outlines
function HouseWallsOverlay({ 
  width, 
  depth, 
  scale 
}: { 
  width: number; 
  depth: number; 
  scale: number; 
}) {
  const [hoveredWall, setHoveredWall] = useState<string | null>(null);
  
  // Calculate scaled dimensions - these match exactly what's passed to House3D
  const scaledWidth = width * scale;
  const scaledDepth = depth * scale;
  
  // Calculate the actual orthographic camera visible bounds
  // With zoom=30, the orthographic camera shows a specific area
  // The orthographic frustum size is calculated as: size = 2 / zoom (for normalized coordinates)
  // But Three.js orthographic camera with zoom=30 approximately shows ±(1/zoom) * some_factor
  // Based on testing, zoom=30 shows approximately ±8 units
  const cameraZoom = 30;
  const visibleBounds = 8; // Empirically determined for zoom=30
  
  // Convert 3D world position to screen percentage (0-100)
  const project3DToScreen = (x: number, z: number) => {
    // Clamp coordinates to visible bounds to avoid overflow
    const clampedX = Math.max(-visibleBounds, Math.min(visibleBounds, x));
    const clampedZ = Math.max(-visibleBounds, Math.min(visibleBounds, z));
    
    // Map world coordinates to screen percentage
    // x: [-visibleBounds, +visibleBounds] → [0, 100]
    // z: [-visibleBounds, +visibleBounds] → [100, 0] (inverted Y for SVG)
    const screenX = ((clampedX + visibleBounds) / (visibleBounds * 2)) * 100;
    const screenY = ((visibleBounds - clampedZ) / (visibleBounds * 2)) * 100;
    
    return { x: screenX, y: screenY };
  };
  
  
  // Wall positions in 3D world coordinates (after house 90° rotation)
  // The house is rotated 90° counter-clockwise, so:
  // - House width becomes north/south direction (Z-axis in world)
  // - House depth becomes east/west direction (X-axis in world)
  const wall3DPositions = [
    {
      id: 'up',
      name: 'Op væg',
      // Top wall (north) spans east-west at Z = +scaledWidth/2 (width became north-south)
      start3D: { x: -scaledDepth/2, z: scaledWidth/2 },
      end3D: { x: scaledDepth/2, z: scaledWidth/2 },
    },
    {
      id: 'down', 
      name: 'Ned væg',
      // Bottom wall (south) spans east-west at Z = -scaledWidth/2
      start3D: { x: -scaledDepth/2, z: -scaledWidth/2 },
      end3D: { x: scaledDepth/2, z: -scaledWidth/2 },
    },
    {
      id: 'right',
      name: 'Højre væg', 
      // Right wall (east) spans north-south at X = +scaledDepth/2 (depth became east-west)
      start3D: { x: scaledDepth/2, z: scaledWidth/2 },
      end3D: { x: scaledDepth/2, z: -scaledWidth/2 },
    },
    {
      id: 'left',
      name: 'Venstre væg',
      // Left wall (west) spans north-south at X = -scaledDepth/2
      start3D: { x: -scaledDepth/2, z: scaledWidth/2 },
      end3D: { x: -scaledDepth/2, z: -scaledWidth/2 },
    }
  ];

  // Convert 3D positions to screen coordinates
  const walls = wall3DPositions.map(wall => {
    const start2D = project3DToScreen(wall.start3D.x, wall.start3D.z);
    const end2D = project3DToScreen(wall.end3D.x, wall.end3D.z);
    
    return {
      id: wall.id,
      name: wall.name,
      x1: start2D.x,
      y1: start2D.y,
      x2: end2D.x,
      y2: end2D.y,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-15">
      <svg 
        className="w-full h-full pointer-events-auto" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        {walls.map((wall) => (
          <g key={wall.id}>
            {/* Invisible hover area (thicker line) */}
            <line
              x1={wall.x1}
              y1={wall.y1}
              x2={wall.x2}
              y2={wall.y2}
              stroke="transparent"
              strokeWidth="4"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredWall(wall.id)}
              onMouseLeave={() => setHoveredWall(null)}
              style={{ pointerEvents: 'stroke' }}
            />
            {/* Visible line when hovered */}
            {hoveredWall === wall.id && (
              <line
                x1={wall.x1}
                y1={wall.y1}
                x2={wall.x2}
                y2={wall.y2}
                stroke="#FF0000"
                strokeWidth="1.5"
                opacity="1"
                className="pointer-events-none"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function CompassMarkers({ houseRotation = 0 }: { houseRotation?: number }) {
  const directions = [
    { angle: 0 }, { angle: 30 }, { angle: 60 }, { angle: 90 },
    { angle: 120 }, { angle: 150 }, { angle: 180 }, { angle: 210 },
    { angle: 240 }, { angle: 270 }, { angle: 300 }, { angle: 330 }
  ];

  return (
    <>
      {directions.map((dir, index) => {
        const radius = 12; // Increased radius to avoid overlap with text
        
        // Apply house rotation to marker positions
        // Use negative house rotation to rotate compass in opposite direction
        const adjustedAngle = (dir.angle - houseRotation + 360) % 360;
        const angleRad = (adjustedAngle * Math.PI) / 180;
        
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

export default function HouseCompassViewZones({
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

  return (
    <div className="relative w-full h-full bg-gray-50 rounded border">
      {/* HTML compass directions overlay */}
      <CompassDirectionsHTML houseRotation={houseRotation} />
      
      {/* 2D House walls overlay */}
      <HouseWallsOverlay 
        width={width} 
        depth={depth} 
        scale={scale} 
      />
      
      <Canvas 
        orthographic
        camera={{ 
          position: [0, roofHeight * 2 + 17, 0], 
          zoom: 30,
          up: [0, 0, -1]
        }}
      >
        {/* Ambient lighting - same as house-outline */}
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} />
        
        {/* Grid background */}
        <gridHelper args={[24, 24, '#CCCCCC', '#EEEEEE']} position={[0, -1, 0]} />
        
        {/* Compass markers */}
        <CompassMarkers houseRotation={houseRotation} />
        
        {/* House (fixed orientation) - using imported House component */}
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
        />
        
        {/* Center point */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.05]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
      </Canvas>
    </div>
  );
}
