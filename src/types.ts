/**
 * Type declarations for StarUML Plugin API globals.
 * StarUML injects `app` as a global with access to its internal modules.
 * See https://files.staruml.io/api-docs/2.0.0/api/index.html
 */

export interface Command {
  getID(): string;
  getName(): string;
  execute(...args: unknown[]): unknown;
}

export interface CommandManager {
  register(name: string, id: string, handler: (...args: unknown[]) => unknown): Command | null;
  execute(id: string, ...args: unknown[]): unknown;
  getAll(): string[];
  get(id: string): Command | undefined;
}

export interface ProjectManager {
  getFilename(): string | null;
  getProject(): unknown;
  save(filename?: string): Promise<void>;
  saveAs(filename: string): Promise<void>;
  newProject(): unknown;
  loadFromFile(filename: string): Promise<void>;
  closeProject(): void;
}

export interface Element {
  _id: string;
  name?: string;
  [key: string]: unknown;
}

export interface Repository {
  get(id: string): Element | undefined;
  select(selector: string): Element[];
  find(matcher: (elem: Element) => boolean): Element | null;
  findAll(matcher: (elem: Element) => boolean): Element[];
  insert(parent: Element, field: string, elem: Element): void;
  bypassFieldAssign(elem: Element, field: string, value: unknown): void;
}

export interface Factory {
  createModel(options: { id: string; parent?: Element; modelInitializer?: (m: Element) => void }): Element;
  createDiagram(options: {
    id: string;
    parent?: Element;
    diagramInitializer?: (d: Element) => void;
  }): Element;
}

export interface Engine {
  createModel(options: unknown): Element;
  createDiagram(options: unknown): Element;
  addModel(parent: Element, field: string, model: Element): Element;
  setProperty(elem: Element, field: string, value: unknown): void;
  deleteElements(elements: Element[]): void;
}

export interface DiagramManager {
  getCurrentDiagram(): Element | null;
  setCurrentDiagram(diagram: Element, skipEvent?: boolean): void;
  getDiagrams(): Element[];
  closeDiagram(diagram: Element): void;
}

export interface StarUMLApp {
  commands: CommandManager;
  project: ProjectManager;
  repository: Repository;
  factory: Factory;
  engine: Engine;
  diagrams: DiagramManager;
  [key: string]: unknown;
}

declare global {
  // eslint-disable-next-line no-var
  var app: StarUMLApp;
  // eslint-disable-next-line no-var
  var type: Record<string, unknown>;
}

export {};
