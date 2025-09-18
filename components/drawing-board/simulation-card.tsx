import { Analysis, LimitState } from "@/lib/types";
//import LoadCombinationCard from "../load-combination-card";
import URLoadCombinationsCard from "./ur-load-combinations-card";

type SimulationCardProps = {
	analysis: Analysis;
	selectedLC: string | null;
  setSelectedLC: (lc: string | null) => void;
	selectedLimitState: LimitState;
	setSelectedLimitState: (ls: LimitState) => void;
	loadCombinations: string[];
	loadCombinationsUR: Record<LimitState, string[]>;
}

const SimulationCard: React.FC<SimulationCardProps> = ({ selectedLC, setSelectedLC, selectedLimitState, setSelectedLimitState, loadCombinationsUR, analysis }) => {
            return (
            <URLoadCombinationsCard
              selectedLimitState={selectedLimitState}
              selectedLC={selectedLC}
              onLCSelect={(lc: string) => setSelectedLC(lc)}
              onLimitStateSelect={(ls: LimitState) => {
                // Preserve LC if still valid in new LS; clear otherwise
                setSelectedLimitState(ls);
                const options = loadCombinationsUR[ls] || [];
                const isSpecial = selectedLC === "Maksimale udnyttelser, samlet";
                const specialAllowed = ["UR", "M", "F1", "F2"].includes(analysis);
                const lcIsValid = !!selectedLC && (!isSpecial ? options.includes(selectedLC) : specialAllowed);
                if (!lcIsValid) setSelectedLC(null);
              }}
              loadCombinations={loadCombinationsUR[selectedLimitState] || []}
              analysis={analysis}
            />
          )
          };

export default SimulationCard;
