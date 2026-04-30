/* ─── src/storage.js ─────────────────────────────────────────────────── */
const SUPABASE_URL = "https://jifuyprnrrmpbmitmzlx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x-jrFjthVTsco6rwP5VxbA_wMPaUPoO";

const _sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let _sbLive = false;
const _sbReady = !!(_sb && SUPABASE_URL && SUPABASE_ANON_KEY);
const _SB_NOT_FOUND = Symbol("SB_NOT_FOUND");
const MEM = {};

async function _sbFetch(method, chave, valor) {
  if (!_sbReady) return null;
  try {
    if (method === "GET") {
      const { data, error } = await _sb.from('cgel_store').select('valor').eq('chave', chave).maybeSingle();
      if (error) return null;
      return data ? data.valor : _SB_NOT_FOUND;
    }
    if (method === "POST") {
      const { error } = await _sb.from('cgel_store').upsert({ chave, valor, atualizado_em: new Date().toISOString() });
      if (!error) _sbLive = true;
      return !error;
    }
    if (method === "DELETE") {
      const { error } = await _sb.from('cgel_store').delete().eq('chave', chave);
      return !error;
    }
    if (method === "LIST") {
      const { data, error } = await _sb.from('cgel_store').select('chave,valor').like('chave', `${chave}%`).order('chave', { ascending: false }).limit(10000);
      if (error) return null;
      _sbLive = true;
      return data;
    }
    if (method === "HIST_LIST") {
      const { data, error } = await _sb.from('cgel_historico').select('*').order('num_processo', { ascending: false }).limit(10000);
      if (error) return null;
      return data;
    }
    if (method === "HIST_POST") {
      const { error } = await _sb.from('cgel_historico').upsert(valor);
      return !error;
    }
  } catch { return null; }
}

const _writeQueues = {};
function _enqueueWrite(key, fn) {
  if (!_writeQueues[key]) _writeQueues[key] = Promise.resolve();
  _writeQueues[key] = _writeQueues[key].then(fn).catch(fn);
  return _writeQueues[key];
}

const ST = {
  async get(k) {
    if (_sbReady) {
      try {
        const raw = await _sbFetch("GET", k);
        if (raw === _SB_NOT_FOUND) {
          try { localStorage.removeItem("cgel_" + k); } catch {}
          // [FIX-EDIT-STALE] Se existe no MEM (gravado localmente mas não confirmado
          // pelo Supabase ainda), retorna o valor local em vez de null.
          return MEM[k] !== undefined ? MEM[k] : null;
        }
        if (raw !== null) {
          try { localStorage.setItem("cgel_" + k, raw); } catch {}
          // [FIX-EDIT-STALE] Se o MEM tem um valor mais recente (gravado após a
          // última leitura do Supabase), o MEM tem prioridade para proc_ e hist_.
          // Isso evita que ST.get devolva dados antigos durante a janela de propagação.
          if (MEM[k] !== undefined && (k.startsWith("proc_") || k.startsWith("hist_"))) {
            return MEM[k];
          }
          return JSON.parse(raw);
        }
      } catch {}
    }
    try {
      const local = localStorage.getItem("cgel_" + k);
      return local ? JSON.parse(local) : (MEM[k] || null);
    } catch { return MEM[k] || null; }
  },
  async set(k, v) {
    const raw = JSON.stringify(v);
    try { localStorage.setItem("cgel_" + k, raw); } catch {}
    MEM[k] = v;
    return _enqueueWrite(k, async () => {
      const cloud = await _sbFetch("POST", k, raw);
      return { ok: true, cloud: !!cloud };
    });
  },
  async del(k) {
    try { localStorage.removeItem("cgel_" + k); } catch {}
    delete MEM[k];
    if (_sbReady) await _sbFetch("DELETE", k);
    return true;
  },
  async list(prefix) {
    if (_sbReady) {
      try {
        const rows = await _sbFetch("LIST", prefix);
        if (rows !== null) {
          rows.forEach(r => { try { localStorage.setItem("cgel_" + r.chave, r.valor); } catch {} });
          // [FIX-EDIT-STALE] Mescla dados do Supabase com MEM local:
          // chaves gravadas localmente (mas ainda não confirmadas no Supabase)
          // substituem o valor do banco, evitando leitura de dado antigo.
          const sbMap = new Map();
          rows.filter(r => r.valor).forEach(r => {
            try { sbMap.set(r.chave, JSON.parse(r.valor)); } catch {}
          });
          // Sobrescreve com valores do MEM (mais recentes)
          Object.keys(MEM).filter(k => k.startsWith(prefix)).forEach(k => {
            sbMap.set(k, MEM[k]);
          });
          return [...sbMap.entries()].map(([key, value]) => ({ key, value }));
        }
      } catch {}
    }
    try {
      const results = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cgel_" + prefix)) {
          const raw = localStorage.getItem(k);
          if (raw) { try { results.push({ key: k.slice(5), value: JSON.parse(raw) }); } catch {} }
        }
      }
      if (results.length) return results;
    } catch {}
    return Object.entries(MEM).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => ({ key: k, value: v }));
  },
  async listHistorico() {
    if (_sbReady) {
      try {
        const rows = await _sbFetch("HIST_LIST");
        if (rows !== null) {
          return rows.map(r => {
            try { return typeof r.dados === "string" ? JSON.parse(r.dados) : r.dados; }
            catch { return null; }
          }).filter(Boolean);
        }
      } catch {}
    }
    return [];
  },
  async del_prefix(prefix) {
    const rows = await this.list(prefix);
    await Promise.all(rows.map(r => this.del(r.key)));
  }
};

window.ST = ST;
