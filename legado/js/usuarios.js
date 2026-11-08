
"use strict";

const usuarios = [
  {
    id: 1,
    nome: "Ana Oliveira",
    email: "ana@empresa-exemplo.com",
    funcao: "Supervisora de Logística",
    perfil: "gestor",
    status: "ativo"
  },
  {
    id: 2,
    nome: "Carlos Mendes",
    email: "carlos@empresa-exemplo.com",
    funcao: "Monitor de Cargas",
    perfil: "operador",
    status: "ativo"
  },
  {
    id: 3,
    nome: "Mariana Costa",
    email: "mariana@empresa-exemplo.com",
    funcao: "Analista de Qualidade",
    perfil: "cliente",
    status: "inativo"
  },
  {
    id: 4,
    nome: "Pedro Almeida",
    email: "pedro@empresa-exemplo.com",
    funcao: "Administrador de Sistemas",
    perfil: "administrador",
    status: "ativo"
  }
];

const nomesPerfis = {
  administrador: "Administrador",
  gestor: "Gestor Logístico",
  operador: "Operador",
  cliente: "Cliente"
};

const tabela = document.getElementById("usuariosTabela");
const pesquisa = document.getElementById("pesquisa");
const filtroPerfil = document.getElementById("filtroPerfil");
const filtroStatus = document.getElementById("filtroStatus");
const feedback = document.getElementById("feedback");
const dialog = document.getElementById("detalhesDialog");
const detalhes = document.getElementById("detalhesConteudo");

function criarCelula(linha, texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  linha.appendChild(td);
  return td;
}

function atualizarIndicadores() {
  document.getElementById("totalUsuarios").textContent =
    usuarios.length;

  document.getElementById("usuariosAtivos").textContent =
    usuarios.filter(u => u.status === "ativo").length;

  document.getElementById("usuariosInativos").textContent =
    usuarios.filter(u => u.status === "inativo").length;
}

function criarBotao(texto, acao, usuario) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "action-button";
  botao.textContent = texto;

  botao.addEventListener("click", () => {
    if (acao === "visualizar") {
      mostrarDetalhes(usuario);
      return;
    }

    feedback.textContent =
      `A ação "${texto}" será integrada à API ColdTrack.`;
  });

  return botao;
}

function mostrarDetalhes(usuario) {
  detalhes.replaceChildren();

  const campos = [
    ["Nome", usuario.nome],
    ["E-mail", usuario.email],
    ["Função", usuario.funcao],
    ["Perfil", nomesPerfis[usuario.perfil]],
    ["Status", usuario.status]
  ];

  campos.forEach(([rotulo, valor]) => {
    const p = document.createElement("p");
    const strong = document.createElement("strong");

    strong.textContent = `${rotulo}: `;
    p.append(strong, document.createTextNode(valor));
    detalhes.appendChild(p);
  });

  dialog.showModal();
}

function renderizarUsuarios() {
  const termo = pesquisa.value.trim().toLowerCase();
  const perfil = filtroPerfil.value;
  const status = filtroStatus.value;

  const filtrados = usuarios.filter(usuario => {
    const texto = [
      usuario.nome,
      usuario.email,
      usuario.funcao
    ].join(" ").toLowerCase();

    return (
      texto.includes(termo) &&
      (!perfil || usuario.perfil === perfil) &&
      (!status || usuario.status === status)
    );
  });

  tabela.replaceChildren();

  filtrados.forEach(usuario => {
    const linha = document.createElement("tr");

    const tdUsuario = criarCelula(linha, usuario.nome);
    tdUsuario.classList.add("user-name");

    const email = document.createElement("span");
    email.className = "user-email";
    email.textContent = usuario.email;
    tdUsuario.appendChild(email);

    criarCelula(linha, usuario.funcao);
    criarCelula(linha, nomesPerfis[usuario.perfil]);

    const tdStatus = criarCelula(linha, "");
    const badge = document.createElement("span");
    badge.className = `status ${usuario.status}`;
    badge.textContent =
      usuario.status === "ativo" ? "Ativo" : "Inativo";
    tdStatus.appendChild(badge);

    const tdAcoes = criarCelula(linha, "");
    tdAcoes.appendChild(
      criarBotao("Visualizar", "visualizar", usuario)
    );
    tdAcoes.appendChild(
      criarBotao("Editar", "editar", usuario)
    );
    tdAcoes.appendChild(
      criarBotao(
        usuario.status === "ativo" ? "Desativar" : "Ativar",
        "alterar-status",
        usuario
      )
    );

    tabela.appendChild(linha);
  });

  document.getElementById("semResultados").hidden =
    filtrados.length !== 0;
}

[pesquisa, filtroPerfil, filtroStatus].forEach(elemento => {
  elemento.addEventListener("input", renderizarUsuarios);
});

document.getElementById("fecharDialog")
  .addEventListener("click", () => dialog.close());



atualizarIndicadores();
renderizarUsuarios();
