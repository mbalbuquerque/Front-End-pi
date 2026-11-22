// Aba "Perfil": quem está logado, o veículo vinculado e o perfil da carga, os
// alertas no celular (ativar, testar, tela acesa, som), a conta (trocar senha,
// ajuda para ler a tela) e "Sair da conta". Não é usada dirigindo: só aqui há
// campo de digitação (a troca de senha, fechada até ser aberta).

import { useState } from "react";
import Icone from "../../components/Icone.jsx";
import { useSessao } from "../../hooks/useSessao.jsx";
import { api } from "../../lib/api.js";
import AlertasMotorista from "./AlertasMotorista.jsx";
import { LIMITE_SEM_SINAL_MIN, STATUS_MOTORISTA, descreverFaixa, iniciais } from "./motorista.js";

// Como ler a tela: o que cada status quer dizer e o que fazer.
const AJUDA = [
  ["NORMAL", "Carga dentro da faixa. Siga viagem."],
  ["ATENCAO", "Temperatura perto do limite. Confira o baú na próxima parada."],
  ["CRITICO", "Carga fora da faixa. Pare em local seguro e confira o baú e o equipamento de frio."],
  ["SEM_SINAL", `O sensor não envia há mais de ${LIMITE_SEM_SINAL_MIN} min. O último valor fica marcado como LEITURA ANTIGA.`]
];


export default function AbaPerfil({ dados, alertas, telaAcesa }) {

  const { usuario, sair } = useSessao();

  const veiculo = dados ? `${dados.veiculo.id} · ${dados.veiculo.tipo}` : usuario?.veiculo || "Nenhum veículo vinculado";

  return (
    <>
      <section className="cartao perfil" aria-label="Seus dados">
        <span className="avatar" aria-hidden="true">{iniciais(usuario?.nome)}</span>
        <span className="perfil-textos">
          <span className="perfil-linha">
            <strong className="perfil-nome" id="nomeMotorista">{usuario?.nome}</strong>
            <span className="pilula-papel">Motorista</span>
          </span>
          {usuario?.empresa && (
            <span className="perfil-empresa">
              <Icone nome="predio" tamanho={20} />
              {usuario.empresa}
            </span>
          )}
        </span>
      </section>

      <section className="cartao" id="veiculoPerfil" aria-labelledby="tituloVeiculo">
        <h2 className="rotulo-cartao" id="tituloVeiculo">Veículo</h2>
        <p className="veiculo-perfil">
          <Icone nome="veiculo" tamanho={26} />
          {veiculo}
        </p>
        {dados?.faixa && (
          <p className="perfil-carga">
            <span className="perfil-carga-rotulo">Perfil de carga</span>
            <strong>{descreverFaixa(dados.faixa)}</strong>
          </p>
        )}
        <p className="nota-cartao">
          <Icone nome="info" tamanho={18} />
          Para trocar de veículo, fale com o gestor.
        </p>
      </section>

      <AlertasMotorista alertas={alertas} telaAcesa={telaAcesa} />

      <section className="cartao conta" aria-labelledby="tituloConta">
        <h2 className="rotulo-cartao" id="tituloConta">Conta</h2>

        <details className="item-conta" id="trocarSenha">
          <summary>
            <Icone nome="cadeado" tamanho={22} />
            <span>Trocar senha</span>
            <Icone nome="seta" tamanho={20} />
          </summary>
          <TrocarSenha />
        </details>

        <details className="item-conta" id="ajudaTela">
          <summary>
            <Icone nome="ajuda" tamanho={22} />
            <span>Ajuda: como ler a tela</span>
            <Icone nome="seta" tamanho={20} />
          </summary>
          <dl className="ajuda">
            {AJUDA.map(([status, texto]) => (
              <div key={status} className={STATUS_MOTORISTA[status].classe}>
                <dt>{STATUS_MOTORISTA[status].texto}</dt>
                <dd>{texto}</dd>
              </div>
            ))}
          </dl>
          <p className="ajuda-nota">
            O aviso colorido no alto da tela fica até a carga voltar ao normal. O gráfico mostra a
            faixa segura em azul e os limites em linhas tracejadas.
          </p>
        </details>
      </section>

      <button type="button" className="botao-sair" id="botaoSair" onClick={sair}>
        <Icone nome="sair" tamanho={22} />
        Sair da conta
      </button>
    </>
  );

}


// Troca de senha (POST /senha, o mesmo das Configurações do painel). A troca
// derruba o token antigo: o novo é guardado para seguir logado aqui.
function TrocarSenha() {

  const { entrar } = useSessao();
  const [erro, setErro] = useState(null);
  const [ok, setOk] = useState(false);

  async function trocar(evento) {

    evento.preventDefault();

    const form = evento.currentTarget;
    setErro(null);
    setOk(false);

    try {
      const { token, usuario } = await api("/senha", {
        metodo: "POST",
        corpo: Object.fromEntries(new FormData(form))
      });
      entrar(token, usuario);
      form.reset();
      setOk(true);
    } catch (falha) {
      setErro(falha.message);
    }

  }

  return (
    <form className="form-senha" id="formSenha" noValidate onSubmit={trocar}>
      <label className="campo">
        <span>Senha atual</span>
        <input name="atual" type="password" autoComplete="current-password" required />
      </label>
      <label className="campo">
        <span>Nova senha (mín. 8)</span>
        <input name="nova" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <button type="submit" className="botao-primario">Trocar senha</button>
      {erro && <p className="erro-push" id="erroSenha" role="alert">{erro}</p>}
      {ok && <p className="ok-senha" id="okSenha" role="status">Senha trocada. Os outros aparelhos conectados saem da conta.</p>}
    </form>
  );

}
