import React from 'react';
import { Analysis, LimitState } from '@/lib/types';

interface URLoadCombinationsCardProps {
  selectedLimitState: LimitState;
  selectedLC: string | null;
  onLCSelect: (lc: string) => void;
  onLimitStateSelect: (ls: LimitState) => void;
  loadCombinations: string[];
  analysis: Analysis;
}

const URLoadCombinationsCard: React.FC<URLoadCombinationsCardProps> = ({
  selectedLimitState,
  selectedLC,
  onLCSelect,
  onLimitStateSelect,
  loadCombinations,
  analysis,
}) => {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-2">Load Combinations</h3>
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium mb-1">Limit State:</label>
          <select 
            value={selectedLimitState} 
            onChange={(e) => onLimitStateSelect(e.target.value as LimitState)}
            className="w-full p-2 border rounded"
          >
            <option value="ULS">ULS</option>
            <option value="SLS">SLS</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Load Combination:</label>
          <select 
            value={selectedLC || ''} 
            onChange={(e) => onLCSelect(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {loadCombinations.map((lc) => (
              <option key={lc} value={lc}>{lc}</option>
            ))}
          </select>
        </div>
        
        <div className="text-sm text-gray-600">
          Analysis: {analysis || 'None'}
        </div>
      </div>
    </div>
  );
};

export default URLoadCombinationsCard;
