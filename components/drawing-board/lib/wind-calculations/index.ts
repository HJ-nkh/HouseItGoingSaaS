/**
 * Wind calculations module
 * Exports wind load calculation classes and utilities
 */

import { WindProp } from './windprop';
import { EC14, ZoneDWindPressureResult } from './EC1-4';
export { WindProp } from './windprop';
export type { Number } from './windprop';
export { EC14 } from './EC1-4';
export type { 
  WindLoadResult, 
  MultiSurfaceWindLoadResult, 
  MultiSurfaceWindLoadWithZoneInfo,
  WindPressureProfile,
  ZoneDWindPressureResult
} from './EC1-4';

// Export hooks
export { useWindCalculations, useWindCalculation } from './useWindCalculations';
export type { UseWindCalculationsProps, UseWindCalculationsReturn } from './useWindCalculations';

// Wind calculation input interface that matches the React component state
export interface WindCalculationInputs {
  // Building dimensions
  houseHeight: number;
  houseWidth: number;
  houseDepth: number;
  
  // Roof properties
  roofType: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  roofPitch?: number;
  hippedMainPitch?: number;
  hippedHipPitch?: number;
  
  // Flat roof edge properties
  flatRoofEdgeType?: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  
  // Environmental conditions
  distanceToSea: 'more_than_25km' | 'less_than_25km';
  terrainCategory: '0' | '1' | '2' | '3' | '4';
  formFactor: 'main_structure' | 'small_elements';
  houseRotation: number;
}

// Wind calculation results interface
export interface WindCalculationResults {
  // Basic wind parameters
  basicWindSpeed: number;        // vB [m/s]
  meanWindVelocity: number;      // vM [m/s]
  turbulenceIntensity: number;   // iV
  peakVelocityPressure: number;  // qP [Pa]
  
  // Wind load coefficients and pressures by surface/zone
  wallLoads?: {
    [surface: string]: {
      [cpeType: string]: { [zone: string]: number };
    };
  };
  
  roofLoads?: {
    [cpeType: string]: { [zone: string]: number };
  };

  // Zone D height-dependent pressure profiles
  zoneDProfiles?: {
    [surface: string]: ZoneDWindPressureResult;
  };
}

/**
 * Main wind calculation function that integrates with the React component
 */
