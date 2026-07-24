import { LogEntry } from '../templates/types';

export interface PropertyFilter {
  path: string;
  value: string;
}

export type PropertyFilterMode = 'and' | 'or';

export class FilterEngine {
  static apply(
    entries: LogEntry[],
    activeLevels: Set<string>,
    searchText: string,
    propertyFilters: PropertyFilter[] = [],
    propertyFilterMode: PropertyFilterMode = 'and',
  ): LogEntry[] {
    let result = entries;

    if (activeLevels.size > 0) {
      result = result.filter((e) => activeLevels.has(e.level));
    }

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter((e) => {
        if (e.message?.toLowerCase().includes(lower)) return true;
        if (e.messageTemplate?.toLowerCase().includes(lower)) return true;
        if (e.exception?.toLowerCase().includes(lower)) return true;
        if (e.properties) {
          for (const val of Object.values(e.properties)) {
            if (String(val).toLowerCase().includes(lower)) return true;
          }
        }
        if (e.rawText?.toLowerCase().includes(lower)) return true;
        return false;
      });
    }

    if (propertyFilters.length > 0) {
      result = result.filter((e) => {
        const checks = propertyFilters.map((f) => {
          const candidate = getPropertyPathValue(e.properties, f.path);
          if (candidate === undefined) return false;
          return String(candidate) === f.value;
        });
        return propertyFilterMode === 'and'
          ? checks.every(Boolean)
          : checks.some(Boolean);
      });
    }

    return result;
  }
}

function getPropertyPathValue(
  properties: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split('.');
  let current: unknown = properties;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number.parseInt(part, 10);
      if (Number.isNaN(index)) return undefined;
      current = current[index];
      continue;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
      continue;
    }
    return undefined;
  }

  return current;
}
