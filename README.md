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
<script src="https://unpkg.com/pitchy@2.0.3/umd/index.js"></script>
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

The following is an example of how a simple tuner might be implemented using
`PitchDetector`. A runnable version of this example (as a single HTML page) can
be found in the `examples/simple` directory of this project.

```js
import { PitchDetector } from "pitchy";

function updatePitch(analyserNode, detector, input, sampleRate) {
  analyserNode.getFloatTimeDomainData(input);
  const [pitch, clarity] = detector.findPitch(input, sampleRate);

  document.getElementById("pitch").textContent = `${
    Math.round(pitch * 10) / 10
  } Hz`;
  document.getElementById("clarity").textContent = `${Math.round(
    clarity * 100
  )} %`;
  window.setTimeout(
    () => updatePitch(analyserNode, detector, input, sampleRate),
    100
  );
}

document.addEventListener("DOMContentLoaded", () => {
  // Note that in some browsers, such as Chrome, this audio context will be
  // suspended automatically and must be resumed using audioContext.resume()
  // following a user input on the page (such as a button click). The example
  // in the examples/simple directory includes a button to do this.
  const audioContext = new window.AudioContext();
  const analyserNode = audioContext.createAnalyser();

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyserNode);
    const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
    const input = new Float32Array(detector.inputLength);
    updatePitch(analyserNode, detector, input, audioContext.sampleRate);
  });
});
```

An `Autocorrelator` class with a similar interface to `PitchDetector` is exposed
for those who want to use the autocorrelation function for other things.

## Comparison with version 1.x.y

In the previous version of this module, the pitch detection functionality was
exported as a function, `findPitch`. This function would allocate several
buffers for every call. This is sub-optimal, because the extra allocations hurt
efficiency: many common use-cases for this module will only ever use inputs of a
fixed size, so these temporary buffers could be allocated in advance and reused
for multiple inputs.

Thus, starting with version 2.0.0, this module uses a class-based approach,
where a `PitchDetector` is used to encapsulate (and reuse) temporary buffers and
expose the pitch detection functionality. Additionally, this class-based
approach allows the temporary buffers to have different types, such as
`Float32Array`, that may be more efficient than plain arrays of numbers.

## License

This is free software, distributed under the [MIT
license](https://opensource.org/licenses/MIT).
