/**
 * A LogTemplate maps JSON field paths to semantic log columns.
 * This is the core abstraction that makes the viewer format-agnostic.
 */
export interface LogTemplate {
  /** Display name shown in the format selector */
  name: string;

  /**
   * Fields that must be present in a JSON line for auto-detection.
   * If all listed fields exist in the first parseable line, this template matches.
   */
  detect?: string[];

  /** Maps semantic columns to JSON field paths (dot-notation for nesting) */
  mappings: LogFieldMappings;

  /**
   * Optional map from raw level values to normalized level names.
   * e.g. { "ERR": "Error", "WRN": "Warning" }
   */
  levelMap?: Record<string, string>;

  /** Level to assume when the level field is absent. Default: "Information" */
  defaultLevel?: string;
}

export interface LogFieldMappings {
  /** Path to timestamp field */
  timestamp: string;
  /** Path to log level field */
  level: string;
  /** Path to rendered message field */
  message: string;
  /** Path to message template field (optional) */
  messageTemplate?: string;
  /** Path to exception/error field */
  exception?: string;
  /** Path to event ID field */
  eventId?: string;
  /**
   * Path to a properties object.
   * If set, the value at this path is treated as a bag of key-value properties.
   * If not set (e.g. CLEF), all non-mapped root keys are treated as properties.
   */
  properties?: string;
}

/** A single parsed log entry, normalized to common columns */
export interface LogEntry {
  /** Original 0-based line number in the file */
  line: number;
  timestamp: string;
  level: string;
  message: string;
  messageTemplate?: string;
  exception?: string;
  eventId?: string;
  /** Arbitrary structured properties */
  properties: Record<string, unknown>;
  /** The raw JSON object for this line */
  raw: Record<string, unknown>;
  /** True if this line could not be parsed as JSON */
  parseError?: boolean;
  /** Raw text for unparseable lines */
  rawText?: string;
}

/** Normalized log level names for coloring */
export type LogLevel =
  | 'Verbose'
  | 'Debug'
  | 'Information'
  | 'Warning'
  | 'Error'
  | 'Fatal'
  | 'Unknown';

const LEVEL_ALIASES: Record<string, LogLevel> = {
  verbose: 'Verbose',
  trace: 'Verbose',
  vrb: 'Verbose',
  debug: 'Debug',
  dbg: 'Debug',
  information: 'Information',
  info: 'Information',
  inf: 'Information',
  warning: 'Warning',
  warn: 'Warning',
  wrn: 'Warning',
  error: 'Error',
  err: 'Error',
  fatal: 'Fatal',
  critical: 'Fatal',
  ftl: 'Fatal',
};

/** Normalize a raw level string to a standard LogLevel */
export function normalizeLevel(
  raw: string | undefined | null,
  template: LogTemplate
): LogLevel {
  if (!raw) {
    const def = template.defaultLevel ?? 'Information';
    return normalizeLevel(def, { ...template, defaultLevel: undefined });
  }
  const str = String(raw).trim();

  // Check template-specific level map first
  if (template.levelMap) {
    const mapped = template.levelMap[str];
    if (mapped) {
      return (LEVEL_ALIASES[mapped.toLowerCase()] as LogLevel) ?? 'Unknown';
    }
  }

  return (LEVEL_ALIASES[str.toLowerCase()] as LogLevel) ?? 'Unknown';
}

/**
 * Resolve a dot-notation path on an object.
 * e.g. getByPath(obj, "Properties.EventId") => obj.Properties.EventId
 */
export function getByPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
