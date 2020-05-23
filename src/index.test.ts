/*
 * Copyright 2018 Ian Johnson
 *
 * This is free software, distributed under the MIT license.  A copy of the
 * license can be found in the LICENSE file in the project root, or at
 * https://opensource.org/licenses/MIT.
 */
/* eslint-env jest */

import { Autocorrelator, Buffer, PitchDetector } from ".";

import { toBeDeepCloseTo } from "jest-matcher-deep-close-to";
import toBeWithinPercent from "jest-matcher-percent-error";

expect.extend({ toBeDeepCloseTo, toBeWithinPercent });

/**
 * Returns a Float32Array populated with sine wave data.
 */
function sineWave(
  length: number,
  pitch: number,
  amplitude: number,
  sampleRate: number
): number[] {
  const frequency = pitch / sampleRate;
  const result = new Array(length);

  for (let i = 0; i < result.length; i++) {
    result[i] = amplitude * Math.sin(2 * Math.PI * frequency * i);
  }

  return result;
}

describe("Autocorrelator", () => {
  describe("constructor", () => {
    test("throws an error if the input length is too small", () => {
      expect(
        () => new Autocorrelator(0, (length) => new Float32Array(length))
      ).toThrow("Input length must be at least one");
      expect(
        () => new Autocorrelator(-5, (length) => new Float32Array(length))
      ).toThrow("Input length must be at least one");
    });
  });

  interface InputType<T extends Buffer<number>> {
    description: string;
    supplier: (inputLength: number) => Autocorrelator<T>;
    arrayConverter: (arr: number[]) => T;
  }

  const inputTypes: InputType<Buffer<number>>[] = [
    {
      description: "<Float32Array>",
      supplier: Autocorrelator.forFloat32Array,
      arrayConverter: (arr): Float32Array => Float32Array.from(arr),
    },
    {
      description: "<Float64Array>",
      supplier: Autocorrelator.forFloat64Array,
      arrayConverter: (arr): Float64Array => Float64Array.from(arr),
    },
    {
      description: "<number[]>",
      supplier: Autocorrelator.forNumberArray,
      arrayConverter: (arr): number[] => arr,
    },
  ];

  for (const bufferType of inputTypes) {
    describe(bufferType.description, () => {
      describe("autocorrelate()", () => {
        const autocorrelate = (input: ArrayLike<number>): ArrayLike<number> => {
          const autocorrelator = bufferType.supplier(input.length);
          return autocorrelator.autocorrelate(input);
        };

        for (const inputType of inputTypes) {
          describe(`input: ${inputType.description}`, () => {
            test("computes the autocorrelation of small datasets", () => {
              const ac = (input: number[]): number[] =>
                Array.from(autocorrelate(inputType.arrayConverter(input)));

              expect(ac([1, -1])).toBeDeepCloseTo([2, -1], 6);

              expect(ac([1, 2, 1])).toBeDeepCloseTo([6, 4, 1], 6);

              expect(ac([1, 0, 1, 0])).toBeDeepCloseTo([2, 0, 1, 0], 6);

              expect(ac([1, 2, 3, 4])).toBeDeepCloseTo([30, 20, 11, 4], 6);

              expect(ac([1, -1, 1, -1, 1, -1, 1, -1])).toBeDeepCloseTo(
                [8, -7, 6, -5, 4, -3, 2, -1],
                6
              );
            });
          });
        }
      });
    });
  }
});

describe("PitchDetector", () => {
  describe("constructor", () => {
    test("throws an error if the input length is too small", () => {
      expect(
        () => new PitchDetector(0, (length) => new Float32Array(length))
      ).toThrow("Input length must be at least one");
      expect(
        () => new PitchDetector(-5, (length) => new Float32Array(length))
      ).toThrow("Input length must be at least one");
    });
  });

  interface InputType<T extends Buffer<number>> {
    description: string;
    supplier: (inputLength: number) => PitchDetector<T>;
    arrayConverter: (arr: number[]) => T;
  }

  const inputTypes: InputType<Buffer<number>>[] = [
    {
      description: "<Float32Array>",
      supplier: PitchDetector.forFloat32Array,
      arrayConverter: (arr): Float32Array => Float32Array.from(arr),
    },
    {
      description: "<Float64Array>",
      supplier: PitchDetector.forFloat64Array,
      arrayConverter: (arr): Float64Array => Float64Array.from(arr),
    },
    {
      description: "<number[]>",
      supplier: PitchDetector.forNumberArray,
      arrayConverter: (arr): number[] => arr,
    },
  ];

  for (const bufferType of inputTypes) {
    describe(bufferType.description, () => {
      describe("findPitch()", () => {
        const findPitch = (
          input: ArrayLike<number>,
          sampleRate: number
        ): [number, number] => {
          const detector = bufferType.supplier(input.length);
          return detector.findPitch(input, sampleRate);
        };

        for (const inputType of inputTypes) {
          describe(`input: ${inputType.description}`, () => {
            for (const amplitude of [0.5, 1.0, 2.0]) {
              describe(`with a sine wave of amplitude ${amplitude}`, () => {
                for (const frequency of [440, 880, 245, 100]) {
                  describe(`and frequency ${frequency}`, () => {
                    const sampleRate = 44100;
                    const input = inputType.arrayConverter(
                      sineWave(1000, frequency, amplitude, sampleRate)
                    );

                    test("finds the pitch to within 1% error", () => {
                      expect(findPitch(input, sampleRate)[0]).toBeWithinPercent(
                        frequency,
                        1
                      );
                    });

                    test("finds at least a clarity of 0.99", () => {
                      expect(findPitch(input, sampleRate)[1]).toBeGreaterThan(
                        0.99
                      );
                    });

                    test("finds at most a clarity of 1.0", () => {
                      expect(
                        findPitch(input, sampleRate)[1]
                      ).toBeLessThanOrEqual(1.0);
                    });
                  });
                }
              });
            }

            test("returns a clarity of 0 when given an array of zeros", () => {
              const zeros = new Array(1000);
              zeros.fill(0);
              expect(findPitch(inputType.arrayConverter(zeros), 44100)[1]).toBe(
                0
              );
            });
          });
        }
      });
    });
  }
});
