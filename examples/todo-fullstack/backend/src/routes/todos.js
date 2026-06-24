import { Router } from "express";

export default function createTodoRoutes(store) {
  const router = Router();

  router.get("/", (req, res) => {
    res.json(store.getAll());
  });

  router.get("/:id", (req, res) => {
    const todo = store.get(req.params.id);
    if (!todo) return res.status(404).json({ error: "Not found" });
    res.json(todo);
  });

  router.post("/", (req, res) => {
    const { title } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    const todo = store.create(title.trim());
    res.status(201).json(todo);
  });

  router.put("/:id", (req, res) => {
    const fields = {};
    if (req.body.title !== undefined) fields.title = req.body.title;
    if (req.body.completed !== undefined) fields.completed = !!req.body.completed;
    const todo = store.update(req.params.id, fields);
    if (!todo) return res.status(404).json({ error: "Not found" });
    res.json(todo);
  });

  router.delete("/:id", (req, res) => {
    if (!store.delete(req.params.id)) {
      return res.status(404).json({ error: "Not found" });
    }
    res.status(204).end();
  });

  return router;
};
