// Calculs electriques des TP virtuels CRNS (fonctions pures, testees : tests/unit/crnsCircuit.test.ts).
// Modele volontairement simple et lisible par un eleve : P = U x I, echauffement d'un contact
// P = R x I^2, temperature qui tend vers T_ambiante + P x R_th avec une constante de temps.

export type HeatLevel = 'normal' | 'chaud' | 'danger';

export interface FaultThermal {
  R_tight_ohm: number;
  R_loose_ohm: number;
  R_th_K_per_W: number;
  tau_s: number;
  ambient_C: number;
  thresholds_C: { warm: number; danger: number };
}

/** Intensite absorbee par une charge resistive : I = P / U. */
export function current(powerW: number, voltageV: number): number {
  return voltageV > 0 ? powerW / voltageV : 0;
}

/** Puissance dissipee dans une resistance de contact : P = R x I^2. */
export function contactPower(resistanceOhm: number, currentA: number): number {
  return resistanceOhm * currentA * currentA;
}

/** Temperature atteinte en regime etabli : T = T_ambiante + P x R_th. */
export function steadyTemperature(powerW: number, rThKPerW: number, ambientC: number): number {
  return ambientC + powerW * rThKPerW;
}

/** Un pas d'evolution (premier ordre) vers la temperature cible. */
export function stepTemperature(tempC: number, targetC: number, dtS: number, tauS: number): number {
  if (tauS <= 0) return targetC;
  return targetC + (tempC - targetC) * Math.exp(-dtS / tauS);
}

export function heatLevel(tempC: number, thresholds: { warm: number; danger: number }): HeatLevel {
  if (tempC >= thresholds.danger) return 'danger';
  if (tempC >= thresholds.warm) return 'chaud';
  return 'normal';
}

/** Le calibre est depasse (le disjoncteur finirait par declencher sur surcharge). */
export function exceedsRating(currentA: number, ratingA: number): boolean {
  return currentA > ratingA;
}

/** Nombre au format francais (virgule decimale, espace fine pour les milliers). */
export function fr(value: number, digits = 1): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
