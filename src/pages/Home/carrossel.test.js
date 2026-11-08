import { describe, expect, it } from "vitest";
import { proximoSlide, slideAnterior } from "./carrossel.js";

describe("carrossel", () => {

  it("avança e volta ao primeiro depois do último", () => {
    expect(proximoSlide(0, 3)).toBe(1);
    expect(proximoSlide(2, 3)).toBe(0);
  });

  it("recua e vai ao último antes do primeiro", () => {
    expect(slideAnterior(1, 3)).toBe(0);
    expect(slideAnterior(0, 3)).toBe(2);
  });

});
