import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/index.js";

const PORT = 3001;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { method, hostname: "localhost", port: PORT, path, headers: { "Content-Type": "application/json" } };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe("Todo API", () => {
  let server;

  before(() => {
    server = http.createServer(app);
    server.listen(PORT);
  });

  after(() => {
    server.close();
  });

  it("GET /api/health returns ok", async () => {
    const res = await request("GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
  });

  it("GET /api/todos returns empty array", async () => {
    const res = await request("GET", "/api/todos");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it("POST /api/todos creates a todo", async () => {
    const res = await request("POST", "/api/todos", { title: "Test" });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, "Test");
    assert.equal(res.body.completed, false);
    assert(res.body.id);
  });

  it("POST /api/todos rejects empty title", async () => {
    const res = await request("POST", "/api/todos", { title: "" });
    assert.equal(res.status, 400);
  });

  it("GET /api/todos/:id returns single todo", async () => {
    const created = await request("POST", "/api/todos", { title: "Get me" });
    const res = await request("GET", `/api/todos/${created.body.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.title, "Get me");
  });

  it("PUT /api/todos/:id updates todo", async () => {
    const created = await request("POST", "/api/todos", { title: "Update me" });
    const res = await request("PUT", `/api/todos/${created.body.id}`, { completed: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.completed, true);
  });

  it("DELETE /api/todos/:id removes todo", async () => {
    const created = await request("POST", "/api/todos", { title: "Delete me" });
    const del = await request("DELETE", `/api/todos/${created.body.id}`);
    assert.equal(del.status, 204);
    const get = await request("GET", `/api/todos/${created.body.id}`);
    assert.equal(get.status, 404);
  });

  it("GET /api/todos/:id returns 404 for missing", async () => {
    const res = await request("GET", "/api/todos/nonexistent");
    assert.equal(res.status, 404);
  });
});
