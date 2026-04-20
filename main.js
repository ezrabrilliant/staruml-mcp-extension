"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/http-server.ts
var import_node_http = __toESM(require("node:http"));
var ExtensionHttpServer = class {
  constructor(options) {
    this.server = null;
    this.port = options.port;
    this.host = options.host ?? "127.0.0.1";
    this.handlers = options.handlers;
    this.log = options.onLog ?? (() => {
    });
  }
  start() {
    return new Promise((resolve, reject) => {
      const server2 = import_node_http.default.createServer((req, res) => this.handleRequest(req, res));
      server2.once("error", reject);
      server2.listen(this.port, this.host, () => {
        this.log("info", `[staruml-mcp-ext] HTTP server listening on http://${this.host}:${this.port}`);
        this.server = server2;
        resolve();
      });
    });
  }
  stop() {
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }
  async handleRequest(req, res) {
    const url = req.url ?? "/";
    if (req.method === "GET" && url === "/") {
      this.sendJson(res, 200, {
        name: "staruml-mcp-extension",
        version: "0.1.0",
        build: "b3-factory-fix",
        endpoints: Object.keys(this.handlers).sort()
      });
      return;
    }
    if (req.method !== "POST") {
      this.sendJson(res, 405, { success: false, error: `Method ${req.method} not allowed` });
      return;
    }
    const slug = url.split("?")[0] ?? "";
    const handler = this.handlers[slug];
    if (!handler) {
      this.sendJson(res, 404, { success: false, error: `No handler for ${slug}` });
      return;
    }
    let body = {};
    try {
      const raw = await this.readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (err) {
      this.sendJson(res, 400, {
        success: false,
        error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`
      });
      return;
    }
    try {
      const result = await handler(body);
      this.sendJson(res, result.success ? 200 : 400, result);
    } catch (err) {
      this.log(
        "error",
        `[staruml-mcp-ext] handler ${slug} threw: ${err instanceof Error ? err.stack : String(err)}`
      );
      this.sendJson(res, 500, {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  readBody(req) {
    return new Promise((resolve, reject) => {
      let data = "";
      req.setEncoding("utf-8");
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
  }
  sendJson(res, status, body) {
    const text = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(text)
    });
    res.end(text);
  }
};

// src/handlers/commands.ts
function collectCommandIds() {
  const cmds = app.commands;
  if (Array.isArray(cmds.commandNames)) {
    return cmds.commandNames.filter((x) => typeof x === "string");
  }
  if (cmds.commandNames && typeof cmds.commandNames === "object") {
    return Object.keys(cmds.commandNames);
  }
  if (cmds.commands && typeof cmds.commands === "object") {
    return Object.keys(cmds.commands);
  }
  return [];
}
var getAllCommands = () => {
  try {
    const ids = collectCommandIds();
    return { success: true, data: { count: ids.length, ids: [...ids].sort() } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var executeCommand = async (body) => {
  const id = body.id;
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Required field 'id' (string) missing" };
  }
  const args = Array.isArray(body.args) ? body.args : [];
  const knownIds = collectCommandIds();
  if (!knownIds.includes(id)) {
    return { success: false, error: `Command not registered: ${id}` };
  }
  try {
    const result = await Promise.resolve(app.commands.execute(id, ...args));
    return { success: true, data: { id, result: serialize(result) } };
  } catch (err) {
    return {
      success: false,
      error: `Command ${id} threw: ${err instanceof Error ? err.message : String(err)}`
    };
  }
};
function serialize(value) {
  if (value === null || value === void 0) return null;
  if (typeof value === "function") return "[function]";
  if (typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return "[non-serializable]";
    }
  }
  return value;
}

// src/handlers/project.ts
var getProjectInfo = () => {
  try {
    const project = app.project.getProject();
    const filename = app.project.getFilename();
    return { success: true, data: { filename, project: summarize(project) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var saveProject = async (body) => {
  const filename = typeof body.filename === "string" ? body.filename : void 0;
  try {
    await app.project.save(filename);
    const saved = app.project.getFilename();
    return { success: true, data: { filename: saved } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var saveProjectAs = async (body) => {
  const filename = body.filename;
  if (typeof filename !== "string" || filename.length === 0) {
    return { success: false, error: "Required field 'filename' (string) missing" };
  }
  try {
    await app.project.saveAs(filename);
    return { success: true, data: { filename } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var newProject = () => {
  try {
    app.project.newProject();
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var openProject = async (body) => {
  const filename = body.filename;
  if (typeof filename !== "string" || filename.length === 0) {
    return { success: false, error: "Required field 'filename' (string) missing" };
  }
  try {
    await app.project.loadFromFile(filename);
    return { success: true, data: { filename } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
function summarize(project) {
  if (!project || typeof project !== "object") return project;
  const p = project;
  return {
    _id: p._id,
    name: p.name,
    ownedElementsCount: Array.isArray(p.ownedElements) ? p.ownedElements.length : 0
  };
}

// src/handlers/elements.ts
var getElementById = (body) => {
  const id = body.id;
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Required field 'id' (string) missing" };
  }
  const elem = app.repository.get(id);
  if (!elem) {
    return { success: false, error: `Element not found: ${id}` };
  }
  return { success: true, data: shallow(elem) };
};
var findElements = (body) => {
  const typeName = typeof body.type === "string" ? body.type : null;
  const nameFilter = typeof body.name === "string" ? body.name : null;
  try {
    const pool = typeName ? app.repository.getInstancesOf(typeName) : app.repository.findAll(() => true);
    const filtered = nameFilter ? pool.filter((e) => e.name === nameFilter) : pool;
    return { success: true, data: { count: filtered.length, elements: filtered.map(shallow) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var createElement = (body) => {
  const typeName = body.type;
  const parentId = body.parentId;
  const name = typeof body.name === "string" ? body.name : void 0;
  if (typeof typeName !== "string" || typeName.length === 0) {
    return { success: false, error: "Required field 'type' (string) missing, e.g. 'UMLClass'" };
  }
  if (typeof parentId !== "string" || parentId.length === 0) {
    return { success: false, error: "Required field 'parentId' (string) missing" };
  }
  const parent = app.repository.get(parentId);
  if (!parent) {
    return { success: false, error: `Parent element not found: ${parentId}` };
  }
  try {
    const elem = app.factory.createModel({
      id: typeName,
      parent,
      ...name !== void 0 && {
        modelInitializer: (m) => {
          m.name = name;
        }
      }
    });
    return { success: true, data: shallow(elem) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var updateElement = (body) => {
  const id = body.id;
  const field = body.field;
  const value = body.value;
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Required field 'id' missing" };
  }
  if (typeof field !== "string" || field.length === 0) {
    return { success: false, error: "Required field 'field' missing" };
  }
  const elem = app.repository.get(id);
  if (!elem) {
    return { success: false, error: `Element not found: ${id}` };
  }
  try {
    app.engine.setProperty(elem, field, value);
    return { success: true, data: shallow(elem) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var deleteElement = (body) => {
  const id = body.id;
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Required field 'id' missing" };
  }
  const elem = app.repository.get(id);
  if (!elem) {
    return { success: false, error: `Element not found: ${id}` };
  }
  try {
    app.engine.deleteElements([elem]);
    return { success: true, data: { deleted: id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
function shallow(elem) {
  const out = {};
  for (const [key, val] of Object.entries(elem)) {
    if (key.startsWith("_") && key !== "_id" && key !== "_parent") continue;
    if (val === null || val === void 0) {
      out[key] = val;
    } else if (Array.isArray(val)) {
      out[key] = val.map(
        (item) => item && typeof item === "object" && "_id" in item ? { _id: item._id, name: item.name } : item
      );
    } else if (typeof val === "object" && "_id" in val) {
      out[key] = { _id: val._id, name: val.name };
    } else {
      out[key] = val;
    }
  }
  return out;
}

// src/handlers/diagrams.ts
var createDiagram = (body) => {
  const typeName = body.type;
  const parentId = body.parentId;
  const name = typeof body.name === "string" ? body.name : void 0;
  if (typeof typeName !== "string" || typeName.length === 0) {
    return {
      success: false,
      error: "Required field 'type' (string) missing. Example: 'UMLClassDiagram', 'UMLUseCaseDiagram', 'UMLSequenceDiagram', 'UMLActivityDiagram', 'ERDDiagram'"
    };
  }
  if (typeof parentId !== "string" || parentId.length === 0) {
    return { success: false, error: "Required field 'parentId' (string) missing" };
  }
  const parent = app.repository.get(parentId);
  if (!parent) {
    return { success: false, error: `Parent element not found: ${parentId}` };
  }
  try {
    const diagram = app.factory.createDiagram({
      id: typeName,
      parent,
      ...name !== void 0 && {
        diagramInitializer: (d2) => {
          d2.name = name;
        }
      }
    });
    const d = diagram;
    return {
      success: true,
      data: {
        _id: d._id,
        name: d.name,
        type: diagram.constructor.name
      }
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var switchDiagram = (body) => {
  const id = body.id;
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Required field 'id' (diagram id) missing" };
  }
  const diagram = app.repository.get(id);
  if (!diagram) {
    return { success: false, error: `Diagram not found: ${id}` };
  }
  try {
    app.diagrams.setCurrentDiagram(diagram);
    return { success: true, data: { _id: id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
var closeDiagramById = (body) => {
  const id = body.id;
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Required field 'id' missing" };
  }
  const diagram = app.repository.get(id);
  if (!diagram) {
    return { success: false, error: `Diagram not found: ${id}` };
  }
  try {
    app.diagrams.closeDiagram(diagram);
    return { success: true, data: { closed: id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

// src/main.ts
var debugHandler = () => {
  const appKeys = Object.keys(app).sort();
  const commandsInfo = {
    type: typeof app.commands,
    keys: app.commands ? Object.keys(app.commands).sort() : null,
    proto: app.commands ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.commands)).sort() : null
  };
  const repositoryInfo = {
    type: typeof app.repository,
    keys: app.repository ? Object.keys(app.repository).sort() : null,
    proto: app.repository ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.repository)).sort() : null
  };
  const engineInfo = {
    type: typeof app.engine,
    keys: app.engine ? Object.keys(app.engine).sort() : null,
    proto: app.engine ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.engine)).sort() : null
  };
  const factoryInfo = {
    type: typeof app.factory,
    keys: app.factory ? Object.keys(app.factory).sort() : null,
    proto: app.factory ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.factory)).sort() : null
  };
  const diagramsInfo = {
    type: typeof app.diagrams,
    keys: app.diagrams ? Object.keys(app.diagrams).sort() : null,
    proto: app.diagrams ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.diagrams)).sort() : null
  };
  return {
    success: true,
    data: {
      app_keys: appKeys,
      commands: commandsInfo,
      repository: repositoryInfo,
      engine: engineInfo,
      factory: factoryInfo,
      diagrams: diagramsInfo
    }
  };
};
var EXT_PORT = 58322;
var LOG_PREFIX = "[staruml-mcp-ext]";
var handlers = {
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
  "/debug": debugHandler
};
var server = null;
async function init() {
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
      }
    });
    await server.start();
    app.commands.register(
      "mcp-ext:server-info",
      "MCP Ext: Server Info",
      showServerInfo
    );
  } catch (err) {
    console.error(
      `${LOG_PREFIX} Failed to start HTTP server on port ${EXT_PORT}:`,
      err instanceof Error ? err.message : err
    );
  }
}
function showServerInfo() {
  const endpoints = Object.keys(handlers).sort().join("\n  ");
  window.alert(
    `staruml-mcp-ext v0.1.0

Listening on http://localhost:${EXT_PORT}

Endpoints:
  ${endpoints}`
  );
}
exports.init = init;
//# sourceMappingURL=main.js.map
