const form = document.querySelector("#bodyFatForm");
const clearButton = document.querySelector("#clearButton");
const printButton = document.querySelector("#printButton");
const hipField = document.querySelector("#hipField");
const hipInput = document.querySelector("#hip");
const errorBox = document.querySelector("#formError");

const resultName = document.querySelector("#resultName");
const bodyFatValue = document.querySelector("#bodyFatValue");
const fatMassValue = document.querySelector("#fatMassValue");
const leanMassValue = document.querySelector("#leanMassValue");
const classificationValue = document.querySelector("#classificationValue");

const sexInputs = document.querySelectorAll("input[name='sex']");

const parseNumber = (value) => Number(String(value).replace(",", "."));

const formatPercent = (value) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatKg = (value) =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;

function updateHipRequirement() {
  const sex = form.elements.sex.value;
  const isFemale = sex === "female";

  hipInput.required = isFemale;
  hipField.classList.toggle("is-optional", !isFemale);
  hipField.querySelector("span").textContent = isFemale
    ? "Quadril em cm"
    : "Quadril em cm (opcional)";
}

function classifyBodyFat(percent, sex) {
  if (sex === "female") {
    if (percent < 10) return "Abaixo da gordura essencial";
    if (percent <= 13) return "Gordura essencial";
    if (percent <= 20) return "Atletas";
    if (percent <= 24) return "Fitness";
    if (percent <= 31) return "Média";
    return "Obeso";
  }

  if (percent < 2) return "Abaixo da gordura essencial";
  if (percent <= 5) return "Gordura essencial";
  if (percent <= 13) return "Atletas";
  if (percent <= 17) return "Fitness";
  if (percent <= 24) return "Média";
  return "Obeso";
}

function calculateBodyFat({ sex, height, neck, waist, hip }) {
  const log10 = Math.log10;

  if (sex === "female") {
    const circumference = waist + hip - neck;
    if (circumference <= 0) return null;

    return 495 / (1.29579 - 0.35004 * log10(circumference) + 0.221 * log10(height)) - 450;
  }

  const circumference = waist - neck;
  if (circumference <= 0) return null;

  return 495 / (1.0324 - 0.19077 * log10(circumference) + 0.15456 * log10(height)) - 450;
}

function setEmptyResult() {
  resultName.textContent = "Aluno";
  bodyFatValue.textContent = "--";
  fatMassValue.textContent = "--";
  leanMassValue.textContent = "--";
  classificationValue.textContent = "--";
}

function showError(message) {
  errorBox.textContent = message;
}

function handleSubmit(event) {
  event.preventDefault();
  showError("");

  const data = {
    name: form.elements.studentName.value.trim(),
    sex: form.elements.sex.value,
    age: parseNumber(form.elements.age.value),
    weight: parseNumber(form.elements.weight.value),
    height: parseNumber(form.elements.height.value),
    neck: parseNumber(form.elements.neck.value),
    waist: parseNumber(form.elements.waist.value),
    hip: parseNumber(form.elements.hip.value),
  };

  const requiredValues = [data.age, data.weight, data.height, data.neck, data.waist];
  if (data.sex === "female") requiredValues.push(data.hip);

  if (!data.name || requiredValues.some((value) => !Number.isFinite(value) || value <= 0)) {
    showError("Preencha todos os campos obrigatórios com valores válidos.");
    return;
  }

  const bodyFat = calculateBodyFat(data);

  if (!Number.isFinite(bodyFat) || bodyFat <= 0 || bodyFat > 75) {
    showError("Confira as medidas informadas. A fórmula não gerou um resultado plausível.");
    return;
  }

  const fatMass = data.weight * (bodyFat / 100);
  const leanMass = data.weight - fatMass;

  resultName.textContent = data.name;
  bodyFatValue.textContent = formatPercent(bodyFat);
  fatMassValue.textContent = formatKg(fatMass);
  leanMassValue.textContent = formatKg(leanMass);
  classificationValue.textContent = classifyBodyFat(bodyFat, data.sex);
}

function clearForm() {
  form.reset();
  showError("");
  updateHipRequirement();
  setEmptyResult();
}

sexInputs.forEach((input) => input.addEventListener("change", updateHipRequirement));
form.addEventListener("submit", handleSubmit);
clearButton.addEventListener("click", clearForm);
printButton.addEventListener("click", () => window.print());

updateHipRequirement();
