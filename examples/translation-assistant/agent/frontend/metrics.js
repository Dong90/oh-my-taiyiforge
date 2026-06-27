async function loadMetrics() {
  try {
    const res = await fetch(`${API_BASE}/api/metrics`);
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("metric-count").textContent = data.total_translations || 0;
    document.getElementById("metric-avg").textContent = data.avg_response_time_ms || 0;
  } catch {
    // metrics not available, ignore
  }
}

loadMetrics();
setInterval(loadMetrics, 10000);
