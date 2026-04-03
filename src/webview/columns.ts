import { LogEntry } from '../templates/types';
import { escapeHtml, formatTimestamp, formatProperties } from './formatters';

export interface ColumnDef {
  id: string;
  label: string;
  /** CSS width value (px or fr) */
  width: string;
  /** Returns an escaped HTML string for the cell content */
  render(entry: LogEntry): string;
  className?: string;
}

export function getDefaultColumns(): ColumnDef[] {
  return [
    {
      id: 'line',
      label: '#',
      width: '50px',
      render: (entry) => String(entry.line + 1),
      className: 'col-line',
    },
    {
      id: 'timestamp',
      label: 'Timestamp',
      width: '100px',
      render: (entry) => escapeHtml(formatTimestamp(entry.timestamp)),
      className: 'col-timestamp',
    },
    {
      id: 'level',
      label: 'Level',
      width: '80px',
      render: (entry) =>
        `<span class="level-badge level-${entry.level.toLowerCase()}">${escapeHtml(entry.level)}</span>`,
      className: 'col-level',
    },
    {
      id: 'message',
      label: 'Message',
      width: '1fr',
      render: (entry) => escapeHtml(entry.message || entry.messageTemplate || ''),
      className: 'col-message',
    },
    {
      id: 'properties',
      label: 'Properties',
      width: '200px',
      render: (entry) => {
        const props = entry.properties;
        if (!props || Object.keys(props).length === 0) return '';
        return `<span class="props-preview">${escapeHtml(formatProperties(props, true))}</span>`;
      },
      className: 'col-properties',
    },
  ];
}
