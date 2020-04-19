/*
 * Copyright 2018 Ian Johnson
 *
 * This is free software, distributed under the MIT license.  A copy of the
 * license can be found in the LICENSE file in the project root, or at
 * https://opensource.org/licenses/MIT.
 */
/* eslint-env jest */

import { findPitch, Autocorrelator, Buffer } from '.';

import { toBeDeepCloseTo } from 'jest-matcher-deep-close-to';
import toBeWithinPercent from 'jest-matcher-percent-error';

expect.extend({ toBeDeepCloseTo, toBeWithinPercent });

/**
 * Returns a Float32Array populated with sine wave data.
 */
function sineWave(
  length: number,
  pitch: number,
  sampleRate: number
): Float32Array {
  const frequency = pitch / sampleRate;
  const result = new Float32Array(length);

  for (let i = 0; i < result.length; i++) {
    result[i] = Math.sin(2 * Math.PI * frequency * i);
  }

  return result;
}

describe('Autocorrelator', () => {
  describe('constructor', () => {
    test('throws an error if the input length is too small', () => {
      expect(
        () => new Autocorrelator(0, (length) => new Float32Array(length))
      ).toThrow('Input length must be at least one');
      expect(
        () => new Autocorrelator(-5, (length) => new Float32Array(length))
      ).toThrow('Input length must be at least one');
    });
  });

  interface InputType<T extends Buffer<number>> {
    description: string;
    supplier: (inputLength: number) => Autocorrelator<T>;
    arrayConverter: (arr: number[]) => T;
  }

  const inputTypes: InputType<Buffer<number>>[] = [
    {
      description: '<Float32Array>',
      supplier: Autocorrelator.forFloat32Array,
      arrayConverter: (arr): Float32Array => Float32Array.from(arr),
    },
    {
      description: '<Float64Array>',
      supplier: Autocorrelator.forFloat64Array,
      arrayConverter: (arr): Float64Array => Float64Array.from(arr),
    },
    {
      description: '<number[]>',
      supplier: Autocorrelator.forNumberArray,
      arrayConverter: (arr): number[] => arr,
    },
  ];

  for (const inputType of inputTypes) {
    describe(inputType.description, () => {
      describe('autocorrelate()', () => {
        const autocorrelate = (input: ArrayLike<number>): ArrayLike<number> => {
          const autocorrelator = inputType.supplier(input.length);
          return autocorrelator.autocorrelate(input);
        };

        for (const arrayType of inputTypes) {
          describe(`input: ${arrayType.description}`, () => {
            test('computes the autocorrelation of small datasets', () => {
              expect(
                autocorrelate(arrayType.arrayConverter([1, -1]))
              ).toBeDeepCloseTo([2, -1], 6);

              expect(
                autocorrelate(arrayType.arrayConverter([1, 2, 1]))
              ).toBeDeepCloseTo([6, 4, 1], 6);

              expect(
                autocorrelate(arrayType.arrayConverter([1, 0, 1, 0]))
              ).toBeDeepCloseTo([2, 0, 1, 0], 6);

              expect(
                autocorrelate(arrayType.arrayConverter([1, 2, 3, 4]))
              ).toBeDeepCloseTo([30, 20, 11, 4], 6);

              expect(
                autocorrelate(
                  arrayType.arrayConverter([1, -1, 1, -1, 1, -1, 1, -1])
                )
              ).toBeDeepCloseTo([8, -7, 6, -5, 4, -3, 2, -1], 6);
            });
          });
        }
      });
    });
  }
});

describe('findPitch()', () => {
  test('finds the pitch of a sine wave to within 1% error', () => {
    expect(findPitch(sineWave(1000, 440, 44100), 44100)[0]).toBeWithinPercent(
      440,
      1
    );
    expect(findPitch(sineWave(1000, 880, 44100), 44100)[0]).toBeWithinPercent(
      880,
      1
    );
    expect(findPitch(sineWave(1000, 245, 44100), 44100)[0]).toBeWithinPercent(
      245,
      1
    );
    expect(findPitch(sineWave(1000, 100, 44100), 44100)[0]).toBeWithinPercent(
      100,
      1
    );
  });

  test('finds at least a clarity of 0.99 when given a sine wave', () => {
    expect(findPitch(sineWave(1000, 440, 44100), 44100)[1]).toBeGreaterThan(
      0.99
    );
    expect(findPitch(sineWave(1000, 880, 44100), 44100)[1]).toBeGreaterThan(
      0.99
    );
    expect(findPitch(sineWave(1000, 245, 44100), 44100)[1]).toBeGreaterThan(
      0.99
    );
    expect(findPitch(sineWave(1000, 100, 44100), 44100)[1]).toBeGreaterThan(
      0.99
    );
  });

  test('returns a confidence of 0 when given an array of zeroes', () => {
    const zeroes = new Array(1000);
    zeroes.fill(0);
    expect(findPitch(zeroes, 44100)[1]).toBe(0);
  });
});
