import type { FieldChange } from '../components/ui/confirm-changes-modal';

/**
 * Compare two values and return a FieldChange if they differ.
 * For scalar values (string, number, boolean).
 */
export function detectScalarChange(
  label: string,
  oldVal: unknown,
  newVal: unknown,
  formatter?: (v: unknown) => string,
): FieldChange | null {
  if (oldVal === newVal) return null;
  const fmt = formatter ?? String;
  return {
    label,
    type: 'scalar',
    oldValue: fmt(oldVal),
    newValue: fmt(newVal),
  };
}

/**
 * Compare two string arrays and return a FieldChange if they differ.
 */
export function detectArrayChange(
  label: string,
  oldArr: string[],
  newArr: string[],
): FieldChange | null {
  const added = newArr.filter((item) => !oldArr.includes(item));
  const removed = oldArr.filter((item) => !newArr.includes(item));
  if (added.length === 0 && removed.length === 0) return null;
  return { label, type: 'array', added, removed };
}

/**
 * Detect if a secret field was changed (non-empty new value).
 */
export function detectSecretChange(
  label: string,
  newVal: string,
): FieldChange | null {
  if (!newVal || newVal.trim() === '') return null;
  return { label, type: 'secret' };
}

/**
 * Filter null entries from an array of possible changes.
 */
export function collectChanges(
  ...changes: (FieldChange | null)[]
): FieldChange[] {
  return changes.filter((c): c is FieldChange => c !== null);
}
