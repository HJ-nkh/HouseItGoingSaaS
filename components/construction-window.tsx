import React, { useState, useRef, useCallback } from 'react';

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
}

const ConstructionWindow: React.FC<ConstructionWindowProps> = ({
  selectedLineId,
  onLineSelect,
  onLinesChange,
}) => {
  
  // Initial construction lines
  const [lines] = useState<Line[]>([
    { id: 1, x1: 0, y1: 0, x2: 0, y2: 3 },
    { id: 2, x1: 0, y1: 3, x2: 3, y2: 4 },
    { id: 3, x1: 3, y1: 4, x2: 6, y2: 3 },
    { id: 4, x1: 6, y1: 3, x2: 6, y2: 0 },
  ]);

  // SVG dimensions and scaling
  const scale = 40; // pixels per unit
  const padding = 100;
  const svgWidth = 400;
  const svgHeight = 300;
  const offsetX = padding;
  const offsetY = svgHeight - padding;

  // Convert construction coordinates to SVG coordinates
  const toSvgCoords = (x: number, y: number) => ({
    x: x * scale + offsetX,
    y: offsetY - y * scale,
  });

  // Convert SVG coordinates to construction coordinates
  const fromSvgCoords = (svgX: number, svgY: number) => ({
    x: (svgX - offsetX) / scale,
    y: (offsetY - svgY) / scale,
  });

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
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="borderrounded-lg p-4 bg-card">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="border rounded"
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

        </svg>
      </div>
      
      <div className="text-sm text-muted-foreground max-w-md text-center">
        <p>Click lines to select them. Selected vertical lines allow placing dots on the rectangle.</p>
        {selectedLine && isVerticalLine(selectedLine) && (
          <p className="text-blue-500 mt-2">Vertical line selected - click on the rectangle to place dots.</p>
        )}
      </div>
    </div>
  );
};

export default ConstructionWindow;