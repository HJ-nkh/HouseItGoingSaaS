import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface HouseOutlineProps {
  width?: number;
  height?: number;
  depth?: number;
  roofType?: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  flatRoofEdgeType?: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  roofPitch?: number;
  hippedMainPitch?: number;  // Hældning langs facaderne
  hippedHipPitch?: number;   // Hældning på valmene i enderne
  disableRotation?: boolean; // Whether to disable auto-rotation
}

// Camera controller component to automatically adjust camera based on building size
function CameraController({ width, height, depth }: { width: number; height: number; depth: number }) {
  const { camera } = useThree();
  
  useEffect(() => {
    // Calculate the bounding box of the entire house including roof
    const maxHorizontal = Math.max(width, depth);
    const totalHeight = height;
    
    // Calculate optimal camera distance to fit the entire house in view
    // We need to account for the viewing angle (fov) and ensure all edges are visible
    const fov = (camera as THREE.PerspectiveCamera).fov || 50;
    const fovRadians = (fov * Math.PI) / 180;
    
    // Calculate distance needed to fit the largest dimension in view
    const maxDimension = Math.max(maxHorizontal, totalHeight);
    const cameraDistance = (maxDimension / 2) / Math.tan(fovRadians / 2);
    
    // Add extra margin to ensure full visibility (multiply by 1.8 for slightly larger appearance)
    const finalDistance = cameraDistance * 1.4;
    
    // Position camera at optimal distance with good viewing angle
    camera.position.set(
      finalDistance * 0.7,   // Slightly to the side
      finalDistance * 0.5,   // Above the house
      finalDistance * 0.7    // Angled view
    );
    
    // Point camera at the center of the house (mid-height for better view)
    camera.lookAt(0, height * 0.4, 0);
    
    // Update camera projection matrix
    camera.updateProjectionMatrix();
  }, [camera, width, height, depth]);
  
  return null;
}

/**
 * Simple 3D house with duopitch roof - WITHOUT @react-three/drei to avoid compatibility issues
 * - width  – overall building width (X-axis)
 * - height – overall height to the ridge (Y-axis)
 * - depth  – overall building depth (Z-axis)
 */
