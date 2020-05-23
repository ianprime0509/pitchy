// Copied from
// https://github.com/maasencioh/jest-matcher-deep-close-to/blob/master/index.d.ts
// since it hasn't been published upstream yet

declare module "jest-matcher-deep-close-to" {
  global {
    namespace jest {
      interface Matchers<R> {
        toBeDeepCloseTo: (
          expected: number | number[] | object,
          decimals?: number
        ) => R;
        toMatchCloseTo: (
          expected: number | number[] | object,
          decimals?: number
        ) => R;
      }
    }
  }

  export function toBeDeepCloseTo(
    received: number | number[] | object,
    expected: number | number[] | object,
    decimals?: number
  ): {
    message(): string;
    pass: boolean;
  };

  export function toMatchCloseTo(
    received: number | number[] | object,
    expected: number | number[] | object,
    decimals?: number
  ): {
    message(): string;
    pass: boolean;
  };
}
