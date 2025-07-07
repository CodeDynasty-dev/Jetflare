// Helper to widen literal types to their primitive types
type WidenLiterals<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T extends null
  ? null // Handle null explicitly
  : T extends undefined
  ? undefined // Handle undefined explicitly
  : T extends object
  ? { [K in keyof T]: WidenLiterals<T[K]> } // Recurse for objects
  : T extends Array<infer U>
  ? Array<WidenLiterals<U>> // Recurse for arrays
  : T;

interface ApiFunctionPayload<
  Method extends
    | "get"
    | "post"
    | "put"
    | "delete"
    | "websocket"
    | "sse"
    | "patch" = "get",
  RBody = any,
  RQuery = any,
  RParams = any
> {
  body?: Method extends "get" | "delete" ? never : RBody;
  query?: RQuery;
  params?: RParams;
  headers?: Record<string, string>;
  cache?: boolean | { ttl?: number; key?: string };
  timeout?: number;
  retry?: boolean | { attempts?: number; delay?: number };
  onUploadProgress?: (progress: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
}

// Define the structure for a single route definition
export type RouteDefinition = {
  path: string;
  method: "get" | "post" | "websocket" | "sse" | "put" | "delete" | "patch";
  title?: string;
  headers?: Record<string, string>;
  invalidates?: string | string[];
  body?: object; // Use object as a placeholder for inference
  query?: object;
  params?: object;
  response?: any;
};

// This type represents the overall routes object
export type routesType = Record<string, RouteDefinition>;

// Cache systemd
class CacheManager {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize = 100;

  set(key: string, data: any, ttl: number = 300000) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: structuredClone(data),
      expires: Date.now() + ttl,
    });
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return structuredClone(entry.data);
  }

  invalidate(pattern: string | string[]) {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    for (const key of this.cache.keys()) {
      if (
        patterns.some(
          (p) =>
            key.includes(p) || key.match(new RegExp(p.replace(/\*/g, ".*")))
        )
      ) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

// WebSocket managed
class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private eventHandlers = new Map<string, Set<Function>>();

  connect(url: string, protocols?: string | string[]) {
    if (this.connections.has(url)) return;
    const ws = new WebSocket(url, protocols);
    this.connections.set(url, ws);

    ws.onclose = () => {
      this.connections.delete(url);
      this.eventHandlers.delete(url);
    };

    return;
  }
  socket(url: string) {
    return this.connections.get(url);
  }

  on(url: string, event: string, handler: Function) {
    const key = `${url}:${event}`;
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set());
    }
    this.eventHandlers.get(key)!.add(handler);

    const ws = this.connections.get(url);
    if (ws) {
      ws.addEventListener(event as any, handler as any);
    }
  }

  off(url: string, event: string, handler: Function) {
    const key = `${url}:${event}`;
    const handlers = this.eventHandlers.get(key);
    if (handlers) {
      handlers.delete(handler);
      const ws = this.connections.get(url);
      if (ws) {
        ws.removeEventListener(event as any, handler as any);
      }
    }
  }

  send(url: string, data: any) {
    const ws = this.connections.get(url);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof data === "string" ? data : JSON.stringify(data));
    } else {
      throw new Error(`WebSocket connection to ${url} is not open`);
    }
  }

  close(url: string) {
    const ws = this.connections.get(url);
    if (ws) {
      ws.close();
    }
  }
}

// Enhanced API response
class JetResponse<T = any> {
  constructor(
    public response: Response,
    public cached: boolean = false,
    public fromCache: boolean = false
  ) {}

  get ok() {
    return this.response.ok;
  }
  get status() {
    return this.response.status;
  }
  get statusText() {
    return this.response.statusText;
  }
  get headers() {
    return this.response.headers;
  }
  get url() {
    return this.response.url;
  }

  async json(): Promise<T> {
    return this.response.json();
  }

  async text(): Promise<string> {
    return this.response.text();
  }

  async blob(): Promise<Blob> {
    return this.response.blob();
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.response.arrayBuffer();
  }

