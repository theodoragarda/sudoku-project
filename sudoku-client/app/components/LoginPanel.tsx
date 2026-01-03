import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { login } from "../api";

export default function LoginPanel({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  const [username, setUsername] = useState("teo");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    try {
      const data = await login(username, password);
      onLoggedIn(data.access_token);
    } catch (e) {
      setError("Login failed. Check username/password.");
    }
  }

  return (
    <View style={{ width: "90%", padding: 16, backgroundColor: "#fff", borderRadius: 12 }}>
      <Text style={{ fontSize: 18, marginBottom: 10, color: "#000" }}>Login</Text>

      <Text style={{ color: "#000" }}>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10, borderRadius: 8, color: "#000" }}
        autoCapitalize="none"
      />

      <Text style={{ color: "#000" }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10, borderRadius: 8, color: "#000" }}
      />

      {error && <Text style={{ color: "red", marginBottom: 10 }}>{error}</Text>}
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
