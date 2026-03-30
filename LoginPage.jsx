// ─── LoginPage ───────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { MUN } from '../constants.js';
import { BS, IS, LS } from '../components/ui/index.jsx';
import { checkLogin } from '../lib/auth.js';
import Brasao from '../components/ui/Brasao.jsx';

// ─── LoginPage ────────────────────────────────────────────────────────────────
function LoginPage({
  onLogin
}) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  // [FIX7] Tentativas persistidas em sessionStorage — resiste a F5
  const [tent, setTent] = useState(() => {
    try { return parseInt(sessionStorage.getItem("cgel_login_tent") || "0", 10); } catch { return 0; }
  });
  const [bloq, setBloq] = useState(() => {
    try { return sessionStorage.getItem("cgel_login_bloq") === "1"; } catch { return false; }
  });
  const [count, setCount] = useState(() => {
    try {
      const exp = parseInt(sessionStorage.getItem("cgel_login_exp") || "0", 10);
      const rem = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
      return rem;
    } catch { return 0; }
  });
  useEffect(() => {
    if (!bloq || count <= 0) return;
    const t = setInterval(() => setCount(c => {
      if (c <= 1) {
        clearInterval(t);
        setBloq(false);
        return 0;
      }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [bloq, count]);
  const handle = async () => {
    if (bloq) return;
    setLoading(true);
    setErro("");
    const u = await checkLogin(login.trim(), senha);
    setLoading(false);
    if (u) {
      try { sessionStorage.removeItem("cgel_login_tent"); sessionStorage.removeItem("cgel_login_bloq"); sessionStorage.removeItem("cgel_login_exp"); } catch {}
      onLogin({
        ...u,
        login: login.trim()
      });
    } else {
      const nt = tent + 1;
      setTent(nt);
      try { sessionStorage.setItem("cgel_login_tent", String(nt)); } catch {}
      if (nt >= 5) {
        const exp = Date.now() + 300000;
        setBloq(true);
        setCount(300);
        try { sessionStorage.setItem("cgel_login_bloq", "1"); sessionStorage.setItem("cgel_login_exp", String(exp)); } catch {}
        setErro("Muitas tentativas. Aguarde 5 minutos.");
      } else setErro(`Credenciais inválidas. Tentativa ${nt}/5.`);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#006000"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 380,
      background: "#003d00",
      borderRadius: 20,
      padding: "40px 36px",
      boxShadow: "0 32px 80px rgba(0,0,0,.5)",
      border: "2px solid " + MUN.gold
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement(Brasao, {
    size: 72,
    style: {
      margin: "0 auto 14px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: MUN.gold,
      letterSpacing: ".03em"
    }
  }, "PREFEITURA DE GOV. EDISON LOB\xC3O"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#4a6494",
      marginTop: 4
    }
  }, "Controladoria Geral \u2014 Sistema de Pagamentos")), erro && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#450a0a",
      border: "1px solid #dc2626",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 12,
      color: "#fca5a5",
      fontWeight: 600
    }
  }, "\u26A0\uFE0F ", erro), /*#__PURE__*/React.createElement("label", {
    style: LS(true)
  }, "Login"), /*#__PURE__*/React.createElement("input", {
    value: login,
    onChange: e => setLogin(e.target.value),
    onKeyDown: e => e.key === "Enter" && handle(),
    placeholder: "admin",
    autoFocus: true,
    style: {
      ...IS(true),
      background: "rgba(0,0,0,.3)",
      border: "1.5px solid rgba(239,209,3,.5)"
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(true)
  }, "Senha"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: senha,
    onChange: e => setSenha(e.target.value),
    onKeyDown: e => e.key === "Enter" && handle(),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    style: {
      ...IS(true),
      background: "#0d1421",
      border: "1.5px solid #1e2d40"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handle,
    disabled: loading || bloq,
    style: {
      ...BS("primary", loading || bloq, true),
      width: "100%",
      justifyContent: "center",
      height: 46,
      fontSize: 14,
      marginTop: 4
    }
  }, bloq ? `Aguarde ${Math.floor(count / 60)}m${count % 60}s…` : loading ? "Verificando…" : "→ Entrar")));
}


export default LoginPage;