  async formData(): Promise<FormData> {
    return this.response.formData();
  }
}

class JetflareCommon {
  origin: string;
  cache = new CacheManager();
  wsManager = new WebSocketManager();
  private defaultHeaders: Record<string, string> = {};
  private defaultTimeout = 30000;

  interceptors = {
    request: new Set<(config: any) => any>(),
    response: new Set<(response: JetResponse) => JetResponse>(),
    error: new Set<(error: Error) => Error>(),
  };

  [key: string]: any;

  constructor(options: { origin: string; routes: routesType }) {
    if (!options.origin) {
      throw new Error("Origin URL is required");
    }
    if (!options.routes) {
      throw new Error("Routes are required");
    }
    if (typeof options.routes !== "object") {
      throw new Error("Routes must be an object");
    }
    try {
      new URL(options.origin);
      this.origin = options.origin.replace(/\/$/, "");
    } catch {
      throw new Error(`Invalid origin URL: ${options.origin}`);
    }

    this.setupRoutes(options.routes);
    return this as any;
  }

  private setupRoutes(routes: routesType) {
    for (const routeKey in routes) {
      if (Object.prototype.hasOwnProperty.call(routes, routeKey)) {
        const currentRouteKey = routeKey as keyof typeof routes;
        const routeDef = routes[currentRouteKey];

        if (routeDef.method === "websocket") {
          this[currentRouteKey] = this.createWebSocketFunction(routeDef);
        } else if (routeDef.method === "sse") {
          this[currentRouteKey] = this.createSSEFunction(routeDef);
        } else {
          this[currentRouteKey] = this.createHttpFunction(
            routeDef,
            currentRouteKey
          );
        }
      }
    }
  }

  private createWebSocketFunction(routeDef: any) {
    return (payload: { protocols?: string | string[] } = {}) => {
      const wsUrl = this.origin.replace(/^http/, "ws") + routeDef.path;

      return {
        connect: () => this.wsManager.connect(wsUrl, payload.protocols),
        socket: () => this.wsManager.socket(wsUrl),
        on: (event: string, handler: Function) =>
          this.wsManager.on(wsUrl, event, handler),
        off: (event: string, handler: Function) =>
          this.wsManager.off(wsUrl, event, handler),
        send: (data: any) => this.wsManager.send(wsUrl, data),
        close: () => this.wsManager.close(wsUrl),
      };
    };
  }

  private createSSEFunction(routeDef: any) {
    return (payload: ApiFunctionPayload = {}) => {
      let eventSource: EventSource | null = null;
      const url = this.buildUrl(routeDef, payload);

      return {
        connect: () => {
          eventSource = new EventSource(url);
        },
        event: () => eventSource,
        on: (event: string, handler: Function) => {
          if (eventSource) {
            eventSource.addEventListener(event, handler as any);
          }
        },
        close: () => {
          if (eventSource) {
            eventSource.close();
          }
        },
      };
    };
  }

