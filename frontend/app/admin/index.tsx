import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { TouristSpot } from "@/src/api";
import { useAdminAuth } from "@/src/admin-auth";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

type Editable = Omit<TouristSpot, "id"> & { id?: string; image_alt?: string };

const EMPTY: Editable = {
  name: "", category: "Praia", neighborhood: "", address: "",
  short_description: "", full_description: "", audio_description: "",
  image_url: "", image_alt: "",
  accessibility_badges: [], accessibility_features: [],
  distance_km: 0, latitude: undefined, longitude: undefined, featured: false,
};

function alertError(msg: string) {
  if (Platform.OS === "web") window.alert(msg);
  else Alert.alert("Atenção", msg);
}

function confirmAction(msg: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(msg)) onYes();
    return;
  }
  Alert.alert("Confirmar", msg, [
    { text: "Cancelar", style: "cancel" },
    { text: "Confirmar", style: "destructive", onPress: onYes },
  ]);
}

export default function AdminHome() {
  const { admin, signOut, authHeader } = useAdminAuth();
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/spots`);
      setSpots(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name || !editing.audio_description || !editing.image_url) {
      alertError("Nome, audiodescrição e URL da imagem são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const url = editing.id ? `${BASE}/api/spots/${editing.id}` : `${BASE}/api/spots`;
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      setEditing(null);
      await load();
    } catch (e: any) {
      alertError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const remove = (spot: TouristSpot) => {
    confirmAction(`Excluir "${spot.name}"?`, async () => {
      const headers = await authHeader();
      await fetch(`${BASE}/api/spots/${spot.id}`, { method: "DELETE", headers });
      await load();
    });
  };

  const seed = () => {
    confirmAction("Re-popular o banco com os 14 pontos turísticos padrão? Isto irá apagar todas as edições atuais.", async () => {
      const headers = await authHeader();
      await fetch(`${BASE}/api/seed`, { method: "POST", headers });
      await load();
    });
  };

  if (editing) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setEditing(null)} testID="cancel-edit-button">
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{editing.id ? "Editar ponto" : "Novo ponto"}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} testID="save-button">
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {editing.image_url ? <Image source={{ uri: editing.image_url }} style={styles.preview} /> : null}

            <Field label="Nome *" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} testID="field-name" />
            <Field label="Categoria *" value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} testID="field-category" hint="Praia, História e Cultura, Parque, Hotel, Cafeteria, Mirante..." />
            <Field label="Bairro" value={editing.neighborhood} onChange={(v) => setEditing({ ...editing, neighborhood: v })} testID="field-neighborhood" />
            <Field label="Endereço" value={editing.address} onChange={(v) => setEditing({ ...editing, address: v })} testID="field-address" />
            <Field label="URL da imagem *" value={editing.image_url} onChange={(v) => setEditing({ ...editing, image_url: v })} testID="field-image" hint="Cole a URL da foto ou base64" />
            <Field label="Texto alternativo da imagem (acessibilidade) *" value={editing.image_alt || ""} onChange={(v) => setEditing({ ...editing, image_alt: v })} testID="field-image-alt" multiline hint="Descreva a imagem para usuários cegos. Ex: 'Duna de areia com mar ao fundo'" />
            <Field label="Latitude (GPS)" value={String(editing.latitude ?? "")} onChange={(v) => setEditing({ ...editing, latitude: v ? Number(v) : undefined })} testID="field-lat" keyboardType="numeric" hint="Ex: -5.8819" />
            <Field label="Longitude (GPS)" value={String(editing.longitude ?? "")} onChange={(v) => setEditing({ ...editing, longitude: v ? Number(v) : undefined })} testID="field-lng" keyboardType="numeric" hint="Ex: -35.1664" />
            <Field label="Distância base (km)" value={String(editing.distance_km)} onChange={(v) => setEditing({ ...editing, distance_km: Number(v) || 0 })} keyboardType="numeric" testID="field-distance" />
            <Field label="Descrição curta" value={editing.short_description} onChange={(v) => setEditing({ ...editing, short_description: v })} testID="field-short" multiline />
            <Field label="Descrição completa" value={editing.full_description} onChange={(v) => setEditing({ ...editing, full_description: v })} testID="field-full" multiline />
            <Field label="Audiodescrição (texto narrado) *" value={editing.audio_description} onChange={(v) => setEditing({ ...editing, audio_description: v })} testID="field-audio" multiline hint="Texto rico em descrições sensoriais — será narrado por TTS" />
            <Field label="Selos de acessibilidade (separados por vírgula)" value={editing.accessibility_badges.join(", ")} onChange={(v) => setEditing({ ...editing, accessibility_badges: v.split(",").map((x) => x.trim()).filter(Boolean) })} testID="field-badges" />
            <Field label="Recursos de acessibilidade (1 por linha)" value={editing.accessibility_features.join("\n")} onChange={(v) => setEditing({ ...editing, accessibility_features: v.split("\n").map((x) => x.trim()).filter(Boolean) })} testID="field-features" multiline />

            <TouchableOpacity
              style={styles.featuredRow}
              onPress={() => setEditing({ ...editing, featured: !editing.featured })}
              testID="toggle-featured"
            >
              <Ionicons name={editing.featured ? "checkbox" : "square-outline"} size={24} color={colors.brand} />
              <Text style={styles.featuredText}>Destacar na home</Text>
            </TouchableOpacity>

            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/")} testID="back-button">
          <Ionicons name="home-outline" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setEditing({ ...EMPTY })} testID="new-spot-button">
          <Ionicons name="add" size={28} color={colors.brand} />
        </TouchableOpacity>
      </View>

      <View style={styles.adminCard}>
        <View style={styles.avatar}>
          <Ionicons name="shield-checkmark" size={22} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.adminName}>{admin?.name}</Text>
          <Text style={styles.adminEmail}>{admin?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutBtn} testID="admin-logout-button">
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickRow}>
        <QuickAction icon="image-outline" label="Site / Selo" onPress={() => router.push("/admin/site")} testID="goto-site" />
        <QuickAction icon="language-outline" label="Traduções" onPress={() => router.push("/admin/translations")} testID="goto-translations" />
        <QuickAction icon="mail-outline" label="Solicitações" onPress={() => router.push("/admin/inquiries")} testID="goto-inquiries" />
        <QuickAction icon="refresh" label="Re-popular" onPress={seed} testID="seed-button" />
      </View>

      <Text style={styles.subhead}>
        {loading ? "Carregando..." : `${spots.length} pontos turísticos`}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {spots.map((spot) => (
            <View key={spot.id} style={styles.spotCard}>
              <Image source={{ uri: spot.image_url }} style={styles.spotImage} />
              <View style={{ flex: 1, padding: spacing.sm }}>
                <Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text>
                <Text style={styles.spotCat}>{spot.category} · {spot.neighborhood}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(spot)} testID={`edit-${spot.id}`}>
                    <Ionicons name="create-outline" size={14} color={colors.brand} />
                    <Text style={styles.editText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(spot)} testID={`delete-${spot.id}`}>
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={styles.deleteText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress, testID }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; testID: string;
}) {
  return (
    <TouchableOpacity style={styles.qa} onPress={onPress} testID={testID}>
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChange, multiline, keyboardType, hint, testID }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; keyboardType?: "default" | "numeric"; hint?: string; testID?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType || "default"}
        placeholderTextColor={colors.textMuted}
        testID={testID}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  saveBtn: { paddingHorizontal: spacing.md, height: 36, borderRadius: radii.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", minWidth: 80 },
  saveText: { color: "#fff", fontWeight: "800" },
  adminCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.card,
    padding: spacing.sm, marginHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.brand,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.badgeBg, alignItems: "center", justifyContent: "center" },
  adminName: { color: colors.text, fontWeight: "800", fontSize: fontSizes.body },
  adminEmail: { color: colors.textMuted, fontSize: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.error },
  logoutText: { color: colors.error, fontSize: 12, fontWeight: "700" },
  quickRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md },
  qa: {
    flex: 1, alignItems: "center", paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  qaLabel: { color: colors.text, fontSize: 11, fontWeight: "700", textAlign: "center" },
  subhead: { color: colors.textMuted, paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm },
  list: { padding: spacing.md, gap: spacing.sm },
  spotCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  spotImage: { width: 88, height: 110 },
  spotName: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700" },
  spotCat: { color: colors.brandLight, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 6, marginTop: spacing.sm },
  editBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.badgeBg, gap: 4 },
  editText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  deleteBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: "rgba(239,68,68,0.15)", gap: 4 },
  deleteText: { color: colors.error, fontWeight: "700", fontSize: 12 },
  form: { padding: spacing.md, gap: spacing.md },
  preview: { width: "100%", height: 180, borderRadius: radii.card, backgroundColor: colors.surface },
  field: { gap: 6 },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface, color: colors.text,
    borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border, fontSize: fontSizes.body,
  },
  hint: { color: colors.textMuted, fontSize: 11, fontStyle: "italic" },
  featuredRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: spacing.sm },
  featuredText: { color: colors.text, fontSize: fontSizes.body },
});
