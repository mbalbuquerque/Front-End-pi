// Tela de configurações: minha conta (troca de senha), alertas no celular, faixas das cargas,
// sensores, fonte de dados e, para o gestor, os usuários da empresa.
// Porte do site antigo: configuracoes.html + js/configuracoes.js.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Carregando } from "../../components/Estado.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import { useSessao } from "../../hooks/useSessao.jsx";
import { api } from "../../lib/api.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { carregarPerfis, descreverCritico, descreverNormal, faixaDoPerfil } from "../../lib/faixas.js";
import { ehGestor, nomeDoPerfil } from "../../lib/sessao.js";
import AlertasCelular from "./AlertasCelular.jsx";
import ExcluirEmpresa from "./ExcluirEmpresa.jsx";


export default function Configuracoes() {

  const { usuario } = useSessao();
  const gestor = ehGestor(usuario);

  const [conexao, setConexao] = useState(null);

  // null enquanto carrega; depois { perfis, dispositivos, conectado }.
  const [dados, setDados] = useState(null);

  // Id do usuário cuja senha o gestor está redefinindo (abre o diálogo).
  const [redefinindo, setRedefinindo] = useState(null);

  // Motorista cujo veículo o gestor está trocando: { id, atual, veiculos, aoTrocar }.
  const [trocandoVeiculo, setTrocandoVeiculo] = useState(null);

  // Carrega uma vez ao abrir a tela, como o original (sem atualização periódica).
  useEffect(() => {

    let ativo = true;

    (async () => {

      let perfis = [];
      let dispositivos = [];
      let conectado = true;

      try {

        [perfis, { dispositivos }] = await Promise.all([
          carregarPerfis(),
          api("/dispositivos")
        ]);

      }

      catch (erro) {

        console.error("Erro ao consultar o Azure:", erro);
        conectado = false;

      }

      if (!ativo) return;

      setConexao(conectado);
      setDados({ perfis, dispositivos, conectado });

    })();

    return () => {
      ativo = false;
    };

  }, []);

  return (
    <PainelLayout
      titulo="Configurações"
      subtitulo="Sua conta, faixas de temperatura, sensores e usuários"
      conexao={conexao}
      dialogos={<>
        {redefinindo && (
          <DialogoRedefinir key={redefinindo} id={redefinindo} aoFechar={() => setRedefinindo(null)} />
        )}
        {trocandoVeiculo && (
          <DialogoVeiculo key={trocandoVeiculo.id} {...trocandoVeiculo} aoFechar={() => setTrocandoVeiculo(null)} />
        )}
      </>}
    >
      <div id="conteudo" className="page-grid">
        {!dados ? <Carregando /> : (
          <>
            <MinhaConta usuario={usuario} />
            <AlertasCelular />
            <FaixasTemperatura perfis={dados.perfis} conectado={dados.conectado} />
            <SensoresComunicacao dispositivos={dados.dispositivos} conectado={dados.conectado} />
            {gestor && (
              <PainelUsuarios eu={usuario?.id} aoRedefinir={setRedefinindo} aoTrocarVeiculo={setTrocandoVeiculo} />
            )}
            <FonteDados />
            {gestor && <ExcluirEmpresa />}
          </>
        )}
      </div>
    </PainelLayout>
  );

}


