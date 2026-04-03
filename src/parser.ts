import { LogEntry, LogTemplate, getByPath, normalizeLevel } from './templates/types';

export function parseLogLine(
  line: string,
  lineNumber: number,
  template: LogTemplate
): LogEntry {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(line);
  } catch {
    return {
      line: lineNumber,
      timestamp: '',
      level: 'Unknown',
      message: '',
      properties: {},
      raw: {},
      parseError: true,
      rawText: line,
    };
  }

  const timestamp = String(getByPath(raw, template.mappings.timestamp) ?? '');
  const rawLevel = getByPath(raw, template.mappings.level) as
    | string
    | undefined;
  const level = normalizeLevel(rawLevel, template);
  const message = String(getByPath(raw, template.mappings.message) ?? '');

  const messageTemplate = template.mappings.messageTemplate
    ? (getByPath(raw, template.mappings.messageTemplate) as string | undefined)
    : undefined;

  const exception = template.mappings.exception
    ? (getByPath(raw, template.mappings.exception) as string | undefined)
    : undefined;

  const eventId = template.mappings.eventId
    ? (getByPath(raw, template.mappings.eventId) as string | undefined)
    : undefined;

  let properties: Record<string, unknown>;
  if (template.mappings.properties) {
    const propObj = getByPath(raw, template.mappings.properties);
    properties =
      propObj && typeof propObj === 'object' && !Array.isArray(propObj)
        ? { ...(propObj as Record<string, unknown>) }
        : {};
  } else {
    // Collect all root keys not mapped to other fields
    const mappedPaths = new Set(
      Object.values(template.mappings).filter(
        (v): v is string => typeof v === 'string'
      )
    );
    properties = {};
    for (const key of Object.keys(raw)) {
      if (!mappedPaths.has(key)) {
        properties[key] = raw[key];
      }
    }
  }

  return {
    line: lineNumber,
    timestamp,
    level,
    message,
    messageTemplate,
    exception,
    eventId,
    properties,
    raw,
  };
}

export function parseLogLines(
  text: string,
  template: LogTemplate
): LogEntry[] {
  const lines = text.split('\n');
  const entries: LogEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      continue;
    }
    entries.push(parseLogLine(line, i, template));
  }
  return entries;
}

export function renderMessageTemplate(
  template: string,
  properties: Record<string, unknown>
): string {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    if (key in properties) {
      return String(properties[key]);
    }
    return match;
  });
}
