// Preparação dos testes de componente: matchers do jest-dom e limpeza da tela a cada teste.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