function MinhaConta({ usuario }) {

  const { entrar } = useSessao();

  const [erro, setErro] = useState(null);
  const [ok, setOk] = useState(false);

  async function trocarSenha(evento) {

    evento.preventDefault();

    const form = evento.currentTarget;
    setErro(null);
    setOk(false);

    try {

      const { token, usuario: atualizado } = await api("/senha", {
        metodo: "POST",
        corpo: Object.fromEntries(new FormData(form))
      });

      // A troca derruba o token antigo: guarda o novo para seguir logado aqui.
      entrar(token, atualizado);
      form.reset();
      setOk(true);

    } catch (falha) {

      setErro(falha.message);

    }

  }

  return (
    <article className="panel">
      <h2>Minha conta</h2>
      <p>{usuario?.nome} · {usuario?.id} · {usuario?.empresa}</p>

      <form id="formSenha" className="form-grade" noValidate onSubmit={trocarSenha}>
        <label className="campo"><span>Senha atual</span><input name="atual" type="password" autoComplete="current-password" required /></label>
        <label className="campo"><span>Nova senha (mín. 8)</span><input name="nova" type="password" autoComplete="new-password" minLength={8} required /></label>
        <button type="submit" className="botao">Trocar senha</button>
      </form>
      <p className="erro-form" id="erroSenha" role="alert" hidden={erro === null}>{erro}</p>
      <p className="aviso-ok" id="okSenha" role="status" hidden={!ok}>Senha trocada. Os outros aparelhos conectados saem da conta.</p>
    </article>
  );

}


