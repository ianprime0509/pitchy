# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic
Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The pitch detection algorithm is now more accurate, using quadratic
  interpolation as described in [the MPM
  paper](http://www.cs.otago.ac.nz/tartini/papers/A_Smarter_Way_to_Find_Pitch.pdf)
  to get a better estimate of the clearest frequency.

## [2.0.3] - 2021-01-02

### Added

- Now publishing in UMD format under the `umd` directory (which can be used with
  https://unpkg.com)

## [2.0.2] - 2020-09-12

### Changed

- Updated dependencies

## [2.0.1] - 2020-08-13

### Changed

- Updated dependencies

## [2.0.0] - 2020-05-23

### Changed

- Limited supported buffer types to `Float32Array`, `Float64Array` and
  `number[]`

## [2.0.0-alpha.1] - 2020-05-16

### Fixed

- Eliminate division by zero for certain inputs

## [2.0.0-alpha.0] - 2020-04-19

### Added

- TypeScript type declarations

### Changed

- Converted code to TypeScript
- Replaced `findPitch` and `autocorrelate` functions with new class-based
  interface consisting of `PitchDetector` and `Autocorrelator`

### Fixed

- Clarity returned by `findPitch` could sometimes be slightly greater than 1.0
  due to floating-point rounding errors, and is now clamped to be no greater
  than 1.0

## [1.1.0] - 2020-03-11

### Changed

- Update dependencies

## [1.0.4] - 2018-05-17

### Changed

- Update dependencies

## [1.0.3] - 2018-02-26

### Fixed

- Fix behavior of `findPitch` when given an array of all zeroes.

## [1.0.2] - 2018-02-14

### Added

- Transpile ES module output to ES5 as well (`index.mjs`).

## [1.0.1] - 2018-02-14

### Changed

- Use Babel to make output compatible with ES5-only setups.

## [1.0.0] - 2018-02-13

### Added

- Initial (stable) project release.
