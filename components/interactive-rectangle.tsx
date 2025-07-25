import React, { useState, useRef, useCallback } from 'react';

interface Line {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DotPosition {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  progress: number; // 0 to 1 along the side
  lineId: number; // Which construction line this dot belongs to
}

interface LinePosition {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left' | 'inside';
  progress: number; // 0 to 1 along the side
  lineId: number; // Which construction line this line belongs to
  length: number; // Length of the line
  rotation: number; // Rotation angle in degrees (0, 90, 180, 270)
}

interface ShadedArea {
  id: string;
  lineId: number;
  side: 'left' | 'right' | 'top' | 'bottom'; // Which side of the line
  width: number; // How far the shaded area extends from the line
}

interface InteractiveRectangleProps {
  depth?: number;
  width?: number;
  selectedLineId: number | null;
  constructionLines?: Line[];
  onDotPlaced?: (dot: DotPosition) => void;
}

const InteractiveRectangle: React.FC<InteractiveRectangleProps> = ({
  depth = 300,
  width = 200,
  selectedLineId,
  constructionLines = [],
  onDotPlaced,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [dots, setDots] = useState<DotPosition[]>([]);
  const [lines, setLines] = useState<LinePosition[]>([]);
  const [draggedLineIndex, setDraggedLineIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [shadedAreas, setShadedAreas] = useState<ShadedArea[]>([]);
  const [draggedTriangleId, setDraggedTriangleId] = useState<string | null>(null);
  
  // Use a ref to track triangle dragging state for immediate access
  const triangleDragRef = useRef<string | null>(null);

  // Compass directions for the 12 arrows (corrected: N points up at 270° in SVG coordinates)
  const compassDirections = [
    { name: 'Ø', angle: 0, degrees: '0°' },     // East (right) 
    { name: 'ØSØ', angle: 30, degrees: '30°' },
    { name: 'SSØ', angle: 60, degrees: '60°' },
    { name: 'S', angle: 90, degrees: '90°' },    // South (down)
    { name: 'SSV', angle: 120, degrees: '120°' },
    { name: 'VSV', angle: 150, degrees: '150°' },
    { name: 'V', angle: 180, degrees: '180°' },   // West (left)
    { name: 'VNV', angle: 210, degrees: '210°' },
    { name: 'NNV', angle: 240, degrees: '240°' },
    { name: 'N', angle: 270, degrees: '270°' },   // North (up)
    { name: 'NNØ', angle: 300, degrees: '300°' },
    { name: 'ØNØ', angle: 330, degrees: '330°' }
  ];

  // Calculate dimensions based on fixed circle size (same as original 300x200)
  const baseWidth = 300;
  const baseDepth = 200;
  const rectDiagonal = Math.sqrt(baseWidth * baseWidth + baseDepth * baseDepth);
  const circleRadius = rectDiagonal / 2 + 60;
  const padding = 80;
  const svgWidth = (circleRadius + padding) * 2;
  const svgDepth = (circleRadius + padding) * 2;
  
  
  // Scale rectangle to fit inside circle while maintaining aspect ratio - made smaller
  const aspectRatio = width / depth; // width is vertical (12), depth is horizontal (4)
  const maxDiagonal = circleRadius * 2 - 120; // Even more margin to make rectangle smaller
  const scaledDepth = Math.sqrt(maxDiagonal * maxDiagonal / (aspectRatio * aspectRatio + 1)); // horizontal
  const scaledWidth = scaledDepth * aspectRatio; // vertical  
  const scale = scaledDepth / depth; // Scale factor for construction elements
  
  const rectX = svgWidth / 2 - scaledDepth / 2; // horizontal positioning
  const rectY = svgDepth / 2 - scaledWidth / 2; // vertical positioning
  
  // Calculate rectangle center (used by multiple functions)
  const rectCenterX = rectX + scaledDepth / 2; // horizontal center
  const rectCenterY = rectY + scaledWidth / 2; // vertical center

  // Calculate arrow positions (12 arrows positioned on quarter circle arcs)
  const getArrowPositions = () => {
    const arrows = [];
    const arrowLength = 40;
    
    // Rectangle sides and their properties
    const sides = [
      { name: 'top', x: rectX + scaledDepth/2, y: rectY, normal: 270 },
      { name: 'right', x: rectX + scaledDepth, y: rectY + scaledWidth/2, normal: 0 },
      { name: 'bottom', x: rectX + scaledDepth/2, y: rectY + scaledWidth, normal: 90 },
      { name: 'left', x: rectX, y: rectY + scaledWidth/2, normal: 180 }
    ];
    
    // Create 12 arrows evenly spaced with rotation applied
    for (let i = 0; i < 12; i++) {
      const baseAngle = (i * 360 / 12); // Base angle in degrees
      // Apply rotation: when rotation=0, first arrow (i=0) should point East (0°)
      const currentAngle = (baseAngle + rotation) % 360; // Apply rotation
      
      // Find which side this arrow belongs to based on ±45° from normal direction
      let belongingSide = null;
      let sideIndex = -1;
      
      for (let s = 0; s < sides.length; s++) {
        const side = sides[s];
        const normalAngle = side.normal;
        
        // Calculate angular difference, handling wraparound properly
        let angleDiff = Math.abs(currentAngle - normalAngle);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;
        
        // Check if arrow is within ±45° of this side's normal
        if (angleDiff <= 45) {
          belongingSide = side;
          sideIndex = s;
          break;
        }
      }
      
      if (belongingSide) {
        // Calculate quarter circle parameters for this side (same as in rendering)
        const normalRad = belongingSide.normal * Math.PI / 180;
        const line1Angle = (belongingSide.normal - 45) * Math.PI / 180;
        const line2Angle = (belongingSide.normal + 45) * Math.PI / 180;
        
        const t = (rectCenterX - rectX) * 1.5; // Use horizontal distance since depth is now horizontal
        
        const point1X = belongingSide.x + Math.cos(line1Angle) * t;
        const point1Y = belongingSide.y + Math.sin(line1Angle) * t;
        const point2X = belongingSide.x + Math.cos(line2Angle) * t;
        const point2Y = belongingSide.y + Math.sin(line2Angle) * t;
        
        const midX = (point1X + point2X) / 2;
        const midY = (point1Y + point2Y) / 2;
        
        const chordLength = Math.sqrt((point2X - point1X) ** 2 + (point2Y - point1Y) ** 2);
        const radius = chordLength / Math.sqrt(2);
        
        const chordAngle = Math.atan2(point2Y - point1Y, point2X - point1X);
        const perpAngle = chordAngle + Math.PI / 2;
        const centerDistance = radius / Math.sqrt(2);
        
        let finalCenterX = midX + Math.cos(perpAngle) * centerDistance;
        let finalCenterY = midY + Math.sin(perpAngle) * centerDistance;
        
        const rectToMid = Math.atan2(midY - rectCenterY, midX - rectCenterX);
        const rectToCenter = Math.atan2(finalCenterY - rectCenterY, finalCenterX - rectCenterX);
        
        if (Math.abs(rectToCenter - rectToMid) > Math.PI / 2) {
          finalCenterX = midX - Math.cos(perpAngle) * centerDistance;
          finalCenterY = midY - Math.sin(perpAngle) * centerDistance;
        }
        
        // Position arrow on the arc based on its angle relative to the side's normal
        const relativeAngle = currentAngle - belongingSide.normal;
        const normalizedAngle = ((relativeAngle + 180) % 360) - 180; // -180 to 180
        
        // Map the angle to position on the 90° arc (-45° to +45°)
        const arcProgress = (normalizedAngle + 45) / 90; // 0 to 1
        const arcAngle = (belongingSide.normal - 45 + arcProgress * 90) * Math.PI / 180;
        
        // Calculate position on arc
        const arcX = finalCenterX + Math.cos(arcAngle) * radius;
        const arcY = finalCenterY + Math.sin(arcAngle) * radius;
        
        // Calculate normal direction at this point on the arc (pointing toward rectangle center)
        const normalToArc = Math.atan2(finalCenterY - arcY, finalCenterX - arcX);
        
        // Arrow points toward the center of the belonging side
        const targetX = belongingSide.x;
        const targetY = belongingSide.y;
        const arrowDirection = Math.atan2(targetY - arcY, targetX - arcX);
        
        // Calculate arrow end position
        const endX = arcX + Math.cos(arrowDirection) * arrowLength;
        const endY = arcY + Math.sin(arrowDirection) * arrowLength;
        
        // Calculate label position (outward from arc)
        const labelX = arcX - Math.cos(arrowDirection) * 20;
        const labelY = arcY - Math.sin(arrowDirection) * 20;
        
        arrows.push({
          x1: arcX,
          y1: arcY,
          x2: endX,
          y2: endY,
          labelX: labelX,
          labelY: labelY,
          compassDirection: compassDirections[i],
          angle: arrowDirection,
        });
      }
    }

    return arrows;
  };


  // Convert progress along side to actual coordinates
  const progressToCoordinates = (progress: number, side: string): { x: number; y: number } => {
    switch (side) {
      case 'top':
        return { x: rectX + progress * scaledDepth, y: rectY };
      case 'right':
        return { x: rectX + scaledDepth, y: rectY + progress * scaledWidth };
      case 'bottom':
        return { x: rectX + (1 - progress) * scaledDepth, y: rectY + scaledWidth };
      case 'left':
        return { x: rectX, y: rectY + (1 - progress) * scaledWidth };
      default:
        return { x: rectX, y: rectY };
    }
  };

  // Convert coordinates to progress and side for dots
  const coordinatesToProgress = (x: number, y: number, lineId: number): DotPosition => {
    const distances = [
      { side: 'top', distance: Math.abs(y - rectY), progress: Math.max(0, Math.min(1, (x - rectX) / scaledDepth)) },
      { side: 'right', distance: Math.abs(x - (rectX + scaledDepth)), progress: Math.max(0, Math.min(1, (y - rectY) / scaledWidth)) },
      { side: 'bottom', distance: Math.abs(y - (rectY + scaledWidth)), progress: Math.max(0, Math.min(1, 1 - (x - rectX) / scaledDepth)) },
      { side: 'left', distance: Math.abs(x - rectX), progress: Math.max(0, Math.min(1, 1 - (y - rectY) / scaledWidth)) },
    ];

    const closest = distances.reduce((min, curr) => curr.distance < min.distance ? curr : min);
    const coords = progressToCoordinates(closest.progress, closest.side);
    
    return {
      x: coords.x,
      y: coords.y,
      side: closest.side as 'top' | 'right' | 'bottom' | 'left',
      progress: closest.progress,
      lineId,
    };
  };

  // Convert coordinates to line position (anywhere inside rectangle)
  const coordinatesToLinePosition = (x: number, y: number, lineId: number, length: number, rotation: number = 0): LinePosition => {
    const isVertical = rotation === 90 || rotation === 270;
    
    // Calculate the constraints based on line orientation and length
    let clampedX, clampedY;
    
    if (isVertical) {
      // For vertical lines, constrain Y so both ends stay inside
      const minY = rectY;
      const maxY = rectY + scaledWidth - length;
      clampedY = Math.max(minY, Math.min(maxY, y));
      clampedX = Math.max(rectX, Math.min(rectX + scaledDepth, x));
    } else {
      // For horizontal lines, constrain X so both ends stay inside
      const minX = rectX;
      const maxX = rectX + scaledDepth - length;
      clampedX = Math.max(minX, Math.min(maxX, x));
      clampedY = Math.max(rectY, Math.min(rectY + scaledWidth, y));
    }
    
    return {
      x: clampedX,
      y: clampedY,
      side: 'inside' as any,
      progress: 0,
      lineId,
      length,
      rotation,
    };
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (selectedLineId === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find the selected construction line
    const selectedConstructionLine = constructionLines.find(line => line.id === selectedLineId);
    if (!selectedConstructionLine) return;

    // Check if the line is vertical
    const isVertical = selectedConstructionLine.x1 === selectedConstructionLine.x2;

    if (isVertical) {
      // Handle dots for vertical lines
      const newDot = coordinatesToProgress(x, y, selectedLineId);
      
      setDots(prev => {
        const existingIndex = prev.findIndex(dot => dot.lineId === selectedLineId);
        if (existingIndex >= 0) {
          // Replace existing dot
          return prev.map((dot, index) => index === existingIndex ? newDot : dot);
        } else {
          // Add new dot
          return [...prev, newDot];
        }
      });
      onDotPlaced?.(newDot);
    } else {
      // Handle lines for non-vertical lines - apply scaling to maintain proper proportions
      const lineLength = Math.abs(selectedConstructionLine.x2 - selectedConstructionLine.x1) * scale;
      
      setLines(prev => {
        const existingIndex = prev.findIndex(line => line.lineId === selectedLineId);
        if (existingIndex >= 0) {
          // Replace existing line but preserve its rotation
          const existingLine = prev[existingIndex];
          const newLine = coordinatesToLinePosition(x, y, selectedLineId, lineLength, existingLine.rotation);
          return prev.map((line, index) => index === existingIndex ? newLine : line);
        } else {
          // Add new line with default rotation
          const newLine = coordinatesToLinePosition(x, y, selectedLineId, lineLength, 0);
          return [...prev, newLine];
        }
      });
    }
  };

  const clearDots = () => {
    setDots([]);
    setLines([]);
  };

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(index);
  };

  const handleTriangleMouseDown = (triangleId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Triangle mouse down:', triangleId, 'BEFORE - draggedLineIndex:', draggedLineIndex);
    
    // AGGRESSIVELY clear any line dragging state
    triangleDragRef.current = triangleId; // Set ref immediately
    setDraggedLineIndex(null); // Clear line dragging when triangle is clicked
    setDraggedTriangleId(triangleId);
    
    console.log('Triangle mouse down:', triangleId, 'AFTER - cleared draggedLineIndex');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current) return;

    // IMMEDIATE BLOCK: If any triangle is being dragged, handle ONLY triangle logic
    if (draggedTriangleId !== null || triangleDragRef.current !== null) {
      const currentTriangleId = draggedTriangleId || triangleDragRef.current;
      console.log('TRIANGLE DRAG ACTIVE - blocking all other drag logic:', currentTriangleId);
      
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const [lineIndex, side] = currentTriangleId!.split('-');
      const lineIdx = parseInt(lineIndex);
      const line = lines[lineIdx];
      
      if (line) {
        // Calculate distance from mouse to line center
        const isVertical = line.rotation === 90 || line.rotation === 270;
        let distance = 0;
        
        if (isVertical) {
          if (side === 'left') {
            distance = Math.max(0, line.x - x);
          } else if (side === 'right') {
            distance = Math.max(0, x - line.x);
          }
        } else {
          if (side === 'top') {
            distance = Math.max(0, line.y - y);
          } else if (side === 'bottom') {
            distance = Math.max(0, y - line.y);
          }
        }
        
        // Constrain distance to rectangle bounds
        let maxDistance = 0;
        if (isVertical) {
          if (side === 'left') {
            maxDistance = line.x - rectX;
          } else if (side === 'right') {
            maxDistance = (rectX + scaledDepth) - line.x;
          }
        } else {
          if (side === 'top') {
            maxDistance = line.y - rectY;
          } else if (side === 'bottom') {
            maxDistance = (rectY + scaledWidth) - line.y;
          }
        }
        
        distance = Math.max(0, Math.min(maxDistance, distance));
        
        // Update or create shaded area
        const areaId = `${lineIdx}-${side}`;
        setShadedAreas(prev => {
          const existingIndex = prev.findIndex(area => area.id === areaId);
          const newArea: ShadedArea = {
            id: areaId,
            lineId: line.lineId,
            side: side as 'left' | 'right' | 'top' | 'bottom',
            width: distance
          };
          
          if (existingIndex >= 0) {
            return prev.map((area, index) => index === existingIndex ? newArea : area);
          } else {
            return [...prev, newArea];
          }
        });
      }
      return; // CRITICAL: Exit immediately, don't process anything else
    }

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging !== null) {
      const draggedDot = dots[isDragging];
      const newPosition = coordinatesToProgress(x, y, draggedDot.lineId);
      
      setDots(prev => prev.map((dot, index) => 
        index === isDragging ? newPosition : dot
      ));
    }

    // Only process line dragging if no triangle is being dragged AND draggedLineIndex is set
    if (draggedLineIndex !== null && draggedTriangleId === null && triangleDragRef.current === null) {
      console.log('Moving line - draggedLineIndex:', draggedLineIndex, 'draggedTriangleId:', draggedTriangleId);
      setLines(prev => {
        // DEFENSIVE CHECK: Double-check triangle dragging state before actually updating
        if (draggedTriangleId !== null || triangleDragRef.current !== null) {
          console.log('BLOCKED line update - triangle is active during setLines');
          return prev; // Return unchanged if triangle dragging became active
        }
        
        const draggedLine = prev[draggedLineIndex];
        console.log('Dragging line with rotation:', draggedLine.rotation);
        // Always preserve the current line's rotation (set by double-click)
        const newPosition = coordinatesToLinePosition(x, y, draggedLine.lineId, draggedLine.length, draggedLine.rotation);
        console.log('New position rotation:', newPosition.rotation);
        
        return prev.map((line, index) => 
          index === draggedLineIndex ? newPosition : line
        );
      });
    }
  }, [isDragging, draggedLineIndex, draggedTriangleId, dots, lines, rectX, rectY, scaledDepth, scaledWidth]);

