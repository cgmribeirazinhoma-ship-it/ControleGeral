import React, {{ useState, useEffect, useCallback, useMemo, useRef }} from 'react';
import {{ MUN, T, TINFO, CHK, STATUS_MAP }} from '../constants.js';

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  page,
  setPage,
  user,
  onLogout,
  onSync,
  proxNum,
  dark,
  onToggleDark,
  formPct,
  sbOnline,
  pendentesAtrasados = 0,
  onExportExcel
}) {
  const isAdmin = user?.perfil === "admin";
  const isOnline = sbOnline ?? _sbLive;
  const nav = [{
    k: "processos",
    icon: "📄",
    label: "Novo Processo"
  }, {
    k: "buscar",
    icon: "🔍",
    label: "Buscar & Editar"
  }, {
    k: "dashboard",
    icon: "📊",
    label: "Dashboard"
  }, {
    k: "historico",
    icon: "🕐",
    label: "Histórico"
  }];
  // [G-R3] Badge de pendentes atrasados
  const adm = [{
    k: "usuarios",
    icon: "👥",
    label: "Usuários"
  }, {
    k: "orgaos",
    icon: "🏛️",
    label: "Órgãos"
  }, {
    k: "config",
    icon: "⚙️",
    label: "Configurações"
  }];
  const NavItem = ({
    k,
    icon,
    label
  }) => {
    const active = page === k;
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => setPage(k),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        marginBottom: 3,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all .15s",
        background: active ? MUN.green : "transparent",
        border: active ? "1px solid " + MUN.green : "1px solid transparent"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        width: 20,
        textAlign: "center"
      }
    }, icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        color: active ? "#ffffff" : "rgba(255,255,255,.65)"
      }
    }, label, k === "historico" && pendentesAtrasados > 0 && /*#__PURE__*/React.createElement("span", {
        style: { background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700,
                 borderRadius: 99, padding: "1px 5px", marginLeft: 4 }
      }, pendentesAtrasados)));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 220,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      background: "#0040E0",
      height: "100vh",
      position: "sticky",
      top: 0,
      borderRight: "1px solid rgba(0,0,0,.15)",
      overflowY: "auto",
      overflowX: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 16px 14px",
      borderBottom: "2px solid " + MUN.gold,
      textAlign: "center",
      background: "#002da0"
    }
  }, /*#__PURE__*/React.createElement(Brasao, {
    size: 52,
    style: {
      margin: "0 auto 10px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: MUN.gold,
      lineHeight: 1.4
    }
  }, "CONTROLADORIA", /*#__PURE__*/React.createElement("br", null), "GERAL"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: MUN.goldDk,
      marginTop: 3
    }
  }, "Pref. Gov. Edison Lob\xE3o / MA")), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "10px 10px 0",
      padding: "8px 12px",
      background: "rgba(239,209,3,.08)",
      borderRadius: 10,
      border: "1px solid rgba(239,209,3,.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      fontWeight: 700,
      color: "#e2e8f0",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, user?.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      color: MUN.goldDk,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 600,
      marginTop: 2
    }
  }, user?.perfil)), page === "processos" && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "8px 10px 0",
      padding: "8px 12px",
      background: "rgba(255,255,255,.05)",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "rgba(255,255,255,.45)",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".05em"
    }
  }, "Preenchimento"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: 800,
      color: formPct === 100 ? "#4ade80" : formPct > 60 ? "#fbbf24" : "#93c5fd"
    }
  }, formPct, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: "rgba(255,255,255,.1)",
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${formPct}%`,
      borderRadius: 4,
      transition: "width .4s",
      background: formPct === 100 ? "#22c55e" : formPct > 60 ? "#f59e0b" : "#3b82f6"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "8px 10px 0",
      padding: "8px 12px",
      background: MUN.green,
      borderRadius: 10,
      border: "1.5px solid rgba(255,255,255,.3)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9.5,
      color: "rgba(255,255,255,.85)",
      fontWeight: 700,
      textTransform: "uppercase"
    }
  }, "Pr\xF3ximo N\xBA"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: "#ffffff"
    }
  }, proxNum || "—")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 8px",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8.5,
      fontWeight: 700,
      color: "rgba(255,255,255,.25)",
      textTransform: "uppercase",
      letterSpacing: ".1em",
      padding: "4px 8px 6px"
    }
  }, "Principal"), nav.map(n => /*#__PURE__*/React.createElement(NavItem, {
    key: n.k,
    k: n.k,
    icon: n.icon,
    label: n.label
  })), isAdmin && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "rgba(255,255,255,.08)",
      margin: "10px 4px 8px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8.5,
      fontWeight: 700,
      color: "rgba(255,255,255,.25)",
      textTransform: "uppercase",
      letterSpacing: ".1em",
      padding: "4px 8px 6px"
    }
  }, "Admin"), adm.map(n => /*#__PURE__*/React.createElement(NavItem, {
    key: n.k,
    k: n.k,
    icon: n.icon,
    label: n.label
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 10px 12px",
      borderTop: "2px solid " + MUN.gold,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, proxNum > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: onExportExcel,
    style: {
      background: MUN.green,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "7px 10px",
      cursor: "pointer",
      fontSize: 11.5,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      gap: 6,
      width: "100%",
      justifyContent: "center",
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\uD83D\uDCBE"
  }), "Salvar Planilha Excel"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onSync,
    style: {
      height: 34,
      background: "rgba(239,209,3,.15)",
      border: "1px solid rgba(239,209,3,.4)",
      borderRadius: 8,
      color: MUN.gold,
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4
    }
  }, "\uD83D\uDD04 Sync"), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    style: {
      height: 34,
      background: "rgba(220,38,38,.2)",
      border: "1px solid rgba(220,38,38,.3)",
      borderRadius: 8,
      color: "#fca5a5",
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4
    }
  }, "\u23CF Sair")), /*#__PURE__*/React.createElement("button", {
    onClick: onToggleDark,
    style: {
      height: 32,
      background: "rgba(239,209,3,.1)",
      border: "1px solid rgba(239,209,3,.25)",
      borderRadius: 8,
      color: MUN.gold,
      fontSize: 11,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      fontWeight: 600
    }
  }, dark ? "☀️ Modo Claro" : "🌙 Modo Escuro"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: "rgba(255,255,255,.15)",
      textAlign: "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5
    }
  }, "v3.3 \xB7 2026", /*#__PURE__*/React.createElement("span", {
    title: isOnline ? "Supabase conectado" : "Supabase offline — dados locais",
    style: { fontSize: 10, cursor: "default", display: "flex", alignItems: "center", gap: 3 }
  }, isOnline ? "\u2601\uFE0F" : "\uD83D\uDD34", /*#__PURE__*/React.createElement("span", { style: { fontSize: 8, fontWeight: 700, color: isOnline ? "#4ade80" : "#f87171" } }, isOnline ? "Online" : "Offline")))));
}


export default Sidebar;
