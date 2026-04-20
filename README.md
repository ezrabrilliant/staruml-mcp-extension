# staruml-mcp-extension

[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![StarUML](https://img.shields.io/badge/StarUML-%E2%89%A5%207.0.0-blue.svg)](https://staruml.io)

StarUML extension that adds HTTP endpoints for **element CRUD, project lifecycle, and command execution** — so MCP clients (and any other HTTP-speaking tool) can drive StarUML programmatically.

Companion to [`staruml-mcp`](https://github.com/ezrabrilliant/staruml-mcp) — a Model Context Protocol server that lets AI agents (Claude Code, Cursor, VS Code, Codex) use these endpoints.

---

## Installation (for end users)

### Step 1 — Install StarUML v7+

Download from [staruml.io/download](https://staruml.io/download).

### Step 2 — Enable StarUML's API Server (one-time)

Edit `%APPDATA%\StarUML\settings.json` (Windows) or `~/Library/Application Support/StarUML/settings.json` (macOS) or `~/.config/StarUML/settings.json` (Linux):

```json
{
  "apiServer": true,
  "apiServerPort": 58321
}
```

Restart StarUML. Verify: `curl http://localhost:58321/` should return `Hello from StarUML API Server!`.

### Step 3 — Install this extension from GitHub URL

1. In StarUML, open **Tools → Extension Manager**
2. Click **"Install From Url..."** (bottom-left)
3. Paste:
   ```
   https://github.com/ezrabrilliant/staruml-mcp-extension
   ```
4. Click **Install**
5. Restart StarUML (or press `Ctrl+R`)

### Verify

```bash
curl http://localhost:58322/
```

Expected:

```json
{"name":"staruml-mcp-extension","version":"0.1.0","endpoints":["/close_diagram","/create_diagram", ...]}
```

That's it. No compile, no Node setup on this machine — the bundled `main.js` is in the repo and StarUML loads it directly.

### Optional Step 4 — Use from AI agents via `staruml-mcp`

If you want AI agents (Claude Code, Cursor, VS Code Copilot, Codex) to call these endpoints as MCP tools, install the companion MCP server:

```bash
# requires Node.js 20+
claude mcp add staruml -- npx -y staruml-mcp
```

Restart your AI agent. See [`staruml-mcp` README](https://github.com/ezrabrilliant/staruml-mcp#readme) for details.

---

## Why this exists

StarUML's built-in HTTP server on `localhost:58321` exposes **only 4 endpoints** (`/generate_diagram`, `/get_all_diagrams_info`, `/get_current_diagram_info`, `/get_diagram_image_by_id`). Many useful operations — creating specific UML elements, saving project files, executing built-in commands — are only reachable through the **in-process JavaScript Plugin API**, not HTTP.

This extension runs inside StarUML, uses the Plugin API, and exposes those operations as HTTP endpoints on **port 58322** (separate from the built-in 58321 so they don't conflict).

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

## Prerequisites

- StarUML v7.0.0+
- Port 58322 free on localhost

## Architecture

```
┌──────────────────────────────────────────────┐
│  StarUML Application (Electron)              │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Plugin API (app.engine, app.factory,   │ │  ← JavaScript in-process
│  │   app.repository, app.project,         │ │
│  │   app.diagrams, app.commands, ...)     │ │
│  └─────────────────┬──────────────────────┘ │
│                    │ direct call            │
│  ┌─────────────────▼──────────────────────┐ │
│  │ staruml-mcp-extension (this extension) │ │
│  │   HTTP server on 127.0.0.1:58322       │ │
│  │   15 endpoints wrapping Plugin API     │ │
│  └─────────────────┬──────────────────────┘ │
└────────────────────┼────────────────────────┘
                     │ HTTP
                     ▼
       [staruml-mcp / curl / any MCP client]
```

---

## For developers (contributing / building from source)

Only needed if you want to modify the extension. End users do **not** need to run these.

```bash
git clone https://github.com/ezrabrilliant/staruml-mcp-extension.git
cd staruml-mcp-extension
npm install
npm run build        # bundles src/main.ts → main.js
npm run install:local # copies main.js + package.json to StarUML user extensions folder
```

Then in StarUML press `Ctrl+R` (or `Debug → Reload`) to pick up changes.

### Scripts

```bash
npm run build       # one-shot bundle via esbuild
npm run dev         # bundle + watch
npm run typecheck   # tsc --noEmit
npm run install:local # copy to StarUML user extensions folder
```

Bundling uses `esbuild` because StarUML extensions cannot load external node_modules — everything must be in a single `main.js` file.

### Project structure

```
staruml-mcp-extension/
├── src/
│   ├── main.ts           # entry point (registers handlers, starts HTTP)
│   ├── http-server.ts    # HTTP server abstraction
│   ├── types.ts          # typing for StarUML's app.* globals
│   └── handlers/
│       ├── commands.ts   # execute_command, get_all_commands
│       ├── project.ts    # save, open, new, etc.
│       ├── elements.ts   # create, read, update, delete
│       └── diagrams.ts   # create_diagram, switch_diagram
├── scripts/
│   └── install-local.mjs # copy to StarUML user extensions folder
├── main.js               # bundled output (what StarUML loads)
├── package.json          # StarUML manifest + dev deps
├── esbuild.config.mjs
└── tsconfig.json
```

## License

[MIT](LICENSE) © Ezra Brilliant Konterliem
