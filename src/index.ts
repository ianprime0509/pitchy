/*
 * Copyright 2018-2020 Ian Johnson
 *
 * This is free software, distributed under the MIT license. A copy of the
 * license can be found in the LICENSE file in the project root, or at
 * https://opensource.org/licenses/MIT.
 */

import FFT from "fft.js";
import np2 from "next-pow-2";

export type Buffer = Float32Array | Float64Array | number[];

/**
 * A class that can perform autocorrelation on input arrays of a given size.
 *
 * The class holds internal buffers so that no additional allocations are
 * necessary while performing the operation.
 *
 * @typeParam T - the buffer type to use. While inputs to the autocorrelation
 * process can be any array-like type, the output buffer (whether provided
 * explicitly or using a fresh buffer) is always of this type.
 */
export class Autocorrelator<T extends Buffer> {
  private readonly _inputLength: number;
  private _fft: FFT;
  private _bufferSupplier: (size: number) => T;
  private _paddedInputBuffer: T;
  private _transformBuffer: T;
  private _inverseBuffer: T;

  /**
   * A helper method to create an {@link Autocorrelator} using {@link Float32Array} buffers.
   *
   * @param inputLength - the input array length to support
   */
  static forFloat32Array(inputLength: number): Autocorrelator<Float32Array> {
    return new Autocorrelator(
      inputLength,
      (length) => new Float32Array(length)
    );
  }

  /**
   * A helper method to create an {@link Autocorrelator} using {@link Float64Array} buffers.
   *
   * @param inputLength - the input array length to support
   */
  static forFloat64Array(inputLength: number): Autocorrelator<Float64Array> {
    return new Autocorrelator(
      inputLength,
      (length) => new Float64Array(length)
    );
  }

  /**
   * A helper method to create an {@link Autocorrelator} using `number[]` buffers.
   *
   * @param inputLength - the input array length to support
   */
  static forNumberArray(inputLength: number): Autocorrelator<number[]> {
    return new Autocorrelator(inputLength, (length) => Array(length));
  }

  /**
   * Constructs a new {@link Autocorrelator} able to handle input arrays of the
   * given length.
   *
   * @param inputLength - the input array length to support. This `Autocorrelator`
   * will only support operation on arrays of this length.
   * @param bufferSupplier - the function to use for creating buffers, accepting
   * the length of the buffer to create and returning a new buffer of that
   * length. The values of the returned buffer need not be initialized in any
   * particular way.
   */
  constructor(inputLength: number, bufferSupplier: (length: number) => T) {
    if (inputLength < 1) {
      throw new Error(`Input length must be at least one`);
    }
    this._inputLength = inputLength;
    // We need to double the input length to get correct results, and the FFT
    // algorithm we use requires a length that's a power of 2
    this._fft = new FFT(np2(2 * inputLength));
    this._bufferSupplier = bufferSupplier;
    this._paddedInputBuffer = this._bufferSupplier(this._fft.size);
    this._transformBuffer = this._bufferSupplier(2 * this._fft.size);
    this._inverseBuffer = this._bufferSupplier(2 * this._fft.size);
  }

  /**
   * Returns the supported input length.
   *
   * @returns the supported input length
   */
  get inputLength(): number {
    return this._inputLength;
  }

  /**
   * Autocorrelates the given input data.
   *
   * @param input - the input data to autocorrelate
   * @param output - the output buffer into which to write the autocorrelated
   * data. If not provided, a new buffer will be created.
   * @returns `output`
   */
  autocorrelate(
    input: ArrayLike<number>,
    output: T = this._bufferSupplier(input.length)
  ): T {
    if (input.length !== this._inputLength) {
      throw new Error(
        `Input must have length ${this._inputLength} but had length ${input.length}`
      );
    }
    // Step 0: pad the input array with zeros
    for (let i = 0; i < input.length; i++) {
      this._paddedInputBuffer[i] = input[i];
    }
    for (let i = input.length; i < this._paddedInputBuffer.length; i++) {
      this._paddedInputBuffer[i] = 0;
    }

    // Step 1: get the DFT of the input array
    this._fft.realTransform(this._transformBuffer, this._paddedInputBuffer);
    // We need to fill in the right half of the array too
    this._fft.completeSpectrum(this._transformBuffer);
    // Step 2: multiply each entry by its conjugate
    const tb = this._transformBuffer;
    for (let i = 0; i < tb.length; i += 2) {
      tb[i] = tb[i] * tb[i] + tb[i + 1] * tb[i + 1];
      tb[i + 1] = 0;
    }
    // Step 3: perform the inverse transform
    this._fft.inverseTransform(this._inverseBuffer, this._transformBuffer);

    // This last result (the inverse transform) contains the autocorrelation
    // data, which is completely real
    for (let i = 0; i < input.length; i++) {
      output[i] = this._inverseBuffer[2 * i];
    }
    return output;
  }
}

