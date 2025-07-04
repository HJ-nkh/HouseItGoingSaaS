'use client';

import { Drawing } from "@/lib/types";
import reduceHistory from "./drawing-board/lib/reduce-history";
import RenderedDistributedLoad from "./drawing-board/rendered-entities/distributed-load";
import RenderedMember from "./drawing-board/rendered-entities/member";
import RenderedMomentLoad from "./drawing-board/rendered-entities/moment-load";
import RenderedNode from "./drawing-board/rendered-entities/node";
import RenderedPointLoad from "./drawing-board/rendered-entities/point-load";
import RenderedSupport from "./drawing-board/rendered-entities/support";
import { ResolvedNode } from "./drawing-board/lib/types";
import React, { useMemo } from "react";

type DrawingThumbnailProps = {
  drawing: Drawing;
};

const DrawingThumbnail: React.FC<DrawingThumbnailProps> = ({ drawing }) => {
  const {
    nodes,
    members,
    pointLoads,
    distributedLoads,
    momentLoads,
    supports,
  } = reduceHistory(drawing.history);

  // Compute the viewBox to exactly fit the valid nodes centered on their average
  const computedViewBox = useMemo(() => {    const nodesArr = Object.values(nodes);
    const validNodes = nodesArr.filter((node: ResolvedNode) => {
      return node.resolved && typeof node.resolved.x === "number" && typeof node.resolved.y === "number";
    });
    if (validNodes.length === 0) return "-10 -10 20 20";

    // Compute average coordinates
    const sumX = validNodes.reduce((sum, node: ResolvedNode) => sum + node.resolved.x, 0);
    const sumY = validNodes.reduce((sum, node: ResolvedNode) => sum + node.resolved.y, 0);
    const avgX = sumX / validNodes.length;
    const avgY = sumY / validNodes.length;

    // Determine bounding extents relative to average
    const xs = validNodes.map((node: ResolvedNode) => node.resolved.x);
    const ys = validNodes.map((node: ResolvedNode) => node.resolved.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const leftExtent = avgX - minX;
    const rightExtent = maxX - avgX;
    const topExtent = avgY - minY;
    const bottomExtent = maxY - avgY;

    // Increased paddingFactor to zoom out a little more
    const paddingFactor = 0.1;
    const halfWidth = Math.max(Math.max(leftExtent, rightExtent), 1) * (1 + paddingFactor);
    const halfHeight = Math.max(Math.max(topExtent, bottomExtent), 1) * (1 + paddingFactor);

    return `${avgX - halfWidth} ${avgY - halfHeight} ${2 * halfWidth} ${2 * halfHeight}`;
  }, [nodes]);

  const gridSize = 2;
  const strokeWidth = 20 * 0.002;
  const size = 20 * 0.015;
  // New smaller sizes for nodes and supports
  const nodeSize = size * 0.2;
  const supportSize = 0.75;

  return (
    <div className="w-full h-full">
      <svg width="100%" height="100%" viewBox={computedViewBox}>
        <g>
          {/* POINT LOADS */}
          {Object.values(pointLoads).map((load) => {
            return (
              <RenderedPointLoad
                key={load.id}
                load={load}
                isSelected={false}
                isHovered={false}
                strokeWidth={strokeWidth}
                size={size}
              />
            );
          })}
  
          {/* DISTRIBUTED LOADS */}
          {Object.values(distributedLoads).map((load) => {
            return (
              <RenderedDistributedLoad
                key={load.id}
                load={load}
                gridSize={gridSize}
                isSelected={false}
                isHovered={false}
                strokeWidth={strokeWidth * 0.4}
                size={size}
              />
            );
          })}
  
          {/* MEMBERS */}
          {Object.values(members).map((member) => {
            return (
              <RenderedMember
                key={member.id}
                member={member}
                strokeWidth={strokeWidth}
                isSelected={false}
                isHovered={false}
                isVeAnalysis={false}
                isSectionForceAnalysis={false} // Added missing prop
                globalLocal="global" // Added missing prop
                memberSimulations={[]} // Added missing prop
                scaleVe={1} // Added missing prop
                selectedLC={""} // Added missing prop
              />
            );
          })}
  
          {/* MOMENT LOADS */}
          {Object.values(momentLoads).map((load) => {
            return (
              <RenderedMomentLoad
                key={load.id}
                load={load}
                isSelected={false}
                isHovered={false}
                size={size}
              />
            );
          })}
  
          {/* SUPPORTS */}
          {Object.values(supports).map((support) => {
            return (
              <RenderedSupport
                key={support.id}
                support={support}
                strokeWidth={3}
                isSelected={false}
                size={supportSize}  // updated smaller support size
              />
            );
          })}
  
          {/* NODES */}
          {Object.values(nodes).map((node) => {
            return (
              <RenderedNode
                isSelected={false}
                isHovered={false}
                key={node.id}
                node={node}
                size={nodeSize}  // updated smaller node size
                strokeWidth={strokeWidth}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default DrawingThumbnail;
