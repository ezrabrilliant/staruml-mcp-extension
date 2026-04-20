import { ExtensionHttpServer, type Handler } from "./http-server.js";
import { executeCommand, getAllCommands } from "./handlers/commands.js";
import {
  getProjectInfo,
  saveProject,
  saveProjectAs,
  newProject,
  openProject,
} from "./handlers/project.js";
import {
  getElementById,
  findElements,
  createElement,
  updateElement,
  deleteElement,
} from "./handlers/elements.js";
import {
  createDiagram,
  switchDiagram,
  closeDiagramById,
} from "./handlers/diagrams.js";
import "./types.js";

// Debug handler — introspect `app` namespace so we can learn the real API shape
const debugHandler: Handler = () => {
  const appKeys = Object.keys(app).sort();
  const commandsInfo: Record<string, unknown> = {
    type: typeof app.commands,
    keys: app.commands ? Object.keys(app.commands).sort() : null,
    proto: app.commands ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.commands)).sort() : null,
  };
  const repositoryInfo: Record<string, unknown> = {
    type: typeof app.repository,
    keys: app.repository ? Object.keys(app.repository).sort() : null,
    proto: app.repository ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.repository)).sort() : null,
  };
  const engineInfo: Record<string, unknown> = {
    type: typeof app.engine,
    keys: app.engine ? Object.keys(app.engine).sort() : null,
    proto: app.engine ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.engine)).sort() : null,
  };
  const factoryInfo: Record<string, unknown> = {
    type: typeof app.factory,
    keys: app.factory ? Object.keys(app.factory).sort() : null,
    proto: app.factory ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.factory)).sort() : null,
  };
  const diagramsInfo: Record<string, unknown> = {
    type: typeof app.diagrams,
    keys: app.diagrams ? Object.keys(app.diagrams).sort() : null,
    proto: app.diagrams ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.diagrams)).sort() : null,
  };
  return {
    success: true,
    data: {
      app_keys: appKeys,
      commands: commandsInfo,
      repository: repositoryInfo,
      engine: engineInfo,
      factory: factoryInfo,
      diagrams: diagramsInfo,
    },
  };
};

const EXT_PORT = 58322;
const LOG_PREFIX = "[staruml-mcp-ext]";

const handlers: Record<string, Handler> = {
  // Commands
  "/get_all_commands": getAllCommands,
  "/execute_command": executeCommand,

  // Project lifecycle
  "/get_project_info": getProjectInfo,
  "/save_project": saveProject,
  "/save_project_as": saveProjectAs,
  "/new_project": newProject,
  "/open_project": openProject,

  // Element CRUD
  "/get_element_by_id": getElementById,
  "/find_elements": findElements,
  "/create_element": createElement,
  "/update_element": updateElement,
  "/delete_element": deleteElement,

  // Diagram management
  "/create_diagram": createDiagram,
  "/switch_diagram": switchDiagram,
  "/close_diagram": closeDiagramById,

  // Debug
  "/debug": debugHandler,
};

let server: ExtensionHttpServer | null = null;

async function init(): Promise<void> {
  try {
    server = new ExtensionHttpServer({
      port: EXT_PORT,
      handlers,
      onLog: (level, msg) => {
        if (level === "error") {
          console.error(msg);
        } else {
          console.log(msg);
        }
      },
    });
    await server.start();

    // Register a command so user can stop the server via Command Palette if needed
    app.commands.register(
      "mcp-ext:server-info",
      "MCP Ext: Server Info",
      showServerInfo,
    );
  } catch (err) {
    console.error(
      `${LOG_PREFIX} Failed to start HTTP server on port ${EXT_PORT}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function showServerInfo(): void {
  const endpoints = Object.keys(handlers).sort().join("\n  ");
  window.alert(
    `staruml-mcp-ext v0.1.0\n\nListening on http://localhost:${EXT_PORT}\n\nEndpoints:\n  ${endpoints}`,
  );
}

exports.init = init;
