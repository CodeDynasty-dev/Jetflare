import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { Jetflare, createRoutes } from "./dist/index.js";

describe("Jetflare SDK", () => {
  const mockOrigin = "http://api.example.com";
  const mockRoutes = createRoutes({
    getUsers: {
      path: "/users",
      method: "get",
      query: { page: Number, limit: Number },
    },
    createUser: {
      path: "/users",
      method: "post",
      body: { name: String, email: String },
    },
    getUserById: {
      path: "/users/:id",
      method: "get",
      params: { id: String },
    },
    wsConnect: {
      path: "/ws",
      method: "websocket",
    },
    sseEvents: {
      path: "/events",
      method: "sse",
    },
  });

  let api: ReturnType<typeof Jetflare>;

  beforeEach(() => {
    api = Jetflare(mockOrigin, mockRoutes);
  });

  describe("HTTP Requests", () => {
    it("should make GET request with query parameters", async () => {
      const response = await api.getUsers({
        query: { page: 1, limit: 10 },
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should make POST request with body", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
      };

      const response = await api.createUser({
        body: userData,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
    });

    it("should handle path parameters correctly", async () => {
      const response = await api.getUserById({
        params: { id: "123" },
      });

      expect(response.ok).toBe(true);
      expect(response.url).toInclude("/users/123");
    });
  });

  describe("Caching", () => {
    it("should cache GET requests when configured", async () => {
      const firstResponse = await api.getUsers({
        query: { page: 1, limit: 10 },
        cache: { ttl: 5000 },
      });

      const secondResponse = await api.getUsers({
        query: { page: 1, limit: 10 },
        cache: { ttl: 5000 },
      });

      expect(secondResponse.fromCache).toBe(true);
      expect(await firstResponse.json()).toEqual(await secondResponse.json());
    });

    it("should invalidate cache when specified", async () => {
      await api.getUsers({
        cache: true,
      });

      await api.createUser({
        body: { name: "Test", email: "test@example.com" },
      });

      const cachedData = api.cache.get("/users");
      expect(cachedData).toBe(null);
    });
  });

  describe("WebSocket Connection", () => {
    it("should establish WebSocket connection", () => {
      const ws = api.wsConnect();
      ws.connect();

      const socket = ws.socket();
      expect(socket).toBeDefined();
      expect(socket?.readyState).toBe(WebSocket.CONNECTING);
    });

    it("should handle WebSocket events", () => {
      const ws = api.wsConnect();
      const mockHandler = mock((data: any) => {});

      ws.connect();
      ws.on("message", mockHandler);
      ws.send("test message");

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe("Server-Sent Events", () => {
    it("should establish SSE connection", () => {
      const sse = api.sseEvents();
      sse.connect();

      const eventSource = sse.event();
      expect(eventSource).toBeDefined();
      expect(eventSource?.readyState).toBe(EventSource.CONNECTING);
    });

    it("should handle SSE events", () => {
      const sse = api.sseEvents();
      const mockHandler = mock((event: any) => {});

      sse.connect();
      sse.on("message", mockHandler);

      expect(mockHandler).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      api.setBaseURL("http://invalid-url");

      await expect(api.getUsers()).rejects.toThrow();
    });

    it("should handle timeout errors", async () => {
      api.setDefaultTimeout(1);

      await expect(api.getUsers()).rejects.toThrow(/timeout/i);
    });
  });

  describe("Configuration", () => {
    it("should set default headers", () => {
      const headers = { Authorization: "Bearer token" };
      api.setDefaultHeaders(headers);

      expect(api["defaultHeaders"]).toEqual(headers);
    });

    it("should update base URL", () => {
      const newUrl = "https://new-api.example.com";
      api.setBaseURL(newUrl);

      expect(api.origin).toBe(newUrl);
    });
  });
});
