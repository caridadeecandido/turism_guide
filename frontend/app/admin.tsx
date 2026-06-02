import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, TouristSpot } from "@/src/api";

type Editable = Omit<TouristSpot, "id"> & { id?: string };

const EMPTY: Editable = {
  name: "",
  category: "Praia",
  neighborhood: "",
  address: "",
  short_description: "",
  full_description: "",
  audio_description: "",
  image_url: "",
  accessibility_badges: [],
  accessibility_features: [],
  distance_km: 0,
  featured: false,
};

export default function Admin() {
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editable | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listSpots();
      setSpots(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name || !editing.audio_description || !editing.image_url) {
      if (Platform.OS === "web") {
        window.alert("Nome, audiodescrição e URL da imagem são obrigatórios.");
      } else {
        Alert.alert("Atenção", "Nome, audiodescrição e URL da imagem são obrigatórios.");
      }
      return;
    }
    try {
      if (editing.id) {
        await api.updateSpot(editing.id, editing);
      } else {
        await api.createSpot(editing);
      }
      setEditing(null);
      await load();
      if (Platform.OS === "web") {
        window.alert("Ponto turístico salvo com sucesso.");
      } else {
        Alert.alert("Sucesso", "Ponto turístico salvo.");
      }
    } catch (e: any) {
      if (Platform.OS === "web") {
        window.alert(`Erro: ${e.message || e}`);
      } else {
        Alert.alert("Erro", String(e.message || e));
      }
    }
  };

  const remove = (spot: TouristSpot) => {
    const doDelete = async () => {
      try {
        await api.deleteSpot(spot.id);
        await load();
      } catch (e: any) {
        if (Platform.OS === "web") {
          window.alert(`Erro ao excluir: ${e.message || e}`);
        } else {
          Alert.alert("Erro", String(e.message || e));
        }
      }
    };

    if (Platform.OS === "web") {
      // RN-Web Alert.alert doesn't render multi-button confirms reliably.
      // eslint-disable-next-line no-alert
      if (window.confirm(`Excluir "${spot.name}"? Esta ação não pode ser desfeita.`)) {
        doDelete();
      }
      return;
    }
    Alert.alert(
      "Excluir ponto turístico?",
      `Tem certeza que deseja excluir "${spot.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: doDelete },
      ],
    );
  };

  if (editing) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setEditing(null)}
            accessibilityLabel="Cancelar"
            testID="cancel-edit-button"
          >
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editing.id ? "Editar ponto" : "Novo ponto"}
          </Text>
          <TouchableOpacity style={styles.saveBtn} onPress={save} testID="save-button">
            <Text style={styles.saveText}>Salvar</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {editing.image_url ? (
              <Image source={{ uri: editing.image_url }} style={styles.preview} />
            ) : null}

            <Field
              label="Nome *"
              value={editing.name}
              onChange={(v) => setEditing({ ...editing, name: v })}
              testID="field-name"
            />
            <Field
              label="Categoria *"
              value={editing.category}
              onChange={(v) => setEditing({ ...editing, category: v })}
              testID="field-category"
              hint="Praia, História e Cultura, Parque, Hotel, Cafeteria, Mirante..."
            />
            <Field
              label="Bairro"
              value={editing.neighborhood}
              onChange={(v) => setEditing({ ...editing, neighborhood: v })}
              testID="field-neighborhood"
            />
            <Field
              label="Endereço"
              value={editing.address}
              onChange={(v) => setEditing({ ...editing, address: v })}
              testID="field-address"
            />
            <Field
              label="URL da imagem *"
              value={editing.image_url}
              onChange={(v) => setEditing({ ...editing, image_url: v })}
              testID="field-image"
              hint="Cole o link de uma imagem (Pexels, Unsplash, etc.)"
            />
            <Field
              label="Distância (km)"
              value={String(editing.distance_km)}
              onChange={(v) => setEditing({ ...editing, distance_km: Number(v) || 0 })}
              keyboardType="numeric"
              testID="field-distance"
            />
            <Field
              label="Descrição curta"
              value={editing.short_description}
              onChange={(v) => setEditing({ ...editing, short_description: v })}
              testID="field-short"
              multiline
            />
            <Field
              label="Descrição completa"
              value={editing.full_description}
              onChange={(v) => setEditing({ ...editing, full_description: v })}
              testID="field-full"
              multiline
            />
            <Field
              label="Audiodescrição (texto narrado) *"
              value={editing.audio_description}
              onChange={(v) => setEditing({ ...editing, audio_description: v })}
              testID="field-audio"
              multiline
              hint="Este texto será narrado por TTS em português"
            />
            <Field
              label="Selos de acessibilidade (separados por vírgula)"
              value={editing.accessibility_badges.join(", ")}
              onChange={(v) =>
                setEditing({
                  ...editing,
                  accessibility_badges: v.split(",").map((x) => x.trim()).filter(Boolean),
                })
              }
              testID="field-badges"
              multiline
            />
            <Field
              label="Recursos de acessibilidade (1 por linha)"
              value={editing.accessibility_features.join("\n")}
              onChange={(v) =>
                setEditing({
                  ...editing,
                  accessibility_features: v.split("\n").map((x) => x.trim()).filter(Boolean),
                })
              }
              testID="field-features"
              multiline
            />

            <TouchableOpacity
              style={styles.featuredRow}
              onPress={() => setEditing({ ...editing, featured: !editing.featured })}
              testID="toggle-featured"
            >
              <Ionicons
                name={editing.featured ? "checkbox" : "square-outline"}
                size={24}
                color={colors.brand}
              />
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
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setEditing({ ...EMPTY })}
          accessibilityLabel="Novo ponto"
          testID="new-spot-button"
        >
          <Ionicons name="add" size={28} color={colors.brand} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subhead}>
        Gerencie pontos turísticos. {spots.length} cadastrado{spots.length === 1 ? "" : "s"}.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {spots.map((spot) => (
            <View key={spot.id} style={styles.adminCard}>
              <Image source={{ uri: spot.image_url }} style={styles.adminImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.adminTitle} numberOfLines={1}>
                  {spot.name}
                </Text>
                <Text style={styles.adminCat}>{spot.category}</Text>
                <View style={styles.adminActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setEditing(spot)}
                    testID={`edit-${spot.id}`}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.brand} />
                    <Text style={styles.editText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => remove(spot)}
                    testID={`delete-${spot.id}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
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

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
  hint,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  hint?: string;
  testID?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 96, textAlignVertical: "top" }]}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  saveBtn: {
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "800" },
  subhead: { color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  list: { padding: spacing.md, gap: spacing.sm },
  adminCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  adminImage: { width: 88, height: 110 },
  adminTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700", paddingTop: spacing.sm, paddingHorizontal: spacing.sm },
  adminCat: { color: colors.brandLight, fontSize: 12, paddingHorizontal: spacing.sm, marginTop: 2 },
  adminActions: { flexDirection: "row", gap: 8, padding: spacing.sm, marginTop: "auto" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.badgeBg,
    gap: 4,
  },
  editText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    gap: 4,
  },
  deleteText: { color: colors.error, fontWeight: "700", fontSize: 12 },
  form: { padding: spacing.md, gap: spacing.md },
  preview: { width: "100%", height: 180, borderRadius: radii.card, backgroundColor: colors.surface },
  field: { gap: 6 },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.body,
  },
  hint: { color: colors.textMuted, fontSize: 11, fontStyle: "italic" },
  featuredRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: spacing.sm },
  featuredText: { color: colors.text, fontSize: fontSizes.body },
});
