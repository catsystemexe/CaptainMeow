export interface Marker {
  readonly id: string;
  readonly position: number;
}

export interface Range {
  readonly id: string;
  readonly start: number;
  readonly end: number;
}

export interface Zone {
  readonly id: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface SpaceValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface SpaceValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SpaceValidationIssue[];
}

function validateId(id: string, issues: SpaceValidationIssue[]): void {
  if (typeof id !== "string" || id.trim().length === 0) {
    issues.push({ field: "id", message: "id must be a non-empty string" });
  }
}

function validateFinite(value: number, field: string, issues: SpaceValidationIssue[]): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ field, message: `${field} must be a finite number` });
  }
}

function result(issues: SpaceValidationIssue[]): SpaceValidationResult {
  return { valid: issues.length === 0, issues };
}

export function validateMarker(marker: Marker): SpaceValidationResult {
  const issues: SpaceValidationIssue[] = [];
  validateId(marker.id, issues);
  validateFinite(marker.position, "position", issues);
  return result(issues);
}

export function validateRange(range: Range): SpaceValidationResult {
  const issues: SpaceValidationIssue[] = [];
  validateId(range.id, issues);
  validateFinite(range.start, "start", issues);
  validateFinite(range.end, "end", issues);
  if (Number.isFinite(range.start) && Number.isFinite(range.end) && range.start > range.end) {
    issues.push({ field: "start", message: "start must be less than or equal to end" });
  }
  return result(issues);
}

export function validateZone(zone: Zone): SpaceValidationResult {
  const issues: SpaceValidationIssue[] = [];
  validateId(zone.id, issues);
  validateFinite(zone.minX, "minX", issues);
  validateFinite(zone.maxX, "maxX", issues);
  validateFinite(zone.minY, "minY", issues);
  validateFinite(zone.maxY, "maxY", issues);
  if (Number.isFinite(zone.minX) && Number.isFinite(zone.maxX) && zone.minX > zone.maxX) {
    issues.push({ field: "minX", message: "minX must be less than or equal to maxX" });
  }
  if (Number.isFinite(zone.minY) && Number.isFinite(zone.maxY) && zone.minY > zone.maxY) {
    issues.push({ field: "minY", message: "minY must be less than or equal to maxY" });
  }
  return result(issues);
}

/** Returns whether x lies in the closed interval [start, end]. */
export function rangeContains(range: Range, x: number): boolean {
  return range.start <= x && x <= range.end;
}

/** Returns whether (x, y) lies in the closed axis-aligned zone. */
export function zoneContains(zone: Zone, x: number, y: number): boolean {
  return zone.minX <= x && x <= zone.maxX && zone.minY <= y && y <= zone.maxY;
}
