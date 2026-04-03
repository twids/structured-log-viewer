## Plan: Structured Log Viewer VS Code Extension

A format-agnostic VS Code extension that renders newline-delimited JSON log files (.clef, .log, .txt) in a filterable, virtual-scrolled table. Ships with two built-in Serilog templates (CompactJsonFormatter/CLEF and JsonFormatter) but supports any JSON log format via user-defined templates in `settings.json`. Uses `CustomReadonlyEditorProvider` with a webview for the UI. Includes a raw-text toggle to switch between table and plain JSON views.

**Phases (7 phases)**

1. **Phase 1: Project Scaffolding & Template System**
    - **Objective:** Set up the extension project (package.json, tsconfig, esbuild, test infrastructure) and build the core format-agnostic template system with built-in Serilog templates, auto-detection, and the JSON line parser.
    - **Files/Functions to Create:**
        - `package.json` — extension manifest with customEditors (`.clef`, `.log`, `.txt` with priority "option"), commands, configuration schema for custom templates and page size
        - `tsconfig.json` — TypeScript config targeting ES2022/commonjs
        - `esbuild.mjs` — dual-entry build (extension host + webview)
        - `.vscode/launch.json` — Extension Development Host debug config
        - `src/templates/types.ts` — `LogTemplate`, `LogFieldMappings`, `LogEntry` interfaces, `normalizeLevel()`, `getByPath()` helpers
        - `src/templates/serilogCompact.ts` — CLEF template: detect `["@t"]`, maps `@t`→timestamp, `@l`→level (default "Information"), `@m`→message, `@mt`→messageTemplate, `@x`→exception, `@i`→eventId, no properties path (all non-@ root keys are properties)
        - `src/templates/serilogJson.ts` — Standard Serilog template: detect `["Timestamp","Level"]`, maps `Timestamp`→timestamp, `Level`→level, `RenderedMessage`→message, `MessageTemplate`→messageTemplate, `Exception`→exception, `Properties`→properties path
        - `src/templates/registry.ts` — `TemplateRegistry` class: `getBuiltIn()`, `getAll(userTemplates)`, `detectTemplate(sampleLines, userTemplates)` — tries each template's detect array against first valid JSON line
        - `src/parser.ts` — `parseLogLine(line, lineNumber, template)` → `LogEntry`, `parseLogLines(text, template)` → `LogEntry[]`, `renderMessageTemplate(template, properties)` for `{PropertyName}` substitution, handles malformed lines by setting `parseError: true` with `rawText`
    - **Tests to Write:**
        - `src/test/templates.test.ts` — normalizeLevel handles all aliases (Verbose/Debug/Info/Warning/Error/Fatal), normalizeLevel uses template defaultLevel when absent, normalizeLevel uses template levelMap, getByPath resolves nested paths, getByPath returns undefined for missing paths
        - `src/test/parser.test.ts` — parses CLEF line into correct LogEntry, parses SerilogJson line into correct LogEntry, handles malformed JSON gracefully, renders message template with property substitution, extracts top-level properties for CLEF (non-@ keys), extracts nested Properties for SerilogJson, handles lines with exception field
        - `src/test/registry.test.ts` — auto-detects CLEF from sample line, auto-detects SerilogJson from sample line, returns null for unknown format, merges user-defined templates into registry, user template with detect array auto-detects correctly
    - **Steps:**
        1. Write unit tests for `normalizeLevel`, `getByPath`, and template detection
        2. Run tests — verify they fail
        3. Implement `types.ts`, `serilogCompact.ts`, `serilogJson.ts`, `registry.ts`
        4. Write unit tests for `parseLogLine`, `parseLogLines`, `renderMessageTemplate`
        5. Run tests — verify they fail
        6. Implement `parser.ts`
        7. Run all tests — verify they pass
        8. Set up `package.json`, `tsconfig.json`, `esbuild.mjs`, `.vscode/launch.json`
        9. Verify the project builds with `npm run build`

2. **Phase 2: LogDocument & LogEditorProvider**
    - **Objective:** Implement the VS Code Custom Editor that opens log files, parses them with auto-detected (or user-selected) templates, and serves paged data to the webview via message passing.
    - **Files/Functions to Create:**
        - `src/logDocument.ts` — `LogDocument` class implementing `CustomDocument`: stores URI, template, all parsed entries, supports paged access (`getPage(pageIndex, pageSize)` → `LogEntry[]`), `dispose()`
        - `src/logEditorProvider.ts` — `LogEditorProvider` implementing `CustomReadonlyEditorProvider`: `openCustomDocument()` reads file text, auto-detects template via registry, parses all lines; `resolveCustomEditor()` creates webview with proper CSP (nonce-based), loads bundled JS/CSS via `asWebviewUri()`, sends initial data page + template info, handles incoming messages (page requests, template change, filter requests)
        - `src/extension.ts` — `activate()` registers `LogEditorProvider` for viewType `structuredLogViewer.logTable`, registers "Open with Structured Log Viewer" command
        - `src/messages.ts` — Shared message type definitions used by both extension host and webview: `LoadDataMessage`, `RequestPageMessage`, `ChangeTemplateMessage`, `TemplateListMessage`, `FilterMessage`, `ToggleRawViewMessage`
    - **Tests to Write:**
        - `src/test/logDocument.test.ts` — constructs from parsed entries, getPage returns correct slice, getPage handles out-of-bounds, handles empty file
        - `src/test/messages.test.ts` — message types type-check correctly (compile-time test)
    - **Steps:**
        1. Write tests for LogDocument paging logic
        2. Run tests — verify they fail
        3. Implement `logDocument.ts` and `messages.ts`
        4. Run tests — verify they pass
        5. Implement `logEditorProvider.ts` and `extension.ts` (integration code, tested via Extension Development Host)
        6. Verify the extension activates and opens a sample .clef file showing a blank webview

