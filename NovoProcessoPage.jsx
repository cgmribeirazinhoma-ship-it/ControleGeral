import React, {{ useState, useEffect, useCallback, useMemo, useRef }} from 'react';
import {{ MUN, T, TINFO, CHK, STATUS_MAP }} from '../constants.js';

// ─── NovoProcessoPage ─────────────────────────────────────────────────────────
function NovoProcessoPage({
  processos,
  orgaosConfig,
  onSave,
  onSaveEdit,
  toast,
  dark,
  onPctChange,
  duplicarData,
  onDuplicarConsumed,
  editarData,
  onEditarConsumed,
  onPdfDownload,
  onShowShortcuts,
  appConfig,
  nextProcessoNumber,
  user,
  onEditModeChange
}) {
  const mp = useMemo(() => buildMapData(processos), [processos]);
  const orgAtivos = useMemo(() => mp.allOrgaos.filter(o => orgaosConfig[o]?.ativo !== false), [mp, orgaosConfig]);
  const blankForm = useCallback(() => ({
    numDoc: String(nextProcessoNumber || proxNumero(processos)),
    dataDoc: todayISO(),
    periodo: "",
    orgao: "",
    secretario: "",
    fornecedor: "",
    cnpj: "",
    nomeFan: "",
    modalidade: "",
    contrato: "",
    ordemCompra: "",
    tipDoc: "",
    numNf: "",
    tipNf: "",
    valor: "",
    dataNf: todayISO(),
    objeto: "",
    dataAteste: todayISO(),
    decisao: "deferir",
    status: "analise",
    obs: "",
    notas: "",
    tipo: "padrao"
  }), [processos, nextProcessoNumber]);
  const formFromRow = useCallback(row => ({
    numDoc: String(nextProcessoNumber || proxNumero(processos)),
    dataDoc: todayISO(),
    periodo: row["PERÍODO DE REFERÊNCIA"] || row["PERIODO DE REFERENCIA"] || row["PERIODO"] || "",
    orgao: row["ORGÃO"] || row["ORGAO"] || "",
    secretario: row["SECRETARIO"] || row["SECRETÁRIO"] || "",
    fornecedor: row["FORNECEDOR"] || row["EMPRESA"] || row["CREDOR"] || "",
    cnpj: row["CNPJ"] || row["CNPJ/CPF"] || row["CPF/CNPJ"] || row["CPF"] || "",
    nomeFan: row["NOME FANTASIA"] || row["FANTASIA"] || "",
    modalidade: row["MODALIDADE"] || "",
    contrato: row["CONTRATO"] || row["NUMERO CONTRATO"] || "",
    ordemCompra: row["N° ORDEM DE COMPRA"] || row["ORDEM DE COMPRA"] || row["OC"] || "",
    tipDoc: row["DOCUMENTO FISCAL"] || row["DOC FISCAL"] || "",
    numNf: row["Nº"] || row["N°"] || row["NF"] || row["NF/FATURA"] || "",
    tipNf: row["TIPO"] || row["TIPO NF"] || "",
    valor: "",
    dataNf: todayISO(),
    objeto: row["OBJETO"] || row["DESCRICAO"] || row["DESCRIÇÃO"] || "",
    dataAteste: todayISO(),
    decisao: "deferir",
    status: "analise",
    obs: "",
    notas: "",
    tipo: "padrao"
  }), [processos, nextProcessoNumber]);
  const [form, setForm] = useState(blankForm);
  const [chks, setChks] = useState({});
  const [tab, setTab] = useState(0);
  const [editMode, setEditMode] = useState(null);
  const [modMode, setModMode] = useState("forn");
  const [contMode, setContMode] = useState("forn");
  const [objMode, setObjMode] = useState("historico");
  const [loading, setLoading] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [compact, setCompact] = useState(false);
  const [draftSaved, setDraftSaved] = useState(null);
  const [cnpjErro, setCnpjErro] = useState("");
  const [autoFillMsg, setAutoFillMsg] = useState(""); // [J-F3] auto-fill chip
  // [FIX9] Estado do ConfirmModal — substitui window.confirm
  const [confirmModal, setConfirmModal] = useState(null); // {msg,titulo,tipo,onOk}
  // [M2] Notifica o App quando entra/sai do modo edição → pausa polling
  useEffect(() => {
    if (onEditModeChange) onEditModeChange(!!editMode);
  }, [editMode]);
  const upd = f => v => setForm(p => ({
    ...p,
    [f]: v
  }));
  useEffect(() => {
    if (!duplicarData) return;
    setForm(formFromRow(duplicarData));
    setChks({});
    setPdfBlob(null);
    setTab(0);
    setEditMode(null);
    if (onDuplicarConsumed) onDuplicarConsumed();
  }, [duplicarData]);
  useEffect(() => {
    if (!editarData) return;
    const row = editarData;
    setForm({
      numDoc: row["NÚMERO DO DOCUMENTO"] || row["NUMERO DO DOCUMENTO"] || "",
      dataDoc: toISO(row["DATA"]) || todayISO(),
      periodo: row["PERÍODO DE REFERÊNCIA"] || row["PERIODO DE REFERENCIA"] || row["PERIODO"] || "",
      orgao: row["ORGÃO"] || row["ORGAO"] || "",
      secretario: row["SECRETARIO"] || row["SECRETÁRIO"] || "",
      fornecedor: row["FORNECEDOR"] || row["EMPRESA"] || row["CREDOR"] || "",
      cnpj: row["CNPJ"] || row["CNPJ/CPF"] || row["CPF/CNPJ"] || row["CPF"] || "",
      nomeFan: row["NOME FANTASIA"] || row["FANTASIA"] || "",
      modalidade: row["MODALIDADE"] || "",
      contrato: row["CONTRATO"] || row["NUMERO CONTRATO"] || "",
      ordemCompra: row["N° ORDEM DE COMPRA"] || row["ORDEM DE COMPRA"] || row["OC"] || "",
      tipDoc: row["DOCUMENTO FISCAL"] || row["DOC FISCAL"] || "",
      numNf: row["Nº"] || row["N°"] || row["NF"] || row["NF/FATURA"] || row["FATURA"] || "",
      tipNf: row["TIPO"] || row["TIPO NF"] || "",
      valor: row["VALOR"] || row["VALOR TOTAL"] || "",
      dataNf: toISO(row["DATA NF"]) || toISO(row["DATA DA NF"]) || todayISO(),
      objeto: row["OBJETO"] || row["DESCRICAO"] || row["DESCRIÇÃO"] || "",
      dataAteste: toISO(row["DATA"]) || todayISO(),
      decisao: row["_decisao"] || "deferir",
      obs: row["_obs"] || row["OBSERVACAO"] || row["OBSERVAÇÃO"] || "",
      notas: row["NOTAS"] || row["NOTA INTERNA"] || "",
      tipo: row["_tipoKey"] || "padrao"
    });
    // [FIX Bug D] Restaurar estado do checklist a partir de _sits salvo
    {
      const sits = row["_sits"];
      const tipoKey = row["_tipoKey"] || "padrao";
      const chkLen = (CHK[tipoKey] || []).length;
      if (Array.isArray(sits) && sits.length === chkLen && chkLen > 0) {
        setChks({ [tipoKey]: sits });
      } else {
        setChks({});
      }
    }
    setPdfBlob(null);
    setTab(0);
    setEditMode(row["NÚMERO DO DOCUMENTO"] || null);
    if (onEditarConsumed) onEditarConsumed();
  }, [editarData]);
  useEffect(() => {
    const t = setInterval(async () => {
      if (editMode) return;
      if (form.orgao || form.fornecedor || form.objeto) {
        await ST.set("draft_form", form);
        const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const cloudOk = await ST.set("draft_form", form).then(r=>r.cloud).catch(()=>false);
        setDraftSaved({ hora, cloud: cloudOk });
      }
    }, 30000);
    return () => clearInterval(t);
  }, [form, editMode]);
  useEffect(() => {
    if (editarData) return;
    ST.get("draft_form").then(d => {
      if (d && d.orgao !== undefined && (d.orgao || d.fornecedor)) setForm(p => ({ ...p, ...d }));
    });
  }, []);
  const pct = useMemo(() => {
    const req = ["numDoc", "orgao", "fornecedor", "cnpj", "valor", "objeto"];
    return Math.round(req.filter(k => form[k]).length / req.length * 100);
  }, [form]);
  useEffect(() => onPctChange(pct), [pct, onPctChange]);
  const handleSalvarRef = useRef(null);
  const handleGerarPDFRef = useRef(null);
  const handleLimparRef = useRef(null);
  const handleDuplicarUltimoRef = useRef(null);
  useEffect(() => {
    const h = e => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s" || e.key === "S") { e.preventDefault(); handleSalvarRef.current?.(); }
        if (e.key === "p" || e.key === "P") { e.preventDefault(); handleGerarPDFRef.current?.(); }
        if (e.key === "l" || e.key === "L") { e.preventDefault(); handleLimparRef.current?.(); }
        if (e.key === "d" || e.key === "D") { e.preventDefault(); handleDuplicarUltimoRef.current?.(); }
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onShowShortcuts && onShowShortcuts();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);
  const onOrgChange = v => setForm(f => ({
    ...f,
    orgao: v,
    secretario: f.secretario || mp.orgaoSecretario[v] || "",
    contrato: f.contrato || mp.orgaoContrato[v] || "",
    modalidade: f.modalidade || mp.orgaoModalidade[v] || ""
  }));
  const onFornChange = v => {
    const hasDados = mp.fornCnpj[v] || mp.fornObjeto[v] || mp.fornContrato[v];
    setForm(f => ({
      ...f,
      fornecedor: v,
      cnpj: f.cnpj || mp.fornCnpj[v] || "",
      objeto: f.objeto || mp.fornObjeto[v] || "",
      modalidade: f.modalidade || mp.fornModalidade[v] || "",
      contrato: f.contrato || mp.fornContrato[v] || "",
      tipDoc: f.tipDoc || mp.fornTipDoc[v] || "",
      tipNf: f.tipNf || mp.fornTipNf[v] || "",
      periodo: f.periodo || mp.fornPeriodo[v] || ""
    }));
    if (hasDados) {
      setAutoFillMsg(v ? `Dados do histórico aplicados para "${v.slice(0,30)}"` : "");
      setTimeout(() => setAutoFillMsg(""), 4000);
    }
  };
  const onCnpjChange = v => {
    const m = mascararCnpjCpf(v);
    setForm(f => ({
      ...f,
      cnpj: m,
      fornecedor: f.fornecedor || mp.cnpjForn[v] || ""
    }));
    const valido = validarCnpjCpf(m);
    setCnpjErro(valido ? "" : "CNPJ/CPF inválido — verifique os dígitos");
    // [M-AU1] Consulta BrasilAPI ao completar CNPJ com 14 dígitos válidos
    const digits = m.replace(/\D/g, "");
    if (digits.length === 14 && valido) {
      fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          setForm(f => ({
            ...f,
            fornecedor: f.fornecedor || d.razao_social || "",
            nomeFan: f.nomeFan || d.nome_fantasia || "",
            _cnpjStatus: d.descricao_situacao_cadastral || ""
          }));
          if (d.razao_social) toast("🏢 " + d.razao_social.slice(0,40) + " — dados preenchidos pela Receita", "info");
        })
        .catch(() => {});
    }
  };
  const onObjChange = v => setForm(f => ({
    ...f,
    objeto: v,
    modalidade: f.modalidade || mp.objModalidade[v] || "",
    contrato: f.contrato || mp.objContrato[v] || ""
  }));
  const onModalChange = v => setForm(f => ({
    ...f,
    modalidade: v,
    contrato: f.contrato || mp.modalContrato[v] || ""
  }));
  const getChks = t => {
    const n = CHK[t]?.length || 0;
    const c = chks[t];
    return c && c.length === n ? c : Array(n).fill(true);
  };
  const setChk = (t, i, v) => {
    const arr = [...getChks(t)];
    arr[i] = v;
    setChks(p => ({
      ...p,
      [t]: arr
    }));
  };
  const mFF = form.fornecedor ? mp.fornModalidadesList[form.fornecedor] || [] : [];
  const mShow = modMode === "forn" && mFF.length ? mFF : mp.allModalidades;
  const mFiltered = modMode === "forn" && Boolean(mFF.length);
  const cFF = form.fornecedor ? mp.fornContratosList[form.fornecedor] || [] : [];
  const cShow = contMode === "forn" && cFF.length ? cFF : mp.allContratos;
  const cFiltered = contMode === "forn" && Boolean(cFF.length);
  const oFF = form.fornecedor ? mp.fornObjetosList[form.fornecedor] || [] : [];
  const oShow = objMode === "historico" && oFF.length ? oFF : mp.allObjsHist;
  const secSug = form.orgao && !form.secretario ? mp.orgaoSecretario[form.orgao] : "";
  const secsOpts = mp.allSecretarios;
  // Usa numeroDuplicado() do sistema de auditoria: verifica duplicata respeitando edição
  const checarDuplicata = num => numeroDuplicado(num, processos, editMode);
  const makeDados = () => {
    // Auto-completar campos vazios com dados do histórico — SOMENTE em modo criação.
    // Em modo edição (editMode), usa apenas o valor do formulário para garantir que
    // alterações feitas pelo usuário sejam refletidas exatamente no PDF gerado.
    const forn = form.fornecedor;
    const org = form.orgao;
    const useMap = !editMode; // false em edição: sem fallback histórico
    const cnpj      = form.cnpj      || (useMap ? mp.fornCnpj[forn] || "" : "");
    const contrato  = form.contrato  || (useMap ? mp.fornContrato[forn] || mp.orgaoContrato[org] || "" : "");
    const modalidade= form.modalidade|| (useMap ? mp.fornModalidade[forn] || mp.orgaoModalidade[org] || "" : "");
    const secretario= form.secretario|| (useMap ? mp.orgaoSecretario[org] || "" : "");
    const objeto    = form.objeto    || (useMap ? mp.fornObjeto[forn] || "" : "");
    const tipDoc    = form.tipDoc    || (useMap ? mp.fornTipDoc[forn] || "" : "");
    const periodo   = form.periodo   || (useMap ? mp.fornPeriodo[forn] || "" : "");
    const tipNf     = form.tipNf     || (useMap ? mp.fornTipNf[forn] || "" : "");
    return {
      processo:    form.numDoc,
      orgao:       org,
      secretario:  secretario,
      fornecedor:  forn,
      cnpj:        cnpj,
      nf:          form.numNf,
      contrato:    contrato,
      modalidade:  modalidade,
      periodo_ref: periodo,
      ordem_compra: form.ordemCompra,
      data_nf:     formatData(form.dataNf),
      data_ateste: dtExt(formatData(form.dataAteste)),
      objeto:      objeto,
      valor:       form.valor,
      tipo_doc:    tipDoc,
      tipo_nf:     tipNf,
      obs:         form.obs,
      controlador: appConfig?.controlador || {}
    };
  };
  const handleGerarPDF = async () => {    if (loading) return;
    if (!form.orgao && !form.fornecedor) {
      toast("⚠️ Preencha pelo menos Órgão ou Fornecedor antes de gerar o PDF.", "warn");
      return;
    }
    setLoading(true);
    try {
      const t = form.tipo,
        s = getChks(t);
      const r = await gerarPDF(makeDados(), t, form.decisao === "deferir", CHK[t], s);
      if (r.error) {
        toast(`❌ PDF: ${r.error}`, "error");
        return;
      }
      setPdfBlob(r.blob);
      setPdfName(r.name || "documento.pdf");
      if (onPdfDownload) onPdfDownload(r.blob, r.name);else {
        const url = URL.createObjectURL(r.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = r.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 2000);
        toast("✅ PDF gerado!");
      }
    } catch (err) {
      toast("❌ Erro ao gerar PDF: " + err.message, "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const handleSalvar = async () => {
    if (!form.orgao || !form.fornecedor || !form.valor) {
      toast("Preencha Órgão, Fornecedor e Valor.", "error");
      return;
    }
    if (cnpjErro) {
      toast("Corrija o CNPJ/CPF antes de salvar.", "error");
      return;
    }
    if (checarDuplicata(form.numDoc) && !editMode) {
      // [FIX9] Usa ConfirmModal em vez de window.confirm
      setConfirmModal({
        titulo: "Número duplicado",
        msg: `⚠️ Número ${form.numDoc} já está em uso!\n\nClique em Confirmar para usar automaticamente o Nº ${nextProcessoNumber} (próximo disponível).\nClique em Cancelar para corrigir manualmente.`,
        tipo: "warn",
        onOk: () => {
          setConfirmModal(null);
          upd("numDoc")(String(nextProcessoNumber));
          setForm(f => ({ ...f, numDoc: String(nextProcessoNumber) }));
          toast(`🔢 Número corrigido automaticamente para ${nextProcessoNumber}`, "info");
        }
      });
      return;
    }
    setLoading(true);
    try {
      const row = {
        "NÚMERO DO DOCUMENTO": form.numDoc,
        "DATA": fmtD(form.dataDoc),
        "PERÍODO DE REFERÊNCIA": form.periodo,
        "ORGÃO": form.orgao,
        "SECRETARIO": form.secretario,
        "FORNECEDOR": form.fornecedor,
        "CNPJ": form.cnpj,
        "NOME FANTASIA": form.nomeFan,
        "MODALIDADE": form.modalidade,
        "CONTRATO": form.contrato,
        "N° ORDEM DE COMPRA": form.ordemCompra,
        "DOCUMENTO FISCAL": form.tipDoc,
        "Nº": form.numNf,
        "TIPO": form.tipNf,
        "VALOR": form.valor,
        "DATA NF": fmtD(form.dataNf),
        "OBJETO": form.objeto,
        "NOTAS": form.notas,
        "_sits": getChks(form.tipo),
        "_tipoKey": form.tipo,
        "_status": form.status || "analise"
      };
      if (editMode) {
        await onSaveEdit(row, form, editMode, user);
        setEditMode(null);
      } else {
        await onSave(row, form, user);
      }
      await ST.del("draft_form");
      setDraftSaved(null);
      setForm(blankForm());
      setChks({});
      setPdfBlob(null);
      setTab(0);
    } finally {
      setLoading(false);
    }
  };
  const handleDL = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfName || "documento.pdf";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
    toast("✅ PDF baixado!");
  };
  const handleImprimir = () => {
    if (!pdfBlob) {
      toast("Gere o PDF primeiro.", "warn");
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
    iframe.src = url;
    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch {}
      URL.revokeObjectURL(url);
    };
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        window.open(url, "_blank");
      }
      setTimeout(cleanup, 60000);
    };
    iframe.onerror = () => { cleanup(); toast("Erro ao abrir PDF para impressão.", "warn"); };
  };
  const handleLimpar = () => {
    // [FIX9] Usa ConfirmModal em vez de window.confirm
    const temDados = form.orgao || form.fornecedor || form.valor || form.objeto || form.cnpj;
    const msg = temDados
      ? "Existem dados preenchidos no formulário.\n\nTem certeza que deseja limpar tudo? Esta ação não pode ser desfeita."
      : "Limpar todos os campos do formulário?";
    setConfirmModal({
      titulo: "Limpar formulário",
      msg,
      tipo: temDados ? "danger" : "warn",
      onOk: () => {
        setConfirmModal(null);
        setForm(blankForm());
        setChks({});
        setPdfBlob(null);
        ST.del("draft_form");
        setDraftSaved(null);
        setEditMode(null);
        toast("🗑️ Formulário limpo.");
      }
    });
  };
  const ultimoProcesso = processos[processos.length - 1] || null;
  const handleDuplicarUltimo = () => {
    if (!ultimoProcesso) {
      toast("Nenhum processo salvo.", "warn");
      return;
    }
    setForm(formFromRow(ultimoProcesso));
    setChks({});
    setPdfBlob(null);
    setTab(0);
    toast(`📋 Duplicado: ${ultimoProcesso["NÚMERO DO DOCUMENTO"]}`);
  };
  // [Bug 4 FIX] Atualiza refs dos atalhos a cada render — sem stale closures
  handleSalvarRef.current = handleSalvar;
  handleGerarPDFRef.current = handleGerarPDF;
  handleLimparRef.current = handleLimpar;
  handleDuplicarUltimoRef.current = handleDuplicarUltimo;
  const ti = TINFO[form.tipo];
  const chkItems = CHK[form.tipo] || [];
  const sits = getChks(form.tipo);
  const pctChk = chkItems.length ? Math.round(sits.filter(Boolean).length / chkItems.length * 100) : 100;
  const bg = dark ? T.appBgDark : T.appBg,
    cardBg = dark ? T.cardBgDark : T.cardBg;
  const bdr = dark ? T.borderDark : T.border,
    tc = dark ? T.textMainDark : T.textMain;
  const iStyle = IS(dark);
  const tabSt = i => ({
    padding: "9px 16px",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    borderBottom: `2px solid ${tab === i ? "#3b6ef8" : "transparent"}`,
    color: tab === i ? "#3b6ef8" : "#9ca3af",
    transition: "color .15s"
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      background: bg
    }
  }, editMode && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#854d0e",
      borderBottom: "2px solid #eab308",
      padding: "8px 22px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontSize: 13,
      fontWeight: 700,
      color: "#fef08a"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u26A0\uFE0F"), "Voc\xEA est\xE1 editando o Processo #" + editMode + " \u2014 salve para confirmar.", /*#__PURE__*/React.createElement("button", {
    onClick: () => { setEditMode(null); setForm(blankForm()); setChks({}); setPdfBlob(null); },
    style: {
      marginLeft: "auto",
      background: "rgba(0,0,0,.25)",
      border: "1px solid rgba(255,255,255,.3)",
      borderRadius: 6,
      color: "#fef08a",
      fontSize: 11,
      fontWeight: 700,
      padding: "3px 10px",
      cursor: "pointer"
    }
  }, "\u2715 Cancelar")), /*#__PURE__*/React.createElement(PageHeader, {
    icon: ti?.icon || "📄",
    title: editMode ? `✏️ Editando Processo #${editMode}` : "Novo Processo",
    sub: editMode ? "Alterações substituirão o registro original" : "Preencha os dados e gere os documentos",
    dark: dark,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, editMode && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setEditMode(null);
        setForm(blankForm());
        setChks({});
        setPdfBlob(null);
      },
      style: {
        ...BS("ghost", false, dark),
        height: 34,
        fontSize: 11
      }
    }, "\u2715 Cancelar Edi\xE7\xE3o"), /*#__PURE__*/React.createElement("button", {
      onClick: handleDuplicarUltimo,
      disabled: !ultimoProcesso,
      style: {
        ...BS("secondary", !ultimoProcesso, dark),
        height: 34,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement(BtnIco, {
      emoji: "\u29C9"
    }), "Duplicar \xDAltimo"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onShowShortcuts && onShowShortcuts(),
      style: {
        ...BS("ghost", false, dark),
        height: 34,
        fontSize: 11
      }
    }, "\u2328\uFE0F Atalhos"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 22px"
    }
  }, autoFillMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5, fontWeight: 600, marginBottom: 8, padding: "7px 12px",
      background: dark ? "#003d00" : "#f0fdf4",
      border: "1px solid #16a34a33", borderRadius: 8, color: "#16a34a",
      display: "flex", alignItems: "center", gap: 6
    }
  }, "\u2728 ", autoFillMsg),
  draftSaved && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5, marginBottom: 10,
      display: "flex", alignItems: "center", gap: 6,
      padding: "4px 10px",
      background: draftSaved.cloud ? (dark?"#052e16":"#f0fdf4") : (dark?"#1c1400":"#fefce8"),
      borderRadius: 20, border: "1px solid " + (draftSaved.cloud?"#16a34a33":"#ca8a0433"),
      width: "fit-content"
    }
  },
  /*#__PURE__*/React.createElement("span", {style:{fontSize:10}}, draftSaved.cloud ? "\u2601\uFE0F" : "\uD83D\uDCBE"),
  /*#__PURE__*/React.createElement("span", {style:{color: draftSaved.cloud?"#16a34a":"#d97706", fontWeight:600}},
    draftSaved.cloud ? "Salvo na nuvem " : "Salvo localmente ",
    draftSaved.hora || ""
  )), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 12,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(KPICard, {
    label: "Processos",
    value: processos.length.toLocaleString(),
    gradient: T.kpi2,
    icon: "\uD83D\uDCC4"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "\xD3rg\xE3os",
    value: mp.allOrgaos.length,
    gradient: T.kpi1,
    icon: "\uD83C\uDFDB\uFE0F"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Credores",
    value: mp.allFornecedores.length,
    gradient: T.kpi5,
    icon: "\uD83C\uDFE2"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Pr\xF3ximo N\xBA",
    value: nextProcessoNumber || proxNumero(processos),
    gradient: T.kpi4,
    icon: "\uD83D\uDD22"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(5,1fr)",
      gap: 8,
      marginBottom: 16
    }
  }, Object.entries(TINFO).map(([tk, ti2]) => {
    const act = form.tipo === tk;
    return /*#__PURE__*/React.createElement("div", {
      key: tk,
      onClick: () => setForm(f => ({
        ...f,
        tipo: tk
      })),
      style: {
        border: `1.5px solid ${act ? ti2.cor : bdr}`,
        background: act ? ti2.cor + "12" : cardBg,
        borderRadius: 10,
        padding: "8px 6px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all .15s",
        position: "relative",
        overflow: "hidden",
        minWidth: 0
      }
    }, act && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: ti2.cor
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        marginBottom: 3
      }
    }, ti2.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: act ? 700 : 500,
        color: act ? ti2.cor : dark ? "#4a6494" : "#64748b",
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, ti2.label));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: cardBg,
      borderRadius: 14,
      border: `1px solid ${bdr}`,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `1px solid ${bdr}`,
      padding: "0 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, ["🏢 Dados", "📜 Contrato", "✅ Ateste"].map((t, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    style: tabSt(i),
    onClick: () => setTab(i)
  }, t))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCompact(c => !c),
    style: {
      ...BS("ghost", false, dark),
      height: 30,
      fontSize: 11,
      padding: "0 10px"
    }
  }, compact ? "↕ Normal" : "↔ Compacto")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: compact ? "12px 16px" : "20px 24px"
    }
  }, tab === 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83D\uDD22",
    title: "Identifica\xE7\xE3o",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "N\xBA Documento *"), /*#__PURE__*/React.createElement("input", {
    value: form.numDoc,
    onChange: e => upd("numDoc")(e.target.value),
    style: {
      ...iStyle,
      borderColor: checarDuplicata(form.numDoc) && !editMode
        ? "#dc2626"
        : form.numDoc && !checarDuplicata(form.numDoc) && !editMode
          ? "#16a34a"
          : iStyle.borderColor
    }
  }), checarDuplicata(form.numDoc) && !editMode
    ? /*#__PURE__*/React.createElement("div", {
        style: { fontSize: 10.5, color: "#dc2626", marginTop: -10, marginBottom: 8,
                 display: "flex", alignItems: "center", justifyContent: "space-between" }
      },
        /*#__PURE__*/React.createElement("span", null, "\u26A0\uFE0F N\xFAmero ", form.numDoc, " j\xE1 em uso!"),
        /*#__PURE__*/React.createElement("button", {
          onClick: () => { upd("numDoc")(String(nextProcessoNumber)); setForm(f => ({...f, numDoc: String(nextProcessoNumber)})); },
          style: { fontSize: 10, background: "#16a34a", color: "#fff", border: "none",
                   borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontWeight: 700 }
        }, "\uD83D\uDD22 Usar Nº ", nextProcessoNumber)
      )
    : form.numDoc && !editMode
      ? /*#__PURE__*/React.createElement("div", {
          style: { fontSize: 10.5, color: "#16a34a", marginTop: -10, marginBottom: 8 }
        }, "\u2705 N\xFAmero dispon\xEDvel")
      : null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Data *"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: form.dataDoc,
    onChange: e => upd("dataDoc")(e.target.value),
    style: iStyle
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Per\xEDodo Ref."), /*#__PURE__*/React.createElement(PeriodoInput, {
    value: form.periodo,
    onChange: upd("periodo"),
    dark: dark,
    style: {
      ...iStyle,
      marginBottom: 0
    }
  }))), /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83C\uDFDB\uFE0F",
    title: "\xD3rg\xE3o e Secretaria",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(SearchSelect, {
    label: "\xD3rg\xE3o / Secretaria",
    required: true,
    value: form.orgao,
    options: orgAtivos,
    onChange: onOrgChange,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", null, secSug && /*#__PURE__*/React.createElement("div", {
    onClick: () => setForm(f => ({
      ...f,
      secretario: secSug
    })),
    style: {
      fontSize: 9.5,
      color: "#3b6ef8",
      fontWeight: 600,
      marginBottom: 4,
      cursor: "pointer"
    }
  }, "\uD83D\uDCA1 Sugest\xE3o (clique para usar): ", /*#__PURE__*/React.createElement("b", null, secSug.slice(0, 45))), /*#__PURE__*/React.createElement(SearchSelect, {
    label: "Secret\xE1rio(a)",
    value: form.secretario,
    options: secsOpts,
    onChange: v => setForm(f => ({
      ...f,
      secretario: v
    })),
    dark: dark
  }))), /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83C\uDFE2",
    title: "Credor / Fornecedor",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "2fr 1.5fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(SearchSelect, {
    label: "Credor *",
    required: true,
    value: form.fornecedor,
    options: mp.allFornecedores,
    onChange: onFornChange,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "CNPJ / CPF *"), /*#__PURE__*/React.createElement("input", {
    value: form.cnpj,
    onChange: e => onCnpjChange(e.target.value),
    placeholder: "00.000.000/0001-00",
    style: iStyle
  }), cnpjErro && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: "#dc2626",
      marginTop: -10,
      marginBottom: 8
    }
  }, "\u26A0\uFE0F ", cnpjErro)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Nome Fantasia"), /*#__PURE__*/React.createElement("input", {
    value: form.nomeFan,
    onChange: e => upd("nomeFan")(e.target.value),
    placeholder: "Opcional",
    style: iStyle
  })))), tab === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83D\uDCDC",
    title: "Licita\xE7\xE3o",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(FilterBadge, {
    count: mShow.length,
    fonte: form.fornecedor,
    isFiltered: mFiltered
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Modalidade"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(SearchSelect, {
    value: form.modalidade,
    options: mShow,
    onChange: onModalChange,
    dark: dark,
    label: ""
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModMode(m => m === "forn" ? "todos" : "forn"),
    title: modMode === "forn" ? "Ver todas" : "Filtrar por fornecedor",
    style: {
      width: 36,
      height: 36,
      flexShrink: 0,
      background: dark ? "#0f1c2e" : "#f1f5f9",
      border: `1.5px solid ${bdr}`,
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 15,
      alignSelf: "flex-start",
      marginTop: 1
    }
  }, modMode === "forn" ? "📂" : "🏢"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(FilterBadge, {
    count: cShow.length,
    fonte: form.fornecedor,
    isFiltered: cFiltered
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "N\xBA Contrato"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(SearchSelect, {
    value: form.contrato,
    options: cShow,
    onChange: v => setForm(f => ({
      ...f,
      contrato: v
    })),
    dark: dark,
    label: ""
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setContMode(m => m === "forn" ? "todos" : "forn"),
    title: contMode === "forn" ? "Ver todas" : "Filtrar por fornecedor",
    style: {
      width: 36,
      height: 36,
      flexShrink: 0,
      background: dark ? "#0f1c2e" : "#f1f5f9",
      border: `1.5px solid ${bdr}`,
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 15,
      alignSelf: "flex-start",
      marginTop: 1
    }
  }, contMode === "forn" ? "📂" : "🏢"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 19
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "N\xB0 Ordem de Compra"), /*#__PURE__*/React.createElement("input", {
    value: form.ordemCompra,
    onChange: e => upd("ordemCompra")(e.target.value),
    placeholder: "Preencher manualmente",
    style: {
      ...iStyle,
      marginBottom: 0
    }
  }))), /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83E\uDDFE",
    title: "Documento Fiscal",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(SearchSelect, {
    label: "Tipo Doc. Fiscal",
    value: form.tipDoc,
    options: mp.allDocFiscais.filter(v => !["BANCO DO BRASIL", "BANCO INTER", "BOLETO BANCÁRIO", "BRADESCO", "CAIXA ECONÔMICA FEDERAL", "MERCADO PAGO"].includes(v)),
    onChange: v => setForm(f => ({
      ...f,
      tipDoc: v
    })),
    dark: dark
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "N\xBA NF"), /*#__PURE__*/React.createElement("input", {
    value: form.numNf,
    onChange: e => upd("numNf")(e.target.value),
    placeholder: "229",
    style: iStyle
  })), /*#__PURE__*/React.createElement(SearchSelect, {
    label: "Tipo NF",
    value: form.tipNf,
    options: mp.allTiposNf,
    onChange: v => setForm(f => ({
      ...f,
      tipNf: v
    })),
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Valor (R$) *"), /*#__PURE__*/React.createElement("input", {
    value: form.valor,
    onChange: e => upd("valor")(e.target.value),
    onBlur: e => upd("valor")(formatValor(e.target.value)),
    placeholder: "43.088,62",
    style: iStyle
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Data NF"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: form.dataNf,
    onChange: e => upd("dataNf")(e.target.value),
    style: iStyle
  })))), tab === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83D\uDCDD",
    title: "Objeto",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(FilterBadge, {
    count: oShow.length,
    fonte: form.fornecedor,
    isFiltered: objMode === "historico" && Boolean(oFF.length)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(SearchSelect, {
    label: "Objeto *",
    value: form.objeto,
    options: oShow,
    onChange: onObjChange,
    dark: dark
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setObjMode(m => m === "historico" ? "todos" : "historico"),
    style: {
      width: 38,
      height: 38,
      flexShrink: 0,
      background: dark ? "#0f1c2e" : "#f1f5f9",
      border: `1.5px solid ${bdr}`,
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 16,
      marginBottom: 14
    }
  }, objMode === "historico" ? "📂" : "🏢"))), /*#__PURE__*/React.createElement(SH, {
    icon: "\uD83D\uDCC5",
    title: "Ateste e Decis\xE3o",
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Data Ateste"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: form.dataAteste,
    onChange: e => upd("dataAteste")(e.target.value),
    style: iStyle
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Decis\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      height: 38,
      alignItems: "center"
    }
  }, [["deferir", "✅ Deferir", "#16a34a"], ["indeferir", "❌ Indeferir", "#dc2626"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("label", {
    key: v,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      fontWeight: form.decisao === v ? 700 : 400,
      color: form.decisao === v ? c : tc,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    value: v,
    checked: form.decisao === v,
    onChange: () => setForm(f => ({
      ...f,
      decisao: v
    }))
  }), l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", { style: { marginBottom: 14 } },
  /*#__PURE__*/React.createElement("label", { style: LS(dark) }, "Status de Tramita\xE7\xE3o"),
  /*#__PURE__*/React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    Object.entries(STATUS_MAP).map(([k, s]) =>
      /*#__PURE__*/React.createElement("button", {
        key: k,
        onClick: () => setForm(f => ({ ...f, status: k })),
        style: {
          padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${form.status === k ? s.cor : bdr}`,
          background: form.status === k ? s.cor + "20" : cardBg,
          color: form.status === k ? s.cor : tc,
          fontWeight: form.status === k ? 700 : 400,
          fontSize: 12, cursor: "pointer", transition: "all .15s"
        }
      }, s.emoji + " " + s.label)
    )
  )
),
/*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "Observa\xE7\xE3o (aparece no PDF)"), /*#__PURE__*/React.createElement("textarea", {
    value: form.obs,
    onChange: e => upd("obs")(e.target.value),
    rows: 3,
    style: {
      ...iStyle,
      height: "auto",
      resize: "vertical"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LS(dark)
  }, "\uD83D\uDCCC Notas Internas"), /*#__PURE__*/React.createElement("textarea", {
    value: form.notas,
    onChange: e => upd("notas")(e.target.value),
    placeholder: "N\xE3o aparecem no PDF",
    rows: 3,
    style: {
      ...iStyle,
      height: "auto",
      resize: "vertical",
      borderColor: dark ? "#3b4f6b" : "#fde68a",
      background: dark ? "#3d3100" : "#fffbeb"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: dark ? "#003800" : "#f8faff",
      borderRadius: 12,
      padding: "14px 16px",
      border: `1px solid ${bdr}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      marginBottom: 10,
      color: tc
    }
  }, "\u2611 Checklist \u2014 ", ti.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 4
    }
  }, chkItems.map((item, i) => /*#__PURE__*/React.createElement("label", {
    key: `${form.tipo}-${i}`,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      fontSize: 12.5,
      marginBottom: 4,
      color: tc
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: sits[i],
    onChange: e => setChk(form.tipo, i, e.target.checked),
    style: {
      width: 14,
      height: 14,
      flexShrink: 0,
      accentColor: "#3b6ef8"
    }
  }), item))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: dark ? "#1e2d40" : "#e2e8f0",
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${pctChk}%`,
      borderRadius: 4,
      transition: "width .3s",
      background: pctChk === 100 ? "#16a34a" : "#f59e0b"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#64748b",
      marginTop: 3
    }
  }, sits.filter(Boolean).length, "/", chkItems.length, " itens verificados")))))), form.fornecedor && !form.cnpj && mp.fornCnpj[form.fornecedor] && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#f59e0b",
      fontWeight: 600,
      marginBottom: 8,
      padding: "6px 10px",
      background: "rgba(245,158,11,.1)",
      borderRadius: 7,
      border: "1px solid rgba(245,158,11,.3)"
    }
  }, "\uD83D\uDCA1 Dados dispon\xEDveis no hist\xF3rico para \"", form.fornecedor, "\". Clique em ", /*#__PURE__*/React.createElement("b", null, "Gerar PDF"), " para aplicar automaticamente."), form.fornecedor && !form.cnpj && !mp.fornCnpj[form.fornecedor] && processos.length < 5 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#f87171",
      fontWeight: 600,
      marginBottom: 8,
      padding: "6px 10px",
      background: "rgba(248,113,113,.1)",
      borderRadius: 7,
      border: "1px solid rgba(248,113,113,.3)"
    }
  }, "\u26A0\uFE0F Importe a planilha Excel em ", /*#__PURE__*/React.createElement("b", null, "Configura\xE7\xF5es"), " para habilitar o auto-preenchimento de CNPJ, Contrato, Modalidade etc."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleGerarPDF,
    disabled: loading,
    style: {
      ...BS("primary", loading, dark),
      flex: "1 1 130px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: loading ? "⏳" : "📄"
  }), loading ? "Gerando..." : "Gerar PDF"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSalvar,
    disabled: loading,
    style: {
      ...BS("success", loading, dark),
      flex: "1 1 130px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: loading ? "⏳" : "💾"
  }), loading ? "Salvando..." : editMode ? "Salvar Edição" : "Salvar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleDL,
    disabled: !pdfBlob,
    style: {
      ...BS(pdfBlob ? "secondary" : "ghost", !pdfBlob, dark),
      flex: "1 1 100px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\u2B07\uFE0F"
  }), "Baixar PDF"), /*#__PURE__*/React.createElement("button", {
    onClick: handleImprimir,
    disabled: !pdfBlob,
    style: {
      ...BS(pdfBlob ? "secondary" : "ghost", !pdfBlob, dark),
      flex: "1 1 100px"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\uD83D\uDDA8\uFE0F"
  }), "Imprimir"), /*#__PURE__*/React.createElement("button", {
    onClick: handleLimpar,
    style: {
      ...BS("ghost", false, dark),
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(BtnIco, {
    emoji: "\uD83D\uDDD1\uFE0F"
  }), "Limpar")))); 
}


export default NovoProcessoPage;
