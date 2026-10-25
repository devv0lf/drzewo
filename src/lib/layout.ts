import type { FamilyData, Person } from "./model";
import { indexPeople, partnersOf } from "./relations";

export type TreeMode = "hourglass" | "ancestors" | "descendants";
export type Lineage = "paternal" | "maternal" | "self" | "other";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  gen: number;
  lineage: Lineage;
  hiddenParents: boolean;
  hiddenChildren: boolean;
}
export interface LayoutEdge {
  from: [number, number];
  to: [number, number];
  kind: "child" | "union";
  dashed: boolean;
}

export const NODE_W = 168;
export const NODE_H = 76;
const GAP_X = 28;
const PARTNER_GAP = 14;
const GAP_Y = 70;

export interface LayoutOptions {
  focusId: string;
  up: number;
  down: number;
  mode: TreeMode;
  collapsed: Set<string>;
}

/**
 * Layered layout for a family graph around a focus person.
 * Generations are rows; couples are kept adjacent; order refined with barycenter sweeps.
 */
export function layoutTree(data: FamilyData, opts: LayoutOptions) {
  const idx = indexPeople(data);
  const children = new Map<string, Person[]>();
  for (const p of data.people)
    for (const l of p.parents) {
      if (!children.has(l.personId)) children.set(l.personId, []);
      children.get(l.personId)!.push(p);
    }

  const up = opts.mode === "descendants" ? 0 : opts.up;
  const down = opts.mode === "ancestors" ? 0 : opts.down;
  const gen = new Map<string, number>();
  const lineage = new Map<string, Lineage>();
  const order: string[] = [];
  const add = (id: string, g: number, lin: Lineage) => {
    if (gen.has(id) || !idx.has(id)) return false;
    gen.set(id, g);
    lineage.set(id, lin);
    order.push(id);
    return true;
  };

  const focus = idx.get(opts.focusId);
  if (!focus) return { nodes: [], edges: [], width: 0, height: 0 };
  add(focus.id, 0, "self");

  // ancestors
  const upQ: string[] = [focus.id];
  while (upQ.length) {
    const id = upQ.shift()!;
    const g = gen.get(id)!;
    if (-g >= up || opts.collapsed.has(id)) continue;
    const p = idx.get(id)!;
    for (const l of p.parents) {
      const parent = idx.get(l.personId);
      if (!parent) continue;
      let lin = lineage.get(id)!;
      if (lin === "self") lin = parent.gender === "f" ? "maternal" : "paternal";
      if (add(parent.id, g - 1, lin)) upQ.push(parent.id);
    }
  }

  // descendants (with partners)
  const downQ: string[] = [focus.id];
  for (const partner of partnersOf(focus, data)) add(partner.id, 0, "other");
  while (downQ.length) {
    const id = downQ.shift()!;
    const g = gen.get(id)!;
    if (g >= down || opts.collapsed.has(id)) continue;
    for (const c of children.get(id) ?? []) {
      if (add(c.id, g + 1, "other")) {
        downQ.push(c.id);
        for (const partner of partnersOf(c, data)) add(partner.id, g + 1, "other");
      }
    }
  }

  // group rows into couple units
  const rows = new Map<number, string[][]>();
  const placed = new Set<string>();
  for (const id of order) {
    if (placed.has(id)) continue;
    const g = gen.get(id)!;
    const unit = [id];
    placed.add(id);
    for (const partner of partnersOf(idx.get(id)!, data)) {
      if (gen.get(partner.id) === g && !placed.has(partner.id)) {
        // husband left by convention, purely cosmetic
        if (partner.gender === "m") unit.unshift(partner.id);
        else unit.push(partner.id);
        placed.add(partner.id);
      }
    }
    if (!rows.has(g)) rows.set(g, []);
    rows.get(g)!.push(unit);
  }

  const gens = [...rows.keys()].sort((a, b) => a - b);
  const xOf = new Map<string, number>();
  const placeRow = (g: number) => {
    const units = rows.get(g)!;
    const widths = units.map((u) => u.length * NODE_W + (u.length - 1) * PARTNER_GAP);
    const total = widths.reduce((s, w) => s + w, 0) + (units.length - 1) * GAP_X;
    let x = -total / 2;
    units.forEach((u, i) => {
      u.forEach((id, j) => xOf.set(id, x + j * (NODE_W + PARTNER_GAP)));
      x += widths[i] + GAP_X;
    });
  };
  gens.forEach(placeRow);

  const neighbors = (id: string, dir: -1 | 1): string[] => {
    const p = idx.get(id)!;
    if (dir === -1) return p.parents.map((l) => l.personId).filter((x) => xOf.has(x));
    return (children.get(id) ?? []).map((c) => c.id).filter((x) => xOf.has(x));
  };
  const bary = (unit: string[], dir: -1 | 1) => {
    const ns = unit.flatMap((id) => neighbors(id, dir));
    if (!ns.length) return null;
    return ns.reduce((s, id) => s + xOf.get(id)!, 0) / ns.length;
  };
  for (let sweep = 0; sweep < 4; sweep++) {
    const dirSeq: [number[], -1 | 1] = sweep % 2 === 0 ? [gens, -1] : [[...gens].reverse(), 1];
    for (const g of dirSeq[0]) {
      const units = rows.get(g)!;
      const keyed = units.map((u, i) => ({ u, k: bary(u, dirSeq[1]) ?? xOf.get(u[0])! + i * 0.001 }));
      keyed.sort((a, b) => a.k - b.k);
      rows.set(g, keyed.map((k) => k.u));
      placeRow(g);
    }
  }

  const minG = gens[0] ?? 0;
  const yOf = (g: number) => (g - minG) * (NODE_H + GAP_Y);
  let minX = Infinity;
  let maxX = -Infinity;
  for (const x of xOf.values()) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + NODE_W);
  }

  const nodes: LayoutNode[] = order.map((id) => {
    const p = idx.get(id)!;
    const g = gen.get(id)!;
    return {
      id,
      x: xOf.get(id)! - minX,
      y: yOf(g),
      gen: g,
      lineage: lineage.get(id)!,
      hiddenParents: p.parents.some((l) => !gen.has(l.personId)),
      hiddenChildren: (children.get(id) ?? []).some((c) => !gen.has(c.id)),
    };
  });
  const pos = new Map(nodes.map((n) => [n.id, n]));

  const edges: LayoutEdge[] = [];
  const seenUnion = new Set<string>();
  for (const n of nodes) {
    const p = idx.get(n.id)!;
    for (const partner of partnersOf(p, data)) {
      const m = pos.get(partner.id);
      const key = [n.id, partner.id].sort().join("|");
      if (!m || m.gen !== n.gen || seenUnion.has(key)) continue;
      seenUnion.add(key);
      const [l, r] = n.x < m.x ? [n, m] : [m, n];
      edges.push({ from: [l.x + NODE_W, l.y + NODE_H / 2], to: [r.x, r.y + NODE_H / 2], kind: "union", dashed: false });
    }
    const vis = p.parents.filter((l) => pos.has(l.personId));
    if (!vis.length) continue;
    const ps = vis.map((l) => pos.get(l.personId)!);
    const px = ps.reduce((s, q) => s + q.x + NODE_W / 2, 0) / ps.length;
    const py = ps[0].y + NODE_H;
    edges.push({
      from: [px, ps.length > 1 ? ps[0].y + NODE_H / 2 : py],
      to: [n.x + NODE_W / 2, n.y],
      kind: "child",
      dashed: vis.every((l) => l.type !== "biological"),
    });
  }

  const height = gens.length ? yOf(gens[gens.length - 1]) + NODE_H : 0;
  return { nodes, edges, width: maxX - minX, height };
}
