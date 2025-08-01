/**
 * TypeScript port of EC1_4_opdateret.py
 * Wind load calculation according to EN 1991-1-4 / DS-NA 2024
 */

import { WindProp, Number } from './windprop';

export interface WindLoadResult {
  [cpeType: string]: {
    [zone: string]: number;
  };
}

export interface MultiSurfaceWindLoadResult {
  [surface: string]: WindLoadResult;
}

export interface MultiSurfaceWindLoadWithZoneInfo {
  [surface: string]: WindLoadResult & {
    zoneInfo?: {
      appliedZones: string[];
      zoneDimensions?: { [zone: string]: string };
      e: number;
      d: number;
      ratio: number;
    };
  };
}

export interface WindPressureProfile {
  qP: number;        // wind pressure [Pa]
  heightTop: number; // height from terrain to top of profile [m]
  refHeight: number; // reference height used for qP calculation [m]
}

export interface ZoneDWindPressureResult {
  profiles: WindPressureProfile[];  // height-dependent pressure profiles for Zone D
  h_face_zone_D: number;           // effective face height for Zone D
  windwardWidth: number;           // width of windward wall (b)
}

export class EC14 {
  private alpha: number;              // roof pitch [°]
  private h: number;                  // building height [m]
  private width: number;              // building width [m] 
  private depth: number;              // building depth [m]
  private distCoastKm: number;        // distance to west coast [km]
  private terrainCat: number;         // terrain category (0-4)
  private windDirDeg: number | null;  // wind direction [°] (0=N)
  private cSeason: number;            // season factor (≥ 0.6 if relevant)
  private useDKNA: boolean;           // true = DK-National Annex 2024

  private windProp: WindProp;
  private windPressureDone: boolean = false;

  // Wind pressure calculation results
  public vB0!: number;  // fundamental basic wind speed
  public cDir!: number; // direction factor
  public vB!: number;   // basic wind speed
  public vM!: number;   // mean wind velocity
  public iV!: number;   // turbulence intensity
  public qP!: number;   // peak velocity pressure

  constructor(
    alpha: number,              // roof pitch [°]
    h: number,                  // building height [m]
    width: number,              // building width [m]
    depth: number,              // building depth [m]
    distToCoastKm: number,      // distance to west coast [km]
    terrainCat: number,         // terrain category (0-4)
    windDirDeg: number | null = null, // wind direction [°] (0=N)
    seasonFactor: number = 1.0, // season factor (≥ 0.6 if relevant)
    useDKNA: boolean = true,    // true = DK-National Annex 2024
    private roofType: string = 'flat',  // roof type for h_face_zone_D calculation
    private parapetHeight: number = 0,  // parapet height [m] for flat roofs
    private flatRoofEdgeType: string = 'sharp',  // flat roof edge type
  ) {
    this.alpha = alpha;
    this.h = h;
    this.width = width;
    this.depth = depth;
    this.distCoastKm = distToCoastKm;
    this.terrainCat = terrainCat;
    this.windDirDeg = windDirDeg;
    this.cSeason = seasonFactor;
    this.useDKNA = useDKNA;

    this.windProp = new WindProp();
  }

  /**
   * Get building height (reference height for wind pressure calculations)
   */
  get buildingHeight(): number {
    return this.h;
  }

  /**
   * Calculate wind pressure parameters: vB, vM, iV, qP [SI units]
   * Uses building height as reference height
   */
  windPressure(): void {
    // Calculate basic wind speed first (independent of height)
    this.calculateBasicWindSpeed();
    
    // Calculate wind pressure at building height
    const result = this.calculateWindPressureAtHeight(this.h);
    this.vM = result.vM;
    this.iV = result.iV;
    this.qP = result.qP;
    this.windPressureDone = true;
  }

