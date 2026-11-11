module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: { '\\.css$': '<rootDir>/__tests__/__mocks__/style.js' },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/__mocks__/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-[a-z-]+)?|@react-native(-community)?|@react-navigation|nativewind|react-native-css-interop|zustand|lucide-react-native|@hookform)/)',
  ],
};
