// Aba "Agora" da tela do motorista: o que se lê de relance com o celular no
// suporte. Bloco do status (pílula, temperatura gigante, o que fazer, "há X"),
// faixa da carga com a régua, mini gráfico dos últimos 30 min com a tendência,
// previsão em 10 min, umidade e hora da última leitura.
// Deitado (celular no suporte na horizontal), o status fica à esquerda e a
// faixa e o gráfico à direita (CSS).

import Icone from "../../components/Icone.jsx";
import PrevisaoSensor from "../../components/PrevisaoSensor.jsx";
import ReguaFaixa from "../../components/ReguaFaixa.jsx";
import { formatarTemp, formatarUmidade } from "../../lib/formatar.js";
import GraficoMotorista from "./GraficoMotorista.jsx";
import {
  STATUS_MOTORISTA,
  frasePerfil,
  haQuanto,
  haQuantoCurto,
  partesTemperatura,
  tendencia,
  ultimosMinutos
} from "./motorista.js";

// Status nunca só por cor: a pílula leva ícone e texto.
const ICONE_STATUS = {
  NORMAL: "ok",
  ATENCAO: "alerta",
  CRITICO: "alerta",
  SEM_SINAL: "semSinal"
};

// Seta da tendência (forma, além do texto).
const SETA = { subindo: "▲", caindo: "▼", estavel: "→" };


export default function AbaAgora({ dados, status, agora, antigo, falhaSensor, horaLeitura, minutos }) {

  const leitura = dados.leitura;
  const info = STATUS_MOTORISTA[status];
  const temperatura = partesTemperatura(formatarTemp(leitura?.temperatura));

  const pontos = ultimosMinutos(dados.historico, 30);
  const rumo = tendencia(pontos);

  return (
    <>
      {falhaSensor && (
        <p className="aviso aviso-falha falha-sensor" id="falhaSensorMotorista" role="status">
          <Icone nome="semSinal" tamanho={28} />
          <span className="aviso-texto">
            <strong>{falhaSensor.texto}</strong>
            {leitura ? "O valor abaixo é a última leitura válida." : "Nenhuma leitura válida ainda."}
          </span>
        </p>
      )}

      <div className="agora-grade">

        <section className={`bloco-status ${info.classe}`} id="blocoStatus" aria-label="Temperatura da carga">
          <div className="status-topo">
            <p className="pilula-status">
              <Icone nome={ICONE_STATUS[status]} tamanho={24} />
              <span className="rotulo-status" id="statusMotorista">{info.texto}</span>
            </p>
            {leitura && (
              <span className="chip-tempo" id="haQuanto">{haQuantoCurto(leitura.medidoEm, agora)}</span>
            )}
          </div>

          <strong className={antigo ? "temperatura antiga" : "temperatura"} id="tempMotorista">
            <span className="temp-valor">{temperatura.valor}</span>
            {temperatura.unidade && <> <span className="temp-unidade">{temperatura.unidade}</span></>}
          </strong>

          {antigo && <span className="selo-antigo" id="seloAntigo">LEITURA ANTIGA</span>}

          <p className="frase">{info.frase}</p>
        </section>

        <div className="agora-lado">

          {dados.faixa && (
            <section className="cartao faixa-carga" aria-labelledby="tituloFaixa">
              <h2 className="rotulo-cartao" id="tituloFaixa">Faixa da carga · {dados.faixa.nome}</h2>
              <p className="faixa-ideal" id="faixaCarga">{frasePerfil(dados.faixa)}</p>
              <ReguaFaixa variante="motorista" id="reguaMotorista" faixa={dados.faixa} temperatura={leitura?.temperatura} />
            </section>
          )}

          {pontos.length >= 2 && (
            <section className="cartao" id="graficoAgora" aria-labelledby="tituloGraficoAgora">
              <div className="cartao-topo">
                <h2 className="rotulo-cartao" id="tituloGraficoAgora">Últimos 30 min</h2>
                {rumo && (
                  <span className={`tendencia ${rumo.direcao}`} id="tendencia">
                    <span aria-hidden="true">{SETA[rumo.direcao]}</span> {rumo.texto}
                  </span>
                )}
              </div>
              <GraficoMotorista pontos={pontos} faixa={dados.faixa} />
            </section>
          )}

        </div>

      </div>

      <PrevisaoSensor variante="motorista" />

      <div className="blocos">
        <section className="cartao bloco" aria-labelledby="tituloUmidade">
          <h2 className="rotulo-cartao" id="tituloUmidade">Umidade</h2>
          <p className="bloco-valor" id="umidadeMotorista">{formatarUmidade(leitura?.umidade)}</p>
        </section>
        <section className="cartao bloco" aria-labelledby="tituloUltima">
          <h2 className="rotulo-cartao" id="tituloUltima">Última leitura</h2>
          <p className="bloco-valor" id="ultimaLeitura">{horaLeitura || "--:--"}</p>
          <p className="bloco-apoio" id="ultimaLeituraHa">{horaLeitura ? haQuanto(minutos) : "nenhuma ainda"}</p>
        </section>
      </div>

      <p className="aviso-suporte">Use com o celular no suporte.</p>
    </>
  );

}
