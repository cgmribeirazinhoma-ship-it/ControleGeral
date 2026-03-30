import React, {{ useState, useEffect, useCallback, useMemo, useRef }} from 'react';
import {{ MUN, T, TINFO, CHK, STATUS_MAP }} from '../constants.js';

// ─── DashboardPage ────────────────────────────────────────────────────────────
function DashboardPage({
  processos,
  historico,
  dark,
  appConfig,
  toast
}) {
  const [filtOrg, setFiltOrg] = useState("");
  const [filtAno, setFiltAno] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const mp = useMemo(() => buildMapData(processos), [processos]);
  const anos = useMemo(() => {
    const s = new Set();
    processos.forEach(p => {
      const d = String(p["DATA"] || "");
      const m = d.match(/\d{4}/);
      if (m) s.add(m[0]);
    });
    return [...s].sort().reverse();
  }, [processos]);
  const filtered = useMemo(() => processos.filter(p => {
    if (filtOrg && p["ORGÃO"] !== filtOrg) return false;
    if (filtAno && !String(p["DATA"] || "").includes(filtAno)) return false;
    return true;
  }), [processos, filtOrg, filtAno]);

  // Processos por mês (últimos 12)
  const porMes = useMemo(() => {
    const m = {};
    filtered.forEach(p => {
      const raw = String(p["DATA"] || "");
      // dd/mm/yyyy → yyyy-mm
      let chave = "";
      if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
        chave = raw.slice(6, 10) + "-" + raw.slice(3, 5);
      } else if (/^\d{4}-\d{2}/.test(raw)) {
        chave = raw.slice(0, 7);
      }
      if (chave && chave !== "NaT") m[chave] = (m[chave] || 0) + 1;
    });
    return Object.entries(m).sort(([a], [b]) => a < b ? -1 : 1).slice(-12).map(([mes, n]) => ({ mes, n }));
  }, [filtered]);

  // [FIX8] Total financeiro — soma campo VALOR de todos os processos filtrados
  const parseBRL = v => {
    if (!v) return 0;
    const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  const totalGeral = useMemo(() =>
    filtered.reduce((acc, p) => acc + parseBRL(p["VALOR"]), 0),
  [filtered]);
  const fmtBRL = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Top 8 órgãos
  const topOrg = useMemo(() => {
    const m = {};
    const mv = {};
    filtered.forEach(p => {
      const o = String(p["ORGÃO"] || "").trim();
      if (o) {
        m[o] = (m[o] || 0) + 1;
        mv[o] = (mv[o] || 0) + parseBRL(p["VALOR"]);
      }
    });
    return Object.entries(m).sort(([, a], [, b]) => b - a).slice(0, 8).map(([o, n]) => ({ orgao: o, n, valor: mv[o] || 0 }));
  }, [filtered]);

  const bg = dark ? T.appBgDark : T.appBg,
    cardBg = dark ? T.cardBgDark : T.cardBg,
    bdr = dark ? T.borderDark : T.border,
    tc = dark ? T.textMainDark : T.textMain;


  // [G-R2] Comparativo: mês atual vs anterior
  const comparativo = useMemo(() => {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const ant = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const mesAnt = `${ant.getFullYear()}-${String(ant.getMonth()+1).padStart(2,"0")}`;
    const getChave = p => {
      const raw = String(p["DATA"] || "");
      if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) return raw.slice(6,10)+"-"+raw.slice(3,5);
      if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0,7);
      return "";
    };
    const cur = filtered.filter(p => getChave(p) === mesAtual);
    const prv = filtered.filter(p => getChave(p) === mesAnt);
    const parseBRLLocal = v => { const s=String(v||"").replace(/\./g,"").replace(",",".").replace(/[^\d.]/g,""); const n=parseFloat(s); return isNaN(n)?0:n; };
    const curVal = cur.reduce((a,p)=>a+parseBRLLocal(p["VALOR"]),0);
    const prvVal = prv.reduce((a,p)=>a+parseBRLLocal(p["VALOR"]),0);
    const pctN = prv.length ? Math.round((cur.length-prv.length)/prv.length*100) : null;
    const pctV = prvVal ? Math.round((curVal-prvVal)/prvVal*100) : null;
    return { curN: cur.length, prvN: prv.length, curVal, prvVal, pctN, pctV, mesAtual, mesAnt };
  }, [filtered]);

  // ── Gráfico de linha SVG ─────────────────────────────────────────────────
  const LineChartSVG = ({ data }) => {
    if (!data.length) return null;
    const W = 600, H = 160, PL = 36, PR = 12, PT = 12, PB = 28;
    const cW = W - PL - PR, cH = H - PT - PB;
    const maxN = Math.max(...data.map(d => d.n), 1);
    const xs = data.map((_, i) => PL + (i / Math.max(data.length - 1, 1)) * cW);
    const ys = data.map(d => PT + cH - (d.n / maxN) * cH);
    const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
    const area = `M${PL},${PT + cH} ` + xs.map((x, i) => `L${x},${ys[i]}`).join(" ") + ` L${xs[xs.length-1]},${PT+cH} Z`;
    return /*#__PURE__*/React.createElement("div", { style: { overflowX: "auto" } },
      /*#__PURE__*/React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", minWidth: 300, height: H } },
        // grid lines
        [0.25, 0.5, 0.75, 1].map(f => {
          const y = PT + cH - f * cH;
          return /*#__PURE__*/React.createElement("line", { key: f, x1: PL, y1: y, x2: W - PR, y2: y,
            stroke: dark ? "#1e2d40" : "#e2e8f0", strokeWidth: 1, strokeDasharray: "3 3" });
        }),
        // Y labels
        [0, Math.round(maxN / 2), maxN].map((v, i) => {
          const y = PT + cH - (v / maxN) * cH;
          return /*#__PURE__*/React.createElement("text", { key: i, x: PL - 6, y: y + 4,
            textAnchor: "end", fontSize: 9, fill: "#94a3b8" }, v);
        }),
        // area fill
        /*#__PURE__*/React.createElement("path", { d: area, fill: "#3b6ef820" }),
        // line
        /*#__PURE__*/React.createElement("polyline", { points: polyline, fill: "none", stroke: "#3b6ef8", strokeWidth: 2.5, strokeLinejoin: "round" }),
        // dots + X labels
        data.map((d, i) => /*#__PURE__*/React.createElement(React.Fragment, { key: i },
          /*#__PURE__*/React.createElement("circle", {
            cx: xs[i], cy: ys[i], r: 5,
            fill: "#3b6ef8", stroke: dark ? "#1e3528" : "#fff", strokeWidth: 2,
            style: { cursor: "pointer" },
            onMouseEnter: e => setTooltip({ x: xs[i], y: ys[i], label: d.mes, val: d.n }),
            onMouseLeave: () => setTooltip(null)
          }),
          /*#__PURE__*/React.createElement("text", { x: xs[i], y: H - 4, textAnchor: "middle", fontSize: 9, fill: "#94a3b8" },
            d.mes.slice(5) + "/" + d.mes.slice(2, 4))
        )),
        // tooltip
        tooltip && /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("rect", { x: tooltip.x - 28, y: tooltip.y - 28, width: 56, height: 22, rx: 5,
            fill: dark ? "#1e3528" : "#0f172a" }),
          /*#__PURE__*/React.createElement("text", { x: tooltip.x, y: tooltip.y - 13, textAnchor: "middle", fontSize: 10,
            fill: "#fff", fontWeight: 700 }, tooltip.val + " proc.")
        )
      )
    );
  };

  // ── Gráfico de barras CSS ─────────────────────────────────────────────────

  // [J-V1] Gráfico de pizza SVG — distribuição por tipo de processo
  const porTipo = useMemo(() => {
    const m = {};
    filtered.forEach(p => {
      const k = p["_tipoKey"] || "padrao";
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([k, n]) => ({
      key: k, label: TINFO[k]?.label || k,
      cor: TINFO[k]?.cor || "#888", n,
      pct: filtered.length ? (n / filtered.length) * 100 : 0
    })).sort((a,b) => b.n - a.n);
  }, [filtered]);

  const PieChartSVG = ({ data }) => {
    if (!data.length) return null;
    const R = 70, CX = 90, CY = 90;
    let start = -Math.PI / 2;
    const slices = data.map(d => {
      const angle = (d.pct / 100) * 2 * Math.PI;
      const x1 = CX + R * Math.cos(start);
      const y1 = CY + R * Math.sin(start);
      const x2 = CX + R * Math.cos(start + angle);
      const y2 = CY + R * Math.sin(start + angle);
      const large = angle > Math.PI ? 1 : 0;
      const path = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`;
      const mid = start + angle / 2;
      const lx = CX + (R * 0.65) * Math.cos(mid);
      const ly = CY + (R * 0.65) * Math.sin(mid);
      start += angle;
      return { ...d, path, lx, ly };
    });
    return /*#__PURE__*/React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" } },
      /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 180 180", style: { width: 180, height: 180, flexShrink: 0 } },
        slices.map((s,i) => /*#__PURE__*/React.createElement(React.Fragment, { key: s.key },
          /*#__PURE__*/React.createElement("path", { d: s.path, fill: s.cor, stroke: dark ? "#1a2820" : "#fff", strokeWidth: 2 }),
          s.pct > 8 && /*#__PURE__*/React.createElement("text", {
            x: s.lx, y: s.ly, textAnchor: "middle", dominantBaseline: "central",
            fontSize: 10, fontWeight: 700, fill: "#fff"
          }, Math.round(s.pct) + "%")
        ))
      ),
      /*#__PURE__*/React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
        data.map(d => /*#__PURE__*/React.createElement("div", { key: d.key, style: { display: "flex", alignItems: "center", gap: 8 } },
          /*#__PURE__*/React.createElement("div", { style: { width: 12, height: 12, borderRadius: 3, background: d.cor, flexShrink: 0 } }),
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, color: tc } }, d.label),
          /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#94a3b8", marginLeft: 4 } }, d.n)
        ))
      )
    );
  };

  const BarChartCSS = ({ data }) => {
    if (!data.length) return null;
    const maxN = Math.max(...data.map(d => d.n), 1);
    const cores = ["#3b6ef8","#16a34a","#7c3aed","#d97706","#0891b2","#dc2626","#059669","#be185d"];
    return /*#__PURE__*/React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
      data.map((d, i) => /*#__PURE__*/React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 8 } },
        /*#__PURE__*/React.createElement("div", {
          style: { width: 145, fontSize: 11, color: tc, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0, textAlign: "right" }
        }, d.orgao),
        /*#__PURE__*/React.createElement("div", { style: { flex: 1, background: dark ? "#1e2d40" : "#f1f5f9", borderRadius: 4, height: 22, overflow: "hidden" } },
          /*#__PURE__*/React.createElement("div", {
            style: {
              width: `${(d.n / maxN) * 100}%`, minWidth: 28, height: "100%",
              background: cores[i % cores.length], borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              paddingRight: 6, fontSize: 10, fontWeight: 700, color: "#fff",
              transition: "width .4s ease"
            }
          }, d.n)
        ),
        /*#__PURE__*/React.createElement("div", {
          style: { fontSize: 10, color: dark ? "#4ade80" : "#059669", fontWeight: 700,
            whiteSpace: "nowrap", minWidth: 80, textAlign: "right", flexShrink: 0 }
        }, d.valor > 0 ? fmtBRL(d.valor) : "")
      ))
    );
  };

  return /*#__PURE__*/React.createElement("div", {
    style: { flex: 1, overflowY: "auto", background: bg }
  },
    /*#__PURE__*/React.createElement(PageHeader, {
      icon: "\uD83D\uDCCA",
      title: "Dashboard",
      sub: _sbReady ? "\u2601\uFE0F Sincronizado \u2014 atualiza a cada 20s" : "Vis\xE3o anal\xEDtica",
      cor: "#4d7cfe",
      dark: dark
    }),
    /*#__PURE__*/React.createElement("div", { style: { padding: "20px 24px" } },
      // ── Filtros ──
      /*#__PURE__*/React.createElement("div", {
        style: { background: cardBg, borderRadius: 12, border: `1.5px solid ${bdr}`,
          padding: "14px 20px", marginBottom: 20, display: "flex", gap: 16,
          alignItems: "center", flexWrap: "wrap" }
      },
        /*#__PURE__*/React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#64748b" } }, "\uD83D\uDD0D Filtrar:"),
        /*#__PURE__*/React.createElement("select", {
          value: filtOrg, onChange: e => setFiltOrg(e.target.value),
          style: { ...IS(dark), width: "auto", minWidth: 180, padding: "6px 10px", marginBottom: 0 }
        },
          /*#__PURE__*/React.createElement("option", { value: "" }, "Todos os \xF3rg\xE3os"),
          mp.allOrgaos.map(o => /*#__PURE__*/React.createElement("option", { key: o, value: o }, o.slice(0, 50)))
        ),
        /*#__PURE__*/React.createElement("select", {
          value: filtAno, onChange: e => setFiltAno(e.target.value),
          style: { ...IS(dark), width: "auto", minWidth: 100, padding: "6px 10px", marginBottom: 0 }
        },
          /*#__PURE__*/React.createElement("option", { value: "" }, "Todos os anos"),
          anos.map(a => /*#__PURE__*/React.createElement("option", { key: a, value: a }, a))
        ),
        (filtOrg || filtAno) && /*#__PURE__*/React.createElement("button", {
          onClick: () => { setFiltOrg(""); setFiltAno(""); },
          style: { fontSize: 12, padding: "6px 12px", background: "#fee2e2",
            border: "1px solid #fecaca", borderRadius: 7, color: "#dc2626", cursor: "pointer" }
        }, "\u2715 Limpar"),
        /*#__PURE__*/React.createElement("span", { style: { fontSize: 11, color: "#94a3b8", marginLeft: "auto" } },
          filtered.length, " processo(s)")
      ),
      // ── KPIs ──
      /*#__PURE__*/React.createElement("div", {
        style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }
      },
        /*#__PURE__*/React.createElement(KPICard, { label: "Processos", value: filtered.length.toLocaleString(), gradient: T.kpi2, icon: "\uD83D\uDCCA" }),
        /*#__PURE__*/React.createElement(KPICard, { label: "\xD3rg\xE3os",      value: mp.allOrgaos.length,           gradient: T.kpi1, icon: "\uD83C\uDFDB\uFE0F" }),
        /*#__PURE__*/React.createElement(KPICard, { label: "Fornecedores", value: mp.allFornecedores.length,       gradient: T.kpi5, icon: "\uD83C\uDFE2" }),
        /*#__PURE__*/React.createElement(KPICard, { label: "Hist\xF3rico",  value: (historico || []).length.toLocaleString(), gradient: T.kpi4, icon: "\uD83D\uDD50" }),
        /*#__PURE__*/React.createElement(KPICard, { label: "Total R$", value: totalGeral > 0 ? fmtBRL(totalGeral) : "—", gradient: "linear-gradient(135deg,#059669,#047857)", icon: "\uD83D\uDCB0" })
      ),
      // ── [M-AU3/G-R1] Botão relatório mensal ──
      /*#__PURE__*/React.createElement("div", {
        style: { display: "flex", justifyContent: "flex-end", marginBottom: 16 }
      },
        /*#__PURE__*/React.createElement("button", {
          onClick: async () => {
            const now = new Date();
            const mStr = String(now.getMonth()+1).padStart(2,"0");
            const mesAno = `${mStr}/${now.getFullYear()}`;
            toast("⏳ Gerando relatório...", "info");
            const r = await gerarRelatorioPDF(filtered.length ? filtered : processos, mesAno, appConfig || {});
            if (r.error) { toast("❌ " + r.error, "error"); return; }
            const url = URL.createObjectURL(r.blob);
            const a = document.createElement("a"); a.href = url; a.download = r.name;
            document.body.appendChild(a); a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
            toast("✅ Relatório mensal gerado!");
          },
          style: { ...BS("success", false, dark), height: 36, fontSize: 12 }
        }, /*#__PURE__*/React.createElement(BtnIco, { emoji: "\uD83D\uDCC4" }), "Relatório do M\xEAs (PDF)")
      ),
      // ── [G-R2] Comparativo mês atual vs anterior ──
      (comparativo.curN > 0 || comparativo.prvN > 0) && /*#__PURE__*/React.createElement("div", {
        style: { background: cardBg, borderRadius: 14, border: `1.5px solid ${bdr}`,
                 padding: "16px 20px", marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap" }
      },
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#64748b", width: "100%", marginBottom: 8 } },
          "\uD83D\uDCC6 Comparativo: mês atual vs anterior"),
        ...[
          { lbl: "Processos", cur: comparativo.curN, prv: comparativo.prvN, pct: comparativo.pctN, fmt: v => v.toString() },
          { lbl: "Total R$", cur: comparativo.curVal, prv: comparativo.prvVal, pct: comparativo.pctV,
            fmt: v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }
        ].map(({ lbl, cur, prv, pct, fmt }) => /*#__PURE__*/React.createElement("div", {
          key: lbl, style: { flex: "1 1 160px", minWidth: 140 }
        },
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#94a3b8", marginBottom: 4 } }, lbl),
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: dark ? "#e2e8f0" : "#0f172a" } }, fmt(cur)),
          /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, marginTop: 3, display: "flex", alignItems: "center", gap: 4 } },
            pct !== null && /*#__PURE__*/React.createElement("span", {
              style: { color: pct >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700 }
            }, pct >= 0 ? "▲" : "▼", " ", Math.abs(pct), "%"),
            /*#__PURE__*/React.createElement("span", { style: { color: "#94a3b8" } }, "vs ", fmt(prv))
          )
        ))
      ),
      // ── Linha: processos por mês ──
      porMes.length > 0 && /*#__PURE__*/React.createElement("div", {
        style: { background: cardBg, borderRadius: 14, border: `1.5px solid ${bdr}`,
          padding: "20px 24px", marginBottom: 20 }
      },
        /*#__PURE__*/React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 14, color: dark ? "#e2e8f0" : "#0f172a" } },
          "Processos por M\xEAs"),
        /*#__PURE__*/React.createElement(LineChartSVG, { data: porMes })
      ),
      // ── Barras: top órgãos ──
      topOrg.length > 0 && /*#__PURE__*/React.createElement("div", {
        style: { background: cardBg, borderRadius: 14, border: `1.5px solid ${bdr}`, padding: "20px 24px", marginBottom: 20 }
      },
        /*#__PURE__*/React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 16, color: dark ? "#e2e8f0" : "#0f172a" } },
          "Top \xD3rg\xE3os"),
        /*#__PURE__*/React.createElement(BarChartCSS, { data: topOrg })
      ),
      // ── [J-V1] Pizza: distribuição por tipo ──
      porTipo.length > 0 && /*#__PURE__*/React.createElement("div", {
        style: { background: cardBg, borderRadius: 14, border: `1.5px solid ${bdr}`, padding: "20px 24px" }
      },
        /*#__PURE__*/React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 16, color: dark ? "#e2e8f0" : "#0f172a" } },
          "Distribui\xE7\xE3o por Tipo de Processo"),
        /*#__PURE__*/React.createElement(PieChartSVG, { data: porTipo })
      )
    )
  );
}


export default DashboardPage;
