/*
 * Copyright 2020 Ian Johnson
 *
 * This is free software, distributed under the MIT license. A copy of the
 * license can be found in the LICENSE file in the project root, or at
 * https://opensource.org/licenses/MIT.
 */
// TODO: contribute to @types organization

declare module 'fft.js' {
  class FFT {
    readonly size: number;
    readonly table: number[];

    /**
     * @param size - the size of the transform. Must be a power of two larger than one.
     */
    constructor(size: number);

    createComplexArray(): number[];

    toComplexArray(input: number[], storage?: number[]): number[];

    fromComplexArray(complex: number[], storage?: number[]): number[];

    completeSpectrum(spectrum: number[]): void;

    realTransform(output: number[], input: number[]): void;

    transform(output: number[], input: number[]): void;

    inverseTransform(output: number[], input: number[]): void;
  }

  export = FFT;
}
