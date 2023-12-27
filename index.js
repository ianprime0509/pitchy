import FFT from "fft.js";

/**
 * @typedef {Float32Array | Float64Array | number[]} Buffer One of the supported
 * buffer types. Other numeric array types may not work correctly.
 */

/**
 * A class that can perform autocorrelation on input arrays of a given size.
 *
 * The class holds internal buffers so that no additional allocations are
 * necessary while performing the operation.
 *
 * @template {Buffer} T the buffer type to use. While inputs to the
 * autocorrelation process can be any array-like type, the output buffer
 * (whether provided explicitly or using a fresh buffer) is always of this type.
 */
export class Autocorrelator {
  /** @private @readonly @type {number} */
  _inputLength;
  /** @private @type {FFT} */
  _fft;
  /** @private @type {(size: number) => T} */
  _bufferSupplier;
  /** @private @type {T} */
  _paddedInputBuffer;
  /** @private @type {T} */
  _transformBuffer;
  /** @private @type {T} */
  _inverseBuffer;

  /**
   * A helper method to create an {@link Autocorrelator} using
   * {@link Float32Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<Float32Array>}
   */
  static forFloat32Array(inputLength) {
    return new Autocorrelator(
      inputLength,
      (length) => new Float32Array(length),
    );
  }

  /**
   * A helper method to create an {@link Autocorrelator} using
   * {@link Float64Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<Float64Array>}
   */
  static forFloat64Array(inputLength) {
    return new Autocorrelator(
      inputLength,
      (length) => new Float64Array(length),
    );
  }

  /**
   * A helper method to create an {@link Autocorrelator} using `number[]`
   * buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<number[]>}
   */
  static forNumberArray(inputLength) {
    return new Autocorrelator(inputLength, (length) => Array(length));
  }

  /**
   * Constructs a new {@link Autocorrelator} able to handle input arrays of the
   * given length.
   *
   * @param inputLength {number} the input array length to support. This
   * `Autocorrelator` will only support operation on arrays of this length.
   * @param bufferSupplier {(length: number) => T} the function to use for
   * creating buffers, accepting the length of the buffer to create and
   * returning a new buffer of that length. The values of the returned buffer
   * need not be initialized in any particular way.
   */
  constructor(inputLength, bufferSupplier) {
    if (inputLength < 1) {
      throw new Error(`Input length must be at least one`);
    }
    this._inputLength = inputLength;
    // We need to double the input length to get correct results, and the FFT
    // algorithm we use requires a length that's a power of 2
    this._fft = new FFT(ceilPow2(2 * inputLength));
    this._bufferSupplier = bufferSupplier;
    this._paddedInputBuffer = this._bufferSupplier(this._fft.size);
    this._transformBuffer = this._bufferSupplier(2 * this._fft.size);
    this._inverseBuffer = this._bufferSupplier(2 * this._fft.size);
  }

  /**
   * Returns the supported input length.
   *
   * @returns {number} the supported input length
   */
  get inputLength() {
    return this._inputLength;
  }

