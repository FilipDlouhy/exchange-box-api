// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/app/$1',
    '^libs/(.*)$': '<rootDir>/libs/$1',
  },
};
