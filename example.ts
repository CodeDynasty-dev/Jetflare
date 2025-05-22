import { Jetflare, createRoutes } from "./dist/index.js";

// Define your API routes
export const routes = {
  GET_users: {
    path: "/users",
    method: "get",
    title: "Get all users",
    query: {
      id: "string",
      limit: 0,
      isActive: false,
      tags: [] as string[],
    },
  },
  GET_user_by_id: {
    path: "/users/:id",
    method: "get",
    params: {
      id: "string",
    },
    query: {
      includePosts: false,
    },
  },
  POST_user: {
    path: "/users",
    method: "post",
    title: "Create new user",
    body: {
      name: "string",
      email: "string",
      age: 0,
      address: {
        street: "string",
        city: "string",
      },
    },
    query: {
      dryRun: false,
    },
  },
  PUT_user_by_id: {
    path: "/users/:id",
    method: "put",
    params: {
      id: "string",
    },
    body: {
      name: "string",
      email: "string",
    },
  },
  DELETE_user_by_id: {
    path: "/users/:id",
    method: "delete",
    params: {
      id: "string",
    },
  },
  WS_chat: {
    path: "/chat",
    method: "websocket",
  },
  SSE_updates: {
    path: "/updates",
    method: "sse",
    query: {
      topic: "string",
    },
  },
} as const; // <-- KEEP this 'as const' if defined separately,
// or remove it if you pass it directly to createRoutes()

const jetflare = Jetflare("https://api.example.com", createRoutes(routes));

// Examples of how the new types enforce usage:

// GET request - query params are enforced
jetflare
  .GET_users({
    query: {
      id: "123",
      limit: 10, // This should now work!
      isActive: true,
      tags: ["admin", "developer"],
      //   invalidParam: true, // This would still be a type error!
    },
    // body: {} // This would still be a type error!
  })
  .then((response) => {
    console.log("GET_users response:", response);
  })
  .catch((error) => {
    console.error("GET_users error:", error);
  });

// GET request with params - params are enforced
jetflare
  .GET_user_by_id({
    params: {
      id: "user123",
      // anotherParam: "abc" // Type error: anotherParam is not defined
    },
    query: {
      includePosts: true,
    },
  })
  .then((response) => response.json())
  .then((data) => console.log("GET_user_by_id data:", data))
  .catch((error) => console.error("GET_user_by_id error:", error));

// POST request - body and query are enforced
jetflare
  .POST_user({
    body: {
      name: "John Doe",
      email: "john.doe@example.com",
      age: 30,
      address: {
        street: "123 Main St",
        city: "Any town",
      },
      // extraField: "value" // This would still be a type error!
    },
    query: {
      dryRun: false,
    },
  })
  .then((response) => {
    console.log("POST_user response:", response);
  })
  .catch((error) => {
    console.error("POST_user error:", error);
  });

// PUT request - body and params enforced
jetflare
  .PUT_user_by_id({
    params: {
      id: "user456",
    },
    body: {
      name: "Jane Doe Updated",
      email: "jane.doe.updated@example.com",
    },
  })
  .then((response) => console.log("PUT_user_by_id response:", response))
  .catch((error) => console.error("PUT_user_by_id error:", error));

// DELETE request - params enforced, no body allowed
jetflare
  .DELETE_user_by_id({
    params: {
      id: "user789",
    },
    // body: { data: "test" } // Type error: Body not allowed for DELETE
  })
  .then((response) => console.log("DELETE_user_by_id response:", response))
  .catch((error) => console.error("DELETE_user_by_id error:", error));

// WebSocket example
const chatWs = jetflare.WS_chat();
chatWs.connect();
chatWs.on("open", () => console.log("WebSocket connected!"));
chatWs.send("Hello from client!");
chatWs.close();

// SSE example
const sse = jetflare.SSE_updates({ query: { topic: "news" } });
sse.connect();
sse.on("message", (event) => console.log("SSE message:", event.data));
sse.on("custom-event", (event) => console.log("Custom event:", event.data));
sse.on("close", () => console.log("SSE connection closed."));
sse.close();