  private createHttpFunction(routeDef: any, routeKey: string) {
    return async (payload: ApiFunctionPayload = {}): Promise<JetResponse> => {
      try {
        // Apply request interceptors
        let config = { ...payload, route: routeDef };
        for (const interceptor of this.interceptors.request) {
          config = interceptor(config);
        }

        // Check cache first
        const cacheConfig = payload.cache !== false ? payload.cache : false;
        if (cacheConfig && routeDef.method.toLowerCase() === "get") {
          const cacheKey = this.buildCacheKey(routeDef, payload, cacheConfig);
          const cached = this.cache.get(cacheKey);
          if (cached) {
            const response = new Response(JSON.stringify(cached), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                ...routeDef.headers,
              },
            });
            return new JetResponse(response, true, true);
          }
        }

        const response = await this.makeRequest(routeDef, config, routeKey);
        let jetResponse = new JetResponse(response, !!cacheConfig);

        // Apply response interceptors
        for (const interceptor of this.interceptors.response) {
          jetResponse = interceptor(jetResponse);
        }

        // Cache successful responses
        if (
          cacheConfig &&
          response.ok &&
          routeDef.method.toLowerCase() === "get"
        ) {
          const cacheKey = this.buildCacheKey(routeDef, payload, cacheConfig);
          const data = await response
            .clone()
            .json()
            .catch(() => response.clone().text());
          this.cache.set(
            cacheKey,
            data,
            (cacheConfig as { ttl?: number }).ttl || 300000
          );
        }

        // Invalidate cache for mutations
        if (routeDef.invalidates && response.ok) {
          this.cache.invalidate(routeDef.invalidates);
        }

        return jetResponse;
      } catch (error) {
        let processedError = error as Error;
        for (const interceptor of this.interceptors.error) {
          processedError = interceptor(processedError);
        }
        throw processedError;
      }
    };
  }

  private buildUrl(routeDef: any, payload: ApiFunctionPayload): string {
    let actualPath = routeDef.path;

    // Replace path parameters
    if (payload.params) {
      for (const [paramKey, paramValue] of Object.entries(payload.params)) {
        if (paramValue == null) {
          throw new Error(`Missing required parameter: ${paramKey}`);
        }
        actualPath = actualPath.replace(
          `:${paramKey}`,
          encodeURIComponent(String(paramValue))
        );
      }
    }

    const url = new URL(`${this.origin}${actualPath}`);

    // Add query parameters
    if (payload.query) {
      for (const [key, value] of Object.entries(payload.query)) {
        if (value != null) {
          if (Array.isArray(value)) {
            value.forEach((item) => url.searchParams.append(key, String(item)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      }
    }

    return url.toString();
  }

  private buildCacheKey(
    routeDef: any,
    payload: ApiFunctionPayload,
    cacheConfig: any
  ): string {
    let key = cacheConfig.key || routeDef.path;

    // Replace dynamic parts
    if (payload.params) {
      for (const [paramKey, paramValue] of Object.entries(payload.params)) {
        key = key.replace(`:${paramKey}`, String(paramValue));
      }
    }

    // Add query string to cache key
    if (payload.query) {
      const queryString = new URLSearchParams(
        this.flattenQuery(payload.query)
      ).toString();
      // const queryString = new URLSearchParams(payload.query).toString();
      if (queryString) {
        key += `?${queryString}`;
      }
    }

    return key;
  }

  private flattenQuery(obj: any, prefix = ""): Record<string, string> {
    const result: Record<string, string> = {};

    for (const key in obj) {
      const value = obj[key];
      const prefixedKey = prefix ? `${prefix}[${key}]` : key;

      if (typeof value === "object" && value !== null) {
        Object.assign(result, this.flattenQuery(value, prefixedKey));
      } else {
        result[prefixedKey] = String(value);
      }
    }

    return result;
  }

  private async makeRequest(
    routeDef: any,
    payload: ApiFunctionPayload,
    _routeKey: string
  ): Promise<Response> {
    const url = this.buildUrl(routeDef, payload);
    const method = routeDef.method.toUpperCase();

    // Prepare headers
    const headers = {
      ...this.defaultHeaders,
      ...routeDef.headers,
      ...payload.headers,
    };

    const isBodyMethod = ["POST", "PUT", "PATCH"].includes(method);
    let body: any = null;

    const doesBodyHasFile = Object.values(payload.body || {}).some(
      (value) => value instanceof File
    );
    if (doesBodyHasFile) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);

        // Set headers
        for (const key in headers) {
          if (Object.prototype.hasOwnProperty.call(headers, key)) {
            xhr.setRequestHeader(key, headers[key]);
          }
        }

        // Upload Progress
        if (payload.onUploadProgress && xhr.upload) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentage = (event.loaded / event.total) * 100;
              payload.onUploadProgress!({
                loaded: event.loaded,
                total: event.total,
                percentage: parseFloat(percentage.toFixed(2)),
              });
            }
          };
        }

        xhr.onload = () => {
          const responseHeaders = xhr
            .getAllResponseHeaders()
            .split("\r\n")
            .reduce((acc, current) => {
              const [key, value] = current.split(": ");
              if (key && value) {
                acc[key.toLowerCase()] = value;
              }
              return acc;
            }, {} as Record<string, string>);

          const response = new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: responseHeaders,
          });
          resolve(response);
        };

        xhr.onerror = () =>
          reject(new Error("Network error or request failed"));
        xhr.ontimeout = () =>
          reject(new Error(`Request timeout after ${this.defaultTimeout}ms`));
        xhr.onabort = () => reject(new Error("Request aborted"));

        const formData = new FormData();
        for (const [key, value] of Object.entries(payload.body || {})) {
          if (value instanceof File) {
            formData.append(key, value);
          } else if (
            Array.isArray(value) &&
            value.some((item) => item instanceof File)
          ) {
            (value as File[]).forEach((fileItem) =>
              formData.append(key, fileItem)
            );
          } else {
            formData.append(key, JSON.stringify(value)); // Stringify non-file data
          }
        }
        body = formData;

        xhr.send(body);
      });
    } else {
      if (payload.body && isBodyMethod) {
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }

        body =
          headers["Content-Type"] === "application/json"
            ? JSON.stringify(payload.body)
            : payload.body;
      }
    }

    // Setup AbortController for timeout and cancellation
    const controller = new AbortController();
    const timeout = payload.timeout || this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  // Public API methods
  setBaseURL(url: string) {
    this.origin = url.replace(/\/$/, "");
  }

  setDefaultHeaders(headers: Record<string, string>) {
    Object.assign(this.defaultHeaders, headers);
  }

  setDefaultTimeout(timeout: number) {
    this.defaultTimeout = timeout;
  }
}

