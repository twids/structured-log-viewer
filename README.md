# Structured Log Viewer

A VS Code extension for viewing structured JSON log files in a filterable, searchable, virtual-scrolled table. Ships with built-in support for Serilog Compact (CLEF) and Serilog JSON formats — extensible with custom templates for any JSON log format.

## Features

- **Auto-detection** — Automatically identifies log format from file content
- **Built-in Serilog templates** — Serilog Compact (CLEF) and Serilog JSON supported out of the box
- **Virtual scrolling** — Handles large log files smoothly with virtualized rendering
- **Level filtering** — Toggle visibility of Verbose, Debug, Information, Warning, Error, and Fatal entries
- **Text search** — Filter entries by searching across message text
- **Expandable rows** — Click a row to reveal full properties and exception stack traces
- **Raw view toggle** — Switch between table view and raw JSON text
- **Live-tail** — Automatically picks up new entries appended to the file
- **Keyboard navigation** — Navigate rows with arrow keys, expand/collapse with Enter/Escape
- **Custom templates** — Define your own field mappings for any JSON log format

## Installation

### From the VS Code Marketplace

Search for **"Structured Log Viewer"** in the Extensions view (`Ctrl+Shift+X`) and click **Install**.

### From VSIX (local install)

1. Download the latest `.vsix` from the [Releases](https://github.com/twids/structured-log-viewer/releases) page
2. In VS Code: `Ctrl+Shift+P` → **"Extensions: Install from VSIX..."** → select the file
3. Reload VS Code

### From Source

```bash
git clone https://github.com/twids/structured-log-viewer.git
cd structured-log-viewer
npm install
npm run build
npx @vscode/vsce package
code --install-extension structured-log-viewer-*.vsix
```

## Usage

1. Open a `.clef`, `.log`, or `.txt` file in VS Code
2. Right-click the editor tab → **"Open With..."** → **"Structured Log Viewer"**
3. The log file is parsed and displayed in a sortable, filterable table

Alternatively, use the command palette: `Open with Structured Log Viewer`

## Custom Templates

Define custom log format templates in your `settings.json` to support any JSON-based log format:

```json
{
  "structuredLogViewer.customTemplates": [
    {
      "name": "Winston JSON",
      "detect": ["timestamp", "level", "message"],
      "mappings": {
        "timestamp": "timestamp",
        "level": "level",
        "message": "message",
        "exception": "stack",
        "properties": "metadata"
      },
      "levelMap": {
        "warn": "Warning",
        "silly": "Verbose"
      }
    }
  ]
}
```

Each template requires:
- **`name`** — Display name in the format selector
- **`detect`** — Array of field names for auto-detection (all must be present)
- **`mappings`** — Maps semantic columns to JSON field paths (dot-notation supported)

Optional fields:
- **`levelMap`** — Maps non-standard level values to normalized names
- **`defaultLevel`** — Level to assume when the level field is absent (default: `"Information"`)

## Built-in Templates

| Template | Format | Detection Fields | Level Source |
|---|---|---|---|
| Serilog Compact (CLEF) | One JSON object per line with `@` prefixed fields | `@t` | `@l` (defaults to Information) |
| Serilog JSON | One JSON object per line with full field names | `Timestamp`, `Level` | `Level` |

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `↑` / `↓` | Move selection between rows |
| `Enter` | Toggle expand/collapse on selected row |
| `Escape` | Collapse selected row if expanded |

## Field Mapping Reference

| Semantic Column | Description |
|---|---|
| `timestamp` | ISO 8601 timestamp |
| `level` | Log level (Verbose, Debug, Information, Warning, Error, Fatal) |
| `message` | Rendered log message |
| `messageTemplate` | Original message template with placeholders |
| `exception` | Exception / stack trace text |
| `eventId` | Event type identifier |
| `properties` | Path to a nested properties object (if omitted, all unmapped root keys are collected) |

## License

MIT
