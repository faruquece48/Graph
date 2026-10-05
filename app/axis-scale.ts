export type AxisSettings = { min: string; max: string; interval: string };
export const automaticAxes: AxisSettings[] = Array.from({ length: 3 }, () => ({ min: "", max: "", interval: "" }));

export function axisScale(values: number[], settings: AxisSettings) {
  const low = Math.min(...(values.length ? values : [0, 1]));
  const high = Math.max(...(values.length ? values : [0, 1]));
  const span = high - low || 1;
  const target = Math.max(1, span / 6);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = Math.max(1, Math.ceil(([1, 2, 5, 10].find(n => n * magnitude >= target) ?? 10) * magnitude));
  const autoMin = Math.floor(low / step) * step;
  const autoMax = Math.max(autoMin + step, Math.ceil(high / step) * step);
  const parse = (value: string, fallback: number) => value.trim() === "" ? fallback : Number(value);
  const min = parse(settings.min, autoMin);
  const max = parse(settings.max, autoMax);
  const interval = parse(settings.interval, step);
  let error = "";
  if (![min, max, interval].every(Number.isSafeInteger)) error = "Use whole numbers for minimum, maximum, and interval.";
  else if (max <= min) error = "Maximum must be greater than minimum.";
  else if (interval <= 0) error = "Interval must be greater than zero.";
  else if ((max - min) / interval > 100) error = "Increase the interval to show at most 101 ticks.";
  const resolved = error ? { min: autoMin, max: autoMax, interval: step } : { min, max, interval };
  const ticks = Array.from({ length: Math.floor((resolved.max - resolved.min) / resolved.interval) + 1 }, (_, i) => resolved.min + i * resolved.interval);
  return { ...resolved, ticks, error };
}
