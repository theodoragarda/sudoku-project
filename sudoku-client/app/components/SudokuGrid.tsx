import { Accelerometer } from "expo-sensors";
import { useEffect, useMemo, useState } from "react";
import { DevSettings, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const GRID_SIZE = 9;

type Props = {
  grid?: number[][]; // 9x9 from backend
};

type Move = {
  index: number;
  prev: number;
  next: number;
};

export default function SudokuGrid({ grid }: Props) {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  // Flat boards (length 81)
  const [givens, setGivens] = useState<number[]>(Array(81).fill(0));
  const [board, setBoard] = useState<number[]>(Array(81).fill(0));

  // Undo stack
  const [moves, setMoves] = useState<Move[]>([]);

  // Load a new puzzle grid (and lock givens)
  useEffect(() => {
    if (!grid) return;
    const flat = grid.flat();
    if (flat.length !== 81) return;

    setGivens(flat);
    setBoard(flat);
    setSelectedCell(null);
    setMoves([]); // reset undo history on new puzzle
  }, [grid]);

  // 🔥 Shake gesture = Undo last move
  useEffect(() => {
    const sub = DevSettings.addMenuItem?.("Undo last move (Shake)", () => {});
    // Note: addMenuItem is dev-menu; shake triggers it. In Expo Go, shaking opens dev menu.
    // We’ll handle actual undo using the same gesture via DevSettings listener below.

    // There is no public “shake event” in React Native core without extra libs.
    // In Expo Go, shake opens the dev menu. We'll use a *manual* visible button fallback too.
    return () => {
      // no cleanup needed for addMenuItem
    };
  }, []);

  // Manual undo function (used by shake workaround + button)
  function undoLastMove() {
    setMoves((prevMoves) => {
      if (prevMoves.length === 0) return prevMoves;

      const last = prevMoves[prevMoves.length - 1];
      setBoard((prevBoard) => {
        const nextBoard = [...prevBoard];
        nextBoard[last.index] = last.prev;
        return nextBoard;
      });

      return prevMoves.slice(0, -1);
    });
  }

  useEffect(() => {
  // Tune these values if needed
  const UPDATE_MS = 100;        // sensor sampling interval
  const SHAKE_THRESHOLD = 2.2;  // higher = harder to trigger
  const COOLDOWN_MS = 700;      // prevent multiple triggers

  Accelerometer.setUpdateInterval(UPDATE_MS);

  let lastShakeTime = 0;

  const sub = Accelerometer.addListener(({ x, y, z }) => {
    const now = Date.now();
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // magnitude around ~1 when still (gravity). shake spikes higher.
    if (magnitude > SHAKE_THRESHOLD && now - lastShakeTime > COOLDOWN_MS) {
      lastShakeTime = now;
      undoLastMove();
    }
  });

  return () => sub.remove();
}, []);

  const selectedInfo = useMemo(() => {
    if (selectedCell === null) return null;
    const row = Math.floor(selectedCell / 9);
    const col = selectedCell % 9;
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    const selectedValue = board[selectedCell] || 0;
    return { row, col, boxRow, boxCol, selectedValue };
  }, [selectedCell, board]);

  function cellBoxBorders(index: number) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    return {
      borderTopWidth: row % 3 === 0 ? 2 : 0.5,
      borderLeftWidth: col % 3 === 0 ? 2 : 0.5,
      borderRightWidth: col === 8 ? 2 : 0.5,
      borderBottomWidth: row === 8 ? 2 : 0.5,
    };
  }

  function handleNumberPress(num: number) {
    if (selectedCell === null) return;
    if (givens[selectedCell] !== 0) return; // locked

    const prevVal = board[selectedCell];
    if (prevVal === num) return; // no-op

    const next = [...board];
    next[selectedCell] = num;
    setBoard(next);

    // record move
    setMoves((m) => [...m, { index: selectedCell, prev: prevVal, next: num }]);
  }

  function handleClear() {
    if (selectedCell === null) return;
    if (givens[selectedCell] !== 0) return;

    const prevVal = board[selectedCell];
    if (prevVal === 0) return;

    const next = [...board];
    next[selectedCell] = 0;
    setBoard(next);

    setMoves((m) => [...m, { index: selectedCell, prev: prevVal, next: 0 }]);
  }

  // --------- Mistake detection ----------
  const mistakeSet = useMemo(() => {
    const conflicts = new Set<number>();

    function markConflicts(indices: number[]) {
      const seen = new Map<number, number[]>();
      for (const idx of indices) {
        const v = board[idx];
        if (!v) continue;
        if (!seen.has(v)) seen.set(v, []);
        seen.get(v)!.push(idx);
      }
      for (const idxs of seen.values()) {
        if (idxs.length > 1) idxs.forEach((i) => conflicts.add(i));
      }
    }

    for (let r = 0; r < 9; r++) markConflicts(Array.from({ length: 9 }, (_, c) => r * 9 + c));
    for (let c = 0; c < 9; c++) markConflicts(Array.from({ length: 9 }, (_, r) => r * 9 + c));

    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const inds: number[] = [];
        for (let r = br * 3; r < br * 3 + 3; r++) {
          for (let c = bc * 3; c < bc * 3 + 3; c++) inds.push(r * 9 + c);
        }
        markConflicts(inds);
      }
    }

    return conflicts;
  }, [board]);

  function isSameBox(index: number, boxRow: number, boxCol: number) {
    const r = Math.floor(index / 9);
    const c = index % 9;
    return Math.floor(r / 3) === boxRow && Math.floor(c / 3) === boxCol;
  }

  return (
    <>
      <View style={styles.grid}>
        {board.map((value, index) => {
          const isGiven = givens[index] !== 0;
          const isMistake = mistakeSet.has(index);

          let extraBg: any = null;

          if (selectedInfo) {
            const r = Math.floor(index / 9);
            const c = index % 9;

            const sameRow = r === selectedInfo.row;
            const sameCol = c === selectedInfo.col;
            const sameBox = isSameBox(index, selectedInfo.boxRow, selectedInfo.boxCol);

            if (sameRow || sameCol) extraBg = styles.relatedCell;
            if (sameBox) extraBg = styles.boxCell;

            if (
              selectedInfo.selectedValue !== 0 &&
              value === selectedInfo.selectedValue &&
              index !== selectedCell
            ) {
              extraBg = styles.sameNumberCell;
            }

            if (selectedCell === index) extraBg = styles.selectedCell;
          }

          return (
            <TouchableOpacity
              key={index}
              style={[styles.cell, cellBoxBorders(index), extraBg, isGiven && styles.givenCell]}
              onPress={() => setSelectedCell(index)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cellText, isGiven && styles.givenText, isMistake && styles.mistakeText]}>
                {value !== 0 ? value : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.numberPad}>
        {Array.from({ length: 9 }).map((_, i) => (
          <TouchableOpacity key={i} style={styles.numberButton} onPress={() => handleNumberPress(i + 1)}>
            <Text style={styles.numberText}>{i + 1}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>

        {/* ✅ Reliable undo button (shake in Expo Go opens dev menu, so this guarantees undo works) */}
        <TouchableOpacity style={styles.undoButton} onPress={undoLastMove}>
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
      </View>

    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: 330,
    height: 330,
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#fff",
  },
  cell: {
    width: "11.11%",
    height: "11.11%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#000",
  },

  relatedCell: { backgroundColor: "#eef6ff" },
  boxCell: { backgroundColor: "#e6f0ff" },
  sameNumberCell: { backgroundColor: "#fff3bf" },
  selectedCell: { backgroundColor: "#cce5ff" },

  givenCell: { backgroundColor: "#f3f3f3" },

  cellText: { fontSize: 18, color: "#000" },
  givenText: { fontWeight: "700", color: "#444" },
  mistakeText: { color: "#d11", fontWeight: "800" },

  numberPad: {
    flexDirection: "row",
    marginTop: 20,
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  numberButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#ddd",
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
  },
  numberText: { fontSize: 18, color: "#000" },

  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#bbb",
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  clearText: { fontSize: 16, color: "#000", fontWeight: "600" },

  undoButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#bbb",
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  undoText: { fontSize: 16, color: "#000", fontWeight: "600" },
});
