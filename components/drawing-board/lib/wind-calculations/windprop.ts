/**
 * TypeScript port of WindProp_opdateret.py
 * Wind load calculations according to EN 1991-1-4
 */

export type Number = number;

interface DataFrameRow {
  [key: string]: number;
}

interface DataFrame {
  [key: string]: number[];
}

export class WindProp {
  // Flat roof parapets data tables (tabel 7.2)
  private flatRoofParapetsCpe10: DataFrame;
  private flatRoofParapetsCpe1: DataFrame;
  private flatRoofCurvedEavesCpe10: DataFrame;
  private flatRoofCurvedEavesCpe1: DataFrame;
  private flatRoofMansardEavesCpe10: DataFrame;
  private flatRoofMansardEavesCpe1: DataFrame;

  constructor() {
    // Initialize flat roof parapets data tables
    this.flatRoofParapetsCpe10 = {
      "hp/h": [0.025, 0.05, 0.10],
      "F": [-1.6, -1.4, -1.2],
      "G": [-1.1, -0.9, -0.8],
      "H": [-0.7, -0.7, -0.7],
      "Itryk": [0.2, 0.2, 0.2],
      "Isug": [-0.2, -0.2, -0.2],
    };

    this.flatRoofParapetsCpe1 = {
      "hp/h": [0.025, 0.05, 0.10],
      "F": [-2.2, -2.0, -1.8],
      "G": [-1.8, -1.6, -1.4],
      "H": [-1.2, -1.2, -1.2],
      "Itryk": [0.2, 0.2, 0.2],
      "Isug": [-0.2, -0.2, -0.2],
    };

    this.flatRoofCurvedEavesCpe10 = {
      "r/h": [0.05, 0.10, 0.20],
      "F": [-1.0, -0.7, -0.5],
      "G": [-1.2, -0.8, -0.5],
      "H": [-0.4, -0.3, -0.3],
      "Itryk": [0.2, 0.2, 0.2],
      "Isug": [-0.2, -0.2, -0.2],
    };

    this.flatRoofCurvedEavesCpe1 = {
      "r/h": [0.05, 0.10, 0.20],
      "F": [-1.5, -1.2, -0.8],
      "G": [-1.8, -1.4, -0.8],
      "H": [-0.4, -0.3, -0.3],
      "Itryk": [0.2, 0.2, 0.2],
      "Isug": [-0.2, -0.2, -0.2],
    };

    this.flatRoofMansardEavesCpe10 = {
      "alpha": [30, 45, 60],
      "F": [-1.0, -1.2, -1.3],
      "G": [-1.0, -1.3, -1.3],
      "H": [-0.3, -0.4, -0.5],
      "Itryk": [0.2, 0.2, 0.2],
      "Isug": [-0.2, -0.2, -0.2],
    };

    this.flatRoofMansardEavesCpe1 = {
      "alpha": [30, 45, 60],
      "F": [-1.5, -1.8, -1.9],
      "G": [-1.5, -1.9, -1.9],
      "H": [-0.3, -0.4, -0.5],
      "Itryk": [0.2, 0.2, 0.2],
      "Isug": [-0.2, -0.2, -0.2],
    };
  }

  /**
   * Linear interpolation between y1@0 … y2@1
   */
  static interpolate(y1: Number, y2: Number, ratio: number): Number {
    return y1 + (y2 - y1) * ratio;
  }