  const handleMouseUp = useCallback(() => {
    // Clear triangle dragging first to prevent any interference
    triangleDragRef.current = null; // Clear ref immediately
    if (draggedTriangleId !== null) {
      setDraggedTriangleId(null);
    }
    setIsDragging(null);
    setDraggedLineIndex(null);
  }, [draggedTriangleId]);

  React.useEffect(() => {
    if (isDragging !== null || draggedLineIndex !== null || draggedTriangleId !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, draggedLineIndex, draggedTriangleId, handleMouseMove, handleMouseUp]);

  // Force clear line dragging when triangle dragging starts
  React.useEffect(() => {
    if (draggedTriangleId !== null) {
      console.log('FORCE CLEARING draggedLineIndex due to triangle drag:', draggedTriangleId);
      setDraggedLineIndex(null);
    }
  }, [draggedTriangleId]);

  const arrows = getArrowPositions();

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      
      {/* Rotation control */}
      <div className="flex items-center gap-4">
        <label htmlFor="rotation" className="text-sm font-medium text-foreground">
          Rotation:
        </label>
        <input
          id="rotation"
          type="number"
          min="0"
          max="360"
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
          className="w-20 px-2 py-1 text-sm border rounded bg-background text-foreground"
        />
        <span className="text-sm text-muted-foreground">degrees</span>
      </div>

      <div className="border rounded-lg p-4 bg-card">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgDepth}
          className="border rounded"
          style={{ cursor: selectedLineId !== null ? 'crosshair' : 'default' }}
          onClick={handleSvgClick}
        >
          {/* Quarter circles for each side */}
          {(() => {
            const quarterCircles: JSX.Element[] = [];
            const sides = [
              { name: 'top', x: rectX + scaledDepth/2, y: rectY, normal: 270 },
              { name: 'right', x: rectX + scaledDepth, y: rectY + scaledWidth/2, normal: 0 },
              { name: 'bottom', x: rectX + scaledDepth/2, y: rectY + scaledWidth, normal: 90 },
              { name: 'left', x: rectX, y: rectY + scaledWidth/2, normal: 180 }
            ];
            
            sides.forEach((side, sideIndex) => {
              // Mathematical solution: Find quarter circle that intersects the 45° dashed lines
              
              // The dashed lines start at (side.x, side.y) and go in directions:
              const normalRad = side.normal * Math.PI / 180;
              const line1Angle = (side.normal - 45) * Math.PI / 180; // First dashed line direction
              const line2Angle = (side.normal + 45) * Math.PI / 180; // Second dashed line direction
              
              // For the quarter circle to intersect both dashed lines:
              // 1. Choose a distance 't' along each dashed line from the side midpoint
              // 2. These become the endpoints of our quarter circle arc
              const t = (rectCenterX - rectX) * 1.5; // Distance along each dashed line - use horizontal distance
              
              // Calculate the two points where we want the arc endpoints to be
              const point1X = side.x + Math.cos(line1Angle) * t;
              const point1Y = side.y + Math.sin(line1Angle) * t;
              const point2X = side.x + Math.cos(line2Angle) * t;
              const point2Y = side.y + Math.sin(line2Angle) * t;
              
              // Calculate the center of the circle that passes through these two points
              // and has the arc spanning exactly 90 degrees
              const midX = (point1X + point2X) / 2;
              const midY = (point1Y + point2Y) / 2;
              
              // For a 90-degree arc, the center is at distance r/√2 from the midpoint of the chord
              // where r is the radius of the circle
              const chordLength = Math.sqrt((point2X - point1X) ** 2 + (point2Y - point1Y) ** 2);
              const radius = chordLength / Math.sqrt(2); // For 90-degree arc
              
              // The center is along the perpendicular bisector of the chord, towards the rectangle
              const chordAngle = Math.atan2(point2Y - point1Y, point2X - point1X);
              const perpAngle = chordAngle + Math.PI / 2;
              const centerDistance = radius / Math.sqrt(2);
              
              // Choose the center position that's closer to the rectangle
              const centerX = midX + Math.cos(perpAngle) * centerDistance;
              const centerY = midY + Math.sin(perpAngle) * centerDistance;
              
              // Verify center is closer to rectangle by checking if it's in the right direction
              const rectToMid = Math.atan2(midY - rectCenterY, midX - rectCenterX);
              const rectToCenter = Math.atan2(centerY - rectCenterY, centerX - rectCenterX);
              
              // If center is further from rectangle, use the other perpendicular direction
              let finalCenterX = centerX;
              let finalCenterY = centerY;
              if (Math.abs(rectToCenter - rectToMid) > Math.PI / 2) {
                finalCenterX = midX - Math.cos(perpAngle) * centerDistance;
                finalCenterY = midY - Math.sin(perpAngle) * centerDistance;
              }
              
              // Create SVG arc path using the calculated endpoints and center
              const pathData = `M ${point1X} ${point1Y} A ${radius} ${radius} 0 0 1 ${point2X} ${point2Y}`;
              
              quarterCircles.push(
                <path
                  key={`quarter-circle-${sideIndex}`}
                  d={pathData}
                  fill="none"
                  stroke="black"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  opacity="0.7"
                />
              );
            });
            
            return quarterCircles;
          })()}

