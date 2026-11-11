import { useCallback, useMemo } from 'react';
import { Platform, Settings } from 'react-native';
import { CommonActions, StackActions, useNavigation, useRoute } from '@react-navigation/native';

/** Bottom-navigation destinations. */
export type TabId = 'home' | 'doctors' | 'appointments' | 'orders' | 'profile' | 'patients' | 'earnings';

export interface NavState {
  current: string;
  stack: string[];
  tab: TabId;
  from?: string;
  navigate: (id: string, opts?: { replace?: boolean; tab?: TabId; from?: string }) => void;
  back: () => void;
  resetTo: (id: string, tab?: TabId) => void;
  isStatic: boolean;
}

export const MAIN = 'main';

/** Development only: the screen named by `simctl launch ... -kdcScreen <id>`, for QA. */
export function devLaunchScreen(): string | undefined {
  return __DEV__ && Platform.OS === 'ios' ? Settings.get('kdcScreen') : undefined;
}

/** Set when a dev deep link opened the current screen. */
export const devLink = { active: false };

export const isDevLaunch = () => devLink.active || devLaunchScreen() !== undefined;

/** Filled in by RootNavigator; held here so screens need not import the registry. */
export const routes = {
  aliases: {} as Record<string, string>,
  tabRoots: new Set<string>(),
};

export function resetAction(id: string, params?: object) {
  const target = routes.aliases[id] ?? id;
  return CommonActions.reset({
    index: 0,
    routes: routes.tabRoots.has(target)
      ? [{ name: MAIN, params: { screen: target, params } }]
      : [{ name: target, params }],
  });
}

/** The blueprint's navigation contract, running on React Navigation. */
export function useNav(): NavState {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const navigate = useCallback<NavState['navigate']>(
    (id, opts) => {
      const target = routes.aliases[id] ?? id;
      if (target === route.name) return;
      const params = { from: opts?.from };
      if (routes.tabRoots.has(target)) navigation.navigate(MAIN, { screen: target, params });
      else if (opts?.replace) navigation.dispatch(StackActions.replace(target, params));
      else navigation.dispatch(StackActions.push(target, params));
    },
    [navigation, route.name],
  );

  const back = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const resetTo = useCallback<NavState['resetTo']>((id) => navigation.dispatch(resetAction(id)), [navigation]);

  return useMemo(
    () => ({
      current: route.name,
      stack: [],
      tab: 'home',
      from: route.params?.from,
      navigate,
      back,
      resetTo,
      isStatic: false,
    }),
    [route.name, route.params?.from, navigate, back, resetTo],
  );
}
