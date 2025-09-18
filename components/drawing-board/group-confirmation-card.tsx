import React, { useState } from 'react';
import { LoadType } from './lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type GroupConfirmationCardProps = {
  selectedLoadCount: number;
  loadType: LoadType;
  onConfirm: (groupName?: string) => void;
  onCancel: () => void;
  position: { x: number; y: number };
};

const loadTypeNames: Record<LoadType, string> = {
  [LoadType.Dead]: 'Egenlast',
  [LoadType.Live]: 'Nyttelast', 
  [LoadType.Snow]: 'Snelast',
  [LoadType.Wind]: 'Vindlast',
  [LoadType.Standard]: 'Karakteristisk last',
};

const GroupConfirmationCard: React.FC<GroupConfirmationCardProps> = ({
  selectedLoadCount,
  loadType,
  onConfirm,
  onCancel,
  position,
}) => {
  const [groupName, setGroupName] = useState('');

  const handleConfirm = () => {
    onConfirm(groupName.trim() || undefined);
  };

  return (
    <Card 
      className="absolute bg-white border rounded shadow-lg p-4 z-50"
      style={{ 
        left: position.x, 
        top: position.y,
        minWidth: '250px'
      }}
    >
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Gruppér laster</h3>
        <p className="text-sm text-gray-600">
          Vil du gruppere {selectedLoadCount} {loadTypeNames[loadType].toLowerCase()}?
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gruppenavn:
          </label>
          <Input
            type="text"
            placeholder="Valgfrit"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCancel}
          >
            Annuller
          </Button>
          <Button 
            size="sm" 
            onClick={handleConfirm}
          >
            OK
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default GroupConfirmationCard;
