import React, { useEffect } from 'react';
import { Linking, StatusBar } from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
  useIsFocused,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { InTabs } from '../components/ui/Nav';
import { DoctorNavBar as BottomNavBar } from '../components/doctor';
import { DOCTOR_SCREENS as SCREENS } from './registry';

const ALIASES: Record<string, string> = {};
import type { ScreenDef } from './types';
import { devLaunchScreen, MAIN, resetAction, routes, type TabId, devLink } from './navigation';

const TAB_OF_SCREEN: Record<string, TabId> = {
  'dr-home': 'home',
  'dr-appointments': 'appointments',
  'dr-patients': 'patients',
  'dr-earnings': 'earnings',
  'dr-profile': 'profile',
};

routes.aliases = ALIASES;
routes.tabRoots = new Set(Object.keys(TAB_OF_SCREEN));

function withStatusBar(def: ScreenDef) {
  const Component = def.Component;
  return function ScreenRoute() {
    const focused = useIsFocused();
    return (
      <>
        {focused && (
          <StatusBar
            barStyle={def.statusTone === 'light' ? 'light-content' : 'dark-content'}
          />
        )}
        <Component />
      </>
    );
  };
}

const ROUTES = SCREENS.map((def) => ({ def, component: withStatusBar(def) }));
const STACK_ROUTES = ROUTES.filter((r) => !routes.tabRoots.has(r.def.id));
const TAB_ROUTES = Object.keys(TAB_OF_SCREEN).map((id) => ROUTES.find((r) => r.def.id === id)!);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <InTabs.Provider value={true}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={({ state, navigation }) => (
          <BottomNavBar
            active={TAB_OF_SCREEN[state.routes[state.index].name]}
            onSelect={(t) => navigation.navigate(ALIASES[t.screen] ?? t.screen)}
          />
        )}
      >
        {TAB_ROUTES.map((r) => (
          <Tab.Screen key={r.def.id} name={r.def.id} component={r.component} />
        ))}
      </Tab.Navigator>
    </InTabs.Provider>
  );
}

export const navigationRef = createNavigationContainerRef();

/** Development only: `kdcdoctor://s/<screen-id>` opens a screen for QA captures. */
function useDevDeepLink() {
  useEffect(() => {
    if (!__DEV__) return;
    const open = (url: string | null) => {
      const id = url?.match(/:\/\/s\/([\w-]+)/)?.[1];
      if (id && navigationRef.isReady()) {
        devLink.active = true;
        navigationRef.dispatch(resetAction(id));
      }
    };
    const sub = Linking.addEventListener('url', (e) => open(e.url));
    return () => sub.remove();
  }, []);
}

/** Development only: `simctl launch ... -kdcScreen <id>` starts on a screen for QA. */
function openDevLaunchScreen() {
  const id = devLaunchScreen();
  if (id) navigationRef.dispatch(resetAction(id));
}

export function RootNavigator() {
  useDevDeepLink();
  return (
    <NavigationContainer ref={navigationRef} onReady={openDevLaunchScreen}>
      <Stack.Navigator initialRouteName="dr-splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name={MAIN} component={MainTabs} />
        {STACK_ROUTES.map((r) => (
          <Stack.Screen key={r.def.id} name={r.def.id} component={r.component} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
