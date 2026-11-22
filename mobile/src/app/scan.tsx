import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/controls";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { usePalette } from "@/lib/theme";

export default function ScanReceiptScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background }]}>
        <AppText size={16} weight="semibold" align="center">
          Pocket Watcher needs camera access to scan receipts.
        </AppText>
        <Button label="Grant camera access" onPress={requestPermission} />
      </View>
    );
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync();
    if (photo) setPhotoUri(photo.uri);
  }

  if (photoUri) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background }]}>
        <Image source={{ uri: photoUri }} style={[styles.preview, { borderColor: palette.border }]} resizeMode="cover" />
        <AppText size={20} weight="bold" align="center">
          Receipt captured
        </AppText>
        <AppText size={14} color="muted" align="center">
          Automatic reading is coming in a future update. For now, use the photo as a reference and log the expense manually.
        </AppText>
        <View style={{ flexDirection: "row", gap: Spacing.two }}>
          <Button label="Retake" variant="outline" onPress={() => setPhotoUri(null)} />
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <Pressable style={styles.shutter} onPress={takePicture} accessibilityLabel="Take photo">
        <View style={styles.shutterInner} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.six, gap: Spacing.four },
  preview: { width: 180, height: 240, borderRadius: 14, borderWidth: 1 },
  shutter: {
    position: "absolute",
    bottom: Spacing.eight,
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
});
