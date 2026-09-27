const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll("#sliderDots button");

const nextButton = document.getElementById("nextSlide");
const prevButton = document.getElementById("prevSlide");

let currentSlide = 0;
let sliderTimer;


/* ========================================
   EXIBIR SLIDE
======================================== */

function showSlide(index) {

  slides.forEach(slide => {
    slide.classList.remove("active");
  });

  dots.forEach(dot => {
    dot.classList.remove("active");
  });

  slides[index].classList.add("active");
  dots[index].classList.add("active");

  currentSlide = index;
}


/* ========================================
   PRÓXIMO
======================================== */

function nextSlide() {

  let index = currentSlide + 1;

  if (index >= slides.length) {
    index = 0;
  }

  showSlide(index);
}


/* ========================================
   ANTERIOR
======================================== */

function previousSlide() {

  let index = currentSlide - 1;

  if (index < 0) {
    index = slides.length - 1;
  }

  showSlide(index);
}


/* ========================================
   AUTOPLAY
======================================== */

function startSlider() {

  clearInterval(sliderTimer);

  sliderTimer = setInterval(() => {
    nextSlide();
  }, 6000);
}


nextButton.addEventListener("click", () => {
  nextSlide();
  startSlider();
});


prevButton.addEventListener("click", () => {
  previousSlide();
  startSlider();
});


dots.forEach((dot, index) => {

  dot.addEventListener("click", () => {
    showSlide(index);
    startSlider();
  });

});


startSlider();


/* ========================================
   MENU MOBILE
======================================== */

const menuToggle = document.getElementById("menuToggle");
const menu = document.getElementById("menu");


menuToggle.addEventListener("click", () => {

  const open = menu.classList.toggle("open");

  menuToggle.setAttribute(
    "aria-expanded",
    open
  );

});


document.querySelectorAll(".menu a").forEach(link => {

  link.addEventListener("click", () => {

    menu.classList.remove("open");

    menuToggle.setAttribute(
      "aria-expanded",
      "false"
    );

  });

});


/* ========================================
   HEADER AO ROLAR
======================================== */

const header = document.getElementById("header");


window.addEventListener("scroll", () => {

  if (window.scrollY > 50) {

    header.style.background =
      "rgba(4,24,39,.96)";

  } else {

    header.style.background =
      "rgba(4,24,39,.78)";

  }

});


/* ========================================
   LOGIN
======================================== */

const loginForm = document.getElementById("loginForm");


const loginAviso = loginForm.querySelector("small");


loginForm.addEventListener("submit", async event => {

  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("password").value;
  const botao = loginForm.querySelector("button[type=submit]");

  if (!email || !senha) {
    loginAviso.textContent = "Informe e-mail e senha.";
    return;
  }

  botao.disabled = true;

  try {

    const response = await fetch(`${CONFIG.API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const dados = await response.json().catch(() => ({}));

    if (!response.ok) {
      loginAviso.textContent = (dados.erros || ["Não foi possível entrar."]).join(" ");
      return;
    }

    salvarSessao(dados.token, dados.usuario);
    window.location.href = "dashboard.html";

  }

  catch (falha) {

    loginAviso.textContent = "Sem conexão com o servidor. Confira a internet e tente de novo.";

  }

  finally {

    botao.disabled = false;

  }

});