const tsPreset = require('ts-jest/jest-preset');
const mongoDBPreset = require('@shelf/jest-mongodb/jest-preset');

module.exports = {
  ...tsPreset,
  ...mongoDBPreset,
  setupFiles: ['./test/setup.ts']
};
