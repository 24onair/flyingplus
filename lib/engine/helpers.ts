export function isInRange(value: number, [min, max]: [number, number]) {
  return value >= min && value <= max;
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function averageWindDirection(degrees: number[]) {
  if (degrees.length === 0) return 0;

  const x = degrees.reduce((sum, deg) => sum + Math.cos((deg * Math.PI) / 180), 0);
  const y = degrees.reduce((sum, deg) => sum + Math.sin((deg * Math.PI) / 180), 0);
  const result = (Math.atan2(y, x) * 180) / Math.PI;
  return (result + 360) % 360;
}
