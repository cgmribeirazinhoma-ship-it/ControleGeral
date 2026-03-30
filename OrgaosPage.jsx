import React, {{ useState, useEffect, useCallback, useMemo, useRef }} from 'react';
import {{ MUN, T, TINFO, CHK, STATUS_MAP }} from '../constants.js';

// ─── OrgaosPage ───────────────────────────────────────────────────────────────
function OrgaosPage({
  processos,
  orgaosConfig,
  onOrgaosChange,
  dark,
  toast
}) {
  const mp = useMemo(() => buildMapData(processos), [processos]);
  const [novoOrg, setNovoOrg] = useState("");
  const [novoSec, setNovoSec] = useState("");
  const bg = dark ? T.appBgDark : T.appBg,
    cardBg = dark ? T.cardBgDark : T.cardBg,
    bdr = dark ? T.borderDark : T.border,
    tc = dark ? T.textMainDark : T.textMain;
  const iStyle = IS(dark);

  // Merge dos órgãos dos processos com a config
  const allOrgs = useMemo(() => {
    const s = new Set([...mp.allOrgaos, ...Object.keys(orgaosConfig)]);
    return [...s].sort();
  }, [mp.allOrgaos, orgaosConfig]);
  const toggleAtivo = async org => {
    const cur = orgaosConfig[org] || {
      secretario: "",
      ativo: true
    };
    const updated = {
      ...orgaosConfig,
      [org]: {
        ...cur,
        ativo: !cur.ativo
      }
    };
    await ST.set("orgaos_config", updated);
    onOrgaosChange(updated);
    toast(updated[org].ativo ? "✅ Órgão ativado." : "⚠️ Órgão desativado.", "info");
  };
  const handleAdicionar = async () => {
    if (!novoOrg.trim()) {
      toast("Nome do órgão obrigatório.", "error");
      return;
    }
    const updated = {
      ...orgaosConfig,
      [novoOrg.trim()]: {
        secretario: novoSec.trim(),
        ativo: true
      }
    };
    await ST.set("orgaos_config", updated);
    onOrgaosChange(updated);
    setNovoOrg("");
    setNovoSec("");
    toast("✅ Órgão adicionado!");
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      background: bg
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "\uD83C\uDFDB\uFE0F",
    title: "\xD3rg\xE3os",
    sub: "Gerenciar secretarias e departamentos",
    cor: "#0f766e",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px",
      display: "grid",
      gridTemplateColumns: "1fr 2fr",
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
    title: "Novo \xD3rg\xE3o",
    dark: dark
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Nome do \xD3rg\xE3o / Secretaria"), /*#__PURE__*/React.createElement("input", {
    value: novoOrg,
    onChange: e => setNovoOrg(e.target.value),
    placeholder: "SEC. DE SA\xDADE",
    style: iStyle
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Secret\xE1rio(a) padr\xE3o"), /*#__PURE__*/React.createElement("input", {
    value: novoSec,
    onChange: e => setNovoSec(e.target.value),
    placeholder: "Nome do secret\xE1rio",
    style: iStyle
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleAdicionar,
    style: {
      ...BS("success", false, dark),
      width: "100%",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\u2795"
  }), "Adicionar")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1.5px solid ${bdr}`,
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83C\uDFDB\uFE0F",
    title: `${allOrgs.length} Órgãos`,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 500,
      overflowY: "auto"
    }
  }, allOrgs.map(org => {
    const cfg = orgaosConfig[org] || {
      secretario: "",
      ativo: true
    };
    const ativo = cfg.ativo !== false;
    return /*#__PURE__*/React.createElement("div", {
      key: org,
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderRadius: 10,
        marginBottom: 6,
        background: dark ? "#0d1421" : "#f8fafc",
        border: `1px solid ${ativo ? bdr : "#991b1b"}`,
        opacity: ativo ? 1 : .6
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: tc
      }
    }, org), cfg.secretario && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#64748b"
      }
    }, cfg.secretario)), /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleAtivo(org),
      style: {
        ...BS(ativo ? "danger" : "success", false, dark),
        height: 30,
        fontSize: 11,
        padding: "0 10px 0 5px"
      }
    }, /*#__PURE__*/React.createElement(BtnIco, {
      emoji: ativo ? "🚫" : "✅"
    }), ativo ? "Desativar" : "Ativar"));
  })))));
}


export default OrgaosPage;
