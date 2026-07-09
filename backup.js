/* ─── backup.js — Script de backup completo do ControleGeral ───────────────────
   Uso:
     1. Cole no console do navegador (enquanto logado como admin)
     2. Ou acrescente ao app como botão em ConfigPage

   Faz backup de:
     - Todos os proc_* (processos)
     - Todos os hist_* (histórico)
     - cgel_historico (tabela indexada)
     - cgel_auditoria (log de auditoria)
     - Tabela de config (users, orgaos_config, app_config)
     - Lixeira (trash_proc_*)

   Output: download de JSON com timestamp + dados completos
   ─────────────────────────────────────────────────────────────────────────── */

async function fazerBackupCompleto() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backup = {
    geradoEm: timestamp,
    app: "ControleGeral",
    versao: window.APP_VERSION || "5.1.5",
    dados: {}
  };

  const statusEl = document.createElement("div");
  Object.assign(statusEl.style, {
    position: "fixed", bottom: "20px", right: "20px", zIndex: 99999,
    background: "#003d00", color: "#fff", padding: "16px 24px",
    borderRadius: "12px", fontFamily: "monospace", fontSize: "13px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)", maxWidth: "340px",
    lineHeight: "1.6"
  });
  document.body.appendChild(statusEl);
  function log(msg) {
    statusEl.innerHTML += msg + "<br>";
    statusEl.scrollTop = statusEl.scrollHeight;
  }
  function done(ok, msg) {
    log(`<span style="color:${ok ? "#4ade80" : "#fca5a5"}">${msg}</span>`);
  }

  try {
    // 1. Processos individuais
    log("1. Exportando processos (proc_*)...");
    const procs = await ST.list("proc_");
    backup.dados.processos = procs.map(r => ({ key: r.key, value: r.value }));
    done(true, `${procs.length} processos salvos`);

    // 2. Histórico individual
    log("2. Exportando histórico (hist_*)...");
    const hists = await ST.list("hist_");
    backup.dados.historico = hists.map(r => ({ key: r.key, value: r.value }));
    done(true, `${hists.length} registros de histórico`);

    // 3. Tabela indexada cgel_historico
    log("3. Exportando cgel_historico...");
    const tableHist = await ST.listHistorico();
    backup.dados.cgel_historico = tableHist;
    done(true, `${tableHist.length} registros na tabela indexada`);

    // 4. Lixeira
    log("4. Exportando lixeira...");
    const trash = await ST.listTrash();
    backup.dados.lixeira = trash;
    done(true, `${trash.length} itens na lixeira`);

    // 5. Configurações
    log("5. Exportando configurações...");
    const [users, orgaos, appConfig, seq] = await Promise.all([
      ST.get("users"), ST.get("orgaos_config"), ST.get("app_config"), ST.get("processo_seq")
    ]);
    backup.dados.users = users;
    backup.dados.orgaos_config = orgaos;
    backup.dados.app_config = appConfig;
    backup.dados.processo_seq = seq;
    done(true, "Configurações salvas");

    // 6. Metadados
    backup.dados._meta = {
      totalProcessos: procs.length,
      totalHistorico: hists.length,
      totalTableHist: tableHist.length,
      totalLixeira: trash.length,
      supabaseUrl: window.SUPABASE_URL || "",
      sbLive: window._sbLive || false,
      exportedAt: new Date().toISOString()
    };

    // Download
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ControleGeral_BACKUP_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);

    log("<br><b style='color:#4ade80'>Backup concluído! Download iniciado.</b>");
    setTimeout(() => document.body.removeChild(statusEl), 5000);
    return backup;

  } catch (err) {
    done(false, "Erro: " + err.message);
    console.error("[backup]", err);
    return null;
  }
}

/* ─── Restauração de backup ────────────────────────────────────────────────────
   Uso: cole no console do navegador, selecione o arquivo .json do backup
   ATENÇÃO: isso sobrescreve os dados existentes. Use com cautela.
   ─────────────────────────────────────────────────────────────────────────── */
async function restaurarBackup(arquivoJson) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!backup.dados) throw new Error("Formato de backup inválido");

        const d = backup.dados;
        const total =
          (d.processos?.length || 0) +
          (d.historico?.length || 0) +
          (d.cgel_historico?.length || 0);

        if (!confirm(`Restaurar backup de ${backup.geradoEm}?\n` +
            `${total} registros serão importados.\n` +
            `Processos existentes com o mesmo número SERÃO sobrescritos.`)) {
          resolve(null);
          return;
        }

        let imported = 0;
        // Restaurar processos
        if (d.processos) {
          for (const p of d.processos) {
            await ST.set(p.key, p.value);
            imported++;
          }
        }
        // Restaurar histórico
        if (d.historico) {
          for (const h of d.historico) {
            await ST.set(h.key, h.value);
            imported++;
          }
        }
        // Restaurar config
        if (d.users) await ST.set("users", d.users);
        if (d.orgaos_config) await ST.set("orgaos_config", d.orgaos_config);
        if (d.app_config) await ST.set("app_config", d.app_config);
        if (typeof d.processo_seq === "number") await ST.set("processo_seq", d.processo_seq);

        alert(`Restaurado: ${imported} registros de ${d.processos?.length || 0} processos e ${d.historico?.length || 0} históricos.`);
        resolve({ imported, backup });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsText(arquivoJson);
  });
}

/* ─── Agendar backup semanal (via Vercel Cron) ──────────────────────────────
   Para ativar no Vercel, adicione ao vercel.json:
   {
     "crons": [{
       "path": "/api/backup",
       "schedule": "0 3 * * 1"
     }]
   }
   O endpoint /api/backup.js será criado separadamente no diretório /api/
   ─────────────────────────────────────────────────────────────────────────── */

window.fazerBackupCompleto = fazerBackupCompleto;
window.restaurarBackup = restaurarBackup;
console.info("[backup] Scripts carregados. Digite: fazerBackupCompleto()");
