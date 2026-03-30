-- ═══════════════════════════════════════════════════════════════════════════
-- ControleGeral v4.0 — Script SQL Supabase
-- Execute no SQL Editor do Supabase: Project → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PASSO 1: Tabela principal de chave/valor (já existe na v3.x) ─────────────
-- Apenas garante que existe com a estrutura correta
CREATE TABLE IF NOT EXISTS cgel_store (
  chave         TEXT PRIMARY KEY,
  valor         TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PASSO 2: Tabela separada para Histórico (NOVO em v4.0) ───────────────────
-- Permite filtrar, paginar e indexar no servidor sem retornar tudo
CREATE TABLE IF NOT EXISTS cgel_historico (
  id              BIGSERIAL PRIMARY KEY,
  num_processo    TEXT NOT NULL,
  orgao           TEXT,
  fornecedor      TEXT,
  cnpj            TEXT,
  valor           TEXT,
  tipo_key        TEXT,
  decisao         TEXT,
  status          TEXT DEFAULT 'analise',
  usuario         TEXT,
  registrado_em   TIMESTAMPTZ DEFAULT NOW(),
  dados           JSONB NOT NULL  -- objeto completo do histórico
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_hist_num      ON cgel_historico(num_processo);
CREATE INDEX IF NOT EXISTS idx_hist_orgao    ON cgel_historico(orgao);
CREATE INDEX IF NOT EXISTS idx_hist_decisao  ON cgel_historico(decisao);
CREATE INDEX IF NOT EXISTS idx_hist_data     ON cgel_historico(registrado_em DESC);
CREATE INDEX IF NOT EXISTS idx_hist_usuario  ON cgel_historico(usuario);

-- ─── PASSO 3: Tabela de Log de Auditoria (NOVO em v4.0) ──────────────────────
CREATE TABLE IF NOT EXISTS cgel_auditoria (
  id          BIGSERIAL PRIMARY KEY,
  num_proc    TEXT,
  acao        TEXT NOT NULL,  -- 'criar', 'editar', 'excluir'
  usuario     TEXT,
  ts          TIMESTAMPTZ DEFAULT NOW(),
  campos      JSONB         -- { campo, valor_anterior, valor_novo }
);

CREATE INDEX IF NOT EXISTS idx_audit_proc ON cgel_auditoria(num_proc);
CREATE INDEX IF NOT EXISTS idx_audit_ts   ON cgel_auditoria(ts DESC);

-- ─── PASSO 4: Row Level Security ──────────────────────────────────────────────

-- cgel_store
ALTER TABLE cgel_store ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acesso_publico"  ON cgel_store;
DROP POLICY IF EXISTS "leitura_publica" ON cgel_store;
DROP POLICY IF EXISTS "escrita_com_token" ON cgel_store;
DROP POLICY IF EXISTS "update_com_token"  ON cgel_store;
DROP POLICY IF EXISTS "delete_com_token"  ON cgel_store;
CREATE POLICY "leitura_publica"   ON cgel_store FOR SELECT USING (true);
CREATE POLICY "escrita_livre"     ON cgel_store FOR INSERT WITH CHECK (true);
CREATE POLICY "update_livre"      ON cgel_store FOR UPDATE USING (true);
CREATE POLICY "delete_livre"      ON cgel_store FOR DELETE USING (true);

-- cgel_historico
ALTER TABLE cgel_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hist_leitura"  ON cgel_historico FOR SELECT USING (true);
CREATE POLICY "hist_escrita"  ON cgel_historico FOR INSERT WITH CHECK (true);
CREATE POLICY "hist_update"   ON cgel_historico FOR UPDATE USING (true);
CREATE POLICY "hist_delete"   ON cgel_historico FOR DELETE USING (true);

-- cgel_auditoria
ALTER TABLE cgel_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_leitura" ON cgel_auditoria FOR SELECT USING (true);
CREATE POLICY "audit_escrita" ON cgel_auditoria FOR INSERT WITH CHECK (true);

-- ─── PASSO 5: Versão global para ETag polling ─────────────────────────────────
-- Esta linha insere o registro de versão se não existir
INSERT INTO cgel_store (chave, valor)
VALUES ('_versao_banco', '0')
ON CONFLICT (chave) DO NOTHING;

-- ─── PASSO 6: Migrar histórico existente da cgel_store para cgel_historico ────
-- Execute este bloco DEPOIS de fazer o deploy da v4.0
-- Ele lê todas as chaves hist_* e insere na nova tabela

DO $$
DECLARE
  rec RECORD;
  obj JSONB;
BEGIN
  FOR rec IN
    SELECT chave, valor FROM cgel_store WHERE chave LIKE 'hist_%'
  LOOP
    BEGIN
      obj := rec.valor::JSONB;
      INSERT INTO cgel_historico (num_processo, orgao, fornecedor, cnpj, valor, tipo_key, decisao, status, usuario, dados)
      VALUES (
        COALESCE(obj->>'Processo', obj->>'NÚMERO DO DOCUMENTO', ''),
        COALESCE(obj->>'Órgão', obj->>'ORGÃO', ''),
        COALESCE(obj->>'Fornecedor', obj->>'FORNECEDOR', ''),
        COALESCE(obj->>'CNPJ', ''),
        COALESCE(obj->>'Valor', obj->>'VALOR', ''),
        COALESCE(obj->>'TipoKey', obj->>'_tipoKey', ''),
        COALESCE(obj->>'Decisão', obj->>'_decisao', ''),
        COALESCE(obj->>'_status', 'analise'),
        COALESCE(obj->>'_usuario', ''),
        obj
      )
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao migrar %: %', rec.chave, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Migração concluída';
END;
$$;

-- ─── VERIFICAÇÃO FINAL ────────────────────────────────────────────────────────
SELECT 'cgel_store'     AS tabela, COUNT(*) AS registros FROM cgel_store
UNION ALL
SELECT 'cgel_historico' AS tabela, COUNT(*) AS registros FROM cgel_historico
UNION ALL
SELECT 'cgel_auditoria' AS tabela, COUNT(*) AS registros FROM cgel_auditoria;
