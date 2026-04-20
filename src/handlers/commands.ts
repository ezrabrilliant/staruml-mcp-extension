import type { Handler, HandlerResult } from "../http-server.js";

function collectCommandIds(): string[] {
  const cmds = app.commands as unknown as {
    commandNames?: unknown;
    commands?: Record<string, unknown>;
  };
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

export const getAllCommands: Handler = () => {
  try {
    const ids = collectCommandIds();
    return { success: true, data: { count: ids.length, ids: [...ids].sort() } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const executeCommand: Handler = async (body): Promise<HandlerResult> => {
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
      error: `Command ${id} threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
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
