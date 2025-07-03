import { LoadType } from "@/components/drawing-board/lib/types";

export const loadTypeColors = {
  backgroundLoadsButton: "bg-gray-300",
  background: {
    [LoadType.Standard]: "bg-gray-400",
    [LoadType.Snow]: "bg-blue-600",
    [LoadType.Wind]: "bg-red-400",
    [LoadType.Dead]: "bg-green-600",
    [LoadType.Live]: "bg-yellow-300",
  },
  fill: {
    [LoadType.Standard]: "fill-gray-400",
    [LoadType.Snow]: "fill-blue-600",
    [LoadType.Wind]: "fill-red-400",
    [LoadType.Dead]: "fill-green-600",
    [LoadType.Live]: "fill-yellow-300",
  },
  stroke: {
    [LoadType.Standard]: "stroke-gray-600",
    [LoadType.Snow]: "stroke-blue-500",
    [LoadType.Wind]: "stroke-red-400",
    [LoadType.Dead]: "stroke-green-500",
    [LoadType.Live]: "stroke-yellow-400",
  },
};
