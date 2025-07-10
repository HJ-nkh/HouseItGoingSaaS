import React from 'react';

type WindZonesPlanProps = {
  d: number; // depth/dybde
  b: number; // width/bredde  
  h: number; // height/højde
  onSelect?: (zoneId: string) => void;
};

/**
 * WindZonesPlan component - placeholder
 * This component has been replaced with HouseCompassViewZones
 */
const WindZonesPlan: React.FC<WindZonesPlanProps> = ({ d, b, h, onSelect }) => {
  return (
    <div className="flex items-center justify-center h-32 text-gray-500">
      Component moved to HouseCompassViewZones
    </div>
  );
};

export default WindZonesPlan;
