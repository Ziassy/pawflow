import { describe, expect, it } from "vitest";
import { TABLE_ORDER, parseBackup, serializeBackup, type Row, type TableName } from "./backup";

const empty = () => Object.fromEntries(TABLE_ORDER.map((t) => [t, [] as Row[]])) as Record<TableName, Row[]>;

describe("backup", () => {
  it("round trip: BigInt, tanggal, null", () => {
    const t = empty();
    t.Category = [{ id: 1, name: "Kebutuhan", kind: "EXPENSE", targetBps: 4000, color: "#000", sortOrder: 1 }];
    t.Goal = [{ id: 1, name: "FF", targetAmount: 5_000_000_000n, manualCollected: 0n, deadline: null }];
    t.DebtEntry = [{ id: 1, debtId: 1, date: new Date("2026-10-01T00:00:00Z"), description: "x", amount: -5 }];
    const json = JSON.stringify(serializeBackup(t, new Date("2026-11-25T00:00:00Z")));
    const back = parseBackup(json);
    expect(back.tables.Goal[0].targetAmount).toBe(5_000_000_000n);
    expect(back.tables.DebtEntry[0].date).toEqual(new Date("2026-10-01T00:00:00Z"));
    expect(back.tables.Goal[0].deadline).toBeNull();
    expect(back.exportedAt).toBe("2026-11-25T00:00:00.000Z");
  });
  it("menolak file asing / rusak / versi baru", () => {
    expect(() => parseBackup("{")).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ app: "lain", version: 1, exportedAt: "", tables: {} }))).toThrow(/Bukan file backup/);
    const t = empty();
    t.Category = [{ id: 1, name: "A" }];
    const f = serializeBackup(t);
    expect(() => parseBackup(JSON.stringify({ ...f, version: 99 }))).toThrow(/lebih baru/);
    expect(() => parseBackup(JSON.stringify({ ...f, tables: { ...f.tables, Hack: [] } }))).toThrow(/tidak dikenal/);
    expect(() => parseBackup(JSON.stringify(serializeBackup(empty())))).toThrow(/kategori/);
  });
});
