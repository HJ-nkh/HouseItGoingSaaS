import React from 'react';
import { LoadType } from './lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type GroupConfirmationCardProps = {
  selectedLoadCount: number;
  loadType: LoadType;
  onConfirm: () => void;
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
  return (
    <Card 
      className="absolute bg-white border rounded shadow-lg p-4 z-50"
      style={{ 
        left: position.x, 
        top: position.y,
        minWidth: '200px'
      }}
    >
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Gruppér laster</h3>
        <p className="text-sm text-gray-600">
          Vil du gruppere {selectedLoadCount} {loadTypeNames[loadType].toLowerCase()}?
        </p>
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
            onClick={onConfirm}
          >
            OK
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default GroupConfirmationCard;
