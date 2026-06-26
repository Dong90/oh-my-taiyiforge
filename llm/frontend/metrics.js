/* 沟通翻译助手 - 指标面板 */
const METRICS_API = "http://localhost:8000/api/metrics";
let metricsInterval = null;

async function fetchMetrics() {
    try {
        const response = await fetch(METRICS_API);
        if (!response.ok) throw new Error("获取指标失败");
        const data = await response.json();
        renderMetrics(data);
    } catch (err) {
        console.error("Metrics error:", err);
    }
}

function renderMetrics(data) {
    const t = data.translation || {};

    // Summary cards
    document.querySelector("#metric-total .metric-value").textContent =
        t.total_translations ?? "-";
    document.querySelector("#metric-success .metric-value").textContent =
        t.success_count ?? "-";
    document.querySelector("#metric-avg-time .metric-value").textContent =
        t.avg_response_time_ms != null ? Math.round(t.avg_response_time_ms) : "-";
    document.querySelector("#metric-chars .metric-value").textContent =
        t.total_characters != null ? t.total_characters.toLocaleString() : "-";

    // Direction table
    const directionBody = document.getElementById("direction-body");
    const d = data.direction || {};
    const directionNames = {
        product_to_dev: "产品 → 开发",
        dev_to_product: "开发 → 产品",
        dev_to_ops: "开发 → 运营",
        ops_to_dev: "运营 → 开发",
        product_to_ops: "产品 → 运营",
        ops_to_product: "运营 → 产品",
    };

    let html = "";
    for (const [key, name] of Object.entries(directionNames)) {
        const count = d[key] ?? 0;
        html += `<tr><td>${name}</td><td>${count}</td></tr>`;
    }
    directionBody.innerHTML = html;
}

// Auto-refresh metrics every 30s
document.querySelector('[data-tab="metrics"]').addEventListener("click", () => {
    fetchMetrics();
    metricsInterval = setInterval(fetchMetrics, 30000);
});

document.querySelector('[data-tab="translate"]').addEventListener("click", () => {
    if (metricsInterval) {
        clearInterval(metricsInterval);
        metricsInterval = null;
    }
});
