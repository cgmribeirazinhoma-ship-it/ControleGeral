// ─── ConfirmModal e ModalSenha ───────────────────────────────────────────────
import React from 'react';
import { MUN } from '../../constants.js';
import { BS, IS, LS, BtnIco } from './index.jsx';

// ─── [FIX9] ConfirmModal — substitui window.confirm em todo o sistema ─────────
function ConfirmModal({ msg, titulo, onOk, onCancel, dark, tipo = "warn" }) {
  const cores = {
    warn:    { bg: "#854d0e", bd: "#eab308", txt: "#fef08a", ico: "⚠️" },
    danger:  { bg: "#7f1d1d", bd: "#dc2626", txt: "#fca5a5", ico: "🗑️" },
    info:    { bg: "#1e3a5f", bd: "#3b82f6", txt: "#bfdbfe", ico: "ℹ️" }
  };
  const c = cores[tipo] || cores.warn;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
      zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center"
    },
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: dark ? "#1a2820" : "#fff",
      borderRadius: 16, padding: "28px 30px", maxWidth: 420, width: "90%",
      boxShadow: "0 24px 64px rgba(0,0,0,.4)",
      border: `1.5px solid ${c.bd}`
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 32, textAlign: "center", marginBottom: 12 }
  }, c.ico),
  titulo && /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 15, fontWeight: 700, color: dark ? c.txt : "#0f172a",
             textAlign: "center", marginBottom: 8 }
  }, titulo),
  /*#__PURE__*/React.createElement("p", {
    style: { fontSize: 13, color: dark ? "#e2e8f0" : "#475569",
             lineHeight: 1.7, textAlign: "center", marginBottom: 22, whiteSpace: "pre-line" }
  }, msg),
  /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 10, justifyContent: "center" }
  },
  /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: { ...BS("ghost", false, dark), flex: 1, justifyContent: "center", height: 40 }
  }, "Cancelar"),
  /*#__PURE__*/React.createElement("button", {
    onClick: onOk,
    style: {
      flex: 1, height: 40, justifyContent: "center",
      ...BS(tipo === "danger" ? "danger" : "primary", false, dark)
    }
  }, "Confirmar"))));
}

// ─── [FIX3] ModalSenha — substitui window.prompt para redefinir senha ─────────
function ModalSenha({ login, onOk, onCancel, dark }) {
  const [senha, setSenha] = React.useState("");
  const [ver, setVer] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
      zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center"
    },
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: dark ? "#1a2820" : "#fff",
      borderRadius: 16, padding: "28px 30px", maxWidth: 380, width: "90%",
      boxShadow: "0 24px 64px rgba(0,0,0,.4)",
      border: `1.5px solid ${MUN.goldDk}`
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 15, fontWeight: 700, color: dark ? "#e2e8f0" : "#0f172a",
             marginBottom: 6 }
  }, "🔑 Redefinir senha"),
  /*#__PURE__*/React.createElement("p", {
    style: { fontSize: 12.5, color: "#94a3b8", marginBottom: 16 }
  }, `Nova senha para "${login}"`),
  /*#__PURE__*/React.createElement("div", { style: { position: "relative" } },
    /*#__PURE__*/React.createElement("input", {
      type: ver ? "text" : "password",
      value: senha,
      onChange: e => setSenha(e.target.value),
      onKeyDown: e => e.key === "Enter" && senha.trim() && onOk(senha.trim()),
      placeholder: "Digite a nova senha",
      autoFocus: true,
      style: { ...IS(dark), paddingRight: 36 }
    }),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => setVer(v => !v),
      style: {
        position: "absolute", right: 8, top: 8, background: "transparent",
        border: "none", cursor: "pointer", fontSize: 14, color: "#94a3b8"
      }
    }, ver ? "🙈" : "👁️")
  ),
  /*#__PURE__*/React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 4 } },
    /*#__PURE__*/React.createElement("button", {
      onClick: onCancel,
      style: { ...BS("ghost", false, dark), flex: 1, justifyContent: "center", height: 38 }
    }, "Cancelar"),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => senha.trim() && onOk(senha.trim()),
      disabled: !senha.trim(),
      style: { ...BS("success", !senha.trim(), dark), flex: 1, justifyContent: "center", height: 38 }
    }, "Salvar"))));
}

