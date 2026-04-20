import type { Handler } from "../http-server.js";

export const createDiagram: Handler = (body) => {
  const typeName = body.type;
  const parentId = body.parentId;
  const name = typeof body.name === "string" ? body.name : undefined;

  if (typeof typeName !== "string" || typeName.length === 0) {
    return {
      success: false,
      error:
        "Required field 'type' (string) missing. Example: 'UMLClassDiagram', 'UMLUseCaseDiagram', 'UMLSequenceDiagram', 'UMLActivityDiagram', 'ERDDiagram'",
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
    const options: Record<string, unknown> = {
      id: typeName,
      parent,
    };
    if (name !== undefined) {
      options.diagramInitializer = (d: Record<string, unknown>) => {
        d.name = name;
      };
    }
    const diagram = app.engine.createDiagram(options);
    const d = diagram as Record<string, unknown>;
    return {
      success: true,
      data: {
        _id: d._id,
        name: d.name,
        type: (diagram.constructor as { name?: string }).name,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const switchDiagram: Handler = (body) => {
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

export const closeDiagramById: Handler = (body) => {
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
