import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icons";
import { AppText, Label } from "@/components/ui/text";
import { Fonts, Radius, Spacing, withAlpha } from "@/constants/theme";
import { dateFromKey, formatMonthKey, formatShortDate, toDateKey } from "@/lib/format";
import { usePalette } from "@/lib/theme";

/* Buttons ---------------------------------------------------------- */

type ButtonVariant = "primary" | "dark" | "good" | "critical" | "outline" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  size = "md",
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}) {
  const palette = usePalette();
  const inactive = disabled || loading;
  const solid: Record<ButtonVariant, string> = {
    primary: palette.fillPrimary,
    dark: palette.foreground,
    good: palette.fillGood,
    critical: palette.fillCritical,
    outline: palette.surface,
    ghost: "transparent",
  };
  const textColor =
    variant === "dark" ? palette.surface : variant === "outline" || variant === "ghost" ? palette.foreground : palette.onFill;
  const height = size === "lg" ? 48 : size === "sm" ? 34 : 42;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          paddingHorizontal: size === "sm" ? Spacing.three : Spacing.four,
          backgroundColor: solid[variant],
          borderColor: variant === "outline" ? palette.borderStrong : "transparent",
          opacity: inactive ? 0.6 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Icon name={icon} size={16} color={textColor} />}
          <AppText size={size === "sm" ? 13 : 14} weight="bold" color={textColor}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

export function LinkButton({
  label,
  onPress,
  color,
  size = 13,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
}) {
  const palette = usePalette();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <AppText size={size} weight="semibold" color={color ?? palette.muted}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone }: { icon: IconName; onPress: () => void; label: string; tone?: string }) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: palette.border, backgroundColor: pressed ? palette.surfaceInset : palette.surface },
      ]}
    >
      <Icon name={icon} size={16} color={tone ?? palette.muted} />
    </Pressable>
  );
}

/* Fields ----------------------------------------------------------- */

export function Field({ label, children, style }: { label: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ gap: 6, minWidth: 0 }, style]}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <View style={styles.fieldGrid}>{children}</View>;
}

export function inputChrome(palette: ReturnType<typeof usePalette>, focused: boolean) {
  return {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderColor: focused ? palette.primary : palette.borderStrong,
    backgroundColor: palette.surface,
    shadowColor: palette.primary,
    shadowOpacity: focused ? 0.18 : 0,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  };
}

export function TextField({ style, emphasis, ...props }: TextInputProps & { emphasis?: boolean }) {
  const palette = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={palette.mutedSoft}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        inputChrome(palette, focused),
        {
          paddingHorizontal: Spacing.three,
          color: palette.foreground,
          fontFamily: emphasis ? Fonts.bold : Fonts.regular,
          fontSize: emphasis ? 17 : 15,
          fontVariant: emphasis ? ["tabular-nums"] : undefined,
        },
        style,
      ]}
    />
  );
}

function SelectTrigger({
  text,
  placeholder,
  leading,
  onPress,
}: {
  text?: string;
  placeholder: string;
  leading?: ReactNode;
  onPress: () => void;
}) {
  const palette = usePalette();
  return (
    <Pressable onPress={onPress} style={[inputChrome(palette, false), styles.trigger]}>
      {leading}
      <AppText size={15} color={text ? "foreground" : "mutedSoft"} numberOfLines={1} style={{ flex: 1 }}>
        {text || placeholder}
      </AppText>
      <Icon name="chevronDown" size={16} color={palette.mutedSoft} />
    </Pressable>
  );
}

export type SelectOption = { value: string; label: string; leading?: ReactNode };

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: withAlpha(palette.shadow, 0.45) }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: palette.surface, borderColor: palette.border, paddingBottom: insets.bottom + Spacing.four },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: palette.borderStrong }]} />
        <View style={styles.sheetHeader}>
          <AppText size={16} weight="bold" style={{ flex: 1 }}>
            {title}
          </AppText>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function SelectField({
  value,
  options,
  onChange,
  placeholder = "Choose…",
  title,
  leading,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  title: string;
  leading?: ReactNode;
}) {
  const palette = usePalette();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <SelectTrigger text={selected?.label} placeholder={placeholder} leading={leading ?? selected?.leading} onPress={() => setOpen(true)} />
      <Sheet visible={open} title={title} onClose={() => setOpen(false)}>
        <ScrollView style={{ maxHeight: 420 }}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value || "__none"}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: active ? palette.primarySoft : pressed ? palette.surfaceInset : "transparent" },
                ]}
              >
                {o.leading}
                <AppText size={15} weight={active ? "semibold" : "regular"} color={active ? palette.primaryDeep : "foreground"} style={{ flex: 1 }}>
                  {o.label}
                </AppText>
                {active && <Icon name="check" size={18} color={palette.primaryDeep} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </>
  );
}

const ADD_NEW = "__add_new__";

