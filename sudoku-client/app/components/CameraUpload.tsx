import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { ocrSudokuDigitsFromBase64 } from "../vision";

export default function CameraUpload({
  onGridDetected,
}: {
  onGridDetected: (grid: number[][]) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);

  async function handleTakePhoto() {
  if (!cameraRef.current) return;

  try {
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.9,
      base64: false,
      skipProcessing: false,
    });

    const imgW = (photo as any).width ?? 0;
    const imgH = (photo as any).height ?? 0;
    if (!imgW || !imgH) throw new Error("Photo size missing");
    if (!previewSize) throw new Error("Preview size not ready");

    // Overlay frame = 90% of preview width (matches styles.frame width: "90%")
    const frameSize = previewSize.width * 0.9;
    const frameX = (previewSize.width - frameSize) / 2;
    const frameY = (previewSize.height - frameSize) / 2;

    // Convert overlay coords -> image pixel coords
    const scaleX = imgW / previewSize.width;
    const scaleY = imgH / previewSize.height;

    let originX = Math.floor(frameX * scaleX);
    let originY = Math.floor(frameY * scaleY);
    let cropW = Math.floor(frameSize * scaleX);
    let cropH = Math.floor(frameSize * scaleY);

    // Clamp
    originX = Math.max(0, Math.min(originX, imgW - 1));
    originY = Math.max(0, Math.min(originY, imgH - 1));
    cropW = Math.max(1, Math.min(cropW, imgW - originX));
    cropH = Math.max(1, Math.min(cropH, imgH - originY));

    const result = await ImageManipulator.manipulateAsync(
      photo.uri,
      [
        { crop: { originX, originY, width: cropW, height: cropH } },
        { resize: { width: 900 } },
      ],
      { base64: true, compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    if (!result.base64) throw new Error("No base64 after crop");

    const detectedGrid = await ocrSudokuDigitsFromBase64(result.base64);
    onGridDetected(detectedGrid);

    const count = detectedGrid.flat().filter((n) => n !== 0).length;
    alert(`OCR filled ${count} cells`);

    setShowCamera(false);
  } catch (err) {
    console.error("Camera OCR failed:", err);
    alert("Could not read Sudoku from photo");
  }
  }

  if (!permission) {
    return <Text>Loading camera permissions…</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={{ marginTop: 12 }}>
        <Text>Camera permission is required</Text>
        <Button title="Grant permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ width: "100%", alignItems: "center", marginTop: 12 }}>
      {!showCamera && (
        <Button title="Scan Sudoku with Camera" onPress={() => setShowCamera(true)} />
      )}

      {showCamera && (
        <>
          <View
            style={{ width: "90%", height: 420 }}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setPreviewSize({ width, height });
            }}
          >
            <CameraView
              ref={cameraRef}
              style={{ width: "100%", height: "100%" }}
              facing="back"
            />

            {/* Overlay frame */}
            <View pointerEvents="none" style={styles.overlay}>
              <View style={styles.frame} />
              <View style={styles.gridLines}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View
                    key={`v-${i}`}
                    style={[styles.vLine, { left: `${((i + 1) * 100) / 9}%` }]}
                  />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <View
                    key={`h-${i}`}
                    style={[styles.hLine, { top: `${((i + 1) * 100) / 9}%` }]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={{ width: "90%", marginTop: 10, gap: 8 }}>
            <Button title="Take Photo" onPress={handleTakePhoto} />
            <Button title="Cancel" onPress={() => setShowCamera(false)} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    width: "90%",
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: "white",
    borderRadius: 12,
  },
  gridLines: {
    position: "absolute",
    width: "90%",
    aspectRatio: 1,
  },
  vLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  hLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
});