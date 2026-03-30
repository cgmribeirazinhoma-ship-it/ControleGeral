// ─── Helpers de formatação e validação ───────────────────────────────────────
import { MESES, COL_CANON } from '../constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normCol = c => {
  let s = String(c).trim().toUpperCase();
  s = s.replace(/\xa0/g, " ").replace(/\n|\t/g, " ");
  // Antes de NFD: substituir "Nº" (com ordinal masculino U+00BA) por marcador
  s = s.replace(/N\u00ba/gi, "Nº"); // preservar Nº exato
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
};
const canonCol = raw => {
  const n = normCol(raw);
  // Busca exata primeiro
  if (COL_CANON[n]) return COL_CANON[n];
  // Busca pelo valor "Nº" literal (a chave especial)
  if (raw.trim() === "N\u00ba" || raw.trim() === "N°") return "N\u00ba";
  // Busca case-insensitive nas keys (fallback)
  const nl = n.toLowerCase();
  for (const k of Object.keys(COL_CANON)) {
    if (k.toLowerCase() === nl) return COL_CANON[k];
  }
  return raw;
};
function formatValor(raw) {
  if (!raw) return "";
  raw = String(raw).trim().replace(/^[Rr]\$\s*/, "");
  if (raw.includes(",")) {
    const [int_, dec_] = raw.replace(/\./g, "").split(",");
    const cents = (dec_ || "").slice(0, 2).padEnd(2, "0");
    const num = parseInt(int_.replace(/\D/g, "") || "0", 10);
    return `${num.toLocaleString("pt-BR")},${cents}`;
  }
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.length <= 2) return `0,${d.padEnd(2, "0")}`;
  return `${parseInt(d.slice(0, -2), 10).toLocaleString("pt-BR")},${d.slice(-2)}`;
}
function formatData(raw) {
  if (!raw) return "";
  const s = String(raw).trim();

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.split("T")[0].split("-");
    return `${d}/${m}/${y}`;
  }

  // dd/mm/yyyy (já formatado)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

  // "31 de agosto de 2023" — formato extenso vindo da planilha
  const mesesExt = { janeiro:1,fevereiro:2,"março":3,marco:3,abril:4,maio:5,junho:6,
    julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12 };
  const mExt = s.match(/^(\d{1,2})\s+de\s+([\w\u00C0-\u017E]+)\s+de\s+(\d{4})$/i);
  if (mExt) {
    const dia = String(mExt[1]).padStart(2,"0");
    const mesNum = mesesExt[mExt[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")];
    const mes = String(mesNum || 1).padStart(2,"0");
    return `${dia}/${mes}/${mExt[3]}`;
  }

  // dd-mm-yyyy ou ddmmyyyy numérico
  const d = s.replace(/\D/g, "");
  if (d.length >= 8) return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4,8)}`;
  return s;
}
function dtExt(d) {
  if (!d) return "";
  if (d instanceof Date) return `${d.getDate()} de ${MESES[d.getMonth() + 1]} de ${d.getFullYear()}`;
  const digs = String(d).replace(/\D/g, "");
  if (digs.length >= 8) return `${parseInt(digs.slice(0, 2))} de ${MESES[parseInt(digs.slice(2, 4))]} de ${digs.slice(4, 8)}`;
  return String(d);
}
function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

// Converte qualquer formato de data para yyyy-mm-dd (para usar em <input type="date">)
function toISO(raw) {
  if (!raw) return todayISO();
  const s = String(raw).trim();
  // já é yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m}-${d}`;
  }
  // fallback: retira dígitos
  const d = s.replace(/\D/g, "");
  if (d.length >= 8) return `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
  return todayISO();
}

// Exibe data no formato dd/mm/yyyy (para mostrar em tela e salvar no storage)
function fmtD(raw) {
  return formatData(raw); // já existe: converte yyyy-mm-dd → dd/mm/yyyy
}

// ─── [C2] Sistema de Auditoria de Numeração ──────────────────────────────────
// Garante que o próximo número:
//  1. Parte sempre do MAIOR número existente nos processos + 1
//  2. Nunca repete um número já usado
//  3. Persiste o último número base no storage (âncora)
//  4. Após importar planilha, ancora no maior número REAL (ignora fórmulas =LN+1)

// Extrai apenas inteiros positivos reais — ignora fórmulas, strings, NaN
function _numsSeguros(processos) {
  return (processos || [])
    .map(p => {
      const raw = String(p["NÚMERO DO DOCUMENTO"] || "").trim();
      // Ignorar fórmulas Excel (=L2+1 etc.) que possam ter escapado da importação
      if (raw.startsWith("=")) return NaN;
      const n = parseInt(raw, 10);
      // Limite razoável: números de processo não chegam a 99999
      return (!isNaN(n) && n > 0 && n < 99999) ? n : NaN;
    })
    .filter(n => !isNaN(n));
}

function proxNumero(processos) {
  const nums = _numsSeguros(processos);
  if (!nums.length) return 1;
  const usados = new Set(nums);
  let next = nums.reduce((a,b) => a > b ? a : b, 0) + 1;
  while (usados.has(next)) next++;
  return next;
}

// Verifica se um número específico já está em uso
function numeroDuplicado(num, processos, numOriginalEdicao) {
  const n = parseInt(String(num).trim(), 10);
  if (isNaN(n) || n <= 0) return false;
  return processos.some(p => {
    const raw = String(p["NÚMERO DO DOCUMENTO"] || "").trim();
    if (raw.startsWith("=")) return false;
    const pn = parseInt(raw, 10);
    if (numOriginalEdicao && pn === parseInt(String(numOriginalEdicao).trim(), 10)) return false;
    return pn === n;
  });
}

// Calcula o maior número REAL (ignora fórmulas) de um conjunto de processos
function maiorNumero(processos) {
  const nums = _numsSeguros(processos);
  return nums.length ? nums.reduce((a,b) => a > b ? a : b, 0) : 0;
}


// ─── [A1] Máscara CNPJ/CPF ────────────────────────────────────────────────────
function mascararCnpjCpf(raw) {
  const d = raw.replace(/\D/g, "");
  if (d.length <= 11) {
    const p1 = d.slice(0, 3),
      p2 = d.slice(3, 6),
      p3 = d.slice(6, 9),
      p4 = d.slice(9, 11);
    if (d.length <= 3) return p1;
    if (d.length <= 6) return `${p1}.${p2}`;
    if (d.length <= 9) return `${p1}.${p2}.${p3}`;
    return `${p1}.${p2}.${p3}-${p4}`;
  }
  const p1 = d.slice(0, 2),
    p2 = d.slice(2, 5),
    p3 = d.slice(5, 8),
    p4 = d.slice(8, 12),
    p5 = d.slice(12, 14);
  if (d.length <= 2) return p1;
  if (d.length <= 5) return `${p1}.${p2}`;
  if (d.length <= 8) return `${p1}.${p2}.${p3}`;
  if (d.length <= 12) return `${p1}.${p2}.${p3}/${p4}`;
  return `${p1}.${p2}.${p3}/${p4}-${p5}`;
}
function validarCnpjCpf(raw) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 0) return true;
  if (d.length === 11) return validarCPF(d);
  if (d.length === 14) return validarCNPJ(d);
  return false;
}
function validarCPF(d) {
  if (/^(\d)\1{10}$/.test(d)) return false; // todos iguais
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11; if (r >= 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11; if (r >= 10) r = 0;
  return r === parseInt(d[10]);
}
function validarCNPJ(d) {
  if (/^(\d)\1{13}$/.test(d)) return false; // todos iguais
  const calc = (n) => {
    let s = 0, p = n - 7;
    for (let i = 0; i < n; i++) { s += parseInt(d[i]) * p--; if (p < 2) p = 9; }
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13]);
}