  /**
   * Common DataFrame interpolator
   */
  private getFromDataframe(
    df: DataFrame,
    xCol: string,
    x: Number,
    zone: string,
  ): Number {
    const xs = df[xCol];
    if (x <= Math.min(...xs)) {
      const minIndex = xs.indexOf(Math.min(...xs));
      return df[zone][minIndex];
    }
    if (x >= Math.max(...xs)) {
      const maxIndex = xs.indexOf(Math.max(...xs));
      return df[zone][maxIndex];
    }

    // Find indices for interpolation
    let lowerIdx = -1;
    let upperIdx = -1;
    
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] <= x) lowerIdx = i;
      if (xs[i] >= x && upperIdx === -1) upperIdx = i;
    }

    if (lowerIdx === upperIdx) {
      return df[zone][lowerIdx];
    }

    const x1 = xs[lowerIdx];
    const x2 = xs[upperIdx];
    const y1 = df[zone][lowerIdx];
    const y2 = df[zone][upperIdx];
    const ratio = (x - x1) / (x2 - x1);
    
    return WindProp.interpolate(y1, y2, ratio);
  }

  /**
   * Correlation factor that reduces simultaneous pressure on large surfaces
   * (EN 1991-1-4, 7.2.1(1) + DK NA)
   * Linear interpolation between 0.85 at h/d ≤ 1 and 1.00 at h/d ≥ 5
   */
  getCorrelationFactor(hOverD: number): number {
    if (hOverD <= 1.0) return 0.85;
    if (hOverD >= 5.0) return 1.00;
    // Linear interpolation for 1 < h/d < 5
    return 0.85 + (hOverD - 1.0) * (1.00 - 0.85) / (5.0 - 1.0);
  }

  /**
   * Wall factors according to table 7.1
   */
  getFactorWall(hOverD: number, zone: string, cpe1: boolean = false): Number {
    const df: DataFrame = {
      "h/d": [5.0, 1.0, 0.25],
      "A": [-1.2, -1.2, -1.2],
      "B": [-0.8, -0.8, -0.8],
      "C": [-0.5, -0.5, -0.5],
      "D": [0.8, 0.8, 0.7],
      "E": [-0.7, -0.5, -0.3],
    };

    if (cpe1) {
      df["A"] = [-1.4, -1.4, -1.4];
      df["B"] = [-1.1, -1.1, -1.1];
      df["D"] = [1.0, 1.0, 1.0];
    }

    return this.getFromDataframe(df, "h/d", hOverD, zone);
  }

  /**
   * Returns cpe,10 or cpe,1 for zone on flat roof
   * (parapet, curved or mansard eaves)
   */
  getFactorFlatRoof(
    roofType: string,
    parameter: number,
    zone: string,
    cpe1: boolean = false,
  ): Number {
    const lookups: { [key: string]: [DataFrame, string] } = {
      "Parapets_false": [this.flatRoofParapetsCpe10, "hp/h"],
      "Parapets_true": [this.flatRoofParapetsCpe1, "hp/h"],
      "Curved_false": [this.flatRoofCurvedEavesCpe10, "r/h"],
      "Curved_true": [this.flatRoofCurvedEavesCpe1, "r/h"],
      "Mansard_false": [this.flatRoofMansardEavesCpe10, "alpha"],
      "Mansard_true": [this.flatRoofMansardEavesCpe1, "alpha"],
    };

    const key = `${roofType}_${cpe1}`;
    const lookup = lookups[key];
    
    if (!lookup) {
      throw new Error(`Invalid combination: roofType=${roofType}, cpe1=${cpe1}`);
    }

    const [df, xCol] = lookup;
    return this.getFromDataframe(df, xCol, parameter, zone);
  }

  /**
   * Monopitch roof with wind direction 0°
   */
  getFactorMonopitchRoof0(alpha: number, zone: string): Number {
    const df: DataFrame = {
      "alpha": [5, 15, 30, 45, 60, 75],
      "F1": [-1.7, -0.9, -0.5, 0.0, 0.7, 0.8],
      "F2": [0.0, 0.2, 0.7, 0.7, 0.7, 0.8],
      "G1": [-1.2, -0.8, -0.5, 0.0, 0.7, 0.8],
      "G2": [0.0, 0.2, 0.7, 0.7, 0.7, 0.8],
      "H1": [-0.6, -0.3, -0.2, 0.0, 0.7, 0.8],
      "H2": [0.0, 0.2, 0.4, 0.6, 0.7, 0.8],
    };
    return this.getFromDataframe(df, "alpha", alpha, zone);
  }

  /**
   * Monopitch roof with wind direction 180°
   */
  getFactorMonopitchRoof180(alpha: number, zone: string): Number {
    const df: DataFrame = {
      "alpha": [5, 15, 30, 45, 60, 75],
      "F": [-2.3, -2.5, -1.1, -0.6, -0.5, -0.5],
      "G": [-1.3, -1.3, -0.8, -0.5, -0.5, -0.5],
      "H": [-0.8, -0.9, -0.8, -0.7, -0.5, -0.5],
    };
    return this.getFromDataframe(df, "alpha", alpha, zone);
  }

  /**
   * Monopitch roof with wind direction 90°
   */
  getFactorMonopitchRoof90(alpha: number, zone: string): Number {
    const df: DataFrame = {
      "alpha": [5, 15, 30, 45, 60, 75],
      "Fup": [-2.1, -2.4, -2.1, -1.5, -1.2, -1.2],
      "Flow": [-2.1, -1.6, -1.3, -1.3, -1.2, -1.2],
      "G": [-1.8, -1.9, -1.5, -1.4, -1.2, -1.2],
      "H": [-0.6, -0.8, -1.0, -1.0, -1.0, -1.0],
      "I": [-0.5, -0.7, -0.8, -0.9, -0.7, -0.5],
    };
    return this.getFromDataframe(df, "alpha", alpha, zone);
  }

  /**
   * Duopitch roof with wind direction 0°
   */
  getFactorDuopitchRoof0(alpha: number, zone: string): Number {
    const df: DataFrame = {
      "alpha": [-45, -30, -15, -5, 5, 15, 30, 45, 60, 75],
      "F1": [-0.6, -1.1, -2.5, -2.3, -1.7, -0.9, -0.5, 0, 0.7, 0.8],
      "F2": [-0.6, -1.1, -2.5, -2.3, 0, 0.2, 0.7, 0.7, 0.7, 0.8],
      "G1": [-0.6, -0.8, -1.3, -1.2, -1.2, -0.8, -0.5, 0, 0.7, 0.8],
      "G2": [-0.6, -0.8, -1.3, -1.2, 0, 0.2, 0.7, 0.7, 0.7, 0.8],
      "H1": [-0.8, -0.8, -0.9, -0.8, -0.6, -0.3, -0.2, 0, 0.7, 0.8],
      "H2": [-0.8, -0.8, -0.9, -0.8, 0, 0.2, 0.4, 0.6, 0.7, 0.8],
      "I1": [-0.7, -0.6, -0.5, 0.2, -0.6, -0.4, -0.4, -0.2, -0.2, -0.2],
      "I2": [-0.7, -0.6, -0.5, -0.6, -0.6, 0, 0, 0, -0.2, -0.2],
      "J1": [-1, -0.8, -0.7, 0.2, 0.2, -1.0, -0.5, -0.3, -0.3, -0.3],
      "J2": [-1, -0.8, -0.7, -0.6, -0.6, 0, 0, 0, -0.3, -0.3],
    };
    return this.getFromDataframe(df, "alpha", alpha, zone);
  }

  /**
   * Duopitch roof with wind direction 90°
   */
  getFactorDuopitchRoof90(alpha: number, zone: string): Number {
    const df: DataFrame = {
      "alpha": [-45, -30, -15, -5, 5, 15, 30, 45, 60, 75],
      "F": [-1.4, -1.5, -1.9, -1.8, -1.6, -1.3, -1.1, -1.1, -1.1, -1.1],
      "G": [-1.2, -1.2, -1.2, -1.2, -1.3, -1.3, -1.4, -1.4, -1.2, -1.2],
      "H": [-1.0, -1.0, -0.8, -0.7, -0.7, -0.6, -0.8, -0.9, -0.8, -0.8],
      "I": [-0.9, -0.9, -0.8, -0.6, -0.6, -0.5, -0.5, -0.5, -0.5, -0.5],
    };
    return this.getFromDataframe(df, "alpha", alpha, zone);
  }

  /**
   * Hipped roof with wind direction 0°
   */
  getFactorHippedRoof0(alpha: number, zone: string): Number {
    const df: DataFrame = {
      "alpha": [5, 15, 30, 45, 60, 75],
      "F": [-1.7, -0.9, -0.5, 0, 0.7, 0.8],
      "G": [-1.2, -0.8, -0.5, 0, 0.7, 0.8],
      "H": [-0.6, -0.3, -0.2, 0, 0.7, 0.8],
      "I": [-0.3, -0.5, -0.5, -0.3, -0.3, -0.3],
      "J": [-0.6, -1.0, -0.7, -0.6, -0.6, -0.6],
      "K": [-0.6, -1.2, -0.5, -0.3, -0.3, -0.3],
      "L": [-1.2, -1.4, -1.4, -1.3, -1.2, -1.2],
      "M": [-0.6, -0.6, -0.8, -0.8, -0.4, -0.4],
      "N": [-0.4, -0.3, -0.2, -0.2, -0.2, -0.2],
    };
    return this.getFromDataframe(df, "alpha", alpha, zone);
  }

  /**
   * Legacy interpolation method for compatibility with original WindProp.py
   */
  static interpolation(x1: Number, x2: Number, y1: Number, y2: Number, x: Number): Number {
    const a = (y2 - y1) / (x2 - x1);
    const b = y1 - a * x1;
    return a * x + b;
  }
}
