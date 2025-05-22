import { Jetflare } from "./dist/index.js";

// Define your API routes
export const routes = {
  GET_users: {
    path: "/users",
    method: "get",
    title: "Get all users",
    query: {},
    params: {},
    body: {
      name: "string",
      age: "number",
    },
  },
  POST_user: {
    path: "/users",
    method: "post",
    title: "Create new user",
    query: {},
    params: {},
  },
} as const;

const jetflare = Jetflare("https://api.example.com", routes);

jetflare
  .GET_users()
  .then((response) => {
    console.log(response);
  })
  .catch((error) => {
    console.error(error);
  });
