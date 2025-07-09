/**
 * TypeScript port of EC1_4_opdateret.py
 * Wind load calculation according to EN 1991-1-4 / DS-NA 2024
 */

import { WindProp, Number } from './windprop';

interface WindLoadResult {
  [cpeType: string]: {
    [zone: string]: number;
  };
}

interface MultiSurfaceWindLoadResult {
  [surface: string]: WindLoadResult;
}

export class EC14 {
  private alpha: number;              // roof pitch [°]
  private h: number;                  // building height [m]
  private b: number;                  // building width [m] 
  private l: number;                  // building length [m]
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
    b: number,                  // building width [m]
    l: number,                  // building length [m]
    distToCoastKm: number,      // distance to west coast [km]
    terrainCat: number,         // terrain category (0-4)
    windDirDeg: number | null = null, // wind direction [°] (0=N)
    seasonFactor: number = 1.0, // season factor (≥ 0.6 if relevant)
    useDKNA: boolean = true,    // true = DK-National Annex 2024
  ) {
    this.alpha = alpha;
    this.h = h;
    this.b = b;
    this.l = l;
    this.distCoastKm = distToCoastKm;
    this.terrainCat = terrainCat;
    this.windDirDeg = windDirDeg;
    this.cSeason = seasonFactor;
    this.useDKNA = useDKNA;

    this.windProp = new WindProp();
  }

  /**
   * Calculate wind pressure parameters: vB, vM, iV, qP [SI units]
   */
  windPressure(): void {
    const rho = 1.25;  // air density [kg/m³]

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
    const z = Math.max(this.h, zMin);
    const cR = kR * Math.log(z / z0);
    const cO = 1.0; // DK NA has no special rule here

    this.vM = cR * cO * this.vB;
    const kL = 1.0;
    this.iV = kL / (cO * Math.log(z / z0));

    this.qP = (1 + 7 * this.iV) * 0.5 * rho * Math.pow(this.vM, 2);
    this.windPressureDone = true;
  }

  /**
   * Wall wind loads according to table 7.1
   */
  windLoadWall(): MultiSurfaceWindLoadResult {
    if (!this.windPressureDone) {
      this.windPressure();
    }

    const eFacade = Math.min(this.l, 2 * this.h);
    const dFacade = this.l;
    const ratioFacade = this.h / dFacade;
    const rhoFacade = this.windProp.getCorrelationFactor(ratioFacade);

    const eGable = Math.min(this.b, 2 * this.h);
    const dGable = this.b;
    const ratioGable = this.h / dGable;
    const rhoGable = this.windProp.getCorrelationFactor(ratioGable);

    const coeffFacade: { [key: string]: { [zone: string]: number } } = {
      "cpe,10": {},
      "cpe,1": {},
    };
    const coeffGable = { ...coeffFacade };

    const zones = ["A", "B", "C", "D", "E"];
    for (const zone of zones) {
      coeffFacade["cpe,10"][zone] = this.windProp.getFactorWall(ratioFacade, zone, false);
      coeffFacade["cpe,1"][zone] = this.windProp.getFactorWall(ratioFacade, zone, true);
      coeffGable["cpe,10"][zone] = this.windProp.getFactorWall(ratioGable, zone, false);
      coeffGable["cpe,1"][zone] = this.windProp.getFactorWall(ratioGable, zone, true);
    }

    const qFacade = this.applyQ(coeffFacade, this.qP, rhoFacade);
    const qGable = this.applyQ(coeffGable, this.qP, rhoGable);
    
    return { Facade: qFacade, Gavl: qGable };
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
