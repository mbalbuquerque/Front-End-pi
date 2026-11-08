// Página inicial (landing): cabeçalho fixo, carrossel do topo, seções do
// projeto, login embutido, contato e o assistente virtual.
// Porte do site antigo: index.html + js/home.js.

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ChatWidget from "../../components/ChatWidget/ChatWidget.jsx";
import { useSessao } from "../../hooks/useSessao.jsx";
import { useTitulo } from "../../hooks/useTitulo.js";
import { postPublico } from "../../lib/api.js";
import slide1 from "../../assets/images/slide-1.webp";
import slide2 from "../../assets/images/slide-2.webp";
import slide3 from "../../assets/images/slide-3.webp";
import { proximoSlide, slideAnterior } from "./carrossel.js";
import { movimentoReduzido, useMovimentoReduzido } from "../../hooks/useMovimentoReduzido.js";
import "../../styles/home/home.css";

// Logística, agronegócio e monitoramento da carga (o 3º tem degradê mais claro).
const SLIDES = [
  { imagem: slide1, meio: ".70", fim: ".18" },
  { imagem: slide2, meio: ".70", fim: ".18" },
  { imagem: slide3, meio: ".65", fim: ".12" }
];

const INTERVALO_SLIDE = 6000;

const AVISO_LOGIN = "Acesso para operadores e gestores cadastrados.";


function fundoDoSlide({ imagem, meio, fim }) {

  return {
    backgroundImage:
      "linear-gradient(90deg, " +
      `rgba(3,18,31,.94) 0%, rgba(3,18,31,${meio}) 38%, rgba(3,18,31,${fim}) 75%), ` +
      `url("${imagem}")`
  };

}


