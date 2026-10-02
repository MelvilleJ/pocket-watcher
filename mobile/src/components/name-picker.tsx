import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

export function NamePicker({
  options,
  value,
  onChange,
  newPlaceholder,
}: {
  options: string[];
  value: string;
  onChange: (name: string) => void;
  newPlaceholder: string;
}) {
  const [adding, setAdding] = useState(false);

  if (adding) {
    return (
      <View style={styles.newRow}>
        <TextInput
          autoFocus
          placeholder={newPlaceholder}
          value={value}
          onChangeText={onChange}
          maxLength={60}
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable
          onPress={() => {
            setAdding(false);
            onChange("");
          }}
          style={styles.chip}
        >
          <ThemedText type="small">Cancel</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((name) => {
        const active = value === name;
        return (
          <Pressable key={name} onPress={() => onChange(name)} style={[styles.chip, active && styles.chipActive]}>
            <ThemedText type="small" style={active ? { color: "#fff" } : undefined}>
              {name}
            </ThemedText>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => {
          setAdding(true);
          onChange("");
        }}
        style={styles.chip}
      >
        <ThemedText type="small">+ New</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one },
  newRow: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  input: { borderWidth: 1, borderColor: "#c3c2b7", borderRadius: 8, padding: Spacing.two },
  chip: { borderWidth: 1, borderColor: "#c3c2b7", borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  chipActive: { backgroundColor: "#2a78d6", borderColor: "#2a78d6" },
});
