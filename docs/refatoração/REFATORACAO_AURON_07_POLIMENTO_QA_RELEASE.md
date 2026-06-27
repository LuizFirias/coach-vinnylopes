# REFATORAÇÃO AURON — FASE 07
## Polimento Global, Responsividade, QA Final e Preparação para Release

> Objetivo desta fase: corrigir inconsistências visuais e funcionais, padronizar a experiência inteira, testar fluxo real de ponta a ponta e deixar a AURON com aparência de produto pronto para demonstração e venda.

---

## 1. Contexto

Depois das fases 01 a 06, o app deve ter:

- identidade AURON aplicada;
- painel do coach mais robusto;
- base de atletas;
- hub de treinos;
- biblioteca global;
- construtor de ficha;
- área do aluno refatorada;
- nutrição, feedbacks, fotos, ranking e parceiros ajustados.

A Fase 07 é a fase de acabamento.

Aqui não é para sair criando novos módulos grandes. É para:
- corrigir;
- padronizar;
- limpar;
- testar;
- melhorar performance;
- deixar pronto para demo.

---

# 2. Correções visuais imediatas

## 2.1 Sidebar desktop

### Problema
Sidebar apenas com ícones pode ficar bonita, mas prejudica venda e onboarding de coaches novos.

### Solução recomendada
Criar dois estados:
- expandida por padrão no desktop;
- colapsada opcionalmente.

Estado expandido:
- logo AURON;
- nome dos itens;
- ícone;
- item ativo claro;
- área de conta no rodapé.

Estado colapsado:
- só ícones;
- tooltip no hover;
- usado quando usuário recolher manualmente.

---

## 2.2 Layout desktop

### Problema
Algumas telas ainda ficam estreitas ou com conteúdo perdido em tela grande.

### Regra global
Criar/usar `PageContainer` com:

- max-width: 1280px a 1440px;
- margin horizontal auto ou alinhamento consistente;
- padding lateral responsivo;
- grid bem distribuído.

Evitar:
- cards pequenos isolados;
- blocos centralizados sem necessidade;
- muito vazio sem propósito.

---

## 2.3 Botões destrutivos

Na Biblioteca, os cards exibem `Deletar` muito forte em todos os exercícios.

### Ajuste
- trocar botão `Deletar` por menu de ações;
- manter `Editar` como ação visível;
- colocar `Excluir` dentro de dropdown ou ícone secundário;
- evitar aparência perigosa em lista grande.

---

## 2.4 Barra horizontal de filtros

A barra branca/nativa de scroll nos filtros precisa ser removida.

### Ajuste
- usar scroll horizontal customizado ou esconder scrollbar;
- manter setas discretas se necessário;
- preservar acessibilidade;
- chips devem ficar limpos.

---

## 2.5 Tipografia

Padronizar:
- títulos com Exo 2;
- textos, tabelas e botões com Inter;
- evitar títulos em caixa alta em excesso;
- manter hierarquia clara.

---

# 3. Padronização de componentes

Revisar e consolidar:

- `PageHeader`
- `PageContainer`
- `MetricCard`
- `ActionCard`
- `DataTable`
- `StatusBadge`
- `SearchInput`
- `SegmentedControl`
- `EmptyState`
- `FileUpload`
- `Tabs`
- `Sidebar`
- `MobileTabBar`
- `Modal`
- `Drawer`
- `Button`

## Meta
Eliminar duplicação visual e garantir que as telas pareçam parte do mesmo produto.

---

# 4. Estados globais

Padronizar todos os estados:

## Loading
- skeletons em cards e tabelas;
- evitar tela branca.

## Empty state
Todo estado vazio deve ter:
- ícone;
- título humano;
- descrição útil;
- CTA quando fizer sentido.

## Error state
Todo erro deve ter:
- mensagem clara;
- ação de tentar novamente;
- log no console apenas para dev.

## Unauthorized
- redirecionamento correto;
- mensagem simples se necessário.

---

# 5. QA funcional completo

## 5.1 Autenticação
Testar:
- login coach;
- login aluno;
- logout;
- reset de senha;
- refresh em rota protegida;
- usuário deslogado tentando acessar admin;
- aluno tentando acessar admin.

