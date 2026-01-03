import * as Location from "expo-location";
import { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import { fetchCloudGridFromPublicAPI, finishPuzzle, importPuzzle, newPuzzle } from "../api";
import CameraUpload from "../components/CameraUpload";
import CompletionScreen from "../components/CompletionScreen";
import LoginPanel from "../components/LoginPanel";
import SudokuGrid from "../components/SudokuGrid";



export default function HomeScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [grid, setGrid] = useState<number[][] | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completionLocation, setCompletionLocation] =
    useState<{ latitude: number; longitude: number } | null>(null);

  const [loading, setLoading] = useState(false);
  
  async function handleFinishPuzzle() {
  if (!token || !puzzleId) return;

  // Ask for GPS permission
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    alert("Location permission denied");
    return;
  }

  // Read GPS
  const loc = await Location.getCurrentPositionAsync({});
  const latitude = loc.coords.latitude;
  const longitude = loc.coords.longitude;

  // Send to backend
  await finishPuzzle(token, puzzleId, latitude, longitude);

  // Show completion UI
  setCompletionLocation({ latitude, longitude });
  setCompleted(true);
}

  async function handleNewPuzzle() {
  if (!token) return;
  const p = await newPuzzle(token);
  setPuzzleId(p.id);
  setGrid(p.grid);
}

  async function handleCloudPuzzle() {
  if (!token) return;
  setLoading(true);
  try {
    // 1) Get grid from public cloud API (client-side)
    const grid = await fetchCloudGridFromPublicAPI();

    // 2) Store it in your remote backend SQL DB
    const p = await importPuzzle(token, grid, "public-api-client");

    setPuzzleId(p.id);
    setGrid(p.grid);
  } finally {
    setLoading(false);
  }
}


  return (
  <ScrollView
    contentContainerStyle={{
      flexGrow: 1,
      alignItems: "center",
      paddingTop: 60,
      backgroundColor: "#f2f2f2",
      gap: 16,
      paddingBottom: 40,
    }}
  >
    <Text style={{ fontSize: 28, marginBottom: 6, color: "#000" }}>Sudoku</Text>

    {/* LOGIN */}
    {!token && <LoginPanel onLoggedIn={setToken} />}

    {/* LOGGED IN + CREATE PUZZLE */}
    {token && !grid && !completed && (
      <View style={{ width: "90%" }}>
        <Text style={{ color: "#000", marginBottom: 10 }}>✅ Logged in</Text>
        {loading && <Text style={{ color: "#000", marginBottom: 10 }}>Loading puzzle...</Text>}
        <Button title="Create New Puzzle (Backend)" onPress={handleNewPuzzle} />
        <Button title="Load Cloud Puzzle (Public API)" onPress={handleCloudPuzzle} />
      </View>
    )}

    {/* GAMEPLAY */}
    {token && grid && !completed && (
      <>
        {puzzleId && (
          <Text style={{ color: "#000" }}>Puzzle ID: {puzzleId}</Text>
        )}

        <SudokuGrid grid={grid} />

        <View style={{ width: "90%" }}>
          <Button title="Finish Puzzle (Send GPS)" onPress={handleFinishPuzzle} />
        </View>

        {/* Optional: keep camera visible only while playing */}
        <CameraUpload
          onGridDetected={async (detectedGrid) => {
            // 1) Show immediately on screen (no random puzzle)
            setGrid(detectedGrid);
            setCompleted(false);

            // 2) IMPORTANT: lock givens correctly in SudokuGrid
            //    (SudokuGrid already locks "givens" based on the grid prop)

            // 3) Optional: store OCR puzzle in backend so you get a puzzleId
            if (token) {
              const p = await importPuzzle(token, detectedGrid, "vision-ocr");
              setPuzzleId(p.id);
            } else {
              setPuzzleId("vision-ocr");
            }

            // Debug: count how many digits OCR found
            const count = detectedGrid.flat().filter((n) => n !== 0).length;
            alert(`OCR filled ${count} cells`);
          }}
        />
      </>
    )}

    {/* COMPLETION */}
    {completed && completionLocation && (
      <CompletionScreen
        location={completionLocation}
        onNewPuzzle={() => {
          setCompleted(false);
          setPuzzleId(null);
          setGrid(null);
          setCompletionLocation(null);
        }}
      />
    )}
  </ScrollView>
);

}
