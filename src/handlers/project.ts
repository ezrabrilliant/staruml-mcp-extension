import type { Handler } from "../http-server.js";

export const getProjectInfo: Handler = () => {
  try {
    const project = app.project.getProject();
    const filename = app.project.getFilename();
    return { success: true, data: { filename, project: summarize(project) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const saveProject: Handler = async (body) => {
  const filename = typeof body.filename === "string" ? body.filename : undefined;
  try {
    await app.project.save(filename);
    const saved = app.project.getFilename();
    return { success: true, data: { filename: saved } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const saveProjectAs: Handler = async (body) => {
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

export const newProject: Handler = () => {
  try {
    app.project.newProject();
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const openProject: Handler = async (body) => {
  const filename = body.filename;
  if (typeof filename !== "string" || filename.length === 0) {
    return { success: false, error: "Required field 'filename' (string) missing" };
  }
  try {
    // API docs: ProjectManager.load(fullPath) returns $.Promise.
    const project = app.project as unknown as { load: (fp: string) => unknown };
    await Promise.resolve(project.load(filename));
    return { success: true, data: { filename } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

function summarize(project: unknown): unknown {
  if (!project || typeof project !== "object") return project;
  const p = project as Record<string, unknown>;
  return {
    _id: p._id,
    name: p.name,
    ownedElementsCount: Array.isArray(p.ownedElements) ? p.ownedElements.length : 0,
  };
}