// Update ApiFunction to apply WidenLiterals to the inferred types
type JsonObject<T> = {
  [P in keyof T]: T[P] extends object ? JsonObject<T[P]> : T[P];
};

type ResponseTypeOf<R> = R extends { response: infer Res }
  ? JsonObject<WidenLiterals<Res>>
  : any;

// Update ApiFunction to apply WidenLiterals to the inferred types
type ApiFunction<RouteDef extends routesType[keyof routesType]> = (
  payload?: ApiFunctionPayload<
    RouteDef["method"],
    WidenLiterals<RouteDef extends { body: infer B } ? B : never>,
    WidenLiterals<RouteDef extends { query: infer Q } ? Q : never>,
    WidenLiterals<RouteDef extends { params: infer P } ? P : never>
  >
) => Promise<JetResponse<ResponseTypeOf<RouteDef>>>;

type WebSocketFunction = (payload?: { protocols?: string | string[] }) => {
  connect: () => void;
  socket: () => WebSocket | undefined;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
  send: (data: any) => void;
  close: () => void;
};
type SSEFunction = (payload?: ApiFunctionPayload) => {
  connect: () => void;
  event: () => EventSource | null;
  on: (event: string, handler: (event: any) => void) => void;
  close: () => void;
};

// Main SDK type
export type API<routes extends routesType> = {
  [K in keyof routes]: routes[K]["method"] extends "websocket"
    ? WebSocketFunction
    : routes[K]["method"] extends "sse"
    ? SSEFunction
    : ApiFunction<routes[K]>;
} & {
  origin: string;
  cache: CacheManager;
  wsManager: WebSocketManager;
  interceptors: {
    request: Set<(config: any) => any>;
    response: Set<(response: JetResponse<any>) => JetResponse<any>>;
    error: Set<(error: Error) => Error>;
  };
  setBaseURL: (url: string) => void;
  setDefaultHeaders: (headers: Record<string, string>) => void;
  setDefaultTimeout: (timeout: number) => void;
};

// Helper function to define routes with strong inference
export function createRoutes<T extends routesType>(routes: T): T {
  return routes;
}

// Create a Jetflare instance
export const Jetflare = <T extends routesType>(
  origin: string,
  routes: T
): API<T> => {
  return new JetflareCommon({
    routes,
    origin: origin,
  }) as unknown as API<T>;
};
