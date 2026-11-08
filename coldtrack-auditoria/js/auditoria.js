"use strict";

// Dados fictícios. A API deverá fornecer registros reais após autenticação
// e autorização do administrador no servidor.
const logs = [
  {id:"AUD-0006",data:"2026-10-20T08:42:00",usuario:"Administrador Demo",tipo:"alteracao",acao:"Alteração de perfil",recurso:"Usuário Carlos Mendes",resultado:"sucesso",antes:"Perfil: Operador",depois:"Perfil: Gestor Logístico",observacao:"Mudança demonstrativa de permissões."},
  {id:"AUD-0005",data:"2026-10-20T08:15:00",usuario:"Ana Oliveira",tipo:"acesso",acao:"Acesso à plataforma",recurso:"Autenticação",resultado:"sucesso",antes:null,depois:null,observacao:"Login demonstrativo bem-sucedido."},
  {id:"AUD-0004",data:"2026-10-19T17:30:00",usuario:"Administrador Demo",tipo:"cadastro",acao:"Cadastro de usuário",recurso:"Usuário Mariana Costa",resultado:"sucesso",antes:null,depois:"Conta criada (sem dados pessoais sensíveis)",observacao:"Registro de exemplo."},
  {id:"AUD-0003",data:"2026-10-19T16:10:00",usuario:"Usuário não identificado",tipo:"alerta",acao:"Tentativa de acesso negada",recurso:"Área administrativa",resultado:"negado",antes:null,depois:null,observacao:"Acesso sem autorização; evento fictício."},
  {id:"AUD-0002",data:"2026-10-18T11:25:00",usuario:"Administrador Demo",tipo:"alteracao",acao:"Desativação de usuário",recurso:"Usuário Mariana Costa",resultado:"sucesso",antes:"Status: Ativo",depois:"Status: Inativo",observacao:"Alteração demonstrativa de status."},
  {id:"AUD-0001",data:"2026-10-18T09:00:00",usuario:"Carlos Mendes",tipo:"acesso",acao:"Acesso à plataforma",recurso:"Autenticação",resultado:"sucesso",antes:null,depois:null,observacao:"Evento fictício."}
];

const labelsTipo = {acesso:"Acesso",cadastro:"Cadastro",alteracao:"Alteração",alerta:"Alerta"};
const tabela = document.getElementById("logsTabela");
const pesquisa = document.getElementById("pesquisa");
const filtroTipo = document.getElementById("filtroTipo");
const filtroResultado = document.getElementById("filtroResultado");
const dataInicial = document.getElementById("dataInicial");
const dataFinal = document.getElementById("dataFinal");
const filtroMensagem = document.getElementById("filtroMensagem");
const dialog = document.getElementById("detalhesDialog");
const detalhes = document.getElementById("detalhesConteudo");
let logsFiltrados = [];

