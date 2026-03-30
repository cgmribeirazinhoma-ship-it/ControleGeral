// ─── PDF — geração de documentos ─────────────────────────────────────────────
import { TINFO, CHK, FOOTER_TXT, MESES } from '../constants.js';
import { dtExt, fmtD, todayISO } from './helpers.js';

// ─── [M6] cleanBrasaoAsync ────────────────────────────────────────────────────
function cleanBrasaoAsync(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = id.data;
        for (let i = 0; i < px.length; i += 4) if (px[i] > 220 && px[i + 1] > 220 && px[i + 2] > 220) px[i + 3] = 0;
        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

// ─── jsPDF loader ─────────────────────────────────────────────────────────────
let _jspdf = null;
async function loadJsPDF() {
  if (_jspdf) return _jspdf;
  return new Promise((res, rej) => {
    if (window.jspdf) {
      _jspdf = window.jspdf;
      res(_jspdf);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => window.jspdf ? (_jspdf = window.jspdf, res(_jspdf)) : rej(new Error("jsPDF não carregou"));
    s.onerror = () => rej(new Error("Falha ao carregar jsPDF"));
    document.head.appendChild(s);
  });
}

// ─── docx.js loader ───────────────────────────────────────────────────────────
let _docxLib = null;
async function loadDocxLib() {
  if (_docxLib) return _docxLib;
  return new Promise((res, rej) => {
    if (window.docx) {
      _docxLib = window.docx;
      res(_docxLib);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/docx@7.8.2/build/index.umd.js";
    s.onload = () => window.docx ? (_docxLib = window.docx, res(_docxLib)) : rej(new Error("docx.js não carregou"));
    s.onerror = () => rej(new Error("Falha ao carregar docx.js"));
    document.head.appendChild(s);
  });
}


// ─── [M-AU3/G-R1] Relatório mensal PDF ───────────────────────────────────────
async function gerarRelatorioPDF(processos, mesAno, appConfig) {
  const lib = await loadJsPDF();
  if (!lib) return { error: "jsPDF não disponível." };
  const { jsPDF } = lib;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, fv = v => v && String(v).trim() ? String(v).trim() : "—";

  // Filtrar processos do mês
  const [mes, ano] = mesAno.split("/");
  const chave = `${ano}-${mes.padStart(2,"0")}`;
  const filtrados = processos.filter(p => {
    const raw = String(p["DATA"] || "");
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) return (raw.slice(6,10)+"-"+raw.slice(3,5)) === chave;
    if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0,7) === chave;
    return false;
  });

  const parseBRL = v => { const s=String(v||"").replace(/\./g,"").replace(",",".").replace(/[^\d.]/g,""); const n=parseFloat(s); return isNaN(n)?0:n; };
  const fmtBRL = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  // Totais por órgão
  const porOrgao = {};
  filtrados.forEach(p => {
    const o = p["ORGÃO"] || "Sem órgão";
    if (!porOrgao[o]) porOrgao[o] = { n: 0, total: 0, def: 0, indef: 0 };
    porOrgao[o].n++;
    porOrgao[o].total += parseBRL(p["VALOR"]);
    if (p["_decisao"] === "deferir") porOrgao[o].def++;
    else if (p["_decisao"] === "indeferir") porOrgao[o].indef++;
  });
  const totalGeral = filtrados.reduce((a,p) => a + parseBRL(p["VALOR"]), 0);
  const ctrl = appConfig?.controlador || {};

  // ── Cabeçalho ──
  if (window.BRASAO_B64) {
    try { doc.addImage(window.BRASAO_B64, "PNG", (W-25)/2, 8, 25, 18); } catch {}
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("ESTADO DO MARANHÃO", W/2, 30, { align: "center" });
  doc.text("PREFEITURA MUNICIPAL DE GOVERNADOR EDISON LOBÃO", W/2, 35, { align: "center" });
  doc.text("CONTROLADORIA DO MUNICÍPIO", W/2, 40, { align: "center" });
  doc.setLineWidth(0.5); doc.line(19, 43, W-19, 43);

  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  const nomeMes = ["","JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO",
    "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
  doc.text(`RELATÓRIO MENSAL DE PAGAMENTOS — ${nomeMes[parseInt(mes)] || mes}/${ano}`, W/2, 52, { align: "center" });

  // ── Sumário ──
  let y = 62;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  [
    ["Total de processos:", filtrados.length.toString()],
    ["Deferidos:", filtrados.filter(p=>p["_decisao"]==="deferir").length.toString()],
    ["Indeferidos:", filtrados.filter(p=>p["_decisao"]==="indeferir").length.toString()],
    ["Pendentes:", filtrados.filter(p=>!p["_decisao"]).length.toString()],
    ["Valor total:", fmtBRL(totalGeral)]
  ].forEach(([l,v]) => {
    doc.setFont("helvetica","bold"); doc.text(l, 25, y);
    doc.setFont("helvetica","normal"); doc.text(v, 85, y);
    y += 6;
  });

  // ── Tabela por órgão ──
  y += 4;
  doc.setLineWidth(0.3); doc.line(19, y, W-19, y); y += 4;
  doc.setFont("helvetica","bold"); doc.setFontSize(10);
  doc.text("Órgão / Secretaria", 22, y);
  doc.text("Qtd", 118, y, { align: "right" });
  doc.text("Deferidos", 138, y, { align: "right" });
  doc.text("Total R$", W-20, y, { align: "right" });
  y += 2; doc.line(19, y, W-19, y); y += 4;

  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  Object.entries(porOrgao).sort(([,a],[,b])=>b.total-a.total).forEach(([org, dados]) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const orgLabel = org.slice(0,55);
    doc.text(orgLabel, 22, y);
    doc.text(dados.n.toString(), 118, y, { align: "right" });
    doc.text(dados.def.toString(), 138, y, { align: "right" });
    doc.text(fmtBRL(dados.total), W-20, y, { align: "right" });
    y += 5;
  });

  y += 2; doc.setLineWidth(0.5); doc.line(19, y, W-19, y); y += 5;
  doc.setFont("helvetica","bold"); doc.setFontSize(10);
  doc.text("TOTAL GERAL", 22, y);
  doc.text(filtrados.length.toString(), 118, y, { align: "right" });
  doc.text(fmtBRL(totalGeral), W-20, y, { align: "right" });

  // ── Lista de processos ──
  y += 10;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("Nº", 22, y); doc.text("Fornecedor", 32, y);
  doc.text("Valor", W-50, y, { align: "right" }); doc.text("Decisão", W-20, y, { align: "right" });
  y += 2; doc.setLineWidth(0.2); doc.line(19, y, W-19, y); y += 4;
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  filtrados.forEach(p => {
    if (y > 280) { doc.addPage(); y = 20; }
    doc.text(String(p["NÚMERO DO DOCUMENTO"]||""), 22, y);
    doc.text((p["FORNECEDOR"]||"").slice(0,48), 32, y);
    doc.text(fmtBRL(parseBRL(p["VALOR"])), W-50, y, { align: "right" });
    const dec = p["_decisao"]==="deferir"?"DEF":p["_decisao"]==="indeferir"?"INDEF":"PEND";
    doc.text(dec, W-20, y, { align: "right" });
    y += 4;
  });

  // ── Assinatura ──
  if (y > 250) { doc.addPage(); y = 20; }
  y += 10;
  const ctrlNome = fv(ctrl.nome) || "Thiago Soares Lima";
  const ctrlCargo = fv(ctrl.cargo) || "Controlador Geral";
  const ctrlPortaria = fv(ctrl.portaria) || "";
  const hoje = new Date();
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  doc.text(`Governador Edison Lobão/MA, ${hoje.getDate()} de ${["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"][hoje.getMonth()+1]} de ${hoje.getFullYear()}`, W-19, y, { align: "right" });
  y += 16;
  doc.text(ctrlNome, W/2, y, { align: "center" });
  y += 5; doc.text(ctrlCargo, W/2, y, { align: "center" });
  if (ctrlPortaria) { y += 5; doc.text(ctrlPortaria, W/2, y, { align: "center" }); }

  // ── Rodapé ──
  const totalPgs = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPgs; pg++) {
    doc.setPage(pg); doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(150,150,150);
    doc.text(FOOTER_TXT, W/2, 291, { align: "center" });
    doc.text(`Pág. ${pg}/${totalPgs}`, W-19, 291, { align: "right" });
    doc.setTextColor(0,0,0);
  }

  const blob = doc.output("blob");
  return { blob, name: `Relatorio_${ano}_${mes.padStart(2,"0")}.pdf` };
}


// ─── [M-AU3/G-R1] Relatório mensal PDF ───────────────────────────────────────
async function gerarRelatorioPDF(processos, mesAno, appConfig) {
  const lib = await loadJsPDF();
  if (!lib) return { error: "jsPDF não disponível." };
  const { jsPDF } = lib;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, fv = v => v && String(v).trim() ? String(v).trim() : "—";

  // Filtrar processos do mês
  const [mes, ano] = mesAno.split("/");
  const chave = `${ano}-${mes.padStart(2,"0")}`;
  const filtrados = processos.filter(p => {
    const raw = String(p["DATA"] || "");
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) return (raw.slice(6,10)+"-"+raw.slice(3,5)) === chave;
    if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0,7) === chave;
    return false;
  });

  const parseBRL = v => { const s=String(v||"").replace(/\./g,"").replace(",",".").replace(/[^\d.]/g,""); const n=parseFloat(s); return isNaN(n)?0:n; };
  const fmtBRL = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  // Totais por órgão
  const porOrgao = {};
  filtrados.forEach(p => {
    const o = p["ORGÃO"] || "Sem órgão";
    if (!porOrgao[o]) porOrgao[o] = { n: 0, total: 0, def: 0, indef: 0 };
    porOrgao[o].n++;
    porOrgao[o].total += parseBRL(p["VALOR"]);
    if (p["_decisao"] === "deferir") porOrgao[o].def++;
    else if (p["_decisao"] === "indeferir") porOrgao[o].indef++;
  });
  const totalGeral = filtrados.reduce((a,p) => a + parseBRL(p["VALOR"]), 0);
  const ctrl = appConfig?.controlador || {};

  // ── Cabeçalho ──
  if (window.BRASAO_B64) {
    try { doc.addImage(window.BRASAO_B64, "PNG", (W-25)/2, 8, 25, 18); } catch {}
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("ESTADO DO MARANHÃO", W/2, 30, { align: "center" });
  doc.text("PREFEITURA MUNICIPAL DE GOVERNADOR EDISON LOBÃO", W/2, 35, { align: "center" });
  doc.text("CONTROLADORIA DO MUNICÍPIO", W/2, 40, { align: "center" });
  doc.setLineWidth(0.5); doc.line(19, 43, W-19, 43);

  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  const nomeMes = ["","JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO",
    "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
  doc.text(`RELATÓRIO MENSAL DE PAGAMENTOS — ${nomeMes[parseInt(mes)] || mes}/${ano}`, W/2, 52, { align: "center" });

  // ── Sumário ──
  let y = 62;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  [
    ["Total de processos:", filtrados.length.toString()],
    ["Deferidos:", filtrados.filter(p=>p["_decisao"]==="deferir").length.toString()],
    ["Indeferidos:", filtrados.filter(p=>p["_decisao"]==="indeferir").length.toString()],
    ["Pendentes:", filtrados.filter(p=>!p["_decisao"]).length.toString()],
    ["Valor total:", fmtBRL(totalGeral)]
  ].forEach(([l,v]) => {
    doc.setFont("helvetica","bold"); doc.text(l, 25, y);
    doc.setFont("helvetica","normal"); doc.text(v, 85, y);
    y += 6;
  });

  // ── Tabela por órgão ──
  y += 4;
  doc.setLineWidth(0.3); doc.line(19, y, W-19, y); y += 4;
  doc.setFont("helvetica","bold"); doc.setFontSize(10);
  doc.text("Órgão / Secretaria", 22, y);
  doc.text("Qtd", 118, y, { align: "right" });
  doc.text("Deferidos", 138, y, { align: "right" });
  doc.text("Total R$", W-20, y, { align: "right" });
  y += 2; doc.line(19, y, W-19, y); y += 4;

  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  Object.entries(porOrgao).sort(([,a],[,b])=>b.total-a.total).forEach(([org, dados]) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const orgLabel = org.slice(0,55);
    doc.text(orgLabel, 22, y);
    doc.text(dados.n.toString(), 118, y, { align: "right" });
    doc.text(dados.def.toString(), 138, y, { align: "right" });
    doc.text(fmtBRL(dados.total), W-20, y, { align: "right" });
    y += 5;
  });

  y += 2; doc.setLineWidth(0.5); doc.line(19, y, W-19, y); y += 5;
  doc.setFont("helvetica","bold"); doc.setFontSize(10);
  doc.text("TOTAL GERAL", 22, y);
  doc.text(filtrados.length.toString(), 118, y, { align: "right" });
  doc.text(fmtBRL(totalGeral), W-20, y, { align: "right" });

  // ── Lista de processos ──
  y += 10;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("Nº", 22, y); doc.text("Fornecedor", 32, y);
  doc.text("Valor", W-50, y, { align: "right" }); doc.text("Decisão", W-20, y, { align: "right" });
  y += 2; doc.setLineWidth(0.2); doc.line(19, y, W-19, y); y += 4;
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  filtrados.forEach(p => {
    if (y > 280) { doc.addPage(); y = 20; }
    doc.text(String(p["NÚMERO DO DOCUMENTO"]||""), 22, y);
    doc.text((p["FORNECEDOR"]||"").slice(0,48), 32, y);
    doc.text(fmtBRL(parseBRL(p["VALOR"])), W-50, y, { align: "right" });
    const dec = p["_decisao"]==="deferir"?"DEF":p["_decisao"]==="indeferir"?"INDEF":"PEND";
    doc.text(dec, W-20, y, { align: "right" });
    y += 4;
  });

  // ── Assinatura ──
  if (y > 250) { doc.addPage(); y = 20; }
  y += 10;
  const ctrlNome = fv(ctrl.nome) || "Thiago Soares Lima";
  const ctrlCargo = fv(ctrl.cargo) || "Controlador Geral";
  const ctrlPortaria = fv(ctrl.portaria) || "";
  const hoje = new Date();
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  doc.text(`Governador Edison Lobão/MA, ${hoje.getDate()} de ${["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"][hoje.getMonth()+1]} de ${hoje.getFullYear()}`, W-19, y, { align: "right" });
  y += 16;
  doc.text(ctrlNome, W/2, y, { align: "center" });
  y += 5; doc.text(ctrlCargo, W/2, y, { align: "center" });
  if (ctrlPortaria) { y += 5; doc.text(ctrlPortaria, W/2, y, { align: "center" }); }

  // ── Rodapé ──
  const totalPgs = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPgs; pg++) {
    doc.setPage(pg); doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(150,150,150);
    doc.text(FOOTER_TXT, W/2, 291, { align: "center" });
    doc.text(`Pág. ${pg}/${totalPgs}`, W-19, 291, { align: "right" });
    doc.setTextColor(0,0,0);
  }

  const blob = doc.output("blob");
  return { blob, name: `Relatorio_${ano}_${mes.padStart(2,"0")}.pdf` };
}