3. **Phase 3: Webview HTML Shell & Base Styles**
    - **Objective:** Build the webview HTML skeleton with VS Code theme-aware CSS, the message receiving/sending infrastructure, and placeholder containers for the toolbar and table.
    - **Files/Functions to Create:**
        - `src/webview/index.html` — HTML shell: CSP meta tag with nonce placeholder, div containers for `#toolbar`, `#table-container`, `#status-bar`, `#raw-view` (hidden by default), script/style tags with nonce
        - `src/webview/main.ts` — Entry point: calls `acquireVsCodeApi()`, listens for messages from extension, dispatches to UI modules, sends page requests
        - `src/webview/state.ts` — `ViewerState` class: holds current entries, current page, active filters, selected template, view mode (table/raw), emits change events
        - `src/webview/styles.css` — Theme-aware styles using `--vscode-editor-background`, `--vscode-editor-foreground`, `--vscode-list-hoverBackground`, `--vscode-input-background`, `--vscode-input-border`; level color classes: `.level-verbose` (grey), `.level-debug` (muted), `.level-information` (default/blue), `.level-warning` (yellow via `--vscode-problemsWarningIcon-foreground`), `.level-error` (red via `--vscode-editorError-foreground`), `.level-fatal` (bold red background); table layout with CSS grid; scrollbar styling
    - **Tests to Write:**
        - `src/test/webview/state.test.ts` — state initializes empty, state updates entries on LoadData, state tracks current page, state emits change events
    - **Steps:**
        1. Write tests for ViewerState
        2. Run tests — verify they fail
        3. Implement `state.ts`, `main.ts`
        4. Run tests — verify they pass
        5. Create `index.html` and `styles.css`
        6. Wire up the webview HTML in `logEditorProvider.ts` to use the new files
        7. Verify extension opens a log file and shows the styled empty shell

4. **Phase 4: Virtual Scroll Table**
    - **Objective:** Implement the core table component with virtual scrolling that renders only visible rows (~50-100 DOM nodes for 100K+ entries). Supports column headers (Line, Timestamp, Level, Message), expandable rows for exceptions/properties.
    - **Files/Functions to Create:**
        - `src/webview/table.ts` — `VirtualTable` class: constructor takes container element and column definitions; `setData(entries)` stores data and recalculates total height; `onScroll()` computes visible range (`startIndex`, `endIndex`) from scroll position and row height (fixed 28px default); renders rows as absolutely-positioned divs; `expandRow(index)` toggles an expansion panel showing exception text and properties as formatted JSON; `collapseRow(index)`; column click for sorting
        - `src/webview/columns.ts` — Column definitions: `LineColumn`, `TimestampColumn` (formatted), `LevelColumn` (with color badge), `MessageColumn` (flex-grow), `PropertiesColumn` (truncated preview, click to expand)
        - `src/webview/formatters.ts` — `formatTimestamp(iso)` for readable display, `formatProperties(props)` for truncated/expanded views, `formatException(text)` for stack trace rendering with monospace
    - **Tests to Write:**
        - `src/test/webview/table.test.ts` — calculates correct visible range for given scroll position, renders correct number of rows for viewport size, handles empty dataset, handles dataset smaller than viewport, expand/collapse toggles work
        - `src/test/webview/formatters.test.ts` — formatTimestamp produces readable output, formatProperties truncates long values, formatException preserves newlines
    - **Steps:**
        1. Write tests for formatters and visible range calculation
        2. Run tests — verify they fail
        3. Implement `formatters.ts`, `columns.ts`, `table.ts`
        4. Run tests — verify they pass
        5. Integrate VirtualTable into `main.ts` — render table on LoadData message
        6. Verify with a real log file: table renders, scrolling is smooth, rows expand

