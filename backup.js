// ─── Backup automático semanal ───────────────────────────────────────────────
import { ST } from './storage.js';

export async function verificarEFazerBackup(processos, historico) {
  try {
    const hoje = new Date();
    const ehSegunda = hoje.getDay() === 1;
    if (!ehSegunda) return;
    const chaveBackup = `backup_${hoje.toISOString().slice(0,10)}`;
    const jaFez = await ST.get(chaveBackup);
    if (jaFez) return;
    const snapshot = { processos, historico, ts: hoje.toISOString(), v: "4.0" };
    await ST.set(chaveBackup, snapshot);
    const backups = await ST.list("backup_");
    if (backups.length > 4) {
      backups.sort((a,b) => a.key.localeCompare(b.key));
      await ST.del(backups[0].key);
    }
    console.info("[Backup] Snapshot semanal salvo:", chaveBackup);
  } catch (e) { console.warn("[Backup] Falhou:", e.message); }
}
