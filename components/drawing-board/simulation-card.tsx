import { Analysis, LimitState } from "@/types";
//import LoadCombinationCard from "../load-combination-card";
import URLoadCombinationsCard from "../ur-load-combinations-card";

type SimulationCardProps = {
	analysis: Analysis;
	selectedLC: string | null;
	setSelectedLC: (lc: string) => void;
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
              onLCSelect={(lc) => setSelectedLC(lc)}
              onLimitStateSelect={(ls) => {
                setSelectedLimitState(ls);
                setSelectedLC(loadCombinationsUR[ls][0] ?? null);
              }}
              loadCombinations={loadCombinationsUR[selectedLimitState]}
              analysis={analysis}
            />
          )
          };

export default SimulationCard;
