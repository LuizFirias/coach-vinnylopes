-- Limpeza pontual (leva 4) — rodar manualmente no SQL Editor do Supabase.
-- Os GIFs corretos já foram subidos via scripts/upload-exercicios-gifs.mjs.

-- 1) GIF marcado como "errado" — remove o GIF/miniatura errados, o exercício continua existindo.
update exercicios_biblioteca
set gif_url = null, gif_url_feminino = null, imagem_url = null, imagem_url_feminino = null
where id = 'd70d6289-10aa-4f0c-9ad0-6c4012fd8a50'; -- Gêmeos estilo donkey na máquina

-- 2) Duplicado — "Remada unilateral com halter" é o mesmo exercício que "Remada serrote".
--    exercicios_biblioteca não tem FK com fichas_treino/historico_treinos (a ficha guarda
--    nome+id como texto solto no JSONB) — excluir aqui não quebra fichas já criadas com
--    esse exercício, só faz elas perderem o link pro GIF/grupo muscular do catálogo.
delete from exercicios_biblioteca
where id = '568b37db-6f0c-4e28-a740-80282ad593a8'; -- Remada unilateral com halter (duplicado de Remada serrote)
