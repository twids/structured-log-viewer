import { LogTemplate } from './types';
import { serilogCompactTemplate } from './serilogCompact';
import { serilogJsonTemplate } from './serilogJson';

const builtInTemplates: LogTemplate[] = [
  serilogCompactTemplate,
  serilogJsonTemplate,
];

export function getBuiltInTemplates(): LogTemplate[] {
  return [...builtInTemplates];
}

export function getAllTemplates(userTemplates?: LogTemplate[]): LogTemplate[] {
  return [...builtInTemplates, ...(userTemplates ?? [])];
}

export function detectTemplate(
  sampleLines: string[],
  userTemplates?: LogTemplate[]
): LogTemplate | null {
  const templates = getAllTemplates(userTemplates);

  for (const line of sampleLines) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      continue;
    }

    for (const template of templates) {
      if (!template.detect || template.detect.length === 0) {
        continue;
      }
      const allPresent = template.detect.every(
        (field) => field in parsed
      );
      if (allPresent) {
        return template;
      }
    }
  }

  return null;
}