export function calculateWindLoads(inputs: WindCalculationInputs): WindCalculationResults {
  // Convert distance to sea to kilometers
  const distToCoastKm = inputs.distanceToSea === 'more_than_25km' ? 30 : 15;
  
  // Convert terrain category to number
  const terrainCat = parseInt(inputs.terrainCategory);
  
  // Use roof pitch or default values based on roof type
  let roofPitch = inputs.roofPitch || 0;
  if (inputs.roofType === 'duopitch' && !inputs.roofPitch) {
    roofPitch = 30; // Default for duopitch
  } else if (inputs.roofType === 'monopitch' && !inputs.roofPitch) {
    roofPitch = 15; // Default for monopitch
  } else if (inputs.roofType === 'hipped') {
    roofPitch = inputs.hippedMainPitch || 30;
  }
  
  // Calculate wind directions for each side based on house rotation
  const windDirections = calculateWindDirectionsForAllSides(inputs.houseRotation);
  console.log('=== VINDBEREGNING RESULTATER ===');
  console.log('Hus rotation:', inputs.houseRotation, '° (gavl1 orientering fra nord)');
  console.log('');
  console.log('Gavl1 (top) normale vinkel:', inputs.houseRotation % 360, '°');
  console.log('Gavl1 vind retninger (±45°):');
  windDirections.gavl1.forEach(dir => console.log(`  ${dir.name}: ${dir.angle}° (compass), ${dir.svgAngle}° (SVG)`));
  console.log('');
  console.log('Facade2 (højre) normale vinkel:', (inputs.houseRotation + 90) % 360, '°');
  console.log('Facade2 vind retninger (±45°):');
  windDirections.facade2.forEach(dir => console.log(`  ${dir.name}: ${dir.angle}° (compass), ${dir.svgAngle}° (SVG)`));
  console.log('');
  console.log('Gavl2 (bund) normale vinkel:', (inputs.houseRotation + 180) % 360, '°');
  console.log('Gavl2 vind retninger (±45°):');
  windDirections.gavl2.forEach(dir => console.log(`  ${dir.name}: ${dir.angle}° (compass), ${dir.svgAngle}° (SVG)`));
  console.log('');
  console.log('Facade1 (venstre) normale vinkel:', (inputs.houseRotation + 270) % 360, '°');
  console.log('Facade1 vind retninger (±45°):');
  windDirections.facade1.forEach(dir => console.log(`  ${dir.name}: ${dir.angle}° (compass), ${dir.svgAngle}° (SVG)`));
  console.log('');
  
  // Find maximum wind for each individual side
  const maxFacade1Wind = findMaxWindDirection(windDirections.facade1, distToCoastKm);
  const maxGavl1Wind = findMaxWindDirection(windDirections.gavl1, distToCoastKm);
  const maxFacade2Wind = findMaxWindDirection(windDirections.facade2, distToCoastKm);
  const maxGavl2Wind = findMaxWindDirection(windDirections.gavl2, distToCoastKm);
  
  console.log('=== MAKSIMALE VIND RETNINGER FOR HVER SIDE ===');
  console.log('Gavl1 (top) max vind:', maxGavl1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', '), 'cDir²:', maxGavl1Wind.cDirFactor);
  console.log('Facade2 (højre) max vind:', maxFacade2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', '), 'cDir²:', maxFacade2Wind.cDirFactor);
  console.log('Gavl2 (bund) max vind:', maxGavl2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', '), 'cDir²:', maxGavl2Wind.cDirFactor);
  console.log('Facade1 (venstre) max vind:', maxFacade1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', '), 'cDir²:', maxFacade1Wind.cDirFactor);
  console.log('');

  // Create EC1-4 calculator instances for each side with their maximum wind directions
  const facade1Ec14 = new EC14(
    roofPitch,                    // roof pitch [°]
    inputs.houseHeight,           // building height [m]
    inputs.houseWidth,            // building width [m]
    inputs.houseDepth,            // building depth [m]
    distToCoastKm,                // distance to coast [km]
    terrainCat,                   // terrain category
    maxFacade1Wind.directions[0].angle, // wind direction [°] - use first direction
    1.0,                          // season factor
    true,                         // use DK NA
    inputs.roofType,              // roof type for h_face_zone_D calculation
    inputs.parapetHeight || 0,    // parapet height [m]
    inputs.flatRoofEdgeType || 'sharp'  // flat roof edge type
  );
  
  const gavl1Ec14 = new EC14(
    roofPitch, inputs.houseHeight, inputs.houseWidth, inputs.houseDepth,
    distToCoastKm, terrainCat, maxGavl1Wind.directions[0].angle, 1.0, true, 
    inputs.roofType, inputs.parapetHeight || 0, inputs.flatRoofEdgeType || 'sharp'
  );
  
  const facade2Ec14 = new EC14(
    roofPitch, inputs.houseHeight, inputs.houseWidth, inputs.houseDepth,
    distToCoastKm, terrainCat, maxFacade2Wind.directions[0].angle, 1.0, true, 
    inputs.roofType, inputs.parapetHeight || 0, inputs.flatRoofEdgeType || 'sharp'
  );
  
  const gavl2Ec14 = new EC14(
    roofPitch, inputs.houseHeight, inputs.houseWidth, inputs.houseDepth,
    distToCoastKm, terrainCat, maxGavl2Wind.directions[0].angle, 1.0, true, 
    inputs.roofType, inputs.parapetHeight || 0, inputs.flatRoofEdgeType || 'sharp'
  );
  
  // Calculate basic wind pressure for each side
  facade1Ec14.windPressure();
  gavl1Ec14.windPressure();
  facade2Ec14.windPressure();
  gavl2Ec14.windPressure();

      // Log basic wind parameters from all 4 sides
  console.log('=== VINDPARAMETRE (Ekslusiv Zone D for vægflader) ===');
  console.log(`Facade1 (venstre) - Vind: ${maxFacade1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
  console.log('  Grundvindshastighed vB:', facade1Ec14.vB.toFixed(1), 'm/s');
  console.log('  Middelvindshastighed vM:', facade1Ec14.vM.toFixed(1), 'm/s');
  console.log('  Turbulensintensitet iV:', facade1Ec14.iV.toFixed(3));
  console.log('  Toptrykhastighed qP:', facade1Ec14.qP.toFixed(1), `Pa (qP@${facade1Ec14.buildingHeight.toFixed(2)}m)`);
  
  console.log(`Gavl1 (top) - Vind: ${maxGavl1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
  console.log('  Grundvindshastighed vB:', gavl1Ec14.vB.toFixed(1), 'm/s');
  console.log('  Middelvindshastighed vM:', gavl1Ec14.vM.toFixed(1), 'm/s');
  console.log('  Turbulensintensitet iV:', gavl1Ec14.iV.toFixed(3));
  console.log('  Toptrykhastighed qP:', gavl1Ec14.qP.toFixed(1), `Pa (qP@${gavl1Ec14.buildingHeight.toFixed(2)}m)`);
  
  console.log(`Facade2 (højre) - Vind: ${maxFacade2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
  console.log('  Grundvindshastighed vB:', facade2Ec14.vB.toFixed(1), 'm/s');
  console.log('  Middelvindshastighed vM:', facade2Ec14.vM.toFixed(1), 'm/s');
  console.log('  Turbulensintensitet iV:', facade2Ec14.iV.toFixed(3));
  console.log('  Toptrykhastighed qP:', facade2Ec14.qP.toFixed(1), `Pa (qP@${facade2Ec14.buildingHeight.toFixed(2)}m)`);
  
  console.log(`Gavl2 (bund) - Vind: ${maxGavl2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
  console.log('  Grundvindshastighed vB:', gavl2Ec14.vB.toFixed(1), 'm/s');
  console.log('  Middelvindshastighed vM:', gavl2Ec14.vM.toFixed(1), 'm/s');
  console.log('  Turbulensintensitet iV:', gavl2Ec14.iV.toFixed(3));
  console.log('  Toptrykhastighed qP:', gavl2Ec14.qP.toFixed(1), `Pa (qP@${gavl2Ec14.buildingHeight.toFixed(2)}m)`);
  console.log('');
  
  // Calculate wall loads for each side
  const facade1WallLoads = facade1Ec14.windLoadWall();
  const gavl1WallLoads = gavl1Ec14.windLoadWall();
  const facade2WallLoads = facade2Ec14.windLoadWall();
  const gavl2WallLoads = gavl2Ec14.windLoadWall();
  
  console.log('=== VÆGBELASTNINGER FOR HVER SIDE ===');
  console.log(`Facade1 (venstre) - Vind: ${maxFacade1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
  if (facade1WallLoads.Facade && facade1WallLoads.Facade['cpe,10']) {
    const zoneInfo = (facade1WallLoads.Facade as any).zoneInfo;
    if (zoneInfo) {
      console.log(`  e/d ratio: ${zoneInfo.ratio.toFixed(2)} (e=${zoneInfo.e.toFixed(2)}m, d=${zoneInfo.d.toFixed(2)}m)`);
      for (const zone of zoneInfo.appliedZones) {
        // Skip Zone D as it's handled separately in height-dependent profiles
        if (zone === 'D') continue;
        const zoneKey = 'q' + zone;
        if (facade1WallLoads.Facade['cpe,10'][zoneKey] !== undefined) {
          const zoneDim = zoneInfo.zoneDimensions?.[zone] || '';
          console.log(`  Zone ${zone}: ${facade1WallLoads.Facade['cpe,10'][zoneKey].toFixed(1)} Pa ${zoneDim ? `(${zoneDim})` : ''}`);
        }
      }
    } else {
      Object.entries(facade1WallLoads.Facade['cpe,10']).forEach(([zone, value]) => {
        // Skip Zone D
        if (zone === 'qD') return;
        console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
      });
    }
  }
  
  console.log(`Gavl1 (top) - Vind: ${maxGavl1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
  if (gavl1WallLoads.Gavl && gavl1WallLoads.Gavl['cpe,10']) {
    const zoneInfo = (gavl1WallLoads.Gavl as any).zoneInfo;
    if (zoneInfo) {
      console.log(`  e/d ratio: ${zoneInfo.ratio.toFixed(2)} (e=${zoneInfo.e.toFixed(2)}m, d=${zoneInfo.d.toFixed(2)}m)`);
      for (const zone of zoneInfo.appliedZones) {
        // Skip Zone D as it's handled separately in height-dependent profiles
        if (zone === 'D') continue;
        const zoneKey = 'q' + zone;
        if (gavl1WallLoads.Gavl['cpe,10'][zoneKey] !== undefined) {
          const zoneDim = zoneInfo.zoneDimensions?.[zone] || '';
          console.log(`  Zone ${zone}: ${gavl1WallLoads.Gavl['cpe,10'][zoneKey].toFixed(1)} Pa ${zoneDim ? `(${zoneDim})` : ''}`);
        }
      }
    } else {
      Object.entries(gavl1WallLoads.Gavl['cpe,10']).forEach(([zone, value]) => {
        // Skip Zone D
        if (zone === 'qD') return;
        console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
      });
    }
  }
  
  console.log(`Facade2 (højre) - Vind: ${maxFacade2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
  if (facade2WallLoads.Facade && facade2WallLoads.Facade['cpe,10']) {
    const zoneInfo = (facade2WallLoads.Facade as any).zoneInfo;
    if (zoneInfo) {
      console.log(`  e/d ratio: ${zoneInfo.ratio.toFixed(2)} (e=${zoneInfo.e.toFixed(2)}m, d=${zoneInfo.d.toFixed(2)}m)`);
      for (const zone of zoneInfo.appliedZones) {
        // Skip Zone D as it's handled separately in height-dependent profiles
        if (zone === 'D') continue;
        const zoneKey = 'q' + zone;
        if (facade2WallLoads.Facade['cpe,10'][zoneKey] !== undefined) {
          const zoneDim = zoneInfo.zoneDimensions?.[zone] || '';
          console.log(`  Zone ${zone}: ${facade2WallLoads.Facade['cpe,10'][zoneKey].toFixed(1)} Pa ${zoneDim ? `(${zoneDim})` : ''}`);
        }
      }
    } else {
      Object.entries(facade2WallLoads.Facade['cpe,10']).forEach(([zone, value]) => {
        // Skip Zone D
        if (zone === 'qD') return;
        console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
      });
    }
  }
  
  console.log(`Gavl2 (bund) - Vind: ${maxGavl2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
  if (gavl2WallLoads.Gavl && gavl2WallLoads.Gavl['cpe,10']) {
    const zoneInfo = (gavl2WallLoads.Gavl as any).zoneInfo;
    if (zoneInfo) {
      console.log(`  e/d ratio: ${zoneInfo.ratio.toFixed(2)} (e=${zoneInfo.e.toFixed(2)}m, d=${zoneInfo.d.toFixed(2)}m)`);
      for (const zone of zoneInfo.appliedZones) {
        // Skip Zone D as it's handled separately in height-dependent profiles
        if (zone === 'D') continue;
        const zoneKey = 'q' + zone;
        if (gavl2WallLoads.Gavl['cpe,10'][zoneKey] !== undefined) {
          const zoneDim = zoneInfo.zoneDimensions?.[zone] || '';
          console.log(`  Zone ${zone}: ${gavl2WallLoads.Gavl['cpe,10'][zoneKey].toFixed(1)} Pa ${zoneDim ? `(${zoneDim})` : ''}`);
        }
      }
    } else {
      Object.entries(gavl2WallLoads.Gavl['cpe,10']).forEach(([zone, value]) => {
        // Skip Zone D
        if (zone === 'qD') return;
        console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
      });
    }
  }
  console.log('');
  
  // Calculate Zone D height-dependent pressure profiles for each side
  console.log('=== ZONE D HØJDEAFHÆNGIGE TRYKPROFILER ===');
  
  const facade1ZoneDProfile = facade1Ec14.windPressureZoneD(true, 'facade1'); // Wind on facade1 (left/low side)
  console.log(`Facade1 (venstre) Zone D - h_face_zone_D: ${facade1ZoneDProfile.h_face_zone_D.toFixed(2)}m, vindside bredde: ${facade1ZoneDProfile.windwardWidth.toFixed(2)}m:`);
  facade1ZoneDProfile.profiles.forEach((profile, index) => {
    const heightBottom = index === facade1ZoneDProfile.profiles.length - 1 ? 0 : facade1ZoneDProfile.profiles[index + 1]?.heightTop || 0;
    console.log(`  Profil ${index + 1}: ${profile.qP.toFixed(1)} Pa (qP@${profile.refHeight.toFixed(2)}m) fra ${heightBottom.toFixed(2)}m til ${profile.heightTop.toFixed(2)}m højde`);
  });
  
  const gavl1ZoneDProfile = gavl1Ec14.windPressureZoneD(false); // Wind on gavl1
  console.log(`Gavl1 (top) Zone D - h_face_zone_D: ${gavl1ZoneDProfile.h_face_zone_D.toFixed(2)}m, vindside bredde: ${gavl1ZoneDProfile.windwardWidth.toFixed(2)}m:`);
  gavl1ZoneDProfile.profiles.forEach((profile, index) => {
    const heightBottom = index === gavl1ZoneDProfile.profiles.length - 1 ? 0 : gavl1ZoneDProfile.profiles[index + 1]?.heightTop || 0;
    console.log(`  Profil ${index + 1}: ${profile.qP.toFixed(1)} Pa (qP@${profile.refHeight.toFixed(2)}m) fra ${heightBottom.toFixed(2)}m til ${profile.heightTop.toFixed(2)}m højde`);
  });
  
  const facade2ZoneDProfile = facade2Ec14.windPressureZoneD(true, 'facade2'); // Wind on facade2 (right/high side)
  console.log(`Facade2 (højre) Zone D - h_face_zone_D: ${facade2ZoneDProfile.h_face_zone_D.toFixed(2)}m, vindside bredde: ${facade2ZoneDProfile.windwardWidth.toFixed(2)}m:`);
  facade2ZoneDProfile.profiles.forEach((profile, index) => {
    const heightBottom = index === facade2ZoneDProfile.profiles.length - 1 ? 0 : facade2ZoneDProfile.profiles[index + 1]?.heightTop || 0;
    console.log(`  Profil ${index + 1}: ${profile.qP.toFixed(1)} Pa (qP@${profile.refHeight.toFixed(2)}m) fra ${heightBottom.toFixed(2)}m til ${profile.heightTop.toFixed(2)}m højde`);
  });
  
  const gavl2ZoneDProfile = gavl2Ec14.windPressureZoneD(false); // Wind on gavl2
  console.log(`Gavl2 (bund) Zone D - h_face_zone_D: ${gavl2ZoneDProfile.h_face_zone_D.toFixed(2)}m, vindside bredde: ${gavl2ZoneDProfile.windwardWidth.toFixed(2)}m:`);
  gavl2ZoneDProfile.profiles.forEach((profile, index) => {
    const heightBottom = index === gavl2ZoneDProfile.profiles.length - 1 ? 0 : gavl2ZoneDProfile.profiles[index + 1]?.heightTop || 0;
    console.log(`  Profil ${index + 1}: ${profile.qP.toFixed(1)} Pa (qP@${profile.refHeight.toFixed(2)}m) fra ${heightBottom.toFixed(2)}m til ${profile.heightTop.toFixed(2)}m højde`);
  });
  console.log('');
  
  // Combine wall loads into result structure
  const wallLoads = {
    Facade1: facade1WallLoads.Facade,
    Gavl1: gavl1WallLoads.Gavl,
    Facade2: facade2WallLoads.Facade,
    Gavl2: gavl2WallLoads.Gavl
  };
  
  // Calculate roof loads based on roof type and wind directions for all 4 sides
  let roofLoads;
  try {
    switch (inputs.roofType) {
      case 'flat': {
        // For flat roof, calculate for all 4 sides
        let roofTypeParam = 'Parapets';
        let parameter = 0.05; // default hp/h ratio
        
        if (inputs.flatRoofEdgeType === 'parapet' && inputs.parapetHeight) {
          roofTypeParam = 'Parapets';
          parameter = inputs.parapetHeight / inputs.houseHeight;
        } else if (inputs.flatRoofEdgeType === 'rounded' && inputs.edgeRadius) {
          roofTypeParam = 'Curved';
          parameter = inputs.edgeRadius / inputs.houseHeight;
        } else if (inputs.flatRoofEdgeType === 'beveled' && inputs.bevelAngle) {
          roofTypeParam = 'Mansard';
          parameter = inputs.bevelAngle;
        }
        
        console.log('=== FLAT TAGBELASTNINGER FOR HVER SIDE ===');
        const flatFacade1 = facade1Ec14.windLoadFlatRoof(roofTypeParam, parameter);   // Facade1: uses actual wind direction
        const flatGavl1 = gavl1Ec14.windLoadFlatRoof(roofTypeParam, parameter);      // Gavl1: uses actual wind direction
        const flatFacade2 = facade2Ec14.windLoadFlatRoof(roofTypeParam, parameter);   // Facade2: uses actual wind direction
        const flatGavl2 = gavl2Ec14.windLoadFlatRoof(roofTypeParam, parameter);      // Gavl2: uses actual wind direction
        
        console.log(`Facade1 - Vind: ${maxFacade1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (flatFacade1["cpe,10"]) {
          Object.entries(flatFacade1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Gavl1 - Vind: ${maxGavl1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (flatGavl1["cpe,10"]) {
          Object.entries(flatGavl1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Facade2 - Vind: ${maxFacade2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (flatFacade2["cpe,10"]) {
          Object.entries(flatFacade2["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Gavl2 - Vind: ${maxGavl2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (flatGavl2["cpe,10"]) {
          Object.entries(flatGavl2["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        // Use gavl1 results as representative (since zones vary by wind direction)
        roofLoads = flatGavl1;
        break;
      }
      
      case 'monopitch': {
        // For monopitch, calculate for all 4 sides with specific wind directions
        console.log('=== MONOPITCH TAGBELASTNINGER FOR HVER SIDE ===');
        const monopitchFacade1 = facade1Ec14.windLoadMonopitchRoof(0);     // Facade1: 0° (perpendicular to ridge)
        const monopitchGavl1 = gavl1Ec14.windLoadMonopitchRoof(90);       // Gavl1: 90° (parallel to ridge)
        const monopitchFacade2 = facade2Ec14.windLoadMonopitchRoof(180);   // Facade2: 180° (opposite perpendicular)
        const monopitchGavl2 = gavl2Ec14.windLoadMonopitchRoof(90);       // Gavl2: 90° (parallel to ridge)
        
        console.log(`Facade1 (0°) - Vind: ${maxFacade1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (monopitchFacade1["cpe,10"]) {
          Object.entries(monopitchFacade1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Gavl1 (90°) - Vind: ${maxGavl1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (monopitchGavl1["cpe,10"]) {
          Object.entries(monopitchGavl1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Facade2 (180°) - Vind: ${maxFacade2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (monopitchFacade2["cpe,10"]) {
          Object.entries(monopitchFacade2["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Gavl2 (90°) - Vind: ${maxGavl2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (monopitchGavl2["cpe,10"]) {
          Object.entries(monopitchGavl2["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Facade1 (0°) - Vind: ${maxFacade1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (monopitchFacade1["cpe,10"]) {
          Object.entries(monopitchFacade1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        // Use gavl1 results as representative (since zones vary by wind direction)
        roofLoads = monopitchGavl1;
        break;
      }
      
      case 'duopitch': {
        // For duopitch, calculate for all 4 sides with specific wind directions
        console.log('=== DUOPITCH TAGBELASTNINGER FOR HVER SIDE ===');
        const duopitchFacade1 = facade1Ec14.windLoadDuopitchRoof(0);   // Facade1: 0° (perpendicular to ridge)
        const duopitchGavl1 = gavl1Ec14.windLoadDuopitchRoof(90);     // Gavl1: 90° (parallel to ridge)
        const duopitchFacade2 = facade2Ec14.windLoadDuopitchRoof(0);   // Facade2: 0° (perpendicular to ridge)
        const duopitchGavl2 = gavl2Ec14.windLoadDuopitchRoof(90);     // Gavl2: 90° (parallel to ridge)
        
        console.log(`Facade1 (0°) - Vind: ${maxFacade1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (duopitchFacade1["cpe,10"]) {
          Object.entries(duopitchFacade1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Gavl1 (90°) - Vind: ${maxGavl1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (duopitchGavl1["cpe,10"]) {
          Object.entries(duopitchGavl1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Facade2 (0°) - Vind: ${maxFacade2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (duopitchFacade2["cpe,10"]) {
          Object.entries(duopitchFacade2["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Gavl2 (90°) - Vind: ${maxGavl2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (duopitchGavl2["cpe,10"]) {
          Object.entries(duopitchGavl2["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        // Use gavl1 results as representative (since zones vary by wind direction)
        roofLoads = duopitchGavl1;
        break;
      }
      
      case 'hipped': {
        // For hipped roof, calculate for all 4 sides with specific wind directions
        console.log('=== HIPPED TAGBELASTNINGER FOR HVER SIDE ===');
        const hippedFacade1 = facade1Ec14.windLoadHippedRoof();   // Facade1: uses actual wind direction
        const hippedGavl1 = gavl1Ec14.windLoadHippedRoof();      // Gavl1: uses actual wind direction
        const hippedFacade2 = facade2Ec14.windLoadHippedRoof();   // Facade2: uses actual wind direction
        const hippedGavl2 = gavl2Ec14.windLoadHippedRoof();      // Gavl2: uses actual wind direction
        
        console.log(`Facade1 - Vind: ${maxFacade1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (hippedFacade1["cpe,10"]) {
          Object.entries(hippedFacade1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Gavl1 - Vind: ${maxGavl1Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (hippedGavl1["cpe,10"]) {
          Object.entries(hippedGavl1["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Facade2 - Vind: ${maxFacade2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (hippedFacade2["cpe,10"]) {
          Object.entries(hippedFacade2["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        console.log(`Gavl2 - Vind: ${maxGavl2Wind.directions.map(d => `${d.name} (${d.angle}°)`).join(', ')}:`);
        if (hippedGavl2["cpe,10"]) {
          Object.entries(hippedGavl2["cpe,10"]).forEach(([zone, value]) => {
            console.log(`  Zone ${zone}: ${value.toFixed(1)} Pa`);
          });
        }
        
        // Use gavl1 results as representative (since zones vary by wind direction)
        roofLoads = hippedGavl1;
        break;
      }
      
      default:
        throw new Error(`Unsupported roof type: ${inputs.roofType}`);
    }
  } catch (error) {
    console.warn('Roof load calculation failed:', error);
    roofLoads = { "cpe,10": {} };
  }
  
  console.log('=== BEREGNING AFSLUTTET ===');
  
  return {
    basicWindSpeed: facade1Ec14.vB,
    meanWindVelocity: facade1Ec14.vM,
    turbulenceIntensity: facade1Ec14.iV,
    peakVelocityPressure: facade1Ec14.qP,
    wallLoads,
    roofLoads,
    zoneDProfiles: {
      Facade1: facade1ZoneDProfile,
      Gavl1: gavl1ZoneDProfile,
      Facade2: facade2ZoneDProfile,
      Gavl2: gavl2ZoneDProfile
    }
  };
}

/**
 * Utility function to get wind load for a specific surface and zone
 */
export function getWindLoadForZone(
  results: WindCalculationResults,
  surface: 'wall' | 'roof',
  surfaceName?: string,
  zone?: string,
  cpeType: string = 'cpe,10'
): number | null {
  if (surface === 'wall' && results.wallLoads && surfaceName && zone) {
    const surfaceData = results.wallLoads[surfaceName as keyof typeof results.wallLoads];
    if (surfaceData && surfaceData[cpeType] && surfaceData[cpeType]['q' + zone] !== undefined) {
      return surfaceData[cpeType]['q' + zone];
    }
  } else if (surface === 'roof' && results.roofLoads && zone) {
    if (results.roofLoads[cpeType] && results.roofLoads[cpeType]['q' + zone] !== undefined) {
      return results.roofLoads[cpeType]['q' + zone];
    }
  }
  
  return null;
}

/**
 * Get all available zones for a given surface type and roof configuration
 */
export function getAvailableZones(roofType: string, windDirection?: number): string[] {
  switch (roofType) {
    case 'flat':
      return ['F', 'G', 'H', 'Itryk', 'Isug'];
    
    case 'monopitch':
      if (windDirection === 0) {
        return ['F1', 'F2', 'G1', 'G2', 'H1', 'H2'];
      } else if (windDirection === 90) {
        return ['Fup', 'Flow', 'G', 'H', 'I'];
      } else if (windDirection === 180) {
        return ['F', 'G', 'H'];
      }
      return ['F1', 'F2', 'G1', 'G2', 'H1', 'H2']; // default
    
    case 'duopitch':
      if (windDirection === 0) {
        return ['F1', 'F2', 'G1', 'G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2'];
      } else if (windDirection === 90) {
        return ['F', 'G', 'H', 'I'];
      }
      return ['F1', 'F2', 'G1', 'G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2']; // default
    
    case 'hipped':
      return ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    
    default:
      return [];
  }
}

/**
 * Get wall zones
 */
export function getWallZones(): string[] {
  return ['A', 'B', 'C', 'D', 'E'];
}

/**
 * Calculate wind directions for all 4 sides of the house based on house rotation
 * Each side has 3 wind directions within ±45° from the normal to that side
 */
export function calculateWindDirectionsForAllSides(houseRotation: number) {
  // 12 compass directions in degrees (SVG coordinates: 0° = East)
  // Convert to compass degrees: 0° = North, 90° = East, 180° = South, 270° = West
  const compassDirections = [
    { name: 'Ø', svgAngle: 0, compassAngle: 90 },     // East
    { name: 'ØSØ', svgAngle: 30, compassAngle: 120 },
    { name: 'SSØ', svgAngle: 60, compassAngle: 150 },
    { name: 'S', svgAngle: 90, compassAngle: 180 },    // South
    { name: 'SSV', svgAngle: 120, compassAngle: 210 },
    { name: 'VSV', svgAngle: 150, compassAngle: 240 },
    { name: 'V', svgAngle: 180, compassAngle: 270 },   // West
    { name: 'VNV', svgAngle: 210, compassAngle: 300 },
    { name: 'NNV', svgAngle: 240, compassAngle: 330 },
    { name: 'N', svgAngle: 270, compassAngle: 0 },     // North
    { name: 'NNØ', svgAngle: 300, compassAngle: 30 },
    { name: 'ØNØ', svgAngle: 330, compassAngle: 60 }
  ];

  // Calculate normal angles for each side of the rotated house
  // houseRotation = rotation of gavl1 (top side) from north (0°)
  // Gavl1 (top side): houseRotation (oriented at this angle from north)
  // Facade2 (right side): houseRotation + 90° (90° clockwise from gavl1)
  // Gavl2 (bottom side): houseRotation + 180° (opposite to gavl1)
  // Facade1 (left side): houseRotation + 270° (270° clockwise from gavl1)
  
  const gavl1Normal = houseRotation % 360;              // Top side orientation
  const facade2Normal = (houseRotation + 90) % 360;    // Right side orientation  
  const gavl2Normal = (houseRotation + 180) % 360;     // Bottom side orientation
  const facade1Normal = (houseRotation + 270) % 360;   // Left side orientation

  // Helper function to find wind directions within ±45° of a normal
  const getWindDirectionsForSide = (normalAngle: number) => {
    const directions = [];
    
    for (const dir of compassDirections) {
      // Calculate angular difference, handling wraparound
      let diff = Math.abs(dir.compassAngle - normalAngle);
      if (diff > 180) diff = 360 - diff;
      
      // Include wind directions within ±45° of the normal
      if (diff <= 45) {
        directions.push({
          name: dir.name,
          angle: dir.compassAngle,
          svgAngle: dir.svgAngle
        });
      }
    }
    
    return directions;
  };

  return {
    gavl1: getWindDirectionsForSide(gavl1Normal),     // Top side
    facade2: getWindDirectionsForSide(facade2Normal), // Right side
    gavl2: getWindDirectionsForSide(gavl2Normal),     // Bottom side
    facade1: getWindDirectionsForSide(facade1Normal)  // Left side
  };
}

/**
 * Find the maximum wind direction factor(s) for a list of wind directions
 * Uses Danish wind direction sectors from DK NA
 * Returns all directions that have the maximum cDir factor
 */
export function findMaxWindDirection(windDirections: Array<{name: string, angle: number, svgAngle: number}>, distToCoastKm: number) {
  // Danish wind direction sectors with corresponding cDir² values
  const sectors: Array<[number, number, number, string]> = [
    [345, 15, 0.8, 'N'],      // N (345° - 15°)
    [15, 45, 0.7, 'NNØ'],     // NNØ (15° - 45°)
    [45, 75, 0.6, 'ØNØ'],     // ØNØ (45° - 75°)
    [75, 105, 0.7, 'Ø'],      // Ø (75° - 105°)
    [105, 135, 0.7, 'ØSØ'],   // ØSØ (105° - 135°)
    [135, 165, 0.6, 'SSØ'],   // SSØ (135° - 165°)
    [165, 195, 0.7, 'S'],     // S (165° - 195°)
    [195, 225, 0.7, 'SSV'],   // SSV (195° - 225°)
    [225, 255, 0.9, 'VSV'],   // VSV (225° - 255°)
    [255, 285, 1.0, 'V'],     // V (255° - 285°)
    [285, 315, 1.0, 'VNV'],   // VNV (285° - 315°)
    [315, 345, 0.9, 'NNV'],   // NNV (315° - 345°)
  ];

  let maxCDir = 0;
  const maxDirections: Array<{name: string, angle: number, svgAngle: number}> = [];

  // First pass: find the maximum cDir factor
  for (const windDir of windDirections) {
    for (const [start, end, cDir, sectorName] of sectors) {
      let inSector = false;
      
      if (start > end) {
        // Handle wraparound case (e.g., N sector: 345° - 15°)
        inSector = windDir.angle >= start || windDir.angle <= end;
      } else {
        inSector = windDir.angle >= start && windDir.angle <= end;
      }
      
      if (inSector && cDir > maxCDir) {
        maxCDir = cDir;
        break;
      }
    }
  }

  // Second pass: collect all directions with the maximum cDir factor
  for (const windDir of windDirections) {
    for (const [start, end, cDir, sectorName] of sectors) {
      let inSector = false;
      
      if (start > end) {
        // Handle wraparound case (e.g., N sector: 345° - 15°)
        inSector = windDir.angle >= start || windDir.angle <= end;
      } else {
        inSector = windDir.angle >= start && windDir.angle <= end;
      }
      
      if (inSector && cDir === maxCDir) {
        maxDirections.push(windDir);
        break;
      }
    }
  }

  return {
    directions: maxDirections,
    cDirFactor: maxCDir
  };
}
