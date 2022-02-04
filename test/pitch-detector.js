/**
 * @typedef {import("../index.js").Buffer} Buffer
 */
import { suite } from "uvu";
import * as assert from "uvu/assert";

import { PitchDetector } from "../index.js";

/**
 * @template {Buffer} T
 * @typedef {{
 *  description: string,
 *  supplier: (inputLength: number) => PitchDetector<T>,
 *  arrayConverter: (arr: number[]) => T,
 * }} InputType
 */
/** @type {InputType<Float32Array>} */ const float32InputType = {
  description: "<Float32Array>",
  supplier: PitchDetector.forFloat32Array,
  arrayConverter: (arr) => Float32Array.from(arr),
};
/** @type {InputType<Float64Array>} */ const float64InputType = {
  description: "<Float64Array>",
  supplier: PitchDetector.forFloat64Array,
  arrayConverter: (arr) => Float64Array.from(arr),
};
/** @type {InputType<number[]>} */ const numberArrayInputType = {
  description: "<number[]>",
  supplier: PitchDetector.forNumberArray,
  arrayConverter: (arr) => arr,
};
const inputTypes = [float32InputType, float64InputType, numberArrayInputType];

/**
 * Returns a waveform generator using the underlying unit wave function.
 *
 * @typedef {(
 *  length: number,
 *  pitch: number,
 *  amplitude: number,
 *  sampleRate: number,
 * ) => number[]} WaveformGenerator
 * @param unitWave {(t: number) => number}
 * @returns {WaveformGenerator}
 */
function waveform(unitWave) {
  return (length, pitch, amplitude, sampleRate) => {
    const frequency = pitch / sampleRate;
    /** @type {number[]} */ const result = Array(length);

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

/**
 * @typedef {{
 *  name: string,
 *  generator: WaveformGenerator,
 *  minClarity: number,
 *  maxCents: number,
 * }} Waveform
 */
/** @type {Waveform} */ const sineWaveform = {
  name: "sine wave",
  generator: sineWave,
  minClarity: 0.99,
  maxCents: 2,
};
/** @type {Waveform} */ const squareWaveform = {
  name: "square wave",
  generator: squareWave,
  minClarity: 0.97,
  maxCents: 3,
};
/** @type {Waveform} */ const triangleWaveform = {
  name: "triangle wave",
  generator: triangleWave,
  minClarity: 0.99,
  maxCents: 2,
};
/** @type {Waveform} */ const sawtoothWaveform = {
  name: "sawtooth wave",
  generator: sawtoothWave,
  minClarity: 0.95,
  maxCents: 3,
};
const waveforms = [
  sineWaveform,
  squareWaveform,
  triangleWaveform,
  sawtoothWaveform,
];

const test = suite("PitchDetector");

test("constructor throws an error if the input length is too small", () => {
  assert.throws(
    () => new PitchDetector(0, (length) => new Float32Array(length)),
    "Input length must be at least one"
  );
  assert.throws(
    () => new PitchDetector(-5, (length) => new Float32Array(length)),
    "Input length must be at least one"
  );
});

test("inputLength returns the configured input length", () => {
  assert.equal(PitchDetector.forFloat32Array(10).inputLength, 10);
});

test("findPitch throws an error if the input is not of the configured input length", () => {
  const detector = PitchDetector.forFloat32Array(8);
  assert.throws(
    () => detector.findPitch(Float32Array.of(1, 2, 3), 5),
    "Input must have length 8 but had length 3"
  );
});

test("findPitch returns a clarity of 0 when given an array of zeros", () => {
  const detector = float32InputType.supplier(2048);
  const zeros = new Float32Array(2048);
  assert.equal(detector.findPitch(zeros, 48000)[1], 0);
});

/**
 * Runs a parameterized test case for the pitch detection function.
 *
 * @param {InputType<Buffer>} bufferType
 * @param {InputType<Buffer>} inputType
 * @param {Waveform} waveform
 * @param {number} amplitude
 * @param {number} frequency
 * @param {number} sampleRate
 * @param {number} windowSize
 */
function runTests(
  bufferType,
  inputType,
  waveform,
  amplitude,
  frequency,
  sampleRate,
  windowSize
) {
  /**
   * @param {ArrayLike<number>} input
   * @param {number} sampleRate
   * @returns {[number, number]}
   */
  const findPitch = (input, sampleRate) => {
    const detector = bufferType.supplier(input.length);
    return detector.findPitch(input, sampleRate);
  };

  const input = inputType.arrayConverter(
    waveform.generator(windowSize, frequency, amplitude, sampleRate)
  );

  const [pitch, clarity] = findPitch(input, sampleRate);

  test(`findPitch (buffer: ${bufferType.description}, input: ${inputType.description}, waveform: ${waveform.name}, amplitude: ${amplitude}, frequency: ${frequency}, sample rate: ${sampleRate}, window size: ${windowSize})`, () => {
    const percentError = (100 * Math.abs(pitch - frequency)) / frequency;
    assert.ok(
      percentError <= 1,
      `expected pitch ${pitch} Hz to be within 1% of ${frequency} Hz`
    );

    const centsError = Math.abs(1200 * Math.log2(pitch / frequency));
    assert.ok(
      centsError <= waveform.maxCents,
      `expected pitch ${pitch} Hz to be within ${centsError} of ${frequency} Hz`
    );

    assert.ok(
      clarity >= waveform.minClarity,
      `expected clarity ${clarity} to be at least ${waveform.minClarity}`
    );
    assert.ok(clarity <= 1.0, `expected clarity ${clarity} to be at most 1.0`);
  });
}

// The primary buffer and input types are expected to be Float32Array. For
// other combinations, we run reduced test sets so that the number of tests
// doesn't explode too much.
for (const bufferType of [float64InputType, numberArrayInputType]) {
  for (const inputType of inputTypes) {
    runTests(bufferType, inputType, sineWaveform, 1.0, 440, 48000, 2048);
  }
}

for (const inputType of [float64InputType, numberArrayInputType]) {
  runTests(float32InputType, inputType, sineWaveform, 1.0, 440, 48000, 2048);
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

test.run();