## 5.2 Coach
Testar:
- dashboard;
- criar aluno;
- abrir perfil do aluno;
- criar ficha;
- enviar PDF;
- cadastrar exercício;
- enviar plano alimentar;
- abrir feedbacks;
- ver relatórios.

## 5.3 Aluno
Testar:
- login;
- home;
- abrir treino;
- iniciar treino;
- concluir série;
- descanso;
- finalizar treino;
- registrar medida;
- enviar foto;
- abrir nutrição;
- ver perfil.

## 5.4 Vínculo coach/aluno
Validar:
- coach só vê seus alunos;
- aluno só vê seus próprios dados;
- arquivos não vazam entre contas;
- ficha aparece somente para aluno vinculado.

---

# 6. QA de dados

Validar:
- aluno criado salva corretamente;
- ficha salva corretamente;
- exercícios vinculados à ficha;
- execução gera histórico;
- carga/reps salvam;
- volume calcula certo;
- dashboard atualiza;
- relatórios não quebram com zero dados;
- PDFs e fotos abrem corretamente.

---

# 7. QA visual

Testar em:

## Desktop
- 1366px
- 1440px
- 1920px

## Mobile
- 390px
- 414px
- 430px

## Tablet, se aplicável
- 768px
- 1024px

Checar:
- overflow horizontal;
- botões cortados;
- tabela quebrada;
- sidebar;
- bottom nav;
- cards com altura irregular;
- contraste;
- leitura de texto pequeno.

---

# 8. Performance

Verificar:
- páginas com muitos exercícios;
- biblioteca com busca;
- dashboard;
- perfil de aluno;
- gráficos;
- imagens/fotos;
- vídeos do YouTube.

Ajustar:
- lazy loading;
- paginação;
- filtros em memória apenas quando base pequena;
- evitar renderização pesada sem necessidade.

---

# 9. Segurança e Supabase

Revisar:
- RLS;
- queries por coach_id;
- buckets de storage;
- permissões de fotos;
- permissões de PDFs;
- service role apenas no servidor;
- nunca expor chaves sensíveis no client.

---

# 10. Preparação para demo comercial

Criar uma conta demo com dados bonitos:

## Coach demo
- nome realista;
- logo/foto;
- 8 a 15 alunos;
- alguns ativos;
- alguns em risco;
- alguns vencendo.

## Alunos demo
Criar perfis com:
- planos diferentes;
- treinos ativos;
- medidas;
- fotos fake/placeholder, se permitido;
- histórico de treino;
- feedbacks;
- dados financeiros.

## Objetivo
A demo não pode parecer vazia.

A tela vazia é boa para produto real, mas para venda é ruim.

---

# 11. Checklist final de release

Antes de publicar:

- sem erro TypeScript;
- sem erro Next build;
- sem warnings críticos;
- responsividade validada;
- RLS validada;
- login coach/aluno ok;
- fluxo de treino ok;
- upload PDF ok;
- upload foto ok;
- dados financeiros ok;
- dashboard ok;
- perfil aluno ok;
- identidade AURON consistente;
- sem referências ao Coach Vinny;
- sem dourado antigo;
- sem textos provisórios.

---

# 12. Correções de copy

Remover termos genéricos ou técnicos demais.

Trocar:

- `Atleta` por `Aluno`, se a marca quiser ser mais abrangente.
- `Protocolo` por `Ficha` ou `Plano`, quando fizer mais sentido.
- `Expedição` por `Envio`, `Gestão` ou `Prescrição`.
- `Dashboard` pode continuar no admin, mas no aluno preferir `Início`.

Sugestão:
- área do coach pode usar `Alunos`;
- área do aluno pode usar `Treinos`, `Evolução`, `Nutrição`, `Perfil`.

---

# 13. Critérios de aceitação

A fase estará correta se:

1. O app parecer uma plataforma única e consistente.
2. Desktop não parecer vazio ou estreito.
3. Mobile do aluno estiver confortável.
4. Não houver referências antigas.
5. O fluxo completo coach → aluno → execução → evolução funcionar.
6. A demo estiver pronta para apresentar a personais.
7. O produto parecer vendável, não apenas funcional.

---

# 14. Entrega esperada

Ao concluir:

- rodar build;
- rodar lint;
- testar conta coach;
- testar conta aluno;
- documentar bugs restantes;
- gerar lista final de pendências por prioridade.
