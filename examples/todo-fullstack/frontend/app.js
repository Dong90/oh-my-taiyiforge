const API = "http://localhost:3001";

let todos = [];

async function fetchTodos() {
  const res = await fetch(`${API}/api/todos`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function createTodo(title) {
  const res = await fetch(`${API}/api/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function updateTodo(id, fields) {
  const res = await fetch(`${API}/api/todos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function deleteTodo(id) {
  const res = await fetch(`${API}/api/todos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

function renderTodos() {
  const list = document.getElementById("todoList");
  if (todos.length === 0) {
    list.innerHTML = '<li class="empty-state">暂无待办</li>';
    return;
  }
  list.innerHTML = todos
    .map(
      (t) => `
    <li class="todo-item${t.completed ? " completed" : ""}" data-id="${t.id}">
      <input type="checkbox" class="todo-checkbox" ${t.completed ? "checked" : ""} aria-label="标记完成">
      <span class="todo-text">${escapeHtml(t.title)}</span>
      <button class="delete-btn" aria-label="删除">✕</button>
    </li>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(msg) {
  const bar = document.getElementById("errorBar");
  bar.textContent = msg;
  bar.style.display = "block";
  setTimeout(() => (bar.style.display = "none"), 3000);
}

async function loadTodos() {
  const list = document.getElementById("todoList");
  list.innerHTML = '<li class="loading-state">加载中...</li>';
  try {
    todos = await fetchTodos();
    renderTodos();
  } catch (e) {
    showError("加载失败：" + e.message);
    todos = [];
    renderTodos();
  }
}

document.getElementById("addBtn").addEventListener("click", handleAdd);
document.getElementById("todoInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAdd();
});

async function handleAdd() {
  const input = document.getElementById("todoInput");
  const title = input.value.trim();
  if (!title) return;
  input.value = "";
  try {
    const todo = await createTodo(title);
    todos.push(todo);
    renderTodos();
  } catch (e) {
    showError("添加失败：" + e.message);
  }
}

document.getElementById("todoList").addEventListener("click", async (e) => {
  const item = e.target.closest(".todo-item");
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.classList.contains("delete-btn")) {
    try {
      await deleteTodo(id);
      todos = todos.filter((t) => t.id !== id);
      renderTodos();
    } catch (e) {
      showError("删除失败：" + e.message);
    }
    return;
  }

  if (e.target.classList.contains("todo-checkbox")) {
    try {
      const updated = await updateTodo(id, { completed: e.target.checked });
      const idx = todos.findIndex((t) => t.id === id);
      if (idx !== -1) todos[idx] = updated;
      renderTodos();
    } catch (e) {
      showError("更新失败：" + e.message);
      loadTodos();
    }
  }
});

loadTodos();
