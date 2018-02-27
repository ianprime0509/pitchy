/*
 * Copyright 2018 Ian Johnson
 *
 * This is free software, distributed under the MIT license.  A copy of the
 * license can be found in the LICENSE file in the project root, or at
 * https://opensource.org/licenses/MIT.
 */
import FFT from 'fft.js';
import np2 from 'next-pow-2';

/**
 * Return an array containing the autocorrelated input data.
 *
 * @param {number[]} input The input data.
 * @return {number[]} The autocorrelated input data.
 */
export function autocorrelate(input) {
  // We need to double the input length to get correct results, and the FFT
  // algorithm we use requires a size that's a power of 2.
  const fft = new FFT(np2(2 * input.length));

  // Step 0: pad the input array with zeros.
  let paddedInput = new Array(fft.size);
  input.forEach((val, idx) => {
    paddedInput[idx] = val;
  });
  paddedInput.fill(0, input.length);

  // Step 1: get the DFT of the input array.
  let tmp = fft.createComplexArray();
  fft.realTransform(tmp, paddedInput);
  // We need to fill in the right half of the array too.
  fft.completeSpectrum(tmp);
  // Step 2: multiply each entry by its conjugate.
  for (let i = 0; i < tmp.length; i += 2) {
    tmp[i] = tmp[i] * tmp[i] + tmp[i + 1] * tmp[i + 1];
    tmp[i + 1] = 0;
  }
  // Step 3: perform the inverse transform.
  let tmp2 = fft.createComplexArray();
  fft.inverseTransform(tmp2, tmp);

  // This last result (the inverse transform) contains the autocorrelation
  // data, which is completely real.
  let result = new Array(input.length);
  for (let i = 0; i < input.length; i++) {
    result[i] = tmp2[2 * i];
  }
  return result;
}

/**
 * Return an array containing the computed values of the NDSF used in MPM.
 *
 * Specifically, this is equation (9) in the McLeod pitch method paper.
 */
function ndsf(input) {
  // The function r'(tau) is the autocorrelation.
  const rPrimeArray = autocorrelate(input);
  // The function m'(tau) (defined in equation (6)) can be computed starting
  // with m'(0), which is equal to 2r'(0), and then iteratively modified to get
  // m'(1), m'(2), etc.  For example, to get m'(1), we take m'(0) and subtract
  // x_0^2 and x_{W-1}^2.  Then, to get m'(2), we take m'(1) and subtract x_1^2
  // and x_{W-2}^2, and further values are similar.  We use m below as this
  // value.
  //
  // The resulting array values are 2 * r'(tau) / m'(tau).
  let m = 2 * rPrimeArray[0];
  if (m === 0) {
    // We don't want to trigger any divisions by zero; if the given input data
    // consists of all zeroes, then so should the output data.
    let result = new Array(rPrimeArray.length);
    result.fill(0);
    return result;
  } else {
    return rPrimeArray.map((rPrime, i) => {
      let mPrime = m;
      let i2 = input.length - i - 1;
      m -= input[i] * input[i] + input[i2] * input[i2];

      return 2 * rPrime / mPrime;
    });
  }
}

/**
 * Return an array of all the key maximum positions in the given input array.
 *
 * In McLeod's paper, a key maximum is the highest maximum between a positively
 * sloped zero crossing and a negatively sloped one.
 *
 * TODO: the paper by McLeod proposes doing parabolic interpolation to get more
 * accurate key maxima; right now this implementation doesn't do that, but it
 * could be implemented later.
 */
function getKeyMaximumIndices(input) {
  // The indices of the key maxima.
  let keyIndices = [];
  // Whether the last zero crossing found was positively sloped; equivalently,
  // whether we're looking for a key maximum.
  let lookingForMaximum = false;
  // The largest local maximum found so far.
  let max;
  // The index of the largest local maximum so far.
  let maxIndex = -1;

  for (let i = 1; i < input.length; i++) {
    if (input[i - 1] < 0 && input[i] > 0) {
      lookingForMaximum = true;
      maxIndex = i;
      max = input[i];
    } else if (input[i - 1] > 0 && input[i] < 0) {
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
 * Return the pitch detected using McLeod Pitch Method (MPM) along with a
 * measure of its clarity.
 *
 * The clarity is a value between 0 and 1 (potentially inclusive) that
 * represents how "clear" the pitch was.  A clarity value of 1 indicates that
 * the pitch was very distinct, while lower clarity values indicate less
 * definite pitches.
 *
 * MPM is described in the paper 'A Smarter Way to Find Pitch' by Philip McLeod
 * and Geoff Wyvill
 * (http://miracle.otago.ac.nz/tartini/papers/A_Smarter_Way_to_Find_Pitch.pdf).
 *
 * @param {number[]} input The time-domain input data.
 * @param {number} sampleRate The sample rate at which the input data was
 * collected.
 * @return {[number, number]} The detected pitch, in Hz, followed by the
 * clarity.
 */
export function findPitch(input, sampleRate) {
  const ndsfArray = ndsf(input);
  const keyMaximumIndices = getKeyMaximumIndices(ndsfArray);
  if (keyMaximumIndices.length === 0) {
    // No key maxima means that we either don't have enough data to analyze or
    // that the data was flawed (such as an input array of zeroes).
    return [0, 0];
  }
  // The constant k mentioned in section 5.  TODO: make this configurable.
  const K = 0.9;
  // The highest key maximum.
  const nMax = Math.max(...keyMaximumIndices.map(i => ndsfArray[i]));
  // Following the paper, we return the pitch corresponding to the first key
  // maximum higher than K * nMax.
  const resultIndex = keyMaximumIndices.find(i => ndsfArray[i] >= K * nMax);

  return [sampleRate / resultIndex, ndsfArray[resultIndex]];
}
