import React, {{ useState, useEffect, useCallback, useMemo, useRef }} from 'react';
import {{ MUN, T, TINFO, CHK, STATUS_MAP }} from '../constants.js';

// ─── ControladorForm ──────────────────────────────────────────────────────────
function ControladorForm({ appConfig, setAppConfig, dark, toast }) {
  const ctrl = appConfig?.controlador || {};
  const [nome,     setNome]     = useState(ctrl.nome     || "");
  const [cargo,    setCargo]    = useState(ctrl.cargo    || "");
  const [portaria, setPortaria] = useState(ctrl.portaria || "");
  const [salvando, setSalvando] = useState(false);
  const [salvo,    setSalvo]    = useState(false);

  // Sincronizar se appConfig mudar externamente
  useEffect(() => {
    const c = appConfig?.controlador || {};
    setNome(c.nome     || "");
    setCargo(c.cargo   || "");
    setPortaria(c.portaria || "");
  }, [appConfig]);

  const handleSalvar = async () => {
    if (!nome.trim()) { toast("⚠️ Nome do controlador é obrigatório.", "warn"); return; }
    setSalvando(true);
    const u = {
      ...appConfig,
      controlador: { nome: nome.trim(), cargo: cargo.trim(), portaria: portaria.trim() }
    };
    setAppConfig(u);
    await ST.set("app_config", u);
    setSalvando(false);
    setSalvo(true);
    toast("✅ Dados do controlador salvos com sucesso!");
    setTimeout(() => setSalvo(false), 3000);
  };

  const iStyle = IS(dark);
  const alterado =
    nome     !== (ctrl.nome     || "") ||
    cargo    !== (ctrl.cargo    || "") ||
    portaria !== (ctrl.portaria || "");

  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("label", { style: LS(dark) }, "Nome completo *"),
    /*#__PURE__*/React.createElement("input", {
      value: nome,
      onChange: e => { setNome(e.target.value); setSalvo(false); },
      placeholder: "Ex: Grazielle Alves da Silva",
      style: iStyle
    }),
    /*#__PURE__*/React.createElement("label", { style: LS(dark) }, "Cargo"),
    /*#__PURE__*/React.createElement("input", {
      value: cargo,
      onChange: e => { setCargo(e.target.value); setSalvo(false); },
      placeholder: "Ex: Controladora-Geral",
      style: iStyle
    }),
    /*#__PURE__*/React.createElement("label", { style: LS(dark) }, "Portaria / Designa\xE7\xE3o"),
    /*#__PURE__*/React.createElement("input", {
      value: portaria,
      onChange: e => { setPortaria(e.target.value); setSalvo(false); },
      placeholder: "Ex: Portaria 031/2026",
      onKeyDown: e => e.key === "Enter" && handleSalvar(),
      style: iStyle
    }),
    /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", alignItems: "center", gap: 10, marginTop: 4 }
    },
      /*#__PURE__*/React.createElement("button", {
        onClick: handleSalvar,
        disabled: salvando || !alterado,
        style: {
          ...BS(salvo ? "success" : "primary", salvando || !alterado, dark),
          flex: 1,
          justifyContent: "center",
          height: 40
        }
      },
        salvando
          ? /*#__PURE__*/React.createElement(BtnIco, { emoji: "\u23F3" })
          : salvo
            ? /*#__PURE__*/React.createElement(BtnIco, { emoji: "\u2705" })
            : /*#__PURE__*/React.createElement(BtnIco, { emoji: "\uD83D\uDCBE" }),
        salvando ? "Salvando..." : salvo ? "Salvo!" : "Salvar Altera\xE7\xF5es"
      ),
      alterado && !salvo && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10.5, color: "#f59e0b", fontWeight: 700,
          display: "flex", alignItems: "center", gap: 4
        }
      }, "\u26A0\uFE0F N\xE3o salvo")
    ),
    /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 10.5, color: "#64748b", marginTop: 8 }
    }, "Aparece na assinatura de todos os PDFs gerados.")
  );
}