  /**
   * Calculate basic wind speed (height-independent parameters)
   */
  private calculateBasicWindSpeed(): void {
    // (1) fundamental basic wind speed vB0
    if (this.useDKNA) {
      // 27 → 24 m/s linear within 25 km coastal belt
      if (this.distCoastKm <= 25) {
        this.vB0 = 27 - 3 * (this.distCoastKm / 25);
      } else {
        this.vB0 = 24;
      }
    } else {
      // original Eurocode table
      this.vB0 = 24; // or 27 for worst case
    }

    // (2) direction & season factors
    this.cDir = this.useDKNA ? this.dirFactor(this.windDirDeg) : 1.0;
    this.vB = this.vB0 * Math.sqrt(this.cDir) * Math.sqrt(this.cSeason);
  }

  /**
   * Calculate height-dependent wind pressure at specific height z
   * Returns object with vM, iV, and qP for the given height
   */
  private calculateWindPressureAtHeight(z: number): { vM: number; iV: number; qP: number } {
    const rho = 1.25;  // air density [kg/m³]

    // Ensure basic wind speed is calculated
    if (!this.vB) {
      this.calculateBasicWindSpeed();
    }

    // (3) terrain & orography factors
    const terrainParams: { [key: number]: [number, number] } = {
      0: [0.003, 1.0],
      1: [0.01, 1.0],
      2: [0.05, 2.0],
      3: [0.30, 5.0],
      4: [1.00, 10.0],
    };

    const [z0, zMin] = terrainParams[this.terrainCat];
    const kR = 0.19 * Math.pow(z0 / 0.05, 0.07);
    const zeff = Math.max(z, zMin);
    const cR = kR * Math.log(zeff / z0);
    const cO = 1.0; // DK NA has no special rule here

    const vM = cR * cO * this.vB;
    const kL = 1.0;
    const iV = kL / (cO * Math.log(zeff / z0));
    const qP = (1 + 7 * iV) * 0.5 * rho * Math.pow(vM, 2);

    return { vM, iV, qP };
  }

  /**
   * Calculate height-dependent wind pressure at specific height z
   * Public method that returns only the pressure value
   */
  private windPressureAtHeight(z: number): number {
    return this.calculateWindPressureAtHeight(z).qP;
  }

  /**
   * Calculate effective wall height for Zone D based on roof type
   * @param isWindOnFacade - true if wind is hitting facade (parallel to depth), false if hitting gavl (parallel to width)
   * @param facadeId - for facades: 'facade1' (left/low side) or 'facade2' (right/high side)
   */
  private calculateHFaceZoneD(isWindOnFacade: boolean, facadeId?: string): number {
    switch (this.roofType) {
      case 'flat':
        if (this.flatRoofEdgeType === 'parapet' && this.parapetHeight > 0) {
          // For flat roof with parapet: reference height = h + h_p
          return this.h + this.parapetHeight;
        }
        return this.h;

      case 'monopitch':
        if (isWindOnFacade) {
          // For monopitch facades:
          // this.h = high side (facade2/right)
          // Low side (facade1/left) = this.h - depth*tan(alpha)
          if (facadeId === 'facade1') {
            // Low side (left facade)
            return this.h - this.depth * Math.tan(this.alpha * Math.PI / 180);
          } else if (facadeId === 'facade2') {
            // High side (right facade)
            return this.h;
          } else {
            // If no facade ID provided, use conservative (higher) value
            return this.h;
          }
        } else {
          // For monopitch gavls: use highest point (ridge height = this.h)
          return this.h;
        }
      
      case 'duopitch':
        if (isWindOnFacade) {
          // For duopitch facades: wall height = this.h - (width/2)*tan(alpha)
          // This gives the eaves height
          return this.h - (this.depth / 2) * Math.tan(this.alpha * Math.PI / 180);
        } else {
          // For duopitch gavls: wall height = building height h (gable wall is vertical)
          return this.h;
        }
      
      case 'hipped':
        // For hipped roof: wall height = this.h - (depth/2)*tan(alpha)
        // This accounts for the hip slope reducing the wall height
        return this.h - (this.depth / 2) * Math.tan(this.alpha * Math.PI / 180);
      
      default:
        return this.h;
    }
  }

