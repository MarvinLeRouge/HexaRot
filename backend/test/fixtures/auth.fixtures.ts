export function uniqueTestEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export const VALID_PASSWORD = 'Correct-Horse-Battery9';
