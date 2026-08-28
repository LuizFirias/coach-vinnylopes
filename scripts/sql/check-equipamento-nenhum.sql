-- Lista todos os exercícios marcados como "Nenhum" (sem equipamento) —
-- pra revisão manual, já que "Agachamento livre (barra)" foi encontrado
-- errado nessa categoria (deveria ser "Barra").

-- 1) Todos os exercícios "Nenhum", em ordem alfabética
SELECT id, nome, grupo_muscular, equipamento, tipo_exercicio
FROM exercicios_biblioteca
WHERE equipamento = 'Nenhum'
ORDER BY nome;

-- 2) Só os suspeitos — nome menciona barra, máquina, cabo, polia, smith,
-- halter ou kettlebell, mas está marcado como "Nenhum" (provável erro)
SELECT id, nome, grupo_muscular, equipamento, tipo_exercicio
FROM exercicios_biblioteca
WHERE equipamento = 'Nenhum'
  AND (
    nome ILIKE '%barra%'
    OR nome ILIKE '%máquina%'
    OR nome ILIKE '%maquina%'
    OR nome ILIKE '%cabo%'
    OR nome ILIKE '%polia%'
    OR nome ILIKE '%smith%'
    OR nome ILIKE '%halter%'
    OR nome ILIKE '%kettlebell%'
  )
ORDER BY nome;
