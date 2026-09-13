export type StateValue = boolean | number | string;
export type StateValueType = "boolean" | "number" | "string";

/** Authored reference: stable content identity is separate from its runtime address. */
export interface StateReferenceDefinition {
  readonly id: string;
  readonly address: string;
  readonly valueType: StateValueType;
}

export interface StateValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface StateValidationResult {
  readonly valid: boolean;
  readonly issues: readonly StateValidationIssue[];
}

export function stateValueType(value: StateValue): StateValueType {
  return typeof value as StateValueType;
}

export function isStateValue(value: unknown): value is StateValue {
  return typeof value === "boolean"
    || typeof value === "string"
    || (typeof value === "number" && Number.isFinite(value));
}

export function validateStateReferenceDefinition(definition: unknown): StateValidationResult {
  const issues: StateValidationIssue[] = [];
  const value = definition as Record<string, unknown> | null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, issues: [{ field: "state", message: "State reference must be an object" }] };
  }
  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    issues.push({ field: "id", message: "id must be a non-empty string" });
  }
  if (typeof value.address !== "string" || value.address.trim().length === 0) {
    issues.push({ field: "address", message: "address must be a non-empty string" });
  }
  if (value.valueType !== "boolean" && value.valueType !== "number" && value.valueType !== "string") {
    issues.push({ field: "valueType", message: 'valueType must be "boolean", "number", or "string"' });
  }
  return { valid: issues.length === 0, issues };
}