// ─── gerarPDF ─────────────────────────────────────────────────────────────────
async function gerarPDF(d, tipo, deferir, checklist, sits) {
  try {
    const lib = await loadJsPDF();
    if (!lib) return {
      error: "jsPDF não disponível."
    };
    const {
      jsPDF
    } = lib;
    const fv = v => v && String(v).trim() ? String(v).trim() : "";
    const W = 210,
      H = 297,
      SAFE = H - 13; // margem inferior segura

    // ── Tick / Cross na coluna Situação ──────────────────────────────────────
    function tick(doc, cx, cy) {
      doc.setDrawColor(0, 100, 0);
      doc.setLineWidth(0.5);
      doc.line(cx - 2.2, cy, cx - 0.5, cy + 2.2);
      doc.line(cx - 0.5, cy + 2.2, cx + 2.5, cy - 1.8);
    }
    function cross(doc, cx, cy) {
      doc.setDrawColor(180, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(cx - 2, cy - 2, cx + 2, cy + 2);
      doc.line(cx + 2, cy - 2, cx - 2, cy + 2);
    }

    // ── Cabeçalho (brasão + 3 linhas + linha opcional) ────────────────────────
    function cabecalho(doc, withLine) {
      const bW = 30.7,
        bH = 22.5,
        bX = (W - bW) / 2,
        bY = 8;
      try {
        doc.addImage(window.BRASAO_B64, "PNG", bX, bY, bW, bH);
      } catch (e) {}
      let y = bY + bH + 4.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("ESTADO DO MARANHÃO", W / 2, y, {
        align: "center"
      });
      y += 5;
      doc.text("PREFEITURA MUNICIPAL DE GOVERNADOR EDISON LOBÃO", W / 2, y, {
        align: "center"
      });
      y += 5;
      doc.text("CONTROLADORIA DO MUNICÍPIO", W / 2, y, {
        align: "center"
      });
      y += 5;
      if (withLine) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        doc.line(19, y, W - 19, y);
        y += 1;
      }
      return y;
    }

    // ── Garantir espaço — adiciona página nova se necessário ──────────────────
    function ensureSpace(doc, needed) {
      if (y + needed > SAFE) {
        doc.addPage();
        y = cabecalho(doc, true) + 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS);
        doc.setTextColor(0, 0, 0);
      }
    }

    // ── Dimensões base página 2 ───────────────────────────────────────────────
    const CAB2_H = 52,
      TOP_GAP = 8,
      FOOTER_MARGIN = 13;
    const AVAIL = H - CAB2_H - TOP_GAP - FOOTER_MARGIN; // ≈ 224mm

    // ── Constantes de layout ──────────────────────────────────────────────────
    const FS0 = 12,
      LH0 = 5.5,
      MIN_ROW0 = 7.5,
      PAD0 = 3.0;
    const pW = W - 30 - 19; // 161mm
    const DML = 28.0;
    const DC = [24.9, 22.6, 24.4, 32.5, 33.1, 34.4];
    const CK1 = 12.7,
      CK2 = 139.8,
      CK3 = 19.4;
    const ckX = DML;

    // ── Pré-calcular tamanho do conteúdo (escala base) ────────────────────────
    const doc0 = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    doc0.setFont("helvetica", "normal");
    doc0.setFontSize(FS0);
    function nL(text, w) {
      return doc0.splitTextToSize(fv(text), w).length;
    }
    function rH0(text, w) {
      return Math.max(MIN_ROW0, nL(text, w) * LH0 + PAD0);
    }
    const vw0 = DC[1] + DC[2] + DC[3] + DC[4] + DC[5];
    const vw1 = DC[2] + DC[3] + DC[4] + DC[5];

    // Soma do conteúdo a escala 1.0
    const lbParecer = doc0.splitTextToSize("PARECER DE VERIFICAÇÃO E ANÁLISE DOCUMENTAL Nº " + fv(d.processo) + " (LIBERAÇÃO PARA PAGAMENTO)", pW);
    const lbOrgao = doc0.splitTextToSize("Órgão / Departamento: " + fv(d.orgao), pW);
    const lbObs = d.obs ? doc0.splitTextToSize(d.obs.trim(), pW) : [];
    const lbApos = doc0.splitTextToSize("Após análise e verificação da documentação constante no processo de pagamento acima citado, constatamos o seguinte:", pW);
    const ckRowsH = checklist.map(it => Math.max(MIN_ROW0, nL(it, CK2 - 4) * LH0 + PAD0));
    const dtH = [rH0(d.objeto, vw0), rH0(d.orgao, vw1), rH0(d.fornecedor, vw1), rH0(d.modalidade, vw1), rH0(d.contrato, vw1), rH0(d.cnpj, vw1), Math.max(MIN_ROW0, nL(d.tipo_doc, DC[2] - 3) * LH0 + PAD0)];
    let total = 0;
    total += lbParecer.length * 5.8 + 7;
    total += 5.5 + lbOrgao.length * LH0 + 5 + 5.5 + 7;
    total += dtH.reduce((a, b) => a + b, 0) + 6;
    total += lbApos.length * LH0 + 6;
    total += MIN_ROW0 + ckRowsH.reduce((a, b) => a + b, 0) + 8;
    total += 6 + (lbObs.length > 0 ? lbObs.length * LH0 + 5 : 8);
    total += 6 + LH0 * 5 + 22; // assinatura

    // ── Fator de escala ───────────────────────────────────────────────────────
    // Tenta caber em 1 página, mas se não couber adiciona páginas (nunca corta conteúdo)
    let scale = total > AVAIL ? Math.max(AVAIL / total, 0.65) : 1.0;
    const FS = FS0 * scale;
    const LH = LH0 * scale;
    const MIN_ROW = MIN_ROW0 * scale;
    const PAD = PAD0 * scale;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    doc.setFontSize(FS);
    doc.setFont("helvetica", "normal");
    function splitS(text, w) {
      return doc.splitTextToSize(fv(text), w);
    }
    function rowH(text, w) {
      return Math.max(MIN_ROW, splitS(text, w).length * LH + PAD);
    }
    let y = 0; // será definido ao iniciar cada página

    // ═══════════════════════════════════════════════════
    // PÁGINA 1 — CAPA
    // ═══════════════════════════════════════════════════
    y = cabecalho(doc, false) + 14;
    const CML = 22.4,
      CCW = 165.1,
      CCA = 47.6,
      CCB = 117.5;

    // Título da capa
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(CML, y, CCW, 10, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("PROCESSO DE PAGAMENTO", CML + CCW / 2, y + 7, {
      align: "center"
    });
    y += 10;

    // Linhas de dados da capa
    const capaRows = [["Órgão:", fv(d.orgao)], ["Processo:", fv(d.processo)], ["Fornecedor:", fv(d.fornecedor)], ["CNPJ:", fv(d.cnpj)], ["NF/Fatura:", fv(d.nf)], ["Contrato:", fv(d.contrato)], ["Modalidade:", fv(d.modalidade)], ["Período de ref.:", fv(d.periodo_ref)], ["N° Ordem de C.:", fv(d.ordem_compra || "")], ["Data da NF.:", fv(d.data_nf)], ["Secretário(a):", fv(d.secretario)], ["Data do ateste:", fv(d.data_ateste)]];
    doc.setFontSize(14);
    for (const [lbl, val] of capaRows) {
      const vL = doc.splitTextToSize(val, CCB - 4);
      const rH = Math.max(10, vL.length * 6.8 + 3);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.rect(CML, y, CCA, rH, "S");
      doc.rect(CML + CCA, y, CCB, rH, "S");
      const TY = y + 7;
      doc.setFont("helvetica", "bold");
      doc.text(lbl, CML + 2.5, TY);
      doc.setFont("helvetica", "normal");
      if (val) {
        vL.forEach((l, li) => doc.text(l, CML + CCA + 2.5, TY + li * 6.8));
      }
      y += rH;
    }

    // Caixa Obs. — sempre vazia na capa (obs. aparece só no Parecer)
    y += 3;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.rect(CML, y, CCW, 30, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Obs.:", CML + 2.5, y + 8);
    // Não avança y — página 1 termina aqui

    // ═══════════════════════════════════════════════════
    // PÁGINA 2 — PARECER
    // ═══════════════════════════════════════════════════
    doc.addPage();
    y = cabecalho(doc, true) + TOP_GAP;

    // PARECER heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS);
    doc.setTextColor(0, 0, 0);
    const pL = splitS("PARECER DE VERIFICAÇÃO E ANÁLISE DOCUMENTAL Nº " + fv(d.processo) + " (LIBERAÇÃO PARA PAGAMENTO)", pW);
    ensureSpace(doc, pL.length * 5.8 * scale + 7);
    doc.text(pL, 30, y, {
      align: "justify",
      maxWidth: pW
    });
    y += pL.length * 5.8 * scale + 7;

    // Ao / Órgão / Ref
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS);
    ensureSpace(doc, LH * 2 + 10);
    doc.text("Ao", 30, y);
    y += LH;
    const orgL = splitS("Órgão / Departamento: " + fv(d.orgao), pW);
    doc.text(orgL, 30, y);
    y += orgL.length * LH + 5 * scale;
    ensureSpace(doc, LH + 7);
    doc.text("Ref. Processo de Pagamento de Despesa.", 30, y);
    y += LH + 1.5 * scale;

    // ── Tabela de dados ───────────────────────────────────────────────────────
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    function dRow(lbl, val, lW, vW) {
      const vL = splitS(val, vW - 3);
      const rH = Math.max(MIN_ROW, vL.length * LH + PAD);
      ensureSpace(doc, rH);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.rect(DML, y, lW, rH, "S");
      doc.rect(DML + lW, y, vW, rH, "S");
      const TY = y + LH * 0.9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FS);
      doc.text(lbl, DML + 2.5, TY);
      doc.setFont("helvetica", "normal");
      if (val) {
        vL.forEach((l, li) => doc.text(l, DML + lW + 2.5, TY + li * LH));
      }
      y += rH;
    }
    dRow("OBJETO:", d.objeto, DC[0], vw0);
    dRow("Secretaria/Programa:", d.orgao, DC[0] + DC[1], vw1);
    dRow("Fornecedor/Credor:", d.fornecedor, DC[0] + DC[1], vw1);
    dRow("Modalidade", d.modalidade, DC[0] + DC[1], vw1);
    dRow("Contrato", d.contrato, DC[0] + DC[1], vw1);
    dRow("CNPJ/CPF Nº", d.cnpj, DC[0] + DC[1], vw1);

    // Linha Documento Fiscal (5 colunas)
    {
      const c0 = DC[0] + DC[1],
        c1 = DC[2],
        c2 = DC[3],
        c3 = DC[4],
        c4 = DC[5];
      const x0 = DML,
        x1 = DML + c0,
        x2 = x1 + c1,
        x3 = x2 + c2,
        x4 = x3 + c3;
      const dfL = splitS(d.tipo_doc, c1 - 3);
      const dfH = Math.max(MIN_ROW, dfL.length * LH + PAD);
      ensureSpace(doc, dfH);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.rect(x0, y, c0, dfH, "S");
      doc.rect(x1, y, c1, dfH, "S");
      doc.rect(x2, y, c2, dfH, "S");
      doc.rect(x3, y, c3, dfH, "S");
      doc.rect(x4, y, c4, dfH, "S");
      const mid = y + dfH / 2 + LH * 0.35;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FS);
      doc.text("Documento Fiscal", x0 + 2.5, mid);
      doc.setFont("helvetica", "normal");
      dfL.forEach((l, li) => doc.text(l, x1 + 2.5, mid + (li - Math.floor(dfL.length / 2)) * LH));
      doc.setFont("helvetica", "bold");
      doc.text("Nº ", x2 + 2.5, mid);
      const nW = doc.getTextWidth("Nº ");
      doc.setFont("helvetica", "normal");
      if (d.nf) {
        const t = doc.splitTextToSize(fv(d.nf), c2 - 4 - nW);
        doc.text(t[0], x2 + 2.5 + nW, mid);
      }
      doc.setFont("helvetica", "bold");
      doc.text("Tipo ", x3 + 2.5, mid);
      const tW = doc.getTextWidth("Tipo ");
      doc.setFont("helvetica", "normal");
      if (d.tipo_nf) {
        const t = doc.splitTextToSize(fv(d.tipo_nf), c3 - 4 - tW);
        doc.text(t[0], x3 + 2.5 + tW, mid);
      }
      doc.setFont("helvetica", "bold");
      doc.text("R$ ", x4 + 2.5, mid);
      const rW2 = doc.getTextWidth("R$ ");
      doc.setFont("helvetica", "normal");
      if (d.valor) {
        const t = doc.splitTextToSize(fv(d.valor), c4 - 4 - rW2);
        doc.text(t[0], x4 + 2.5 + rW2, mid);
      }
      y += dfH;
    }
    y += 6 * scale;

    // Após análise...
    const aposL = splitS("Após análise e verificação da documentação constante no processo de pagamento acima citado, constatamos o seguinte:", pW);
    ensureSpace(doc, aposL.length * LH + 6 * scale);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS);
    doc.setTextColor(0, 0, 0);
    doc.text(aposL, 30, y);
    y += aposL.length * LH + 6 * scale;

    // ── Checklist ──────────────────────────────────────────────────────────────
    const ckHH = Math.max(MIN_ROW, LH + PAD);
    ensureSpace(doc, ckHH);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.rect(ckX, y, CK1, ckHH, "S");
    doc.rect(ckX + CK1, y, CK2, ckHH, "S");
    doc.rect(ckX + CK1 + CK2, y, CK3, ckHH, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS);
    doc.text("Item", ckX + CK1 / 2, y + ckHH / 2 + LH * 0.35, {
      align: "center"
    });
    doc.text("Descrição: Documentos \u2013 Ato", ckX + CK1 + CK2 / 2, y + ckHH / 2 + LH * 0.35, {
      align: "center"
    });
    doc.setFontSize(FS * 0.85);
    doc.text("Situação", ckX + CK1 + CK2 + CK3 / 2, y + ckHH / 2 + LH * 0.35, {
      align: "center"
    });
    doc.setFontSize(FS);
    y += ckHH;
    for (let i = 0; i < checklist.length; i++) {
      const dL = splitS(checklist[i], CK2 - 4);
      const rH = Math.max(MIN_ROW, dL.length * LH + PAD);
      ensureSpace(doc, rH);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.rect(ckX, y, CK1, rH, "S");
      doc.rect(ckX + CK1, y, CK2, rH, "S");
      doc.rect(ckX + CK1 + CK2, y, CK3, rH, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS);
      doc.setTextColor(0, 0, 0);
      const ckTY = y + LH * 0.9;
      doc.text(String(i + 1), ckX + CK1 / 2, ckTY, {
        align: "center"
      });
      dL.forEach((l, li) => doc.text(l, ckX + CK1 + 2.5, ckTY + li * LH));
      const sx = ckX + CK1 + CK2 + CK3 / 2,
        sy = y + rH / 2;
      if (sits[i]) tick(doc, sx, sy);else cross(doc, sx, sy);
      y += rH;
    }
    y += 8 * scale;

    // ── OBSERVAÇÃO — sempre visível, nunca cortada ────────────────────────────
    ensureSpace(doc, LH * 2 + 4 * scale); // só precisa de 2 linhas de espaço mínimo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS);
    doc.setTextColor(0, 0, 0);
    doc.text("OBSERVAÇÃO:", 30, y);
    y += 6 * scale;
    if (d.obs && d.obs.trim()) {
      const oL = splitS(d.obs.trim(), pW);
      // Garante espaço para cada linha, adicionando página se precisar
      for (let li = 0; li < oL.length; li++) {
        ensureSpace(doc, LH + 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS);
        doc.text(oL[li], 30, y);
        y += LH;
      }
      y += 5 * scale;
    } else {
      y += 10 * scale;
    }

    // ── Assinatura — só vai para nova página se realmente não couber ──────────
    // sigH_min = conteúdo real sem espaço em branco excessivo
    const sigH_min = LH * 5 + 12 * scale; // 12mm para espaço de assinatura manuscrita
    const pre_gap = 3 * scale;
    // Só adiciona página se o conteúdo realmente não cabe (com margem de 3mm)
    if (y + pre_gap + sigH_min + 3 * scale > SAFE) {
      doc.addPage();
      y = cabecalho(doc, true) + TOP_GAP;
    }
    y += pre_gap;
    const ctrl = d.controlador || {};
    const ctrlNome = fv(ctrl.nome) || "Thiago Soares Lima";
    const ctrlCargo = fv(ctrl.cargo) || "Controlador Geral";
    const ctrlPortaria = fv(ctrl.portaria) || "Portaria 002/2025";
    const decTxt = deferir ? "DEFERIMOS O PAGAMENTO:" : "INDEFERIMOS O PAGAMENTO:";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS);
    doc.setTextColor(0, 0, 0);
    doc.text("Governador Edison Lobão/MA, " + fv(d.data_ateste || dtExt(new Date())), W - 19, y, {
      align: "right"
    });
    y += LH;
    doc.text("Nestes Termos:", 90, y);
    y += LH;
    doc.text(decTxt, 90, y);
    y += 12 * scale;
    doc.text(ctrlNome, W / 2, y, {
      align: "center"
    });
    y += LH;
    doc.text(ctrlCargo, W / 2, y, {
      align: "center"
    });
    y += LH;
    if (ctrlPortaria) doc.text(ctrlPortaria, W / 2, y, {
      align: "center"
    });

    // ── Rodapé em todas as páginas ─────────────────────────────────────────────
    const totalPgs = doc.internal.getNumberOfPages();
    for (let pg = 1; pg <= totalPgs; pg++) {
      doc.setPage(pg);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(FOOTER_TXT, W / 2, H - 6, {
        align: "center"
      });
    }
    const blob = doc.output("blob");
    return {
      blob,
      name: "PROCESSO_" + fv(d.processo || "doc") + "_" + tipo.toUpperCase() + ".pdf"
    };
  } catch (e) {
    return {
      error: e.message || "Erro ao gerar PDF."
    };
  }
}

