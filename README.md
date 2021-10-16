# pitchy

[![npm](https://img.shields.io/npm/v/pitchy.svg)](https://www.npmjs.com/package/pitchy)
[![Travis](https://img.shields.io/travis/ianprime0509/pitchy.svg)](https://travis-ci.org/ianprime0509/pitchy)

pitchy is a simple pitch-detection library written entirely in JavaScript that
aims to be fast and accurate enough to be used in real-time applications such as
tuners. To do this, it uses the McLeod Pitch Method, described in the paper [A
Smarter Way to Find
Pitch](http://www.cs.otago.ac.nz/tartini/papers/A_Smarter_Way_to_Find_Pitch.pdf)
by Philip McLeod and Geoff Wyvill.

## Installation

You can install pitchy using npm:

```sh
npm install pitchy
```

Alternatively, to use pitchy in a simple web page without any bundler tools, you
can use [unpkg](https://unpkg.com). This is the approach taken in the simple
example under the `examples/simple` directory in this project: just include the
following `script` tag in your page and then access the contents of the library
under the `pitchy` global object:

```html
<script src="https://unpkg.com/pitchy@2.1.0/umd/index.js"></script>
```

## Examples and documentation

For examples and documentation, see the [project
site](https://ianjohnson.dev/pitchy).

## License

This is free software, distributed under the [MIT
license](https://opensource.org/licenses/MIT).
