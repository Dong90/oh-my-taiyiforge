const API_BASE = 'http://localhost:8000';

const $ = id => document.getElementById(id);
const textarea = $('text');
const direction = $('direction');
const resultCard = $('result-card');
const resultDiv = $('result');
const errorCard = $('error-card');
const errorMsg = $('error-message');

function setLoading(btn, loading) {
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = '<span class="spinner"></span>处理中…';
  } else {
    btn.textContent = btn.dataset.orig;
  }
}

function showResult(text) {
  errorCard.style.display = 'none';
  resultCard.style.display = 'block';
  resultDiv.textContent = text;
}

function showError(msg) {
  resultCard.style.display = 'none';
  errorCard.style.display = 'block';
  errorMsg.textContent = msg;
}

async function translate(stream = false) {
  const text = textarea.value.trim();
  if (!text) { showError('请输入需要翻译的内容'); return; }

  const btn = stream ? $('btn-stream') : $('btn-translate');
  if (btn.disabled) return;

  setLoading(btn, true);
  resultCard.style.display = 'none';
  errorCard.style.display = 'none';

  const body = JSON.stringify({ text, direction: direction.value });

  try {
    if (stream) {
      const resp = await fetch(`${API_BASE}/api/translation/translate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!resp.ok) {
        const err = await resp.json();
        showError(err.error?.message || `HTTP ${resp.status}`);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
      resultCard.style.display = 'block';
      resultDiv.textContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              result += parsed.text || parsed.chunk || '';
              resultDiv.textContent = result;
            } catch { /* skip malformed */ }
          }
        }
      }
    } else {
      const resp = await fetch(`${API_BASE}/api/translation/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!resp.ok) {
        const err = await resp.json();
        showError(err.error?.message || `HTTP ${resp.status}`);
        return;
      }
      const data = await resp.json();
      showResult(data.text || JSON.stringify(data, null, 2));
    }
  } catch (err) {
    showError(`连接失败: ${err.message}`);
  } finally {
    setLoading(btn, false);
  }
}

$('btn-translate').addEventListener('click', () => translate(false));
$('btn-stream').addEventListener('click', () => translate(true));
$('btn-copy').addEventListener('click', () => {
  navigator.clipboard.writeText(resultDiv.textContent).then(() => {
    const btn = $('btn-copy');
    btn.textContent = '✅ 已复制';
    setTimeout(() => { btn.textContent = '📋 复制'; }, 1500);
  });
});

// Enter to translate (Shift+Enter for newline)
textarea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    translate(false);
  }
});