  /**
   * Calculate height-dependent wind pressure profiles for Zone D
   * @param isWindOnFacade - true if wind is hitting facade (parallel to depth), false if hitting gavl (parallel to width)
   * @param facadeId - for facades: 'facade1' (left/low side) or 'facade2' (right/high side)
   */
  windPressureZoneD(isWindOnFacade: boolean, facadeId?: string): ZoneDWindPressureResult {
    if (!this.windPressureDone) {
      this.windPressure();
    }

    const h_face_zone_D = this.calculateHFaceZoneD(isWindOnFacade, facadeId);
    const b = isWindOnFacade ? this.width : this.depth; // windward wall width
    
    const profiles: WindPressureProfile[] = [];

    if (h_face_zone_D <= b) {
      // Case 1: h_face_zone_D <= b - uniform profile
      profiles.push({
        qP: this.windPressureAtHeight(h_face_zone_D),
        heightTop: h_face_zone_D,
        refHeight: h_face_zone_D
      });
    } else if (h_face_zone_D <= 2 * b) {
      // Case 2: b < h_face_zone_D <= 2b - two profiles
      profiles.push(
        {
          qP: this.windPressureAtHeight(h_face_zone_D),
          heightTop: h_face_zone_D,
          refHeight: h_face_zone_D
        },
        {
          qP: this.windPressureAtHeight(b),
          heightTop: b,
          refHeight: b
        }
      );
    } else {
      // Case 3: h_face_zone_D > 2b - multiple profiles with 1m strips
      // Top profile: height b with qP(h_face_zone_D) covering from h_face_zone_D down to (h_face_zone_D - b)
      // Variable strips: Between (h_face_zone_D - b) and b, with uppermost strip ≤1m to fit exactly
      // Bottom profile: height b with qP(b) covering from b down to 0
      
      // Top profile (always height b)
      profiles.push({
        qP: this.windPressureAtHeight(h_face_zone_D),
        heightTop: h_face_zone_D,
        refHeight: h_face_zone_D
      });
      
      // Calculate the height range for intermediate strips
      const intermediateTop = h_face_zone_D - b;    // top of intermediate region
      const intermediateBottom = b;                 // bottom of intermediate region (where bottom profile starts)
      const intermediateHeight = intermediateTop - intermediateBottom;
      
      if (intermediateHeight > 0) {
        // Calculate the number of full 1m strips and the remainder for the uppermost intermediate strip
        const numFullStrips = Math.floor(intermediateHeight / 1.0);
        const upperIntermediateStripHeight = intermediateHeight - numFullStrips * 1.0;
        
        // Uppermost intermediate strip (varies from 0 to 1m, but if 0 then we have a full 1m strip)
        if (upperIntermediateStripHeight > 0) {
          profiles.push({
            qP: this.windPressureAtHeight(intermediateTop),
            heightTop: intermediateTop,
            refHeight: intermediateTop
          });
          
          // Full 1m intermediate strips below the variable strip
          let currentTop = intermediateTop - upperIntermediateStripHeight;
          for (let i = 0; i < numFullStrips; i++) {
            profiles.push({
              qP: this.windPressureAtHeight(currentTop),
              heightTop: currentTop,
              refHeight: currentTop
            });
            currentTop -= 1.0;
          }
        } else {
          // No remainder, all strips are exactly 1m
          let currentTop = intermediateTop;
          for (let i = 0; i < numFullStrips; i++) {
            profiles.push({
              qP: this.windPressureAtHeight(currentTop),
              heightTop: currentTop,
              refHeight: currentTop
            });
            currentTop -= 1.0;
          }
        }
      }

      // Bottom profile (always height b with qP(b))
      profiles.push({
        qP: this.windPressureAtHeight(b),
        heightTop: b,
        refHeight: b
      });
    }

    return {
      profiles,
      h_face_zone_D,
      windwardWidth: b
    };
  }

