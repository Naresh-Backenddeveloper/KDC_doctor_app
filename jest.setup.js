/* global jest */
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const passthrough = (v) => v;
  const animation = { duration: () => animation };
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c) => c },
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    withTiming: passthrough,
    withRepeat: passthrough,
    interpolate: () => 0,
    Easing: { bezier: () => passthrough, linear: passthrough },
    SlideInDown: { duration: () => undefined },
  };
});
jest.mock('react-native-worklets', () => ({}));
jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn(), launchCamera: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-nitro-modules', () => ({ NitroModules: {} }));
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, name) => (name === '__esModule' ? true : () => null) }));
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return new Proxy({ __esModule: true, default: View }, { get: (t, name) => (name in t ? t[name] : View) });
});

// The Keychain, in memory (react-native-keychain has no native module under Jest).
jest.mock('react-native-keychain', () => {
  const store = new Map();
  return {
    ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AfterFirstUnlockThisDeviceOnly' },
    setGenericPassword: async (username, password, opts) => {
      store.set(opts?.service ?? 'default', { username, password });
      return true;
    },
    getGenericPassword: async (opts) => store.get(opts?.service ?? 'default') ?? false,
    resetGenericPassword: async (opts) => store.delete(opts?.service ?? 'default'),
  };
});

// Demo by default; with DOCTOR_LIVE_URL the app's live layer talks to that backend (contract tests).
jest.mock('./src/services/config', () => {
  const live = Boolean(process.env.DOCTOR_LIVE_URL);
  return {
    API_CONFIG: { useMock: !live, baseUrl: process.env.DOCTOR_LIVE_URL ?? 'https://api.kdcplus.in/api/v1', timeoutMs: 20000 },
    LIVE: live,
  };
});
