# pitchy

[![npm](https://img.shields.io/npm/v/pitchy.svg)](https://www.npmjs.com/package/pitchy)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/ianprime0509/pitchy/CI)

pitchy is a simple pitch-detection library written entirely in JavaScript that
aims to be fast and accurate enough to be used in real-time applications such as
tuners. To do this, it uses the McLeod Pitch Method, described in the paper
[A Smarter Way to Find Pitch](http://www.cs.otago.ac.nz/tartini/papers/A_Smarter_Way_to_Find_Pitch.pdf)
by Philip McLeod and Geoff Wyvill.

## Installation

You can install pitchy using NPM (or similar tools such as Yarn):

```shell
npm install pitchy
```

You can also use a CDN, such as [esm.sh](https://esm.sh), directly from a
browser or Deno:

```js
import { PitchDetector } from "https://esm.sh/pitchy@3";
```

## Examples and documentation

For examples and documentation, see the
[project site](https://ianjohnson.dev/pitchy).

## License

This is free software, distributed under the
[MIT license](https://opensource.org/licenses/MIT).
