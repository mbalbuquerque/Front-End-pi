// Índices do carrossel da página inicial: dá a volta nas pontas.

export function proximoSlide(atual, total) {

  return (atual + 1) % total;

}


export function slideAnterior(atual, total) {

  return (atual - 1 + total) % total;

}
