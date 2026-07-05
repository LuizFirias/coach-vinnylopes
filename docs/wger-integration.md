# Integração wger (instância própria via Docker) — AuronFit

Documento de setup para hospedar **nossa própria instância do [wger](https://github.com/wger-project)**
(banco de exercícios + imagens + vídeos + API), sem depender da API pública em tempo de execução.

> Resumo rápido (depois que o Docker estiver instalado):
> ```powershell
> cd infra/wger
> docker compose up -d
> docker compose exec web ./manage.py setup-powersync-storage   # passo único obrigatório
> ```
> API em `http://localhost/api/v2/` · login `admin` / `adminadmin`.

---

## 0. Estado atual do setup (o que já foi feito)

| Passo | Status | Observação |
|-------|--------|-----------|
| 1. Verificar Docker / Docker Compose | ⚠️ **Bloqueado** | Docker, Docker Compose **e WSL2 não estão instalados** nesta máquina. Ver seção 1. |
| 2. Clonar repositório oficial | ✅ Feito | Clonado em `infra/wger/` (repo `wger-project/docker`). |
| 4-7. Configurar Postgres / Redis / Nginx / Django | ✅ Pré-configurado | Config oficial + `SECRET_KEY` já gerada em `infra/wger/config/prod.env`. Ver seção 4. |
| 3. Subir a stack | ⏳ Pendente | Requer Docker instalado. Comando pronto na seção 5. |
| 8. Dados iniciais (fixtures/exercícios) | ⏳ Pendente | Comandos prontos na seção 6. |
| 9. Confirmar API respondendo | ⏳ Pendente | Verificação pronta na seção 7. |
| 10. Documentar | ✅ Este arquivo | |

> `infra/wger/` está no `.gitignore` do AuronFit porque é um clone com `.git` próprio e o
> `config/prod.env` contém segredos (SECRET_KEY, senhas de banco, chaves JWT).

---

## 1. Pré-requisito bloqueante: instalar Docker no Windows

Diagnóstico executado nesta máquina:

- **Git**: instalado (2.52.0) ✅
- **Docker / Docker Compose**: **não instalados** ❌
- **WSL2**: **não instalado** ❌ (`O Subsistema do Windows para Linux não está instalado`)
- **winget**: disponível ✅

No Windows, o Docker roda sobre o **WSL2**. Instalar WSL2 + Docker Desktop exige
**privilégios de administrador**, **reinício da máquina** e **abrir o Docker Desktop uma vez
para aceitar os termos** — por isso esses passos precisam ser feitos por você.

### 1.1. Instalar o WSL2 (PowerShell **como Administrador**)

```powershell
wsl --install
```

Isso instala o WSL2 + uma distro Ubuntu padrão. **Reinicie o computador** ao terminar.

### 1.2. Instalar o Docker Desktop

Opção A — via winget (PowerShell como Administrador):

```powershell
winget install -e --id Docker.DockerDesktop
```

Opção B — baixar manualmente em https://www.docker.com/products/docker-desktop/

Depois de instalar:
1. **Reinicie** se solicitado.
2. Abra o **Docker Desktop** pelo menu Iniciar e **aceite os termos** (primeira execução).
3. Aguarde o ícone da baleia ficar “Running”. O Docker Desktop deixa `Settings → General → Use the WSL 2 based engine` ligado por padrão.

### 1.3. Validar a instalação

Feche e reabra o terminal (para recarregar o PATH) e rode:

```powershell
docker --version
docker compose version
docker info
```

Os três devem responder sem erro. Só então siga para a seção 5.

---

## 2. Arquitetura da stack

O `docker compose` sobe os seguintes serviços (rede interna `wger_network`):

| Serviço | Imagem | Função | Exposição |
|---------|--------|--------|-----------|
| `web` | `wger/server:latest` | Backend **Django + Gunicorn** (app + API REST) | interna `8000` |
| `db` | `postgres:15-alpine` | **PostgreSQL** (dados: exercícios, usuários, planos) | interna `5432` |
| `cache` | `redis` | **Redis** (cache + broker do Celery) | interna `6379` |
| `nginx` | `nginx:stable` | **Reverse proxy** + serve `/static` e `/media` | **`80` (host)** |
| `celery_worker` | `wger/server:latest` | Tarefas em background (sync de exercícios) | — |
| `celery_beat` | `wger/server:latest` | Agendador das tarefas periódicas | — |
| `powersync` | `journeyapps/powersync-service` | Sync offline do app mobile (opcional p/ AuronFit) | interna `8080` (via `/ps/`) |

Só o `nginx` publica porta no host (**80**). Todo o resto conversa pela rede interna do Docker.

---

## 3. O que foi clonado (passo 2)

```
infra/wger/
├── docker-compose.yml          # stack principal (web, nginx, celery, powersync…)
├── services/
│   ├── postgres.yaml           # definição do PostgreSQL
│   ├── redis.yaml              # definição do Redis
│   └── powersync.yaml          # definição do PowerSync
└── config/
    ├── prod.env                # variáveis de ambiente (JÁ AJUSTADO — ver seção 4)
    ├── nginx.conf              # config do reverse proxy
    └── redis.conf              # config do Redis
```

Origem: `https://github.com/wger-project/docker` (branch `master`, `--depth 1`).

---

## 4. Configuração (passos 4-7) — `infra/wger/config/prod.env`

Tudo é configurado por variáveis de ambiente em `config/prod.env`. Já ajustamos o essencial
para uso **local**; o restante já vem com defaults sensatos.

### Já ajustado
- **`SECRET_KEY`** — gerada aleatoriamente (50 chars). Não reutilize em outro ambiente.
- **`SITE_URL=http://localhost`** — URL local.

### PostgreSQL (passo 4) — `services/postgres.yaml` + `prod.env`
```
POSTGRES_USER=wger
POSTGRES_PASSWORD=wger        # troque se for expor o banco
POSTGRES_DB=wger
```
Tuning já incluído no `command` do serviço (`shared_buffers`, `work_mem`, `max_connections=30`, `wal_level=logical`).
Dados persistem no volume Docker `postgres-data`.

### Redis (passo 5) — `services/redis.yaml` + `config/redis.conf`
Usado como cache do Django (`DJANGO_CACHE_LOCATION=redis://cache:6379/1`) e broker do Celery
(`CELERY_BROKER=redis://cache:6379/2`). Não precisa de ajuste para uso local.

### Nginx (passo 6) — `config/nginx.conf`
- Faz proxy de `/` → `web:8000`.
- Serve arquivos estáticos em `/static/` e mídia (imagens/vídeos de exercícios) em `/media/`.
- `client_max_body_size 100M` (permite upload de vídeos).
- Publica na porta **80** do host (definido em `docker-compose.yml`, serviço `nginx`).

### Backend Django (passo 7) — `prod.env`
- `WGER_USE_GUNICORN=True`, `DJANGO_DEBUG=False`.
- `DJANGO_PERFORM_MIGRATIONS=True` → roda migrations no startup.
- `DJANGO_COLLECTSTATIC_ON_STARTUP=True` → coleta estáticos no startup.
- `WGER_INSTANCE=https://wger.de` → instância de origem para o sync **inicial** dos exercícios.
- `USE_CELERY=True` + `SYNC_EXERCISES_CELERY=True` → mantém os exercícios sincronizados
  semanalmente em background (uma vez populados, ficam hospedados por nós).

> **Sobre “não usar a API pública”:** em *runtime*, o AuronFit consome **apenas a nossa
> instância local**. O `wger.de` é usado só como fonte **uma única vez** para importar o banco
> de exercícios/imagens/vídeos para o nosso Postgres/volume de mídia (seção 6). Depois disso,
> tudo é servido localmente. Para desligar totalmente qualquer contato com o wger.de, basta
> setar `SYNC_EXERCISES_CELERY=False`, `SYNC_EXERCISE_IMAGES_CELERY=False`,
> `SYNC_EXERCISE_VIDEOS_CELERY=False`, `DOWNLOAD_INGREDIENTS_FROM=None` no `prod.env` após o
> import inicial.

---

## 5. Subir a stack (passo 3)

```powershell
cd infra/wger
docker compose up -d
```

Na primeira vez o Docker baixa as imagens (alguns minutos). Acompanhe com:

```powershell
docker compose ps
docker compose logs -f web
```

Aguarde o serviço `web` ficar **healthy** (o healthcheck tem `start_period` de 300s).

### Passo único obrigatório após a primeira subida
Cria o schema/role de armazenamento do PowerSync (exigido pelo stack padrão):

```powershell
docker compose exec web ./manage.py setup-powersync-storage
```

### (Recomendado) Regenerar chaves JWT
As chaves JWT do `prod.env` são as de exemplo do projeto — troque-as:

```powershell
docker compose exec web ./manage.py generate-jwt-keys
```
Copie a saída para `JWT_PUBLIC_KEY` / `JWT_PRIVATE_KEY` no `prod.env` e rode `docker compose up -d` de novo.

### Login administrador
Acesse `http://localhost` e entre com:
- **usuário:** `admin`
- **senha:** `adminadmin`

Troque a senha no primeiro login (Django admin em `http://localhost/django-admin/`).
Se por algum motivo o usuário admin não existir, crie um:
```powershell
docker compose exec web ./manage.py createsuperuser
```

### Porta 80 ocupada?
Se a porta 80 já estiver em uso (IIS, Skype, etc.), edite `infra/wger/docker-compose.yml`,
serviço `nginx`, trocando `"80:80"` por `"8080:80"`, ajuste `SITE_URL=http://localhost:8080`
em `prod.env` e rode `docker compose up -d`. A API passa a ser `http://localhost:8080/api/v2/`.

---

## 6. Carregar dados iniciais / exercícios (passo 8)

A imagem já vem com um **conjunto base de exercícios**. Para importar/atualizar o banco
completo do wger.de para a nossa instância:

```powershell
# Exercícios (categorias, equipamentos, músculos, traduções)
docker compose exec web python3 manage.py sync-exercises

# Imagens dos exercícios
docker compose exec web python3 manage.py download-exercise-images

# Vídeos dos exercícios (grande — pode demorar/pesar bastante)
docker compose exec web python3 manage.py download-exercise-videos
```

> Esses comandos **nunca sobrescrevem** exercícios que você tenha criado manualmente.

Ingredientes (opcional, ~1 GB para o dataset completo):
```powershell
# conjunto base pequeno
docker compose exec web wger load-online-fixtures

# dataset completo (instalação nova)
docker compose exec web ./manage.py sync-ingredients-bulk --set-mode insert
```

As imagens/vídeos ficam no volume `media` e são servidos por nós em `http://localhost/media/...`.

---

## 7. Confirmar que a API responde localmente (passo 9)

```powershell
# Metadados da API (deve responder JSON / 200)
curl http://localhost/api/v2/

# Lista de exercícios (com traduções e infos)
curl "http://localhost/api/v2/exercise/?language=english&limit=1"
curl "http://localhost/api/v2/exerciseinfo/?limit=1"

# Imagens e vídeos (mídia hospedada por nós)
curl "http://localhost/api/v2/exerciseimage/?limit=1"
curl "http://localhost/api/v2/video/?limit=1"
```

No navegador, a API navegável fica em `http://localhost/api/v2/`.

---

## 8. Integração com o AuronFit

- **Base da API:** `http://localhost/api/v2/` (troque host/porta conforme o deploy).
- Endpoints úteis para a biblioteca de exercícios:
  - `GET /api/v2/exercise/` — exercícios
  - `GET /api/v2/exerciseinfo/{id}/` — exercício + músculos + imagens + vídeos agregados
  - `GET /api/v2/exercisecategory/`, `/equipment/`, `/muscle/`
  - `GET /api/v2/exerciseimage/`, `GET /api/v2/video/`
- **Mídia** (imagens/vídeos): URLs retornadas apontam para `http://localhost/media/...`, servidas
  pelo nosso nginx.
- A maior parte da API de leitura de exercícios é **pública (sem auth)**. Para escrita/recursos
  de usuário, use token: `POST /api/v2/token/` (JWT) ou token via `Authorization: Token <key>`.

Existem dois scripts, para dois objetivos diferentes. Ambos leem da **nossa** instância local
do wger e precisam de `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`,
e do wger no ar (`docker compose up -d`).

Antes de qualquer um, rode `sync-exercises` / `download-exercise-images` (seção 6) para o wger
já ter os exercícios e imagens locais.

#### A) Preencher a mídia dos exercícios que JÁ temos (recomendado) — `backfill-wger-media.js`

Enriquece os exercícios existentes na `exercicios_biblioteca` com a **imagem de demonstração**
do wger (miniatura média 400×400, com fallback `small` → imagem cheia). Essa imagem é gravada em
`gif_url`, que é exatamente o campo mostrado na **ficha de treino quando aberta** (renderizado
como `<img>`). **Não apaga nem insere nada** — só faz UPDATE de mídia, e por padrão só em campos
vazios.

> A URL preenchida aqui aponta para o wger local (`http://localhost/media/...`). Para produção,
> rode depois `npm run media:supabase` (item D) para movê-la ao Supabase Storage.

```powershell
npm run media:wger                 # preenche gif_url/imagem_url vazios
node scripts/backfill-wger-media.js --dry-run    # só mostra a cobertura (matches x sem match)
node scripts/backfill-wger-media.js --overwrite  # também sobrescreve mídia já existente
```

- Casa por **nome normalizado**, testando o nome em **todos os idiomas + aliases** do wger para
  maximizar acertos. Rode com `--dry-run` primeiro para ver a cobertura: como a nossa biblioteca
  tem nomes muito específicos em PT, uma parte não terá correspondência (o script lista os que
  ficaram sem match para mapeamento manual posterior).
- **Vídeos do wger não são aplicados:** são `.mp4` locais e o campo `video_url` da ficha hoje só
  toca **YouTube** (via `YouTubePlayer`/iframe embed). O script apenas reporta quantos matches
  têm vídeo. Para usar os vídeos do wger seria preciso estender a ficha para tocar `<video>`.

#### C) Reconstruir a biblioteca a partir do wger, com segurança — `rebuild-wger-library.js`

Apaga apenas os exercícios **não referenciados** (sem histórico, logs, recordes ou uso em
fichas) e importa todos os do wger como novos. **Não quebra** fichas nem histórico existentes.

```powershell
npm run rebuild:wger                              # DRY-RUN (só mostra o que faria)
node scripts/rebuild-wger-library.js --apply      # executa: apaga não referenciados + importa
```

- Detecta referências em `historico_treinos`, `logs_treino`, `recordes_pessoais` (FKs) **e** nos
  ids embutidos em `fichas_treino.configuracao`.
- A imagem do wger (miniatura média 400×400, fallback `small` → imagem cheia) vai para `gif_url`
  (mostrada na ficha) e `imagem_url`. `video_url` fica null (adicione os links do YouTube depois).
- Rode o dry-run primeiro para conferir o que será apagado/mantido.
- Depois de importar, rode `npm run media:supabase` (item D) para publicar a mídia no Storage.

#### B) Adicionar exercícios do wger como novos (opcional) — `import-wger-exercises.js`

Insere exercícios do wger como novos registros globais na biblioteca (não mexe nos existentes).

```powershell
npm run import:wger                              # insere apenas os novos
node scripts/import-wger-exercises.js --update   # atualiza também os já importados
node scripts/import-wger-exercises.js --dry-run  # simula, sem gravar
```

- Idempotente: `slug = wger-<uuid>`, `origem = 'wger'`; reexecuções não duplicam.
- Respeita as constraints (`equipamento`, `tipo_exercicio`) e importa a **miniatura média**
  (400×400, `thumbnails.medium` com fallback `small` → imagem cheia) em `gif_url`/`imagem_url`.
- Idioma preferido por `WGER_LANGS` (padrão `pt-br,pt,en`); fonte por `WGER_API_URL`.

#### D) Publicar a mídia no Supabase Storage (obrigatório p/ produção) — `upload-wger-media-to-supabase.js`

Os scripts acima gravam `gif_url` apontando para `http://localhost/media/...`, o que só funciona
**na sua máquina**. Em produção (auronfit.com.br) o navegador do aluno **não acessa `localhost`**.
Este script copia as imagens (miniatura média) do wger local para o **bucket público
`exercicios-gifs`** do Supabase Storage e reaponta `gif_url`/`imagem_url` para a URL pública do
Storage — assim a demonstração funciona em produção **independentemente de o wger estar no ar**.

```powershell
npm run media:supabase                                   # copia + reaponta gif_url/imagem_url
node scripts/upload-wger-media-to-supabase.js --dry-run  # só mostra o que faria
node scripts/upload-wger-media-to-supabase.js --force    # reprocessa inclusive os já migrados
```

- Monta o mapa `uuid -> miniatura média` a partir de `/api/v2/exerciseinfo/` (imagem `is_main`,
  `thumbnails.medium` com fallback `small` → imagem cheia).
- Para cada exercício com `slug` começando em `wger-` (ou `gif_url` em `localhost`), baixa a
  miniatura, faz upload em `exercicios-gifs/wger/<uuid>.<ext>` (`upsert:true`, `contentType` correto)
  e atualiza `gif_url` **e** `imagem_url` para a public URL do Storage.
- **Idempotente**: reexecuções sem `--force` pulam quem já está no Storage; em lotes, com logs de
  progresso e mensagens claras se o wger não estiver no ar ou faltar env.
- Env: `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`; fonte por
  `WGER_API_URL` (padrão `http://localhost/api/v2`).
- Exemplo de `gif_url` resultante:
  `https://<project>.supabase.co/storage/v1/object/public/exercicios-gifs/wger/<uuid>.jpg`.

> Fluxo recomendado ponta a ponta: `rebuild:wger --apply` (ou `import:wger`) **e depois**
> `media:supabase`. O primeiro popula a biblioteca; o segundo tira a mídia do `localhost` e a
> coloca no Storage para produção.

### Produção (auronfit.com.br) — o que o app consome

- **Domínio oficial do app:** `https://auronfit.com.br`.
- **Mídia dos exercícios:** em produção, `gif_url`/`imagem_url` vivem no **Supabase Storage**
  (bucket `exercicios-gifs`). O app **não** depende do wger em runtime para exibir a demonstração
  — o wger local é só a fonte de import/atualização (rodado por você quando quiser atualizar).
- **API/dados:** o app lê exercícios direto do **Supabase** (`exercicios_biblioteca`), não da API
  do wger. A instância wger fica no seu ambiente de trabalho apenas para importar/atualizar dados.
- **Se um dia o wger for exposto publicamente** (ex.: para servir mídia/API remota), ajuste em
  `infra/wger/config/prod.env`:
  - `SITE_URL=https://wger.auronfit.com.br` (ou o subdomínio escolhido);
  - `CSRF_TRUSTED_ORIGINS=https://wger.auronfit.com.br,https://auronfit.com.br`;
  - e reaponte `WGER_API_URL` dos scripts para essa URL pública. Enquanto o wger ficar só local,
    nada disso é necessário.

### Demonstração na ficha (imagem/vídeo sob demanda)

A tela de execução (`app/aluno/treinos/[id]/executar/page.tsx`) foi ajustada para **não** deixar
mídia em loop enquanto a ficha está aberta:
- No lugar da imagem sempre visível, há um botão **"Ver demonstração"** que abre a mídia **sob
  demanda** (só quando o aluno precisa).
- Se o exercício tiver `video_url` (YouTube), abre no `YouTubePlayer`; senão mostra a imagem
  (`gif_url`, vinda do wger) num modal.
- Vídeos `.mp4` do wger não entram aqui de propósito — mantém-se o YouTube (leve) e os links
  são adicionados depois.

---

## 9. Respostas diretas

- **URL da API:** `http://localhost/api/v2/` (raiz do app: `http://localhost`).
- **Porta utilizada:** **80** (host) → `web:8000` interno via nginx. (Alternativa `8080` se 80 estiver ocupada — seção 5.)
- **Login administrador:** usuário `admin`, senha `adminadmin` (trocar no 1º login).
- **Reiniciar os containers:**
  ```powershell
  cd infra/wger
  docker compose restart              # reinicia todos
  docker compose restart web nginx    # reinicia serviços específicos
  # parar / subir novamente:
  docker compose down                 # para (mantém os volumes/dados)
  docker compose up -d
  ```
- **Atualizar os dados (exercícios/imagens/vídeos) futuramente:**
  ```powershell
  cd infra/wger
  docker compose exec web python3 manage.py sync-exercises
  docker compose exec web python3 manage.py download-exercise-images
  docker compose exec web python3 manage.py download-exercise-videos
  ```
  (Já roda automaticamente 1x/semana via Celery; os comandos acima forçam a atualização na hora.)
- **Atualizar a versão do wger (imagens Docker):**
  ```powershell
  cd infra/wger
  docker compose pull
  docker compose up -d
  ```

---

## 10. Reverter integração (voltar à biblioteca AuronFit original)

Use quando quiser **desfazer** a importação wger e restaurar os exercícios globais
AuronFit (`origem='auron_global'`) a partir do seed em
`docs/refatoração-exercicios/AURON_EXERCICIOS_GLOBAIS_SEED.json`.

### Script

```powershell
node scripts/revert-wger-library.js            # dry-run (mostra o que faria)
node scripts/revert-wger-library.js --apply    # remove wger + limpa Storage
node scripts/seed-auron-exercises.js           # restaura exercícios auron_global faltantes
```

O script `revert-wger-library.js`:

1. Apaga exercícios com `origem='wger'` ou `slug` começando em `wger-` que **não** estejam
   referenciados (mesma lógica de FK/fichas do `rebuild-wger-library.js`).
2. Reseta `gif_url`/`imagem_url` para `null` em exercícios **não-wger** que ainda apontem
   para `exercicios-gifs/wger/` no Storage.
3. Remove todos os arquivos em `exercicios-gifs/wger/` no Supabase Storage.

Exercícios wger **referenciados** em fichas/histórico **não são apagados** — o script lista
esses casos no log para tratamento manual.

### Reversão executada em 2026-07-05

| Métrica | Valor |
|---------|-------|
| wger removidos | 818 |
| wger bloqueados (referenciados) | 0 |
| auron_global restaurados (seed) | 381 inseridos + 16 já existentes |
| Arquivos Storage `wger/` removidos | 248 |
| Estado final | 397 exercícios, todos `origem='auron_global'`, 0 wger |

> A UI da ficha (botão "Ver demonstração") **não** foi revertida — continua funcionando
> quando `gif_url`/`video_url` estiverem preenchidos.

---

## 11. Troubleshooting rápido

- **Erros de CSRF:** defina `CSRF_TRUSTED_ORIGINS=http://localhost` em `prod.env` (local). Se um dia
  expuser o wger publicamente, use o domínio real, ex.:
  `CSRF_TRUSTED_ORIGINS=https://wger.auronfit.com.br,https://auronfit.com.br`.
- **Static files não aparecem:** `docker compose exec web python3 manage.py collectstatic --no-input`.
- **Ver logs:** `docker compose logs -f web` (ou `nginx`, `db`, `celery_worker`).
- **Resetar tudo (apaga os dados!):** `docker compose down -v`.
