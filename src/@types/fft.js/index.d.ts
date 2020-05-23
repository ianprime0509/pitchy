/*
 * Copyright 2020 Ian Johnson
 *
 * This is free software, distributed under the MIT license. A copy of the
 * license can be found in the LICENSE file in the project root, or at
 * https://opensource.org/licenses/MIT.
 */
// TODO: contribute to @types organization

declare module "fft.js" {
  interface WritableArrayLike<T> {
    readonly length: number;
    [n: number]: T;
  }

  class FFT {
    readonly size: number;
    readonly table: number[];

    /**
     * @param size - the size of the transform. Must be a power of two larger than one.
     */
    constructor(size: number);

    createComplexArray(): number[];

    toComplexArray(input: ArrayLike<number>, storage?: number[]): number[];

    fromComplexArray(complex: ArrayLike<number>, storage?: number[]): number[];

    completeSpectrum(spectrum: WritableArrayLike<number>): void;

    realTransform(
      output: WritableArrayLike<number>,
      input: ArrayLike<number>
    ): void;

    transform(
      output: WritableArrayLike<number>,
      input: ArrayLike<number>
    ): void;

    inverseTransform(
      output: WritableArrayLike<number>,
      input: ArrayLike<number>
    ): void;
  }

  export = FFT;
}
