// ─── Excel — importação e exportação ─────────────────────────────────────────
import { canonCol } from './helpers.js';
import { todayISO } from './helpers.js';
import XLSX from 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

// XLSX é carregado via CDN globalmente
const getXLSX = () => window.XLSX;

// ─── Excel ────────────────────────────────────────────────────────────────────
async function importarExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true, raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  // ── Descobrir índice de cada coluna pelo cabeçalho (linha 1) ──────────────
  const colIdx = {}; // canonName → índice
  for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell && cell.v) colIdx[canonCol(String(cell.v))] = c;
  }
  const numDocIdx = colIdx["NÚMERO DO DOCUMENTO"];

  // ── Valor da ÚLTIMA LINHA com dado em NÚMERO DO DOCUMENTO ─────────────────
  // Estratégia correta: pegar o valor da última linha preenchida,
  // independente de ser fórmula ou não (o Excel já calculou o valor correto).
  // Isso resolve planilhas com sequências =L2+1 que chegam ao número certo (2591).
  let lastNum = 0;
  if (numDocIdx !== undefined) {
    for (let r = 1; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: numDocIdx })];
      if (cell && cell.v !== undefined && cell.v !== "") {
        const n = parseInt(String(cell.v).trim(), 10);
        if (!isNaN(n) && n > 0 && n < 99999) lastNum = n; // sobrescreve → fica com o último
      }
    }
  }

  // ── Ler todas as linhas de dados ──────────────────────────────────────────
  const rows = [];
  for (let r = 1; r <= range.e.r; r++) {
    const row = {};
    let temDado = false;
    for (let c = 0; c <= range.e.c; c++) {
      const hCell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (!hCell || !hCell.v) continue;
      const colName = canonCol(String(hCell.v));
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      let valor = cell ? cell.v : "";
      if (valor === undefined || valor === null) valor = "";

      // Datas: converter para dd/mm/yyyy
      if (valor instanceof Date) {
        const dia = String(valor.getDate()).padStart(2, "0");
        const mes = String(valor.getMonth() + 1).padStart(2, "0");
        const ano = valor.getFullYear();
        valor = `${dia}/${mes}/${ano}`;
      }

      // NÚMERO DO DOCUMENTO: garantir inteiro
      if (colName === "NÚMERO DO DOCUMENTO") {
        const n = parseInt(String(valor).trim(), 10);
        valor = (!isNaN(n) && n > 0 && n < 99999) ? n : "";
      }

      if (valor !== "") temDado = true;
      row[colName] = valor;
    }
    // Só incluir linhas do BLOCO VIGENTE:
    // - Nº do documento válido
    // - Nº <= lastNum (descarta bloco antigo com números maiores que o período vigente)
    //   Ex: planilha tem linhas antigas com Nº 2774-3095 → descartadas (> 2591)
    //       e linhas vigentes com Nº 1-2591 → mantidas (<= 2591)
    const nd = row["NÚMERO DO DOCUMENTO"];
    const ndNum = parseInt(String(nd ?? "").trim(), 10);
    const ehValido = temDado && !isNaN(ndNum) && ndNum > 0;
    const ehBlocoVigente = lastNum === 0 || ndNum <= lastNum;
    if (ehValido && ehBlocoVigente) rows.push(row);
  }

  // Retornar junto com a âncora de numeração
  rows._lastNum = lastNum;
  return rows;
}
function exportarExcel(processos, historico) {
  const wb = XLSX.utils.book_new();
  // Planilha principal — formato compatível com importação (mesmas colunas)
  const COLS_ORDER = ["OBJETO", "ORGÃO", "MODALIDADE", "CONTRATO", "FORNECEDOR", "NOME FANTASIA", "CNPJ", "DOCUMENTO FISCAL", "Nº", "TIPO", "VALOR", "NÚMERO DO DOCUMENTO", "DATA", "SECRETARIO", "N° ORDEM DE COMPRA", "DATA NF", "PERÍODO DE REFERÊNCIA", "_tipoKey", "_decisao"];
  const procRows = processos.map(p => {
    const r = {};
    COLS_ORDER.forEach(c => r[c] = p[c] !== undefined ? p[c] : "");
    return r;
  });
  const ws1 = XLSX.utils.json_to_sheet(procRows, {
    header: COLS_ORDER
  });
  XLSX.utils.book_append_sheet(wb, ws1, "Planilha1");
  // Aba histórico
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historico), "Histórico");
  XLSX.writeFile(wb, `ControleGeral_${todayISO()}.xlsx`);
}



// ─── [G-I1] Exportação SIAFEM/TCE-MA ─────────────────────────────────────────
function exportarSIAFEM(processos) {
  // Formato CSV compatível com TCE-MA / SIAFEM
  const header = [
    "NR_PROCESSO","DT_PAGAMENTO","CD_ORGAO","SECRETARIA","NR_CNPJ_CPF",
    "NM_CREDOR","VL_PAGAMENTO","DS_OBJETO","NR_CONTRATO","TP_LICITACAO",
    "NR_NF","DT_NF","TP_DECISAO","NR_DOC_FISCAL"
  ];
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
  a.href = url;
  a.download = `SIAFEM_${todayISO()}.csv`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},2000);
}