  /**
   * Autocorrelates the given input data.
   *
   * @param input {ArrayLike<number>} the input data to autocorrelate
   * @param output {T} the output buffer into which to write the autocorrelated
   * data. If not provided, a new buffer will be created.
   * @returns {T} `output`
   */
  autocorrelate(input, output = this._bufferSupplier(input.length)) {
    if (input.length !== this._inputLength) {
      throw new Error(
        `Input must have length ${this._inputLength} but had length ${input.length}`,
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
 * TODO: it may be more efficient not to construct a new output array each time,
 * but that would also make the code more complicated (more so than the changes
 * that were needed to remove the other allocations).
 *
 * @param input {ArrayLike<number>}
 * @returns {number[]}
 */
function getKeyMaximumIndices(input) {
  // The indices of the key maxima
  /** @type {number[]} */ const keyIndices = [];
  // Whether the last zero crossing found was positively sloped; equivalently,
  // whether we're looking for a key maximum
  let lookingForMaximum = false;
  // The largest local maximum found so far
  let max = -Infinity;
  // The index of the largest local maximum so far
  let maxIndex = -1;

  for (let i = 1; i < input.length - 1; i++) {
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
 * Refines the chosen key maximum index chosen from the given data by
 * interpolating a parabola using the key maximum index and its two neighbors
 * and finding the position of that parabola's maximum value.
 *
 * This is described in section 5 of the MPM paper as a way to refine the
 * position of the maximum.
 *
 * @param index {number} the chosen key maximum index. This must be between `1`
 * and `data.length - 2`, inclusive, since it and its two neighbors need to be
 * valid indexes of `data`.
 * @param data {ArrayLike<number>} the input array from which `index` was chosen
 * @returns {[number, number]} a pair consisting of the refined key maximum index and the
 * interpolated value of `data` at that index (the latter of which is used as a
 * measure of clarity)
 */
function refineResultIndex(index, data) {
  const [x0, x1, x2] = [index - 1, index, index + 1];
  const [y0, y1, y2] = [data[x0], data[x1], data[x2]];

  // The parabola going through the three data points can be written as
  // y = y0(x - x1)(x - x2)/(x0 - x1)(x0 - x2)
  //   + y1(x - x0)(x - x2)/(x1 - x0)(x1 - x2)
  //   + y2(x - x0)(x - x1)/(x2 - x0)(x2 - x1)
  // Given the definitions of x0, x1, and x2, we can simplify the denominators:
  // y = y0(x - x1)(x - x2)/2
  //   - y1(x - x0)(x - x2)
  //   + y2(x - x0)(x - x1)/2
  // We can expand this out and get the coefficients in standard form:
  // a = y0/2 - y1 + y2/2
  // b = -(y0/2)(x1 + x2) + y1(x0 + x2) - (y2/2)(x0 + x1)
  // c = y0x1x2/2 - y1x0x2 + y2x0x1/2
  // The index of the maximum is -b / 2a (by solving for x where the derivative
  // is 0).

  const a = y0 / 2 - y1 + y2 / 2;
  const b = -(y0 / 2) * (x1 + x2) + y1 * (x0 + x2) - (y2 / 2) * (x0 + x1);
  const c = (y0 * x1 * x2) / 2 - y1 * x0 * x2 + (y2 * x0 * x1) / 2;

  const xMax = -b / (2 * a);
  const yMax = a * xMax * xMax + b * xMax + c;
  return [xMax, yMax];
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
 * @template {Buffer} T the buffer type to use internally. Inputs to the
 * pitch-detection process can be any numeric array type.
 */
export class PitchDetector {
  /** @private @type {Autocorrelator<T>} */
  _autocorrelator;
  /** @private @type {T} */
  _nsdfBuffer;
  /** @private @type {number} */
  _clarityThreshold = 0.9;
  /** @private @type {number} */
  _minVolumeAbsolute = 0.0;
  /** @private @type {number} */
  _maxInputAmplitude = 1.0;

  /**
   * A helper method to create an {@link PitchDetector} using {@link Float32Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<Float32Array>}
   */
  static forFloat32Array(inputLength) {
    return new PitchDetector(inputLength, (length) => new Float32Array(length));
  }

  /**
   * A helper method to create an {@link PitchDetector} using {@link Float64Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<Float64Array>}
   */
  static forFloat64Array(inputLength) {
    return new PitchDetector(inputLength, (length) => new Float64Array(length));
  }

  /**
   * A helper method to create an {@link PitchDetector} using `number[]` buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<number[]>}
   */
  static forNumberArray(inputLength) {
    return new PitchDetector(inputLength, (length) => Array(length));
  }

  /**
   * Constructs a new {@link PitchDetector} able to handle input arrays of the
   * given length.
   *
   * @param inputLength {number} the input array length to support. This
   * `PitchDetector` will only support operation on arrays of this length.
   * @param bufferSupplier {(inputLength: number) => T} the function to use for
   * creating buffers, accepting the length of the buffer to create and
   * returning a new buffer of that length. The values of the returned buffer
   * need not be initialized in any particular way.
   */
  constructor(inputLength, bufferSupplier) {
    this._autocorrelator = new Autocorrelator(inputLength, bufferSupplier);
    this._nsdfBuffer = bufferSupplier(inputLength);
  }

  /**
   * Returns the supported input length.
   *
   * @returns {number} the supported input length
   */
  get inputLength() {
    return this._autocorrelator.inputLength;
  }

  /**
   * Sets the clarity threshold used when identifying the correct pitch (the constant
   * `k` from the MPM paper). The value must be between 0 (exclusive) and 1
   * (inclusive), with the most suitable range being between 0.8 and 1.
   *
   * @param threshold {number} the clarity threshold
   */
  set clarityThreshold(threshold) {
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
      throw new Error("clarityThreshold must be a number in the range (0, 1]");
    }
    this._clarityThreshold = threshold;
  }

  /**
   * Sets the minimum detectable volume, as an absolute number between 0 and
   * `maxInputAmplitude`, inclusive, to consider in a sample when detecting the
   * pitch. If a sample fails to meet this minimum volume, `findPitch` will
   * return a clarity of 0.
   *
   * Volume is calculated as the RMS (root mean square) of the input samples.
   *
   * @param volume {number} the minimum volume as an absolute amplitude value
   */
  set minVolumeAbsolute(volume) {
    if (
      !Number.isFinite(volume) ||
      volume < 0 ||
      volume > this._maxInputAmplitude
    ) {
      throw new Error(
        `minVolumeAbsolute must be a number in the range [0, ${this._maxInputAmplitude}]`,
      );
    }
    this._minVolumeAbsolute = volume;
  }

  /**
   * Sets the minimum volume using a decibel measurement. Must be less than or
   * equal to 0: 0 indicates the loudest possible sound (see
   * `maxInputAmplitude`), -10 is a sound with a tenth of the volume of the
   * loudest possible sound, etc.
   *
   * Volume is calculated as the RMS (root mean square) of the input samples.
   *
   * @param db {number} the minimum volume in decibels, with 0 being the loudest
   * sound
   */
  set minVolumeDecibels(db) {
    if (!Number.isFinite(db) || db > 0) {
      throw new Error("minVolumeDecibels must be a number <= 0");
    }
    this._minVolumeAbsolute = this._maxInputAmplitude * 10 ** (db / 10);
  }

  /**
   * Sets the maximum amplitude of an input reading. Must be greater than 0.
   *
   * @param amplitude {number} the maximum amplitude (absolute value) of an input reading
   */
  set maxInputAmplitude(amplitude) {
    if (!Number.isFinite(amplitude) || amplitude <= 0) {
      throw new Error("maxInputAmplitude must be a number > 0");
    }
    this._maxInputAmplitude = amplitude;
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
   * @param input {ArrayLike<number>} the time-domain input data
   * @param sampleRate {number} the sample rate at which the input data was
   * collected
   * @returns {[number, number]} the detected pitch, in Hz, followed by the
   * clarity. If a pitch cannot be determined from the input, such as if the
   * volume is too low (see `minVolumeAbsolute` and `minVolumeDecibels`), this
   * will be `[0, 0]`.
   */
  findPitch(input, sampleRate) {
    // If the highest key maximum is less than the minimum volume, we don't need
    // to bother detecting the pitch, as the sample is too quiet.
    if (this._belowMinimumVolume(input)) return [0, 0];
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
    const resultIndex = keyMaximumIndices.find(
      (i) => this._nsdfBuffer[i] >= this._clarityThreshold * nMax,
    );
    const [refinedResultIndex, clarity] = refineResultIndex(
      // @ts-expect-error resultIndex is guaranteed to be defined
      resultIndex,
      this._nsdfBuffer,
    );

    // Due to floating point errors, the clarity may occasionally come out to be
    // slightly over 1.0. We can avoid incorrect results by clamping the value.
    return [sampleRate / refinedResultIndex, Math.min(clarity, 1.0)];
  }

  /**
   * Returns whether the input audio data is below the minimum volume allowed by
   * the pitch detector.
   *
   * @private
   * @param input {ArrayLike<number>}
   * @returns {boolean}
   */
  _belowMinimumVolume(input) {
    if (this._minVolumeAbsolute === 0) return false;
    let squareSum = 0;
    for (let i = 0; i < input.length; i++) {
      squareSum += input[i] ** 2;
    }
    return Math.sqrt(squareSum / input.length) < this._minVolumeAbsolute;
  }

  /**
   * Computes the NSDF of the input and stores it in the internal buffer. This
   * is equation (9) in the McLeod pitch method paper.
   *
   * @private
   * @param input {ArrayLike<number>}
   */
  _nsdf(input) {
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
    /** @type {number} */ let i;
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

/**
 * Rounds up the input to the next power of 2.
 *
 * @param {number} v
 * @returns {number} the next power of 2 at least as large as `v`
 */
function ceilPow2(v) {
  // https://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
  v--;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  v++;
  return v;
}