/**
 * Returns an array of all the key maximum positions in the given input array.
 *
 * In McLeod's paper, a key maximum is the highest maximum between a positively
 * sloped zero crossing and a negatively sloped one.
 *
 * TODO: the paper by McLeod proposes doing parabolic interpolation to get more
 * accurate key maxima; right now this implementation doesn't do that, but it
 * could be implemented later.
 *
 * TODO: it may be more efficient not to construct a new output array each time,
 * but that would also make the code more complicated (more so than the changes
 * that were needed to remove the other allocations).
 */
function getKeyMaximumIndices(input: ArrayLike<number>): number[] {
  // The indices of the key maxima
  const keyIndices = [];
  // Whether the last zero crossing found was positively sloped; equivalently,
  // whether we're looking for a key maximum
  let lookingForMaximum = false;
  // The largest local maximum found so far
  let max = -Infinity;
  // The index of the largest local maximum so far
  let maxIndex = -1;

  for (let i = 1; i < input.length; i++) {
    if (input[i - 1] <= 0 && input[i] > 0) {
      // Positively sloped zero crossing
      lookingForMaximum = true;
      maxIndex = i;
      max = input[i];
    } else if (input[i - 1] > 0 && input[i] <= 0) {
      // Negatively sloped zero crossing
      lookingForMaximum = false;
      if (maxIndex !== -1) {
        keyIndices.push(maxIndex);
      }
    } else if (lookingForMaximum && input[i] > max) {
      max = input[i];
      maxIndex = i;
    }
  }

  return keyIndices;
}

/**
 * A class that can detect the pitch of a note from a time-domain input array.
 *
 * This class uses the McLeod pitch method (MPM) to detect pitches. MPM is
 * described in the paper 'A Smarter Way to Find Pitch' by Philip McLeod and
 * Geoff Wyvill
 * (http://miracle.otago.ac.nz/tartini/papers/A_Smarter_Way_to_Find_Pitch.pdf).
 *
 * The class holds internal buffers so that a minimal number of additional
 * allocations are necessary while performing the operation.
 *
 * @typeParam T - the buffer type to use internally. Inputs to the
 * pitch-detection process can be any numeric array type.
 */
export class PitchDetector<T extends Buffer> {
  private _autocorrelator: Autocorrelator<T>;
  private _nsdfBuffer: T;
  // TODO: it might be nice if this were configurable
  private readonly _clarityThreshold = 0.9;

  /**
   * A helper method to create an {@link PitchDetector} using {@link Float32Array} buffers.
   *
   * @param inputLength - the input array length to support
   */
  static forFloat32Array(inputLength: number): PitchDetector<Float32Array> {
    return new PitchDetector(inputLength, (length) => new Float32Array(length));
  }

  /**
   * A helper method to create an {@link PitchDetector} using {@link Float64Array} buffers.
   *
   * @param inputLength - the input array length to support
   */
  static forFloat64Array(inputLength: number): PitchDetector<Float64Array> {
    return new PitchDetector(inputLength, (length) => new Float64Array(length));
  }

  /**
   * A helper method to create an {@link PitchDetector} using `number[]` buffers.
   *
   * @param inputLength - the input array length to support
   */
  static forNumberArray(inputLength: number): PitchDetector<number[]> {
    return new PitchDetector(inputLength, (length) => Array(length));
  }