export default function Home() {

  useTitulo("ColdTrack Control | Monitoramento da Cadeia Fria");

  const { entrar } = useSessao();
  const navigate = useNavigate();
  const { hash, key } = useLocation();
  const reduzido = useMovimentoReduzido();

  const [slideAtual, setSlideAtual] = useState(0);
  // Clique em seta/ponto reinicia a contagem dos 6 s (o antigo startSlider()).
  const [cicloSlide, setCicloSlide] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);
  const [rolou, setRolou] = useState(false);
  const [avisoLogin, setAvisoLogin] = useState(AVISO_LOGIN);
  const [entrando, setEntrando] = useState(false);


  // Avanço automático; parado quando o sistema pede menos movimento.
  useEffect(() => {

    if (reduzido) return undefined;

    const timer = setTimeout(() => {
      setSlideAtual(atual => proximoSlide(atual, SLIDES.length));
    }, INTERVALO_SLIDE);

    return () => clearTimeout(timer);

  }, [slideAtual, cicloSlide, reduzido]);


  // Cabeçalho mais opaco depois de 50 px de rolagem.
  useEffect(() => {

    function aoRolar() {
      setRolou(window.scrollY > 50);
    }

    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });

    return () => window.removeEventListener("scroll", aoRolar);

  }, []);


  // Âncora na URL (#projeto, e a antiga /#inicio): leva até a seção.
  // Na carga da página pula direto; nos cliques rola suave, salvo movimento reduzido.
  useEffect(() => {

    const id = decodeURIComponent(hash.slice(1));
    const alvo = id ? document.getElementById(id) : null;

    if (!alvo) return;

    const suave = key !== "default" && !movimentoReduzido();

    alvo.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });

  }, [hash, key]);


  function irParaAncora(evento) {

    setMenuAberto(false);

    // Ctrl/Shift/botão do meio: deixa o navegador abrir em outra aba.
    if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
      return;
    }

    evento.preventDefault();

    const destino = evento.currentTarget.getAttribute("href");

    navigate({ hash: destino }, { replace: destino === hash });

  }


  function mostrarSlide(indice) {

    setSlideAtual(indice);
    setCicloSlide(ciclo => ciclo + 1);

  }


  async function enviarLogin(evento) {

    evento.preventDefault();

    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email") ?? "").trim();
    const senha = String(dados.get("password") ?? "");

    if (!email || !senha) {
      setAvisoLogin("Informe e-mail e senha.");
      return;
    }

    setEntrando(true);

    try {

      // Chamada pública: 401 aqui é senha errada, não sessão vencida.
      const { ok, dados: resposta } = await postPublico("/login", { email, senha });

      if (!ok) {
        setAvisoLogin((resposta.erros || ["Não foi possível entrar."]).join(" "));
        setEntrando(false);
        return;
      }

      entrar(resposta.token, resposta.usuario);
      navigate("/dashboard");

    }

    catch {

      setAvisoLogin("Sem conexão com o servidor. Confira a internet e tente de novo.");
      setEntrando(false);

    }

  }


  return (
    <div className="escopo-home raiz-pagina">

      <header
        className="header"
        id="header"
        style={{ background: rolou ? "rgba(4,24,39,.96)" : "rgba(4,24,39,.78)" }}
      >
        <div className="container nav">

          <a href="#inicio" className="logo" onClick={irParaAncora}>
            <span className="logo-icon">❄</span>{" "}
            <span>
              <strong>ColdTrack</strong>
              <small>CONTROL</small>
            </span>
          </a>

          <button
            type="button"
            className="menu-toggle"
            id="menuToggle"
            aria-label="Abrir menu"
            aria-expanded={String(menuAberto)}
            onClick={() => setMenuAberto(aberto => !aberto)}
          >
            ☰
          </button>

          <nav className={menuAberto ? "menu open" : "menu"} id="menu">
            <a href="#inicio" onClick={irParaAncora}>Início</a>
            <a href="#projeto" onClick={irParaAncora}>Projeto</a>
            <a href="#diferencial" onClick={irParaAncora}>Diferencial</a>
            <a href="#quem-somos" onClick={irParaAncora}>Quem somos</a>
            <a href="#contato" onClick={irParaAncora}>Contato</a>
          </nav>

          <Link to="/login" className="btn-login">Entrar</Link>

        </div>
      </header>


      <main>

        {/* HERO */}
        <section className="hero" id="inicio">

          <div className="slides">
            {SLIDES.map((slide, indice) => (
              <article
                key={slide.imagem}
                className={indice === slideAtual ? "slide active" : "slide"}
                style={fundoDoSlide(slide)}
              />
            ))}
          </div>

          <div className="container hero-grid">

            <div className="hero-content">

              <span className="eyebrow">
                IoT • Cadeia Fria • Telemetria
              </span>

              <h1>
                Da origem ao destino,{" "}
                <span>sua carga monitorada.</span>
              </h1>

              <p>
                Tecnologia IoT para monitoramento de temperatura,
                umidade e conectividade durante o transporte
                refrigerado de mercadorias.
              </p>

              <div className="hero-actions">
                <Link to="/login" className="btn-primary">
                  Acessar Plataforma →
                </Link>

                <a href="#projeto" className="btn-secondary" onClick={irParaAncora}>
                  Conheça o projeto
                </a>
              </div>

            </div>


            <div className="telemetry-card">

              <div className="live">
                <span></span>{" "}
                MONITORAMENTO
              </div>

              <h3>Condição da carga</h3>

              <div className="telemetry-item">
                <div>
                  <small>TEMPERATURA</small>
                  <strong id="heroTemp">12.4 °C</strong>
                </div>

                <span>🌡️</span>
              </div>

              <div className="telemetry-item">
                <div>
                  <small>UMIDADE</small>
                  <strong id="heroHumidity">68 %</strong>
                </div>

                <span>💧</span>
              </div>

              <div className="telemetry-item">
                <div>
                  <small>WI-FI</small>
                  <strong id="heroRssi">-61 dBm</strong>
                </div>

                <span>📶</span>
              </div>

              <div className="cargo-status">
                ✓ Condições normais
              </div>

            </div>

          </div>


          <button
            type="button"
            className="slider-arrow prev"
            id="prevSlide"
            onClick={() => mostrarSlide(slideAnterior(slideAtual, SLIDES.length))}
          >‹</button>
          <button
            type="button"
            className="slider-arrow next"
            id="nextSlide"
            onClick={() => mostrarSlide(proximoSlide(slideAtual, SLIDES.length))}
          >›</button>

          <div className="slider-dots" id="sliderDots">
            {SLIDES.map((slide, indice) => (
              <button
                key={slide.imagem}
                type="button"
                className={indice === slideAtual ? "active" : undefined}
                aria-label={`Slide ${indice + 1}`}
                onClick={() => mostrarSlide(indice)}
              />
            ))}
          </div>
        </section>


        {/* PROJETO */}
        <section className="section" id="projeto">

          <div className="container">

            <div className="section-heading">
              <span className="eyebrow blue">TECNOLOGIA APLICADA</span>

              <h2>O que é o <span>ColdTrack?</span></h2>

              <p>
                Uma solução de monitoramento IoT criada para aumentar
                a visibilidade das condições ambientais da cadeia fria.
              </p>
            </div>


            <div className="features">

              <article className="feature">
                <div>🌡️</div>
                <h3>Temperatura</h3>
                <p>Monitoramento das condições térmicas da carga.</p>
              </article>

              <article className="feature">
                <div>💧</div>
                <h3>Umidade</h3>
                <p>Acompanhamento da umidade relativa do ambiente.</p>
              </article>

              <article className="feature">
                <div>📶</div>
                <h3>Conectividade</h3>
                <p>Telemetria através da conectividade Wi-Fi.</p>
              </article>

              <article className="feature">
                <div>☁️</div>
                <h3>Cloud</h3>
                <p>Dados enviados e armazenados no ThingSpeak.</p>
              </article>

              <article className="feature">
                <div>📊</div>
                <h3>Dashboard</h3>
                <p>Informações transformadas em indicadores operacionais.</p>
              </article>

            </div>

          </div>
        </section>


        {/* DIFERENCIAL */}
        <section className="section dark-section" id="diferencial">

          <div className="container differential">

            <div className="differential-content">

              <span className="eyebrow">NOSSA PROPOSTA</span>

              <h2>
                Tecnologia acessível para{" "}
                <span>proteger a cadeia fria.</span>
              </h2>

              <p>
                O ColdTrack une hardware de baixo custo, processamento
                Edge, conectividade e uma interface intuitiva para
                acompanhar condições importantes durante o transporte.
              </p>

              <ul className="check-list">
                <li>✓ Monitoramento praticamente em tempo real</li>
                <li>✓ Hardware IoT de baixo custo</li>
                <li>✓ Integração com serviços em nuvem</li>
                <li>✓ Dashboard responsivo e PWA</li>
                <li>✓ Arquitetura preparada para evolução</li>
              </ul>

            </div>


            <div className="architecture-card">

              <span>DHT11</span>
              <b>↓</b>

              <span>ESP32-C3</span>
              <b>↓</b>

              <span>Wi-Fi</span>
              <b>↓</b>

              <span>ThingSpeak</span>
              <b>↓</b>

              <span>ColdTrack Control</span>

            </div>

          </div>
        </section>


        {/* QUEM SOMOS */}
        <section className="section" id="quem-somos">

          <div className="container about-grid">

            <div>

              <span className="eyebrow blue">NOSSA EQUIPE</span>

              <h2>Quem <span>somos</span></h2>

              <p className="about-text">
                Somos uma equipe de estudantes do 4º período,
                unidos pelo interesse em tecnologia, inovação e
                aplicações voltadas ao agronegócio.
              </p>

              <p className="about-text">
                O ColdTrack foi desenvolvido como parte do Projeto
                Integrador, transformando conhecimentos de IoT,
                programação e computação em nuvem em uma solução
                aplicada a um problema real.
              </p>

            </div>


            <div className="team">

              <div>Antonio Henzo</div>
              <div>Everson</div>
              <div>Emerson Luiz</div>
              <div>Gabriel Eduardo</div>
              <div>José Alanberg</div>
              <div>Marcelo Barbosa</div>

            </div>

          </div>
        </section>


        {/* LOGIN */}
        <section className="section login-section" id="login">

          <div className="container login-grid">

            <div>

              <span className="eyebrow blue">COLDTRACK CONTROL</span>

              <h2>
                Acesse o ambiente de{" "}
                <span>monitoramento.</span>
              </h2>

              <p>
                Acompanhe temperatura, umidade, conectividade
                e situação operacional da carga em um único painel.
              </p>

            </div>


            <form className="login-card" id="loginForm" onSubmit={enviarLogin}>

              <h3>Acesse sua conta</h3>

              <label htmlFor="email">E-mail</label>

              <input type="email" id="email" name="email" placeholder="seu@email.com" required />

              <label htmlFor="password">Senha</label>

              <input type="password" id="password" name="password" placeholder="••••••••" required />

              <button type="submit" className="btn-primary full" disabled={entrando}>
                Entrar
              </button>{" "}

              <small role="alert">{avisoLogin}</small>

              <p className="login-cadastro">
                Empresa nova? <Link to="/cadastro">Cadastre sua empresa</Link>
              </p>

            </form>

          </div>
        </section>


        {/* CONTATO */}
        <section className="contact" id="contato">

          <div className="container contact-grid">

            <div>

              <span className="eyebrow">FALE CONOSCO</span>

              <h2>Entre em <span>contato</span></h2>

              <p>
                Estamos abertos a parcerias, sugestões e oportunidades
                relacionadas à tecnologia, IoT e cadeia fria.
              </p>

            </div>


            <div className="contact-items">

              <div>
                <strong>📧 E-mail</strong>
                <span>contato@coldtrack.com</span>
              </div>

              <div>
                <strong>📍 Região</strong>
                <span>Petrolina/PE • Juazeiro/BA</span>
              </div>

              <div>
                <strong>🎓 Projeto</strong>
                <span>Projeto Integrador — 4º Período</span>
              </div>

            </div>

          </div>
        </section>

      </main>


      <footer>

        <div className="container footer-content">

          <div className="logo">
            <span className="logo-icon">❄</span>{" "}
            <span>
              <strong>ColdTrack</strong>
              <small>CONTROL</small>
            </span>
          </div>

          <p>Projeto Integrador — 2026</p>

          <p>Da origem ao destino, sua carga monitorada.</p>

        </div>

      </footer>

      <ChatWidget />

    </div>
  );

}
