/** Fills `{key}` placeholders in a content template. Unknown keys are left as-is. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Joins names with the separator defined in content.json. */
export function joinNames(names: string[], separator: string): string {
  return names.join(separator);
}
