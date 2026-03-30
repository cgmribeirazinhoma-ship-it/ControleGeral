import React, {{ useState, useEffect, useCallback, useMemo, useRef }} from 'react';
import {{ MUN, T, TINFO, CHK, STATUS_MAP }} from '../constants.js';

// ─── UsuariosPage ─────────────────────────────────────────────────────────────
function UsuariosPage({
  dark,
  toast
}) {
  const [users, setUsers] = useState({});
  const [novoLogin, setNovoLogin] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoPerfil, setNovoPerfil] = useState("operador");
  const [loading, setLoading] = useState(false);
  // [FIX3] Modal de redefinição de senha — substitui window.prompt
  const [modalSenha, setModalSenha] = useState(null); // { login }
  const bg = dark ? T.appBgDark : T.appBg,
    cardBg = dark ? T.cardBgDark : T.cardBg,
    bdr = dark ? T.borderDark : T.border,
    tc = dark ? T.textMainDark : T.textMain;
  const iStyle = IS(dark);
  useEffect(() => {
    loadUsers().then(setUsers);
  }, []);
  const handleAdicionar = async () => {
    if (!novoLogin.trim() || !novaSenha.trim() || !novoNome.trim()) {
      toast("Preencha todos os campos.", "error");
      return;
    }
    if (users[novoLogin]) {
      toast("Login já existe.", "error");
      return;
    }
    setLoading(true);
    try {
      const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      const hash = await hashSenha(salt, novaSenha);
      const updated = {
        ...users,
        [novoLogin]: {
          senha: hash,
          salt,
          nome: novoNome,
          perfil: novoPerfil,
          ativo: true
        }
      };
      await ST.set("users", updated);
      setUsers(updated);
      setNovoLogin("");
      setNovaSenha("");
      setNovoNome("");
      toast("✅ Usuário criado!");
    } finally {
      setLoading(false);
    }
  };
  const toggleAtivo = async login => {
    if (login === "admin") {
      toast("Não é possível desativar o admin.", "warn");
      return;
    }
    const updated = {
      ...users,
      [login]: {
        ...users[login],
        ativo: !users[login].ativo
      }
    };
    await ST.set("users", updated);
    setUsers(updated);
    toast(updated[login].ativo ? "✅ Usuário ativado." : "⚠️ Usuário desativado.", "info");
  };
  const handleResetSenha = async login => {
    // [FIX3] Usa ModalSenha em vez de window.prompt (funciona em Safari iOS)
    setModalSenha({ login });
  };
  const confirmarResetSenha = async (login, ns) => {
    const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    const hash = await hashSenha(salt, ns.trim());
    const updated = {
      ...users,
      [login]: {
        ...users[login],
        senha: hash,
        salt
      }
    };
    await ST.set("users", updated);
    setUsers(updated);
    setModalSenha(null);
    toast("✅ Senha redefinida!");
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      background: bg
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "\uD83D\uDC65",
    title: "Usu\xE1rios",
    sub: "Gerenciar contas de acesso",
    cor: "#7c3aed",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1.5px solid ${bdr}`,
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\u2795",
    title: "Novo Usu\xE1rio",
    dark: dark
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Login"), /*#__PURE__*/React.createElement("input", {
    value: novoLogin,
    onChange: e => setNovoLogin(e.target.value),
    placeholder: "ex: joao.silva",
    style: iStyle
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Nome completo"), /*#__PURE__*/React.createElement("input", {
    value: novoNome,
    onChange: e => setNovoNome(e.target.value),
    placeholder: "Jo\xE3o Silva",
    style: iStyle
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Senha"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: novaSenha,
    onChange: e => setNovaSenha(e.target.value),
    placeholder: "Senha inicial",
    style: iStyle
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Perfil"), /*#__PURE__*/React.createElement("select", {
    value: novoPerfil,
    onChange: e => setNovoPerfil(e.target.value),
    style: {
      ...iStyle
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "operador"
  }, "Operador"), /*#__PURE__*/React.createElement("option", {
    value: "admin"
  }, "Administrador")), /*#__PURE__*/React.createElement("button", {
    onClick: handleAdicionar,
    disabled: loading,
    style: {
      ...BS("success", loading, dark),
      width: "100%",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\u2795"
  }), "Criar Usu\xE1rio")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1.5px solid ${bdr}`,
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83D\uDC64",
    title: "Usu\xE1rios Cadastrados",
    dark: dark
  }), Object.entries(users).map(([login, u]) => /*#__PURE__*/React.createElement("div", {
    key: login,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      borderRadius: 10,
      marginBottom: 8,
      background: dark ? "#003800" : "#f8fafc",
      border: `1px solid ${bdr}`
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: tc
    }
  }, u.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b"
    }
  }, login, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: u.perfil === "admin" ? "#7c3aed" : "#2563eb"
    }
  }, u.perfil))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleResetSenha(login),
    style: {
      ...BS("secondary", false, dark),
      height: 30,
      fontSize: 11,
      padding: "0 8px 0 5px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\uD83D\uDD11"
  }), "Senha"), /*#__PURE__*/React.createElement("button", {
    onClick: () => toggleAtivo(login),
    style: {
      ...BS(u.ativo ? "danger" : "success", false, dark),
      height: 30,
      fontSize: 11,
      padding: "0 8px 0 5px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: u.ativo ? "🚫" : "✅"
  }), u.ativo ? "Desativar" : "Ativar")))))), modalSenha && /*#__PURE__*/React.createElement(ModalSenha, { login: modalSenha.login, dark: dark, onOk: ns => confirmarResetSenha(modalSenha.login, ns), onCancel: () => setModalSenha(null) }));
}


export default UsuariosPage;
