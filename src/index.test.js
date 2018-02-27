/*
 * Copyright 2018 Ian Johnson
 *
 * This is free software, distributed under the MIT license.  A copy of the
 * license can be found in the LICENSE file in the project root, or at
 * https://opensource.org/licenses/MIT.
 */
import { autocorrelate, findPitch } from '.';

import { toBeDeepCloseTo } from 'jest-matcher-deep-close-to';
import toBeWithinPercent from 'jest-matcher-percent-error';

expect.extend({ toBeDeepCloseTo, toBeWithinPercent });

describe('autocorrelate()', () => {
  test('computes the autocorrelation of small datasets', () => {
    expect(autocorrelate([1, -1])).toBeDeepCloseTo([2, -1], 8);
    expect(autocorrelate([1, 2, 1])).toBeDeepCloseTo([6, 4, 1], 8);
    expect(autocorrelate([1, 0, 1, 0])).toBeDeepCloseTo([2, 0, 1, 0], 8);
    expect(autocorrelate([1, 2, 3, 4])).toBeDeepCloseTo([30, 20, 11, 4], 8);
    expect(autocorrelate([1, -1, 1, -1, 1, -1, 1, -1])).toBeDeepCloseTo(
      [8, -7, 6, -5, 4, -3, 2, -1],
      8
    );
  });

  test('operates correctly on a Float32Array', () => {
    expect(autocorrelate(Float32Array.of(1, 1))).toBeDeepCloseTo([2, 1], 8);
  });

  test('operates correctly on a Float64Array', () => {
    expect(autocorrelate(Float64Array.of(1, 1))).toBeDeepCloseTo([2, 1], 8);
  });
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
    let zeroes = new Array(1000);
    zeroes.fill(0);
    expect(findPitch(zeroes, 44100)[1]).toBe(0);
  });
});

/**
 * Returns a Float32Array populated with sine wave data.
 */
function sineWave(length, pitch, sampleRate) {
  const frequency = pitch / sampleRate;
  let result = new Float32Array(length);

  for (let i = 0; i < result.length; i++) {
    result[i] = Math.sin(2 * Math.PI * frequency * i);
  }

  return result;
}