// Pick an existing name or type a new one, like the web's CreatableSelect.
export function CreatableSelect({
  value,
  options,
  onChange,
  placeholder,
  newPlaceholder,
  title,
  addLabel = "Add new…",
  maxLength = 60,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  newPlaceholder: string;
  title: string;
  addLabel?: string;
  maxLength?: number;
}) {
  const palette = usePalette();
  const [adding, setAdding] = useState(false);

  if (adding) {
    return (
      <View style={styles.creatable}>
        <TextField
          autoFocus
          value={value}
          onChangeText={onChange}
          placeholder={newPlaceholder}
          maxLength={maxLength}
          style={{ flex: 1 }}
        />
        <Pressable
          hitSlop={8}
          accessibilityLabel="Pick from list"
          onPress={() => {
            setAdding(false);
            onChange("");
          }}
        >
          <Icon name="close" size={18} color={palette.muted} />
        </Pressable>
      </View>
    );
  }

  return (
    <SelectField
      value={options.includes(value) ? value : ""}
      title={title}
      placeholder={placeholder}
      options={[...options.map((name) => ({ value: name, label: name })), { value: ADD_NEW, label: addLabel }]}
      onChange={(next) => {
        if (next === ADD_NEW) {
          onChange("");
          setAdding(true);
        } else onChange(next);
      }}
    />
  );
}

export function DateField({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [iosOpen, setIosOpen] = useState(false);
  const palette = usePalette();
  const current = dateFromKey(value);

  function open() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        onChange: (event, date) => {
          if (event.type === "set" && date) onChange(toDateKey(date));
        },
      });
    } else setIosOpen(true);
  }

  return (
    <>
      <SelectTrigger text={formatShortDate(value)} placeholder="Pick a date" onPress={open} leading={<Icon name="calendar" size={16} color={palette.mutedSoft} />} />
      {Platform.OS === "ios" && (
        <Sheet visible={iosOpen} title="Choose a date" onClose={() => setIosOpen(false)}>
          <DateTimePicker
            value={current}
            mode="date"
            display="inline"
            accentColor={palette.primary}
            onChange={(_, date) => {
              if (date) onChange(toDateKey(date));
            }}
          />
        </Sheet>
      )}
    </>
  );
}

export function MonthStepper({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const palette = usePalette();
  const step = (delta: number) => {
    const [y, m] = value.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    onChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <View style={[inputChrome(palette, false), styles.trigger, { paddingHorizontal: Spacing.one }]}>
      <Pressable onPress={() => step(-1)} hitSlop={8} style={styles.stepButton} accessibilityLabel="Previous month">
        <Icon name="chevronLeft" size={16} color={palette.muted} strokeWidth={2} />
      </Pressable>
      <AppText size={15} weight="semibold" tabular align="center" style={{ flex: 1 }}>
        {formatMonthKey(value)}
      </AppText>
      <Pressable onPress={() => step(1)} hitSlop={8} style={styles.stepButton} accessibilityLabel="Next month">
        <Icon name="chevronRight" size={16} color={palette.muted} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export function PeriodPicker({
  label,
  onPrevious,
  onNext,
}: {
  label: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const palette = usePalette();
  const stepper = (icon: IconName, onPress: (() => void) | undefined, a11y: string) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.periodStep, { opacity: onPress ? 1 : 0.35, backgroundColor: pressed ? palette.surfaceInset : "transparent" }]}
    >
      <Icon name={icon} size={16} color={palette.muted} strokeWidth={2} />
    </Pressable>
  );
  return (
    <View style={[styles.period, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      {stepper("chevronLeft", onPrevious, "Previous")}
      <AppText size={14} weight="bold" tabular align="center" style={{ minWidth: 80 }}>
        {label}
      </AppText>
      {stepper("chevronRight", onNext, "Next")}
    </View>
  );
}

/* Toggles ---------------------------------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string; activeColor?: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  const palette = usePalette();
  return (
    <View style={[styles.segmented, { backgroundColor: palette.surfaceInset, borderRadius: size === "sm" ? 10 : 13 }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              { height: size === "sm" ? 30 : 36, borderRadius: size === "sm" ? 8 : 10 },
              active && [{ backgroundColor: palette.surface, shadowColor: palette.shadow }, styles.segmentShadow],
            ]}
          >
            <AppText
              size={size === "sm" ? 12 : 13}
              weight="semibold"
              color={active ? (o.activeColor ?? palette.foreground) : palette.muted}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({
  value,
  onChange,
  label,
  description,
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const palette = usePalette();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText size={14} weight="semibold">
          {label}
        </AppText>
        {description && (
          <AppText size={12} color="muted">
            {description}
          </AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: palette.borderStrong, true: palette.primary }}
        thumbColor={palette.onFill}
      />
    </View>
  );
}

export function Pill({ label, color, dot }: { label: string; color: string; dot?: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.13) }]}>
      {dot && <View style={[styles.pillDot, { backgroundColor: color }]} />}
      <AppText size={11} weight="semibold" color={color} numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: 11,
    borderWidth: 1,
    overflow: "hidden",
  },
  iconButton: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  trigger: { flexDirection: "row", alignItems: "center", gap: Spacing.two, paddingHorizontal: Spacing.three },
  backdrop: StyleSheet.absoluteFill,
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.two },
  sheetHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.one, marginBottom: Spacing.one },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: 13,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  creatable: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  stepButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  period: { flexDirection: "row", alignItems: "center", gap: Spacing.one, borderWidth: 1, borderRadius: 11, padding: 3 },
  periodStep: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  segmented: { flexDirection: "row", alignSelf: "flex-start", padding: 4, gap: 4 },
  segment: { paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  segmentShadow: { shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: Spacing.four },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    maxWidth: 160,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
});
