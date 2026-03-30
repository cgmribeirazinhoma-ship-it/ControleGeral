// ─── Carregadores atômicos v4.0 ───────────────────────────────────────────────
// loadAllProcessos — mescla blob "processos" + chaves "proc_NUM"
// loadAllHistorico — usa tabela cgel_historico (v4.0) ou chaves hist_* (fallback)
import { ST } from './storage.js';
import { TINFO } from '../constants.js';
import { formatData, dtExt, fmtD } from './helpers.js';

export async function loadAllProcessos() {
  const [atomRows, blobArr] = await Promise.all([
    ST.list("proc_"),
    ST.get("processos"),
  ]);
  const map = new Map();
  if (Array.isArray(blobArr)) {
    blobArr.forEach(p => {
      const k = String(p["NÚMERO DO DOCUMENTO"] || "").trim();
      if (k) map.set(k, p);
    });
  }
  if (atomRows?.length) {
    atomRows.forEach(r => {
      if (!r.value) return;
      const k = String(r.value["NÚMERO DO DOCUMENTO"] || "").trim();
      if (k) map.set(k, r.value);
    });
  }
  return [...map.values()].sort((a, b) => {
    const na = parseInt(String(a["NÚMERO DO DOCUMENTO"] || "0"), 10);
    const nb = parseInt(String(b["NÚMERO DO DOCUMENTO"] || "0"), 10);
    return na - nb;
  });
}

const procToHist = (p) => {
  const tipoKey = p["_tipoKey"] || "";
  const dec = p["_decisao"];
  const dataExt = dtExt(formatData(p["DATA"] || ""));
  return {
    "Processo":            p["NÚMERO DO DOCUMENTO"] || "",
    "Data":                dataExt,
    "Órgão":               p["ORGÃO"] || "",
    "Fornecedor":          p["FORNECEDOR"] || "",
    "Valor":               p["VALOR"] || "",
    "Tipo":                tipoKey ? (TINFO[tipoKey]?.label || tipoKey) : "",
    "TipoKey":             tipoKey,
    "Decisão":             dec === "deferir" ? "DEFERIDO" : dec === "indeferir" ? "INDEFERIDO" : "",
    "CNPJ":                p["CNPJ"] || "",
    "MODALIDADE":          p["MODALIDADE"] || "",
    "CONTRATO":            p["CONTRATO"] || "",
    "OBJETO":              p["OBJETO"] || "",
    "DOCUMENTO FISCAL":    p["DOCUMENTO FISCAL"] || "",
    "Nº":                  p["Nº"] || "",
    "TIPO":                p["TIPO"] || "",
    "SECRETARIO":          p["SECRETARIO"] || "",
    "PERÍODO DE REFERÊNCIA": p["PERÍODO DE REFERÊNCIA"] || "",
    "N° ORDEM DE COMPRA":  p["N° ORDEM DE COMPRA"] || "",
    "DATA NF":             p["DATA NF"] || "",
    "NÚMERO DO DOCUMENTO": p["NÚMERO DO DOCUMENTO"] || "",
    "_obs":                p["_obs"] || "",
    "_sits":               p["_sits"] || [],
    "_tipoKey":            tipoKey,
    "_decisao":            dec || "",
    "_status":             p["_status"] || "analise",
    "_usuario":            p["_usuario"] || "",
    "_registradoEm":       p["_registradoEm"] || "",
  };
};

export async function loadAllHistorico() {
  const [atomProcs, procBlob, atomHist, histBlob] = await Promise.all([
    ST.list("proc_"),
    ST.get("processos"),
    ST.list("hist_"),
    ST.get("historico"),
  ]);

  // [v4.0] Tenta tabela separada cgel_historico
  const histTable = await ST.listHist().catch(() => null);

  const map = new Map();

  if (Array.isArray(procBlob)) {
    procBlob.forEach(p => {
      const k = String(p["NÚMERO DO DOCUMENTO"] || "").trim();
      if (k) map.set(k, procToHist(p));
    });
  }
  if (atomProcs?.length) {
    atomProcs.forEach(r => {
      if (!r.value) return;
      const k = String(r.value["NÚMERO DO DOCUMENTO"] || "").trim();
      if (k) map.set(k, procToHist(r.value));
    });
  }
  if (Array.isArray(histBlob)) {
    histBlob.forEach(h => {
      const k = String(h["Processo"] || h["NÚMERO DO DOCUMENTO"] || "").trim();
      if (!k) return;
      map.set(k, { ...(map.get(k) || {}), ...h });
    });
  }
  if (atomHist?.length) {
    atomHist.forEach(r => {
      if (!r.value) return;
      const k = String(r.value["Processo"] || r.value["NÚMERO DO DOCUMENTO"] || "").trim();
      if (!k) return;
      map.set(k, { ...(map.get(k) || {}), ...r.value });
    });
  }
  // Tabela separada tem maior prioridade
  if (histTable?.length) {
    histTable.forEach(h => {
      const k = String(h.num_processo || h["Processo"] || "").trim();
      if (!k) return;
      // Normaliza campos da tabela para o formato esperado pelo sistema
      const normalized = h.dados ? h.dados : h;
      map.set(k, { ...(map.get(k) || {}), ...normalized });
    });
  }

  return [...map.values()].sort((a, b) => {
    const na = parseInt(String(a["Processo"] || "0"), 10);
    const nb = parseInt(String(b["Processo"] || "0"), 10);
    return nb - na;
  });
}
