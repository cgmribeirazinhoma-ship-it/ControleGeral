// ─── App — componente raiz v4.0 ──────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MUN, T, TINFO } from './constants.js';
import { ST, _sbReady, _sbLive, _sbTestConnection, versaoBancoCambou } from './lib/storage.js';
import { loadAllProcessos, loadAllHistorico } from './lib/loaders.js';
import { verificarEFazerBackup } from './lib/backup.js';
import LoginPage from './pages/LoginPage.jsx';
import Sidebar from './pages/Sidebar.jsx';
import NovoProcessoPage from './pages/NovoProcessoPage.jsx';
import BuscarPage from './pages/BuscarPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoricoPage from './pages/HistoricoPage.jsx';
import UsuariosPage from './pages/UsuariosPage.jsx';
import OrgaosPage from './pages/OrgaosPage.jsx';
import ConfigPage from './pages/ConfigPage.jsx';
import { ShortcutsModal } from './components/ui/index.jsx';
import { ConfirmModal } from './components/ui/Modals.jsx';
import Toast from './components/ui/Toast.jsx';

// ─── [G-S2] Backup automático semanal ────────────────────────────────────────
async function verificarEFazerBackup(processos, historico) {
  try {
    const hoje = new Date();
    const ehSegunda = hoje.getDay() === 1; // 0=dom, 1=seg
    if (!ehSegunda) return;
    const chaveBackup = `backup_${hoje.toISOString().slice(0,10)}`;
    const jaFez = await ST.get(chaveBackup);
    if (jaFez) return; // já fez backup hoje
    const snapshot = { processos, historico, ts: hoje.toISOString(), v: "3.5" };
    await ST.set(chaveBackup, snapshot);
    // Mantém apenas 4 backups — remove o mais antigo
    const backups = await ST.list("backup_");
    if (backups.length > 4) {
      backups.sort((a,b) => a.key.localeCompare(b.key));
      await ST.del(backups[0].key);
    }
    console.info("[Backup] Snapshot semanal salvo:", chaveBackup);
  } catch (e) { console.warn("[Backup] Falhou:", e.message); }
}


// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [sbOnline, setSbOnline] = useState(_sbLive); // [FIX-G] React state mirrors _sbLive for re-renders
  const [pendentesAtrasados, setPendentesAtrasados] = useState([]); // [G-R3]
  const [processos, setProcessos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [orgaosConfig, setOrgaosConfig] = useState({});
  const [appConfig, setAppConfig] = useState({
    controlador: {
      nome: "Thiago Soares Lima",
      cargo: "Controlador Geral",
      portaria: "Portaria 002/2025"
    }
  });
  const [page, setPage] = useState("processos");
  const [dark, setDark] = useState(false);
  const [formPct, setFormPct] = useState(0);
  const [duplicarData, setDuplicarData] = useState(null);
  const [editarData, setEditarData] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // [J-M1] mobile drawer
  // [FIX9] ConfirmModal global no App (para sair sem salvar)
  const [appConfirmModal, setAppConfirmModal] = useState(null);
  // [FIX11] Indicador de carregamento inicial
  const [carregando, setCarregando] = useState(true);
  const [erroRede, setErroRede] = useState("");
  // Âncora de numeração: garante que após importar planilha o próximo nº seja maxPlanilha+1
  const [importedMaxNum, setImportedMaxNum] = useState(0);
  // [M2] Ref para pausar polling durante modo edição (evita sobrescrever dados editados)
  const editModeRef = useRef(false);
  // [FIX6] Timer de sessão — expira após 8h de inatividade
  const sessaoTimerRef = useRef(null);
  const reiniciarTimerSessao = useCallback(() => {
    if (sessaoTimerRef.current) clearTimeout(sessaoTimerRef.current);
    sessaoTimerRef.current = setTimeout(() => {
      setUser(null);
      toast("⏰ Sessão expirada por inatividade. Faça login novamente.", "warn");
    }, 8 * 60 * 60 * 1000); // 8 horas
  }, []);
  const {
    toasts,
    toast
  } = useToast();

  // [M-A3] Service Worker registration for offline support
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.info("[SW] Registered:", reg.scope))
        .catch(err => console.warn("[SW] Registration failed:", err.message));
    }
  }, []);

  // [J-M3] PWA manifest injection
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = {
        name: "ControleGeral – Pref. Gov. Edison Lobão",
        short_name: "ControleGeral",
        start_url: "/",
        display: "standalone",
        background_color: "#006000",
        theme_color: "#006000"
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("link");
      link.rel = "manifest"; link.href = url;
      document.head.appendChild(link);
    }
    // theme-color meta
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta");
      meta.name = "theme-color"; meta.content = "#006000";
      document.head.appendChild(meta);
    }
  }, []);

  // [FIX6] Inicia timer de sessão ao logar
  useEffect(() => {
    if (user) {
      reiniciarTimerSessao();
      // [FIX10] Pré-carrega jsPDF e docx.js silenciosamente após login
      loadJsPDF().catch(() => {});
      loadDocxLib().catch(() => {});
    }
    return () => { if (sessaoTimerRef.current) clearTimeout(sessaoTimerRef.current); };
  }, [user]);

  // [FIX6] Reinicia timer a cada interação do usuário
  useEffect(() => {
    if (!user) return;
    const eventos = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => reiniciarTimerSessao();
    eventos.forEach(e => document.addEventListener(e, handler, { passive: true }));
    return () => eventos.forEach(e => document.removeEventListener(e, handler));
  }, [user, reiniciarTimerSessao]);

  // [B1] Zera formPct ao sair de "processos"
  const handleSetPage = useCallback(p => {
    // [FIX9] Usa ConfirmModal em vez de window.confirm ao sair sem salvar
    if (p !== "processos" && editModeRef.current) {
      setAppConfirmModal({
        titulo: "Sair sem salvar?",
        msg: "⚠️ Você está editando um processo.\n\nDeseja sair sem salvar as alterações?",
        tipo: "warn",
        onOk: () => {
          setAppConfirmModal(null);
          editModeRef.current = false;
          setFormPct(0);
          setPage(p);
        }
      });
      return;
    }
    if (p !== "processos") setFormPct(0);
    setPage(p);
  }, []);

  // [POLL] Carga inicial + sincronização a cada 20s + ao voltar para a aba
  useEffect(() => {
    const refresh = async (isFirst = false) => {
      // [M2] Não atualiza se o usuário está editando um processo
      if (editModeRef.current) return;
      try {
        const [p, h, o, a, n] = await Promise.all([
          loadAllProcessos(),
          loadAllHistorico(),
          ST.get("orgaos_config"),
          ST.get("app_config"),
          ST.get("imported_max_num")
        ]);
        // [FIX11] Limpa erro de rede ao carregar com sucesso
        if (isFirst) { setErroRede(""); setCarregando(false); }
        setSbOnline(_sbLive);
        setProcessos(p || []);
        setHistorico(h || []);
        // [G-S2] Verifica se deve fazer backup semanal
        if (isFirst) verificarEFazerBackup(p || [], h || []).catch(()=>{});
        // [G-R3] Calcula processos pendentes há mais de 5 dias úteis
        const hoje = new Date();
        const atrasados = (h || []).filter(hh => {
          if (hh["Decisão"]) return false; // já decidido
          if (!hh["_registradoEm"]) return false;
          // _registradoEm: "dd/mm/aaaa, HH:MM:SS"
          const parts = String(hh["_registradoEm"]).split(", ")[0].split("/");
          if (parts.length < 3) return false;
          const dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          const diff = (hoje - dt) / (1000 * 60 * 60 * 24);
          return diff >= 5;
        });
        setPendentesAtrasados(atrasados);
        if (o) setOrgaosConfig(o);
        if (a) setAppConfig(a);
        if (n && Number.isInteger(n) && n > 0) setImportedMaxNum(n);
      } catch (err) {
        // [FIX11] Mostra erro explícito se carga inicial falhar
        if (isFirst) {
          setErroRede("Falha ao carregar dados. Verifique a conexão.");
          setCarregando(false);
        }
      }
    };
    refresh(true); // primeira carga — mostra indicador e erro de rede se necessário
    const interval = setInterval(() => refresh(false), 20000); // [M7] 20 s
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const salvarProcessos = async p => {
    setProcessos(p);
    await ST.set("processos", p);
  };
  const salvarHistorico = async h => {
    setHistorico(h);
    await ST.set("historico", h);
  };
  const salvarOrgaos = async o => {
    setOrgaosConfig(o);
    await ST.set("orgaos_config", o);
  };
  const onSave = useCallback(async (row, form, user) => {
    const numSalvo = String(row["NÚMERO DO DOCUMENTO"] || "").trim();
    const usuario = user?.login || user?.nome || "sistema";
    // [G-S1] Operadores só criam — não editam processos existentes
    const novoItem = {
      ...row,
      "_tipoKey": form.tipo,
      "_decisao": form.decisao,
      "_obs": form.obs,
      "_usuario": usuario
    };

    // [ATOM] Grava processo em chave individual
    const resPoc = await ST.set(`proc_${numSalvo}`, novoItem);

    // Atualiza âncora de numeração
    const numInt = parseInt(numSalvo, 10);
    const currentMaxNum = (await ST.get("imported_max_num")) || 0;
    if (!isNaN(numInt) && numInt > currentMaxNum) {
      setImportedMaxNum(numInt);
      await ST.set("imported_max_num", numInt);
    }

    // Histórico individual — chave "hist_NUM"
    const hRow = {
      "Processo": row["NÚMERO DO DOCUMENTO"],
      "Data": dtExt(fmtD(row["DATA"])),
      "Órgão": row["ORGÃO"],
      "Fornecedor": row["FORNECEDOR"],
      "Valor": row["VALOR"],
      "Tipo": TINFO[form.tipo]?.label || form.tipo,
      "TipoKey": form.tipo,
      "Decisão": form.decisao === "deferir" ? "DEFERIDO" : "INDEFERIDO",
      "CNPJ": row["CNPJ"] || "",
      "MODALIDADE": row["MODALIDADE"] || "",
      "CONTRATO": row["CONTRATO"] || "",
      "OBJETO": row["OBJETO"] || "",
      "DOCUMENTO FISCAL": row["DOCUMENTO FISCAL"] || "",
      "Nº": row["Nº"] || "",
      "TIPO": row["TIPO"] || "",
      "SECRETARIO": row["SECRETARIO"] || "",
      "PERÍODO DE REFERÊNCIA": row["PERÍODO DE REFERÊNCIA"] || "",
      "N° ORDEM DE COMPRA": row["N° ORDEM DE COMPRA"] || "",
      "DATA NF": row["DATA NF"] || "",
      "NÚMERO DO DOCUMENTO": row["NÚMERO DO DOCUMENTO"] || "",
      "_obs": form.obs,
      "_sits": row["_sits"] || [],
      "_usuario": usuario,
      "_registradoEm": new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };
    await ST.set(`hist_${numSalvo}`, hRow);

    // [M-AU2] Audit log — registra criação
    await ST.set(`audit_${numSalvo}_${Date.now()}`, {
      acao: "criar", num: numSalvo, usuario,
      ts: new Date().toISOString(),
      campos: { orgao: row["ORGÃO"], fornecedor: row["FORNECEDOR"], valor: row["VALOR"], decisao: form.decisao }
    }).catch(() => {});

    // Re-carrega estado completo (reflete todos os usuários)
    const [p, h] = await Promise.all([loadAllProcessos(), loadAllHistorico()]);
    setProcessos(p || []);
    setHistorico(h || []);

    // Feedback: informa se salvou na nuvem ou só localmente
    if (resPoc.cloud) {
      toast(`✅ Processo ${row["NÚMERO DO DOCUMENTO"]} salvo na nuvem ☁️`);
    } else {
      toast(`⚠️ Processo ${row["NÚMERO DO DOCUMENTO"]} salvo localmente — verifique a conexão com o Supabase.`, "warn");
    }
  }, []);

  const onSaveEdit = useCallback(async (row, form, numOriginal, user) => {
    const numStr = String(numOriginal);
    const usuario = user?.login || user?.nome || "sistema";
    // [G-S1] Apenas admins podem editar processos de outros usuários
    if (user?.perfil !== "admin") {
      // Busca o processo original para verificar dono
      const procOriginal = processos.find(p => String(p["NÚMERO DO DOCUMENTO"]) === numStr);
      if (procOriginal && procOriginal["_usuario"] && procOriginal["_usuario"] !== usuario) {
        toast("⛔ Sem permissão para editar processo de outro usuário.", "error");
        return;
      }
    }
    const novoItem = {
      ...row,
      "_tipoKey": form.tipo,
      "_decisao": form.decisao,
      "_obs": form.obs,
      "_sits": row["_sits"] || [],
      "_usuario": usuario
    };

    // [ATOM] Upsert individual — não sobrescreve outros processos
    const resProc = await ST.set(`proc_${numStr}`, novoItem);

    // [FIX] Grava hist completo com TODOS os campos atualizados do row.
    // Antes: usava ...histExist que propagava dados antigos (ex: CONTRATO velho)
    // para o hist_* de maior prioridade, sobrescrevendo os dados novos do proc_*.
    const hRow = {
      "Processo":              row["NÚMERO DO DOCUMENTO"] || "",
      "Data":                  dtExt(fmtD(row["DATA"] || "")),
      "Órgão":                 row["ORGÃO"] || "",
      "Fornecedor":            row["FORNECEDOR"] || "",
      "Valor":                 row["VALOR"] || "",
      "Tipo":                  TINFO[form.tipo]?.label || form.tipo,
      "TipoKey":               form.tipo,
      "Decisão":               form.decisao === "deferir" ? "DEFERIDO" : "INDEFERIDO",
      "CNPJ":                  row["CNPJ"] || "",
      "MODALIDADE":            row["MODALIDADE"] || "",
      "CONTRATO":              row["CONTRATO"] || "",
      "OBJETO":                row["OBJETO"] || "",
      "DOCUMENTO FISCAL":      row["DOCUMENTO FISCAL"] || "",
      "Nº":                    row["Nº"] || "",
      "TIPO":                  row["TIPO"] || "",
      "SECRETARIO":            row["SECRETARIO"] || "",
      "PERÍODO DE REFERÊNCIA": row["PERÍODO DE REFERÊNCIA"] || "",
      "N° ORDEM DE COMPRA":    row["N° ORDEM DE COMPRA"] || "",
      "DATA NF":               row["DATA NF"] || "",
      "NÚMERO DO DOCUMENTO":   row["NÚMERO DO DOCUMENTO"] || "",
      "_obs":                  form.obs,
      "_sits":                 row["_sits"] || [],
      "_tipoKey":              form.tipo,
      "_decisao":              form.decisao,
      "_usuario":              usuario,
      "_registradoEm":         new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };
    await ST.set(`hist_${numStr}`, hRow);

    // [M-AU2] Audit log — registra edição
    await ST.set(`audit_${numStr}_${Date.now()}`, {
      acao: "editar", num: numStr, usuario,
      ts: new Date().toISOString(),
      campos: { orgao: row["ORGÃO"], fornecedor: row["FORNECEDOR"], valor: row["VALOR"], decisao: form.decisao }
    }).catch(() => {});

    // Re-carrega estado completo
    const [p, h] = await Promise.all([loadAllProcessos(), loadAllHistorico()]);
    setProcessos(p || []);
    setHistorico(h || []);

    if (resProc.cloud) {
      toast(`✅ Processo ${row["NÚMERO DO DOCUMENTO"]} atualizado na nuvem ☁️`, "info");
    } else {
      toast(`⚠️ Processo ${row["NÚMERO DO DOCUMENTO"]} atualizado localmente — verifique Supabase.`, "warn");
    }
  }, []);
  const handleEditar = useCallback(row => {
    setEditarData(row);
    handleSetPage("processos");
  }, [handleSetPage]);
  const handleDuplicar = useCallback(row => {
    setDuplicarData(row);
    handleSetPage("processos");
  }, [handleSetPage]);
  const handleGerarPDFBusca = useCallback(async row => {
    const tipo = row["_tipoKey"] || "padrao";
    const chk = CHK[tipo] || [];
    // sits: usa checklist salvo em _sits se houver, senão todos marcados
    const sitsRaw = row["_sits"] || row["_chks"];
    const sits = Array.isArray(sitsRaw) && sitsRaw.length === chk.length ? sitsRaw : Array(chk.length).fill(true);
    // Detectar decisão: processos têm _decisao, histórico tem "Decisão"
    const decRaw = row["_decisao"] || row["Decisão"] || "deferir";
    const isDeferido = decRaw !== "indeferir" && !String(decRaw).toUpperCase().includes("INDE");
    // Buscar dados completos do processo na tabela de processos (pode ter mais dados)
    const procCompleto = processos.find(p => String(p["NÚMERO DO DOCUMENTO"]) === String(row["NÚMERO DO DOCUMENTO"] || row["Processo"] || ""));
    const r2 = procCompleto || row;
    // Também buscar dados do fornecedor no histórico para auto-completar
    const mpBusca = buildMapData(processos);
    const forn2 = r2["FORNECEDOR"] || r2["Fornecedor"] || row["Fornecedor"] || "";
    const org2 = r2["ORGÃO"] || r2["Órgão"] || row["Órgão"] || "";
    // [FIX] Usa APENAS os dados do processo salvo, sem fallbacks históricos.
    // Fallbacks por fornecedor/órgão podiam sobrescrever campos que o usuário
    // editou e salvou, fazendo o PDF mostrar dados antigos (ex: CONTRATO velho).
    const d = {
      processo:    r2["NÚMERO DO DOCUMENTO"] || row["Processo"] || "",
      orgao:       org2,
      secretario:  r2["SECRETARIO"] || "",
      fornecedor:  forn2,
      cnpj:        r2["CNPJ"] || "",
      nf:          r2["Nº"] || "",
      contrato:    r2["CONTRATO"] || "",
      modalidade:  r2["MODALIDADE"] || "",
      periodo_ref: r2["PERÍODO DE REFERÊNCIA"] || "",
      ordem_compra: r2["N° ORDEM DE COMPRA"] || "",
      data_nf:     formatData(r2["DATA NF"] || row["Data"] || ""),
      data_ateste: dtExt(formatData(r2["DATA"] || row["Data"] || "")),
      objeto:      r2["OBJETO"] || "",
      valor:       r2["VALOR"] || r2["Valor"] || row["Valor"] || "",
      tipo_doc:    r2["DOCUMENTO FISCAL"] || "",
      tipo_nf:     r2["TIPO"] || "",
      obs:         r2["_obs"] || "",
      controlador: appConfig?.controlador || {}
    };
    const r = await gerarPDF(d, tipo, isDeferido, chk, sits);
    if (r.error) {
      toast("❌ PDF: " + r.error, "error");
      return;
    }
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
  }, [appConfig, processos]);
  const handleSync = useCallback(async () => {
    if (!_sbReady) {
      toast("⚠️ Supabase não configurado — dados salvos apenas neste navegador.", "warn");
      return;
    }
    toast("🔄 Sincronizando...", "info");

    // Carrega dados frescos do banco local/memória
    const [p, h, o] = await Promise.all([
      loadAllProcessos(),
      loadAllHistorico(),
      ST.get("orgaos_config")
    ]);

    // Envia cada processo individualmente (proc_NUM)
    const procJobs = (p || []).map(proc => {
      const num = String(proc["NÚMERO DO DOCUMENTO"] || "").trim();
      if (!num) return Promise.resolve();
      return ST.set(`proc_${num}`, proc);
    });

    // Envia cada histórico individualmente (hist_NUM)
    const histJobs = (h || []).map(hist => {
      const num = String(hist["Processo"] || hist["NÚMERO DO DOCUMENTO"] || "").trim();
      if (!num) return Promise.resolve();
      return ST.set(`hist_${num}`, hist);
    });

    // Envia blob de órgãos (pequeno, sem problema de conflito)
    const orgJob = o ? ST.set("orgaos_config", o) : Promise.resolve();

    await Promise.all([...procJobs, ...histJobs, orgJob]);

    // Recarrega estado com dados confirmados
    const [pFresh, hFresh] = await Promise.all([loadAllProcessos(), loadAllHistorico()]);
    setProcessos(pFresh || []);
    setHistorico(hFresh || []);

    setSbOnline(_sbLive);
    toast(`☁️ Sincronizado! ${(p||[]).length} processos · ${(h||[]).length} histórico`, "info");
  }, []);
  const handleImport = useCallback((rows, lastNum) => {
    // Importa planilha e enriquece processos manuais (campos vazios) com dados do histórico
    const rowMap = {};
    rows.forEach(r => {
      rowMap[String(r["NÚMERO DO DOCUMENTO"])] = r;
    });
    const fornMap = {};
    rows.forEach(r => {
      const f = String(r["FORNECEDOR"] || "").trim();
      if (f) fornMap[f] = r;
    });
    const enriched = processos.filter(p => !rowMap[String(p["NÚMERO DO DOCUMENTO"])]).map(p => {
      const forn = String(p["FORNECEDOR"] || "").trim();
      const ref = fornMap[forn];
      if (!ref) return p;
      return {
        ...p,
        "CNPJ": p["CNPJ"] || ref["CNPJ"] || "",
        "MODALIDADE": p["MODALIDADE"] || ref["MODALIDADE"] || "",
        "CONTRATO": p["CONTRATO"] || ref["CONTRATO"] || "",
        "DOCUMENTO FISCAL": p["DOCUMENTO FISCAL"] || ref["DOCUMENTO FISCAL"] || "",
        "TIPO": p["TIPO"] || ref["TIPO"] || "",
        "OBJETO": p["OBJETO"] || ref["OBJETO"] || "",
        "SECRETARIO": p["SECRETARIO"] || ref["SECRETARIO"] || ""
      };
    });
    const merged = [...rows, ...enriched];
    salvarProcessos(merged);
    // ── Auditoria de numeração ────────────────────────────────────────────────
    // ÂNCORA = lastNum (valor da ÚLTIMA LINHA da planilha, ex: 2591)
    // Isso respeita planilhas com fórmulas =L2+1 cumulativas
    // Também considera processos manuais já salvos (edge case)
    // ÂNCORA = lastNum = valor da ÚLTIMA LINHA da planilha (ex: 2591)
    // NÃO usar maiorNumero(rows) pois pode ter valores históricos maiores na planilha
    // lastNum é calculado em importarExcel() percorrendo linha a linha e pegando o último
    const novaAncora = lastNum || 0;
    const proximoNum = novaAncora + 1;
    if (novaAncora > 0) {
      setImportedMaxNum(novaAncora);
      ST.set("imported_max_num", novaAncora);
    }
    toast(
      "✅ " + rows.length + " registros importados." +
      (novaAncora > 0 ? " Último Nº: " + novaAncora + " | Próximo: " + proximoNum : ""),
      "info"
    );
  }, [processos, toast]);
  const handleSyncDB = useCallback(res => {
    if (res.processos?.length) salvarProcessos(res.processos);
    if (res.historico?.length) salvarHistorico(res.historico);
    if (Object.keys(res.orgaosConfig || {}).length) salvarOrgaos(res.orgaosConfig);
  }, []);

  // [C4] Histórico truncado check
  const histTruncado = historico.length >= 1000;
  // [C2] Próximo número com auditoria completa:
  // Quando importedMaxNum existe (planilha importada), ele É a fonte da verdade.
  // NÃO usar Math.max com proxNumero(processos) pois a planilha pode ter
  // valores históricos altos (ex: 3095) que inflam o resultado.
  const nextProcessoNumber = useMemo(() => {
    // Números de processos cadastrados MANUALMENTE após a importação
    // (processos normais da planilha são ignorados — a âncora já os cobre)
    const manuais = new Set(
      processos
        .map(p => parseInt(String(p["NÚMERO DO DOCUMENTO"] || "").trim(), 10))
        .filter(n => !isNaN(n) && n > 0 && n < 99999)
    );

    if (importedMaxNum > 0) {
      // Âncora definida: próximo = último da planilha + 1, pulando manuais
      let next = importedMaxNum + 1;
      while (manuais.has(next)) next++;
      return next;
    }

    // Sem âncora (banco ainda vazio): usa maior número existente + 1
    const nums = [...manuais];
    if (!nums.length) return 1;
    let next = nums.reduce((a,b) => a > b ? a : b, 0) + 1;
    while (manuais.has(next)) next++;
    return next;
  }, [processos, importedMaxNum]);

  // [FIX11] Tela de carregamento inicial
  if (carregando) return /*#__PURE__*/React.createElement("div", {
    style: { minHeight: "100vh", display: "flex", flexDirection: "column",
             alignItems: "center", justifyContent: "center", background: "#006000", gap: 18 }
  }, /*#__PURE__*/React.createElement(Brasao, { size: 64 }),
     /*#__PURE__*/React.createElement("div", {
       style: { fontSize: 13, color: "#4ade80", fontWeight: 600, letterSpacing: ".04em" }
     }, erroRede || "Carregando sistema..."),
     !erroRede && /*#__PURE__*/React.createElement("div", {
       style: { width: 180, height: 3, background: "rgba(255,255,255,.15)", borderRadius: 3, overflow: "hidden" }
     }, /*#__PURE__*/React.createElement("div", {
       style: { height: "100%", background: MUN.gold, borderRadius: 3,
                animation: "slideIn .8s ease-in-out infinite alternate",
                width: "60%" }
     })),
     erroRede && /*#__PURE__*/React.createElement("button", {
       onClick: () => { setCarregando(true); setErroRede(""); window.location.reload(); },
       style: { marginTop: 8, padding: "8px 20px", background: MUN.gold, color: "#000",
                border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
     }, "🔄 Tentar novamente"));

  if (!user) return /*#__PURE__*/React.createElement(LoginPage, {
    onLogin: setUser
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      minHeight: "100vh",
      fontFamily: "'Inter',system-ui,sans-serif",
      background: dark ? T.appBgDark : T.appBg,
      backgroundAttachment: "fixed"
    }
  }, /*#__PURE__*/React.createElement("style", null, `*{box-sizing:border-box;}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1e2d40;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:#2d4060}input,select,textarea{font-family:inherit}@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.page-enter{animation:fadeIn .18s ease-out both}@media(max-width:768px){.sidebar-hidden{display:none!important}.main-full{margin-left:0!important}}@media(max-width:640px){.grid-1col{grid-template-columns:1fr!important}}`), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSidebarOpen(o => !o),
    style: {
      position: "fixed", top: 12, left: 12, zIndex: 1000,
      background: MUN.green, border: "none", borderRadius: 8,
      width: 38, height: 38, cursor: "pointer", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 4, boxShadow: "0 2px 8px rgba(0,0,0,.3)"
    },
    className: "hamburger-btn"
  },
  ...[0,1,2].map(i => /*#__PURE__*/React.createElement("div", { key: i,
    style: { width: 18, height: 2, background: "#fff", borderRadius: 1 }
  }))
),
sidebarOpen && /*#__PURE__*/React.createElement("div", {
  onClick: () => setSidebarOpen(false),
  style: {
    display: "none", position: "fixed", inset: 0,
    background: "rgba(0,0,0,.5)", zIndex: 998
  },
  className: "sidebar-overlay"
}),
/*#__PURE__*/React.createElement(Sidebar, {
    page: page,
    setPage: handleSetPage,
    user: user,
    onLogout: () => setUser(null),
    onSync: handleSync,
    proxNum: nextProcessoNumber,
    dark: dark,
    onToggleDark: () => setDark(d => !d),
    formPct: formPct,
    sbOnline: sbOnline,
    pendentesAtrasados: pendentesAtrasados.length,
    onExportExcel: () => {
      exportarExcel(processos, historico);
      toast("✅ Planilha Excel salva!");
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, processos.length < 5 && page !== "config" && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "12px 16px 0",
      padding: "12px 16px",
      background: "#7c2d12",
      borderRadius: 10,
      border: "1.5px solid #ea580c",
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#fed7aa",
      fontSize: 13
    }
  }, "Nenhum dado importado \u2014 o sistema est\xE1 vazio"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "#fdba74",
      marginTop: 2
    }
  }, "V\xE1 em ", /*#__PURE__*/React.createElement("b", null, "Configura\xE7\xF5es"), " e clique em ", /*#__PURE__*/React.createElement("b", null, "Selecionar Excel (.xlsx)"), " para importar a planilha de processos. Sem isso os campos do PDF ficam em branco.")), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSetPage("config"),
    style: {
      background: "#ea580c",
      color: "#fff",
      border: "none",
      borderRadius: 7,
      padding: "7px 14px",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 12,
      whiteSpace: "nowrap"
    }
  }, "\uD83D\uDCE5 Ir para Configura\xE7\xF5es")), page === "processos" && /*#__PURE__*/React.createElement(NovoProcessoPage, {
    processos: processos,
    orgaosConfig: orgaosConfig,
    onSave: onSave,
    onSaveEdit: onSaveEdit,
    toast: toast,
    dark: dark,
    onPctChange: setFormPct,
    duplicarData: duplicarData,
    onDuplicarConsumed: () => setDuplicarData(null),
    editarData: editarData,
    onEditarConsumed: () => setEditarData(null),
    onShowShortcuts: () => setShowShortcuts(true),
    appConfig: appConfig,
    nextProcessoNumber: nextProcessoNumber,
    user: user,
    onEditModeChange: isEditing => { editModeRef.current = isEditing; }
  }), page === "buscar" && /*#__PURE__*/React.createElement(BuscarPage, {
    processos: processos,
    onCarregar: handleDuplicar,
    onEditar: handleEditar,
    onGerarPDF: handleGerarPDFBusca,
    toast: toast,
    dark: dark,
    user: user
  }), page === "dashboard" && /*#__PURE__*/React.createElement(DashboardPage, {
    processos: processos,
    historico: historico,
    dark: dark,
    appConfig: appConfig,
    toast: toast
  }), page === "historico" && /*#__PURE__*/React.createElement(HistoricoPage, {
    historico: historico,
    dark: dark,
    processos: processos,
    onDuplicar: handleDuplicar,
    onGerarPDF: handleGerarPDFBusca,
    onEditar: h => {
      // buscar o processo completo pelo número
      const proc = processos.find(p => String(p["NÚMERO DO DOCUMENTO"]) === String(h["Processo"]));
      if (proc) {
        handleEditar(proc);
      } else {
        toast("Processo não encontrado em Processos.", "warn");
      }
    },
    truncado: histTruncado
  }), page === "usuarios" && /*#__PURE__*/React.createElement(UsuariosPage, {
    dark: dark,
    toast: toast
  }), page === "orgaos" && /*#__PURE__*/React.createElement(OrgaosPage, {
    processos: processos,
    orgaosConfig: orgaosConfig,
    onOrgaosChange: o => {
      setOrgaosConfig(o);
      ST.set("orgaos_config", o);
    },
    dark: dark,
    toast: toast
  }), page === "config" && /*#__PURE__*/React.createElement(ConfigPage, {
    processos: processos,
    historico: historico,
    orgaosConfig: orgaosConfig,
    appConfig: appConfig,
    setAppConfig: setAppConfig,
    onImport: handleImport,
    onSyncDB: handleSyncDB,
    dark: dark,
    toast: toast,
    user: user,
    onLimparBanco: async () => {
      // Remove blobs legados e chaves individuais
      await Promise.all([
        ST.del("processos"),
        ST.del("historico"),
        ST.del("orgaos_config"),
        ST.del("app_config"),
        ST.del("draft_form"),
        ST.del("imported_max_num"),
        ST.del_prefix("proc_"),
        ST.del_prefix("hist_")
      ]);
      setProcessos([]);
      setHistorico([]);
      setOrgaosConfig({});
      setImportedMaxNum(0);
      toast("🗑️ Banco de dados apagado com sucesso.", "info");
    }
  })), showShortcuts && /*#__PURE__*/React.createElement(ShortcutsModal, {
    onClose: () => setShowShortcuts(false),
    dark: dark
  }),
  /*#__PURE__*/React.createElement(Toast, { toasts: toasts }),
  appConfirmModal && /*#__PURE__*/React.createElement(ConfirmModal, {
    titulo: appConfirmModal.titulo,
    msg: appConfirmModal.msg,
    tipo: appConfirmModal.tipo || "warn",
    dark: dark,
    onOk: appConfirmModal.onOk,
    onCancel: () => setAppConfirmModal(null)
  }));
}
window.App = App;
