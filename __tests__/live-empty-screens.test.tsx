/**
 * Live mode with nothing loaded yet (a new doctor, or before the first sync): every screen must
 * render without crashing. Demo builds always have seed data, so screens.test.tsx can't catch a
 * screen that assumes a list has a first item. No backend is needed: the address below refuses
 * connections, so any load a screen starts fails like an outage.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.doMock('../src/services/config', () => ({
  API_CONFIG: { useMock: false, baseUrl: 'http://127.0.0.1:9/api/v1', timeoutMs: 2000 },
  LIVE: true,
}));
jest.doMock('../src/navigation/navigation', () => ({
  useNav: () => ({ current: 'x', stack: [], tab: 'home', navigate: jest.fn(), back: jest.fn(), resetTo: jest.fn(), isStatic: false }),
  isDevLaunch: () => true, // splash and loading screens stay put instead of navigating
  devLaunchScreen: () => undefined,
  devLink: { active: false },
  MAIN: 'main',
  routes: { aliases: {}, tabRoots: new Set() },
  resetAction: jest.fn(),
}));

const { DOCTOR_SCREENS } = require('../src/navigation/registry') as typeof import('../src/navigation/registry');
const { LIVE } = require('../src/services/config') as typeof import('../src/services/config');

describe('live mode, nothing loaded: every screen renders', () => {
  it('runs in live mode', () => expect(LIVE).toBe(true));

  it.each(DOCTOR_SCREENS.map((d) => [d.id, d.Component] as const))('%s', async (_id, Component) => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Component />);
    });
    expect(renderer.toJSON()).toBeTruthy();
    await act(async () => renderer.unmount());
  });
});
