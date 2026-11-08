// Dados fictícios e regras da tela de auditoria (sem React, testável).
// A API deverá fornecer registros reais após autenticação e autorização
// do administrador no servidor.

export const LOGS = [
  { id: "AUD-0006", data: "2026-10-20T08:42:00", usuario: "Administrador Demo", tipo: "alteracao", acao: "Alteração de perfil", recurso: "Usuário Carlos Mendes", resultado: "sucesso", antes: "Perfil: Operador", depois: "Perfil: Gestor Logístico", observacao: "Mudança demonstrativa de permissões." },
  { id: "AUD-0005", data: "2026-10-20T08:15:00", usuario: "Ana Oliveira", tipo: "acesso", acao: "Acesso à plataforma", recurso: "Autenticação", resultado: "sucesso", antes: null, depois: null, observacao: "Login demonstrativo bem-sucedido." },
  { id: "AUD-0004", data: "2026-10-19T17:30:00", usuario: "Administrador Demo", tipo: "cadastro", acao: "Cadastro de usuário", recurso: "Usuário Mariana Costa", resultado: "sucesso", antes: null, depois: "Conta criada (sem dados pessoais sensíveis)", observacao: "Registro de exemplo." },
  { id: "AUD-0003", data: "2026-10-19T16:10:00", usuario: "Usuário não identificado", tipo: "alerta", acao: "Tentativa de acesso negada", recurso: "Área administrativa", resultado: "negado", antes: null, depois: null, observacao: "Acesso sem autorização; evento fictício." },
  { id: "AUD-0002", data: "2026-10-18T11:25:00", usuario: "Administrador Demo", tipo: "alteracao", acao: "Desativação de usuário", recurso: "Usuário Mariana Costa", resultado: "sucesso", antes: "Status: Ativo", depois: "Status: Inativo", observacao: "Alteração demonstrativa de status." },
  { id: "AUD-0001", data: "2026-10-18T09:00:00", usuario: "Carlos Mendes", tipo: "acesso", acao: "Acesso à plataforma", recurso: "Autenticação", resultado: "sucesso", antes: null, depois: null, observacao: "Evento fictício." }
];

export const LABELS_TIPO = { acesso: "Acesso", cadastro: "Cadastro", alteracao: "Alteração", alerta: "Alerta" };

export function dataFormatada(iso) {
  const [data, hora] = iso.split("T");
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} ${hora.slice(0, 5)}`;
}

// Devolve { logs, erro }: intervalo de datas invertido dá lista vazia e mensagem.
export function filtrarLogs(lista, { termo = "", tipo = "", resultado = "", dataInicial = "", dataFinal = "" }) {

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    return { logs: [], erro: "A data inicial não pode ser posterior à data final." };
  }

  const busca = termo.trim().toLocaleLowerCase("pt-BR");

  const logs = lista.filter(log => {
    const texto = [log.id, log.usuario, log.acao, log.recurso, LABELS_TIPO[log.tipo]].join(" ").toLocaleLowerCase("pt-BR");
    const dia = log.data.slice(0, 10);
    return texto.includes(busca)
      && (!tipo || log.tipo === tipo)
      && (!resultado || log.resultado === resultado)
      && (!dataInicial || dia >= dataInicial)
      && (!dataFinal || dia <= dataFinal);
  });

  return { logs, erro: "" };

}

export function campoCsv(valor) {
  // Evita interpretação de fórmulas ao abrir em planilhas.
  let texto = String(valor ?? "");
  // eslint-disable-next-line no-control-regex
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}

export function montarCsv(logs) {
  const cabecalho = ["ID", "Data e hora", "Responsável", "Tipo", "Evento", "Recurso", "Resultado", "Antes", "Depois", "Observação"];
  const linhas = logs.map(log => [log.id, dataFormatada(log.data), log.usuario, LABELS_TIPO[log.tipo], log.acao, log.recurso, log.resultado, log.antes, log.depois, log.observacao]);
  return "﻿" + [cabecalho, ...linhas].map(linha => linha.map(campoCsv).join(";")).join("\r\n");
}

export function baixarCsv(logs) {
  const url = URL.createObjectURL(new Blob([montarCsv(logs)], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "coldtrack-auditoria-demo.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
