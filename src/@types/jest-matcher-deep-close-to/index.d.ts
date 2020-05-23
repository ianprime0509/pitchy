// Copied from
// https://github.com/maasencioh/jest-matcher-deep-close-to/blob/3a4983e640323c5bcce64495d69c4cff304c62e2/index.d.ts
// since upstream didn't publish these types correctly

declare namespace jest {
  type Iterable =
    | number
    | Iterable[]
    | { [k: string]: Iterable }
    | string
    | null
    | undefined
    | boolean;

  interface Matchers<R> {
    toBeDeepCloseTo: (expected: Iterable, decimals?: number) => R;
    toMatchCloseTo: (expected: Iterable, decimals?: number) => R;
  }
}
