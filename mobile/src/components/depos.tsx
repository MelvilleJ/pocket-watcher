import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { DepoGlyph } from "@/components/icons";
import { Button, Field, FieldGrid, LinkButton, SelectField, TextField } from "@/components/ui/controls";
import { Divider } from "@/components/ui/layout";
import { AppText, Label } from "@/components/ui/text";
import { mix, Spacing, withAlpha } from "@/constants/theme";
import {
  DEFAULT_ICON_FOR_KIND,
  DEPO_COLORS,
  DEPO_ICONS,
  DEPO_KIND_LABELS,
  DEPO_KIND_VALUES,
  depoKindLabel,
  type DepoKind,
} from "@/lib/finance/depos";
import { formatCurrency, parseAmount } from "@/lib/format";
import { addDepo, deleteDepo, depoNameTaken, updateDepo, type Depo, type DepoWithBalance } from "@/lib/models";
import { usePalette } from "@/lib/theme";

const BADGE_SIZES = { sm: { box: 24, glyph: 14, radius: 7 }, md: { box: 36, glyph: 16, radius: 11 }, lg: { box: 44, glyph: 20, radius: 14 } };

export function DepoBadge({ icon, color, size = "md" }: { icon: string; color: string; size?: keyof typeof BADGE_SIZES }) {
  const palette = usePalette();
  const s = BADGE_SIZES[size];
  return (
    <View
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.radius,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: mix(color, palette.surface, 0.15),
        borderWidth: 1,
        borderColor: withAlpha(color, 0.32),
      }}
    >
      <DepoGlyph name={icon} size={s.glyph} color={color} />
    </View>
  );
}

export function DepoChip({ depo }: { depo?: Pick<Depo, "name" | "color"> }) {
  const palette = usePalette();
  if (!depo) {
    return (
      <View style={[styles.chip, { backgroundColor: palette.surfaceInset }]}>
        <AppText size={11} weight="semibold" color="mutedSoft">
          No depo
        </AppText>
      </View>
    );
  }
  return (
    <View style={[styles.chip, { backgroundColor: withAlpha(depo.color, 0.12) }]}>
      <View style={[styles.chipDot, { backgroundColor: depo.color }]} />
      <AppText size={11} weight="semibold" color={mix(depo.color, palette.foreground, 0.7)} numberOfLines={1} style={{ flexShrink: 1 }}>
        {depo.name}
      </AppText>
    </View>
  );
}

