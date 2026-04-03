/**
 * Pure formatting functions for log entry field display.
 * All functions are side-effect free and safe to use in virtual scroll innerHTML rendering.
 */

/**
 * Format an ISO timestamp to HH:mm:ss.SSS (UTC time).
 * Returns the original string if it cannot be parsed.
 */
export function formatTimestamp(iso: string): string {
  if (!iso) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/**
 * Format a properties object for display.
 * When truncate=true (default), shows up to 3 key=value pairs followed by "..." if more exist.
 * When truncate=false, returns full JSON.stringify output.
 */
export function formatProperties(
  props: Record<string, unknown>,
  truncate = true,
): string {
  const keys = Object.keys(props);
  if (keys.length === 0) return '';

  if (truncate) {
    const limit = 3;
    const shown = keys.slice(0, limit);
    const pairs = shown.map((k) => `${k}=${String(props[k])}`);
    if (keys.length > limit) {
      pairs.push('...');
    }
    return pairs.join(' ');
  }

  return JSON.stringify(props, null, 2);
}

/**
 * Returns the exception text as-is for rendering in a monospace pre block.
 */
export function formatException(text: string): string {
  return text;
}

/**
 * Escape HTML special characters for safe insertion via innerHTML.
 * Escapes &, <, >, and " in that order to avoid double-encoding.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
