# STK Render AI

Plataforma de analise tecnica de projetos estruturais metalicos e de concreto com IA.

**Stack:** Next.js 15 + TypeScript + Tailwind CSS + Supabase + Claude Sonnet

---

## Guia completo de deploy — do zero ao ar

### PRE-REQUISITOS

Instale antes de comecar:

- **Node.js 18+** — [nodejs.org](https://nodejs.org) (baixe a versao LTS)
- **Git** — [git-scm.com](https://git-scm.com/downloads)
- **VS Code** (recomendado) — [code.visualstudio.com](https://code.visualstudio.com)

Contas necessarias (todas gratuitas):

- [github.com](https://github.com)
- [supabase.com](https://supabase.com)
- [console.anthropic.com](https://console.anthropic.com)
- [vercel.com](https://vercel.com)

---

### PASSO 1 — Extrair o projeto

Baixe o arquivo `stk-render-ai-mvp-final.tar.gz` e extraia.

**Mac/Linux:**
```bash
tar -xzf stk-render-ai-mvp-final.tar.gz
cd stk-render-ai
```

**Windows:** clique com botao direito no arquivo > "Extrair aqui"
Depois abra o terminal (PowerShell) dentro da pasta extraida.

---

### PASSO 2 — Instalar dependencias

Dentro da pasta `stk-render-ai`, rode:

```bash
npm install
```

Aguarde terminar (pode demorar 1-2 minutos na primeira vez).

---

### PASSO 3 — Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New project**
3. Preencha nome, senha do banco, escolha a regiao mais proxima
4. Aguarde o projeto ser criado (cerca de 1 minuto)
5. Acesse **Project Settings → API** e anote:
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon public** key (chave longa comecando com `eyJ`)
   - **service_role** key (outra chave longa — mantenha em segredo)

---

### PASSO 4 — Criar o banco de dados

No painel do Supabase, acesse **SQL Editor** (menu lateral).

Faca isso 3 vezes, uma para cada arquivo:

**4a.** Abra `supabase/migrations/0001_initial_schema.sql` no VS Code,
selecione tudo (Ctrl+A), copie (Ctrl+C), cole no SQL Editor, clique **Run**.

**4b.** Repita com `supabase/migrations/0002_storage_buckets.sql`

**4c.** Repita com `supabase/seed/seed.sql`

Cada execucao deve mostrar "Success. No rows returned".

---

### PASSO 5 — Configurar autenticacao no Supabase

No painel do Supabase, acesse **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** adicione `http://localhost:3000/auth/callback`

Clique em Save.

> Login com Google e opcional. Para habilitar depois, acesse
> Authentication → Providers → Google e siga as instrucoes.

---

### PASSO 6 — Obter API key da Anthropic

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Crie uma conta (requer cartao de credito para uso real)
3. Acesse **API Keys → Create Key**
4. Copie a chave (comeca com `sk-ant-`)

> Custo estimado por analise: ~$0.01 a $0.03 dependendo do tamanho da imagem.

---

### PASSO 7 — Configurar variaveis de ambiente (local)

Na pasta `stk-render-ai`, copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Abra `.env.local` no VS Code e preencha com os valores coletados:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJSUA_ANON_KEY_AQUI
SUPABASE_SERVICE_ROLE_KEY=eyJSUA_SERVICE_ROLE_KEY_AQUI
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-SUA_KEY_AQUI
ANALYSIS_PROVIDER_KEY=claude-sonnet
```

Salve o arquivo.

---

### PASSO 8 — Testar localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

Fluxo de teste:
1. Clique em "Criar conta" e registre um email
2. Confirme o email na sua caixa de entrada
3. Faca login
4. Clique em "Novo Projeto"
5. Envie uma foto de projeto estrutural (JPG ou PDF)
6. Aguarde 20-40 segundos — a analise aparece automaticamente
7. Revise o relatorio e clique "Aprovar"
8. Veja o Prompt Builder gerado

---

### PASSO 9 — Publicar no GitHub

Ainda dentro da pasta `stk-render-ai`:

```bash
git init
git add .
git commit -m "feat: STK Render AI MVP"
```

Acesse [github.com](https://github.com):
1. Clique em **+** (canto superior direito) → **New repository**
2. Nome: `stk-render-ai`
3. Visibilidade: **Private** (recomendado)
4. Nao marque nenhuma opcao extra
5. Clique em **Create repository**
6. Copie a URL do repositorio (ex: `https://github.com/seu-usuario/stk-render-ai.git`)

De volta ao terminal:

```bash
git remote add origin https://github.com/SEU_USUARIO/stk-render-ai.git
git branch -M main
git push -u origin main
```

Va pedir usuario e senha do GitHub.
Para senha, use um **Personal Access Token**:
GitHub → Settings → Developer settings → Personal access tokens → Generate new token
(marque a permissao `repo`)

---

### PASSO 10 — Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e crie conta (pode entrar com o GitHub)
2. Clique em **Add New Project**
3. Clique em **Import** ao lado do repositorio `stk-render-ai`
4. Na tela de configuracao, **antes de clicar em Deploy**:
   - Expanda **Environment Variables**
   - Adicione as 6 variaveis (as mesmas do `.env.local`)
   - Em `NEXT_PUBLIC_SITE_URL` coloque provisoriamente `https://stk-render-ai.vercel.app`
     (ajuste depois se o nome for diferente)
5. Clique em **Deploy**
6. Aguarde 2-3 minutos

Apos o deploy, a Vercel mostra a URL final (ex: `https://stk-render-ai-xyz.vercel.app`).

---

### PASSO 11 — Ajustar URL no Supabase

Com a URL real da Vercel em maos, volte ao Supabase:

**Authentication → URL Configuration:**
- **Site URL:** `https://stk-render-ai-xyz.vercel.app`
- **Redirect URLs:** adicione `https://stk-render-ai-xyz.vercel.app/auth/callback`

Clique em Save.

Tambem atualize a variavel `NEXT_PUBLIC_SITE_URL` na Vercel:
**Vercel → Project → Settings → Environment Variables** → edite o valor.

Depois va em **Deployments → Redeploy** para aplicar.

---

### PROBLEMAS COMUNS

| Erro | Causa | Solucao |
|------|-------|---------|
| "ANTHROPIC_API_KEY nao configurada" | Variavel ausente | Adicionar no `.env.local` ou na Vercel |
| Upload falha silenciosamente | Bucket nao criado | Rodar `0002_storage_buckets.sql` novamente |
| Analise fica em "Analisando..." | Erro no pipeline | Ver logs no terminal (local) ou Vercel Functions |
| Login redireciona para erro | Redirect URL errada | Conferir URL no Supabase Auth → URL Configuration |
| "relation does not exist" | Migration nao rodou | Rodar migrations na ordem correta |
| Tela branca apos login | NEXT_PUBLIC_SITE_URL errada | Atualizar variavel e fazer redeploy |

---

### ATUALIZACOES FUTURAS

Qualquer alteracao no codigo:

```bash
git add .
git commit -m "descricao da mudanca"
git push
```

A Vercel detecta o push e faz redeploy automaticamente em 2-3 minutos.

---

### ESTRUTURA DE ARQUIVOS IMPORTANTES

```
stk-render-ai/
├── .env.example              <- modelo de variaveis (nao editar)
├── .env.local                <- suas variaveis reais (nao commitar)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql   <- rodar 1o no Supabase
│   │   └── 0002_storage_buckets.sql  <- rodar 2o
│   └── seed/
│       └── seed.sql                  <- rodar 3o
└── src/                      <- codigo da aplicacao
```
