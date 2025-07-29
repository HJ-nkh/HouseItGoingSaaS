import React, { useState, useRef, useCallback } from 'react';
import NumberInput from './number-input';

interface Line {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ConstructionWindowProps {
  selectedLineId: number | null;
  onLineSelect: (lineId: number | null) => void;
  onLinesChange?: (lines: Line[]) => void;
  constructionLines?: Line[]; // Add prop for construction lines from drawing board
  // Terrain height props
  showTerrainHeight?: boolean;
  terrainHeight?: number;
  onTerrainHeightChange?: (height: number) => void;
  constructionDots?: Array<{
    x: number;
    y: number;
    side: 'top' | 'right' | 'bottom' | 'left';
    progress: number;
    lineId: number;
  }>;
  constructionElements?: Array<{
    x: number;
    y: number;
    side: 'top' | 'right' | 'bottom' | 'left' | 'inside';
    progress: number;
    lineId: number;
    length: number;
    rotation: number;
  }>;
}

const ConstructionWindow: React.FC<ConstructionWindowProps> = ({
  selectedLineId,
  onLineSelect,
  onLinesChange,
  constructionLines = [], // Default to empty array if not provided
  showTerrainHeight = false,
  terrainHeight = 0,
  onTerrainHeightChange,
  constructionDots = [],
  constructionElements = [],
}) => {
  
  // Use only construction lines from drawing board
  const lines = constructionLines;

  // SVG dimensions - fixed size to match interactive rectangle
  const svgWidth = 400;
  const svgHeight = 400;
  const padding = 40;

  // Calculate construction bounds to scale it to fill the window
  const getBounds = (lines: Line[]) => {
    if (lines.length === 0) return { minX: 0, maxX: 6, minY: 0, maxY: 4 };
    
    let minX = Math.min(...lines.flatMap(line => [line.x1, line.x2]));
    let maxX = Math.max(...lines.flatMap(line => [line.x1, line.x2]));
    let minY = Math.min(...lines.flatMap(line => [line.y1, line.y2]));
    let maxY = Math.max(...lines.flatMap(line => [line.y1, line.y2]));
    
    // Add small margin if bounds are too tight
    const width = maxX - minX;
    const height = maxY - minY;
    if (width < 0.1) { minX -= 0.5; maxX += 0.5; }
    if (height < 0.1) { minY -= 0.5; maxY += 0.5; }
    
    return { minX, maxX, minY, maxY };
  };

  const bounds = getBounds(lines);
  const constructionWidth = bounds.maxX - bounds.minX;
  const constructionHeight = bounds.maxY - bounds.minY;
  
  // Calculate scale to fit construction in available space
  const availableWidth = svgWidth - 2 * padding;
  const availableHeight = svgHeight - 2 * padding;
  const scaleX = availableWidth / constructionWidth;
  const scaleY = availableHeight / constructionHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 0.9 for some margin
  
  // Center the construction in the SVG
  const offsetX = padding + (availableWidth - constructionWidth * scale) / 2 - bounds.minX * scale;
  const offsetY = padding + (availableHeight - constructionHeight * scale) / 2 - bounds.minY * scale;

  // Convert construction coordinates to SVG coordinates
  const toSvgCoords = (x: number, y: number) => ({
    x: x * scale + offsetX,
    y: y * scale + offsetY, // Fixed: removed the Y-axis flip
  });

  // Convert SVG coordinates to construction coordinates
  const fromSvgCoords = (svgX: number, svgY: number) => ({
    x: (svgX - offsetX) / scale,
    y: (svgY - offsetY) / scale, // Fixed: removed the Y-axis flip
  });

  // Find the lowest construction element for terrain height indicator
  const findLowestConstructionElement = () => {
    if (lines.length === 0) return null;
    
    // Get all endpoints of construction lines
    const allPoints: Array<{ x: number; y: number }> = [];
    lines.forEach(line => {
      allPoints.push({ x: line.x1, y: line.y1 });
      allPoints.push({ x: line.x2, y: line.y2 });
    });
    
    if (allPoints.length === 0) return null;
    
    // Find the point with the highest y value (lowest in construction coordinates)
    const maxY = Math.max(...allPoints.map(p => p.y));
    const lowestPoints = allPoints.filter(p => p.y === maxY);
    
    // If multiple points at same y level, find the leftmost (smallest x)
    const minX = Math.min(...lowestPoints.map(p => p.x));
    const lowestLeftmostPoint = lowestPoints.find(p => p.x === minX);
    
    return lowestLeftmostPoint;
  };

  // Check if a line is vertical
  const isVerticalLine = (line: Line) => line.x1 === line.x2;

  // Generate arrow for non-vertical lines
  const generateArrow = (line: Line) => {
    if (isVerticalLine(line)) return null;
    
    const start = toSvgCoords(line.x1, line.y1);
    const end = toSvgCoords(line.x2, line.y2);
    
    // Calculate midpoint
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    // Calculate line direction and length
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const dirX = dx / lineLength;
    const dirY = dy / lineLength;
    
    // Arrow length (half the line length)
    const arrowLength = lineLength * 0.5;
    
    // Ensure arrow points towards right (positive x direction)
    const arrowDirX = dirX >= 0 ? dirX : -dirX;
    const arrowDirY = dirX >= 0 ? dirY : -dy;
    
    // Calculate arrow start and end points
    const arrowStartX = midX - (arrowDirX * arrowLength) / 2;
    const arrowStartY = midY - (arrowDirY * arrowLength) / 2;
    const arrowEndX = midX + (arrowDirX * arrowLength) / 2;
    const arrowEndY = midY + (arrowDirY * arrowLength) / 2;
    
    return {
      x1: arrowStartX,
      y1: arrowStartY,
      x2: arrowEndX,
      y2: arrowEndY
    };
  };

  // Get the selected line
  const selectedLine = lines.find(line => line.id === selectedLineId);

  const handleLineClick = (lineId: number) => {
    const newSelectedId = selectedLineId === lineId ? null : lineId;
    onLineSelect(newSelectedId);
  };

  // Pass lines data to parent component
  React.useEffect(() => {
    onLinesChange?.(lines);
  }, [lines, onLinesChange]);


  return (
    <div className="relative flex flex-col items-center gap-2 p-4">

        <svg
          width={svgWidth}
          height={svgHeight}
          className="no-border rounded"
        >
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="line-arrow"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                fill="hsl(var(--foreground))"
                className="transition-all duration-200"
              />
            </marker>
          </defs>
          
          <style>
            {`
              .group:hover marker#line-arrow polygon {
                fill: #3b82f6 !important;
              }
            `}
          </style>

          {/* Construction lines */}
          {lines.map((line) => {
            const start = toSvgCoords(line.x1, line.y1);
            const end = toSvgCoords(line.x2, line.y2);
            const isSelected = selectedLineId === line.id;
            const isVertical = isVerticalLine(line);
            const arrow = generateArrow(line);
            
            return (
              <g key={line.id} className="group">
                {/* Invisible wider clickable area */}
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="transparent"
                  strokeWidth="12"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLineClick(line.id);
                  }}
                />
                {/* Visible line */}
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isSelected ? "#3b82f6" : "black"}
                  strokeWidth={isSelected ? "3" : "2"}
                  style={{ 
                    cursor: 'pointer', 
                    pointerEvents: 'none',
                    opacity: isVertical ? 1 : 0.7,
                    transition: 'all 0.2s ease'
                  }}
                  className="group-hover:!stroke-[#3b82f6] group-hover:!opacity-100"
                />
                {/* Arrow for non-vertical lines */}
                {arrow && (
                  <line
                    x1={arrow.x1}
                    y1={arrow.y1}
                    x2={arrow.x2}
                    y2={arrow.y2}
                    stroke={"transparent"}
                    strokeWidth="2"
                    markerEnd="url(#line-arrow)"
                    pointerEvents="none"
                    style={{ transition: 'all 0.2s ease' }}
                    className="group-hover:!stroke-[#3b82f6]"
                  />
                )}
              </g>
            );
          })}

          {/* Terrain height indicator - intersecting the lowest construction element */}
          {showTerrainHeight && (() => {
            const lowestElement = findLowestConstructionElement();
            if (!lowestElement) return null;
            
            // Convert to SVG coordinates
            const svgCoords = toSvgCoords(lowestElement.x, lowestElement.y);
            const lineY = svgCoords.y; // Position line exactly at the element point
            const lineStartX = svgCoords.x - 25;
            const lineEndX = svgCoords.x + 25;
            
            return (
              <g>
                {/* Red horizontal line intersecting the point */}
                <line
                  x1={lineStartX}
                  y1={lineY}
                  x2={lineEndX}
                  y2={lineY}
                  stroke="red"
                  strokeWidth={3}
                />
                
                {/* Text label below the intersection line */}
                <text
                  x={lineStartX}
                  y={lineY + 20}
                  textAnchor="start"
                  fontSize="10"
                  fill="red"
                  fontWeight="bold"
                >
                  Højde over terræn:
                </text>
              </g>
            );
          })()}

        </svg>
        
        {/* Normal input field positioned next to red text */}
        {showTerrainHeight && (() => {
          const lowestElement = findLowestConstructionElement();
          if (!lowestElement) return null;
          
          // Convert to SVG coordinates to position the input
          const svgCoords = toSvgCoords(lowestElement.x, lowestElement.y);
          const lineStartX = svgCoords.x - 25;
          
          // Calculate fixed distance from end of red text
          // Text "Højde over terræn:" is approximately 85px wide at font-size 10
          const textWidth = 85;
          const gapFromText = 5; // 5px gap from text
          
          return (
            <div 
              className="absolute"
              style={{
                left: `${lineStartX + textWidth + gapFromText}px`, // Fixed distance from red text
                top: `${svgCoords.y + 8}px`,
                zIndex: 10
              }}
            >
              <NumberInput
                value={terrainHeight}
                onChange={(value) => onTerrainHeightChange?.(value || 0)}
                unit="m"
                className="w-20 text-xs"
                min={0}
              />
            </div>
          );
        })()}
      
      <div className="text-xs text-muted-foreground max-w-md text-center">
        <p>Klik på konstruktionsdel som der ønskes vindlast på</p>
        {selectedLine && (
          <p className="text-blue-500 mt-1">Klik på huset for at placere konstruktionsdel</p>
        )}
      </div>
    </div>
  );
};

export default ConstructionWindow;