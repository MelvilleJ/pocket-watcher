import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Button, TextField } from "@/components/ui/controls";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { getServerUrl, setServerUrl, validateServerUrl } from "@/lib/api";

export function ServerUrlField({ startEditing = false }: { startEditing?: boolean }) {
  const [url, setUrl] = useState("");
  const [editing, setEditing] = useState(startEditing);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getServerUrl().then(setUrl);
  }, []);

  async function onSave() {
    const result = validateServerUrl(url);
    if ("error" in result) return setError(result.error);
    await setServerUrl(result.url);
    setUrl(result.url);
    setError(null);
    setSaved(true);
    if (!startEditing) setEditing(false);
  }

  if (!editing) {
    return (
      <Pressable onPress={() => setEditing(true)} style={{ flexDirection: "row", justifyContent: "center", gap: Spacing.two }}>
        <AppText size={12} color="mutedSoft" numberOfLines={1} style={{ flexShrink: 1 }}>
          Server: {url}
        </AppText>
        <AppText size={12} weight="semibold" color="primaryDeep">
          Change
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: "row", gap: Spacing.two }}>
        <TextField
          value={url}
          onChangeText={(next) => {
            setUrl(next);
            setSaved(false);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://your-server.example.com"
          style={{ flex: 1 }}
        />
        <Button label="Save" variant="dark" onPress={onSave} />
      </View>
      {error ? (
        <AppText size={12} color="critical">
          {error}
        </AppText>
      ) : saved ? (
        <AppText size={12} color="good">
          Server address saved.
        </AppText>
      ) : null}
    </View>
  );
}
