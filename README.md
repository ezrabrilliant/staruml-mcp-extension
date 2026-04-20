# staruml-mcp-extension

[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![StarUML](https://img.shields.io/badge/StarUML-%E2%89%A5%207.0.0-blue.svg)](https://staruml.io)

StarUML extension that extends the built-in HTTP API with endpoints for **element CRUD, project lifecycle, and command execution** — so MCP clients (and any other HTTP-speaking tool) can drive StarUML programmatically.

Companion to [`staruml-mcp`](https://github.com/ezrabrilliant/staruml-mcp) which is a Model Context Protocol server that connects AI agents to these endpoints.

## Why

StarUML's built-in HTTP server on `localhost:58321` exposes **only 4 endpoints** (generate_diagram via Mermaid, get_all_diagrams_info, get_current_diagram_info, get_diagram_image_by_id). Many useful operations — creating specific UML elements, saving project files, executing built-in commands — are only reachable through the **in-process JavaScript Plugin API**, not HTTP.

This extension runs inside StarUML, uses the Plugin API, and exposes the operations as HTTP endpoints on **port 58322** (separate from the built-in 58321 so they don't conflict).

## Endpoints (v0.1.0)

All POST + JSON body, response shape `{success: boolean, data?: any, error?: string}`.

### Commands (universal)
- `POST /get_all_commands` — list all registered command IDs (discover what StarUML can do)
- `POST /execute_command` — `{id, args?}` execute any built-in or registered command

### Project lifecycle
- `POST /get_project_info` — current project metadata + filename
- `POST /save_project` — `{filename?}` save to current path (or new path if given)
- `POST /save_project_as` — `{filename}` save to specified path
- `POST /new_project` — create empty project
- `POST /open_project` — `{filename}` load project from file

### Element CRUD
- `POST /get_element_by_id` — `{id}` retrieve element by ID
- `POST /find_elements` — `{type?, name?}` filter elements by type and/or name
- `POST /create_element` — `{type, parentId, name?}` create a model element (e.g. UMLClass, UMLPackage)
- `POST /update_element` — `{id, field, value}` update a property
- `POST /delete_element` — `{id}` delete an element

### Diagram management
- `POST /create_diagram` — `{type, parentId, name?}` create typed UML diagram (UMLClassDiagram, UMLUseCaseDiagram, etc.)
- `POST /switch_diagram` — `{id}` open/focus a diagram
- `POST /close_diagram` — `{id}` close a diagram tab

## Installation

### From source (development)

```bash
git clone https://github.com/ezrabrilliant/staruml-mcp-extension.git
cd staruml-mcp-extension
npm install
npm run build
npm run install:local
```

Then in StarUML, press `Ctrl+R` (or `Debug → Reload`) to load the extension.

### From GitHub URL (for end users)

1. In StarUML, open `Tools → Extension Manager`
2. Click **Install from URL**
3. Enter `https://github.com/ezrabrilliant/staruml-mcp-extension`
4. Restart or reload StarUML

### Verify

```bash
curl http://localhost:58322/
# → {"name":"staruml-mcp-extension","version":"0.1.0","endpoints":[...]}
```

## Prerequisites

- StarUML v7.0.0+
- Port 58322 free on localhost

## Development

```bash
npm install         # install deps
npm run build       # bundle src → dist/main.js
npm run dev         # bundle + watch
npm run typecheck   # tsc --noEmit
npm run install:local   # copy dist → StarUML user extensions folder
```

Bundling uses `esbuild` because StarUML extensions can't load external node_modules — everything must be in one file.

## Architecture

```
┌──────────────────────────────────────────┐
│  StarUML Application (Electron)          │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Plugin API (app.engine, app.factory,│ │  ← JavaScript in-process
│  │   app.repository, app.project,     │ │
│  │   app.diagrams, app.commands, ...) │ │
│  └─────────────────┬──────────────────┘ │
│                    │ direct call        │
│  ┌─────────────────▼──────────────────┐ │
│  │ staruml-mcp-extension (THIS extension)   │ │
│  │   HTTP server on 127.0.0.1:58322   │ │
│  │   15 endpoints wrapping Plugin API │ │
│  └─────────────────┬──────────────────┘ │
└────────────────────┼────────────────────┘
                     │ HTTP
                     ▼
       [staruml-mcp / curl / any MCP client]
```

## License

[MIT](LICENSE) © Ezra Brilliant Konterliem
