// Tela de login: troca e-mail e senha por um token de 8 h.

// Já logado: vai direto ao painel.
if (lerSessao()) {
  location.replace("dashboard.html");
}


const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const forgotPassword = document.getElementById("forgotPassword");
const mensagem = document.getElementById("loginMessage");
const botao = document.getElementById("botaoEntrar");
const TEXTO_BOTAO = botao.innerHTML;


togglePassword.addEventListener("click", () => {

  const visivel = passwordInput.type === "password";

  passwordInput.type = visivel ? "text" : "password";
  togglePassword.textContent = visivel ? "Ocultar" : "Mostrar";
  togglePassword.setAttribute("aria-pressed", String(visivel));
  togglePassword.setAttribute("aria-label", visivel ? "Ocultar senha" : "Mostrar senha");

});


forgotPassword.addEventListener("click", evento => {

  evento.preventDefault();
  mensagem.textContent = "Peça ao gestor da sua equipe para definir uma senha nova.";

});


form.addEventListener("submit", async evento => {

  evento.preventDefault();

  mensagem.textContent = "";

  const email = emailInput.value.trim();
  const senha = passwordInput.value;

  if (!email || !emailInput.checkValidity()) {
    mensagem.textContent = "Informe um e-mail válido.";
    emailInput.focus();
    return;
  }

  if (!senha) {
    mensagem.textContent = "Informe sua senha.";
    passwordInput.focus();
    return;
  }

  botao.disabled = true;
  botao.textContent = "Entrando…";

  try {

    // Chamada direta (sem api()): 401 aqui é senha errada, não sessão vencida.
    const response = await fetch(`${CONFIG.API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const dados = await response.json().catch(() => ({}));

    if (!response.ok) {
      mensagem.textContent = (dados.erros || ["Não foi possível entrar."]).join(" ");
      return;
    }

    salvarSessao(dados.token, dados.usuario);
    location.replace("dashboard.html");

  }

  catch (falha) {

    mensagem.textContent = "Sem conexão com o servidor. Confira a internet e tente de novo.";

  }

  finally {

    botao.disabled = false;
    botao.innerHTML = TEXTO_BOTAO;

  }

});
