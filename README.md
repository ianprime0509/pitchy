# pitchy

[![npm](https://img.shields.io/npm/v/pitchy.svg)](https://www.npmjs.com/package/pitchy)
[![Travis](https://img.shields.io/travis/ianprime0509/pitchy.svg)](https://travis-ci.org/ianprime0509/pitchy)

pitchy is a simple pitch-detection library written entirely in JavaScript that
aims to be fast and accurate enough to be used in real-time applications such
as tuners.  To do this, it uses the McLeod Pitch Method, described in the paper
[A Smarter Way to Find
Pitch](http://miracle.otago.ac.nz/tartini/papers/A_Smarter_Way_to_Find_Pitch.pdf).

## Installation

You can install pitchy using npm:

```shell
$ npm install pitchy
```

## Usage

The primary function of this module is `findPitch(input, sampleRate)`.  The
first argument, `input`, is an array of numbers containing the time-domain
amplitudes of the input signal.  The second argument, `sampleRate`, is the
sample rate at which the input data was collected.  The return value is an
array of two numbers: the first number is the detected pitch, and the second
number is a measure of "clarity" or confidence (between 0 and 1, with 1 being
the most clear).

The following is a simple example showing how you might use the `findPitch`
function alongside the WebRTC API to implement a very basic tuner.

```javascript
import { findPitch } from 'pitchy';

function updatePitch(analyserNode, sampleRate) {
  let data = new Float32Array(analyserNode.fftSize);
  analyserNode.getFloatTimeDomainData(data);
  let [pitch, clarity] = findPitch(data, sampleRate);

  document.getElementById('pitch').textContent = String(pitch);
  document.getElementById('clarity').textContent = String(clarity);
  window.requestAnimationFrame(() => updatePitch(analyserNode, sampleRate));
}

document.addEventListener("DOMContentLoaded", () => {
  // For cross-browser compatibility.
  let audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let analyserNode = audioContext.createAnalyser();

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyserNode);
    updatePitch(analyserNode, audioContext.sampleRate);
  });
});
```

The `autocorrelate(input)` function is also exported for those who might want
to use it by itself; it returns an array containing the autocorrelated data.

## License

This is free software, distributed under the [MIT
license](https://opensource.org/licenses/MIT).
