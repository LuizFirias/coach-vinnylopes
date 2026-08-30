-- Limpeza pontual da biblioteca de exercícios (rodar manualmente no SQL Editor do Supabase).
-- Os GIFs corretos já foram subidos e associados via scripts/upload-exercicios-gifs.mjs —
-- isto aqui cobre só as partes que mexem em dado existente (limpar GIF errado / excluir linha).

-- 1) GIFs marcados como "errado"/"errada" — remove o GIF/miniatura errados,
--    exercício continua existindo (só volta a mostrar o ícone genérico até
--    algum GIF certo ser associado depois).
update exercicios_biblioteca
set gif_url = null, gif_url_feminino = null, imagem_url = null, imagem_url_feminino = null
where id in (
  'ecbf2186-d146-455d-a5ec-dc40f58f9859', -- Abdução de quadril na máquina (em pé)
  '136ff0b3-a233-4160-92b7-2626f4a2d71f', -- Abdominal supra com peso
  '14a2c5ba-8c6b-4889-ac76-3276c6c5b3f6', -- Coice na polia (banco inclinado)
  '659e4c08-f775-469f-b88c-cba06f4c84bd', -- Corrida lateral
  'efa7cb44-cae8-4183-8a77-06619154b138', -- Desenvolvimento neutro sentado
  '6003acc1-72a4-4902-92cf-299f3039b129'  -- Elevação de pernas na cadeira romana
);

-- 2) Exercícios pra excluir de vez.
--    ATENÇÃO: exercicios_biblioteca não tem FK com fichas_treino/historico_treinos
--    (a ficha guarda nome+id como texto solto no JSONB configuracao). Excluir aqui
--    não quebra fichas já criadas com esses exercícios — elas continuam mostrando
--    nome/séries normalmente, só perdem o link pro GIF/grupo muscular do catálogo
--    (não afeta fichas ativas, é cosmético em fichas antigas).
delete from exercicios_biblioteca
where id in (
  'f9e73284-a255-422c-bce6-798e01ad9d43', -- Complexo de halteres (pedido explícito: "excluir exercício")
  '858e4063-97ec-40f8-8146-1f4fa79b3f22'  -- Desenvolvimento com barra no Smith (redundante com "Desenvolvimento no Smith" — GIF já copiado pra lá)
);

-- 3) "Dead bug cruzado" — NÃO incluído acima porque a instrução ("excluir", sem
--    dizer "exercício") ficou ambígua e o GIF dele já estava vazio (nada pra
--    "limpar"). Se a intenção era excluir o exercício mesmo, descomente:
-- delete from exercicios_biblioteca where id = '5554335e-8696-48c2-81c1-4c62e9023e43';
