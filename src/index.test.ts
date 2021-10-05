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

expect.extend({
  toBeWithinCents(received, expected, cents) {
    const centsDiff = 1200 * Math.log2(received / expected);
    const pass = Math.abs(centsDiff) <= cents;
    return {
      message: () =>
        `expected ${expected} ${
          pass ? "not to" : "to"
        } be within ${cents} of ${received}, but was ${centsDiff} cents away`,
      pass,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeWithinCents(expected: number, cents: number): R;
    }
  }
}

type WaveformGenerator = (
  length: number,
  pitch: number,
  amplitude: number,
  sampleRate: number
) => number[];

function waveform(unitWave: (t: number) => number): WaveformGenerator {
  return (length, pitch, amplitude, sampleRate): number[] => {
    const frequency = pitch / sampleRate;
    const result = new Array(length);

    for (let i = 0; i < result.length; i++) {
      result[i] = amplitude * unitWave(frequency * i);
    }

    return result;
  };
}

const sineWave = waveform((t) => Math.sin(2 * Math.PI * t));
const squareWave = waveform((t) => (t % 1.0 >= 0.5 ? 1 : -1));
const triangleWave = waveform((t) => 4 * Math.abs(t - Math.round(t)) - 1);
const sawtoothWave = waveform((t) => 2 * (t - Math.round(t)));

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

  describe("get inputLength()", () => {
    test("returns the configured input length", () => {
      expect(Autocorrelator.forFloat32Array(5).inputLength).toBe(5);
    });
  });

  describe("autocorrelate()", () => {
    test("throws an error if the input is not of the configured input length", () => {
      const autocorrelator = Autocorrelator.forFloat32Array(5);
      expect(() =>
        autocorrelator.autocorrelate(Float32Array.of(1, 2, 3))
      ).toThrow("Input must have length 5 but had length 3");
    });
  });

  interface InputType<T extends Buffer> {
    description: string;
    supplier: (inputLength: number) => Autocorrelator<T>;
    arrayConverter: (arr: number[]) => T;
  }

  const inputTypes: InputType<Buffer>[] = [
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

              expect(ac([1, -1])).toBeDeepCloseTo([2, -1], 5);

              expect(ac([1, 2, 1])).toBeDeepCloseTo([6, 4, 1], 5);

              expect(ac([1, 0, 1, 0])).toBeDeepCloseTo([2, 0, 1, 0], 5);

              expect(ac([1, 2, 3, 4])).toBeDeepCloseTo([30, 20, 11, 4], 5);

              expect(ac([1, -1, 1, -1, 1, -1, 1, -1])).toBeDeepCloseTo(
                [8, -7, 6, -5, 4, -3, 2, -1],
                5
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

  describe("get inputLength()", () => {
    test("returns the configured input length", () => {
      expect(PitchDetector.forFloat32Array(10).inputLength).toBe(10);
    });
  });

  describe("findPitch()", () => {
    test("throws an error if the input is not of the configured input length", () => {
      const detector = PitchDetector.forFloat32Array(8);
      expect(() => detector.findPitch(Float32Array.of(1, 2, 3), 5)).toThrow(
        "Input must have length 8 but had length 3"
      );
    });

    test("returns a clarity of 0 when given an array of zeros", () => {
      const detector = float32InputType.supplier(2048);
      const zeros = new Float32Array(2048);
      expect(detector.findPitch(zeros, 48000)[1]).toBe(0);
    });
  });

  interface InputType<T extends Buffer> {
    description: string;
    supplier: (inputLength: number) => PitchDetector<T>;
    arrayConverter: (arr: number[]) => T;
  }

  const float32InputType: InputType<Float32Array> = {
    description: "<Float32Array>",
    supplier: PitchDetector.forFloat32Array,
    arrayConverter: (arr): Float32Array => Float32Array.from(arr),
  };
  const float64InputType: InputType<Float64Array> = {
    description: "<Float64Array>",
    supplier: PitchDetector.forFloat64Array,
    arrayConverter: (arr): Float64Array => Float64Array.from(arr),
  };
  const numberArrayInputType: InputType<number[]> = {
    description: "<number[]>",
    supplier: PitchDetector.forNumberArray,
    arrayConverter: (arr): number[] => arr,
  };

  const inputTypes = [float32InputType, float64InputType, numberArrayInputType];

  interface Waveform {
    name: string;
    generator: WaveformGenerator;
    minClarity: number;
    maxCents: number;
  }

  const sineWaveform: Waveform = {
    name: "sine wave",
    generator: sineWave,
    minClarity: 0.99,
    maxCents: 2,
  };
  const squareWaveform: Waveform = {
    name: "square wave",
    generator: squareWave,
    minClarity: 0.97,
    maxCents: 3,
  };
  const triangleWaveform: Waveform = {
    name: "triangle wave",
    generator: triangleWave,
    minClarity: 0.99,
    maxCents: 2,
  };
  const sawtoothWaveform = {
    name: "sawtooth wave",
    generator: sawtoothWave,
    minClarity: 0.95,
    maxCents: 3,
  };

  const waveforms: Waveform[] = [
    sineWaveform,
    squareWaveform,
    triangleWaveform,
    sawtoothWaveform,
  ];

  const runTests = (
    bufferType: InputType<Buffer>,
    inputType: InputType<Buffer>,
    waveform: Waveform,
    amplitude: number,
    frequency: number,
    sampleRate: number,
    windowSize: number
  ): void => {
    const findPitch = (
      input: ArrayLike<number>,
      sampleRate: number
    ): [number, number] => {
      const detector = bufferType.supplier(input.length);
      return detector.findPitch(input, sampleRate);
    };

    const input = inputType.arrayConverter(
      waveform.generator(windowSize, frequency, amplitude, sampleRate)
    );

    const [pitch, clarity] = findPitch(input, sampleRate);

    describe(`findPitch() {input: ${inputType.description}, waveform: ${waveform.name}, amplitude: ${amplitude}, frequency: ${frequency}, sample rate: ${sampleRate}, window size: ${windowSize}}`, () => {
      test("finds the pitch to within 1% error", () => {
        expect(pitch).toBeWithinPercent(frequency, 1);
      });

      test(`finds the pitch to within ${waveform.maxCents} cents`, () => {
        expect(pitch).toBeWithinCents(frequency, waveform.maxCents);
      });

      test(`finds at least a clarity of ${waveform.minClarity}`, () => {
        expect(clarity).toBeGreaterThan(waveform.minClarity);
      });

      test("finds at most a clarity of 1.0", () => {
        expect(clarity).toBeLessThanOrEqual(1.0);
      });
    });
  };

  // The primary buffer and input types are expected to be Float32Array. For
  // other combinations, we run reduced test sets so that the number of tests
  // doesn't explode too much.
  for (const bufferType of [float64InputType, numberArrayInputType]) {
    describe(bufferType.description, () => {
      for (const inputType of inputTypes) {
        runTests(bufferType, inputType, sineWaveform, 1.0, 440, 48000, 2048);
      }
    });
  }

  describe(float32InputType.description, () => {
    for (const inputType of [float64InputType, numberArrayInputType]) {
      runTests(
        float32InputType,
        inputType,
        sineWaveform,
        1.0,
        440,
        48000,
        2048
      );
    }

    for (const waveform of waveforms) {
      for (const amplitude of [0.5, 1.0, 2.0]) {
        for (const frequency of [
          440, // A4
          880, // A5
          245,
          100,
          440 * 2 ** (9 / 12), // F#5
        ]) {
          for (const sampleRate of [44100, 48000]) {
            for (const inputSize of [2048, 4092]) {
              runTests(
                float32InputType,
                float32InputType,
                waveform,
                amplitude,
                frequency,
                sampleRate,
                inputSize
              );
            }
          }
        }
      }
    }
  });
});
