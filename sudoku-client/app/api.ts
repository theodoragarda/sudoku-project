const BASE_URL = "http://theodoragarda.pythonanywhere.com";

export async function login(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json(); // { access_token, token_type }
}

export async function newPuzzle(token: string) {
  const res = await fetch(`${BASE_URL}/puzzle/new?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error("Failed to create puzzle");
  return res.json(); // { id, grid, ... }
}

export async function finishPuzzle(token: string, puzzleId: string, latitude: number, longitude: number) {
  const res = await fetch(`${BASE_URL}/puzzle/${puzzleId}/finish?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  if (!res.ok) throw new Error("Failed to finish puzzle");
  return res.json();
}

export async function cloudPuzzle(token: string) {
  const res = await fetch(`${BASE_URL}/cloud-puzzle?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error("Failed to load cloud puzzle");
  return res.json();
}

export async function importPuzzle(token: string, grid: number[][], source = "cloud-client") {
  const res = await fetch(`${BASE_URL}/puzzle/import?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grid, source }),
  });
  if (!res.ok) throw new Error("Failed to import puzzle");
  return res.json(); // { id, grid, source }
}

export async function fetchCloudGridFromPublicAPI() {
  const res = await fetch("https://sudoku-api.vercel.app/api/dosuku?difficulty=easy");
  if (!res.ok) throw new Error("Public cloud API failed");
  const data = await res.json();
  return data.newboard.grids[0].value as number[][];
}
