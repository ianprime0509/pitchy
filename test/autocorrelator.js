/**
 * @typedef {import("../index.js").Buffer} Buffer
 */
import { suite } from "uvu";
import * as assert from "uvu/assert";

import { Autocorrelator } from "../index.js";

const test = suite("Autocorrelator");

/**
 * @template {Buffer} T
 * @typedef {{
 *  description: string,
 *  supplier: (inputLength: number) => Autocorrelator<T>,
 *  arrayConverter: (arr: number[]) => T,
 * }} InputType
 * @type {Array<InputType<Buffer>>}
 */ const inputTypes = [
  {
    description: "<Float32Array>",
    supplier: Autocorrelator.forFloat32Array,
    arrayConverter: (arr) => Float32Array.from(arr),
  },
  {
    description: "<Float64Array>",
    supplier: Autocorrelator.forFloat64Array,
    arrayConverter: (arr) => Float64Array.from(arr),
  },
  {
    description: "<number[]>",
    supplier: Autocorrelator.forNumberArray,
    arrayConverter: (arr) => arr,
  },
];

test("constructor throws an error if the input length is too small", () => {
  assert.throws(
    () => new Autocorrelator(0, (length) => new Float32Array(length)),
    "Input length must be at least one"
  );
  assert.throws(
    () => new Autocorrelator(-5, (length) => new Float32Array(length)),
    "Input length must be at least one"
  );
});

test("inputLength returns the configured input length", () => {
  assert.equal(Autocorrelator.forFloat32Array(5).inputLength, 5);
});

test("autocorrelate throws an error if the input is not of the configured input length", () => {
  const autocorrelator = Autocorrelator.forFloat32Array(5);
  assert.throws(
    () => autocorrelator.autocorrelate(Float32Array.of(1, 2, 3)),
    "Input must have length 5 but had length 3"
  );
});

for (const bufferType of inputTypes) {
  for (const inputType of inputTypes) {
    test(`autocorrelate (buffer: ${bufferType.description}, input: ${inputType.description})`, () => {
      /**
       * @param {number[]} input
       * @param {number[]} expects
       */
      const assertAutocorrelationIs = (input, expects) => {
        const autocorrelator = bufferType.supplier(input.length);
        const actual = Array.from(
          autocorrelator.autocorrelate(inputType.arrayConverter(input))
        );

        let match = actual.length === expects.length;
        if (match) {
          for (let i = 0; i < expects.length; i++) {
            if (Math.abs(actual[i] - expects[i]) > 0.00005) {
              match = false;
              break;
            }
          }
        }
        if (!match) {
          assert.unreachable(
            `expected autocorrelation of ${input} to be ${expects}, got ${actual}`
          );
        }
      };

      assertAutocorrelationIs([1, -1], [2, -1]);
      assertAutocorrelationIs([1, 2, 1], [6, 4, 1]);
      assertAutocorrelationIs([1, 0, 1, 0], [2, 0, 1, 0]);
      assertAutocorrelationIs([1, 2, 3, 4], [30, 20, 11, 4]);
      assertAutocorrelationIs(
        [1, -1, 1, -1, 1, -1, 1, -1],
        [8, -7, 6, -5, 4, -3, 2, -1]
      );
    });
  }
}

test.run();
