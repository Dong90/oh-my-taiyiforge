import crypto from "node:crypto";

export default class TodoStore {
  constructor() {
    this._todos = new Map();
  }

  getAll() {
    return [...this._todos.values()];
  }

  get(id) {
    return this._todos.get(id) ?? null;
  }

  create(title) {
    const todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    this._todos.set(todo.id, todo);
    return todo;
  }

  update(id, fields) {
    const todo = this._todos.get(id);
    if (!todo) return null;
    Object.assign(todo, fields);
    return todo;
  }

  delete(id) {
    return this._todos.delete(id);
  }
}
