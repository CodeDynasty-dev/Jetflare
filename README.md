# Jetflare

A type-safe API client for modern web applications. Jetflare provides a clean, intuitive interface for HTTP requests, WebSocket connections, Server-Sent Events, file uploads, and intelligent caching - all with full TypeScript support.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Route Configuration](#route-configuration)
- [HTTP Requests](#http-requests)
- [Caching System](#caching-system)
- [File Uploads](#file-uploads)
- [WebSocket Support](#websocket-support)
- [Server-Sent Events](#server-sent-events)
- [Interceptors](#interceptors)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Advanced Configuration](#advanced-configuration)
- [API Reference](#api-reference)
- [Examples](#examples)

## Installation

```bash
npm install jetflare
# or
yarn add jetflare
# or
pnpm add jetflare
```

## Quick Start

Define your API routes and start making requests:

```typescript
import { Jetflare, api } from "jetflare";

// Define your API routes
export const routes = {
  GET_users: {
    path: "/users",
    method: "get",
    title: "Get all users",
  },
  POST_user: {
    path: "/users",
    method: "post",
    invalidates: ["users-list"],
    title: "Create new user",
  },
} as const;

// Initialize Jetflare with your routes
const jetflare = new Jetflare("https://api.example.com");

// Make requests
const users = await jet.GET_users();
const userData = await users.json();

const newUser = await jet.POST_user({
  body: { name: "John Doe", email: "john@example.com" },
});
```

## Route Configuration

Routes are defined as objects with the following properties:

```typescript
const routes = {
  ROUTE_NAME: {
    path: string, // API endpoint path
    method: string, // HTTP method or 'websocket'/'sse'
    headers: object, // Default headers for this route
    title: string, // Description for documentation
  },
};
```

### Route Examples

```typescript
export const routes = {
  // Basic GET request with caching
  GET_users: {
    path: "/users",
    method: "get",
    cache: { ttl: 300000, key: "users-list" },
    title: "Get all users",
  },

  // GET with path parameters
  GET_user: {
    path: "/users/:id",
    method: "get",
    cache: { ttl: 60000, key: "user-:id" },
    title: "Get user by ID",
  },

  // POST that invalidates cache
  POST_user: {
    path: "/users",
    method: "post",
    invalidates: ["users-list"],
    title: "Create new user",
  },

  // File upload endpoint
  UPLOAD_avatar: {
    path: "/users/:id/avatar",
    method: "post",
    upload: true,
    title: "Upload user avatar",
  },

  // WebSocket connection
  WS_live: {
    path: "/live",
    method: "websocket",
    title: "Real-time updates",
  },

  // Server-sent events
  SSE_notifications: {
    path: "/notifications",
    method: "sse",
    title: "Event stream",
  },
} as const;
```

## HTTP Requests

### Basic Requests

```typescript
// GET request
const response = await jet.GET_users();
const users = await response.json();

// POST request with body
const response = await jet.POST_user({
  body: {
    name: "Jane Smith",
    email: "jane@example.com",
  },
});

// Request with query parameters
const response = await jet.GET_users({
  query: {
    limit: 10,
    offset: 0,
    active: true,
  },
});

// Request with path parameters
const response = await jet.GET_user({
  params: { id: "12345" },
});
```

### Request Configuration

Each request accepts a configuration object:

```typescript
const response = await jet.GET_users({
  query: { limit: 10 }, // Query parameters
  params: { id: "123" }, // Path parameters
  headers: { "X-Custom": "value" }, // Additional headers
  body: { data: "value" }, // Request body
  cache: false, // Disable caching for this request
  timeout: 5000, // Request timeout in ms
  retry: { attempts: 3, delay: 1000 }, // Retry configuration
});
```

### Response Handling

Jetflare returns an enhanced response object:

```typescript
const response = await jet.GET_users();

// Standard Response properties
console.log(response.ok); // boolean
console.log(response.status); // number
console.log(response.statusText); // string
console.log(response.headers); // Headers object

// Enhanced properties
console.log(response.cached); // Was this response cacheable?
console.log(response.fromCache); // Did this come from cache?

// Response body methods
const json = await response.json();
const text = await response.text();
const blob = await response.blob();
const buffer = await response.arrayBuffer();
```

## Caching System

Jetflare includes an intelligent caching system that automatically caches GET requests and invalidates cache when mutations occur.

### Cache Configuration

```typescript
const routes = {
  GET_users: {
    path: "/users",
    method: "get",
  },

  POST_user: {
    path: "/users",
    method: "post",
    invalidates: ["users-list"], // Clear this cache on success
  },
};

// cache
const response = await jet.GET_users({
  cache: { ttl: 60000 }, // Cache for 1 minute
});

// Disable caching for specific request
const response = await jet.GET_users({
  cache: false,
});
```

### Dynamic Cache Keys

Cache keys support dynamic substitution:

```typescript
const routes = {
  GET_user: {
    path: "/users/:id",
    method: "get",
    cache: {
      ttl: 60000,
      key: "user-:id", // Becomes 'user-123' for params: { id: '123' }
    },
  },
};
```

### Cache Management

```typescript
// Clear all cache
jet.cache.clear();

// Invalidate specific cache keys
jet.cache.invalidate("users-list");
jet.cache.invalidate(["user-*", "posts-*"]); // Supports patterns

// Access cache directly
const cached = jet.cache.get("users-list");
jet.cache.set("custom-key", data, 60000);
```

## File Uploads

Jetflare provides seamless file upload support with progress tracking.

### Basic File Upload

```typescript
// Single file upload
const fileInput = document.querySelector('input[type="file"]');
const response = await jet.UPLOAD_avatar({
  params: { id: "123" },
  files: fileInput.files[0],
});

// Multiple files
const response = await jet.UPLOAD_documents({
  files: fileInput.files, // FileList
  body: {
    description: "Important documents",
    category: "legal",
  },
});

// File array
const files = [file1, file2, file3];
const response = await jet.UPLOAD_batch({
  files: files,
});
```

### Upload Progress Tracking

```typescript
const response = await jet.UPLOAD_avatar({
  params: { id: "123" },
  files: selectedFile,
  onUploadProgress: (progress) => {
    console.log(`Uploaded: ${progress.percentage}%`);
    console.log(`${progress.loaded} / ${progress.total} bytes`);

    // Update UI
    progressBar.value = progress.percentage;
  },
});
```

### Upload Configuration

Files are automatically handled when a route has `upload: true`:

```typescript
const routes = {
  UPLOAD_avatar: {
    path: "/users/:id/avatar",
    method: "post",
    upload: true, // Enables automatic FormData handling
    title: "Upload user avatar",
  },
};
```

## WebSocket Support

Jetflare provides a clean interface for WebSocket connections with automatic connection management.

### Basic WebSocket Usage

```typescript
// Define WebSocket route
const routes = {
  WS_chat: {
    path: "/chat",
    method: "websocket",
    title: "Chat connection",
  },
};

// Create WebSocket connection
const ws = jet.WS_chat();
const connection = ws.connect();

// Listen for events
ws.on("message", (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
});

ws.on("open", () => {
  console.log("WebSocket connected");
});

ws.on("close", () => {
  console.log("WebSocket disconnected");
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
});

// Send messages
ws.send({ type: "chat", message: "Hello!" });
ws.send("Plain text message");

// Close connection
ws.close();
```

### WebSocket with Protocols

```typescript
const ws = jet.WS_chat({
  protocols: ["chat-v1", "chat-v2"],
});
```

### Connection Management

Jetflare automatically manages WebSocket connections:

- Reuses existing connections to the same endpoint
- Automatically cleans up when connections close
- Handles reconnection logic
- Manages event listeners

## Server-Sent Events

Jetflare supports Server-Sent Events for real-time server-to-client communication.

### Basic SSE Usage

```typescript
// Define SSE route
const routes = {
  SSE_notifications: {
    path: "/notifications",
    method: "sse",
    title: "Notification stream",
  },
};

// Connect to event stream
const sse = jet.SSE_notifications();
const source = sse.connect();

// Listen for events
sse.on("message", (event) => {
  console.log("Default message:", event.data);
});

sse.on("notification", (event) => {
  const notification = JSON.parse(event.data);
  showNotification(notification);
});

sse.on("heartbeat", (event) => {
  console.log("Server heartbeat");
});

// Close connection
sse.close();
```

### SSE with Parameters

```typescript
const sse = jet.SSE_notifications({
  query: {
    userId: "123",
    types: ["alerts", "messages"],
  },
});
```

## Interceptors

Interceptors allow you to transform requests and responses globally.

### Request Interceptors

```typescript
// Add request logging
jet.interceptors.request.add((config) => {
  console.log(`→ ${config.route.method.toUpperCase()} ${config.route.path}`);

  // Add timestamp to all requests
  config.headers = {
    ...config.headers,
    "X-Request-Time": new Date().toISOString(),
  };

  return config;
});

// Add authentication token
jet.interceptors.request.add((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});
```

### Response Interceptors

```typescript
// Add response logging
jet.interceptors.response.add((response) => {
  console.log(`← ${response.status} ${response.statusText}`);
  return response;
});

// Handle token refresh
jet.interceptors.response.add(async (response) => {
  if (response.status === 401) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      // Could retry the original request here
      console.log("Token refreshed, retry the request");
    }
  }
  return response;
});
```

### Error Interceptors

```typescript
// Global error handling
jet.interceptors.error.add((error) => {
  console.error("API Error:", error.message);

  // Show user-friendly error messages
  if (error.message.includes("timeout")) {
    showErrorMessage("Request timed out. Please try again.");
  } else if (error.message.includes("Network Error")) {
    showErrorMessage("Network error. Check your connection.");
  }

  return error;
});
```

## Authentication

Jetflare provides convenient authentication helpers.

### Bearer Token Authentication

```typescript
// Set bearer token
jet.withAuth("your-jwt-token-here");
// All subsequent requests will include:
// Authorization: Bearer your-jwt-token-here
```

### Custom Authentication

```typescript
// Custom auth headers
jet.setDefaultHeaders({
  "X-API-Key": "your-api-key",
  "X-Auth-Token": "your-custom-token",
});

// Or per request
const response = await jet.GET_users({
  headers: {
    Authorization: "Custom your-token-here",
  },
  ...
});
```

## Error Handling

### Automatic Error Handling

```typescript
try {
  const response = await jet.GET_users();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const users = await response.json();
} catch (error) {
  if (error.message.includes("timeout")) {
    console.error("Request timed out");
  } else if (error.message.includes("Network Error")) {
    console.error("Network connectivity issue");
  } else {
    console.error("API error:", error.message);
  }
}
```

### Retry Configuration

```typescript
const response = await jet.GET_users({
  retry: {
    attempts: 3,
    delay: 1000, // ms between attempts
  },
  timeout: 5000,
});
```

### Global Error Handling

```typescript
// Handle all API errors in one place
jet.interceptors.error.add((error) => {
  // Log to monitoring service
  logError(error);

  // Show user notification
  showErrorToast(error.message);

  return error;
});
```

## Advanced Configuration

### Initial Setup

```typescript
// Method 1: Constructor
const jetflare = new Jetflare("https://api.example.com");

// Method 2: Fluent API
const jetflare = api.setup({
  baseURL: "https://api.example.com",
  headers: {
    "Content-Type": "application/json",
    "X-App-Version": "1.0.0",
  },
  timeout: 10000,
});

// Method 3: Chaining
const jetflare = new Jet()
  .withBaseURL("https://api.example.com")
  .withAuth("bearer-token")
  .withTimeout(15000);
```

### Environment Configuration

```typescript
const jetflare = api.setup({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://api.myapp.com"
      : "http://localhost:3000",
  headers: {
    "X-Environment": process.env.NODE_ENV,
  },
});
```

### Default Headers

```typescript
// Set default headers for all requests
jet.setDefaultHeaders({
  "Content-Type": "application/json",
  "X-Client-Version": "2.1.0",
  "Accept-Language": navigator.language,
});

// Add additional headers
jet.setDefaultHeaders({
  "X-User-ID": getCurrentUserId(),
});
```

### Timeout Configuration

```typescript
// Global timeout
jet.setDefaultTimeout(30000); // 30 seconds

// Per-request timeout
const response = await jet.GET_users({
  timeout: 5000, // 5 seconds for this request
});
```

## API Reference

### Jetflare Class

#### Constructor

```typescript
new Jet(origin?: string)
```

#### Methods

```typescript
jet.setBaseURL(url: string): void
jet.setDefaultHeaders(headers: Record<string, string>): void
jet.setDefaultTimeout(timeout: number): void
jet.withAuth(token: string): Jet
jet.withTimeout(timeout: number): Jet
jet.withBaseURL(url: string): Jet
```

#### Properties

```typescript
jet.origin: string
jet.cache: CacheManager
jet.interceptors: {
    request: Set<Function>,
    response: Set<Function>,
    error: Set<Function>
}
```

### CacheManager

```typescript
cache.get(key: string): any | null
cache.set(key: string, data: any, ttl?: number): void
cache.invalidate(pattern: string | string[]): void
cache.clear(): void
```

### Response Object

```typescript
interface JetResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  cached: boolean;
  fromCache: boolean;

  json<T>(): Promise<T>;
  text(): Promise<string>;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
  formData(): Promise<FormData>;
}
```

### Request Payload

```typescript
interface ApiFunctionPayload {
  body?: any;
  query?: Record<string, any>;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  files?: FileList | File[] | File;
  cache?: boolean | { ttl?: number; key?: string };
  timeout?: number;
  retry?: boolean | { attempts?: number; delay?: number };
  onUploadProgress?: (progress: ProgressEvent) => void;
  onDownloadProgress?: (progress: ProgressEvent) => void;
}
```

## Examples

### Complete User Management Example

```typescript
import { Jetflare, api } from "jetflare";

// Define routes
const routes = {
  GET_users: {
    path: "/users",
    method: "get",
    cache: { ttl: 300000, key: "users-list" },
    title: "Get all users",
  },
  GET_user: {
    path: "/users/:id",
    method: "get",
    cache: { ttl: 60000, key: "user-:id" },
    title: "Get user by ID",
  },
  POST_user: {
    path: "/users",
    method: "post",
    invalidates: ["users-list"],
    title: "Create user",
  },
  PUT_user: {
    path: "/users/:id",
    method: "put",
    invalidates: ["users-list", "user-:id"],
    title: "Update user",
  },
  DELETE_user: {
    path: "/users/:id",
    method: "delete",
    invalidates: ["users-list", "user-:id"],
    title: "Delete user",
  },
  UPLOAD_avatar: {
    path: "/users/:id/avatar",
    method: "post",
    upload: true,
    invalidates: ["user-:id"],
    title: "Upload avatar",
  },
} as const;

// Setup API client
const jetflare = api
  .setup({
    baseURL: "https://api.example.com",
    headers: { "X-App-Version": "1.0.0" },
    timeout: 10000,
  })
  .withAuth("your-jwt-token");

// Usage examples
class UserService {
  // Get all users (with caching)
  async getUsers(page = 1, limit = 20) {
    const response = await jet.GET_users({
      query: { page, limit },
    });
    return response.json();
  }

  // Get single user (cached)
  async getUser(id: string) {
    const response = await jet.GET_user({
      params: { id },
    });
    return response.json();
  }

  // Create user (invalidates cache)
  async createUser(userData: any) {
    const response = await jet.POST_user({
      body: userData,
    });
    return response.json();
  }

  // Update user (invalidates cache)
  async updateUser(id: string, updates: any) {
    const response = await jet.PUT_user({
      params: { id },
      body: updates,
    });
    return response.json();
  }

  // Delete user (invalidates cache)
  async deleteUser(id: string) {
    const response = await jet.DELETE_user({
      params: { id },
    });
    return response.ok;
  }

  // Upload avatar with progress
  async uploadAvatar(userId: string, file: File, onProgress?: Function) {
    const response = await jet.UPLOAD_avatar({
      params: { id: userId },
      files: file,
      onUploadProgress: onProgress,
    });
    return response.json();
  }
}

export const userService = new UserService();
```

### Real-time Chat Example

```typescript
const routes = {
  WS_chat: {
    path: "/chat/:roomId",
    method: "websocket",
    title: "Chat room connection",
  },
  POST_message: {
    path: "/chat/:roomId/messages",
    method: "post",
    title: "Send message",
  },
} as const;

class ChatService {
  private ws: any = null;

  joinRoom(roomId: string, onMessage: Function) {
    this.ws = jet.WS_chat();

    // Connect to room
    this.ws.connect();

    // Set up event handlers
    this.ws.on("open", () => {
      console.log(`Connected to room ${roomId}`);
      this.ws.send({ type: "join", roomId });
    });

    this.ws.on("message", (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    });

    this.ws.on("close", () => {
      console.log("Disconnected from chat");
    });

    this.ws.on("error", (error: Event) => {
      console.error("Chat error:", error);
    });
  }

  sendMessage(roomId: string, message: string) {
    if (this.ws) {
      this.ws.send({
        type: "message",
        roomId,
        content: message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  leaveRoom() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### File Upload with Progress Example

```typescript
const routes = {
  UPLOAD_documents: {
    path: "/documents",
    method: "post",
    upload: true,
    title: "Upload documents",
  },
} as const;

function setupFileUpload() {
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;
  const progressBar = document.getElementById(
    "progress"
  ) as HTMLProgressElement;
  const uploadButton = document.getElementById("upload") as HTMLButtonElement;

  uploadButton.addEventListener("click", async () => {
    const files = fileInput.files;
    if (!files || files.length === 0) return;

    try {
      uploadButton.disabled = true;
      progressBar.style.display = "block";

      const response = await jet.UPLOAD_documents({
        files: files,
        body: {
          description: "Batch upload",
          category: "user-documents",
        },
        onUploadProgress: (progress) => {
          progressBar.value = progress.percentage;
          console.log(`Uploading: ${progress.percentage}%`);
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Upload successful:", result);
        alert("Files uploaded successfully!");
      } else {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      uploadButton.disabled = false;
      progressBar.style.display = "none";
      progressBar.value = 0;
    }
  });
}
```