// ─── ConfigPage ───────────────────────────────────────────────────────────────
function ConfigPage({
  processos,
  historico,
  orgaosConfig,
  appConfig,
  setAppConfig,
  onImport,
  onSyncDB,
  dark,
  toast,
  user,
  onLimparBanco
}) {
  const [importLoading, setImportLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [showApagar, setShowApagar] = useState(false);
  const [senhaApagar, setSenhaApagar] = useState("");
  const [apagarErr, setApagarErr] = useState("");
  const [apagarLoading, setApagarLoading] = useState(false);
  const isAdmin = user?.perfil === "admin";
  const handleConfirmarApagar = async () => {
    if (!senhaApagar.trim()) {
      setApagarErr("Digite sua senha.");
      return;
    }
    setApagarLoading(true);
    setApagarErr("");
    try {
      const ok = await checkLogin(user.login, senhaApagar.trim());
      if (!ok) {
        setApagarErr("Senha incorreta. Tente novamente.");
        return;
      }
      await onLimparBanco();
      setShowApagar(false);
      setSenhaApagar("");
    } finally {
      setApagarLoading(false);
    }
  };
  const bg = dark ? T.appBgDark : T.appBg,
    cardBg = dark ? T.cardBgDark : T.cardBg,
    bdr = dark ? T.borderDark : T.border,
    tc = dark ? T.textMainDark : T.textMain;
  const handleExportExcel = () => {
    exportarExcel(processos, historico);
    toast("✅ Excel exportado!");
  };
  // [G-S2] Restaurar backup
  const [backupList, setBackupList] = React.useState([]);
  React.useEffect(() => {
    ST.list("backup_").then(rows => {
      if (rows) setBackupList(rows.sort((a,b) => b.key.localeCompare(a.key)).slice(0,4));
    });
  }, []);
  const handleRestaurarBackup = async (item) => {
    if (!window.confirm("Restaurar backup de " + item.key.replace("backup_","") + "?\n\nIsso substituirá os dados atuais.")) return;
    const snap = item.value;
    if (snap?.processos) { await ST.set("processos", snap.processos); }
    if (snap?.historico) { await ST.set("historico", snap.historico); }
    toast("✅ Backup restaurado! Recarregando...", "info");
    setTimeout(() => location.reload(), 1500);
  };
  const [importPct, setImportPct] = React.useState(0); // [M-P3] progresso
  const handleImportExcel = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportPct(0);
    try {
      // [M-P3] Usa Web Worker para não travar a UI
      const rows = await importarExcelWorker(file, pct => setImportPct(pct));
      onImport(rows, rows._lastNum || 0);
      toast(`✅ Importados ${rows.length} registros.`);
    } catch (err) {
      toast(`❌ Erro: ${err.message}`, "error");
    } finally {
      setImportLoading(false);
      setImportPct(0);
      e.target.value = "";
    }
  };
  const handleImportDB = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDbLoading(true);
    try {
      const res = await readSqliteDB(file);
      if (res.error) {
        toast(`❌ SQLite: ${res.error}`, "error");
        return;
      }
      onSyncDB(res);
      toast(`✅ DB importado: ${res.processos.length} processos.`);
    } catch (err) {
      toast(`❌ ${err.message}`, "error");
    } finally {
      setDbLoading(false);
      e.target.value = "";
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      background: bg
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "\u2699\uFE0F",
    title: "Configura\xE7\xF5es",
    sub: "Importar, exportar e gerenciar dados",
    cor: "#64748b",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "12px 24px 0",
      padding: "12px 16px",
      background: _sbLive ? "#052e16" : _sbReady ? "#1c1400" : "#431407",
      borderRadius: 10,
      border: `1.5px solid ${_sbLive ? "#16a34a" : _sbReady ? "#ca8a04" : "#ea580c"}`,
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 13,
      flexShrink: 0
    }
  },
  /*#__PURE__*/React.createElement("span", {style:{fontSize:18}}, _sbLive ? "\u2705" : _sbReady ? "\u26A0\uFE0F" : "\u274C"),
  /*#__PURE__*/React.createElement("div", null,
    /*#__PURE__*/React.createElement("div", {style:{fontWeight:700, color: _sbLive ? "#86efac" : _sbReady ? "#fde047" : "#fed7aa"}},
      _sbLive
        ? "\u2601\uFE0F Supabase ON-LINE \u2014 todos os usu\xE1rios sincronizados"
        : _sbReady
          ? "\u26A0\uFE0F Supabase CONFIGURADO mas sem resposta \u2014 processos salvos s\xF3 neste navegador"
          : "\u274C Supabase N\xC3O configurado \u2014 dados salvos apenas neste navegador"
    ),
    /*#__PURE__*/React.createElement("div", {style:{fontSize:11, color: _sbLive ? "#4ade80" : _sbReady ? "#fbbf24" : "#fb923c", marginTop:2}},
      _sbReady ? ("URL: " + SUPABASE_URL) : "Preencha SUPABASE_URL e SUPABASE_ANON_KEY no in\xEDcio do arquivo app.js"
    )
  )
  ), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1.5px solid ${bdr}`,
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83D\uDCE4",
    title: "Exportar",
    dark: dark
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleExportExcel,
    style: {
      ...BS("success", false, dark),
      width: "100%",
      justifyContent: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\uD83D\uDCCA"
  }), "Exportar Excel"),
  /*#__PURE__*/React.createElement("button", {
    onClick: () => { exportarSIAFEM(processos); toast("✅ SIAFEM/TCE-MA exportado!"); },
    style: {
      ...BS("secondary", false, dark),
      width: "100%",
      justifyContent: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(BtnIco, { emoji: "\uD83C\uDFDB\uFE0F" }), "Exportar SIAFEM / TCE-MA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b"
    }
  }, processos.length, " processos \xB7 ", historico.length, " hist\xF3rico")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1.5px solid ${bdr}`,
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83D\uDCE5",
    title: "Importar Excel",
    dark: dark
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      ...BS("primary", importLoading, dark),
      width: "100%",
      justifyContent: "center",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: importLoading ? "⏳" : "📥"
  }), importLoading ? (importPct > 0 ? `Processando... ${importPct}%` : "Importando...") : "Selecionar Excel (.xlsx)", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".xlsx,.xls",
    onChange: handleImportExcel,
    style: {
      display: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b",
      marginTop: 8
    }
  }, "Importa e mescla com dados existentes.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1.5px solid ${bdr}`,
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83D\uDDC4\uFE0F",
    title: "Importar SQLite (.db)",
    dark: dark
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      ...BS("orange", dbLoading, dark),
      width: "100%",
      justifyContent: "center",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: dbLoading ? "⏳" : "🗄️"
  }), dbLoading ? "Lendo banco..." : "Selecionar arquivo .db", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".db,.sqlite,.sqlite3",
    onChange: handleImportDB,
    style: {
      display: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b",
      marginTop: 8
    }
  }, "L\xEA processos, hist\xF3rico e configura\xE7\xF5es de \xF3rg\xE3os."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1.5px solid ${bdr}`,
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\u2139\uFE0F",
    title: "Informa\xE7\xF5es do Sistema",
    dark: dark
  }), [["Versão", "v3.2"], ["Processos salvos", processos.length], ["Histórico", historico.length], ["Órgãos configurados", Object.keys(orgaosConfig).length]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "7px 0",
      borderBottom: `1px solid ${bdr}`,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#64748b"
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: tc
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: { background: cardBg, borderRadius: 14, border: `1.5px solid ${bdr}`, padding: "20px 24px" }
  },
  /*#__PURE__*/React.createElement(SH, { icon: "\uD83D\uDCBE", title: "Backups Semanais", dark: dark }),
  backupList.length === 0
    ? /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: "#94a3b8" } }, "Nenhum backup encontrado. O sistema cria automaticamente toda segunda-feira.")
    : backupList.map(item => /*#__PURE__*/React.createElement("div", {
        key: item.key,
        style: { display: "flex", alignItems: "center", justifyContent: "space-between",
                 padding: "8px 12px", borderRadius: 8, marginBottom: 6,
                 background: dark ? "#003800" : "#f8fafc", border: `1px solid ${bdr}` }
      },
      /*#__PURE__*/React.createElement("div", null,
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: tc } }, item.key.replace("backup_","")),
        /*#__PURE__*/React.createElement("div", { style: { fontSize: 11, color: "#94a3b8" } },
          (item.value?.processos?.length || 0), " processos · ", (item.value?.historico?.length || 0), " histórico")
      ),
      /*#__PURE__*/React.createElement("button", {
        onClick: () => handleRestaurarBackup(item),
        style: { ...BS("secondary", false, dark), height: 30, fontSize: 11, padding: "0 10px 0 6px" }
      }, /*#__PURE__*/React.createElement(BtnIco, { emoji: "\u21A9\uFE0F" }), "Restaurar")
    ))
  ),
  /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1.5px solid ${bdr}`,
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\u270D\uFE0F",
    title: "Dados do Controlador (PDF)",
    dark: dark
  }), /*#__PURE__*/React.createElement(ControladorForm, {
    appConfig: appConfig,
    setAppConfig: setAppConfig,
    dark: dark,
    toast: toast
  })))), isAdmin && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "0 24px 24px",
      background: cardBg,
      borderRadius: 14,
      border: "1.5px solid #dc2626",
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\u26A0\uFE0F",
    title: "Zona de Perigo",
    dark: dark
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: dark ? "#fca5a5" : "#991b1b",
      marginBottom: 14,
      lineHeight: 1.6
    }
  }, "Apaga ", /*#__PURE__*/React.createElement("strong", null, "todos os dados"), ": processos, hist\xF3rico, \xF3rg\xE3os e configura\xE7\xF5es.", /*#__PURE__*/React.createElement("br", null), "Esta opera\xE7\xE3o \xE9 ", /*#__PURE__*/React.createElement("strong", null, "irrevers\xEDvel"), "."), !showApagar ? /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowApagar(true);
      setSenhaApagar("");
      setApagarErr("");
    },
    style: {
      ...BS("danger", false, dark),
      width: "100%",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\uD83D\uDDD1\uFE0F"
  }), "Apagar banco de dados") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: dark ? "#fca5a5" : "#991b1b"
    }
  }, "\uD83D\uDD10 Confirme sua senha de administrador:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "password",
    placeholder: "Sua senha de login",
    value: senhaApagar,
    onChange: e => {
      setSenhaApagar(e.target.value);
      setApagarErr("");
    },
    onKeyDown: e => e.key === "Enter" && handleConfirmarApagar(),
    autoFocus: true,
    style: {
      ...IS(dark),
      flex: 1,
      border: "1.5px solid #dc2626",
      marginBottom: 0,
      minWidth: 180
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleConfirmarApagar,
    disabled: apagarLoading,
    style: {
      ...BS("danger", apagarLoading, dark),
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: apagarLoading ? "⏳" : "🗑️"
  }), apagarLoading ? "Apagando..." : "Confirmar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowApagar(false);
      setSenhaApagar("");
      setApagarErr("");
    },
    style: {
      ...BS("ghost", false, dark)
    }
  }, "Cancelar")), apagarErr && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#dc2626",
      fontWeight: 700
    }
  }, "\u274C ", apagarErr))));
}



export default ConfigPage;
