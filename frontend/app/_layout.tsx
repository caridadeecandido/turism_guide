import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/auth-context";
import { SiteConfigProvider } from "@/src/site-config";
import { AccessibilityProvider } from "@/src/accessibility";
import { AccessibilityPanel } from "@/src/components/AccessibilityPanel";
import { colors } from "@/src/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SiteConfigProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: "slide_from_right",
              }}
            />
            <AccessibilityPanel />
          </View>
        </AuthProvider>
      </AccessibilityProvider>
    </SiteConfigProvider>
  );
}
