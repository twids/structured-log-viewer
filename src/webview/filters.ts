import { LogEntry } from '../templates/types';

export class FilterEngine {
  static apply(
    entries: LogEntry[],
    activeLevels: Set<string>,
    searchText: string,
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

    return result;
  }
}