          {/* Coordinate Grid */}
          {(() => {
            const gridElements = [];
            const gridSpacing = Math.min(scaledDepth, scaledWidth) / 8; // Grid spacing based on smaller dimension
            
            // Calculate number of grid lines for each dimension
            const numVerticalLines = Math.ceil(scaledDepth / gridSpacing) + 1;
            const numHorizontalLines = Math.ceil(scaledWidth / gridSpacing) + 1;
            
            // Vertical grid lines
            for (let i = 0; i < numVerticalLines; i++) {
              const x = rectX + (i * gridSpacing);
              if (x <= rectX + scaledDepth) {
                gridElements.push(
                  <line
                    key={`vertical-${i}`}
                    x1={x}
                    y1={rectY}
                    x2={x}
                    y2={rectY + scaledWidth}
                    stroke="black"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                );
              }
            }
            
            // Horizontal grid lines
            for (let i = 0; i < numHorizontalLines; i++) {
              const y = rectY + (i * gridSpacing);
              if (y <= rectY + scaledWidth) {
                gridElements.push(
                  <line
                    key={`horizontal-${i}`}
                    x1={rectX}
                    y1={y}
                    x2={rectX + scaledDepth}
                    y2={y}
                    stroke="black"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                );
              }
            }
            
            // X coordinate labels (only at meter intervals)
            for (let meter = 0; meter <= depth; meter++) {
              const x = rectX + (meter / depth) * scaledDepth;
              gridElements.push(
                <text
                  key={`x-meter-${meter}`}
                  x={x}
                  y={rectY + scaledWidth + 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="black"
                >
                  {meter}
                </text>
              );
            }
            
            // Y coordinate labels (only at meter intervals) - inverted because 0,0 is at bottom left
            for (let meter = 0; meter <= width; meter++) {
              const y = rectY + scaledWidth - (meter / width) * scaledWidth;
              gridElements.push(
                <text
                  key={`y-meter-${meter}`}
                  x={rectX - 10}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="black"
                >
                  {meter}
                </text>
              );
            }
            
            return gridElements;
          })()}

          {/* Shaded areas */}
          {shadedAreas.map((area) => {
            const lineIndex = parseInt(area.id.split('-')[0]);
            const line = lines[lineIndex];
            if (!line) return null;

            const isVertical = line.rotation === 90 || line.rotation === 270;
            let rectProps = {};

            if (isVertical) {
              // For vertical lines
              if (area.side === 'left') {
                rectProps = {
                  x: line.x - area.width,
                  y: line.y,
                  width: area.width,
                  height: line.length
                };
              } else if (area.side === 'right') {
                rectProps = {
                  x: line.x,
                  y: line.y,
                  width: area.width,
                  height: line.length
                };
              }
            } else {
              // For horizontal lines
              if (area.side === 'top') {
                rectProps = {
                  x: line.x,
                  y: line.y - area.width,
                  width: line.length,
                  height: area.width
                };
              } else if (area.side === 'bottom') {
                rectProps = {
                  x: line.x,
                  y: line.y,
                  width: line.length,
                  height: area.width
                };
              }
            }

            return (
              <rect
                key={area.id}
                {...rectProps}
                fill="black"
                fillOpacity="0.2"
                stroke="black"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
            );
          })}

          <rect
            x={rectX}
            y={rectY}
            width={scaledDepth}
            height={scaledWidth}
            fill="none"
            stroke="black"
            strokeWidth="2"
          />

          {/* Arrows */}
          {arrows.map((arrow, index) => (
            <g key={index}>
              <line
                x1={arrow.x1}
                y1={arrow.y1}
                x2={arrow.x2}
                y2={arrow.y2}
                stroke="black"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              {/* Compass direction labels */}
              <text
                x={arrow.labelX}
                y={arrow.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12"
                fill="black"
                fontWeight="bold"
              >
                {arrow.compassDirection.name}
              </text>
            </g>
          ))}

          {/* 45-degree dashed lines from rectangle sides */}
          {(() => {
            const lines: JSX.Element[] = [];
            const sides = [
              { name: 'top', x: rectX + scaledDepth/2, y: rectY, normal: 270 },
              { name: 'right', x: rectX + scaledDepth, y: rectY + scaledWidth/2, normal: 0 },
              { name: 'bottom', x: rectX + scaledDepth/2, y: rectY + scaledWidth, normal: 90 },
              { name: 'left', x: rectX, y: rectY + scaledWidth/2, normal: 180 }
            ];
            
            sides.forEach((side, sideIndex) => {
              [45, -45].forEach((angleOffset, lineIndex) => {
                const angle = (side.normal + angleOffset) * Math.PI / 180;
                const dirX = Math.cos(angle);
                const dirY = Math.sin(angle);
                
                // Extend line to edge of SVG
                const maxDistance = Math.max(svgWidth, svgDepth);
                const endX = side.x + dirX * maxDistance;
                const endY = side.y + dirY * maxDistance;
                
                lines.push(
                  <line
                    key={`side-${sideIndex}-line-${lineIndex}`}
                    x1={side.x}
                    y1={side.y}
                    x2={endX}
                    y2={endY}
                    stroke="black"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity="0.6"
                  />
                );
              });
            });
            
            return lines;
          })()}

          {/* Arrow marker definitions */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="black"
              />
            </marker>
            <marker
              id="line-direction-arrow"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                fill="black"
              />
            </marker>
          </defs>

          {/* Draggable dots (for vertical lines) */}
          {dots.map((dot, index) => {
            const coords = progressToCoordinates(dot.progress, dot.side);
            const isSelected = selectedLineId === dot.lineId;
            return (
              <circle
                key={index}
                cx={coords.x}
                cy={coords.y}
                r="5"
                fill={isSelected ? "hsl(220, 91%, 56%)" : "hsl(var(--accent))"}
                stroke="black"
                strokeWidth="2"
                style={{ cursor: 'grab' }}
                onMouseDown={handleMouseDown(index)}
                onClick={(e) => e.stopPropagation()}
                className="hover:fill-primary transition-colors"
              />
            );
          })}

          {/* Lines (for non-vertical construction lines) */}
          {lines.map((line, index) => {
            const isSelected = selectedLineId === line.lineId;
            
            // Calculate line endpoints based on orientation
            let x1 = line.x;
            let y1 = line.y;
            let x2 = line.x;
            let y2 = line.y;
            
            if (line.rotation === 90 || line.rotation === 270) {
              y2 = y1 + line.length;
            } else {
              x2 = x1 + line.length;
            }
            
            // Clamp both endpoints to stay inside rectangle
            x1 = Math.max(rectX, Math.min(rectX + scaledDepth, x1));
            y1 = Math.max(rectY, Math.min(rectY + scaledWidth, y1));
            x2 = Math.max(rectX, Math.min(rectX + scaledDepth, x2));
            y2 = Math.max(rectY, Math.min(rectY + scaledWidth, y2));
            
            const handleLineClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              // Double click to flip orientation
              if (e.detail === 2) {
                console.log('Double click detected, flipping orientation for line', index);
                setLines(prev => {
                  const currentLine = prev[index];
                  
                  // Calculate current line center
                  const currentX1 = currentLine.x;
                  const currentY1 = currentLine.y;
                  const isVertical = currentLine.rotation === 90 || currentLine.rotation === 270;
                  const currentX2 = isVertical ? currentX1 : currentX1 + currentLine.length;
                  const currentY2 = isVertical ? currentY1 + currentLine.length : currentY1;
                  
                  const centerX = (currentX1 + currentX2) / 2;
                  const centerY = (currentY1 + currentY2) / 2;
                  
                  // Calculate new rotation (360 degree cycle: 0->90->180->270->0)
                  const newRotation = (currentLine.rotation + 90) % 360;
                  
                  // Calculate new position after 90-degree rotation around center
                  const halfLength = currentLine.length / 2;
                  let newX, newY;
                  
                  if (newRotation === 90 || newRotation === 270) {
                    // New position will be vertical
                    newX = centerX;
                    newY = centerY - halfLength;
                  } else {
                    // New position will be horizontal
                    newX = centerX - halfLength;
                    newY = centerY;
                  }
                  
                  // Create new line with rotated position and orientation
                  const newLine = coordinatesToLinePosition(newX, newY, currentLine.lineId, currentLine.length, newRotation);
                  
                  const newLines = prev.map((l, i) => 
                    i === index ? newLine : l
                  );
                  console.log('Line rotation changed to:', newLines[index].rotation);
                  
                  // Clear shaded areas for this line when rotating
                  setShadedAreas(prevAreas => 
                    prevAreas.filter(area => !area.id.startsWith(`${index}-`))
                  );
                  
                  return newLines;
                });
              }
            };

            const handleLineMouseDown = (e: React.MouseEvent) => {
              // Only allow line dragging if no triangle is currently being dragged (check both state and ref)
              if (draggedTriangleId !== null || triangleDragRef.current !== null) {
                console.log('BLOCKED line mouse down - triangle is active:', draggedTriangleId, triangleDragRef.current);
                return;
              }
              console.log('Line mouse down allowed - setting draggedLineIndex to:', index);
              e.preventDefault();
              e.stopPropagation();
              setDraggedLineIndex(index);
            };
            
            // Generate arrow for all lines based on rotation
            const generateLineArrow = () => {
              // Calculate midpoint
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              
              // Arrow length (half the line length)
              const arrowLength = line.length * 0.5;
              
              // Calculate direction based on rotation angle
              let dirX = 0;
              let dirY = 0;
              
              switch (line.rotation) {
                case 0:   // Horizontal right
                  dirX = 1;
                  dirY = 0;
                  break;
                case 90:  // Vertical down
                  dirX = 0;
                  dirY = 1;
                  break;
                case 180: // Horizontal left
                  dirX = -1;
                  dirY = 0;
                  break;
                case 270: // Vertical up
                  dirX = 0;
                  dirY = -1;
                  break;
                default:
                  dirX = 1;
                  dirY = 0;
              }
              
              // Calculate arrow start and end points
              const arrowStartX = midX - (dirX * arrowLength) / 2;
              const arrowStartY = midY - (dirY * arrowLength) / 2;
              const arrowEndX = midX + (dirX * arrowLength) / 2;
              const arrowEndY = midY + (dirY * arrowLength) / 2;
              
              return {
                x1: arrowStartX,
                y1: arrowStartY,
                x2: arrowEndX,
                y2: arrowEndY
              };
            };

            const arrow = generateLineArrow();
            
            // Generate triangular handles for each side of the line
            const isVertical = line.rotation === 90 || line.rotation === 270;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const triangleSize = 8;
            
            const triangles = [];
            
            // Check if there are shaded areas for this line
            const leftArea = shadedAreas.find(area => area.id === `${index}-left`);
            const rightArea = shadedAreas.find(area => area.id === `${index}-right`);
            const topArea = shadedAreas.find(area => area.id === `${index}-top`);
            const bottomArea = shadedAreas.find(area => area.id === `${index}-bottom`);
            
            if (isVertical) {
              // For vertical lines, triangles pointing away from the line
              const leftOffset = leftArea ? leftArea.width : triangleSize;
              const rightOffset = rightArea ? rightArea.width : triangleSize;
              
              const leftTriangle = [
                [midX - leftOffset - 8, midY],
                [midX - leftOffset, midY - 6],
                [midX - leftOffset, midY + 6]
              ];
              const rightTriangle = [
                [midX + rightOffset + 8, midY],
                [midX + rightOffset, midY - 6],
                [midX + rightOffset, midY + 6]
              ];
              
              triangles.push({ points: leftTriangle, id: `${index}-left` });
              triangles.push({ points: rightTriangle, id: `${index}-right` });
            } else {
              // For horizontal lines, triangles pointing away from the line
              const topOffset = topArea ? topArea.width : triangleSize;
              const bottomOffset = bottomArea ? bottomArea.width : triangleSize;
              
              const topTriangle = [
                [midX, midY - topOffset - 8],
                [midX - 6, midY - topOffset],
                [midX + 6, midY - topOffset]
              ];
              const bottomTriangle = [
                [midX, midY + bottomOffset + 8],
                [midX - 6, midY + bottomOffset],
                [midX + 6, midY + bottomOffset]
              ];
              
              triangles.push({ points: topTriangle, id: `${index}-top` });
              triangles.push({ points: bottomTriangle, id: `${index}-bottom` });
            }

            return (
              <g key={`line-${index}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isSelected ? "hsl(220, 91%, 56%)" : "black"}
                  strokeWidth="4"
                  style={{ cursor: 'move' }}
                  onClick={handleLineClick}
                  onMouseDown={handleLineMouseDown}
                />
                {/* Direction arrow for non-vertical lines */}
                {arrow && (
                  <line
                    x1={arrow.x1}
                    y1={arrow.y1}
                    x2={arrow.x2}
                    y2={arrow.y2}
                    stroke={isSelected ? "hsl(220, 91%, 56%)" : "transparent"}
                    strokeWidth="2"
                    markerEnd="url(#line-direction-arrow)"
                    pointerEvents="none"
                  />
                )}
                {/* Triangular drag handles */}
                {triangles.map((triangle) => (
                  <polygon
                    key={triangle.id}
                    points={triangle.points.map(p => p.join(',')).join(' ')}
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="1"
                    style={{ cursor: 'grab' }}
                    onMouseDown={handleTriangleMouseDown(triangle.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:fill-primary/80 transition-colors"
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <button 
          onClick={clearDots}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
        >
          Clear Dots
        </button>
        <div className="text-sm text-muted-foreground text-center">
          <p>12 arrows point toward the center of the rectangle</p>
          {selectedLineId !== null && (
            <div className="text-primary mt-2">
              <p>Click to place dots for vertical lines or lines anywhere inside rectangle.</p>
              <p>Double-click lines to flip 90°. Drag to move.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveRectangle;