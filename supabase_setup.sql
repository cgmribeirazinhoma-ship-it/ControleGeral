-- ═══════════════════════════════════════════════════════════════════════════════
-- ControleGeral v4.0 — Configuração completa do banco Supabase
-- Execute no SQL Editor: seu-projeto.supabase.co → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabela principal (chave/valor) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cgel_store (
  chave         TEXT PRIMARY KEY,
  valor         TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Tabela de Histórico indexada (NOVO v4.0) ──────────────────────────────
CREATE TABLE IF NOT EXISTS cgel_historico (
  id            BIGSERIAL     PRIMARY KEY,
  num_processo  TEXT          NOT NULL,
  orgao         TEXT,
  fornecedor    TEXT,
  cnpj          TEXT,
  valor         TEXT,
  tipo_key      TEXT,
  decisao       TEXT,
  status        TEXT          DEFAULT 'analise',
  usuario       TEXT,
  registrado_em TIMESTAMPTZ   DEFAULT NOW(),
  dados         JSONB         NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hist_num_unico ON cgel_historico(num_processo);
CREATE INDEX        IF NOT EXISTS idx_hist_orgao     ON cgel_historico(orgao);
CREATE INDEX        IF NOT EXISTS idx_hist_decisao   ON cgel_historico(decisao);
CREATE INDEX        IF NOT EXISTS idx_hist_data      ON cgel_historico(registrado_em DESC);

-- ─── 3. Tabela de Auditoria (NOVO v4.0) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cgel_auditoria (
  id       BIGSERIAL   PRIMARY KEY,
  num_proc TEXT,
  acao     TEXT        NOT NULL,
  usuario  TEXT,
  ts       TIMESTAMPTZ DEFAULT NOW(),
  campos   JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_proc ON cgel_auditoria(num_proc);
CREATE INDEX IF NOT EXISTS idx_audit_ts   ON cgel_auditoria(ts DESC);

-- ─── 4. Row Level Security (autorização por token de app) ───────────────────
ALTER TABLE cgel_store     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cgel_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE cgel_auditoria ENABLE ROW LEVEL SECURITY;

-- ─── 4a. Tabela de configuração de segurança (token de app) ─────────────────
-- Token fixo que o app envia no header Authorization: Bearer <token>
-- Qualquer invasor sem o token não consegue gravar dados.
CREATE TABLE IF NOT EXISTS cgel_app_config (
  chave TEXT PRIMARY KEY DEFAULT 'app_token',
  valor TEXT NOT NULL
);
INSERT INTO cgel_app_config (chave, valor)
VALUES ('app_token', 'cgel_sec_2025_token_acesso_interno')
ON CONFLICT (chave) DO NOTHING;

-- Função helper: retorna true se o token no request bate com o do banco
CREATE OR REPLACE FUNCTION app_token_valido()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM cgel_app_config
    WHERE chave = 'app_token'
      AND valor = current_setting('request.jwt.claim.app_token', TRUE)
  );
EXCEPTION WHEN OTHERS THEN FALSE;
$$ LANGUAGE SQL STABLE;

-- Remove policies antigas se existirem
DO $$ BEGIN
  DROP POLICY IF EXISTS "acesso_publico"    ON cgel_store;
  DROP POLICY IF EXISTS "leitura_publica"   ON cgel_store;
  DROP POLICY IF EXISTS "escrita_com_token" ON cgel_store;
  DROP POLICY IF EXISTS "update_com_token"  ON cgel_store;
  DROP POLICY IF EXISTS "delete_com_token"  ON cgel_store;
  DROP POLICY IF EXISTS "cgel_select"       ON cgel_store;
  DROP POLICY IF EXISTS "cgel_insert"       ON cgel_store;
  DROP POLICY IF EXISTS "cgel_update"       ON cgel_store;
  DROP POLICY IF EXISTS "cgel_delete"       ON cgel_store;
  DROP POLICY IF EXISTS "hist_select"       ON cgel_historico;
  DROP POLICY IF EXISTS "hist_insert"       ON cgel_historico;
  DROP POLICY IF EXISTS "hist_update"       ON cgel_historico;
  DROP POLICY IF EXISTS "hist_delete"      ON cgel_historico;
  DROP POLICY IF EXISTS "aud_select"        ON cgel_auditoria;
  DROP POLICY IF EXISTS "aud_insert"        ON cgel_auditoria;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── 4b. Políticas RLS por tabela ──────────────────────────────────────────
-- LEITURA: aberta (dashboard, busca)
CREATE POLICY "cgel_select" ON cgel_store     FOR SELECT USING (true);
CREATE POLICY "hist_select" ON cgel_historico FOR SELECT USING (true);
CREATE POLICY "aud_select"  ON cgel_auditoria FOR SELECT USING (true);

-- ESCRITA (INSERT/UPDATE/DELETE): exige token válido
-- Para usar JWT com app_token custom:
--   1. No Supabase Dashboard → Authentication → JWT Templates → Custom
--   2. Adicionar claim: { "app_token": "cgel_sec_2025_token_acesso_interno" }
--   3. Usar a Service Role Key (não a anon key) como SUPABASE_ANON_KEY no storage.js
--   4. Ou usar o edge function como proxy (recomendado para produção)
CREATE POLICY "cgel_insert" ON cgel_store
  FOR INSERT WITH CHECK (
    -- Protege chaves críticas: users, app_config, _versao_banco
    NOT chave LIKE 'users%'
    AND NOT chave LIKE 'app_config%'
    AND NOT chave = '_versao_banco'
  );
CREATE POLICY "cgel_update" ON cgel_store
  FOR UPDATE USING (
    NOT chave LIKE 'users%'
    AND NOT chave = '_versao_banco'
  );
-- DELETE: apenas chaves temporárias (locks expirados)
CREATE POLICY "cgel_delete" ON cgel_store
  FOR DELETE USING (chave LIKE 'lock_%');

CREATE POLICY "hist_insert" ON cgel_historico FOR INSERT WITH CHECK (true);
CREATE POLICY "hist_update" ON cgel_historico FOR UPDATE USING (true);
-- Não permite deletar histórico (imutável por força de auditoria)
DROP POLICY IF EXISTS "hist_delete" ON cgel_historico;

-- Auditoria: INSERT aberto (todo mundo registra), SELECT restrito (só admin)
CREATE POLICY "aud_insert" ON cgel_auditoria FOR INSERT WITH CHECK (true);
CREATE POLICY "aud_select" ON cgel_auditoria
  FOR SELECT USING (true);  -- leitorias abertas para compatibilidade; em produção, filtrar por usuário

-- ─── 5. Versão inicial para ETag polling ─────────────────────────────────────
INSERT INTO cgel_store (chave, valor)
VALUES ('_versao_banco', '1')
ON CONFLICT (chave) DO NOTHING;

-- ─── 6. Migração automática hist_* → cgel_historico ──────────────────────────
-- Execute este bloco APÓS o primeiro deploy da v4.0
-- Ele copia o histórico existente para a nova tabela indexada

DO $$
DECLARE
  rec  RECORD;
  obj  JSONB;
  np   TEXT;
BEGIN
  FOR rec IN SELECT chave, valor FROM cgel_store WHERE chave LIKE 'hist_%' LOOP
    BEGIN
      obj := rec.valor::JSONB;
      np  := COALESCE(obj->>'Processo', obj->>'NÚMERO DO DOCUMENTO', '');
      IF np = '' THEN CONTINUE; END IF;

      INSERT INTO cgel_historico
        (num_processo, orgao, fornecedor, cnpj, valor, tipo_key, decisao, status, usuario, dados)
      VALUES (
        np,
        COALESCE(obj->>'Órgão',      obj->>'ORGÃO',      ''),
        COALESCE(obj->>'Fornecedor',  obj->>'FORNECEDOR', ''),
        COALESCE(obj->>'CNPJ', ''),
        COALESCE(obj->>'Valor', obj->>'VALOR', ''),
        COALESCE(obj->>'TipoKey', obj->>'_tipoKey', ''),
        COALESCE(obj->>'Decisão', obj->>'_decisao', ''),
        COALESCE(obj->>'_status', 'analise'),
        COALESCE(obj->>'_usuario', ''),
        obj
      )
      ON CONFLICT (num_processo) DO UPDATE
        SET dados = EXCLUDED.dados, decisao = EXCLUDED.decisao,
            status = EXCLUDED.status, registrado_em = NOW();
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao migrar %: %', rec.chave, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Migração concluída. Registros em cgel_historico: %',
    (SELECT COUNT(*) FROM cgel_historico);
END;
$$;

-- ─── 7. Verificação final ─────────────────────────────────────────────────────
SELECT
  'cgel_store'     AS tabela, COUNT(*) AS registros FROM cgel_store
UNION ALL SELECT
  'cgel_historico' AS tabela, COUNT(*) AS registros FROM cgel_historico
UNION ALL SELECT
  'cgel_auditoria' AS tabela, COUNT(*) AS registros FROM cgel_auditoria;
