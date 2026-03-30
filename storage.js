// ─── Storage durável — Supabase (primário) + localStorage + MEM ──────────────
// v4.0: ETag polling — só recarrega quando versão muda no banco

export const SUPABASE_URL  = "https://ogbjhtrrturarxxxkwlg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_PiAtSf5DzNV0dYdNHv1_XA_lQ9pPwDC";

export let _sbLive = false;
export const _sbReady = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// [M-P1] AbortController — timeout 8s em toda chamada
const _SB_TIMEOUT = 8000;
function _sbFetchWithTimeout(url, opts) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), _SB_TIMEOUT);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(tid));
}

export function _sbHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + SUPABASE_ANON_KEY,
    ...extra,
  };
}

export async function _sbTestConnection() {
  if (!_sbReady) return false;
  try {
    const res = await _sbFetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/cgel_store?select=chave&limit=1`,
      { headers: _sbHeaders() }
    );
    _sbLive = res.ok;
    return _sbLive;
  } catch { _sbLive = false; return false; }
}
_sbTestConnection();

export async function _sbFetch(method, chave, valor) {
  if (!_sbReady) return null;
  try {
    if (method === "GET") {
      const res = await _sbFetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/cgel_store?chave=eq.${encodeURIComponent(chave)}&select=valor`,
        { headers: _sbHeaders() }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.length ? data[0].valor : null;
    }
    if (method === "POST") {
      const res = await _sbFetchWithTimeout(`${SUPABASE_URL}/rest/v1/cgel_store`, {
        method: "POST",
        headers: _sbHeaders({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify({ chave, valor, atualizado_em: new Date().toISOString() }),
      });
      if (res.ok) _sbLive = true;
      return res.ok;
    }
    if (method === "DELETE") {
      const res = await _sbFetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/cgel_store?chave=eq.${encodeURIComponent(chave)}`,
        { method: "DELETE", headers: _sbHeaders() }
      );
      return res.ok;
    }
    if (method === "LIST") {
      const res = await _sbFetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/cgel_store?chave=like.${encodeURIComponent(chave)}*&select=chave,valor&order=atualizado_em.asc&limit=10000`,
        { headers: _sbHeaders() }
      );
      if (!res.ok) return null;
      _sbLive = true;
      return await res.json();
    }
    // [v4.0] HIST — tabela separada cgel_historico
    if (method === "HIST_LIST") {
      const res = await _sbFetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/cgel_historico?select=*&order=num_processo.asc&limit=10000`,
        { headers: _sbHeaders() }
      );
      if (!res.ok) return null;
      return await res.json();
    }
    if (method === "HIST_POST") {
      const res = await _sbFetchWithTimeout(`${SUPABASE_URL}/rest/v1/cgel_historico`, {
        method: "POST",
        headers: _sbHeaders({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(valor), // valor é o objeto de histórico aqui
      });
      return res.ok;
    }
  } catch { return null; }
}

const MEM = {};
export const ST = {
  async get(k) {
    if (_sbReady) {
      try {
        const raw = await _sbFetch("GET", k);
        if (raw !== null) {
          try { localStorage.setItem("cgel_" + k, raw); } catch {}
          return JSON.parse(raw);
        }
      } catch {}
    }
    try {
      const raw = localStorage.getItem("cgel_" + k);
      if (raw !== null) return JSON.parse(raw);
    } catch {}
    return MEM[k] ?? null;
  },

  async set(k, v) {
    MEM[k] = v;
    const serialized = JSON.stringify(v);
    let cloud = false;
    if (_sbReady) {
      try {
        const result = await _sbFetch("POST", k, serialized);
        cloud = result === true;
        if (cloud) {
          _sbLive = true;
          // [v4.0 ETag] Incrementa versão global a cada gravação
          _incrementarVersao();
        }
      } catch {}
    }
    try { localStorage.setItem("cgel_" + k, serialized); } catch {}
    return { ok: true, cloud };
  },

  async del(k) {
    delete MEM[k];
    if (_sbReady) { try { await _sbFetch("DELETE", k); } catch {} }
    try { localStorage.removeItem("cgel_" + k); } catch {}
    return true;
  },

  async list(prefix) {
    if (_sbReady) {
      try {
        const rows = await _sbFetch("LIST", prefix);
        if (rows !== null) {
          rows.forEach(r => {
            try { localStorage.setItem("cgel_" + r.chave, r.valor); } catch {}
          });
          return rows
            .filter(r => r.valor)
            .map(r => {
              try { return { key: r.chave, value: JSON.parse(r.valor) }; }
              catch { return null; }
            })
            .filter(Boolean);
        }
      } catch {}
    }
    try {
      const results = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cgel_" + prefix)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try { results.push({ key: k.slice(5), value: JSON.parse(raw) }); } catch {}
          }
        }
      }
      if (results.length) return results;
    } catch {}
    return Object.entries(MEM)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({ key: k, value: v }));
  },

  async del_prefix(prefix) {
    const rows = await this.list(prefix);
    await Promise.all(rows.map(r => this.del(r.key)));
  },

  // [v4.0] Salva histórico na tabela separada cgel_historico
  async saveHist(hRow) {
    if (_sbReady) {
      try { await _sbFetch("HIST_POST", null, hRow); } catch {}
    }
    // Fallback: salva em hist_ key como antes
    const num = String(hRow.num_processo || hRow.Processo || "");
    if (num) await this.set(`hist_${num}`, hRow);
  },

  // [v4.0] Lista histórico — tenta tabela separada primeiro
  async listHist() {
    if (_sbReady) {
      try {
        const rows = await _sbFetch("HIST_LIST");
        if (rows && rows.length > 0) return rows;
      } catch {}
    }
    // Fallback para chaves hist_*
    return this.list("hist_");
  },
};

// ─── [v4.0] ETag — versão global para polling inteligente ─────────────────────
let _versaoLocal = null;

async function _incrementarVersao() {
  try {
    const atual = (await ST.get("_versao_banco")) || 0;
    await _sbFetch("POST", "_versao_banco", JSON.stringify(atual + 1));
    localStorage.setItem("cgel__versao_banco", JSON.stringify(atual + 1));
    _versaoLocal = atual + 1;
  } catch {}
}

export async function versaoBancoCambou() {
  if (!_sbReady) return true; // sem Supabase: sempre recarrega
  try {
    const raw = await _sbFetch("GET", "_versao_banco");
    const remota = raw !== null ? JSON.parse(raw) : 0;
    if (remota !== _versaoLocal) {
      _versaoLocal = remota;
      return true; // mudou — precisa recarregar
    }
    return false; // igual — pular polling
  } catch { return true; }
}
