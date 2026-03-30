import React, {{ useState, useEffect, useCallback, useMemo, useRef }} from 'react';
import {{ MUN, T, TINFO, CHK, STATUS_MAP }} from '../constants.js';

// ─── HistoricoPage ────────────────────────────────────────────────────────────
function HistoricoPage({
  historico,
  dark,
  onDuplicar,
  onGerarPDF,
  onEditar,
  truncado
}) {
  const [q, setQ] = useState("");
  const [filtDec, setFiltDec] = useState("");
  // [FIX2] Paginação real — 50 por página
  const [pagAtual, setPagAtual] = useState(0);
  const PER_PAGE = 50;
  const [lPDF, setLPDF] = useState(null);
  const bg = dark ? T.appBgDark : T.appBg,
    cardBg = dark ? T.cardBgDark : T.cardBg,
    bdr = dark ? T.borderDark : T.border,
    tc = dark ? T.textMainDark : T.textMain;
  const filtered = useMemo(() => {
    let r = historico;
    if (q.trim()) {
      const ql = q.toLowerCase();
      r = r.filter(h => ["Processo", "Órgão", "Fornecedor", "Tipo", "Valor", "CNPJ"].some(c => String(h[c] || "").toLowerCase().includes(ql)));
    }
    if (filtDec) {
      if (filtDec === "PENDENTE") {
        r = r.filter(h => !String(h["Decisão"] || ""));
      } else {
        r = r.filter(h => String(h["Decisão"] || "").includes(filtDec));
      }
    }
    return r;
  }, [historico, q, filtDec]);
  // Reset página ao filtrar
  useEffect(() => { setPagAtual(0); }, [q, filtDec]);
  const totalPags = Math.ceil(filtered.length / PER_PAGE);
  const exibidos = useMemo(() => filtered.slice(pagAtual * PER_PAGE, (pagAtual + 1) * PER_PAGE), [filtered, pagAtual]);
  const def = useMemo(() => historico.filter(h => {
    const d = String(h["Decisão"] || "");
    return d.includes("DEFERIDO") && !d.includes("INDE");
  }).length, [historico]);
  const indef = useMemo(() => historico.filter(h =>
    String(h["Decisão"] || "").includes("INDE")
  ).length, [historico]);
  const handlePDF = async (h, idx) => {
    if (lPDF !== null) return;
    setLPDF(idx);
    try {
      await onGerarPDF(h, {
        _dummy: true
      });
    } finally {
      setLPDF(null);
    }
    ;
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      background: bg
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "\uD83D\uDD50",
    title: "Hist\xF3rico",
    sub: _sbReady ? "\u2601\uFE0F Sincronizado \u2014 atualiza a cada 20s" : "Documentos processados",
    cor: "#7c3aed",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 20px"
    }
  }, truncado && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "#fbbf24",
      fontWeight: 600,
      marginBottom: 12,
      padding: "8px 14px",
      background: "#451a03",
      borderRadius: 8,
      border: "1px solid #92400e"
    }
  }, "\u26A0\uFE0F Exibindo os 1000 registros mais recentes. Exporte o Excel para ver o hist\xF3rico completo."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(KPICard, {
    label: "Total",
    value: historico.length,
    gradient: T.kpi1,
    icon: "\uD83D\uDD50"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Deferidos",
    value: def,
    gradient: T.kpi5,
    icon: "\u2705"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Indeferidos",
    value: indef,
    gradient: T.kpi3,
    icon: "\u274C"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Pendentes",
    value: historico.length - def - indef,
    gradient: T.kpi4,
    icon: "\u23F3"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\uD83D\uDD0E  Processo, fornecedor...",
    style: {
      ...IS(dark),
      flex: 1,
      fontSize: 13,
      padding: "8px 12px",
      marginBottom: 0
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: filtDec,
    onChange: e => setFiltDec(e.target.value),
    style: {
      ...IS(dark),
      width: "auto",
      minWidth: 130,
      padding: "8px 10px",
      fontSize: 12,
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos"), /*#__PURE__*/React.createElement("option", {
    value: "DEFERIDO"
  }, "\u2705 Deferido"), /*#__PURE__*/React.createElement("option", {
    value: "INDEFERIDO"
  }, "\u274C Indeferido"), /*#__PURE__*/React.createElement("option", {
    value: "PENDENTE"
  }, "\u23F3 Pendente"))), filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "60px 24px",
      color: dark ? "#2e4a6e" : "#94a3b8",
      fontSize: 13
    }
  }, "Nenhum registro encontrado.") : /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 12,
      border: `1.5px solid ${bdr}`,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto",
      maxHeight: 560,
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
      background: dark ? "#030c03" : "#f2f7ee",
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: `1.5px solid ${bdr}`
    }
  }, ["Processo", "Data", "Órgão", "Fornecedor", "Valor", "Tipo", "Usuário", "Registrado em", "Decisão"].map(c => /*#__PURE__*/React.createElement("th", {
    key: c,
    style: {
      padding: "10px 12px",
      textAlign: "left",
      fontWeight: 700,
      color: "#475569",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      whiteSpace: "nowrap"
    }
  }, c)), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "10px 12px",
      textAlign: "center",
      fontSize: 11,
      fontWeight: 700,
      color: "#475569",
      textTransform: "uppercase"
    }
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", null, exibidos.map((h, i) => {
    const dec = String(h["Decisão"] || "");
    const isDef = dec.includes("DEFERIDO") && !dec.includes("INDE");
    const isIndef = dec.includes("INDE");
    const isPend = !isDef && !isIndef;
    return /*#__PURE__*/React.createElement("tr", {
      key: i,
      style: {
        borderBottom: `1px solid ${bdr}`,
        background: i % 2 === 0 ? cardBg : dark ? "#131f2e" : "#fafbfc"
      },
      onMouseEnter: e => e.currentTarget.style.background = dark ? "#1e2d40" : "#f0f9ff",
      onMouseLeave: e => e.currentTarget.style.background = i % 2 === 0 ? cardBg : dark ? "#131f2e" : "#fafbfc"
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px",
        color: tc,
        fontWeight: 700
      }
    }, h["Processo"] || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px",
        color: tc,
        whiteSpace: "nowrap"
      }
    }, h["Data"] || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px",
        color: tc,
        maxWidth: 120,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, String(h["Órgão"] || "").slice(0, 30)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px",
        color: tc,
        maxWidth: 140,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, String(h["Fornecedor"] || "").slice(0, 35)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px",
        color: tc,
        whiteSpace: "nowrap"
      }
    }, h["Valor"] || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px",
        color: tc
      }
    }, h["Tipo"] || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px",
        color: tc,
        whiteSpace: "nowrap",
        fontSize: 11.5
      }
    }, /*#__PURE__*/React.createElement("span", {
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
    }, "\uD83D\uDC64 ", h["_usuario"] || "—")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px",
        color: tc,
        whiteSpace: "nowrap",
        fontSize: 11,
        fontFamily: "monospace"
      }
    }, h["_registradoEm"] ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: dark ? "#0f1a0f" : "#f0fdf4",
        borderRadius: 5,
        padding: "2px 7px",
        fontSize: 11,
        color: dark ? "#4ade80" : "#166534",
        fontWeight: 600
      }
    }, "\uD83D\uDD52 ", h["_registradoEm"]) : /*#__PURE__*/React.createElement("span", {
      style: { color: "#94a3b8", fontSize: 11 }
    }, "—")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 5,
        background: isDef ? "#0d2318" : isIndef ? "#450a0a" : "#1c1400",
        color: isDef ? "#86efac" : isIndef ? "#fca5a5" : "#fde68a",
        border: `1px solid ${isDef ? "#16a34a" : isIndef ? "#dc2626" : "#ca8a04"}`
      }
    }, isDef ? "✅ DEFERIDO" : isIndef ? "❌ INDEFERIDO" : "⏳ PENDENTE")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "6px 10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5,
        justifyContent: "center",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handlePDF(h, i),
      disabled: lPDF !== null,
      style: {
        ...BS("danger", lPDF !== null, dark),
        height: 30,
        fontSize: 11,
        padding: "0 8px 0 4px"
      }
    }, /*#__PURE__*/React.createElement(BtnIco, {
      emoji: lPDF === i ? "⏳" : "📄"
    }), lPDF === i ? "..." : "PDF"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditar && onEditar(h),
      style: {
        ...BS("orange", false, dark),
        height: 30,
        fontSize: 11,
        padding: "0 8px 0 4px"
      }
    }, /*#__PURE__*/React.createElement(BtnIco, {
      emoji: "\u270F\uFE0F"
    }), "Editar"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onDuplicar && onDuplicar(h),
      style: {
        ...BS("secondary", false, dark),
        height: 30,
        fontSize: 11,
        padding: "0 8px 0 4px"
      }
    }, /*#__PURE__*/React.createElement(BtnIco, {
      emoji: "\u29C9"
    }), "Dup."))));
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginTop: 10, flexWrap: "wrap", gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, color: "#94a3b8" }
  }, "Exibindo ", exibidos.length, " de ", filtered.length, " filtrado(s) \xB7 Total no banco: ", historico.length),
  totalPags > 1 && /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", alignItems: "center", gap: 6 }
  },
  /*#__PURE__*/React.createElement("button", {
    onClick: () => setPagAtual(p => Math.max(0, p - 1)),
    disabled: pagAtual === 0,
    style: { ...BS("secondary", pagAtual === 0, dark), height: 30, padding: "0 12px", fontSize: 12 }
  }, "← Anterior"),
  /*#__PURE__*/React.createElement("span", {
    style: { fontSize: 12, color: dark ? "#94a3b8" : "#64748b", minWidth: 80, textAlign: "center" }
  }, "Pág. ", pagAtual + 1, " de ", totalPags),
  /*#__PURE__*/React.createElement("button", {
    onClick: () => setPagAtual(p => Math.min(totalPags - 1, p + 1)),
    disabled: pagAtual >= totalPags - 1,
    style: { ...BS("secondary", pagAtual >= totalPags - 1, dark), height: 30, padding: "0 12px", fontSize: 12 }
  }, "Próxima →")))));
}


export default HistoricoPage;
