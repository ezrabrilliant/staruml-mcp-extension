/**
 * Type declarations for StarUML Plugin API globals.
 * Derived from live runtime introspection (Object.keys + prototype methods).
 */

export interface CommandManager {
  register(id: string, name: string, handler: (...args: unknown[]) => unknown): unknown;
  execute(id: string, ...args: unknown[]): unknown;
  commandNames: string[];
  commands: Record<string, unknown>;
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
  search(query: string): Element[];
  getInstancesOf(typeName: string): Element[];
  lookupAndFind(...args: unknown[]): Element | null;
  getIdMap(): Record<string, Element>;
  isElement(value: unknown): boolean;
}

export interface Factory {
  createModel(options: { id: string; parent?: Element; modelInitializer?: (m: Element) => void }): Element;
  createDiagram(options: {
    id: string;
    parent?: Element;
    diagramInitializer?: (d: Element) => void;
  }): Element;
  createModelAndView(options: unknown): Element;
  createViewOf(options: unknown): Element;
}

export interface Engine {
  addModel(parent: Element, field: string, model: Element): Element;
  addModelAndView(options: unknown): unknown;
  setProperty(elem: Element, field: string, value: unknown): void;
  setProperties(elem: Element, values: Record<string, unknown>): void;
  deleteElements(elements: Element[]): void;
  layoutDiagram(diagram: Element, direction?: string): void;
  relocate(elem: Element, parent: Element, field: string): void;
}

export interface DiagramManager {
  getCurrentDiagram(): Element | null;
  setCurrentDiagram(diagram: Element, skipEvent?: boolean): void;
  getWorkingDiagrams(): Element[];
  openDiagram(diagram: Element): void;
  closeDiagram(diagram: Element): void;
  closeAll(): void;
  closeOthers(diagram: Element): void;
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
