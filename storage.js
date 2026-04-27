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
      const { data, error } = await _sb.from('cgel_store').select('chave,valor').like('chave', `${chave}%`).order('atualizado_em', { ascending: true }).limit(10000);
      if (error) return null;
      _sbLive = true;
      return data;
    }
    if (method === "HIST_LIST") {
      const { data, error } = await _sb.from('cgel_historico').select('*').order('num_processo', { ascending: true }).limit(10000);
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
          return null;
        }
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
    const isSingleton = ["users","orgaos_config","app_config","imported_max_num","_versao_banco", "processos","historico","draft_form"].some(s => k === s || k.startsWith(s));
    if (isSingleton) return _enqueueWrite(k, () => this._setDirect(k, v));
    return this._setDirect(k, v);
  },
  async _setDirect(k, v) {
    MEM[k] = v;
    const serialized = JSON.stringify(v);
    try { localStorage.setItem("cgel_" + k, serialized); } catch {}
    let cloud = false;
    if (_sbReady) {
      try {
        const result = await _sbFetch("POST", k, serialized);
        cloud = result === true;
        if (cloud) _sbLive = true;
      } catch {}
    }
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
          rows.forEach(r => { try { localStorage.setItem("cgel_" + r.chave, r.valor); } catch {} });
          return rows.filter(r => r.valor).map(r => {
            try { return { key: r.chave, value: JSON.parse(r.valor) }; }
            catch { return null; }
          }).filter(Boolean);
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
  async del_prefix(prefix) {
    const rows = await this.list(prefix);
    await Promise.all(rows.map(r => this.del(r.key)));
  }
};
