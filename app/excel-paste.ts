// Excel places copied cells on the clipboard as tab-separated rows.
export function parseExcelPaste(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const rows = lines.map(line => line.split("\t").map(cell => cell.trim()));
  if (rows.length > 1000) throw new Error("Paste up to 1,000 rows at a time.");
  if (rows.some(row => row.length > 3)) throw new Error("Copy at most three columns: X, left Y, and right Y.");
  if (rows.some(row => row.some(cell => cell === "" || !Number.isFinite(Number(cell))))) {
    throw new Error("Copy numeric cells only, without column headings or empty cells.");
  }
  return rows;
}

export function applyExcelPaste(existing: string[][], incoming: string[][], row: number, column: number) {
  if (incoming.some(cells => cells.length + column > 3)) throw new Error("The copied cells extend past the third column. Paste into the first column instead.");
  const result = existing.map(cells => [...cells]);
  incoming.forEach((cells,i) => {
    while (result.length <= row+i) result.push(["", "", ""]);
    cells.forEach((cell,j) => { result[row+i][column+j] = cell; });
  });
  return result;
}
