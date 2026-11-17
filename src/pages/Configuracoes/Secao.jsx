// Seção da tela de Configurações (design system, fase 8): título e explicação
// à esquerda, conteúdo à direita. "larga" empilha os dois (tabelas).
//
//   <Secao id="alertasCelular" titulo="Alertas no celular" apoio={<p>...</p>}>
//     <button>...</button>
//   </Secao>

export default function Secao({ id, titulo, apoio = null, larga = false, className = "", children }) {

  const classes = ["panel", "config-secao", larga ? "config-secao--larga" : "", className].filter(Boolean).join(" ");

  return (
    <article className={classes} id={id}>
      <div className="config-cabeca">
        <h2>{titulo}</h2>
        {apoio}
      </div>
      <div className="config-corpo">
        {children}
      </div>
    </article>
  );

}
