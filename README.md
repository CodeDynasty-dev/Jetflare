# Jetflare

A type-safe API client for web applications.

Jetflare provides a clean, intuitive interface for HTTP requests, WebSocket connections, Server-Sent Events, file uploads, and intelligent caching - all with full TypeScript support.

<div align="center">
  <a href="https://npm-stat.com/charts.html?package=jetflare">
    <img src="https://img.shields.io/npm/dm/jetflare" alt="Downloads per Month"/>
  </a>
  <a href="https://npm-stat.com/charts.html?package=jetflare">
    <img src="https://img.shields.io/npm/dy/jetflare" alt="Downloads per Year"/>
  </a>
  <a href="https://badge.fury.io/js/jetflare">
    <img src="https://badge.fury.io/js/jetflare.svg" alt="npm version">
  </a>
  <a href="https://github.com/codedynasty-dev/jetflare">
    <img src="https://img.shields.io/github/stars/codedynasty-dev/jetflare?style=social" alt="Stars"/>
  </a>
</div>

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Defining API Routes](#defining-api-routes)
  - [HTTP Routes](#http-routes)
  - [WebSocket Routes](#websocket-routes)
  - [Server-Sent Events (SSE) Routes](#server-sent-events-sse-routes)
- [Making API Calls](#making-api-calls)
  - [GET Requests](#get-requests)
  * [POST/PUT/PATCH Requests (with Body)](#postputpatch-requests-with-body)
  * [Requests with Query Parameters](#requests-with-query-parameters)
  * [Requests with Path Parameters](#requests-with-path-parameters)
  * [File Uploads](#file-uploads)
  * [Accessing WebSocket Connections](#accessing-websocket-connections)
  * [Accessing SSE Connections](#accessing-sse-connections)
- [Advanced Features](#advanced-features)
  - [Request Payload Options](#request-payload-options)
  - [Caching System](#caching-system)
  - [Request Retries](#request-retries)
  - [Request Cancellation](#request-cancellation)
  - [Interceptors](#interceptors)
- [Configuration](#configuration)
  - [Global Configuration](#global-configuration)
  - [Fluent API](#fluent-api)
- [Error Handling](#error-handling)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Strict Type Safety:** Leverage TypeScript for compile-time validation of API requests and responses.
- **Intuitive Route Definition:** Define your API routes clearly with specified paths, HTTP methods, and payload schemas (body, query, params).
- **Built-in Caching:** Intelligent caching system with automatic invalidation for GET requests.
- **Automatic Retries:** Configure automatic retries for failed HTTP requests.
- **Request Cancellation:** Cancel in-flight requests using `AbortController`.
- **Upload/Download Progress:** Track progress for file uploads and downloads.
- **Real-time Communication:** First-class support for WebSockets and Server-Sent Events.
- **Interceptors:** Global request, response, and error interceptors for centralized logic.
- **File Uploads:** Simplified handling of single and multiple file uploads.
- **Configurable:** Set default headers, timeouts, and base URLs.

## Installation

```bash
npm install jetflare
# or
yarn add jetflare
# or
pnpm add jetflare
```

## Quick Start

Define your API routes and start making requests.

```typescript
import { Jetflare, createRoutes } from "jetflare";

// 1. Define your API routes using createRoutes for type inference
export const routes = createRoutes({
  GET_users: {
    path: "/users",
    method: "get",
    title: "Get all users",
    // Define expected query parameters for type safety
    query: {
      limit: 0, // number
      isActive: false, // boolean
    },
  },
  POST_user: {
    path: "/users",
    method: "post",
    title: "Create new user",
    // Define expected request body structure
    body: {
      name: "string",
      email: "string",
      age: 0,
    },
  },
});

// 2. Initialize Jetflare with your API base URL and routes
const jetflare = Jetflare(
  "[https://api.example.com](https://api.example.com)",
  routes
);

// 3. Make requests and handle responses
async function fetchData() {
  try {
    // GET request with query parameters
    const usersResponse = await jetflare.GET_users({
      query: { limit: 5, isActive: true },
    });
    const usersData = await usersResponse.json();
    console.log("All users:", usersData);

    // POST request with a request body
    const newUserResponse = await jetflare.POST_user({
      body: { name: "Alice Smith", email: "alice@example.com", age: 28 },
    });
    const newUserData = await newUserResponse.json();
    console.log("New user created:", newUserData);
  } catch (error) {
    console.error("API call failed:", error);
  }
}

fetchData();
```

## Defining API Routes

Routes are defined as an object where each key is the function name for your API call, and its value is an object defining the endpoint. Use `createRoutes` to ensure proper type inference.

```typescript
import { createRoutes } from "jetflare";

export const routes = createRoutes({
  ROUTE_NAME: {
    path: string, // The URL path, can include :params
    method: "get" | "post" | "put" | "delete" | "patch" | "websocket" | "sse",
    title?: string, // Optional, for documentation or debugging
    headers?: Record<string, string>, // Optional, default headers for this route
    invalidates?: string | string[], // Optional, cache keys to invalidate on success
    body?: object, // Optional, type definition for request body (for POST, PUT, PATCH)
    query?: object, // Optional, type definition for URL query parameters
    params?: object, // Optional, type definition for URL path parameters (e.g., :id)
  },
  // ... more route definitions
});
```

### HTTP Routes

```typescript
export const routes = createRoutes({
  // Basic GET request with potential query parameters
  GET_products: {
    path: "/products",
    method: "get",
    query: {
      category: "string",
      minPrice: 0, // Example: number type
      inStock: false, // Example: boolean type
    },
    title: "Get all products",
  },

  // GET request with path parameters
  GET_product_by_id: {
    path: "/products/:id",
    method: "get",
    params: {
      id: "string", // Example: string type for path parameter
    },
    title: "Get product by ID",
  },

  // POST request with a request body, invalidates 'GET_products' cache on success
  CREATE_product: {
    path: "/products",
    method: "post",
    body: {
      name: "string",
      price: 0,
      description: "string",
    },
    invalidates: ["GET_products"], // Invalidate cache for 'GET_products'
    title: "Create a new product",
  },

  // PUT request with path parameters and body, invalidates specific product cache
  UPDATE_product: {
    path: "/products/:id",
    method: "put",
    params: {
      id: "string",
    },
    body: {
      price: 0,
    },
    invalidates: ["GET_products", "GET_product_by_id"], // Invalidate multiple caches
    title: "Update a product",
  },

  // DELETE request with path parameters
  DELETE_product: {
    path: "/products/:id",
    method: "delete",
    params: {
      id: "string",
    },
    invalidates: ["GET_products"], // Invalidate 'GET_products' cache
    title: "Delete a product",
  },

  // Example for file upload (handled via payload.body containing File objects)
  UPLOAD_product_image: {
    path: "/products/:id/image",
    method: "post",
    params: {
      id: "string",
    },
    body: {
      imageFile: {} as File, // Explicitly define as File or File[]
      altText: "string",
    },
    title: "Upload product image",
  },
});
```

### WebSocket Routes

Define a WebSocket route by setting the `method` to `"websocket"`.

```typescript
export const routes = createRoutes({
  WS_chat: {
    path: "/chat",
    method: "websocket",
    title: "Real-time chat",
  },
});
```

### Server-Sent Events (SSE) Routes

Define an SSE route by setting the `method` to `"sse"`.

```typescript
export const routes = createRoutes({
  SSE_notifications: {
    path: "/notifications",
    method: "sse",
    query: {
      userId: "string",
    },
    title: "Event stream for notifications",
  },
});
```

## Making API Calls

Once your `jetflare` instance is initialized, you can call your API endpoints directly using the route names defined in your `routes` object.

### GET Requests

```typescript
// Example: jetflare.GET_users defined with query: { limit: 0, isActive: false }
const usersResponse = await jetflare.GET_users({
  query: {
    limit: 10,
    isActive: true,
  },
});
const usersData = await usersResponse.json();
console.log("Users:", usersData);

// Example: jetflare.GET_product_by_id defined with params: { id: "string" }
const productResponse = await jetflare.GET_product_by_id({
  params: { id: "product_123" },
});
const productData = await productResponse.json();
console.log("Product:", productData);
```

### POST/PUT/PATCH Requests (with Body)

```typescript
// Example: jetflare.CREATE_product defined with body: { name: "string", price: 0 }
const createResponse = await jetflare.CREATE_product({
  body: {
    name: "New Widget",
    price: 29.99,
    description: "A fantastic new product.",
  },
});
const newProduct = await createResponse.json();
console.log("Created product:", newProduct);

// Example: jetflare.UPDATE_product defined with params: { id: "string" }, body: { price: 0 }
const updateResponse = await jetflare.UPDATE_product({
  params: { id: "product_456" },
  body: {
    price: 35.5,
  },
});
const updatedProduct = await updateResponse.json();
console.log("Updated product:", updatedProduct);
```

### DELETE Requests

```typescript
// Example: jetflare.DELETE_product defined with params: { id: "string" }
const deleteResponse = await jetflare.DELETE_product({
  params: { id: "product_789" },
});
if (deleteResponse.ok) {
  console.log("Product deleted successfully.");
}
```

### Request Configuration

Each request accepts an optional `payload` object to configure behavior for that specific call:

```typescript
interface ApiFunctionPayload {
  body?: any; // Request body for POST, PUT, PATCH
  query?: Record<string, any>; // URL query parameters
  params?: Record<string, any>; // URL path parameters (e.g., :id)
  headers?: Record<string, string>; // Additional request headers
  cache?: boolean | { ttl?: number; key?: string }; // Caching options
  timeout?: number; // Request timeout in milliseconds
  retry?: boolean | { attempts?: number; delay?: number }; // Retry configuration
  onUploadProgress?: (progress: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void; // Upload progress callback
  onDownloadProgress?: (progress: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void; // Download progress callback
  signal?: AbortSignal; // For manual request cancellation
}
```

### Response Handling

Jetflare returns an enhanced `JetResponse` object, which wraps the standard `Response` object and adds useful properties:

```typescript
const response = await jetflare.GET_users();

// Standard Response properties
console.log(response.ok); // boolean: True if status is 200-299
console.log(response.status); // number: HTTP status code
console.log(response.statusText); // string: HTTP status message
console.log(response.headers); // Headers object
console.log(response.url); // string: Final URL of the response

// Enhanced properties
console.log(response.cached); // boolean: Was this response eligible for caching?
console.log(response.fromCache); // boolean: Did this response come from the cache?

// Response body methods (asynchronous)
const json = await response.json(); // Parses response as JSON
const text = await response.text(); // Parses response as plain text
const blob = await response.blob(); // Parses response as Blob
const buffer = await response.arrayBuffer(); // Parses response as ArrayBuffer
const formData = await response.formData(); // Parses response as FormData
```

## File Uploads

Jetflare simplifies file uploads by automatically converting `File` or `FileList` objects within your `payload.body` into `FormData`. Progress tracking is available via `onUploadProgress` and `onDownloadProgress`.

```typescript
// Example: jetflare.UPLOAD_product_image defined with body: { imageFile: {} as File, altText: "string" }

// Get a single file from an input element
const fileInput = document.getElementById("imageFile") as HTMLInputElement;
const selectedFile = fileInput.files?.[0];

if (selectedFile) {
  try {
    const uploadResponse = await jetflare.UPLOAD_product_image({
      params: { id: "product_123" },
      body: {
        imageFile: selectedFile, // Pass the File object directly
        altText: "Front view of the product",
      },
      onUploadProgress: (progress) => {
        console.log(`Upload Progress: ${progress.percentage}%`);
        // Update a UI progress bar here
      },
      onDownloadProgress: (progress) => {
        console.log(`Download Progress: ${progress.percentage}%`);
      },
    });

    const uploadResult = await uploadResponse.json();
    console.log("File upload successful:", uploadResult);
  } catch (error) {
    console.error("File upload failed:", error);
  }
}

// Example for multiple files if your route body supports an array of Files
// Route definition might look like:
// UPLOAD_documents: { path: "/documents", method: "post", body: { files: [] as File[], category: "string" } }
const multipleFilesInput = document.getElementById(
  "multipleFiles"
) as HTMLInputElement;
const filesToUpload = multipleFilesInput.files
  ? Array.from(multipleFilesInput.files)
  : [];

if (filesToUpload.length > 0) {
  try {
    const multiUploadResponse = await jetflare.UPLOAD_documents({
      body: {
        files: filesToUpload, // Pass an array of File objects
        category: "manuals",
      },
      onUploadProgress: (progress) => {
        console.log(`Multi-file Upload Progress: ${progress.percentage}%`);
      },
    });
    const multiUploadResult = await multiUploadResponse.json();
    console.log("Multiple files upload successful:", multiUploadResult);
  } catch (error) {
    console.error("Multiple files upload failed:", error);
  }
}
```

### Accessing WebSocket Connections

For WebSocket routes, the generated function returns an object with methods to manage the connection, including direct access to the underlying `WebSocket` instance.

```typescript
// Example: jetflare.WS_chat defined with method: "websocket"
const chatService = jetflare.WS_chat();

// Connect to the WebSocket
chatService.connect();

// Get the raw WebSocket instance for advanced usage
const rawSocket = chatService.socket(); // Access the WebSocket object directly
if (rawSocket) {
  rawSocket.onopen = () => console.log("WebSocket connected directly!");
  rawSocket.onmessage = (event) =>
    console.log("Direct WS message:", event.data);
}

// Use Jetflare's convenience methods for event listening
chatService.on("message", (event) => {
  console.log("Received message:", JSON.parse(event.data));
});

chatService.on("open", () => {
  console.log("WebSocket connection opened!");
  chatService.send({ type: "greeting", message: "Hello from Jetflare!" });
});

chatService.on("close", () => {
  console.log("WebSocket connection closed.");
});

chatService.on("error", (error) => {
  console.error("WebSocket error:", error);
});

// Send data
chatService.send("Plain text message");
chatService.send({ action: "ping", timestamp: Date.now() });

// Close the connection
// chatService.close();
```

### Accessing SSE Connections

For SSE routes, the generated function returns an object with methods to manage the connection, including direct access to the underlying `EventSource` instance.

```typescript
// Example: jetflare.SSE_notifications defined with method: "sse"
const notificationService = jetflare.SSE_notifications({
  query: { userId: "user_abc" },
});

// Connect to the SSE stream
notificationService.connect();

// Get the raw EventSource instance for advanced usage
const rawEventSource = notificationService.event(); // Access the EventSource object directly
if (rawEventSource) {
  rawEventSource.onopen = () => console.log("SSE connection opened directly!");
  rawEventSource.onerror = (error) => console.error("Direct SSE error:", error);
}

// Use Jetflare's convenience methods for event listening
notificationService.on("message", (event) => {
  console.log("New message:", event.data);
});

notificationService.on("user-update", (event) => {
  console.log("User updated:", JSON.parse(event.data));
});

// Close the connection
// notificationService.close();
```

## Advanced Features

### Request Payload Options

All HTTP requests can accept a `payload` object to customize individual request behavior:

```typescript
const response = await jetflare.GET_users({
  headers: { "X-API-Key": "my-secret-key" }, // Custom headers for this request
  cache: { ttl: 60000, key: "recent_users" }, // Cache for 1 minute with a specific key
  timeout: 8000, // Override global timeout to 8 seconds for this request
  retry: { attempts: 3, delay: 500 }, // Retry up to 3 times with 500ms delay between attempts
  // onUploadProgress and onDownloadProgress as shown in File Uploads section
  // signal for manual cancellation (see Request Cancellation)
});
```

### Caching System

Jetflare includes an intelligent caching system primarily for `GET` requests. It automatically caches responses and can invalidate related cache entries when mutation (POST, PUT, PATCH, DELETE) requests succeed.

#### Cache Configuration

```typescript
// Define caching directly in route configuration (static cache key)
export const routes = createRoutes({
  GET_users: {
    path: "/users",
    method: "get",
    cache: { ttl: 300000, key: "all-users-list" }, // Cache for 5 minutes
    title: "Get all users with static cache",
  },
  GET_user_by_id: {
    path: "/users/:id",
    method: "get",
    // Dynamic cache key using path parameters for per-user caching
    cache: { ttl: 60000, key: "user-:id" },
    title: "Get user by ID with dynamic cache",
  },
});

// Override cache behavior per-request
const responseA = await jetflare.GET_users({
  cache: { ttl: 30000 }, // Cache this specific request for 30 seconds
});

const responseB = await jetflare.GET_users({
  cache: false, // Disable caching for this specific request
});
```

#### Cache Invalidation

Define `invalidates` in your route configuration to automatically clear relevant cache entries upon successful mutation. Supports specific keys and patterns.

```typescript
export const routes = createRoutes({
  // ...
  POST_user: {
    path: "/users",
    method: "post",
    invalidates: ["all-users-list"], // Invalidate the 'all-users-list' cache
    title: "Create new user (invalidates user list cache)",
  },
  PUT_user: {
    path: "/users/:id",
    method: "put",
    // Invalidate the specific user and the overall list
    invalidates: ["user-:id", "all-users-list"],
    title: "Update user (invalidates user-specific and list cache)",
  },
});
```

#### Manual Cache Management

You can directly interact with the cache manager through `jetflare.cache`.

```typescript
// Clear all cached entries
jetflare.cache.clear();

// Invalidate specific cache keys or patterns
jetflare.cache.invalidate("all-users-list");
jetflare.cache.invalidate(["user-123", "posts-*"]); // Supports globs with '*'

// Get a cached entry directly
const cachedUsers = jetflare.cache.get("all-users-list");

// Manually set a cache entry
jetflare.cache.set("custom-data", { value: "example" }, 300000); // 5 minutes TTL
```

### Request Retries

Configure automatic retries for failed HTTP requests using the `retry` option in your payload.

```typescript
const response = await jetflare.GET_users({
  retry: {
    attempts: 5, // Attempt the request up to 5 times (1 initial + 4 retries)
    delay: 2000, // Wait 2 seconds between retry attempts
  },
  timeout: 5000, // Each attempt has its own 5-second timeout
});
```

If `retry` is set to `true`, it will default to 1 attempt and 1000ms delay.

### Request Cancellation

Jetflare supports request cancellation using the standard `AbortController` API.

```typescript
const controller = new AbortController();

async function fetchWithCancellation() {
  try {
    const usersPromise = jetflare.GET_users({ signal: controller.signal });

    // Simulate cancelling after some time
    setTimeout(() => {
      console.log("Aborting request...");
      controller.abort();
    }, 100);

    const response = await usersPromise;
    console.log("Request completed:", await response.json());
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Request successfully aborted.");
    } else {
      console.error("Request failed:", error);
    }
  }
}

fetchWithCancellation();
```

### Interceptors

Interceptors allow you to hook into the request and response lifecycle globally to perform actions like logging, authentication, or error handling.

#### Request Interceptors

Executed before a request is sent. They receive the `payload` configuration and can modify it.

```typescript
// Add authentication token to all requests
jetflare.interceptors.request.add((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config; // Always return the config object
});

// Add request logging
jetflare.interceptors.request.add((config) => {
  console.log(
    `Sending request: ${config.route.method.toUpperCase()} ${config.route.path}`
  );
  return config;
});
```

#### Response Interceptors

Executed after a response is received (for both success and error status codes). They receive the `JetResponse` object and can modify it.

```typescript
// Log response status
jetflare.interceptors.response.add((response) => {
  console.log(`Received response: ${response.status} ${response.statusText}`);
  return response; // Always return the response object
});

// Handle global refresh tokens (if needed)
jetflare.interceptors.response.add(async (response) => {
  if (response.status === 401 && !response.url.includes("/refresh-token")) {
    // Logic to refresh token, then potentially retry the original request
    console.warn("Authentication failed, attempting token refresh...");
    // ... call a refresh token endpoint ...
    // Note: Retrying original request within interceptor requires careful handling
  }
  return response;
});
```

#### Error Interceptors

Executed when a request fails (e.g., network error, timeout, or uncaught HTTP error). They receive the `Error` object.

```typescript
// Global error logging and user notification
jetflare.interceptors.error.add((error) => {
  console.error("Jetflare API Error:", error.message);
  // Example: Display a toast notification
  // showToast("An API error occurred: " + error.message, "error");
  return error; // Always re-throw or return the error
});
```

## Configuration

### Global Configuration

You can set default headers, timeouts, and the base URL globally for all requests made by your Jetflare instance.

```typescript
// Set default headers for all HTTP requests
jetflare.setDefaultHeaders({
  "Content-Type": "application/json",
  "X-Client-ID": "my-app-v1",
});

// Set a global timeout for all requests (e.g., 15 seconds)
jetflare.setDefaultTimeout(15000);

// Update the base URL dynamically
jetflare.setBaseURL("https://new-api.example.com/v2");
```

### Fluent API

Jetflare also provides a fluent API for chaining common configuration methods during initialization or later.

```typescript
import { Jetflare, createRoutes } from "jetflare";

const baseRoutes = createRoutes({
  /* ... your routes ... */
});

const jetflare = Jetflare("https://api.example.com", baseRoutes);
```

## Error Handling

Jetflare handles network errors, timeouts, and non-2xx HTTP responses by throwing errors. You should typically wrap your API calls in `try...catch` blocks.

```typescript
try {
  const response = await jetflare.GET_users({ timeout: 2000 }); // Example with timeout
  if (!response.ok) {
    // Handle specific HTTP error responses (e.g., 404, 500)
    const errorData = await response.json().catch(() => null);
    throw new Error(
      `API Error: ${response.status} ${response.statusText} - ${
        errorData?.message || "Unknown error"
      }`
    );
  }
  const data = await response.json();
  console.log("Data fetched:", data);
} catch (error) {
  // Catch network errors, timeouts (AbortError), and custom thrown errors
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      console.error(
        "Request aborted (timeout or manual cancellation):",
        error.message
      );
    } else {
      console.error("Failed to fetch data:", error.message);
    }
  } else {
    console.error("An unexpected error occurred:", error);
  }
}
```

For global error handling, refer to the [Error Interceptors](https://www.google.com/search?q=%23error-interceptors) section.

## API Reference

### `Jetflare(origin: string, routes: routesType): API<routes>`

Initializes the Jetflare client.

- `origin`: The base URL for your API (e.g., "https://www.google.com/url?sa=E\&source=gmail\&q=https://api.example.com").
- `routes`: An object defining your API endpoints.

### `API<routes>` Instance Properties

- `origin: string`: The current base URL of the API client.
- `cache: CacheManager`: Instance of the cache manager for manual cache operations.
- `wsManager: WebSocketManager`: Instance of the WebSocket manager for direct WebSocket control.
- `interceptors`:
  - `request: Set<(config: any) => any>`: Add functions to intercept and modify outgoing request configurations.
  - `response: Set<(response: JetResponse) => JetResponse>`: Add functions to intercept and modify incoming responses.
  - `error: Set<(error: Error) => Error>`: Add functions to intercept and handle errors.

### `API<routes>` Instance Methods

- `setBaseURL(url: string): void`: Sets a new base URL for the API client.
- `setDefaultHeaders(headers: Record<string, string>): void`: Sets/merges default headers for all subsequent requests.
- `setDefaultTimeout(timeout: number): void`: Sets a global timeout in milliseconds for all requests.
- `withAuth(token: string): API<routes>`: A fluent method to set a Bearer token in default headers.
- `withTimeout(timeout: number): API<routes>`: A fluent method to set the default timeout.
- `withBaseURL(url: string): API<routes>`: A fluent method to set the base URL.

### `CacheManager`

- `get(key: string): any | null`: Retrieves data from the cache by key.
- `set(key: string, data: any, ttl?: number): void`: Stores data in the cache with an optional time-to-live (TTL) in milliseconds (defaults to 5 minutes).
- `invalidate(pattern: string | string[]): void`: Invalidates cache entries matching a key or pattern(s). Supports `*` for wildcards.
- `clear(): void`: Clears all entries from the cache.

### `JetResponse` Object

The response object returned by HTTP API calls.

```typescript
interface JetResponse {
  ok: boolean; // True if HTTP status is 200-299
  status: number; // HTTP status code (e.g., 200, 404, 500)
  statusText: string; // HTTP status message (e.g., "OK", "Not Found")
  headers: Headers; // Standard Headers object
  url: string; // The URL of the response
  cached: boolean; // True if the response was eligible for caching
  fromCache: boolean; // True if the response was served from cache

  json<T>(): Promise<T>; // Parses the response body as JSON
  text(): Promise<string>; // Parses the response body as plain text
  blob(): Promise<Blob>; // Parses the response body as a Blob
  arrayBuffer(): Promise<ArrayBuffer>; // Parses the response body as an ArrayBuffer
  formData(): Promise<FormData>; // Parses the response body as FormData
}
```

### `ApiFunctionPayload`

The configuration object passed to individual HTTP API functions.

```typescript
interface ApiFunctionPayload {
  body?: any; // Request body for POST, PUT, PATCH. Supports objects (JSON) or FormData for files.
  query?: Record<string, any>; // URL query parameters (e.g., ?limit=10)
  params?: Record<string, any>; // URL path parameters (e.g., /users/:id -> { id: '123' })
  headers?: Record<string, string>; // Additional headers for this specific request
  cache?: boolean | { ttl?: number; key?: string }; // Override caching behavior for this request
  timeout?: number; // Override global timeout for this request in milliseconds
  retry?: boolean | { attempts?: number; delay?: number }; // Configure retries for this request
  onUploadProgress?: (progress: {
    // Callback for tracking upload progress
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
  onDownloadProgress?: (progress: {
    // Callback for tracking download progress
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
  signal?: AbortSignal; // An AbortSignal to manually cancel the request
}
```

## Examples

For more comprehensive examples, see the [Examples directory](https://www.google.com/search?q=https://github.com/codedynasty-dev/jetflare/tree/main/examples) in the GitHub repository.

### Complete User Management Example

This example demonstrates integrating multiple Jetflare features for a user management service.

```typescript
import { Jetflare, createRoutes } from "jetflare";

// Define user-related API routes
const userRoutes = createRoutes({
  GET_all_users: {
    path: "/users",
    method: "get",
    cache: { ttl: 300000, key: "all-users-list" }, // Cache for 5 mins
    title: "Retrieve all users",
  },
  GET_user_by_id: {
    path: "/users/:id",
    method: "get",
    params: { id: "string" },
    cache: { ttl: 60000, key: "user-:id" }, // Cache per user for 1 min
    title: "Retrieve user by ID",
  },
  POST_new_user: {
    path: "/users",
    method: "post",
    body: { name: "string", email: "string", password: "string" },
    invalidates: ["all-users-list"], // Invalidate user list cache
    title: "Create a new user",
  },
  PUT_update_user: {
    path: "/users/:id",
    method: "put",
    params: { id: "string" },
    body: { name: "string", email: "string" },
    invalidates: ["all-users-list", "user-:id"], // Invalidate user list and specific user cache
    title: "Update an existing user",
  },
  DELETE_user: {
    path: "/users/:id",
    method: "delete",
    params: { id: "string" },
    invalidates: ["all-users-list", "user-:id"], // Invalidate user list and specific user cache
    title: "Delete a user",
  },
  UPLOAD_user_avatar: {
    path: "/users/:id/avatar",
    method: "post",
    params: { id: "string" },
    body: { avatar: {} as File, description: "string" }, // File upload with additional data
    invalidates: ["user-:id"], // Invalidate specific user cache
    title: "Upload user avatar",
  },
});

// Initialize Jetflare instance with authentication and a global timeout
const jetflareApi = Jetflare(
  "[https://api.yourapp.com](https://api.yourapp.com)",
  userRoutes
)
  .withAuth("your-static-jwt-token-here") // Or fetch dynamically and set via interceptor
  .withTimeout(20000); // 20 seconds global timeout

// Define a service class for user-related operations
class UserService {
  async getAllUsers(page: number = 1, limit: number = 10) {
    const response = await jetflareApi.GET_all_users({
      query: { page, limit },
    });
    return response.json();
  }

  async getUserById(id: string) {
    const response = await jetflareApi.GET_user_by_id({ params: { id } });
    return response.json();
  }

  async createUser(data: { name: string; email: string; password?: string }) {
    const response = await jetflareApi.POST_new_user({ body: data });
    return response.json();
  }

  async updateUser(id: string, updates: { name?: string; email?: string }) {
    const response = await jetflareApi.PUT_update_user({
      params: { id },
      body: updates,
    });
    return response.json();
  }

  async deleteUser(id: string) {
    const response = await jetflareApi.DELETE_user({ params: { id } });
    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.statusText}`);
    }
    return response.ok;
  }

  async uploadUserAvatar(
    userId: string,
    avatarFile: File,
    description: string,
    onProgress?: (p: {
      loaded: number;
      total: number;
      percentage: number;
    }) => void
  ) {
    const response = await jetflareApi.UPLOAD_user_avatar({
      params: { id: userId },
      body: { avatar: avatarFile, description },
      onUploadProgress: onProgress, // Pass the progress callback
    });
    return response.json();
  }
}

export const userService = new UserService();

// Example Usage (in a React component or utility)
async function runUserExamples() {
  try {
    // Fetch all users
    const users = await userService.getAllUsers(1, 5);
    console.log("Fetched users:", users);

    // Fetch a specific user
    const singleUser = await userService.getUserById("user-abc-123");
    console.log("Fetched single user:", singleUser);

    // Create a new user
    const newUser = await userService.createUser({
      name: "Test User",
      email: "test@example.com",
      password: "securepassword",
    });
    console.log("Created user:", newUser);

    // Update a user
    const updatedUser = await userService.updateUser(newUser.id, {
      email: "new.test@example.com",
    });
    console.log("Updated user:", updatedUser);

    // Upload an avatar for a user
    const dummyFile = new File(["dummy content"], "avatar.png", {
      type: "image/png",
    });
    const uploadResult = await userService.uploadUserAvatar(
      newUser.id,
      dummyFile,
      "Profile picture",
      (p) => {
        console.log(`Avatar upload: ${p.percentage}%`);
      }
    );
    console.log("Avatar upload result:", uploadResult);

    // Delete a user
    const deleted = await userService.deleteUser(newUser.id);
    console.log("User deleted:", deleted);
  } catch (error) {
    console.error("User service example failed:", error);
  }
}

runUserExamples();
```

### Real-time Chat Example

Demonstrates how to use WebSockets for a real-time chat application.

```typescript
import { Jetflare, createRoutes } from "jetflare";

const chatRoutes = createRoutes({
  WS_chat_room: {
    path: "/chat/:roomId",
    method: "websocket",
    title: "Real-time chat room connection",
  },
  POST_chat_message: {
    path: "/chat/:roomId/messages",
    method: "post",
    params: { roomId: "string" },
    body: { message: "string", senderId: "string" },
    title: "Send chat message (via REST for history)",
  },
});

const jetflareChat = Jetflare("ws://localhost:8080", chatRoutes); // Use ws:// for WebSocket

class ChatService {
  private wsConnection: ReturnType<typeof jetflareChat.WS_chat_room> | null =
    null;
  private currentRoomId: string | null = null;

  joinRoom(roomId: string, onMessageReceived: (message: any) => void) {
    if (this.wsConnection && this.currentRoomId === roomId) {
      console.log(`Already connected to room ${roomId}`);
      return;
    }

    this.leaveRoom(); // Close any existing connection

    this.currentRoomId = roomId;
    this.wsConnection = jetflareChat.WS_chat_room({ params: { roomId } });

    // Connect to the WebSocket
    this.wsConnection.connect();

    // Set up event handlers
    this.wsConnection.on("open", () => {
      console.log(`Connected to room ${roomId}`);
      // Send a "join" message or other initial handshake
      this.wsConnection?.send(JSON.stringify({ type: "join", roomId }));
    });

    this.wsConnection.on("message", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessageReceived(data); // Callback for UI updates
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    });

    this.wsConnection.on("close", () => {
      console.log("Disconnected from chat.");
      this.currentRoomId = null;
    });

    this.wsConnection.on("error", (error: Event) => {
      console.error("WebSocket error:", error);
    });
  }

  sendMessage(message: string, senderId: string) {
    if (this.wsConnection && this.currentRoomId) {
      this.wsConnection.send(
        JSON.stringify({
          type: "chat",
          roomId: this.currentRoomId,
          senderId,
          content: message,
          timestamp: new Date().toISOString(),
        })
      );
      // Also send via REST for message history persistence (optional)
      jetflareChat
        .POST_chat_message({
          params: { roomId: this.currentRoomId },
          body: { message, senderId },
        })
        .catch((err) => console.error("Failed to post message via REST:", err));
    } else {
      console.warn("Not connected to a chat room.");
    }
  }

  leaveRoom() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
      console.log("Left current chat room.");
    }
  }
}

const chatService = new ChatService();

// Example Usage:
chatService.joinRoom("general-chat", (message) => {
  console.log("New chat message:", message);
  // Update your UI with the new message
});

setTimeout(() => {
  chatService.sendMessage("Hello everyone!", "user-456");
}, 2000);

setTimeout(() => {
  chatService.leaveRoom();
}, 10000);
```

---

## Contributing

We welcome contributions to Jetflare\! Please read our [contributing guidelines](./CONTRIBUTING.md) for details on how to submit pull requests, report bugs, and suggest features.

## License

Jetflare is licensed under the MIT License. See the LICENSE file for more details.
