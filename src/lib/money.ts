/** Validate at ingress; never round an untrusted fractional stake into a free bet. */
export function minorUnits(value: number, allowZero = false): number {
  const units = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    !Number.isSafeInteger(units) ||
    Math.abs(value * 100 - units) > 0.000001 ||
    (allowZero ? value < 0 : value <= 0) ||
    units > 99_999_999_999_999
  ) {
    throw new Error("Amount must be a valid positive whole number of cents");
  }
  return units;
}

export function signedMinorUnits(value: number): number {
  if (value === 0) return 0;
  return Math.sign(value) * minorUnits(Math.abs(value));
}
