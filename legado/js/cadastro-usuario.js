
"use strict";

const form = document.getElementById("cadastroForm");
const cpfInput = document.getElementById("cpf");
const mensagem = document.getElementById("mensagem");

function apenasNumeros(valor) {
  return valor.replace(/\D/g, "");
}

function formatarCPF(valor) {
  const cpf = apenasNumeros(valor).slice(0, 11);

  return cpf
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function validarCPF(valor) {
  const cpf = apenasNumeros(valor);

  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (let tamanho = 9; tamanho < 11; tamanho++) {
    let soma = 0;

    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    }

    const resto = (soma * 10) % 11;
    const digito = resto === 10 ? 0 : resto;

    if (digito !== Number(cpf[tamanho])) {
      return false;
    }
  }

  return true;
}

cpfInput.addEventListener("input", () => {
  cpfInput.value = formatarCPF(cpfInput.value);
});

form.addEventListener("reset", () => {
  mensagem.textContent = "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  mensagem.textContent = "";

  const nome = document.getElementById("nome").value.trim();
  const cpf = cpfInput.value;
  const emailInput = document.getElementById("email");
  const funcao = document.getElementById("funcao").value.trim();
  const perfil = document.getElementById("perfil").value;

  if (nome.split(/\s+/).length < 2) {
    mensagem.textContent = "Informe o nome completo.";
    return;
  }

  if (!validarCPF(cpf)) {
    mensagem.textContent = "Informe um CPF válido.";
    cpfInput.focus();
    return;
  }

  if (!emailInput.checkValidity()) {
    mensagem.textContent = "Informe um e-mail válido.";
    emailInput.focus();
    return;
  }

  if (!funcao || !perfil) {
    mensagem.textContent = "Preencha a função e o perfil de acesso.";
    return;
  }

  // Não persistir CPF nem criar contas no navegador.
  // A API deverá validar autenticação, autorização,
  // CPF, unicidade, empresa e perfil antes de salvar.

  mensagem.style.color = "#087d90";
  mensagem.textContent =
    "Formulário validado. O cadastro estará disponível após a integração com a API.";
});
