import { Analysis, LimitState } from "@/lib/types";
import { Card } from "@/components/ui/card";
import classNames from "classnames";
import { useEffect, useRef } from "react";

const limitStates = ["ULS", "SLS", "ALS"] as const;

type URLoadCombinationsCardProps = {
  selectedLimitState: LimitState;
  selectedLC: string | null;
  onLCSelect: (lc: string) => void;
  onLimitStateSelect: (ls: LimitState) => void;
  loadCombinations: string[];
  analysis: Analysis;
};

const URLoadCombinationsCard: React.FC<URLoadCombinationsCardProps> = ({
  selectedLimitState,
  selectedLC,
  onLCSelect,
  onLimitStateSelect,
  loadCombinations,
  analysis,
}) => {  const prevLimitStateRef = useRef<LimitState>(selectedLimitState);
  const prevLCRef = useRef<string | null>(selectedLC);
  const prevAnalysisRef = useRef<Analysis>(analysis);
  const hasAutoSelectedRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (analysis === "Ve") {
      // Store previous states before switching to "Ve"
      prevLimitStateRef.current = selectedLimitState;
      prevLCRef.current = selectedLC;
      // Set selectedLimitState to "SLS"
      if (selectedLimitState !== "SLS") {
        onLimitStateSelect("SLS");
      }
    } else if (prevAnalysisRef.current === "Ve") {
      // Restore previous states when switching from "Ve"
      if (prevLimitStateRef.current && prevLimitStateRef.current !== selectedLimitState) {
        onLimitStateSelect(prevLimitStateRef.current);
      }
      if (prevLCRef.current && prevLCRef.current !== selectedLC && prevLCRef.current !== null) {
        onLCSelect(prevLCRef.current);
      }
    }
    
    // Only auto-select "Maksimale udnyttelser, samlet" if we haven't done it before for these analyses
    if ((analysis === "UR" || analysis === "M" || analysis === "F1" || analysis === "F2") && !hasAutoSelectedRef.current) {
      onLCSelect("Maksimale udnyttelser, samlet");
      hasAutoSelectedRef.current = true;
    }
    
    // Update previous analysis
    prevAnalysisRef.current = analysis;
  }, [analysis]);

  const combosToShow = loadCombinations;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-2">
        <div className="flex justify-between items-center gap-2">
          {limitStates.map((ls) => {
            const isDisabled = analysis === "Ve" && (ls === "ULS" || ls === "ALS");
            return (
              <button
                key={ls}
                disabled={isDisabled}
                onClick={() => onLimitStateSelect(ls)} // added onClick handler
                className={classNames("flex-grow p-2 rounded font-semibold", {
                  "bg-gray-100": selectedLimitState === ls,
                  "text-gray-500": isDisabled,
                })}
              >
                {ls}
              </button>
            );
          })}
        </div>        <div className="font-bold p-2">Lastkombinationer</div>        <div className="max-h-[600px] w-[300px] overflow-y-auto">
          {(analysis === "UR" || analysis === "M" || analysis === "F1" || analysis === "F2") && (
            <>
              <button
                className={classNames(
                  "block mb-2 rounded p-2 w-full text-left",
                  {
                    "bg-gray-100": selectedLC === "Maksimale udnyttelser, samlet",
                  }
                )}
                onClick={() => onLCSelect("Maksimale udnyttelser, samlet")}
              >
                Maksimale udnyttelser, samlet
              </button>
              <div className="border-b border-gray-300 mb-2"></div>
            </>
          )}
          {combosToShow?.map((lc) => (
            <button
              className={classNames(
                "block mb-2 rounded p-2 w-full text-left",
                {
                  "bg-gray-100": lc === selectedLC,
                }
              )}
              onClick={() => { onLCSelect(lc); }}
              key={lc}
            >
              {lc}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default URLoadCombinationsCard;
