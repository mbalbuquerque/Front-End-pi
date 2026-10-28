// Cadastro de empresa nova: cria a empresa e o primeiro gestor, e já entra.

if (lerSessao()) {
  location.replace("dashboard.html");
}


const form = document.getElementById("formCadastro");
const botao = document.getElementById("botaoCadastrar");
const erro = document.getElementById("erroCadastro");


form.addEventListener("submit", async evento => {

  evento.preventDefault();

  const dados = Object.fromEntries(new FormData(form));

  if (Object.values(dados).some(v => !String(v).trim())) {
    erro.textContent = "Preencha todos os campos.";
    erro.hidden = false;
    return;
  }

  erro.hidden = true;
  botao.disabled = true;
  botao.textContent = "Cadastrando…";

  try {

    const response = await fetch(`${CONFIG.API_URL}/empresas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    const resposta = await response.json().catch(() => ({}));

    if (!response.ok) {
      erro.textContent = (resposta.erros || ["Não foi possível cadastrar."]).join(" · ");
      erro.hidden = false;
      return;
    }

    salvarSessao(resposta.token, resposta.usuario);
    location.replace("sensores.html");

  }

  catch (falha) {

    erro.textContent = "Sem conexão com o servidor. Confira a internet e tente de novo.";
    erro.hidden = false;

  }

  finally {

    botao.disabled = false;
    botao.textContent = "Cadastrar empresa";

  }

});
