// Dados de exemplo e filtro da tela de usuários (sem React, testável).

export const USUARIOS = [
  { id: 1, nome: "Ana Oliveira", email: "ana@empresa-exemplo.com", funcao: "Supervisora de Logística", perfil: "gestor", status: "ativo" },
  { id: 2, nome: "Carlos Mendes", email: "carlos@empresa-exemplo.com", funcao: "Monitor de Cargas", perfil: "operador", status: "ativo" },
  { id: 3, nome: "Mariana Costa", email: "mariana@empresa-exemplo.com", funcao: "Analista de Qualidade", perfil: "cliente", status: "inativo" },
  { id: 4, nome: "Pedro Almeida", email: "pedro@empresa-exemplo.com", funcao: "Administrador de Sistemas", perfil: "administrador", status: "ativo" }
];

export const NOMES_PERFIS = {
  administrador: "Administrador",
  gestor: "Gestor Logístico",
  operador: "Operador",
  cliente: "Cliente"
};

// Pesquisa por nome, e-mail ou função; perfil e status vazios = todos.
export function filtrarUsuarios(lista, { termo = "", perfil = "", status = "" }) {
  const busca = termo.trim().toLowerCase();
  return lista.filter(usuario => {
    const texto = [usuario.nome, usuario.email, usuario.funcao].join(" ").toLowerCase();
    return texto.includes(busca)
      && (!perfil || usuario.perfil === perfil)
      && (!status || usuario.status === status);
  });
}