export function House({ 
  width = 10, 
  height = 4, 
  depth = 6, 
  roofType = 'duopitch',
  flatRoofEdgeType = 'sharp',
  parapetHeight,
  edgeRadius,
  bevelAngle,
  roofPitch,
  hippedMainPitch,
  hippedHipPitch,
  disableRotation = false
}: HouseOutlineProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Adjust height if rounded edge is selected - subtract radius from total height
  const adjustedHeight = roofType === 'flat' && flatRoofEdgeType === 'rounded' 
    ? height - (edgeRadius || 0.2) 
    : height;
  
  const wallHeight = adjustedHeight * 0.6; // 60% of adjusted height for walls
  const roofHeight = adjustedHeight - wallHeight;

  // Auto-rotate the house (only if rotation is not disabled)
  useFrame((_, delta) => {
    if (!disableRotation && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  // Define geometry using useMemo for performance
  const { wallsGeometry, roofGeometry, flatRoofOnlyGeometry, customRoofLines, parapetGeometry, roundedEdgesGeometry, arrowGeometry } = useMemo(() => {
    // For monopitch roof, calculate adjusted wall height to ensure total height matches input
    let adjustedWallHeightForMonopitch = wallHeight;
    if (roofType === 'monopitch') {
      // Calculate roof height based on pitch angle and depth to maintain constant pitch
      const pitchAngle = (roofPitch || 15) * Math.PI / 180;
      const roofHeightFromPitch = depth * Math.tan(pitchAngle);
      // Adjust wall height so total height matches input
      adjustedWallHeightForMonopitch = adjustedHeight - roofHeightFromPitch;
    }
    
    // For duopitch roof, calculate adjusted wall height to ensure total height matches input
    let adjustedWallHeightForDuopitch = wallHeight;
    if (roofType === 'duopitch' && roofPitch) {
      // Calculate roof height based on pitch angle and half depth (from edge to ridge)
      const pitchAngle = roofPitch * Math.PI / 180;
      const roofHeightFromPitch = (depth / 2) * Math.tan(Math.abs(pitchAngle));
      
      if (roofPitch >= 0) {
        // Positive pitch: height to ridge (normal saddle roof)
        adjustedWallHeightForDuopitch = adjustedHeight - roofHeightFromPitch;
      } else {
        // Negative pitch: height to facades (inverted saddle roof)
        // The input height is already the height to facades, so wall height is the input height
        adjustedWallHeightForDuopitch = adjustedHeight;
      }
    }
    
    // For hipped roof, calculate adjusted wall height to ensure total height matches input
    let adjustedWallHeightForHipped = wallHeight;
    if (roofType === 'hipped' && hippedMainPitch) {
      // Calculate roof height based on main pitch angle and half depth (from edge to ridge)
      const mainPitchAngle = hippedMainPitch * Math.PI / 180;
      const roofHeightFromPitch = (depth / 2) * Math.tan(mainPitchAngle);
      // Adjust wall height so total height matches input (height to ridge)
      adjustedWallHeightForHipped = adjustedHeight - roofHeightFromPitch;
    }
    
    // Create wall geometry - adjust height and potentially top faces for rounded roof
    const wallHeightAdjusted = roofType === 'flat' && flatRoofEdgeType === 'rounded' 
      ? wallHeight + 0.01  // Extend walls slightly to overlap with rounded edges
      : roofType === 'flat' && flatRoofEdgeType === 'beveled'
      ? wallHeight - (0.5 * Math.tan((bevelAngle || 45) * Math.PI / 180)) // Reduce wall height by bevel triangle height
      : roofType === 'monopitch'
      ? adjustedWallHeightForMonopitch  // Use adjusted wall height for monopitch
      : roofType === 'duopitch' && roofPitch
      ? adjustedWallHeightForDuopitch   // Use adjusted wall height for duopitch
      : roofType === 'hipped' && hippedMainPitch
      ? adjustedWallHeightForHipped     // Use adjusted wall height for hipped
      : wallHeight;
    
    let walls: THREE.BufferGeometry;
    
    if (roofType === 'flat' && flatRoofEdgeType === 'rounded') {
      // For rounded roof, create custom wall geometry without top faces to avoid visible seams
      walls = new THREE.BufferGeometry();
      const wallVertices: number[] = [];
      
      const hw = width / 2;
      const hh = wallHeightAdjusted / 2;
      const hd = depth / 2;
      
      // Front wall
      wallVertices.push(
        -hw, -hh, -hd,  // bottom left
        -hw, hh, -hd,   // top left
        hw, -hh, -hd,   // bottom right
        
        hw, -hh, -hd,   // bottom right
        -hw, hh, -hd,   // top left
        hw, hh, -hd,    // top right
      );
      
      // Back wall
      wallVertices.push(
        -hw, -hh, hd,   // bottom left
        hw, -hh, hd,    // bottom right
        -hw, hh, hd,    // top left
        
        hw, -hh, hd,    // bottom right
        hw, hh, hd,     // top right
        -hw, hh, hd,    // top left
      );
      
      // Left wall
      wallVertices.push(
        -hw, -hh, -hd,  // bottom front
        -hw, -hh, hd,   // bottom back
        -hw, hh, -hd,   // top front
        
        -hw, hh, -hd,   // top front
        -hw, -hh, hd,   // bottom back
        -hw, hh, hd,    // top back
      );
      
      // Right wall
      wallVertices.push(
        hw, -hh, -hd,   // bottom front
        hw, hh, -hd,    // top front
        hw, -hh, hd,    // bottom back
        
        hw, hh, -hd,    // top front
        hw, hh, hd,     // top back
        hw, -hh, hd,    // bottom back
      );
      
      // Bottom face only (no top face to avoid seams)
      wallVertices.push(
        -hw, -hh, -hd,  // front left
        hw, -hh, -hd,   // front right
        -hw, -hh, hd,   // back left
        
        hw, -hh, -hd,   // front right
        hw, -hh, hd,    // back right
        -hw, -hh, hd,   // back left
      );
      
      const wallVertexArray = new Float32Array(wallVertices);
      walls.setAttribute('position', new THREE.BufferAttribute(wallVertexArray, 3));
      walls.computeVertexNormals();
    } else if (roofType === 'duopitch' && roofPitch && roofPitch < 0) {
      // For negative pitch duopitch (inverted saddle), create custom wall geometry without top face
      // BUT with gable walls that follow the roof profile (saddle shape) to close the gable ends
      walls = new THREE.BufferGeometry();
      const wallVertices: number[] = [];
      
      const hw = width / 2;
      const hh = wallHeightAdjusted / 2;
      const hd = depth / 2;
      
      // Calculate roof height for the saddle shape
      const pitchAngle = roofPitch * Math.PI / 180;
      const actualRoofHeight = (depth / 2) * Math.tan(Math.abs(pitchAngle));
      
      // Front wall - full height
      wallVertices.push(
        -hw, -hh, -hd,  // bottom left
        -hw, hh, -hd,   // top left
        hw, -hh, -hd,   // bottom right
        
        hw, -hh, -hd,   // bottom right
        -hw, hh, -hd,   // top left
        hw, hh, -hd,    // top right
      );
      
      // Back wall - full height
      wallVertices.push(
        -hw, -hh, hd,   // bottom left
        hw, -hh, hd,    // bottom right
        -hw, hh, hd,    // top left
        
        hw, -hh, hd,    // bottom right
        hw, hh, hd,     // top right
        -hw, hh, hd,    // top left
      );
      
      // Left gable wall - following the roof profile (saddle shape)
      // From bottom left front, up to facade height, then following saddle curve to ridge, then back up to facade height at back
      wallVertices.push(
        // Lower part of gable (from bottom to facade level at front)
        -hw, -hh, -hd,                    // bottom front
        -hw, hh, -hd,                     // facade height front
        -hw, -hh, 0,                      // bottom center (ridge level)
        
        -hw, hh, -hd,                     // facade height front
        -hw, hh - actualRoofHeight, 0,    // ridge height center (below facade level)
        -hw, -hh, 0,                      // bottom center
        
        // Upper part of gable (from ridge back to facade level at back)
        -hw, -hh, 0,                      // bottom center
        -hw, hh - actualRoofHeight, 0,    // ridge height center
        -hw, -hh, hd,                     // bottom back
        
        -hw, hh - actualRoofHeight, 0,    // ridge height center
        -hw, hh, hd,                      // facade height back
        -hw, -hh, hd,                     // bottom back
      );
      
      // Right gable wall - following the roof profile (saddle shape)
      wallVertices.push(
        // Lower part of gable (from bottom to facade level at front)
        hw, -hh, -hd,                     // bottom front
        hw, -hh, 0,                       // bottom center
        hw, hh, -hd,                      // facade height front
        
        hw, hh, -hd,                      // facade height front
        hw, -hh, 0,                       // bottom center
        hw, hh - actualRoofHeight, 0,     // ridge height center
        
        // Upper part of gable (from ridge back to facade level at back)
        hw, -hh, 0,                       // bottom center
        hw, -hh, hd,                      // bottom back
        hw, hh - actualRoofHeight, 0,     // ridge height center
        
        hw, hh - actualRoofHeight, 0,     // ridge height center
        hw, -hh, hd,                      // bottom back
        hw, hh, hd,                       // facade height back
      );
      
      // Bottom face only (no top face to leave saddle area open)
      wallVertices.push(
        -hw, -hh, -hd,  // front left
        hw, -hh, -hd,   // front right
        -hw, -hh, hd,   // back left
        
        hw, -hh, -hd,   // front right
        hw, -hh, hd,    // back right
        -hw, -hh, hd,   // back left
      );
      
      const wallVertexArray = new Float32Array(wallVertices);
      walls.setAttribute('position', new THREE.BufferAttribute(wallVertexArray, 3));
      walls.computeVertexNormals();
    } else {
      // Standard box geometry for other roof types
      walls = new THREE.BoxGeometry(width, wallHeightAdjusted, depth);
    }

    // Create roof geometry based on roof type
    let roofGeom: THREE.BufferGeometry;
    let flatRoofOnlyGeom: THREE.BufferGeometry | null = null;
    let customLines: THREE.BufferGeometry | null = null;
    let parapetGeom: THREE.BufferGeometry | null = null;
    let roundedEdgesGeom: THREE.BufferGeometry | null = null;
    let arrowGeom: THREE.BufferGeometry | null = null;

    if (roofType === 'flat') {
      // Flat roof with different edge types
      roofGeom = new THREE.BufferGeometry();
      
      if (flatRoofEdgeType === 'sharp') {
        // Simple flat roof - just the top surface
        const vertices = new Float32Array([
          // Top flat surface
          -width/2, 0, -depth/2,    // front left
          -width/2, 0, depth/2,     // back left
          width/2, 0, -depth/2,     // front right
          
          width/2, 0, -depth/2,     // front right
          -width/2, 0, depth/2,     // back left
          width/2, 0, depth/2,      // back right
        ]);
        roofGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        roofGeom.computeVertexNormals();
      } else if (flatRoofEdgeType === 'parapet') {
        // Flat roof with parapet walls - create separate geometries for roof and parapet
        const pHeight = parapetHeight || 0.3; // Default 30cm parapet
        const parapetThickness = 0.1; // 10cm thick parapet walls
        
        // Main roof surface (inset to show the parapet around it)
        const vertices = new Float32Array([
          // Top flat surface (slightly inset to show parapet edge)
          -width/2 + parapetThickness, 0, -depth/2 + parapetThickness,    // front left
          -width/2 + parapetThickness, 0, depth/2 - parapetThickness,     // back left
          width/2 - parapetThickness, 0, -depth/2 + parapetThickness,     // front right
          
          width/2 - parapetThickness, 0, -depth/2 + parapetThickness,     // front right
          -width/2 + parapetThickness, 0, depth/2 - parapetThickness,     // back left
          width/2 - parapetThickness, 0, depth/2 - parapetThickness,      // back right
        ]);
        roofGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        roofGeom.computeVertexNormals();
        
        // Create parapet walls geometry
        parapetGeom = new THREE.BufferGeometry();
        const parapetVertices = new Float32Array([
          // Front parapet wall - outer face
          -width/2, 0, -depth/2,                              // bottom left
          -width/2, pHeight, -depth/2,                        // top left
          width/2, 0, -depth/2,                               // bottom right
          
          width/2, 0, -depth/2,                               // bottom right
          -width/2, pHeight, -depth/2,                        // top left
          width/2, pHeight, -depth/2,                         // top right
          
          // Front parapet wall - inner face
          -width/2 + parapetThickness, pHeight, -depth/2 + parapetThickness, // top left inner
          -width/2 + parapetThickness, 0, -depth/2 + parapetThickness,       // bottom left inner
          width/2 - parapetThickness, pHeight, -depth/2 + parapetThickness,  // top right inner
          
          width/2 - parapetThickness, pHeight, -depth/2 + parapetThickness,  // top right inner
          -width/2 + parapetThickness, 0, -depth/2 + parapetThickness,       // bottom left inner
          width/2 - parapetThickness, 0, -depth/2 + parapetThickness,        // bottom right inner
          
          // Front parapet wall - top
          -width/2, pHeight, -depth/2,                        // outer left
          -width/2 + parapetThickness, pHeight, -depth/2 + parapetThickness, // inner left
          width/2, pHeight, -depth/2,                         // outer right
          
          width/2, pHeight, -depth/2,                         // outer right
          -width/2 + parapetThickness, pHeight, -depth/2 + parapetThickness, // inner left
          width/2 - parapetThickness, pHeight, -depth/2 + parapetThickness,  // inner right
          
          // Back parapet wall - outer face
          -width/2, 0, depth/2,                               // bottom left
          width/2, 0, depth/2,                                // bottom right
          -width/2, pHeight, depth/2,                         // top left
          
          width/2, 0, depth/2,                                // bottom right
          width/2, pHeight, depth/2,                          // top right
          -width/2, pHeight, depth/2,                         // top left
          
          // Back parapet wall - inner face
          -width/2 + parapetThickness, 0, depth/2 - parapetThickness,        // bottom left inner
          -width/2 + parapetThickness, pHeight, depth/2 - parapetThickness,  // top left inner
          width/2 - parapetThickness, 0, depth/2 - parapetThickness,         // bottom right inner
          
          width/2 - parapetThickness, 0, depth/2 - parapetThickness,         // bottom right inner
          -width/2 + parapetThickness, pHeight, depth/2 - parapetThickness,  // top left inner
          width/2 - parapetThickness, pHeight, depth/2 - parapetThickness,   // top right inner
          
          // Back parapet wall - top
          -width/2, pHeight, depth/2,                         // outer left
          width/2, pHeight, depth/2,                          // outer right
          -width/2 + parapetThickness, pHeight, depth/2 - parapetThickness,  // inner left
          
          width/2, pHeight, depth/2,                          // outer right
          width/2 - parapetThickness, pHeight, depth/2 - parapetThickness,   // inner right
          -width/2 + parapetThickness, pHeight, depth/2 - parapetThickness,  // inner left
          
          // Left parapet wall - outer face
          -width/2, 0, -depth/2,                              // bottom front
          -width/2, 0, depth/2,                               // bottom back
          -width/2, pHeight, -depth/2,                        // top front
          
          -width/2, pHeight, -depth/2,                        // top front
          -width/2, 0, depth/2,                               // bottom back
          -width/2, pHeight, depth/2,                         // top back
          
          // Left parapet wall - inner face
          -width/2 + parapetThickness, pHeight, -depth/2 + parapetThickness, // top front inner
          -width/2 + parapetThickness, 0, depth/2 - parapetThickness,        // bottom back inner
          -width/2 + parapetThickness, 0, -depth/2 + parapetThickness,       // bottom front inner
          
          -width/2 + parapetThickness, pHeight, -depth/2 + parapetThickness, // top front inner
          -width/2 + parapetThickness, pHeight, depth/2 - parapetThickness,  // top back inner
          -width/2 + parapetThickness, 0, depth/2 - parapetThickness,        // bottom back inner
          
          // Left parapet wall - top
          -width/2, pHeight, -depth/2,                        // outer front
          -width/2, pHeight, depth/2,                         // outer back
          -width/2 + parapetThickness, pHeight, -depth/2 + parapetThickness, // inner front
          
          -width/2, pHeight, depth/2,                         // outer back
          -width/2 + parapetThickness, pHeight, depth/2 - parapetThickness,  // inner back
          -width/2 + parapetThickness, pHeight, -depth/2 + parapetThickness, // inner front
          
          // Right parapet wall - outer face
          width/2, 0, -depth/2,                               // bottom front
          width/2, pHeight, -depth/2,                         // top front
          width/2, 0, depth/2,                                // bottom back
          
          width/2, pHeight, -depth/2,                         // top front
          width/2, pHeight, depth/2,                          // top back
          width/2, 0, depth/2,                                // bottom back
          
          // Right parapet wall - inner face
          width/2 - parapetThickness, 0, -depth/2 + parapetThickness,        // bottom front inner
          width/2 - parapetThickness, 0, depth/2 - parapetThickness,         // bottom back inner
          width/2 - parapetThickness, pHeight, -depth/2 + parapetThickness,  // top front inner
          
          width/2 - parapetThickness, pHeight, -depth/2 + parapetThickness,  // top front inner
          width/2 - parapetThickness, 0, depth/2 - parapetThickness,         // bottom back inner
          width/2 - parapetThickness, pHeight, depth/2 - parapetThickness,   // top back inner
          
          // Right parapet wall - top
          width/2, pHeight, -depth/2,                         // outer front
          width/2 - parapetThickness, pHeight, -depth/2 + parapetThickness,  // inner front
          width/2, pHeight, depth/2,                          // outer back
          
          width/2 - parapetThickness, pHeight, -depth/2 + parapetThickness,  // inner front
          width/2 - parapetThickness, pHeight, depth/2 - parapetThickness,   // inner back
          width/2, pHeight, depth/2,                          // outer back
        ]);
        parapetGeom.setAttribute('position', new THREE.BufferAttribute(parapetVertices, 3));
        parapetGeom.computeVertexNormals();
      } else if (flatRoofEdgeType === 'rounded') {
        // Flat roof with quarter-circle rounded edges where roof meets front and back walls
        const radius = edgeRadius || 0.2; // Default 20cm radius
        
        const hw = width / 2;  // half width
        const hd = depth / 2;  // half depth
        const segments = 16; // Number of segments for the curves
        
        // Create main flat roof surface (rectangular part between the rounded edges)
        flatRoofOnlyGeom = new THREE.BufferGeometry();
        const flatVertices = new Float32Array([
          // Main rectangle - raised by radius height to match rounded edges
          -hw, radius, -hd + radius,    // front left (after front curve)
          -hw, radius, hd - radius,     // back left (before back curve)
          hw, radius, -hd + radius,     // front right (after front curve)
          
          hw, radius, -hd + radius,     // front right (after front curve)
          -hw, radius, hd - radius,     // back left (before back curve)
          hw, radius, hd - radius,      // back right (before back curve)
        ]);
        flatRoofOnlyGeom.setAttribute('position', new THREE.BufferAttribute(flatVertices, 3));
        flatRoofOnlyGeom.computeVertexNormals();
        
        // Also create the full roof geometry (including barrel vault)
        roofGeom = new THREE.BufferGeometry();
        
        // Create separate geometry for the rounded edges (red parts - only quarter circles)
        roundedEdgesGeom = new THREE.BufferGeometry();
        const roundedVertices: number[] = [];
        
        // Simplified approach: Create quarter circles at front and back edges
        const segmentWidth = width / segments;
        
        // Front rounded edge - quarter circles curving upward from wall to roof
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI / 2; // From 0 to PI/2 (quarter circle)
          const angle2 = ((i + 1) / segments) * Math.PI / 2;
          
          // Y coordinates (height) of the quarter circle
          const y1 = radius * Math.cos(angle1); // Starts at radius, goes to 0
          const y2 = radius * Math.cos(angle2);
          
          // Z coordinates of the quarter circle (curving outward from center)
          const z1 = -hd + radius - radius * Math.sin(angle1);
          const z2 = -hd + radius - radius * Math.sin(angle2);
          
          // Create strips across the full width
          for (let j = 0; j < segments; j++) {
            const x1 = -hw + j * segmentWidth;
            const x2 = -hw + (j + 1) * segmentWidth;
            
            // Two triangles forming a quad for this segment
            roundedVertices.push(
              // First triangle
              x1, 0, -hd + radius,     // roof edge point left
              x1, y1, z1,              // curved point left
              x2, 0, -hd + radius,     // roof edge point right
              
              // Second triangle
              x2, 0, -hd + radius,     // roof edge point right
              x1, y1, z1,              // curved point left
              x2, y1, z1,              // curved point right
              
              // Connect to next angle segment
              x1, y1, z1,              // current curved point left
              x1, y2, z2,              // next curved point left
              x2, y1, z1,              // current curved point right
              
              x2, y1, z1,              // current curved point right
              x1, y2, z2,              // next curved point left
              x2, y2, z2,              // next curved point right
            );
          }
        }
        
        // Back rounded edge - quarter circles curving upward from wall to roof
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI / 2;
          const angle2 = ((i + 1) / segments) * Math.PI / 2;
          
          // Y coordinates (height) of the quarter circle
          const y1 = radius * Math.cos(angle1);
          const y2 = radius * Math.cos(angle2);
          
          // Z coordinates of the quarter circle (curving outward from center, mirrored for back)
          const z1 = hd - radius + radius * Math.sin(angle1);
          const z2 = hd - radius + radius * Math.sin(angle2);
          
          // Create strips across the full width
          for (let j = 0; j < segments; j++) {
            const x1 = -hw + j * segmentWidth;
            const x2 = -hw + (j + 1) * segmentWidth;
            
            // Two triangles forming a quad for this segment (reversed winding for back face)
            roundedVertices.push(
              // First triangle
              x1, 0, hd - radius,      // roof edge point left
              x2, 0, hd - radius,      // roof edge point right
              x1, y1, z1,              // curved point left
              
              // Second triangle
              x2, 0, hd - radius,      // roof edge point right
              x2, y1, z1,              // curved point right
              x1, y1, z1,              // curved point left
              
              // Connect to next angle segment
              x1, y1, z1,              // current curved point left
              x2, y1, z1,              // current curved point right
              x1, y2, z2,              // next curved point left
              
              x2, y1, z1,              // current curved point right
              x2, y2, z2,              // next curved point right
              x1, y2, z2,              // next curved point left
            );
          }
        }
        
        if (roundedVertices.length > 0) {
          const roundedVertexArray = new Float32Array(roundedVertices);
          roundedEdgesGeom.setAttribute('position', new THREE.BufferAttribute(roundedVertexArray, 3));
          roundedEdgesGeom.computeVertexNormals();
        }
        
        // Add the barrel vault surface to the main roof geometry
        const vaultVertices: number[] = [];
        
        // Close the left end - connect from front quarter circle top to back quarter circle top
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI / 2;
          const angle2 = ((i + 1) / segments) * Math.PI / 2;
          
          // Points on front quarter circle at left edge
          const y1Front = radius * Math.cos(angle1);
          const z1Front = -hd + radius - radius * Math.sin(angle1);
          const y2Front = radius * Math.cos(angle2);
          const z2Front = -hd + radius - radius * Math.sin(angle2);
          
          // Points on back quarter circle at left edge
          const y1Back = radius * Math.cos(angle1);
          const z1Back = hd - radius + radius * Math.sin(angle1);
          const y2Back = radius * Math.cos(angle2);
          const z2Back = hd - radius + radius * Math.sin(angle2);
          
          // Create quad face between front and back curves
          vaultVertices.push(
            -hw, y1Front, z1Front,   // front curve point
            -hw, y1Back, z1Back,     // back curve point
            -hw, y2Front, z2Front,   // next front curve point
            
            -hw, y2Front, z2Front,   // next front curve point
            -hw, y1Back, z1Back,     // back curve point
            -hw, y2Back, z2Back,     // next back curve point
          );
        }
        
        // Close the right end - connect from front quarter circle top to back quarter circle top
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI / 2;
          const angle2 = ((i + 1) / segments) * Math.PI / 2;
          
          // Points on front quarter circle at right edge
          const y1Front = radius * Math.cos(angle1);
          const z1Front = -hd + radius - radius * Math.sin(angle1);
          const y2Front = radius * Math.cos(angle2);
          const z2Front = -hd + radius - radius * Math.sin(angle2);
          
          // Points on back quarter circle at right edge
          const y1Back = radius * Math.cos(angle1);
          const z1Back = hd - radius + radius * Math.sin(angle1);
          const y2Back = radius * Math.cos(angle2);
          const z2Back = hd - radius + radius * Math.sin(angle2);
          
          // Create quad face between front and back curves (reversed winding for right side)
          vaultVertices.push(
            hw, y1Front, z1Front,    // front curve point
            hw, y2Front, z2Front,    // next front curve point
            hw, y1Back, z1Back,      // back curve point
            
            hw, y2Front, z2Front,    // next front curve point
            hw, y2Back, z2Back,      // next back curve point
            hw, y1Back, z1Back,      // back curve point
          );
        }
        
        // Add top barrel vault surface connecting the quarter circles
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI / 2;
          const angle2 = ((i + 1) / segments) * Math.PI / 2;
          
          for (let j = 0; j < segments; j++) {
            const x1 = -hw + (j / segments) * width;
            const x2 = -hw + ((j + 1) / segments) * width;
            
            // Calculate heights and Z positions at the top of each quarter circle segment
            const y1 = radius * Math.cos(angle1);
            const y2 = radius * Math.cos(angle2);
            
            // Z positions for front and back curves
            const z1Front = -hd + radius - radius * Math.sin(angle1);
            const z2Front = -hd + radius - radius * Math.sin(angle2);
            const z1Back = hd - radius + radius * Math.sin(angle1);
            const z2Back = hd - radius + radius * Math.sin(angle2);
            
            // Create surface connecting front curve to back curve at same angle and X position
            vaultVertices.push(
              x1, y1, z1Front,     // front curve point (current X, current angle)
              x1, y1, z1Back,      // back curve point (current X, current angle)
              x2, y1, z1Front,     // front curve point (next X, current angle)
              
              x2, y1, z1Front,     // front curve point (next X, current angle)
              x1, y1, z1Back,      // back curve point (current X, current angle)
              x2, y1, z1Back,      // back curve point (next X, current angle)
              
              // Connect current angle to next angle
              x1, y1, z1Front,     // current angle, current X, front
              x1, y2, z2Front,     // next angle, current X, front
              x2, y1, z1Front,     // current angle, next X, front
              
              x2, y1, z1Front,     // current angle, next X, front
              x1, y2, z2Front,     // next angle, current X, front
              x2, y2, z2Front,     // next angle, next X, front
              
              // Same for back surface
              x1, y1, z1Back,      // current angle, current X, back
              x2, y1, z1Back,      // current angle, next X, back
              x1, y2, z2Back,      // next angle, current X, back
              
              x2, y1, z1Back,      // current angle, next X, back
              x2, y2, z2Back,      // next angle, next X, back
              x1, y2, z2Back,      // next angle, current X, back
            );
          }
        }
        
        // Add the barrel vault vertices to the main roof geometry
        const combinedVertices = new Float32Array(flatVertices.length + vaultVertices.length);
        combinedVertices.set(flatVertices);
        combinedVertices.set(vaultVertices, flatVertices.length);
        
        roofGeom.setAttribute('position', new THREE.BufferAttribute(combinedVertices, 3));
        roofGeom.computeVertexNormals();
      } else if (flatRoofEdgeType === 'beveled') {
        // Flat roof with beveled edges - build triangles on top of the house along facades
        const angle = (bevelAngle || 45) * Math.PI / 180; // Convert to radians
        const bevelWidth = 0.5; // Fixed bevel width - always start 0.5m from edge
        const bevelHeight = bevelWidth * Math.tan(angle); // Calculate height based on width and angle
        
        // Create main flat roof surface (rectangular part between the beveled edges)
        flatRoofOnlyGeom = new THREE.BufferGeometry();
        const flatVertices = new Float32Array([
          // Main rectangle - at roof level between the beveled sections
          -width/2, 0, -depth/2 + bevelWidth,    // front left (after front bevel)
          -width/2, 0, depth/2 - bevelWidth,     // back left (before back bevel)
          width/2, 0, -depth/2 + bevelWidth,     // front right (after front bevel)
          
          width/2, 0, -depth/2 + bevelWidth,     // front right (after front bevel)
          -width/2, 0, depth/2 - bevelWidth,     // back left (before back bevel)
          width/2, 0, depth/2 - bevelWidth,      // back right (before back bevel)
        ]);
        flatRoofOnlyGeom.setAttribute('position', new THREE.BufferAttribute(flatVertices, 3));
        flatRoofOnlyGeom.computeVertexNormals();
        
        // Create the beveled triangles geometry (similar to rounded edges but with triangular shapes)
        const bevelVertices: number[] = [];
        
        // Front beveled triangle strip - now pointing downward
        const segments = 16; // Number of segments along the width
        const segmentWidth = width / segments;
        
        for (let i = 0; i < segments; i++) {
          const x1 = -width/2 + i * segmentWidth;
          const x2 = -width/2 + (i + 1) * segmentWidth;
          
          // Create triangular face for each segment - flipped to point downward
          bevelVertices.push(
            // Triangle from roof edge down to lowest point of bevel
            x1, 0, -depth/2 + bevelWidth,     // roof edge left
            x1, -bevelHeight, -depth/2,       // bottom peak left
            x2, 0, -depth/2 + bevelWidth,     // roof edge right
            
            x2, 0, -depth/2 + bevelWidth,     // roof edge right
            x1, -bevelHeight, -depth/2,       // bottom peak left
            x2, -bevelHeight, -depth/2,       // bottom peak right
          );
        }
        
        // Back beveled triangle strip - now pointing downward
        for (let i = 0; i < segments; i++) {
          const x1 = -width/2 + i * segmentWidth;
          const x2 = -width/2 + (i + 1) * segmentWidth;
          
          // Create triangular face for each segment (reversed winding for back) - flipped to point downward
          bevelVertices.push(
            // Triangle from roof edge down to lowest point of bevel
            x1, 0, depth/2 - bevelWidth,      // roof edge left
            x2, 0, depth/2 - bevelWidth,      // roof edge right
            x1, -bevelHeight, depth/2,        // bottom peak left
            
            x2, 0, depth/2 - bevelWidth,      // roof edge right
            x2, -bevelHeight, depth/2,        // bottom peak right
            x1, -bevelHeight, depth/2,        // bottom peak left
          );
        }
        
        // Create the beveled triangles geometry and store it for rendering
        if (bevelVertices.length > 0) {
          roundedEdgesGeom = new THREE.BufferGeometry();
          const bevelVertexArray = new Float32Array(bevelVertices);
          roundedEdgesGeom.setAttribute('position', new THREE.BufferAttribute(bevelVertexArray, 3));
          roundedEdgesGeom.computeVertexNormals();
        }
        
        // Create the complete roof geometry (main flat surface + connecting sides)
        roofGeom = new THREE.BufferGeometry();
        const completeVertices: number[] = [];
        
        // Add the main flat surface
        completeVertices.push(...flatVertices);
        
        // Add left side connecting surface - now connecting downward peaks
        completeVertices.push(
          -width/2, 0, -depth/2 + bevelWidth,    // roof level front
          -width/2, -bevelHeight, -depth/2,      // bottom peak front
          -width/2, 0, depth/2 - bevelWidth,     // roof level back
          
          -width/2, 0, depth/2 - bevelWidth,     // roof level back
          -width/2, -bevelHeight, -depth/2,      // bottom peak front
          -width/2, -bevelHeight, depth/2,       // bottom peak back
        );
        
        // Add right side connecting surface - now connecting downward peaks
        completeVertices.push(
          width/2, 0, -depth/2 + bevelWidth,     // roof level front
          width/2, 0, depth/2 - bevelWidth,      // roof level back
          width/2, -bevelHeight, -depth/2,       // bottom peak front
          
          width/2, 0, depth/2 - bevelWidth,      // roof level back
          width/2, -bevelHeight, depth/2,        // bottom peak back
          width/2, -bevelHeight, -depth/2,       // bottom peak front
        );
        
        // Add bottom connecting surface between the downward peaks
        completeVertices.push(
          -width/2, -bevelHeight, -depth/2,      // left bottom peak front
          width/2, -bevelHeight, -depth/2,       // right bottom peak front
          -width/2, -bevelHeight, depth/2,       // left bottom peak back
          
          width/2, -bevelHeight, -depth/2,       // right bottom peak front
          width/2, -bevelHeight, depth/2,        // right bottom peak back
          -width/2, -bevelHeight, depth/2,       // left bottom peak back
        );
        
        const completeVertexArray = new Float32Array(completeVertices);
        roofGeom.setAttribute('position', new THREE.BufferAttribute(completeVertexArray, 3));
        roofGeom.computeVertexNormals();
      }
    } else if (roofType === 'monopitch') {
      // Monopitch roof (single slope from front to back)
      roofGeom = new THREE.BufferGeometry();
      
      // For monopitch roof, maintain the pitch angle regardless of depth
      // Calculate the roof height based on pitch angle and full depth
      const pitchAngle = (roofPitch || 15) * Math.PI / 180; // Default to 15 degrees if not specified
      const roofHeightFromPitch = depth * Math.tan(pitchAngle);
      
      // Use the calculated roof height from pitch
      const actualRoofHeight = roofHeightFromPitch;
      
      const vertices = new Float32Array([
        // Single sloped surface (roof top)
        -width/2, 0, -depth/2,                    // left front bottom
        -width/2, actualRoofHeight, depth/2,      // left back top
        width/2, 0, -depth/2,                     // right front bottom
        
        width/2, 0, -depth/2,                     // right front bottom
        -width/2, actualRoofHeight, depth/2,      // left back top
        width/2, actualRoofHeight, depth/2,       // right back top
        
        // Left end wall (triangular gable)
        -width/2, 0, -depth/2,                    // front bottom
        -width/2, actualRoofHeight, depth/2,      // back top
        -width/2, 0, depth/2,                     // back bottom
        
        // Right end wall (triangular gable)
        width/2, 0, -depth/2,                     // front bottom
        width/2, 0, depth/2,                      // back bottom
        width/2, actualRoofHeight, depth/2,       // back top
        
        // Back end wall (triangular - where roof meets back wall)
        -width/2, 0, depth/2,                     // left bottom
        -width/2, actualRoofHeight, depth/2,      // left top
        width/2, 0, depth/2,                      // right bottom
        
        width/2, 0, depth/2,                      // right bottom
        -width/2, actualRoofHeight, depth/2,      // left top
        width/2, actualRoofHeight, depth/2,       // right top
      ]);
      roofGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      roofGeom.computeVertexNormals();
      
      // Create arrow geometry for monopitch roof to show direction of slope
      arrowGeom = new THREE.BufferGeometry();
      
      // Arrow points from lower end (front) to higher end (back)
      const arrowLength = Math.min(width, depth) * 0.6;
      const arrowWidth = arrowLength * 0.4;
      const arrowThickness = 0.1; // Thickness of the arrow
      const arrowHeight = 0.1; // Higher elevation above roof surface
      
      // Position arrow at center of roof
      const centerX = 0;
      const centerZ = 0;
      
      // Calculate height at center based on monopitch slope
      const centerY = actualRoofHeight / 2;
      
      // Arrow shaft dimensions
      const shaftLength = arrowLength * 0.5;
      const shaftWidth = arrowWidth * 0.4;
      
      // Arrow head dimensions
      const headLength = arrowLength * 0.5;
      const headWidth = arrowWidth;
      
      // Create a 3D arrow using box and pyramid shapes
      const arrowVertices: number[] = [];
      
      // Arrow shaft (3D box)
      const sx1 = centerX - shaftWidth/2;
      const sx2 = centerX + shaftWidth/2;
      const sy1 = centerY + arrowHeight;
      const sy2 = centerY + arrowHeight + arrowThickness;
      const sz1 = centerZ - shaftLength/2;
      const sz2 = centerZ + shaftLength/2;
      
      // Shaft bottom face
      arrowVertices.push(
        sx1, sy1, sz1,  sx2, sy1, sz1,  sx1, sy1, sz2,
        sx2, sy1, sz1,  sx2, sy1, sz2,  sx1, sy1, sz2
      );
      
      // Shaft top face
      arrowVertices.push(
        sx1, sy2, sz1,  sx1, sy2, sz2,  sx2, sy2, sz1,
        sx2, sy2, sz1,  sx1, sy2, sz2,  sx2, sy2, sz2
      );
      
      // Shaft front face
      arrowVertices.push(
        sx1, sy1, sz1,  sx1, sy2, sz1,  sx2, sy1, sz1,
        sx2, sy1, sz1,  sx1, sy2, sz1,  sx2, sy2, sz1
      );
      
      // Shaft back face
      arrowVertices.push(
        sx1, sy1, sz2,  sx2, sy1, sz2,  sx1, sy2, sz2,
        sx2, sy1, sz2,  sx2, sy2, sz2,  sx1, sy2, sz2
      );
      
      // Shaft left face
      arrowVertices.push(
        sx1, sy1, sz1,  sx1, sy1, sz2,  sx1, sy2, sz1,
        sx1, sy2, sz1,  sx1, sy1, sz2,  sx1, sy2, sz2
      );
      
      // Shaft right face
      arrowVertices.push(
        sx2, sy1, sz1,  sx2, sy2, sz1,  sx2, sy1, sz2,
        sx2, sy2, sz1,  sx2, sy2, sz2,  sx2, sy1, sz2
      );
      
      // Arrow head (3D pyramid pointing toward back)
      const hx1 = centerX - headWidth/2;
      const hx2 = centerX + headWidth/2;
      const hz1 = centerZ + shaftLength/2;
      const htip = centerZ + shaftLength/2 + headLength;
      
      // Head bottom face
      arrowVertices.push(
        hx1, sy1, hz1,  hx2, sy1, hz1,  centerX, sy1, htip
      );
      
      // Head top face  
      arrowVertices.push(
        hx1, sy2, hz1,  centerX, sy2, htip,  hx2, sy2, hz1
      );
      
      // Head left face
      arrowVertices.push(
        hx1, sy1, hz1,  centerX, sy1, htip,  hx1, sy2, hz1,
        hx1, sy2, hz1,  centerX, sy1, htip,  centerX, sy2, htip
      );
      
      // Head right face
      arrowVertices.push(
        hx2, sy1, hz1,  hx2, sy2, hz1,  centerX, sy1, htip,
        hx2, sy2, hz1,  centerX, sy2, htip,  centerX, sy1, htip
      );
      
      // Head back face (connects to shaft)
      arrowVertices.push(
        hx1, sy1, hz1,  hx1, sy2, hz1,  hx2, sy1, hz1,
        hx2, sy1, hz1,  hx1, sy2, hz1,  hx2, sy2, hz1
      );
      
      const arrowVertexArray = new Float32Array(arrowVertices);
      arrowGeom.setAttribute('position', new THREE.BufferAttribute(arrowVertexArray, 3));
      arrowGeom.computeVertexNormals();
    } else if (roofType === 'hipped') {
      // Hipped roof - use separate pitches for main roof and hips
      roofGeom = new THREE.BufferGeometry();
      
      // Calculate roof height based on main pitch (along facades)
      let mainRoofHeight = roofHeight;
      if (hippedMainPitch) {
        const mainPitchAngle = hippedMainPitch * Math.PI / 180;
        mainRoofHeight = (depth / 2) * Math.tan(mainPitchAngle);
      }
      
      // Ridge is shortened based on hip pitch
      let ridgeInset = width * 0.25; // Default inset
      if (hippedHipPitch) {
        const hipPitchAngle = hippedHipPitch * Math.PI / 180;
        
        // Special handling for 90 degrees (vertical hips)
        if (hippedHipPitch >= 89.5) {
          // For near-vertical or vertical hips, make minimal inset
          ridgeInset = width * 0.02; // Very small inset for nearly vertical hips
        } else {
          // Calculate how far the ridge should be inset based on hip pitch and roof height
          // The hip slope goes from corner to ridge, so we need to calculate the horizontal distance
          // For a given roof height and hip pitch angle: horizontal_distance = roof_height / tan(pitch_angle)
          ridgeInset = mainRoofHeight / Math.tan(hipPitchAngle);
          // Ensure ridge inset doesn't exceed reasonable bounds (can't be longer than half the width)
          ridgeInset = Math.min(ridgeInset, width * 0.45);
          ridgeInset = Math.max(ridgeInset, width * 0.05);
        }
      }
      
      const vertices = new Float32Array([
        // Main roof front face (rectangular part between hips)
        -width/2 + ridgeInset, 0, -depth/2,          // left front edge
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left ridge point
        width/2 - ridgeInset, 0, -depth/2,           // right front edge
        
        width/2 - ridgeInset, 0, -depth/2,           // right front edge
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left ridge point
        width/2 - ridgeInset, mainRoofHeight, 0,     // right ridge point
        
        // Main roof back face (rectangular part between hips)
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left ridge point
        -width/2 + ridgeInset, 0, depth/2,           // left back edge
        width/2 - ridgeInset, mainRoofHeight, 0,     // right ridge point
        
        width/2 - ridgeInset, mainRoofHeight, 0,     // right ridge point
        -width/2 + ridgeInset, 0, depth/2,           // left back edge
        width/2 - ridgeInset, 0, depth/2,            // right back edge
        
        // Left hip - combined as a closed surface
        // Front triangle of left hip
        -width/2, 0, -depth/2,                       // left front corner
        -width/2 + ridgeInset, 0, -depth/2,          // connection to main roof front
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left ridge point
        
        // Back triangle of left hip
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left ridge point
        -width/2 + ridgeInset, 0, depth/2,           // connection to main roof back
        -width/2, 0, depth/2,                        // left back corner
        
        // Left hip main face
        -width/2, 0, -depth/2,                       // left front corner
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left ridge point
        -width/2, 0, depth/2,                        // left back corner
        
        // Right hip - combined as a closed surface
        // Front triangle of right hip
        width/2 - ridgeInset, 0, -depth/2,           // connection to main roof front
        width/2, 0, -depth/2,                        // right front corner
        width/2 - ridgeInset, mainRoofHeight, 0,     // right ridge point
        
        // Back triangle of right hip
        width/2 - ridgeInset, mainRoofHeight, 0,     // right ridge point
        width/2, 0, depth/2,                         // right back corner
        width/2 - ridgeInset, 0, depth/2,            // connection to main roof back
        
        // Right hip main face
        width/2, 0, -depth/2,                        // right front corner
        width/2, 0, depth/2,                         // right back corner
        width/2 - ridgeInset, mainRoofHeight, 0,     // right ridge point
      ]);
      roofGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      roofGeom.computeVertexNormals();
      
      // Custom lines for hipped roof - ridge and hip edges
      customLines = new THREE.BufferGeometry();
      const lineVertices = new Float32Array([
        // Ridge (shortened)
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left end of ridge
        width/2 - ridgeInset, mainRoofHeight, 0,     // right end of ridge
        
        // Left hip edges
        -width/2, 0, -depth/2,                       // left front corner
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left end of ridge
        
        -width/2, 0, depth/2,                        // left back corner  
        -width/2 + ridgeInset, mainRoofHeight, 0,    // left end of ridge
        
        // Right hip edges
        width/2, 0, -depth/2,                        // right front corner
        width/2 - ridgeInset, mainRoofHeight, 0,     // right end of ridge
        
        width/2, 0, depth/2,                         // right back corner
        width/2 - ridgeInset, mainRoofHeight, 0,     // right end of ridge
      ]);
      customLines.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3));
    } else {
      // Duopitch roof (sadeltag) - calculate roof height based on pitch if specified
      roofGeom = new THREE.BufferGeometry();
      
      let actualRoofHeight = roofHeight;
      if (roofType === 'duopitch' && roofPitch) {
        // Calculate roof height based on pitch angle and half depth (from edge to ridge)
        const pitchAngle = roofPitch * Math.PI / 180;
        actualRoofHeight = (depth / 2) * Math.tan(Math.abs(pitchAngle));
      }
      
      let vertices: Float32Array;
      
      if (roofType === 'duopitch' && roofPitch && roofPitch < 0) {
        // Negative pitch - inverted saddle roof (ridge is below the facade edges)
        // For negative pitch, the ridge is at the bottom and facades are at the top
        // NO gable triangles for negative pitch - they should be open
        vertices = new Float32Array([
          // Front roof slope (from front edge down to ridge) - counter-clockwise
          -width/2, 0, -depth/2,              // left front top
          -width/2, -actualRoofHeight, 0,     // left ridge (below)
          width/2, 0, -depth/2,               // right front top
          
          width/2, 0, -depth/2,               // right front top
          -width/2, -actualRoofHeight, 0,     // left ridge (below)
          width/2, -actualRoofHeight, 0,      // right ridge (below)
          
          // Back roof slope (from ridge up to back edge) - counter-clockwise
          -width/2, -actualRoofHeight, 0,     // left ridge (below)
          -width/2, 0, depth/2,               // left back top
          width/2, -actualRoofHeight, 0,      // right ridge (below)
          
          width/2, -actualRoofHeight, 0,      // right ridge (below)
          -width/2, 0, depth/2,               // left back top
          width/2, 0, depth/2,                // right back top
          
          // No gable triangles and NO side connections for negative pitch - leave the ends completely open
          // This creates the proper inverted saddle roof effect with open gable ends
        ]);
      } else {
        // Positive pitch - normal saddle roof (ridge is above the facade edges)
        vertices = new Float32Array([
          // Front roof slope (from front edge to ridge) - counter-clockwise
          -width/2, 0, -depth/2,        // left front bottom
          -width/2, actualRoofHeight, 0,      // left ridge
          width/2, 0, -depth/2,         // right front bottom
          
          width/2, 0, -depth/2,         // right front bottom
          -width/2, actualRoofHeight, 0,      // left ridge
          width/2, actualRoofHeight, 0,       // right ridge
          
          // Back roof slope (from ridge to back edge) - counter-clockwise
          -width/2, actualRoofHeight, 0,      // left ridge
          -width/2, 0, depth/2,         // left back bottom
          width/2, actualRoofHeight, 0,       // right ridge
          
          width/2, actualRoofHeight, 0,       // right ridge
          -width/2, 0, depth/2,         // left back bottom
          width/2, 0, depth/2,          // right back bottom
          
          // Left gable triangle - counter-clockwise from outside
          -width/2, 0, -depth/2,        // front bottom
          -width/2, actualRoofHeight, 0,      // ridge point
          -width/2, 0, depth/2,         // back bottom
          
          // Right gable triangle - counter-clockwise from outside
          width/2, 0, -depth/2,         // front bottom
          width/2, 0, depth/2,          // back bottom
          width/2, actualRoofHeight, 0        // ridge point
        ]);
      }
      
      roofGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      roofGeom.computeVertexNormals();
    }

    return {
      wallsGeometry: walls,
      roofGeometry: roofGeom,
      flatRoofOnlyGeometry: flatRoofOnlyGeom,
      customRoofLines: customLines,
      parapetGeometry: parapetGeom,
      roundedEdgesGeometry: roundedEdgesGeom,
      arrowGeometry: arrowGeom
    };
  }, [width, height, depth, wallHeight, roofHeight, roofType, flatRoofEdgeType, parapetHeight, edgeRadius, bevelAngle, roofPitch, hippedMainPitch, hippedHipPitch]);

  // Calculate wall position - adjust for extended walls in rounded roof case
  const adjustedWallHeightForMonopitch = useMemo(() => {
    if (roofType === 'monopitch') {
      const pitchAngle = (roofPitch || 15) * Math.PI / 180;
      const roofHeightFromPitch = depth * Math.tan(pitchAngle);
      // Adjust wall height so total height matches input
      return adjustedHeight - roofHeightFromPitch;
    }
    return wallHeight;
  }, [roofType, roofPitch, depth, wallHeight, adjustedHeight]);

  const adjustedWallHeightForDuopitch = useMemo(() => {
    if (roofType === 'duopitch' && roofPitch) {
      const pitchAngle = roofPitch * Math.PI / 180;
      const roofHeightFromPitch = (depth / 2) * Math.tan(Math.abs(pitchAngle));
      
      if (roofPitch >= 0) {
        // Positive pitch: height to ridge, adjust wall height
        return adjustedHeight - roofHeightFromPitch;
      } else {
        // Negative pitch: height to facades, wall height is input height
        return adjustedHeight;
      }
    }
    return wallHeight;
  }, [roofType, roofPitch, depth, wallHeight, adjustedHeight]);

  const adjustedWallHeightForHipped = useMemo(() => {
    if (roofType === 'hipped' && hippedMainPitch) {
      const mainPitchAngle = hippedMainPitch * Math.PI / 180;
      const roofHeightFromPitch = (depth / 2) * Math.tan(mainPitchAngle);
      // Adjust wall height so total height matches input
      return adjustedHeight - roofHeightFromPitch;
    }
    return wallHeight;
  }, [roofType, hippedMainPitch, depth, wallHeight, adjustedHeight]);

  const wallPositionY = roofType === 'flat' && flatRoofEdgeType === 'rounded' 
    ? (wallHeight + 0.01) / 2  // Center the extended walls
    : roofType === 'flat' && flatRoofEdgeType === 'beveled'
    ? (wallHeight - (0.5 * Math.tan((bevelAngle || 45) * Math.PI / 180))) / 2  // Center the reduced walls
    : roofType === 'monopitch'
    ? adjustedWallHeightForMonopitch / 2  // Center the adjusted walls for monopitch
    : roofType === 'duopitch' && roofPitch
    ? adjustedWallHeightForDuopitch / 2   // Center the adjusted walls for duopitch
    : roofType === 'hipped' && hippedMainPitch
    ? adjustedWallHeightForHipped / 2     // Center the adjusted walls for hipped
    : wallHeight / 2;

  const roofPositionY = useMemo(() => {
    if (roofType === 'monopitch') {
      return adjustedWallHeightForMonopitch;
    } else if (roofType === 'duopitch' && roofPitch) {
      if (roofPitch < 0) {
        // For negative pitch (inverted saddle), position roof at wall height
        // since the ridge is below the facade edges
        return adjustedWallHeightForDuopitch;
      } else {
        // For positive pitch, position normally
        return adjustedWallHeightForDuopitch;
      }
    } else if (roofType === 'hipped' && hippedMainPitch) {
      return adjustedWallHeightForHipped;
    }
    return wallHeight;
  }, [roofType, roofPitch, adjustedWallHeightForMonopitch, adjustedWallHeightForDuopitch, adjustedWallHeightForHipped, wallHeight]);

  return (
    <group ref={groupRef}>
      {/* Walls */}
      <mesh position={[0, wallPositionY, 0]} geometry={wallsGeometry}>
        <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>

      {/* Roof - render for all roof types */}
      <mesh position={[0, roofPositionY, 0]} geometry={roofGeometry}>
        <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>

      {/* Rounded edges - only for flat roof with rounded edge type */}
      {roofType === 'flat' && flatRoofEdgeType === 'rounded' && roundedEdgesGeometry && (
        <mesh position={[0, wallHeight + 0.001, 0]} geometry={roundedEdgesGeometry}>
          <meshStandardMaterial color="#ff0000" side={THREE.DoubleSide} emissive="#660000" transparent={false} />
        </mesh>
      )}

      {/* Beveled edges - only for flat roof with beveled edge type */}
      {roofType === 'flat' && flatRoofEdgeType === 'beveled' && roundedEdgesGeometry && (
        <mesh position={[0, wallHeight + 0.001, 0]} geometry={roundedEdgesGeometry}>
          <meshStandardMaterial color="#ff0000" side={THREE.DoubleSide} emissive="#660000" transparent={false} />
        </mesh>
      )}

      {/* Parapet walls - only for flat roof with parapet edge type */}
      {roofType === 'flat' && flatRoofEdgeType === 'parapet' && parapetGeometry && (
        <mesh position={[0, wallHeight, 0]} geometry={parapetGeometry}>
          <meshStandardMaterial color="#ff0000" side={THREE.DoubleSide} emissive="#660000" transparent={false} />
        </mesh>
      )}

      {/* Edge wireframes - hide wall wireframes for rounded roof and negative duopitch to avoid visible seam */}
      {!(roofType === 'flat' && flatRoofEdgeType === 'rounded') && !(roofType === 'duopitch' && roofPitch && roofPitch < 0) && (
        <lineSegments position={[0, wallPositionY, 0]}>
          <edgesGeometry args={[wallsGeometry]} />
          <lineBasicMaterial color="#000000" linewidth={2} />
        </lineSegments>
      )}
      
      {/* Special wireframes for negative duopitch - with gable walls following roof profile */}
      {roofType === 'duopitch' && roofPitch && roofPitch < 0 && (() => {
        // Create custom wireframe geometry for negative duopitch walls with gable walls following roof profile
        const customWireframeGeometry = new THREE.BufferGeometry();
        const hw = width / 2;
        const hh = adjustedWallHeightForDuopitch / 2;
        const hd = depth / 2;
        
        // Calculate roof height for the saddle shape
        const pitchAngle = roofPitch * Math.PI / 180;
        const actualRoofHeight = (depth / 2) * Math.tan(Math.abs(pitchAngle));
        
        const wireframeVertices = new Float32Array([
          // Bottom edges only
          -hw, -hh, -hd,  hw, -hh, -hd,   // front bottom edge
          hw, -hh, -hd,   hw, -hh, hd,    // right bottom edge
          hw, -hh, hd,   -hw, -hh, hd,    // back bottom edge
          -hw, -hh, hd,  -hw, -hh, -hd,   // left bottom edge
          
          // Vertical edges for front and back facades
          -hw, -hh, -hd,  -hw, hh, -hd,   // front left vertical
          hw, -hh, -hd,   hw, hh, -hd,    // front right vertical
          hw, -hh, hd,    hw, hh, hd,     // back right vertical
          -hw, -hh, hd,   -hw, hh, hd,    // back left vertical
          
          // Facade top edges (front and back)
          -hw, hh, -hd,   hw, hh, -hd,    // front top edge
          -hw, hh, hd,    hw, hh, hd,     // back top edge
          
          // Gable edges - following the roof profile (saddle shape)
          // Left gable outline
          -hw, hh, -hd,                    -hw, hh - actualRoofHeight, 0,  // front facade to ridge
          -hw, hh - actualRoofHeight, 0,   -hw, hh, hd,                    // ridge to back facade
          
          // Right gable outline  
          hw, hh, -hd,                     hw, hh - actualRoofHeight, 0,   // front facade to ridge
          hw, hh - actualRoofHeight, 0,    hw, hh, hd,                     // ridge to back facade
        ]);
        
        customWireframeGeometry.setAttribute('position', new THREE.BufferAttribute(wireframeVertices, 3));
        
        return (
          <lineSegments position={[0, wallPositionY, 0]} geometry={customWireframeGeometry}>
            <lineBasicMaterial color="#000000" linewidth={2} />
          </lineSegments>
        );
      })()}
      
      {/* Parapet wireframes - show edges of parapet walls */}
      {roofType === 'flat' && flatRoofEdgeType === 'parapet' && parapetGeometry && (
        <lineSegments position={[0, wallHeight, 0]}>
          <edgesGeometry args={[parapetGeometry]} />
          <lineBasicMaterial color="#000000" linewidth={2} />
        </lineSegments>
      )}
      
      {/* Roof wireframes - special handling for hipped roof and rounded roof */}
      {roofType === 'hipped' && customRoofLines && (
        <lineSegments position={[0, roofPositionY, 0]}>
          <primitive object={customRoofLines} />
          <lineBasicMaterial color="#000000" linewidth={2} />
        </lineSegments>
      )}
      {roofType !== 'hipped' && (
        <lineSegments position={[0, roofPositionY, 0]}>
          <edgesGeometry args={[
            (roofType === 'flat' && flatRoofEdgeType === 'rounded' && flatRoofOnlyGeometry) 
              ? flatRoofOnlyGeometry 
              : roofGeometry
          ]} />
          <lineBasicMaterial color="#000000" linewidth={2} />
        </lineSegments>
      )}
      
      {/* Rounded edges wireframes - explicitly hide them to avoid black lines */}
      {/* No wireframes for rounded edges to maintain clean red appearance */}
      
      {/* Arrow for monopitch roof - shows direction of upward slope */}
      {roofType === 'monopitch' && arrowGeometry && (() => {
        // Calculate the rotation angle based on roof pitch
        const pitchAngle = -(roofPitch || 15) * Math.PI / 180;
        
        return (
          <mesh 
            position={[0, roofPositionY, 0]} 
            geometry={arrowGeometry}
            rotation={[pitchAngle, 0, 0]}
          >
            <meshStandardMaterial color="#ff0000" emissive="#444400" transparent={false} />
          </mesh>
        );
      })()}
    </group>
  );
}

export default function HouseOutline({ 
  width = 4, 
  height = 3, 
  depth = 6, 
  roofType = 'duopitch',
  flatRoofEdgeType = 'sharp',
  parapetHeight,
  edgeRadius,
  bevelAngle,
  roofPitch,
  hippedMainPitch,
  hippedHipPitch
}: HouseOutlineProps) {
  // Calculate adjusted height for camera positioning (same logic as in House component)
  const adjustedHeight = roofType === 'flat' && flatRoofEdgeType === 'rounded' 
    ? height - (edgeRadius || 0.2) 
    : height;

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <CameraController width={width} height={adjustedHeight} depth={depth} />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} />
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
        />
      </Canvas>
    </div>
  );
}
