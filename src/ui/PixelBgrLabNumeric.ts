import type { PixelBgrIssue } from "./PixelBgrLabValidation";

export type NumericStepOptions = { step: number; min?: number; max?: number };

export function decimalPlacesForStep(step: number): number {
  if (!Number.isFinite(step) || step === 0) return 0;
  const text = String(Math.abs(step));
  if (text.includes("e-")) return Number(text.split("e-")[1] ?? 0);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

export function clampNumericValue(value: number, min?: number, max?: number): number {
  let next = value;
  if (Number.isFinite(min) && next < min!) next = min!;
  if (Number.isFinite(max) && next > max!) next = max!;
  return next;
}

export function normalizeSteppedValue(value: number, step: number): number {
  if (!Number.isFinite(value)) return 0;
  const places = decimalPlacesForStep(step);
  return places > 0 ? Number(value.toFixed(Math.min(8, places))) : Math.round(value);
}

export function stepNumericValue(current: number, direction: -1 | 1, options: NumericStepOptions): number {
  const base = Number.isFinite(current) ? current : 0;
  const stepped = normalizeSteppedValue(base + direction * options.step, options.step);
  return normalizeSteppedValue(clampNumericValue(stepped, options.min, options.max), options.step);
}

export type ValidationSummaryState = {
  label: string;
  expanded: boolean;
  hasDetails: boolean;
  errors: number;
  warnings: number;
};

export function validationSummaryState(errors: PixelBgrIssue[], warnings: PixelBgrIssue[], expandedOverride?: boolean): ValidationSummaryState {
  const hasErrors = errors.length > 0;
  const hasDetails = hasErrors || warnings.length > 0;
  const expanded = expandedOverride ?? hasErrors;
  const status = hasErrors ? "ERROR" : "PASS";
  const parts = [
    errors.length ? `${errors.length} ${errors.length === 1 ? "error" : "errors"}` : "",
    warnings.length ? `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}` : "",
  ].filter(Boolean);
  const suffix = hasDetails ? ` — ${parts.join(", ")} ${expanded ? "▾" : "▸"}` : "";
  return { label: `${status}${suffix}`, expanded, hasDetails, errors: errors.length, warnings: warnings.length };
}

export function toggleValidationExpanded(current: boolean): boolean { return !current; }
