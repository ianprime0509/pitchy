# pitchy

[![npm](https://img.shields.io/npm/v/pitchy.svg)](https://www.npmjs.com/package/pitchy)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/ianprime0509/pitchy/ci.yml?branch=main)

pitchy is a simple pitch-detection library written entirely in JavaScript that
aims to be fast and accurate enough to be used in real-time applications such as
tuners. To do this, it uses the McLeod Pitch Method, described in the paper
[A Smarter Way to Find Pitch](http://www.cs.otago.ac.nz/tartini/papers/A_Smarter_Way_to_Find_Pitch.pdf)
by Philip McLeod and Geoff Wyvill.

A [playground page](https://ianjohnson.dev/pitchy/playground.html) is available
to allow experimentation with the library and how different configurations may
impact the quality of the results.

**Note for v4 users:** as of v4, Pitchy is distributed as a pure ES module.
There are several implications of this for using various build and test tools: a
[Gist by sindresorhus](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
gives a more detailed overview (including suggestions for various tools) than
what can be covered in this README. The short version is that you may want to
consider migrating your own project to ES modules. If all else fails, you can
continue to use v3, as v4 contains no functional changes.

## Installation

You can install pitchy using NPM (or similar tools such as Yarn):

```shell
npm install pitchy
```

You can also use a CDN, such as [esm.sh](https://esm.sh), directly from a
browser or Deno:

```js
import { PitchDetector } from "https://esm.sh/pitchy@4";
```

Note that this package is
[ESM-only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c),
meaning it can't be used with `require`. However, it can still be used from
CommonJS code, albeit only in async contexts, using dynamic `import`:

```js
const { PitchDetector } = await import("pitchy");
```

## Usage

The main functionality of this module is exposed by the `PitchDetector` class.
Instances of `PitchDetector` are generally created using one of the three static
helper methods corresponding to the desired output buffer type:

- `PitchDetector.forFloat32Array(inputLength)`
- `PitchDetector.forFloat64Array(inputLength)`
- `PitchDetector.forNumberArray(inputLength)`

Once a `PitchDetector` instance is created, the `findPitch(input, sampleRate)`
method can be used to find the pitch of the time-domain data in `input`,
returning an array consisting of the detected pitch (in Hz) and a "clarity"
measure from 0 to 1 that indicates how "clear" the pitch is (low values indicate
noise rather than a true pitch).

For efficiency reasons, the input to the `findPitch` method must always have the
length indicated by the `inputLength` that was passed when constructing the
`PitchDetector`.

An `Autocorrelator` class with a similar interface to `PitchDetector` is exposed
for those who want to use the autocorrelation function for other things.

A simple usage example is available on
[GitHub Pages](https://ianjohnson.dev/pitchy).

## License

This is free software, distributed under the
[MIT license](https://opensource.org/licenses/MIT).
