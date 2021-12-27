/* eslint-env jest */
import { ceilPow2 } from "./util";

describe("ceilPow2", () => {
  test("returns the next power of 2 at least as large as the input", () => {
    expect(ceilPow2(1)).toBe(1);
    expect(ceilPow2(2)).toBe(2);
    expect(ceilPow2(5)).toBe(8);
    expect(ceilPow2(255)).toBe(256);
  });
});