  /**
   * Wall wind loads according to table 7.1
   * Zones depend on elevation e compared to crosswind dimension d:
   * - e > 5d: only zone A
   * - e > d: zones A and B
   * - e ≤ d: zones A, B, and C
   * Where e = min(crosswind dimension, 2h) and d = alongwind dimension
   * 
   * Wind direction determines which dimensions are crosswind vs alongwind:
   * - Wind on facade (perpendicular to depth): crosswind=width, alongwind=depth
   * - Wind on gavl (perpendicular to width): crosswind=depth, alongwind=width
   */
  windLoadWall(): MultiSurfaceWindLoadWithZoneInfo {
    if (!this.windPressureDone) {
      this.windPressure();
    }

    // Determine wind direction relative to building orientation
    // This assumes the wind direction corresponds to which surface is being analyzed
    const windDir = this.windDirDeg || 0;
    
    // For the windward surface being analyzed, determine crosswind and alongwind dimensions
    // When wind hits facade (sides parallel to depth): crosswind = width (Bredde), alongwind = depth (Dybde)  
    // When wind hits gavl (sides parallel to width): crosswind = depth (Dybde), alongwind = width (Bredde)
    
    // Facade calculation (wind perpendicular to depth direction)
    // Crosswind dimension = width, alongwind dimension = depth
    const b = this.width;                           // crosswind dimension for facade
    const d = this.depth;                           // alongwind dimension for facade
    const eFacade = Math.min(b, 2 * this.h);       // crosswind dimension or 2h, whichever smaller
    const dFacade = d;                              // alongwind dimension
    const ratioFacade = this.h / dFacade;
    const rhoFacade = this.windProp.getCorrelationFactor(ratioFacade);

    // Gavl calculation (wind perpendicular to width direction)  
    // Crosswind dimension = depth, alongwind dimension = width
    const bGavl = this.depth;                       // crosswind dimension for gavl
    const dGavl = this.width;                       // alongwind dimension for gavl
    const eGavl = Math.min(bGavl, 2 * this.h);     // crosswind dimension or 2h, whichever smaller
    const ratioGavl = this.h / dGavl;
    const rhoGavl = this.windProp.getCorrelationFactor(ratioGavl);

    const coeffFacade: { [key: string]: { [zone: string]: number } } = {
      "cpe,10": {},
      "cpe,1": {},
    };
    const coeffGavl = { ...coeffFacade };

    // Determine zones for facade based on e/d ratio
    const facadeZones = this.getWallZones(eFacade, dFacade);
    for (const zone of facadeZones) {
      coeffFacade["cpe,10"][zone] = this.windProp.getFactorWall(ratioFacade, zone, false);
      coeffFacade["cpe,1"][zone] = this.windProp.getFactorWall(ratioFacade, zone, true);
    }

    // Determine zones for gavl based on e/d ratio
    const gavlZones = this.getWallZones(eGavl, dGavl);
    for (const zone of gavlZones) {
      coeffGavl["cpe,10"][zone] = this.windProp.getFactorWall(ratioGavl, zone, false);
      coeffGavl["cpe,1"][zone] = this.windProp.getFactorWall(ratioGavl, zone, true);
    }

    // Always include side zones D and E regardless of e/d ratio
    for (const zone of ["D", "E"]) {
      if (!facadeZones.includes(zone)) {
        coeffFacade["cpe,10"][zone] = this.windProp.getFactorWall(ratioFacade, zone, false);
        coeffFacade["cpe,1"][zone] = this.windProp.getFactorWall(ratioFacade, zone, true);
      }
      if (!gavlZones.includes(zone)) {
        coeffGavl["cpe,10"][zone] = this.windProp.getFactorWall(ratioGavl, zone, false);
        coeffGavl["cpe,1"][zone] = this.windProp.getFactorWall(ratioGavl, zone, true);
      }
    }

    const qFacade = this.applyQ(coeffFacade, this.qP, rhoFacade);
    const qGavl = this.applyQ(coeffGavl, this.qP, rhoGavl);
    
    // Add zone information
    const facadeZoneInfo = this.getWallZoneInfo(eFacade, dFacade);
    const gavlZoneInfo = this.getWallZoneInfo(eGavl, dGavl);
    
    return { 
      Facade: Object.assign(qFacade, { zoneInfo: facadeZoneInfo }), 
      Gavl: Object.assign(qGavl, { zoneInfo: gavlZoneInfo })
    };
  }