// ─── [M-P3] Web Worker inline para importação de Excel ───────────────────────
// Roda em thread separada — não trava a UI com planilhas grandes
const _EXCEL_WORKER_SRC = `
self.onmessage = async function(e) {
  const { buffer, sheetJsUrl } = e.data;
  try {
    // Importa SheetJS no worker
    importScripts(sheetJsUrl);
    const XLSX = self.XLSX;
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true, raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

    // Descobrir colunas pelo cabeçalho
    const COL_CANON_WORKER = {
      "ORGAO":"ORGÃO","SECRETARIA ORGAO":"ORGÃO","UNIDADE":"ORGÃO","DEPARTAMENTO":"ORGÃO",
      "FORNECEDOR":"FORNECEDOR","EMPRESA":"FORNECEDOR","CREDOR":"FORNECEDOR","NOME":"FORNECEDOR",
      "CNPJ":"CNPJ","CPF":"CNPJ","CNPJ/CPF":"CNPJ","VALOR":"VALOR","VALOR TOTAL":"VALOR",
      "NUMERO DO DOCUMENTO":"NÚMERO DO DOCUMENTO","PROCESSO":"NÚMERO DO DOCUMENTO",
      "DATA":"DATA","OBJETO":"OBJETO","DESCRICAO":"OBJETO","CONTRATO":"CONTRATO",
      "MODALIDADE":"MODALIDADE","SECRETARIO":"SECRETARIO","DOCUMENTO FISCAL":"DOCUMENTO FISCAL",
      "PERIODO DE REFERENCIA":"PERÍODO DE REFERÊNCIA","N ORDEM DE COMPRA":"N° ORDEM DE COMPRA",
      "DATA NF":"DATA NF","TIPO":"TIPO","NF":"Nº","NOTA FISCAL":"Nº"
    };
    const normW = c => {
      let s = String(c).trim().toUpperCase().replace(/[\u00C0-\u017E]/g, m =>
        "AAAAACEEEEIIIIDNOOOOOUUUUYBSS"["ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞSS".indexOf(m)] || m
      ).replace(/\s+/g," ").trim();
      return s;
    };
    const canonW = raw => {
      const n = normW(raw);
      return COL_CANON_WORKER[n] || raw;
    };

    const colIdx = {};
    for (let c = 0; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell && cell.v) colIdx[canonW(String(cell.v))] = c;
    }
    const numDocIdx = colIdx["NÚMERO DO DOCUMENTO"];

    let lastNum = 0, total = range.e.r;
    if (numDocIdx !== undefined) {
      for (let r = 1; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: numDocIdx })];
        if (cell && cell.v !== undefined && cell.v !== "") {
          const n = parseInt(String(cell.v).trim(), 10);
          if (!isNaN(n) && n > 0 && n < 99999) lastNum = n;
        }
        if (r % 200 === 0) self.postMessage({ type: "progress", pct: Math.round(r/total*80) });
      }
    }

    const rows = [];
    for (let r = 1; r <= range.e.r; r++) {
      const row = {};
      let temDado = false;
      for (let c = 0; c <= range.e.c; c++) {
        const hCell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        if (!hCell || !hCell.v) continue;
        const colName = canonW(String(hCell.v));
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        let valor = cell ? cell.v : "";
        if (valor === undefined || valor === null) valor = "";
        if (valor instanceof Date) {
          valor = String(valor.getDate()).padStart(2,"0") + "/" +
                  String(valor.getMonth()+1).padStart(2,"0") + "/" + valor.getFullYear();
        }
        if (colName === "NÚMERO DO DOCUMENTO") {
          const n = parseInt(String(valor).trim(), 10);
          valor = (!isNaN(n) && n > 0 && n < 99999) ? n : "";
        }
        if (valor !== "") temDado = true;
        row[colName] = valor;
      }
      const nd = row["NÚMERO DO DOCUMENTO"];
      const ndNum = parseInt(String(nd ?? "").trim(), 10);
      const ehValido = temDado && !isNaN(ndNum) && ndNum > 0;
      const ehBlocoVigente = lastNum === 0 || ndNum <= lastNum;
      if (ehValido && ehBlocoVigente) rows.push(row);
      if (r % 200 === 0) self.postMessage({ type: "progress", pct: 80 + Math.round(r/total*20) });
    }
    self.postMessage({ type: "done", rows, lastNum });
  } catch(err) {
    self.postMessage({ type: "error", message: err.message });
  }
};
`;

let _excelWorkerUrl = null;
function _getExcelWorkerUrl() {
  if (!_excelWorkerUrl) {
    const blob = new Blob([_EXCEL_WORKER_SRC], { type: "application/javascript" });
    _excelWorkerUrl = URL.createObjectURL(blob);
  }
  return _excelWorkerUrl;
}

async function importarExcelWorker(file, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(_getExcelWorkerUrl());
      worker.onmessage = e => {
        if (e.data.type === "progress" && onProgress) onProgress(e.data.pct);
        else if (e.data.type === "done") {
          const rows = e.data.rows;
          rows._lastNum = e.data.lastNum;
          worker.terminate();
          resolve(rows);
        } else if (e.data.type === "error") {
          worker.terminate();
          reject(new Error(e.data.message));
        }
      };
      worker.onerror = err => { worker.terminate(); reject(err); };
      file.arrayBuffer().then(buffer => {
        worker.postMessage({
          buffer,
          sheetJsUrl: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
        }, [buffer]);
      });
    } catch(e) {
      // Fallback para importarExcel síncrono se Worker não suportado
      importarExcel(file).then(resolve).catch(reject);
    }
  });
}

