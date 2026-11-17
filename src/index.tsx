import { ToastProvider, ToastViewport } from "@tamagui/toast";
import { useLoadFonts, useSetupPlayer } from "common/hooks";
import "expo-dev-client";
import * as SplashScreen from "expo-splash-screen";
import { Suspense } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PortalProvider, TamaguiProvider } from "tamagui";
import { Home } from "./screens/Home";
import config from "./tamagui.config";

SplashScreen.preventAutoHideAsync();

const App = () => {
  const playerReady = useSetupPlayer();
  const fontsLoaded = useLoadFonts();

  if (!playerReady || !fontsLoaded) {
    return null;
  }

  return (
    <Suspense>
      <TamaguiProvider config={config} defaultTheme="light">
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <PortalProvider>
              <ToastProvider>
                <SafeToastViewport />
                <Home />
              </ToastProvider>
            </PortalProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </TamaguiProvider>
    </Suspense>
  );
};

const SafeToastViewport = () => {
  const { left, top, right } = useSafeAreaInsets();
  return (
    <ToastViewport
      flexDirection="column-reverse"
      top={top}
      left={left}
      right={right}
    />
  );
};

export default App;
