// ─── Exportação SIAFEM / TCE-MA ──────────────────────────────────────────────
import { todayISO } from './helpers.js';

export function exportarSIAFEM(processos) {
  const header = ["NR_PROCESSO","DT_PAGAMENTO","CD_ORGAO","SECRETARIA","NR_CNPJ_CPF",
    "NM_CREDOR","VL_PAGAMENTO","DS_OBJETO","NR_CONTRATO","TP_LICITACAO",
    "NR_NF","DT_NF","TP_DECISAO","NR_DOC_FISCAL"];
  const parseBRL = v => {
    const s = String(v||"").replace(/\./g,"").replace(",",".");
    const n = parseFloat(s.replace(/[^\d.]/g,""));
    return isNaN(n) ? "0.00" : n.toFixed(2);
  };
  const fmtData = raw => {
    const d = String(raw||"").replace(/\D/g,"");
    if (d.length >= 8) return `${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}`;
    return "";
  };
  const esc = v => `"${String(v||"").replace(/"/g,"'")}"`; 
  const rows = [header.join(";")];
  processos.forEach(p => {
    rows.push([
      esc(p["NÚMERO DO DOCUMENTO"]),
      esc(fmtData(p["DATA"])),
      esc(""),
      esc(p["ORGÃO"]),
      esc((p["CNPJ"]||"").replace(/\D/g,"")),
      esc(p["FORNECEDOR"]),
      parseBRL(p["VALOR"]),
      esc(p["OBJETO"]),
      esc(p["CONTRATO"]),
      esc(p["MODALIDADE"]),
      esc(p["Nº"]),
      esc(fmtData(p["DATA NF"])),
      esc(p["_decisao"]==="deferir"?"DEFERIDO":p["_decisao"]==="indeferir"?"INDEFERIDO":"PENDENTE"),
      esc(p["DOCUMENTO FISCAL"])
    ].join(";"));
  });
  const csv = rows.join("\n");
  const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `SIAFEM_${todayISO()}.csv`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},2000);
}
