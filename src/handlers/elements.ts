import type { Handler } from "../http-server.js";

export const getElementById: Handler = (body) => {
  const id = body.id;
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Required field 'id' (string) missing" };
  }
  const elem = app.repository.get(id);
  if (!elem) {
    return { success: false, error: `Element not found: ${id}` };
  }
  return { success: true, data: shallow(elem as Record<string, unknown>) };
};

export const findElements: Handler = (body) => {
  const typeName = typeof body.type === "string" ? body.type : null;
  const nameFilter = typeof body.name === "string" ? body.name : null;

  try {
    const all = app.repository.findAll((elem: Record<string, unknown>) => {
      if (typeName && !isOfType(elem, typeName)) return false;
      if (nameFilter && elem.name !== nameFilter) return false;
      return true;
    });
    return { success: true, data: { count: all.length, elements: all.map(shallow) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const createElement: Handler = (body) => {
  const typeName = body.type;
  const parentId = body.parentId;
  const name = typeof body.name === "string" ? body.name : undefined;

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
    const options: Record<string, unknown> = {
      id: typeName,
      parent,
    };
    if (name !== undefined) {
      options.modelInitializer = (m: Record<string, unknown>) => {
        m.name = name;
      };
    }
    const elem = app.engine.createModel(options);
    return { success: true, data: shallow(elem as Record<string, unknown>) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const updateElement: Handler = (body) => {
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
    return { success: true, data: shallow(elem as Record<string, unknown>) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const deleteElement: Handler = (body) => {
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

function shallow(elem: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(elem)) {
    if (key.startsWith("_") && key !== "_id" && key !== "_parent") continue;
    if (val === null || val === undefined) {
      out[key] = val;
    } else if (Array.isArray(val)) {
      out[key] = val.map((item) =>
        item && typeof item === "object" && "_id" in item
          ? { _id: (item as { _id: string })._id, name: (item as { name?: string }).name }
          : item,
      );
    } else if (typeof val === "object" && "_id" in val) {
      out[key] = { _id: (val as { _id: string })._id, name: (val as { name?: string }).name };
    } else {
      out[key] = val;
    }
  }
  return out;
}

function isOfType(elem: Record<string, unknown>, typeName: string): boolean {
  const ctor = elem.constructor as { name?: string } | undefined;
  return ctor?.name === typeName;
}
