import React from "react";
import { cn } from "@/lib/utils";
import { Analysis } from "@/lib/types";

type ScaleSimulationCardProps = {
  scale: number;
  setScale: (scale: number) => void;
  analysis: Analysis; // Add this line
  className?: string;
};

const ScaleSimulationCard: React.FC<ScaleSimulationCardProps> = ({ scale, setScale, analysis, className }) => {
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(Number(e.target.value));
  };

  // Adjust min, max, and step based on analysis
  const inputProps =
    analysis === "Ve"
      ? { min: "0.0", max: "1000", step: "1" }
    : analysis === "R0"
    ? { min: "0", max: "0.005", step: "0.00001" }
      : { min: "0", max: "0.001", step: "0.00001" };

  return (
    <div
      className={cn(
        "bg-white border rounded flex items-center gap-2 px-3 py-1 text-gray-500 w-full",
        className
      )}
      style={{ height: '48px' }}
    >
      <label htmlFor="scale" className="p-2">
        Skalér:
      </label>
      <input
        type="range"
        id="scale"
        value={scale}
        onChange={handleScaleChange}
        className="flex-grow h-8"
        {...inputProps} // Spread the inputProps
      />
    </div>
  );
};

export default ScaleSimulationCard;
