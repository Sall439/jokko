/** @type {import('jest').Config} */

// Phase 4 : les tests ciblent la logique métier pure (`utils/`, `services/*.mock`,
// `features/auth/validation`). `jest-expo` fournit le preset React Native.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // L'alias `@/` doit se résoudre comme dans Metro, sinon les imports des
  // modules testés échouent.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/services/**/*.mock.ts',
    'src/features/**/validation.ts',
  ],
};