function FaixasTemperatura({ perfis, conectado }) {

  return (
    <article className="panel">
      <h2>Faixas de temperatura</h2>
      <p>Cada veículo usa a faixa do perfil da carga. A mesma regra vale no sensor (LED), na nuvem e no painel: o sensor recebe a faixa do veículo a cada envio.</p>

      {conectado ? (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Perfil de carga</th>
                <th>Normal</th>
                <th>Atenção</th>
                <th>Crítico</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map(p => {
                const faixa = faixaDoPerfil(p);
                return (
                  <tr key={p.id ?? p.nome}>
                    <td><strong>{p.nome}</strong></td>
                    <td>{descreverNormal(faixa)}</td>
                    <td>até {faixa.margem} °C fora da faixa</td>
                    <td>{descreverCritico(faixa)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className="estado">Sem conexão com o Azure.</div>}

      <div className="nota">
        Manga e uva usam faixas de referência de pós-colheita, ainda a validar com o produtor.
        Frio demais também conta: abaixo da faixa a fruta sofre dano por frio.{" "}
        <strong>O DHT11 não mede abaixo de 0 °C</strong>: para uva, usar DHT22 ou sonda DS18B20.
      </div>
    </article>
  );

}


function SensoresComunicacao({ dispositivos, conectado }) {

  return (
    <article className="panel">
      <h2>Sensores e comunicação</h2>
      <p>Sensores instalados nos compartimentos de carga.</p>

      <div className="campos section-gap">
        <div>
          <span>Sensores registrados</span>
          <strong>{conectado ? dispositivos.length : "sem conexão"} · <Link to="/sensores">ver sensores</Link></strong>
        </div>
        <div>
          <span>Intervalo de envio</span>
          <strong>{UPDATE_INTERVAL / 1000} s</strong>
        </div>
        <div>
          <span>Acesso do sensor</span>
          <strong>Chave própria por sensor</strong>
        </div>
        <div>
          <span>Guarda leituras sem sinal</span>
          <strong>Sim, até 500 na memória do sensor</strong>
        </div>
      </div>
    </article>
  );

}


function FonteDados() {

  return (
    <article className="panel">
      <h2>Fonte de dados</h2>
      <p>De onde o painel lê a telemetria.</p>

      <div className="campos section-gap">
        <div>
          <span>Fonte</span>
          <strong>Azure (Function + Cosmos DB)</strong>
        </div>
        <div>
          <span>Atualização do painel</span>
          <strong>a cada {UPDATE_INTERVAL / 1000} s</strong>
        </div>
        <div>
          <span>Região</span>
          <strong>Brazil South (São Paulo)</strong>
        </div>
        <div>
          <span>Acesso</span>
          <strong>Login com perfis; cada empresa vê só os próprios dados</strong>
        </div>
      </div>
    </article>
  );

}


// Só para o gestor: lista, cria, redefine senha e remove usuários da empresa.
// O motorista fica vinculado a um veículo da frota (escolhido na criação e
// trocado depois pelo botão "Trocar veículo").
function PainelUsuarios({ eu, aoRedefinir, aoTrocarVeiculo }) {

  // { tipo: "carregando" } | { tipo: "erro", mensagem } | { tipo: "ok", usuarios }
  const [estado, setEstado] = useState({ tipo: "carregando" });
  const [erroForm, setErroForm] = useState(null);
  const [perfilNovo, setPerfilNovo] = useState("operador");
  const [veiculos, setVeiculos] = useState([]);

  // Frota para o vínculo do motorista. Sem ela, a lista fica vazia e a API recusa.
  useEffect(() => {
    let ativo = true;
    api("/veiculos")
      .then(({ veiculos: frota }) => {
        if (ativo) setVeiculos(frota.map(v => v.id).sort());
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  const carregarUsuarios = useCallback(async () => {

    try {
      const { usuarios } = await api("/usuarios");
      setEstado({
        tipo: "ok",
        usuarios: [...usuarios].sort((a, b) => a.nome.localeCompare(b.nome))
      });
    } catch (falha) {
      setEstado({ tipo: "erro", mensagem: falha.message });
    }

  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  async function criarUsuario(evento) {

    evento.preventDefault();

    const form = evento.currentTarget;
    setErroForm(null);

    try {
      await api("/usuarios", { metodo: "POST", corpo: Object.fromEntries(new FormData(form)) });
      // O original remontava o painel inteiro: o formulário volta vazio.
      form.reset();
      setPerfilNovo("operador");
      carregarUsuarios();
    } catch (falha) {
      setErroForm(falha.message);
    }

  }

  async function removerUsuario(id) {

    if (!confirm(`Remover o acesso de ${id}?`)) {
      return;
    }

    try {
      await api(`/usuarios/${encodeURIComponent(id)}`, { metodo: "DELETE" });
      carregarUsuarios();
    } catch (falha) {
      alert(falha.message);
    }

  }

  if (estado.tipo === "carregando") {
    return (
      <article className="panel" id="painelUsuarios">
        <h2>Usuários</h2>
        <p>Carregando…</p>
      </article>
    );
  }

  if (estado.tipo === "erro") {
    return (
      <article className="panel" id="painelUsuarios">
        <h2>Usuários</h2>
        <p className="erro-form">{estado.mensagem}</p>
      </article>
    );
  }

  return (
    <article className="panel" id="painelUsuarios">
      <h2>Usuários</h2>
      <p>Quem acessa o painel. Operador acompanha a carga; gestor também cadastra sensores, veículos, viagens e usuários. Motorista só vê, no celular, a temperatura do veículo vinculado a ele.</p>

      <div className="tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr></thead>
          <tbody>
            {estado.usuarios.map(u => (
              <tr key={u.id}>
                <td><strong>{u.nome}</strong></td>
                <td>{u.id}</td>
                <td>{nomeDoPerfil(u.perfil)}{u.perfil === "motorista" && ` · ${u.veiculo || "sem veículo"}`}</td>
                <td className="acoes-tabela">{u.id === eu ? "você" : (
                  <>
                    {u.perfil === "motorista" && (
                      <button
                        type="button"
                        className="botao secundario"
                        data-trocar-veiculo={u.id}
                        onClick={() => aoTrocarVeiculo({ id: u.id, atual: u.veiculo, veiculos, aoTrocar: carregarUsuarios })}
                      >Trocar veículo</button>
                    )}
                    <button type="button" className="botao secundario" data-redefinir={u.id} onClick={() => aoRedefinir(u.id)}>Redefinir senha</button>
                    <button type="button" className="botao perigo" data-remover-usuario={u.id} onClick={() => removerUsuario(u.id)}>Remover</button>
                  </>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form id="formUsuario" className="form-grade" noValidate onSubmit={criarUsuario}>
        <label className="campo"><span>Nome</span><input name="nome" required /></label>
        <label className="campo"><span>E-mail</span><input name="email" type="email" required /></label>
        <label className="campo"><span>Perfil</span>
          <select name="perfil" value={perfilNovo} onChange={evento => setPerfilNovo(evento.target.value)}>
            <option value="operador">Operador logístico</option>
            <option value="gestor">Gestor</option>
            <option value="motorista">Motorista</option>
          </select>
        </label>
        {perfilNovo === "motorista" && (
          <label className="campo"><span>Veículo do motorista</span>
            <SeletorFrota veiculos={veiculos} />
          </label>
        )}
        <label className="campo"><span>Senha inicial (mín. 8)</span><input name="senha" type="password" autoComplete="new-password" required /></label>
        <button type="submit" className="botao">Criar usuário</button>
      </form>
      <p className="erro-form" id="erroUsuario" role="alert" hidden={erroForm === null}>{erroForm}</p>
    </article>
  );

}


// Gestor define uma senha nova para quem esqueceu (a pessoa troca depois).
// Montado a cada abertura (formulário limpo); desmonta quando o diálogo fecha.
function DialogoRedefinir({ id, aoFechar }) {

  const dialogo = useRef(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    // StrictMode roda o efeito duas vezes no dev: não reabre o que já está aberto.
    if (!dialogo.current.open) dialogo.current.showModal();
  }, []);

  async function redefinir(evento) {

    evento.preventDefault();

    const senha = new FormData(evento.currentTarget).get("senha");
    setErro(null);

    try {
      await api(`/usuarios/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: { senha } });
      dialogo.current.close();
      alert(`Senha de ${id} redefinida.`);
    } catch (falha) {
      setErro(falha.message);
    }

  }

  return (
    <dialog id="redefinir" className="etiqueta" ref={dialogo} onClose={aoFechar}>
      <form className="dialogo-form" noValidate onSubmit={redefinir}>
        <h2>Redefinir senha</h2>
        <p>{id} sai de todos os aparelhos e entra com a senha nova.</p>
        <label className="campo"><span>Nova senha (mín. 8)</span><input name="senha" type="password" autoComplete="new-password" minLength={8} required /></label>
        <p className="erro-form" role="alert" hidden={erro === null}>{erro}</p>
        <div className="acoes-item">
          <button type="submit" className="botao">Redefinir senha</button>
          <button type="button" className="botao secundario" data-fechar="" onClick={() => dialogo.current.close()}>Cancelar</button>
        </div>
      </form>
    </dialog>
  );

}


// Lista da frota para o vínculo do motorista (obrigatório nesse perfil).
function SeletorFrota({ veiculos, atual = "" }) {

  return (
    <select name="veiculo" defaultValue={atual} required>
      <option value="" disabled>{veiculos.length ? "Escolha o veículo" : "Nenhum veículo cadastrado"}</option>
      {veiculos.map(id => <option key={id} value={id}>{id}</option>)}
    </select>
  );

}


// Gestor troca o veículo vinculado a um motorista (a senha e as sessões ficam como estão).
function DialogoVeiculo({ id, atual, veiculos, aoTrocar, aoFechar }) {

  const dialogo = useRef(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!dialogo.current.open) dialogo.current.showModal();
  }, []);

  async function trocar(evento) {

    evento.preventDefault();

    const veiculo = new FormData(evento.currentTarget).get("veiculo");
    setErro(null);

    try {
      await api(`/usuarios/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: { veiculo } });
      dialogo.current.close();
      aoTrocar();
    } catch (falha) {
      setErro(falha.message);
    }

  }

  return (
    <dialog id="trocarVeiculo" className="etiqueta" ref={dialogo} onClose={aoFechar}>
      <form className="dialogo-form" noValidate onSubmit={trocar}>
        <h2>Trocar veículo</h2>
        <p>{id} passa a ver, no celular, a temperatura do veículo escolhido.</p>
        <label className="campo"><span>Veículo</span><SeletorFrota veiculos={veiculos} atual={atual || ""} /></label>
        <p className="erro-form" role="alert" hidden={erro === null}>{erro}</p>
        <div className="acoes-item">
          <button type="submit" className="botao">Trocar veículo</button>
          <button type="button" className="botao secundario" data-fechar="" onClick={() => dialogo.current.close()}>Cancelar</button>
        </div>
      </form>
    </dialog>
  );

}