  /**
   * Constructs a new {@link PitchDetector} able to handle input arrays of the
   * given length.
   *
   * @param inputLength - the input array length to support. This
   * `PitchDetector` will only support operation on arrays of this length.
   * @param bufferSupplier - the function to use for creating buffers, accepting
   * the length of the buffer to create and returning a new buffer of that
   * length. The values of the returned buffer need not be initialized in any
   * particular way.
   */
  constructor(inputLength: number, bufferSupplier: (inputLength: number) => T) {
    this._autocorrelator = new Autocorrelator(inputLength, bufferSupplier);
    this._nsdfBuffer = bufferSupplier(inputLength);
  }

  /**
   * Returns the supported input length.
   *
   * @returns the supported input length
   */
  get inputLength(): number {
    return this._autocorrelator.inputLength;
  }

  /**
   * Returns the pitch detected using McLeod Pitch Method (MPM) along with a
   * measure of its clarity.
   *
   * The clarity is a value between 0 and 1 (potentially inclusive) that
   * represents how "clear" the pitch was. A clarity value of 1 indicates that
   * the pitch was very distinct, while lower clarity values indicate less
   * definite pitches.
   *
   * @param input - the time-domain input data
   * @param sampleRate - the sample rate at which the input data was collected
   * @returns the detected pitch, in Hz, followed by the clarity
   */
  findPitch(input: ArrayLike<number>, sampleRate: number): [number, number] {
    this._nsdf(input);
    const keyMaximumIndices = getKeyMaximumIndices(this._nsdfBuffer);
    if (keyMaximumIndices.length === 0) {
      // No key maxima means that we either don't have enough data to analyze or
      // that the data was flawed (such as an input array of zeroes)
      return [0, 0];
    }
    // The highest key maximum
    const nMax = Math.max(...keyMaximumIndices.map((i) => this._nsdfBuffer[i]));
    // Following the paper, we return the pitch corresponding to the first key
    // maximum higher than K * nMax. This is guaranteed not to be undefined, since
    // we know of at least one key maximum satisfying this condition (whichever
    // key maximum gave us nMax).
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const resultIndex = keyMaximumIndices.find(
      (i) => this._nsdfBuffer[i] >= this._clarityThreshold * nMax
    )!;

    // Due to floating point errors, the clarity may occasionally come out to be
    // slightly over 1.0. We can avoid incorrect results by clamping the value.
    const clarity = Math.min(this._nsdfBuffer[resultIndex], 1.0);
    return [sampleRate / resultIndex, clarity];
  }

  /**
   * Computes the NSDF of the input and stores it in the internal buffer. This
   * is equation (9) in the McLeod pitch method paper.
   */
  private _nsdf(input: ArrayLike<number>): void {
    // The function r'(tau) is the autocorrelation
    this._autocorrelator.autocorrelate(input, this._nsdfBuffer);
    // The function m'(tau) (defined in equation (6)) can be computed starting
    // with m'(0), which is equal to 2r'(0), and then iteratively modified to
    // get m'(1), m'(2), etc. For example, to get m'(1), we take m'(0) and
    // subtract x_0^2 and x_{W-1}^2. Then, to get m'(2), we take m'(1) and
    // subtract x_1^2 and x_{W-2}^2, and further values are similar (see the
    // note at the end of section 6 in the MPM paper).
    //
    // The resulting array values are 2 * r'(tau) / m'(tau). We use m below as
    // the incremental value of m'.
    let m = 2 * this._nsdfBuffer[0];
    let i: number;
    // As pointed out by issuefiler on GitHub, we can take advantage of the fact
    // that m will never increase to avoid division by zero by ending this loop
    // once m === 0. The rest of the array values after m becomes 0 will just be
    // set to 0 themselves. We actually check for m > 0 rather than m === 0
    // because there may be small floating-point errors that cause m to become
    // negative rather than exactly 0.
    for (i = 0; i < this._nsdfBuffer.length && m > 0; i++) {
      this._nsdfBuffer[i] = (2 * this._nsdfBuffer[i]) / m;
      m -= input[i] ** 2 + input[input.length - i - 1] ** 2;
    }
    // If there are any array values remaining, it means m === 0 for those
    // values of tau, so we can just set them to 0
    for (; i < this._nsdfBuffer.length; i++) {
      this._nsdfBuffer[i] = 0;
    }
  }
}
