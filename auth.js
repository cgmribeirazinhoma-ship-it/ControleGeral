// ─── Autenticação ────────────────────────────────────────────────────────────
import { ST } from './storage.js';

export const USERS_SCHEMA_V = 3;

// ─── Auth ─────────────────────────────────────────────────────────────────────
// [FIX1] Versão do schema de usuários — incrementar aqui força recriação do admin
// se o código de hash mudar entre deploys, evitando login quebrado.
const USERS_SCHEMA_V = 3;

async function hashSenha(salt, senha) {
  const e = new TextEncoder(),
    b = await crypto.subtle.digest("SHA-256", e.encode(salt + senha));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function loadUsers() {
  let u = await ST.get("users");
  // Recria admin se: não existe, ou schemaV desatualizado (hash de versão anterior)
  if (!u || u.__schemaV !== USERS_SCHEMA_V) {
    const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    const hash = await hashSenha(salt, "admin123");
    // Preserva outros usuários se existirem, apenas garante admin válido
    const admExistente = u?.admin;
    u = {
      ...(u || {}),
      admin: admExistente && u.__schemaV === USERS_SCHEMA_V ? admExistente : {
        senha: hash,
        salt,
        nome: "Administrador",
        perfil: "admin",
        ativo: true
      },
      __schemaV: USERS_SCHEMA_V
    };
    await ST.set("users", u);
  }
  return u;
}
async function checkLogin(login, senha) {
  const us = await loadUsers(),
    u = us[login];
  if (!u || !u.ativo) return null;
  return (await hashSenha(u.salt, senha)) === u.senha ? u : null;
}

