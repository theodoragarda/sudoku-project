const GOOGLE_VISION_API_KEY = "Key";

type Vertex = { x?: number; y?: number };
type TextAnnotation = {
  description: string;
  boundingPoly?: { vertices?: Vertex[] };
};

export async function ocrSudokuDigitsFromBase64(base64: string): Promise<number[][]> {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "TEXT_DETECTION", maxResults: 200 }],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Vision API failed: ${res.status} ${t}`);
  }

  const json = await res.json();
  const annotations: TextAnnotation[] =
    json?.responses?.[0]?.textAnnotations ?? [];


  // First item is the “full text”, the rest are tokens/words
  const items = annotations.slice(1);

  // Keep only single digits 1-9 with bounding boxes
  const digits = items
    .map((a) => {
      const d = a.description?.trim();
      if (!/^[1-9]$/.test(d)) return null;

      const verts = a.boundingPoly?.vertices ?? [];
      const xs = verts.map((v) => v.x ?? 0);
      const ys = verts.map((v) => v.y ?? 0);

      // center point of the bounding poly
      const cx = xs.reduce((s, n) => s + n, 0) / Math.max(xs.length, 1);
      const cy = ys.reduce((s, n) => s + n, 0) / Math.max(ys.length, 1);

      return { value: Number(d), cx, cy };
    })
    .filter(Boolean) as { value: number; cx: number; cy: number }[];

  // If OCR found nothing, return an empty grid
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  if (digits.length === 0) return grid;

    // --- Determine overall Sudoku bounding box ---
let minX: number;
let maxX: number;
let minY: number;
let maxY: number;

// Prefer the full-text bounding box (more stable)
const full = annotations[0];
const fullVerts = full?.boundingPoly?.vertices ?? [];

if (fullVerts.length >= 2) {
  const fx = fullVerts.map((v) => v.x ?? 0);
  const fy = fullVerts.map((v) => v.y ?? 0);
  minX = Math.min(...fx);
  maxX = Math.max(...fx);
  minY = Math.min(...fy);
  maxY = Math.max(...fy);
} else {
  // Fallback: use detected digits only
  minX = Math.min(...digits.map((d) => d.cx));
  maxX = Math.max(...digits.map((d) => d.cx));
  minY = Math.min(...digits.map((d) => d.cy));
  maxY = Math.max(...digits.map((d) => d.cy));
}

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  // Map each digit to a row/col by normalized position
  for (const d of digits) {
    const nx = (d.cx - minX) / width;   // 0..1
    const ny = (d.cy - minY) / height;  // 0..1
    const col = Math.min(8, Math.max(0, Math.floor(nx * 9)));
    const row = Math.min(8, Math.max(0, Math.floor(ny * 9)));

    // If multiple digits collide, keep the first (or you can overwrite)
    if (grid[row][col] === 0) grid[row][col] = d.value;
  }

  return grid;
}
