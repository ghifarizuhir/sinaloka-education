import { useState, useCallback, useMemo } from 'react';

export type ValidationRule = [condition: boolean, field: string, message: string];

export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const setMultiple = useCallback((errMap: Record<string, string>) => {
    setErrors(errMap);
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const validate = useCallback((rules: ValidationRule[]): boolean => {
    const newErrors: Record<string, string> = {};
    for (const [condition, field, message] of rules) {
      if (condition) {
        newErrors[field] = message;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  return { errors, setError, setErrors: setMultiple, clearError, clearAll, hasErrors, validate };
}
