
"use strict";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginMessage = document.getElementById("loginMessage");
const forgotPassword = document.getElementById("forgotPassword");

togglePassword.addEventListener("click", () => {
  const visible = passwordInput.type === "password";

  passwordInput.type = visible ? "text" : "password";
  togglePassword.textContent = visible ? "Ocultar" : "Mostrar";
  togglePassword.setAttribute("aria-pressed", String(visible));
  togglePassword.setAttribute(
    "aria-label",
    visible ? "Ocultar senha" : "Mostrar senha"
  );
});

forgotPassword.addEventListener("click", (event) => {
  event.preventDefault();

  loginMessage.textContent =
    "A recuperação de senha estará disponível após a integração com a API.";
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  loginMessage.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!emailInput.checkValidity() || !email) {
    loginMessage.textContent = "Informe um e-mail válido.";
    emailInput.focus();
    return;
  }

  if (!password) {
    loginMessage.textContent = "Informe sua senha.";
    passwordInput.focus();
    return;
  }

  loginMessage.textContent =
    "Interface concluída. A autenticação aguarda integração com a API ColdTrack.";

  // Futuramente:
  // enviar credenciais por HTTPS ao backend
  // tratar a resposta do servidor
  // redirecionar somente após autenticação real
});