export function DepoForm({ depo, onDone, onCancel }: { depo?: Depo; onDone: () => void; onCancel?: () => void }) {
  const palette = usePalette();
  const [name, setName] = useState(depo?.name ?? "");
  const [kind, setKind] = useState<DepoKind>((depo?.kind as DepoKind) ?? "bank");
  const [color, setColor] = useState(depo?.color ?? DEPO_COLORS[5]);
  const [icon, setIcon] = useState(depo?.icon ?? DEFAULT_ICON_FOR_KIND.bank);
  const [iconTouched, setIconTouched] = useState(Boolean(depo));
  const [opening, setOpening] = useState(depo ? depo.opening_balance.toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError("Name is required.");
    if (depoNameTaken(trimmed, depo?.id)) return setError(`You already have a depo called "${trimmed}".`);
    const openingBalance = opening.trim() === "" ? 0 : parseAmount(opening);
    if (openingBalance === null) return setError("Starting balance must be a number.");

    const input = { name: trimmed, kind, color, icon, openingBalance };
    if (depo) updateDepo(depo.id, input);
    else addDepo(input);
    setError(null);
    onDone();
  }

  return (
    <View style={{ gap: Spacing.four }}>
      <View style={styles.preview}>
        <DepoBadge icon={icon} color={color} size="lg" />
        <TextField value={name} onChangeText={setName} placeholder="e.g. Republic Bank" maxLength={60} style={{ flex: 1 }} />
      </View>

      <FieldGrid>
        <Field label="Type" style={{ flex: 1, minWidth: 140 }}>
          <SelectField
            title="Depo type"
            value={kind}
            options={DEPO_KIND_VALUES.map((k) => ({ value: k, label: DEPO_KIND_LABELS[k] }))}
            onChange={(next) => {
              const k = next as DepoKind;
              setKind(k);
              if (!iconTouched) setIcon(DEFAULT_ICON_FOR_KIND[k]);
            }}
          />
        </Field>
        <Field label="Starting balance" style={{ flex: 1, minWidth: 140 }}>
          <TextField value={opening} onChangeText={setOpening} placeholder="0.00" keyboardType="numbers-and-punctuation" />
        </Field>
      </FieldGrid>

      <View style={{ gap: 6 }}>
        <Label>Colour</Label>
        <View style={styles.swatches}>
          {DEPO_COLORS.map((c) => {
            const active = c.toLowerCase() === color.toLowerCase();
            return (
              <Pressable
                key={c}
                accessibilityLabel={c}
                onPress={() => setColor(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  active && { borderWidth: 2, borderColor: palette.surface, outlineColor: palette.foreground, outlineWidth: 2 },
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Label>Symbol</Label>
        <View style={styles.swatches}>
          {DEPO_ICONS.map((i) => {
            const active = icon === i;
            return (
              <Pressable
                key={i}
                accessibilityLabel={i}
                onPress={() => {
                  setIcon(i);
                  setIconTouched(true);
                }}
                style={[
                  styles.iconChoice,
                  {
                    borderColor: active ? color : palette.border,
                    backgroundColor: active ? mix(color, palette.surface, 0.14) : palette.surface,
                  },
                ]}
              >
                <DepoGlyph name={i} size={18} color={active ? color : palette.muted} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {error && (
        <AppText size={13} color="critical">
          {error}
        </AppText>
      )}

      <View style={{ flexDirection: "row", gap: Spacing.two }}>
        <Button label={depo ? "Save changes" : "Add depo"} variant="dark" onPress={submit} style={{ flex: 1 }} />
        {onCancel && <Button label="Cancel" variant="outline" onPress={onCancel} />}
      </View>
    </View>
  );
}

export function DepoList({
  depos,
  currency,
  activeDepoId,
  onSelect,
  onChanged,
}: {
  depos: DepoWithBalance[];
  currency: string;
  activeDepoId?: string;
  onSelect: (id: string | undefined) => void;
  onChanged: () => void;
}) {
  const palette = usePalette();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const done = () => {
    setEditingId(null);
    setAdding(false);
    onChanged();
  };

  return (
    <View>
      {depos.map((depo) =>
        editingId === depo.id ? (
          <View key={depo.id} style={[styles.editRow, { backgroundColor: palette.surfaceSoft, borderBottomColor: palette.border }]}>
            <DepoForm depo={depo} onDone={done} onCancel={() => setEditingId(null)} />
          </View>
        ) : (
          <View
            key={depo.id}
            style={[
              styles.row,
              { borderBottomColor: palette.border },
              activeDepoId === depo.id && { backgroundColor: mix(palette.primary, palette.surface, 0.07), borderLeftWidth: 3, borderLeftColor: palette.primary },
            ]}
          >
            <Pressable onPress={() => onSelect(activeDepoId === depo.id ? undefined : depo.id)} style={styles.rowMain}>
              <DepoBadge icon={depo.icon} color={depo.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText size={14} weight="semibold" numberOfLines={1}>
                  {depo.name}
                </AppText>
                <AppText size={11} color="mutedSoft">
                  {depoKindLabel(depo.kind)}
                </AppText>
              </View>
              <AppText size={14} weight="semibold" tabular color={depo.balance < 0 ? "critical" : "foreground"}>
                {formatCurrency(depo.balance, currency)}
              </AppText>
            </Pressable>
            <View style={styles.rowActions}>
              <LinkButton label="Edit" size={12} onPress={() => setEditingId(depo.id)} />
              <LinkButton
                label="Remove"
                size={12}
                onPress={() =>
                  Alert.alert("Remove depo", `Remove "${depo.name}"? Its past transactions are kept.`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => {
                        deleteDepo(depo.id);
                        if (activeDepoId === depo.id) onSelect(undefined);
                        onChanged();
                      },
                    },
                  ])
                }
              />
            </View>
          </View>
        )
      )}

      {adding || depos.length === 0 ? (
        <View style={[styles.editRow, { backgroundColor: palette.surfaceSoft }]}>
          <DepoForm onDone={done} onCancel={depos.length > 0 ? () => setAdding(false) : undefined} />
        </View>
      ) : (
        <>
          <Divider />
          <Pressable
            onPress={() => setAdding(true)}
            style={({ pressed }) => [
              styles.addButton,
              { borderColor: pressed ? palette.primary : palette.borderStrong, backgroundColor: pressed ? withAlpha(palette.primary, 0.06) : "transparent" },
            ]}
          >
            <AppText size={14} weight="semibold" color="muted">
              + Add a depo
            </AppText>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    maxWidth: 140,
    flexShrink: 1,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  preview: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  iconChoice: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  row: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowMain: { flexDirection: "row", alignItems: "center", gap: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: 12, paddingBottom: 4 },
  rowActions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.four, paddingHorizontal: Spacing.five, paddingBottom: 10 },
  editRow: { padding: Spacing.five, borderBottomWidth: StyleSheet.hairlineWidth },
  addButton: {
    margin: Spacing.five,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 11,
    alignItems: "center",
  },
});
