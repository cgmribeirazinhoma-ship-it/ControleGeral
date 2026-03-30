// ─── SQLite reader ────────────────────────────────────────────────────────────
async function readSqliteDB(file) {
  try {
    const SQL = await loadSqlJs();
    if (!SQL) return {
      error: "sql.js não carregou."
    };
    const buf = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buf));
    const processos = [],
      historico = [],
      orgaosConfig = {};
    try {
      const r = db.exec("SELECT * FROM processos");
      if (r[0]) {
        const {
          columns,
          values
        } = r[0];
        for (const row of values) {
          const o = {};
          columns.forEach((c, i) => {
            o[canonCol(c)] = row[i] ?? "";
          });
          processos.push(o);
        }
      }
    } catch {}
    try {
      const r = db.exec("SELECT * FROM historico");
      if (r[0]) {
        const {
          columns,
          values
        } = r[0];
        for (const row of values) {
          const o = {};
          columns.forEach((c, i) => {
            o[c] = row[i] ?? "";
          });
          historico.push(o);
        }
      }
    } catch {}
    try {
      const r = db.exec("SELECT * FROM orgaos_config");
      if (r[0]) {
        const {
          columns,
          values
        } = r[0];
        for (const row of values) {
          const o = {};
          columns.forEach((c, i) => {
            o[c] = row[i] ?? "";
          });
          if (o.orgao) orgaosConfig[o.orgao] = {
            secretario: o.secretario || "",
            ativo: o.ativo !== 0 && o.ativo !== "0"
          };
        }
      }
    } catch {}
    db.close();
    return {
      processos,
      historico,
      orgaosConfig
    };
  } catch (e) {
    return {
      error: e.message || "Erro ao ler banco."
    };
  }
}
