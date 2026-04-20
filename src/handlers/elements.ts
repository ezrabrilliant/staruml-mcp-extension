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
    // Prefer getInstancesOf when type is given (faster + exact)
    const pool = typeName
      ? (app.repository.getInstancesOf(typeName) as Record<string, unknown>[])
      : app.repository.findAll(() => true);

    const filtered = nameFilter
      ? pool.filter((e) => e.name === nameFilter)
      : pool;

    return { success: true, data: { count: filtered.length, elements: filtered.map(shallow) } };
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
    const elem = app.factory.createModel({
      id: typeName,
      parent,
      ...(name !== undefined && {
        modelInitializer: (m) => {
          m.name = name;
        },
      }),
    });
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
    const targets = collectDeletionTargets(elem as Record<string, unknown>);
    (app.engine as unknown as { deleteElements: (arr: unknown[]) => void }).deleteElements(targets);
    return { success: true, data: { deleted: id, deleted_count: targets.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

/**
 * Collects the element, all its nested ownedElements, and all Views referring
 * to any of them. StarUML's Engine.deleteElements requires the caller to
 * pass every related object explicitly — otherwise orphans remain.
 */
function collectDeletionTargets(root: Record<string, unknown>): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  const stack: Record<string, unknown>[] = [root];

  while (stack.length) {
    const e = stack.pop()!;
    const id = typeof e._id === "string" ? e._id : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(e);

    const owned = Array.isArray(e.ownedElements) ? (e.ownedElements as Record<string, unknown>[]) : [];
    for (const child of owned) stack.push(child);

    const views = Array.isArray(e.ownedViews) ? (e.ownedViews as Record<string, unknown>[]) : [];
    for (const v of views) stack.push(v);

    try {
      const repo = app.repository as unknown as {
        getViewsOf?: (el: Record<string, unknown>) => Record<string, unknown>[];
        getRefsTo?: (el: Record<string, unknown>) => Record<string, unknown>[];
      };
      if (repo.getViewsOf) for (const v of repo.getViewsOf(e) ?? []) stack.push(v);
      if (repo.getRefsTo) for (const r of repo.getRefsTo(e) ?? []) stack.push(r);
    } catch {
      /* ignore */
    }
  }

  return out;
}

/**
 * Create a model element AND its visual View on a diagram in one call.
 * Wraps app.factory.createModelAndView.
 */
export const createElementWithView: Handler = (body) => {
  const typeName = body.type;
  const parentId = body.parentId;
  const diagramId = body.diagramId;
  const name = typeof body.name === "string" ? body.name : undefined;
  const x1 = typeof body.x === "number" ? body.x : 100;
  const y1 = typeof body.y === "number" ? body.y : 100;
  const x2 = typeof body.x2 === "number" ? body.x2 : x1 + 100;
  const y2 = typeof body.y2 === "number" ? body.y2 : y1 + 50;

  if (typeof typeName !== "string" || typeName.length === 0) {
    return { success: false, error: "Required field 'type' missing (e.g. 'UMLUseCase', 'UMLActor', 'UMLAction')" };
  }
  if (typeof parentId !== "string" || parentId.length === 0) {
    return { success: false, error: "Required field 'parentId' missing" };
  }
  if (typeof diagramId !== "string" || diagramId.length === 0) {
    return { success: false, error: "Required field 'diagramId' missing" };
  }

  const parent = app.repository.get(parentId);
  if (!parent) return { success: false, error: `Parent not found: ${parentId}` };
  const diagram = app.repository.get(diagramId);
  if (!diagram) return { success: false, error: `Diagram not found: ${diagramId}` };

  try {
    const factory = app.factory as unknown as {
      createModelAndView: (o: Record<string, unknown>) => Record<string, unknown>;
    };
    const options: Record<string, unknown> = {
      id: typeName,
      parent,
      diagram,
      x1,
      y1,
      x2,
      y2,
    };
    if (name !== undefined) {
      options.modelInitializer = (m: Record<string, unknown>) => {
        m.name = name;
      };
    }
    const view = factory.createModelAndView(options);
    const model = view.model as Record<string, unknown> | undefined;
    return {
      success: true,
      data: {
        view: { _id: view._id },
        model: model ? { _id: model._id, name: model.name } : null,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

/**
 * Connect two existing visual Views with a typed edge (UMLAssociation,
 * UMLControlFlow, etc.). Creates both the model relationship and the edge
 * view in one call via app.factory.createModelAndView.
 */
export const createEdgeWithView: Handler = (body) => {
  const typeName = body.type;
  const parentId = body.parentId;
  const diagramId = body.diagramId;
  const tailViewId = body.tailViewId;
  const headViewId = body.headViewId;
  const name = typeof body.name === "string" ? body.name : undefined;

  if (typeof typeName !== "string" || typeName.length === 0) {
    return { success: false, error: "Required field 'type' missing (e.g. 'UMLAssociation', 'UMLControlFlow')" };
  }
  if (typeof parentId !== "string" || parentId.length === 0) {
    return { success: false, error: "Required field 'parentId' missing" };
  }
  if (typeof diagramId !== "string" || diagramId.length === 0) {
    return { success: false, error: "Required field 'diagramId' missing" };
  }
  if (typeof tailViewId !== "string" || typeof headViewId !== "string") {
    return { success: false, error: "Required fields 'tailViewId' and 'headViewId' missing" };
  }

  const parent = app.repository.get(parentId);
  const diagram = app.repository.get(diagramId);
  const tailView = app.repository.get(tailViewId);
  const headView = app.repository.get(headViewId);
  if (!parent) return { success: false, error: `Parent not found: ${parentId}` };
  if (!diagram) return { success: false, error: `Diagram not found: ${diagramId}` };
  if (!tailView) return { success: false, error: `Tail view not found: ${tailViewId}` };
  if (!headView) return { success: false, error: `Head view not found: ${headViewId}` };

  try {
    const factory = app.factory as unknown as {
      createModelAndView: (o: Record<string, unknown>) => Record<string, unknown>;
    };
    const options: Record<string, unknown> = {
      id: typeName,
      parent,
      diagram,
      tailView,
      headView,
      tailModel: (tailView as Record<string, unknown>).model,
      headModel: (headView as Record<string, unknown>).model,
    };
    if (name !== undefined) {
      options.modelInitializer = (m: Record<string, unknown>) => {
        m.name = name;
      };
    }
    const view = factory.createModelAndView(options);
    const model = view.model as Record<string, unknown> | undefined;
    return {
      success: true,
      data: {
        view: { _id: view._id },
        model: model ? { _id: model._id, name: model.name } : null,
      },
    };
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

