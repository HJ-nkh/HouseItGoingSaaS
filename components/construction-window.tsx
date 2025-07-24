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

  // Simple line selection handler
  const handleLineClick = (lineId: number) => {
    onLineSelect(selectedLineId === lineId ? null : lineId);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-semibold">Construction Lines</h3>
      
      <div className="border border-border rounded-lg p-4 bg-card">
        <svg width={300} height={200} className="border border-border rounded">
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1 * 40 + 50}
              y1={150 - line.y1 * 30}
              x2={line.x2 * 40 + 50}
              y2={150 - line.y2 * 30}
              stroke={selectedLineId === line.id ? "blue" : "black"}
              strokeWidth={selectedLineId === line.id ? 3 : 2}
              style={{ cursor: 'pointer' }}
              onClick={() => handleLineClick(line.id)}
            />
          ))}
        </svg>
      </div>
      
      <div className="text-sm text-muted-foreground max-w-md text-center">
        <p>Click lines to select them. Selected lines can be used in the rectangle.</p>
        {selectedLineId && (
          <p className="text-blue-500 mt-2">Line {selectedLineId} selected</p>
        )}
      </div>
    </div>
  );
};

export default ConstructionWindow;