  /**
   * Get detailed wall zone information including dimensions
   */
  private getWallZoneInfo(e: number, d: number) {
    const ratio = e / d;
    const appliedZones = this.getWallZones(e, d);
    const zoneDimensions: { [zone: string]: string } = {};
    
    if (ratio > 5) {
      // e > 5d: only zone A covers the entire windward surface
      zoneDimensions['A'] = `${d.toFixed(2)}m (hele overfladen)`;
    } else if (ratio > 1) {
      // e > d: zones A and B
      zoneDimensions['A'] = `${(e / 5).toFixed(2)}m (e/5)`;
      zoneDimensions['B'] = `${(d - e / 5).toFixed(2)}m (d - e/5)`;
    } else {
      // e ≤ d: zones A, B, and C
      zoneDimensions['A'] = `${(e / 5).toFixed(2)}m (e/5)`;
      zoneDimensions['B'] = `${(4 * e / 5).toFixed(2)}m (4e/5)`;
      zoneDimensions['C'] = `${(d - e).toFixed(2)}m (d - e)`;
    }
    
    // Always include D and E dimensions (side zones) - these cover the entire surface
    zoneDimensions['D'] = `hele fladen`;
    zoneDimensions['E'] = `hele fladen`;
    
    return {
      appliedZones: [...appliedZones, 'D', 'E'], // Include D and E
      zoneDimensions,
      e,
      d,
      ratio
    };
  }

  /**
   * Determine wall zones based on elevation e and crosswind dimension d
   * Returns the applicable windward zones (A, B, C) based on e/d ratio
   */
  private getWallZones(e: number, d: number): string[] {
    const ratio = e / d;
    
    if (ratio > 5) {
      // e > 5d: only zone A covers the entire windward surface
      return ["A"];
    } else if (ratio > 1) {
      // e > d: zones A and B
      // Zone A width: e/5
      // Zone B width: d - e/5
      return ["A", "B"];
    } else {
      // e ≤ d: zones A, B, and C
      // Zone A width: e/5
      // Zone B width: 4e/5
      // Zone C width: d - e
      return ["A", "B", "C"];
    }
  }

  /**
   * Flat roof wind loads (parapet, curved, mansard)
   */
  windLoadFlatRoof(roofType: string, parameter: number): WindLoadResult {
    if (!this.windPressureDone) {
      this.windPressure();
    }

    const coeff: { [key: string]: { [zone: string]: number } } = {
      "cpe,10": {},
      "cpe,1": {},
    };

    const zones = ["F", "G", "H", "Itryk", "Isug"];
    for (const zone of zones) {
      coeff["cpe,10"][zone] = this.windProp.getFactorFlatRoof(roofType, parameter, zone, false);
      coeff["cpe,1"][zone] = this.windProp.getFactorFlatRoof(roofType, parameter, zone, true);
    }

    // DK NA – corner zone I suction should be ≥ –0.5
    if (this.useDKNA) {
      coeff["cpe,10"]["Isug"] = Math.min(coeff["cpe,10"]["Isug"], -0.5);
      coeff["cpe,1"]["Isug"] = Math.min(coeff["cpe,1"]["Isug"], -0.5);
    }

    return this.applyQ(coeff, this.qP);
  }

