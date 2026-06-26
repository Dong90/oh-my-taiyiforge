const API_BASE = "http://localhost:8000";

const directionEl = document.getElementById("direction");
const inputEl = document.getElementById("input-text");
const translateBtn = document.getElementById("translate-btn");
const streamCheck = document.getElementById("stream-mode");
const resultArea = document.getElementById("result-area");
const resultContent = document.getElementById("result-content");
const retryBtn = document.getElementById("retry-btn");

function updateButtonState() {
  translateBtn.disabled = inputEl.value.trim().length === 0;
}

inputEl.addEventListener("input", updateButtonState);

async function doTranslate() {
  const direction = directionEl.value;
  const text = inputEl.value.trim();
  if (!text) return;

  translateBtn.disabled = true;
  translateBtn.innerHTML = '<span class="spinner"></span>翻译中...';
  resultArea.hidden = false;
  resultContent.className = "result-content";
  resultContent.textContent = "";
  retryBtn.hidden = true;

  try {
    if (streamCheck.checked) {
      await doStreamTranslate(direction, text);
    } else {
      await doStandardTranslate(direction, text);
    }
  } catch (err) {
    resultContent.className = "result-content error";
    resultContent.textContent = `错误：${err.message}`;
    retryBtn.hidden = false;
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = "翻译";
    updateButtonState();
  }
}

async function doStandardTranslate(direction, text) {
  const res = await fetch(`${API_BASE}/api/translation/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction, text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  resultContent.textContent = data.result;
}

async function doStreamTranslate(direction, text) {
  const res = await fetch(`${API_BASE}/api/translation/translate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction, text }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        resultContent.textContent += line.slice(6);
      }
    }
  }
}

translateBtn.addEventListener("click", doTranslate);
retryBtn.addEventListener("click", doTranslate);
