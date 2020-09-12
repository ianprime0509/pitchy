# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic
Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
