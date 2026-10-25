import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Maximize, Minus, Plus, Printer, ChevronUp, ChevronDown } from "lucide-react";
import { layoutTree, NODE_H, NODE_W, type LayoutNode, type TreeMode } from "@/lib/layout";
import { lifeSpan } from "@/lib/dates";
import { fullName } from "@/lib/relations";
import type { Person } from "@/lib/model";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import { PersonSearch } from "./PersonSearch";

const MIN_Z = 0.15;
const MAX_Z = 2.5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Props {
  focusId: string;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function TreeView({ focusId, selectedId, onSelect }: Props) {
  const data = useStore((s) => s.data);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const layout = useMemo(
    () => layoutTree(data, { focusId, up: settings.up, down: settings.down, mode: settings.mode, collapsed }),
    [data, focusId, settings.up, settings.down, settings.mode, collapsed],
  );
  const people = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data.people]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const fit = useCallback(
    (centerOn?: string) => {
      const el = containerRef.current;
      if (!el || !layout.nodes.length) return;
      const r = el.getBoundingClientRect();
      const pad = 40;
      const z = clamp(Math.min((r.width - pad) / (layout.width || 1), (r.height - pad) / (layout.height || 1)), 0.35, 1);
      const node = centerOn ? layout.nodes.find((n) => n.id === centerOn) : undefined;
      if (node) {
        setView({ z, x: r.width / 2 - (node.x + NODE_W / 2) * z, y: r.height / 2 - (node.y + NODE_H / 2) * z });
      } else {
        setView({ z, x: (r.width - layout.width * z) / 2, y: (r.height - layout.height * z) / 2 });
      }
    },
    [layout],
  );

  useEffect(() => {
    fit(focusId);
    // re-center when focus changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, layout.nodes.length]);

  const zoomAt = (next: number, px: number, py: number) => {
    const v = viewRef.current;
    const z = clamp(next, MIN_Z, MAX_Z);
    const k = z / v.z;
    setView({ z, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
  };

  // wheel (non-passive) + trackpad pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      if (e.ctrlKey || !e.shiftKey) {
        zoomAt(viewRef.current.z * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // pointer pan + pinch
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const moved = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: viewRef.current.z };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y) > 2) moved.current = true;
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const rect = containerRef.current!.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(pinch.current.z * (d / pinch.current.d), (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
    } else if (pointers.current.size === 1) {
      setView((v) => ({ ...v, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const zoomCenter = (f: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    zoomAt(viewRef.current.z * f, r.width / 2, r.height / 2);
  };

  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (!layout.nodes.length) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="no-print absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 p-3">
        <div className="w-full sm:w-72">
          <PersonSearch onPick={onSelect} placeholder="Skocz do osoby…" />
        </div>
        <ModePicker mode={settings.mode} onChange={(mode) => setSettings({ mode })} />
        <DepthPicker label="W górę" value={settings.up} onChange={(up) => setSettings({ up })} />
        <DepthPicker label="W dół" value={settings.down} onChange={(down) => setSettings({ down })} />
      </div>

      <div
        ref={containerRef}
        className="tree-grid h-full w-full touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Drzewo rodzinne"
      >
        <div
          className="absolute left-0 top-0 origin-top-left transition-transform duration-75"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
        >
          <svg
            width={layout.width + 2}
            height={layout.height + 2}
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            aria-hidden
          >
            {layout.edges.map((e, i) => {
              const [x1, y1] = e.from;
              const [x2, y2] = e.to;
              if (e.kind === "union")
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-honey" strokeWidth={3} />;
              const my = y2 - 30;
              return (
                <path
                  key={i}
                  d={`M${x1},${y1} V${my} H${x2} V${y2}`}
                  fill="none"
                  className="stroke-muted-foreground/50"
                  strokeWidth={1.5}
                  strokeDasharray={e.dashed ? "5 4" : undefined}
                />
              );
            })}
          </svg>
          {layout.nodes.map((n) => {
            const p = people.get(n.id)!;
            return (
              <PersonNode
                key={n.id}
                node={n}
                person={p}
                privacy={settings.privacy}
                focused={n.id === focusId}
                selected={n.id === selectedId}
                collapsed={collapsed.has(n.id)}
                onClick={() => !moved.current && onSelect(n.id)}
                onToggle={() => toggleCollapse(n.id)}
              />
            );
          })}
        </div>
      </div>

      <div className="no-print absolute bottom-24 left-3 z-10 flex flex-col gap-2 md:bottom-4">
        <CtrlButton label="Przybliż" onClick={() => zoomCenter(1.25)}>
          <Plus className="size-5" />
        </CtrlButton>
        <CtrlButton label="Oddal" onClick={() => zoomCenter(0.8)}>
          <Minus className="size-5" />
        </CtrlButton>
        <CtrlButton label="Dopasuj do ekranu" onClick={() => fit()}>
          <Maximize className="size-5" />
        </CtrlButton>
        <CtrlButton label="Drukuj" onClick={() => window.print()}>
          <Printer className="size-5" />
        </CtrlButton>
      </div>

      <MiniMap layout={layout} view={view} containerRef={containerRef} onJump={(x, y) => {
        const r = containerRef.current!.getBoundingClientRect();
        setView((v) => ({ ...v, x: r.width / 2 - x * v.z, y: r.height / 2 - y * v.z }));
      }} />
    </div>
  );
}

function CtrlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-xl border bg-card text-foreground shadow-card hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

const MODES: { v: TreeMode; l: string }[] = [
  { v: "hourglass", l: "Klepsydra" },
  { v: "ancestors", l: "Przodkowie" },
  { v: "descendants", l: "Potomkowie" },
];
function ModePicker({ mode, onChange }: { mode: TreeMode; onChange: (m: TreeMode) => void }) {
  return (
    <div className="flex rounded-xl border bg-card p-1 shadow-card" role="radiogroup" aria-label="Tryb drzewa">
      {MODES.map((m) => (
        <button
          key={m.v}
          role="radio"
          aria-checked={mode === m.v}
          onClick={() => onChange(m.v)}
          className={cn(
            "min-h-9 rounded-lg px-3 text-sm font-semibold",
            mode === m.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {m.l}
        </button>
      ))}
    </div>
  );
}

function DepthPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card px-2 py-1 text-sm shadow-card">
      <span className="text-muted-foreground">{label}</span>
      <button aria-label={`${label}: mniej`} className="size-8 rounded-lg hover:bg-muted" onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </button>
      <span className="w-4 text-center font-semibold">{value}</span>
      <button aria-label={`${label}: więcej`} className="size-8 rounded-lg hover:bg-muted" onClick={() => onChange(Math.min(10, value + 1))}>
        +
      </button>
    </div>
  );
}

function PersonNode({
  node,
  person,
  privacy,
  focused,
  selected,
  collapsed,
  onClick,
  onToggle,
}: {
  node: LayoutNode;
  person: Person;
  privacy: boolean;
  focused: boolean;
  selected: boolean;
  collapsed: boolean;
  onClick: () => void;
  onToggle: () => void;
}) {
  const hidePhoto = privacy && person.living;
  const photo = !hidePhoto ? person.photos[0]?.src : undefined;
  const lin = node.lineage;
  return (
    <div className="absolute" style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${fullName(person, privacy)} ${lifeSpan(person)}`}
        className={cn(
          "flex h-full w-full items-center gap-2 rounded-xl border-2 bg-card p-2 text-left shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          lin === "paternal" && "border-paternal/60 bg-paternal-soft",
          lin === "maternal" && "border-maternal/60 bg-maternal-soft",
          lin === "self" && "border-primary",
          lin === "other" && "border-border",
          focused && "ring-4 ring-honey/50",
          selected && "ring-4 ring-primary/50",
        )}
      >
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full font-serif text-lg font-semibold",
            lin === "maternal" ? "bg-maternal text-secondary-foreground" : "bg-paternal text-primary-foreground",
            lin === "other" && "bg-muted text-foreground",
          )}
        >
          {photo ? <img src={photo} alt="" className="size-full object-cover" /> : person.firstName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold leading-tight">{privacy && person.living ? fullName(person, true) : person.firstName}</div>
          <div className="truncate text-xs leading-tight">{privacy && person.living ? "" : person.lastName}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className={cn("inline-block size-2 rounded-full", person.living ? "bg-secondary" : "bg-muted-foreground/50")}
              aria-label={person.living ? "żyje" : "nie żyje"}
            />
            {privacy && person.living ? "żyje" : lifeSpan(person) || (person.living ? "żyje" : "")}
          </div>
        </div>
      </button>
      {(node.hiddenParents || node.hiddenChildren || collapsed) && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Rozwiń gałąź" : "Zwiń gałąź"}
          className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-card"
        >
          {collapsed ? <ChevronDown className="size-4" /> : node.hiddenParents ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      )}
      {!collapsed && node.gen !== 0 && !node.hiddenParents && !node.hiddenChildren && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Zwiń gałąź"
          className="absolute -right-2 -top-2 hidden size-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-card group-hover:flex"
        />
      )}
    </div>
  );
}

function MiniMap({
  layout,
  view,
  containerRef,
  onJump,
}: {
  layout: ReturnType<typeof layoutTree>;
  view: { x: number; y: number; z: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  onJump: (x: number, y: number) => void;
}) {
  const W = 160;
  const s = W / Math.max(layout.width, 1);
  const H = Math.min(120, layout.height * s + 4);
  const sc = Math.min(s, H / Math.max(layout.height, 1));
  const r = containerRef.current?.getBoundingClientRect();
  const vx = (-view.x / view.z) * sc;
  const vy = (-view.y / view.z) * sc;
  const vw = r ? (r.width / view.z) * sc : 0;
  const vh = r ? (r.height / view.z) * sc : 0;
  return (
    <svg
      width={W}
      height={H}
      className="no-print absolute bottom-24 right-20 z-10 hidden rounded-lg border bg-card/90 shadow-card sm:block md:bottom-4 md:right-24"
      onClick={(e) => {
        const b = e.currentTarget.getBoundingClientRect();
        onJump((e.clientX - b.left) / sc, (e.clientY - b.top) / sc);
      }}
      aria-label="Minimapa"
    >
      {layout.nodes.map((n) => (
        <rect key={n.id} x={n.x * sc} y={n.y * sc} width={NODE_W * sc} height={NODE_H * sc} className="fill-primary/50" />
      ))}
      <rect x={vx} y={vy} width={vw} height={vh} className="fill-none stroke-primary" strokeWidth={1.5} />
    </svg>
  );
}
