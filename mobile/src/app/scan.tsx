import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

export default function ScanReceiptScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.message}>
          Pocket Watcher needs camera access to scan receipts.
        </ThemedText>
        <Pressable style={styles.button} onPress={requestPermission}>
          <ThemedText style={styles.buttonText}>Grant camera access</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync();
    if (photo) setPhotoUri(photo.uri);
  }

  return (
    <ThemedView style={styles.container}>
      {photoUri ? (
        <View style={styles.centered}>
          <ThemedText type="subtitle">Receipt captured</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.message}>
            OCR-based auto-fill is coming in a future update. For now, use the photo as a
            reference and log the expense manually.
          </ThemedText>
          <Pressable style={styles.button} onPress={() => setPhotoUri(null)}>
            <ThemedText style={styles.buttonText}>Retake</ThemedText>
          </Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => router.back()}>
            <ThemedText style={styles.buttonText}>Done</ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <Pressable style={styles.shutter} onPress={takePicture}>
            <View style={styles.shutterInner} />
          </Pressable>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.four, gap: Spacing.three },
  message: { textAlign: "center" },
  button: { backgroundColor: "#2a78d6", borderRadius: 8, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  secondaryButton: { backgroundColor: "#52514e" },
  buttonText: { color: "#fff", fontWeight: "600" },
  shutter: {
    position: "absolute",
    bottom: Spacing.five,
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
