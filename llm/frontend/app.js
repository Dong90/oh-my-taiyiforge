/* 沟通翻译助手 - 应用逻辑 */
const API_BASE = "http://localhost:8000";

// DOM references
const sourceText = document.getElementById("source-text");
const directionSelect = document.getElementById("direction-select");
const streamCheck = document.getElementById("stream-check");
const translateBtn = document.getElementById("translate-btn");
const outputArea = document.getElementById("output-area");
const directionBadge = document.getElementById("direction-badge");
const loadingIndicator = document.getElementById("loading-indicator");
const errorMessage = document.getElementById("error-message");

// Direction display mapping
const DIRECTION_NAMES = {
    product_to_dev: "产品 → 开发",
    dev_to_product: "开发 → 产品",
    dev_to_ops: "开发 → 运营",
    ops_to_dev: "运营 → 开发",
    product_to_ops: "产品 → 运营",
    ops_to_product: "运营 → 产品",
};

// Tab switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add("active");
    });
});

// Direction change
directionSelect.addEventListener("change", () => {
    const dir = directionSelect.value;
    directionBadge.textContent = DIRECTION_NAMES[dir] || dir;
    directionBadge.className = `direction-badge ${dir}`;
});

// Translate
translateBtn.addEventListener("click", async () => {
    const text = sourceText.value.trim();
    if (!text) {
        showError("请输入要翻译的文本");
        return;
    }

    const direction = directionSelect.value;
    const useStream = streamCheck.checked;

    translateBtn.disabled = true;
    hideError();
    showLoading();

    if (useStream) {
        await translateStream(text, direction);
    } else {
        await translateFull(text, direction);
    }

    translateBtn.disabled = false;
    hideLoading();
});

async function translateFull(text, direction) {
    try {
        const response = await fetch(`${API_BASE}/api/translation/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, direction }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "翻译失败");
        }

        const data = await response.json();
        outputArea.innerHTML = "";
        outputArea.textContent = data.translated_text;
        updateBadge(direction);
    } catch (err) {
        showError(err.message);
    }
}

async function translateStream(text, direction) {
    try {
        const response = await fetch(`${API_BASE}/api/translation/translate/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, direction }),
        });

        if (!response.ok) {
            throw new Error("流式翻译请求失败");
        }

        outputArea.innerHTML = "";
        updateBadge(direction);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") return;
                    if (data === "[ERROR]") {
                        showError("流式翻译出错");
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.chunk) {
                            outputArea.textContent += parsed.chunk;
                        }
                    } catch {
                        // ignore parse errors on partial chunks
                    }
                }
            }
        }
    } catch (err) {
        showError(err.message);
    }
}

function showLoading() {
    loadingIndicator.classList.remove("hidden");
}

function hideLoading() {
    loadingIndicator.classList.add("hidden");
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove("hidden");
}

function hideError() {
    errorMessage.classList.add("hidden");
}

function updateBadge(direction) {
    directionBadge.textContent = DIRECTION_NAMES[direction] || direction;
    directionBadge.className = `direction-badge ${direction}`;
}

// Init direction badge
directionBadge.textContent = DIRECTION_NAMES[directionSelect.value];
directionBadge.className = `direction-badge ${directionSelect.value}`;
