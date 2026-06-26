import express from "express";
import TodoStore from "./store.js";
import createTodoRoutes from "./routes/todos.js";

const app = express();
const store = new TodoStore();

app.use(express.json());

app.use("/api/todos", createTodoRoutes(store));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3001;

// Only listen when run directly (not when imported by test)
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  app.listen(PORT, () => {
    console.log(`Todo API running on http://localhost:${PORT}`);
  });
}

export default app;
