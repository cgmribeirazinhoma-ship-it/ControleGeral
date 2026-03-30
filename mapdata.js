// ─── MapData — índices de busca rápida ───────────────────────────────────────
// ─── [J-F4] Status de tramitação ─────────────────────────────────────────────
const STATUS_MAP = {
  analise:   { label: "Em análise",              cor: "#d97706", emoji: "🟡" },
  aguardando:{ label: "Aguardando complementação",cor: "#7c3aed", emoji: "🟣" },
  aprovado:  { label: "Aprovado p/ pagamento",   cor: "#16a34a", emoji: "🟢" },
  pago:      { label: "Pago",                    cor: "#0f172a", emoji: "⚫" },
  devolvido: { label: "Devolvido",               cor: "#dc2626", emoji: "🔴" }
};

// ─── MapData ──────────────────────────────────────────────────────────────────
// [M-P2] Cache: só recalcula quando o array de processos realmente muda
let _mapDataCache = null;
let _mapDataKey = null;
function _mapDataHash(processos) {
  if (!processos.length) return "0:";
  const last = processos[processos.length - 1];
  return `${processos.length}:${last["NÚMERO DO DOCUMENTO"] || ""}`;
}
function buildMapData(processos) {
  const key = _mapDataHash(processos);
  if (_mapDataKey === key && _mapDataCache) return _mapDataCache;
  _mapDataKey = key;
  _mapDataCache = _buildMapDataInner(processos);
  return _mapDataCache;
}
function _buildMapDataInner(processos) {
  const dct = (kC, vC) => {
    const m = {};
    for (const p of processos) {
      const k = String(p[kC] || "").trim(),
        v = String(p[vC] || "").trim();
      if (k && v) m[k] = v;
    }
    return m;
  };
  const lst = col => {
    const s = new Set();
    for (const p of processos) {
      const v = String(p[col] || "").trim();
      if (v) s.add(v);
    }
    return [...s].sort();
  };
  const multi = (kC, vC) => {
    const m = {};
    for (const p of processos) {
      const k = String(p[kC] || "").trim(),
        v = String(p[vC] || "").trim();
      if (!k || !v) continue;
      if (!m[k]) m[k] = new Set();
      m[k].add(v);
    }
    const out = {};
    for (const k in m) out[k] = [...m[k]].sort();
    return out;
  };
  return {
    orgaoSecretario: dct("ORGÃO", "SECRETARIO"),
    orgaoContrato: dct("ORGÃO", "CONTRATO"),
    orgaoModalidade: dct("ORGÃO", "MODALIDADE"),
    fornCnpj: dct("FORNECEDOR", "CNPJ"),
    fornObjeto: dct("FORNECEDOR", "OBJETO"),
    fornModalidade: dct("FORNECEDOR", "MODALIDADE"),
    fornContrato: dct("FORNECEDOR", "CONTRATO"),
    fornNf: dct("FORNECEDOR", "Nº"),
    fornTipDoc: dct("FORNECEDOR", "DOCUMENTO FISCAL"),
    fornTipNf: dct("FORNECEDOR", "TIPO"),
    fornPeriodo: dct("FORNECEDOR", "PERÍODO DE REFERÊNCIA"),
    fornOrdemCompra: dct("FORNECEDOR", "N° ORDEM DE COMPRA"),
    fornObjetosList: multi("FORNECEDOR", "OBJETO"),
    fornContratosList: multi("FORNECEDOR", "CONTRATO"),
    fornModalidadesList: multi("FORNECEDOR", "MODALIDADE"),
    cnpjForn: dct("CNPJ", "FORNECEDOR"),
    modalContrato: dct("MODALIDADE", "CONTRATO"),
    modalContratosList: multi("MODALIDADE", "CONTRATO"),
    objModalidade: dct("OBJETO", "MODALIDADE"),
    objContrato: dct("OBJETO", "CONTRATO"),
    allSecretarios: lst("SECRETARIO"),
    allCnpjs: lst("CNPJ"),
    allContratos: lst("CONTRATO"),
    allObjsHist: lst("OBJETO"),
    allDocFiscais: lst("DOCUMENTO FISCAL"),
    allTiposNf: lst("TIPO"),
    allModalidades: lst("MODALIDADE"),
    allOrgaos: lst("ORGÃO"),
    allFornecedores: lst("FORNECEDOR"),
    orgaoContratosList: multi("ORGÃO", "CONTRATO"),
    orgaoModalidadesList: multi("ORGÃO", "MODALIDADE")
  };
} // end _buildMapDataInner

