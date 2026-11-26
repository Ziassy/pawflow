import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TABLE_ORDER } from "./backup";
import { NESTED_CREATES, OWNED_FKS, UNSCOPED_MODELS } from "./tenancy";

// Parse kasar schema.prisma: model -> daftar [nama field, tipe].
const schema = readFileSync(path.join(__dirname, "../../prisma/schema.prisma"), "utf8");
const models = new Map<string, [string, string][]>();
for (const m of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
  const fields = [...m[2].matchAll(/^\s+(\w+)\s+(\w+\??(?:\[\])?)/gm)].map((f) => [f[1], f[2]] as [string, string]);
  models.set(m[1], fields);
}
const owned = [...models.keys()].filter((m) => !(UNSCOPED_MODELS as readonly string[]).includes(m));

describe("kepemilikan data per akun", () => {
  it("setiap model selain User & LoginThrottle punya kolom userId", () => {
    const missing = owned.filter((m) => !models.get(m)!.some(([f]) => f === "userId"));
    expect(missing).toEqual([]);
  });

  it("setiap foreign key ke data akun terdaftar di OWNED_FKS (dicek saat tulis)", () => {
    const unlisted: string[] = [];
    for (const m of owned) {
      for (const [f, type] of models.get(m)!) {
        if (f === "userId" || !/Id$/.test(f) || !/^Int\??$/.test(type)) continue;
        if (!OWNED_FKS[m]?.[f]) unlisted.push(`${m}.${f}`);
      }
    }
    expect(unlisted).toEqual([]);
  });

  it("OWNED_FKS & NESTED_CREATES hanya menyebut model yang ada", () => {
    for (const [m, fks] of Object.entries(OWNED_FKS)) {
      expect(models.has(m), m).toBe(true);
      for (const target of Object.values(fks)) expect(owned, `${m} -> ${target}`).toContain(target);
    }
    for (const [m, rel] of Object.entries(NESTED_CREATES)) {
      for (const [field, child] of Object.entries(rel)) {
        expect(models.get(m)!.some(([f, t]) => f === field && t === `${child}[]`), `${m}.${field}`).toBe(true);
      }
    }
  });

  it("backup mencakup semua model akun, induk sebelum anak (restore memetakan ulang id)", () => {
    expect([...TABLE_ORDER].sort()).toEqual([...owned].sort());
    for (const [m, fks] of Object.entries(OWNED_FKS)) {
      for (const target of Object.values(fks)) {
        expect(TABLE_ORDER.indexOf(target as never), `${target} sebelum ${m}`).toBeLessThan(TABLE_ORDER.indexOf(m as never));
      }
    }
  });
});
