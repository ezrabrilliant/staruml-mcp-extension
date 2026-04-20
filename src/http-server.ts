import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

export type HandlerResult =
  | { success: true; data?: unknown }
  | { success: false; error: string };

export type Handler = (body: Record<string, unknown>) => Promise<HandlerResult> | HandlerResult;

export interface HttpServerOptions {
  port: number;
  host?: string;
  handlers: Record<string, Handler>;
  onLog?: (level: "info" | "error", message: string) => void;
}

export class ExtensionHttpServer {
  private server: http.Server | null = null;
  private readonly port: number;
  private readonly host: string;
  private readonly handlers: Record<string, Handler>;
  private readonly log: (level: "info" | "error", message: string) => void;

  constructor(options: HttpServerOptions) {
    this.port = options.port;
    this.host = options.host ?? "127.0.0.1";
    this.handlers = options.handlers;
    this.log = options.onLog ?? (() => {});
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => this.handleRequest(req, res));
      server.once("error", reject);
      server.listen(this.port, this.host, () => {
        this.log("info", `[staruml-mcp-ext] HTTP server listening on http://${this.host}:${this.port}`);
        this.server = server;
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? "/";

    // GET / — health check
    if (req.method === "GET" && url === "/") {
      this.sendJson(res, 200, {
        name: "staruml-mcp-extension",
        version: "0.1.0",
        build: "b3-factory-fix",
        endpoints: Object.keys(this.handlers).sort(),
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

    let body: Record<string, unknown> = {};
    try {
      const raw = await this.readBody(req);
      body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch (err) {
      this.sendJson(res, 400, {
        success: false,
        error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    try {
      const result = await handler(body);
      this.sendJson(res, result.success ? 200 : 400, result);
    } catch (err) {
      this.log(
        "error",
        `[staruml-mcp-ext] handler ${slug} threw: ${err instanceof Error ? err.stack : String(err)}`,
      );
      this.sendJson(res, 500, {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.setEncoding("utf-8");
      req.on("data", (chunk: string) => {
        data += chunk;
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
  }

  private sendJson(res: ServerResponse, status: number, body: unknown): void {
    const text = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(text),
    });
    res.end(text);
  }
}
