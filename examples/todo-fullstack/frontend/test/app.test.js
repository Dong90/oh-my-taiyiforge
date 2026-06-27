import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf-8");

describe("Todo UI", () => {
  let dom;
  let window;
  let document;

  let originalFetch;

  before(() => {
    dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost:3001" });
    window = dom.window;
    document = window.document;
    originalFetch = global.fetch;
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
  });

  after(() => {
    global.fetch = originalFetch;
    window.close();
  });

  it("renders heading", () => {
    const h1 = document.querySelector("h1");
    assert.equal(h1.textContent, "Todos");
  });

  it("has input and add button", () => {
    const input = document.getElementById("todoInput");
    const btn = document.getElementById("addBtn");
    assert.ok(input);
    assert.ok(btn);
  });
});
