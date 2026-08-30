// Confere calcKcal contra valores calculados à mão a partir de Keytel et al. (2005).
// Uso: node scripts/check-cardio-kcal.mjs

import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../lib/utils/cardio.ts', import.meta.url), 'utf8');

// Extrai o corpo de calcKcal do TS e avalia como JS (sem tipos no corpo da função).
const inicio = src.indexOf('export function calcKcal');
const fim = src.indexOf('export function calcFcAlvo');
const corpo = src
  .slice(inicio, fim)
  .replace('export function calcKcal(params: {', 'function calcKcal(params) { /*')
  .replace(/\}\): number \| null \{/, '*/');

const calcKcal = new Function(`${corpo}; return calcKcal;`)();

const casos = [
  { nome: 'Homem 30a, 80kg, FC140, 40min', input: { fcMedia: 140, pesoKg: 80, idade: 30, sexo: 'M', duracaoMin: 40 }, esperado: 528 },
  { nome: 'Mulher 30a, 60kg, FC140, 40min', input: { fcMedia: 140, pesoKg: 60, idade: 30, sexo: 'F', duracaoMin: 40 }, esperado: 497 },
  { nome: 'Homem 45a, 95kg, FC120, 60min', input: { fcMedia: 120, pesoKg: 95, idade: 45, sexo: 'M', duracaoMin: 60 }, esperado: 697 },
  { nome: 'FC fora de faixa', input: { fcMedia: 20, pesoKg: 80, idade: 30, sexo: 'M', duracaoMin: 30 }, esperado: null },
  { nome: 'Peso fora de faixa', input: { fcMedia: 140, pesoKg: 500, idade: 30, sexo: 'M', duracaoMin: 30 }, esperado: null },
  { nome: 'Sem FC', input: { fcMedia: 0, pesoKg: 80, idade: 30, sexo: 'M', duracaoMin: 30 }, esperado: null },
];

let falhas = 0;
for (const { nome, input, esperado } of casos) {
  const obtido = calcKcal(input);
  const ok = esperado === null ? obtido === null : Math.abs(obtido - esperado) <= 2;
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${nome} → ${obtido} (esperado ${esperado})`);
}

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
