# AURON — CHECKLIST DE QA COM ALUNO TESTE
## Validação funcional antes da próxima fase de refatoração

> Objetivo: testar o fluxo real Coach → Aluno depois das fases 01 a 04, garantindo que a refatoração visual não quebrou autenticação, permissões, fichas, vídeos, execução de treino, métricas e vínculo entre coach e aluno.

---

## 1. Criar aluno teste pelo painel do coach

### Testar
- Acessar `/admin/atletas` ou tela equivalente.
- Clicar em `Adicionar Aluno`.
- Preencher dados básicos.
- Criar aluno com e-mail real de teste.
- Confirmar se o aluno aparece na Base de Atletas.
- Confirmar se o aluno entra como ativo, pendente ou status correto.

### Validar
- O aluno aparece na tabela/lista.
- O card de métricas de alunos atualiza.
- O perfil do aluno abre corretamente.
- O aluno está vinculado ao coach correto.

### Possíveis problemas
- aluno criado mas não aparece;
- aluno aparece sem coach_id;
- status errado;
- erro de RLS/Supabase;
- e-mail duplicado;
- perfil não abre.

---

## 2. Login do aluno

### Testar
- Sair da conta do coach.
- Entrar com a conta do aluno teste.
- Confirmar se o aluno cai na área correta do app, e não no admin.
- Verificar se o layout mobile/aluno carrega corretamente.

### Validar
- aluno não acessa `/admin`;
- aluno acessa somente área de aluno;
- nome do aluno aparece certo;
- navegação inferior funciona;
- não há erro de permissão.

### Possíveis problemas
- aluno caindo no painel admin;
- redirect errado;
- sessão não reconhecida;
- tela em branco;
- dados do coach aparecendo para aluno.

---

## 3. Criar ficha digital para o aluno

### Testar
- Logar como coach.
- Ir em `Gestão de Treinos`.
- Criar nova ficha digital.
- Selecionar o aluno teste.
- Adicionar pelo menos 2 exercícios.
- Preencher:
  - séries;
  - repetições;
  - descanso;
  - carga inicial, se existir;
  - técnica extra, se existir;
  - link de vídeo do YouTube, se existir.
- Publicar ficha.

### Validar
- ficha aparece em `Fichas recentes`;
- ficha aparece no perfil do aluno;
- aluno deixa de aparecer em “Alunos sem ficha ativa”;
- status da ficha está correto;
- dados persistem após atualizar a página.

### Possíveis problemas
- ficha salva sem exercícios;
- ficha salva mas não aparece para aluno;
- aluno continua como “sem ficha ativa”;
- técnica/carga/descanso não persistem;
- erro ao publicar.

---

## 4. Visualizar ficha pelo aluno

### Testar
- Logar como aluno.
- Acessar `Treinos`.
- Abrir a ficha criada.
- Conferir todos os exercícios.

### Validar
- nome da ficha correto;
- exercícios corretos;
- séries/reps/carga corretas;
- descanso correto;
- técnicas extras aparecem bem;
- vídeo/GIF abre quando houver link;
- botão de iniciar treino funciona.

### Possíveis problemas
- ficha não aparece;
- exercício aparece sem nome;
- vídeo não carrega;
- reps/carga erradas;
- layout quebrado no mobile.

---

## 5. Executar treino como aluno

### Testar
- Iniciar treino.
- Executar primeira série.
- Ajustar carga.
- Concluir série.
- Ver cronômetro de descanso.
- Pular descanso.
- Concluir todas as séries.
- Passar para o próximo exercício.
- Finalizar treino.

### Validar
- série concluída fica marcada;
- carga registrada corretamente;
- reps registradas corretamente;
- cronômetro funciona;
- descanso respeita tempo configurado;
- treino finalizado gera histórico;
- volume calculado corretamente.

### Possíveis problemas
- botão concluir não responde;
- carga não atualiza;
- série duplica;
- cronômetro trava;
- treino não finaliza;
- histórico não registra.

---

## 6. Conferir dados no painel do coach

### Testar
Depois do aluno finalizar o treino:
- voltar ao painel do coach;
- abrir Dashboard;
- abrir Perfil do aluno;
- abrir Gestão de Treinos;
- abrir Relatórios, se aplicável.

### Validar
- última atividade do aluno atualiza;
- execução aparece no histórico;
- métricas de volume mudam;
- dashboard reconhece treino concluído;
- aluno não aparece como inativo;
- adesão/execuções 30d atualizam, se implementado.

### Possíveis problemas
- treino concluído não aparece para o coach;
- volume não soma;
- dashboard fica zerada;
- última atividade não muda;
- execução salva no aluno errado.

---

## 7. Testar PDF de treino

### Testar
- Como coach, subir um PDF para o aluno teste.
- Ver se o PDF aparece na tela de treinos do aluno.
- Abrir/baixar o PDF.

### Validar
- upload funciona;
- arquivo fica vinculado ao aluno correto;
- aluno consegue visualizar;
- coach consegue ver que o PDF foi enviado.

### Possíveis problemas
- erro de storage;
- PDF salvo sem aluno;
- link quebrado;
- aluno não tem permissão para abrir.

---

## 8. Testar nutrição

### Testar
- Como coach, enviar plano alimentar em PDF.
- Como aluno, acessar Nutrição.
- Ver o plano enviado.

### Validar
- plano aparece para o aluno;
- descrição aparece corretamente;
- PDF abre;
- histórico do coach atualiza.

### Possíveis problemas
- upload não funciona;
- aluno não visualiza;
- plano some após refresh;
- permissão negada no arquivo.

---

## 9. Testar medidas do aluno

### Testar
- Como aluno, registrar nova medida.
- Preencher peso, cintura, braço, coxa etc.
- Salvar.
- Voltar ao perfil/evolução.

### Validar
- medida salva;
- última medida atualiza;
- comparação aparece corretamente;
- coach consegue ver no perfil do aluno.

### Possíveis problemas
- valor decimal quebra;
- unidade errada;
- medida não aparece para coach;
- gráfico/lista não atualiza.

---

## 10. Testar fotos do aluno

### Testar
- Como aluno, enviar fotos frente/lado/costas.
- Como coach, abrir perfil do aluno e checar fotos.

### Validar
- upload funciona;
- fotos ficam privadas;
- coach correto consegue ver;
- aluno correto consegue ver;
- layout não quebra.

### Possíveis problemas
- erro no Supabase Storage;
- fotos públicas indevidas;
- upload pesado;
- foto não aparece para coach.

---

## 11. Testar permissões críticas

### Testar manualmente
- aluno tentando acessar rota `/admin`;
- coach tentando acessar aluno de outro coach, se possível;
- usuário deslogado acessando rota protegida;
- refresh em página protegida.

### Validar
- redirects corretos;
- sem vazamento de dados;
- sem tela branca;
- sem dados de outro usuário.

---

## 12. Relatório final do teste

Preencher depois dos testes:

```txt
Aluno teste:
E-mail:
Coach usado:
Data do teste:

Funcionou:
- 

Quebrou:
- 

Rotas com problema:
- 

Erros no console:
- 

Erros no terminal:
- 

Prioridade de correção:
1.
2.
3.
```

---

## Próximo passo após QA

Se o fluxo Coach → Aluno estiver funcionando, seguir para:

### Fase 05
Área do Aluno:
- Home do aluno
- Meus Treinos
- Detalhe da ficha
- Execução de treino
- Descanso
- Histórico de carga
- Métricas corporais
- Fotos
- Nutrição

Se houver bugs críticos antes disso, corrigir primeiro.
