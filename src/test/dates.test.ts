import { describe, expect, it } from "vitest";
import { normalizeDateInput } from "@/lib/dates";

describe("normalizeDateInput", () => {
  it("accepts Polish day-first order", () => {
    expect(normalizeDateInput("14.05.1920")).toBe("1920-05-14");
    expect(normalizeDateInput("14-05-1920")).toBe("1920-05-14");
    expect(normalizeDateInput("4/5/1920")).toBe("1920-05-04");
  });
  it("accepts ISO order and partial dates", () => {
    expect(normalizeDateInput("1920-05-14")).toBe("1920-05-14");
    expect(normalizeDateInput("1845")).toBe("1845");
    expect(normalizeDateInput("05.1920")).toBe("1920-05");
  });
  it("rejects impossible dates", () => {
    expect(normalizeDateInput("31.02.1920")).toBeUndefined();
    expect(normalizeDateInput("14.13.1920")).toBeUndefined();
    expect(normalizeDateInput("abc")).toBeUndefined();
  });
});
