const API_BASE = 'http://localhost:8000';

const DIR_NAMES = {
  product_to_dev: '产品经理 → 开发工程师',
  dev_to_product: '开发工程师 → 产品经理',
  dev_to_ops: '开发工程师 → 运营',
  ops_to_dev: '运营 → 开发工程师',
  product_to_ops: '产品经理 → 运营',
  ops_to_product: '运营 → 产品经理',
};

async function fetchMetrics() {
  try {
    const resp = await fetch(`${API_BASE}/api/metrics`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    return { error: err.message };
  }
}

function render(data) {
  if (data.error) {
    document.getElementById('directions-table').innerHTML =
      `<p class="card-desc" style="color:#dc2626">连接失败: ${data.error}</p>`;
    return;
  }

  document.getElementById('total-translations').textContent = data.total_translations ?? 0;
  document.getElementById('avg-duration').textContent = data.avg_duration_ms
    ? `${Math.round(data.avg_duration_ms)}ms` : '—';
  document.getElementById('max-duration').textContent = data.max_duration_ms
    ? `${Math.round(data.max_duration_ms)}ms` : '—';

  const container = document.getElementById('directions-table');
  const directions = data.directions || {};
  const keys = Object.keys(directions);

  if (keys.length === 0) {
    container.innerHTML = '<p class="card-desc">暂无数据</p>';
    return;
  }

  container.innerHTML = keys.map(key => {
    const d = directions[key];
    const name = DIR_NAMES[key] || key;
    return `<div class="direction-row">
      <span class="direction-name">${name}</span>
      <span class="direction-stats">${d.count} 次 · 平均 ${Math.round(d.avg_duration_ms)}ms</span>
    </div>`;
  }).join('');
}

document.getElementById('btn-refresh').addEventListener('click', async () => {
  const btn = document.getElementById('btn-refresh');
  btn.disabled = true;
  btn.textContent = '⏳ 刷新中…';
  const data = await fetchMetrics();
  render(data);
  btn.disabled = false;
  btn.textContent = '🔄 刷新';
});

// Auto-load on page enter
fetchMetrics().then(render);
