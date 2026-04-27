# ControleGeral v5.1.2
**Sistema de Controle de Processos de Pagamento**  
Prefeitura Gov. Edison Lobão / MA

---

## 📁 Estrutura de arquivos

```
/
├── index.html              ← Página principal (carrega todos os módulos)
├── app.js                  ← Componente React principal (compilado)
├── brasao.js               ← Brasão municipal (inline, carregado ANTES do app)
├── sw.js                   ← Service Worker (PWA / offline)
├── manifest.json           ← Manifesto PWA
├── vercel.json             ← Configuração de deploy (Vercel)
├── .gitignore
└── src/
    ├── constants.js        ← Constantes globais (MESES, CHK, TINFO, COL_CANON...)
    ├── helpers.js          ← Funções auxiliares (formatData, formatValor, CNPJ...)
    ├── storage.js          ← Camada de persistência (Supabase + localStorage + MEM)
    └── hooks/
        └── useLocks.js     ← Hook de bloqueio por processo (concorrência multi-usuário)
```

> ⚠️ **IMPORTANTE**: Os arquivos em `src/` são carregados via `<script src="...">` no `index.html`.  
> Todos devem estar presentes no repositório para o app funcionar.

---

## 🗄️ Configuração do Banco de Dados (Supabase)

Execute o arquivo `supabase_setup.sql` **uma única vez** no seu projeto Supabase:

1. Acesse [supabase.com](https://supabase.com) → seu projeto
2. Vá em **SQL Editor → New query**
3. Cole o conteúdo de `supabase_setup.sql` e clique em **Run**

O script cria automaticamente:
- `cgel_store` — tabela principal chave/valor
- `cgel_historico` — histórico indexado de processos
- `cgel_auditoria` — log de auditoria
- Políticas de acesso (RLS) compatíveis com chave anon
- Migração automática de dados existentes (se houver)

> ⚠️ As credenciais `SUPABASE_URL` e `SUPABASE_ANON_KEY` ficam em `src/storage.js`.  
> **Nunca suba chaves secretas** — a chave `anon` (pública) é segura para commit.

---

## 🚀 Deploy no Vercel

1. Faça fork ou push deste repositório para o GitHub
2. Conecte ao [Vercel](https://vercel.com) e importe o repositório
3. Configurações de build:
   - **Build Command**: *(deixar vazio)*
   - **Output Directory**: `.` (ponto — raiz do projeto)
4. Clique em **Deploy**

---

## 🔧 Desenvolvimento local

```bash
python3 serve_nocache.py
# Acesse: http://localhost:3000
```

O servidor `serve_nocache.py` garante que o browser não use cache durante o desenvolvimento.

---

## 🛠️ Tecnologias

- **React 18** (via CDN — sem build step)
- **Supabase** — banco de dados em nuvem + realtime
- **SheetJS** — importação/exportação de Excel
- **jsPDF** — geração de PDF
- **docx.js** — geração de documentos Word
- **PWA** com Service Worker

---

## 📝 Changelog

### v5.1.2
- Modularização: `constants.js`, `helpers.js`, `storage.js` e `useLocks.js` separados em `src/`
- Fix Service Worker: limpeza agressiva de registros antigos para evitar `TypeError: Failed to convert value to 'Response'`
- Sync Lock: gravação atômica por processo (`proc_NUM`) elimina race condition
- Polling 20s + `visibilitychange` para reconexão automática
