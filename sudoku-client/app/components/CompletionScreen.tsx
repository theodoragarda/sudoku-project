import { useEffect, useState } from "react";
import { ActivityIndicator, Button, Linking, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function CompletionScreen({
  location,
  onNewPuzzle,
}: {
  location: { latitude: number; longitude: number };
  onNewPuzzle: () => void;
}) {
  const [place, setPlace] = useState<string | null>(null);

  // Reverse geocode (get a place name) using OpenStreetMap Nominatim (public API)
  useEffect(() => {
    let cancelled = false;

    async function loadPlace() {
      try {
        const url =
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
          `&lat=${encodeURIComponent(location.latitude)}` +
          `&lon=${encodeURIComponent(location.longitude)}`;

        const res = await fetch(url, {
          headers: {
            // Nominatim likes a User-Agent; Expo fetch may not allow setting it on all platforms,
            // but this usually still works without it.
            "Accept": "application/json",
          },
        });

        if (!res.ok) throw new Error("reverse geocode failed");
        const data = await res.json();
        const name = data?.display_name as string | undefined;

        if (!cancelled) setPlace(name ?? null);
      } catch {
        if (!cancelled) setPlace(null);
      }
    }

    loadPlace();
    return () => {
      cancelled = true;
    };
  }, [location.latitude, location.longitude]);

  const openExternalMaps = () => {
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={{ flex: 1, width: "100%", alignItems: "center", padding: 16 }}>
      <Text style={{ fontSize: 26, marginTop: 10, marginBottom: 10, color: "#000" }}>
        🎉 Puzzle Completed!
      </Text>

      <Text style={{ fontSize: 14, color: "#000", marginBottom: 10, textAlign: "center" }}>
        Lat: {location.latitude.toFixed(5)}   Lon: {location.longitude.toFixed(5)}
      </Text>

      <View style={{ width: "100%", height: 260, borderRadius: 16, overflow: "hidden" }}>
        <MapView
          style={{ width: "100%", height: "100%" }}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="Puzzle completed here"
            description={place ?? undefined}
          />
        </MapView>
      </View>

      <View style={{ marginTop: 12, width: "100%", alignItems: "center" }}>
        {place === null ? (
          <Text style={{ color: "#000", opacity: 0.7, textAlign: "center" }}>
            (No place name available)
          </Text>
        ) : (
          <Text style={{ color: "#000", textAlign: "center" }}>
            📍 {place}
          </Text>
        )}

        {place === null && <ActivityIndicator style={{ marginTop: 6 }} />}
      </View>

      <View style={{ marginTop: 16, width: "100%", gap: 10 }}>
        <Button title="Open in Maps" onPress={openExternalMaps} />
        <Button title="New Puzzle" onPress={onNewPuzzle} />
      </View>
    </View>
  );
}
