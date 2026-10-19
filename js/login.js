// Tela de login: troca e-mail e senha por um token de 8 h.

// Já logado: vai direto ao painel.
if (lerSessao()) {
  location.replace("dashboard.html");
}


const form = document.getElementById("formLogin");
const botao = document.getElementById("botaoEntrar");
const erro = document.getElementById("erroLogin");


function mostrarErro(mensagem) {

  erro.textContent = mensagem;
  erro.hidden = false;

}


form.addEventListener("submit", async evento => {

  evento.preventDefault();

  const email = form.email.value.trim();
  const senha = form.senha.value;

  if (!email || !senha) {
    mostrarErro("Informe e-mail e senha.");
    return;
  }

  erro.hidden = true;
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
      mostrarErro((dados.erros || ["Não foi possível entrar."]).join(" "));
      return;
    }

    salvarSessao(dados.token, dados.usuario);
    location.replace("dashboard.html");

  }

  catch (falha) {

    mostrarErro("Sem conexão com o servidor. Confira a internet e tente de novo.");

  }

  finally {

    botao.disabled = false;
    botao.textContent = "Entrar";

  }

});
