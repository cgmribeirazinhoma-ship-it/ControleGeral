import React, {{ useState, useEffect, useCallback, useMemo, useRef }} from 'react';
import {{ MUN, T, TINFO, CHK, STATUS_MAP }} from '../constants.js';

// ─── BuscarPage ───────────────────────────────────────────────────────────────
function BuscarPage({
  processos,
  onCarregar,
  onEditar,
  onGerarPDF,
  toast,
  dark,
  user
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({
    col: "NÚMERO DO DOCUMENTO",
    dir: -1 // do último para o primeiro por padrão
  });
  // [FIX5] Filtros avançados
  const [filtTipo, setFiltTipo] = useState("");
  const [filtDec, setFiltDec] = useState("");
  const [filtAno, setFiltAno] = useState("");
  const [lPDF, setLPDF] = useState(null);
  const dq = useDebounce(q, 300);
  const bg = dark ? T.appBgDark : T.appBg,
    cardBg = dark ? T.cardBgDark : T.cardBg,
    bdr = dark ? T.borderDark : T.border,
    tc = dark ? T.textMainDark : T.textMain;
  // Anos disponíveis para filtro
  const anosDisp = useMemo(() => {
    const s = new Set();
    processos.forEach(p => { const m = String(p["DATA"] || "").match(/\d{4}/); if (m) s.add(m[0]); });
    return [...s].sort().reverse();
  }, [processos]);
  const filtered = useMemo(() => {
    let r = processos;
    if (dq.trim()) {
      const ql = dq.toLowerCase();
      r = r.filter(p => ["NÚMERO DO DOCUMENTO", "FORNECEDOR", "ORGÃO", "OBJETO", "CONTRATO", "VALOR", "DATA", "CNPJ"].some(c => String(p[c] || "").toLowerCase().includes(ql)));
    }
    if (filtTipo) r = r.filter(p => (p["_tipoKey"] || "padrao") === filtTipo);
    if (filtDec) {
      if (filtDec === "PENDENTE") r = r.filter(p => !p["_decisao"]);
      else if (filtDec === "deferir") r = r.filter(p => p["_decisao"] === "deferir");
      else r = r.filter(p => p["_decisao"] === "indeferir");
    }
    if (filtAno) r = r.filter(p => String(p["DATA"] || "").includes(filtAno));
    return [...r].sort((a, b) => {
      const va = a[sort.col] ?? "";
      const vb = b[sort.col] ?? "";
      // Ordenação numérica para NÚMERO DO DOCUMENTO
      if (sort.col === "NÚMERO DO DOCUMENTO") {
        const na = parseInt(String(va).trim(), 10);
        const nb = parseInt(String(vb).trim(), 10);
        if (!isNaN(na) && !isNaN(nb)) return (na - nb) * sort.dir;
      }
      return String(va).localeCompare(String(vb), "pt-BR") * sort.dir;
    });
  }, [processos, dq, sort, filtTipo, filtDec, filtAno]);
  const limitado = filtered.length > 100;
  const exibidos = filtered.slice(0, 100);
  const cols = ["NÚMERO DO DOCUMENTO", "ORGÃO", "FORNECEDOR", "CNPJ", "VALOR", "DATA", "OBJETO", "_usuario"];
  const colLabel = c => c === "NÚMERO DO DOCUMENTO" ? "Nº DOC" : c === "_usuario" ? "Usuário" : c === "CNPJ" ? "CNPJ/CPF" : c;
  const toggleSort = col => setSort(s => s.col === col ? {
    col,
    dir: s.dir * -1
  } : {
    col,
    dir: col === "NÚMERO DO DOCUMENTO" ? -1 : 1 // Nº sempre começa decrescente
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      background: bg
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "\uD83D\uDD0D",
    title: "Buscar & Editar",
    sub: "Pesquise, edite e gere PDFs",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\uD83D\uDD0E  N\xBA, fornecedor, CNPJ, \xF3rg\xE3o, objeto, valor...",
    style: {
      ...IS(dark),
      marginBottom: 10,
      fontSize: 14,
      padding: "10px 14px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }
  },
    /*#__PURE__*/React.createElement("select", {
      value: filtTipo, onChange: e => setFiltTipo(e.target.value),
      style: { ...IS(dark), width: "auto", minWidth: 140, padding: "7px 10px", marginBottom: 0, fontSize: 12 }
    },
      /*#__PURE__*/React.createElement("option", { value: "" }, "Todos os tipos"),
      Object.entries(TINFO).map(([k, v]) => /*#__PURE__*/React.createElement("option", { key: k, value: k }, v.label))
    ),
    /*#__PURE__*/React.createElement("select", {
      value: filtDec, onChange: e => setFiltDec(e.target.value),
      style: { ...IS(dark), width: "auto", minWidth: 140, padding: "7px 10px", marginBottom: 0, fontSize: 12 }
    },
      /*#__PURE__*/React.createElement("option", { value: "" }, "Todas as decisões"),
      /*#__PURE__*/React.createElement("option", { value: "deferir" }, "✅ Deferido"),
      /*#__PURE__*/React.createElement("option", { value: "indeferir" }, "❌ Indeferido"),
      /*#__PURE__*/React.createElement("option", { value: "PENDENTE" }, "⏳ Pendente")
    ),
    /*#__PURE__*/React.createElement("select", {
      value: filtAno, onChange: e => setFiltAno(e.target.value),
      style: { ...IS(dark), width: "auto", minWidth: 110, padding: "7px 10px", marginBottom: 0, fontSize: 12 }
    },
      /*#__PURE__*/React.createElement("option", { value: "" }, "Todos os anos"),
      anosDisp.map(a => /*#__PURE__*/React.createElement("option", { key: a, value: a }, a))
    ),
    (filtTipo || filtDec || filtAno) && /*#__PURE__*/React.createElement("button", {
      onClick: () => { setFiltTipo(""); setFiltDec(""); setFiltAno(""); },
      style: { fontSize: 11, padding: "6px 12px", background: "#fee2e2",
        border: "1px solid #fecaca", borderRadius: 7, color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap" }
    }, "✕ Limpar filtros"),
    /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#94a3b8", marginLeft: "auto" } },
      filtered.length, " resultado(s)")
  ), limitado && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "#d97706",
      fontWeight: 600,
      marginBottom: 10,
      padding: "8px 12px",
      background: "#451a03",
      borderRadius: 8,
      border: "1px solid #92400e"
    }
  }, "\u26A0\uFE0F Exibindo 100 de ", filtered.length, " resultados. Refine a busca para ver mais."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 12,
      border: `1.5px solid ${bdr}`,
      overflow: "hidden",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto",
      maxHeight: 520,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12.5
    }
  }, /*#__PURE__*/React.createElement("thead", {
    style: {
      position: "sticky",
      top: 0,
      background: dark ? "#003d0a" : "#f2f7ee",
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: `1.5px solid ${bdr}`
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("th", {
    key: c,
    onClick: () => toggleSort(c),
    style: {
      padding: "10px 12px",
      textAlign: "left",
      fontWeight: 700,
      color: "#475569",
      whiteSpace: "nowrap",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      cursor: "pointer",
      userSelect: "none",
      background: sort.col === c ? dark ? "#2d1f4e" : "#f5f3ff" : "transparent"
    }
  }, colLabel(c), " ", sort.col === c ? sort.dir === 1 ? "↑" : "↓" : "")), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "10px 12px",
      width: 200,
      textAlign: "center",
      fontSize: 11,
      fontWeight: 700,
      color: "#475569",
      textTransform: "uppercase"
    }
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", null, exibidos.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: cols.length + 1,
    style: {
      padding: "24px",
      textAlign: "center",
      color: "#94a3b8"
    }
  }, "Nenhum resultado")) : exibidos.map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: `1px solid ${bdr}`,
      background: i % 2 === 0 ? cardBg : dark ? "#131f2e" : "#fafbfc"
    },
    onMouseEnter: e => e.currentTarget.style.background = dark ? "#1e2d40" : "#eff6ff",
    onMouseLeave: e => e.currentTarget.style.background = i % 2 === 0 ? cardBg : dark ? "#131f2e" : "#fafbfc"
  }, cols.map(c => /*#__PURE__*/React.createElement("td", {
    key: c,
    style: {
      padding: "9px 12px",
      maxWidth: 160,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      color: tc
    }
  }, c === "DATA" || c === "DATA NF" ? fmtD(String(p[c] || "")) : c === "_usuario" ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: dark ? "#1e2d40" : "#f1f5f9",
        borderRadius: 5,
        padding: "2px 7px",
        fontSize: 11,
        fontWeight: 600,
        color: dark ? "#93c5fd" : "#1e40af"
      }
    }, "\uD83D\uDC64 ", String(p[c] || "—")) : String(p[c] || "").slice(0, 60))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "6px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      justifyContent: "center"
    }
  }, onGerarPDF && /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      if (lPDF !== null) return;
      setLPDF(i);
      try {
        await onGerarPDF(p, {
          _dummy: true
        });
      } finally {
        setLPDF(null);
      }
    },
    disabled: lPDF !== null,
    style: {
      ...BS("danger", lPDF !== null, dark),
      height: 32,
      fontSize: 11,
      padding: "0 10px 0 5px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: lPDF === i ? "⏳" : "📄"
  }), lPDF === i ? "..." : "PDF"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onEditar && onEditar(p),
    style: {
      ...BS("orange", false, dark),
      height: 32,
      fontSize: 11,
      padding: "0 12px 0 5px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\u270F\uFE0F"
  }), "Editar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onCarregar(p),
    style: {
      ...BS("secondary", false, dark),
      height: 32,
      fontSize: 11,
      padding: "0 10px 0 5px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\u29C9"
  })))))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94a3b8"
    }
  }, "Exibindo ", exibidos.length, " de ", filtered.length, " \xB7 Total: ", processos.length)));
}


export default BuscarPage;