5. **Phase 5: Toolbar — Filters, Search, Template Selector & Raw Toggle**
    - **Objective:** Add the interactive toolbar with level filter buttons, text search, template selector dropdown, and a raw JSON text toggle.
    - **Files/Functions to Create:**
        - `src/webview/toolbar.ts` — `Toolbar` class: renders level toggle buttons (one per level, colored), text search input with 200ms debounce, template selector dropdown (populated from extension's template list message), raw/table view toggle button; emits `FilterChangedEvent` and `TemplateChangedEvent` and `ViewModeChangedEvent`
        - `src/webview/filters.ts` — `FilterEngine` class: `apply(entries, activeLevels, searchText)` → returns filtered `LogEntry[]` matching active levels AND containing search text in message/exception/properties; case-insensitive search
        - `src/webview/rawView.ts` — `RawView` class: renders the raw JSON text in a scrollable pre/code block, toggles visibility with the table container
    - **Tests to Write:**
        - `src/test/webview/filters.test.ts` — filters by single level, filters by multiple levels, text search matches message, text search matches property values, text search matches exception, combined level+text filter, empty result returns empty array, no filters returns all entries
        - `src/test/webview/toolbar.test.ts` — emits correct events on level toggle, emits debounced search event, emits template change event
    - **Steps:**
        1. Write tests for FilterEngine
        2. Run tests — verify they fail
        3. Implement `filters.ts`
        4. Run tests — verify they pass
        5. Implement `toolbar.ts` and `rawView.ts`
        6. Wire toolbar events into `main.ts`: filter changes → FilterEngine → VirtualTable.setData(), template change → postMessage to extension → re-parse → LoadData, raw toggle → show/hide table vs raw view
        7. Verify: level buttons filter rows, search narrows results, template dropdown switches format, raw toggle shows JSON text

6. **Phase 6: Large File Paging, File Watching & Status Bar**
    - **Objective:** Handle large log files via chunked/paged reading, add file system watcher for live-tail, and add a status bar showing entry count, format name, and loading state.
    - **Files/Functions to Modify/Create:**
        - Modify `src/logDocument.ts` — implement chunked file reading: read file line by line using stream or split by newlines, parse in configurable page-size chunks (default 5000), track total line count and byte offsets for incremental reads
        - Modify `src/logEditorProvider.ts` — add `vscode.workspace.createFileSystemWatcher()` for the document URI, on change: read only new bytes appended since last read, parse new lines, send incremental `AppendDataMessage` to webview; handle watcher disposal
        - `src/webview/statusbar.ts` — `StatusBar` class: renders at bottom of webview, shows "Showing X of Y entries", detected template name, "Loading..." indicator during paging, "Live" indicator when file watcher is active
        - Modify `src/webview/main.ts` — handle `AppendDataMessage` (add new entries to state, optionally auto-scroll to bottom), handle paged `LoadDataMessage` (append pages), "Load More" button or infinite scroll for paged data
        - Modify `src/messages.ts` — add `AppendDataMessage`, `LoadMoreRequestMessage`
    - **Tests to Write:**
        - `src/test/logDocument.test.ts` — chunked reading returns pages in order, incremental read returns only new lines, handles file with no newline at end
        - `src/test/webview/statusbar.test.ts` — displays correct entry count, shows template name, shows loading state
    - **Steps:**
        1. Write tests for chunked reading and incremental append in LogDocument
        2. Run tests — verify they fail
        3. Implement chunked reading and file watcher logic
        4. Run tests — verify they pass
        5. Implement StatusBar webview component
        6. Wire paging and live-tail into the full message flow
        7. Verify with a large sample file: loads in chunks, status bar updates, appending new lines appears

7. **Phase 7: Polish, Samples & Build Verification**
    - **Objective:** Final polish — sample log files, .vscodeignore, README, keyboard navigation, and full build verification.
    - **Files/Functions to Create:**
        - `samples/sample.clef` — ~50 lines of realistic CLEF log entries at various levels including an exception
        - `samples/sample-verbose.log` — ~50 lines of Serilog JsonFormatter entries
        - `.vscodeignore` — exclude `src/`, `samples/`, `node_modules/`, `.git/`, `tsconfig.json`, `esbuild.mjs`, `*.test.*`
        - `README.md` — features, usage, custom template configuration examples, supported formats
        - Modify `src/webview/table.ts` — add keyboard navigation: arrow keys to move selection, Enter to expand/collapse, Escape to collapse
    - **Tests to Write:**
        - `src/test/samples.test.ts` — parse sample.clef with CLEF template produces expected entry count, parse sample-verbose.log with SerilogJson template produces expected entry count
    - **Steps:**
        1. Create sample log files
        2. Write tests that parse sample files
        3. Run tests — verify they pass
        4. Create `.vscodeignore` and `README.md`
        5. Add keyboard navigation to table
        6. Run full build (`npm run build`) and verify clean
        7. Run all tests and verify all pass

**Open Questions**
1. Should we add column reordering/resizing in v1 or defer? Recommend deferring.
2. Any specific keyboard shortcuts you want beyond arrow-key navigation?
3. Want a "copy row as JSON" context menu action on right-click?