function dataFormatada(iso) {
  const [data, hora] = iso.split("T");
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} ${hora.slice(0,5)}`;
}

function criarCelula(linha, texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  linha.appendChild(td);
  return td;
}

function detalhe(rotulo, valor) {
  const linha = document.createElement("div");
  linha.className = "detail-row";
  const titulo = document.createElement("strong");
  titulo.textContent = rotulo;
  const texto = document.createElement("span");
  texto.textContent = valor ?? "Não se aplica";
  linha.append(titulo, texto);
  detalhes.appendChild(linha);
}

function mostrarDetalhes(log) {
  detalhes.replaceChildren();
  detalhe("Identificador", log.id);
  detalhe("Data e hora", dataFormatada(log.data));
  detalhe("Responsável", log.usuario);
  detalhe("Tipo", labelsTipo[log.tipo]);
  detalhe("Evento", log.acao);
  detalhe("Recurso", log.recurso);
  detalhe("Resultado", log.resultado === "sucesso" ? "Sucesso" : "Negado");
  detalhe("Valor anterior", log.antes);
  detalhe("Valor novo", log.depois);
  detalhe("Observação", log.observacao);
  dialog.showModal();
}

function atualizarIndicadores() {
  document.getElementById("totalEventos").textContent = logs.length;
  document.getElementById("totalAlteracoes").textContent = logs.filter(log => log.tipo === "alteracao").length;
  document.getElementById("totalAlertas").textContent = logs.filter(log => log.tipo === "alerta").length;
}

function renderizarLogs() {
  filtroMensagem.textContent = "";
  if (dataInicial.value && dataFinal.value && dataInicial.value > dataFinal.value) {
    filtroMensagem.textContent = "A data inicial não pode ser posterior à data final.";
    logsFiltrados = [];
  } else {
    const termo = pesquisa.value.trim().toLocaleLowerCase("pt-BR");
    logsFiltrados = logs.filter(log => {
      const texto = [log.id,log.usuario,log.acao,log.recurso,labelsTipo[log.tipo]].join(" ").toLocaleLowerCase("pt-BR");
      const dia = log.data.slice(0,10);
      return texto.includes(termo)
        && (!filtroTipo.value || log.tipo === filtroTipo.value)
        && (!filtroResultado.value || log.resultado === filtroResultado.value)
        && (!dataInicial.value || dia >= dataInicial.value)
        && (!dataFinal.value || dia <= dataFinal.value);
    });
  }

  tabela.replaceChildren();
  logsFiltrados.forEach(log => {
    const tr = document.createElement("tr");
    criarCelula(tr, dataFormatada(log.data));
    criarCelula(tr, log.usuario);
    const evento = criarCelula(tr, log.acao);
    evento.className = "event-name";
    const id = document.createElement("span");
    id.className = "event-id";
    id.textContent = `${log.id} · ${labelsTipo[log.tipo]}`;
    evento.appendChild(id);
    criarCelula(tr, log.recurso);
    const resultado = criarCelula(tr, "");
    const badge = document.createElement("span");
    badge.className = `status ${log.resultado}`;
    badge.textContent = log.resultado === "sucesso" ? "Sucesso" : "Negado";
    resultado.appendChild(badge);
    const acoes = criarCelula(tr, "");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "action-button";
    botao.textContent = "Visualizar";
    botao.setAttribute("aria-label", `Visualizar evento ${log.id}`);
    botao.addEventListener("click", () => mostrarDetalhes(log));
    acoes.appendChild(botao);
    tabela.appendChild(tr);
  });
  document.getElementById("semResultados").hidden = logsFiltrados.length > 0;
  document.getElementById("contadorResultados").textContent = `${logsFiltrados.length} de ${logs.length} eventos demonstrativos exibidos`;
}

function campoCsv(valor) {
  // Evita interpretação de fórmulas ao abrir em planilhas.
  let texto = String(valor ?? "");
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g,'""') + '"';
}

function exportarCsv() {
  const cabecalho = ["ID","Data e hora","Responsável","Tipo","Evento","Recurso","Resultado","Antes","Depois","Observação"];
  const linhas = logsFiltrados.map(log => [log.id,dataFormatada(log.data),log.usuario,labelsTipo[log.tipo],log.acao,log.recurso,log.resultado,log.antes,log.depois,log.observacao]);
  const csv = "\uFEFF" + [cabecalho,...linhas].map(linha => linha.map(campoCsv).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a = document.createElement("a");
  a.href = url;
  a.download = "coldtrack-auditoria-demo.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

[pesquisa,filtroTipo,filtroResultado,dataInicial,dataFinal].forEach(campo => campo.addEventListener("input",renderizarLogs));
document.getElementById("limparFiltros").addEventListener("click", () => {
  pesquisa.value = "";
  filtroTipo.value = "";
  filtroResultado.value = "";
  dataInicial.value = "";
  dataFinal.value = "";
  renderizarLogs();
});
document.getElementById("exportarCsv").addEventListener("click",exportarCsv);
document.getElementById("fecharDialog").addEventListener("click",() => dialog.close());
document.getElementById("fecharDialogIcone").addEventListener("click",() => dialog.close());
atualizarIndicadores();
renderizarLogs();
