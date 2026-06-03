import { useEffect } from "react";
import { Stack, useSegments, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { AdminAuthProvider, useAdminAuth } from "@/src/admin-auth";
import { colors } from "@/src/theme";

function AdminGate({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[segments.length - 1] === "login";
    if (!admin && !onLogin) {
      router.replace("/admin/login");
    } else if (admin && onLogin) {
      router.replace("/admin");
    }
  }, [admin, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout() {
  return (
    <AdminAuthProvider>
      <AdminGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "slide_from_right",
          }}
        />
      </AdminGate>
    </AdminAuthProvider>
  );
}