  /**
   * Monopitch roof wind loads
   */
  windLoadMonopitchRoof(windDirection: number): WindLoadResult {
    if (!this.windPressureDone) {
      this.windPressure();
    }

    let zones: string[];
    let method: (alpha: number, zone: string) => number;

    if (windDirection === 0) {
      zones = ["F1", "F2", "G1", "G2", "H1", "H2"];
      method = (alpha, zone) => this.windProp.getFactorMonopitchRoof0(alpha, zone);
    } else if (windDirection === 90) {
      zones = ["Fup", "Flow", "G", "H", "I"];
      method = (alpha, zone) => this.windProp.getFactorMonopitchRoof90(alpha, zone);
    } else if (windDirection === 180) {
      zones = ["F", "G", "H"];
      method = (alpha, zone) => this.windProp.getFactorMonopitchRoof180(alpha, zone);
    } else {
      throw new Error(`Invalid wind direction: ${windDirection}°. Should be 0, 90 or 180.`);
    }

    const coeff: { [key: string]: { [zone: string]: number } } = { "cpe,10": {} };
    for (const zone of zones) {
      coeff["cpe,10"][zone] = method(this.alpha, zone);
    }

    return this.applyQ(coeff, this.qP);
  }

  /**
   * Duopitch roof wind loads
   */
  windLoadDuopitchRoof(windDirection: number): WindLoadResult {
    if (!this.windPressureDone) {
      this.windPressure();
    }

    let zones: string[];
    let method: (alpha: number, zone: string) => number;

    if (windDirection === 0) {
      zones = ["F1", "F2", "G1", "G2", "H1", "H2", "I1", "I2", "J1", "J2"];
      method = (alpha, zone) => this.windProp.getFactorDuopitchRoof0(alpha, zone);
    } else if (windDirection === 90) {
      zones = ["F", "G", "H", "I"];
      method = (alpha, zone) => this.windProp.getFactorDuopitchRoof90(alpha, zone);
    } else {
      throw new Error(`Invalid wind direction: ${windDirection}°. Should be 0 or 90.`);
    }

    const coeff: { [key: string]: { [zone: string]: number } } = { "cpe,10": {} };
    for (const zone of zones) {
      coeff["cpe,10"][zone] = method(this.alpha, zone);
    }

    return this.applyQ(coeff, this.qP);
  }

  /**
   * Hipped roof wind loads
   */
  windLoadHippedRoof(): WindLoadResult {
    if (!this.windPressureDone) {
      this.windPressure();
    }

    const zones = ["F", "G", "H", "I", "J", "K", "L", "M", "N"];
    const coeff: { [key: string]: { [zone: string]: number } } = { "cpe,10": {} };
    
    for (const zone of zones) {
      coeff["cpe,10"][zone] = this.windProp.getFactorHippedRoof0(this.alpha, zone);
    }

    return this.applyQ(coeff, this.qP);
  }

  /**
   * Apply pressure factor to coefficient matrix
   */
  private applyQ(
    coeff: { [key: string]: { [zone: string]: number } },
    qP: number,
    rho: number = 1.0,
  ): WindLoadResult {
    const out: WindLoadResult = {};
    
    for (const [cpeKey, zones] of Object.entries(coeff)) {
      const outZone: { [zone: string]: number } = {};
      for (const [zone, cpe] of Object.entries(zones)) {
        outZone["q" + zone] = cpe * qP * rho;
      }
      out[cpeKey] = outZone;
    }
    
    return out;
  }

  /**
   * Direction factor from DK NA table 1a
   * Returns cDir² factor based on wind direction
   */
  private dirFactor(windDirDeg: number | null): number {
    if (windDirDeg === null) {
      return 1.0; // worst case
    }

    // Danish wind direction sectors with corresponding cDir² values
    // Each sector covers 30° (360°/12 = 30°)
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

    // Normalize wind direction to 0-360°
    const wd = windDirDeg % 360;
    
    for (const [start, end, cDirSq] of sectors) {
      if (start < end && start <= wd && wd < end) {
        return cDirSq;
      }
      if (start > end && (wd >= start || wd < end)) { // sector wraps around 0°
        return cDirSq;
      }
    }
    
    return 1.0; // fallback
  }
}
