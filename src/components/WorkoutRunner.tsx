import { useState, useEffect, useRef, useMemo } from "react";
import { lastSessionLineForExercise, plateStepKg, progressGymTip, sparkWeightsForExercise, type LogEntry } from "../lib/workoutMath";
import { clearWorkoutSession, loadWorkoutSession, saveWorkoutSession, workoutSessionSignature } from "../lib/workoutSessionStorage";

type ExDef = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rest: number;
  dw?: number;
  tech?: string;
  cues?: string;
};

type WoDef = {
  id: string;
  label: string;
  focus: string;
  quick?: boolean;
  warmup?: string[];
  exercises: ExDef[];
  finisher?: string | null;
  posture?: string[];
};

type ExInfo = { img: string; page: string; steps: string[] };

type SMap = Record<string, React.CSSProperties>;

function getInitialWorkoutState(wo: WoDef, gw: (id: string) => number, persistKey: string) {
  const sig = workoutSessionSignature(wo, !!wo.quick, persistKey);
  const saved = loadWorkoutSession(sig);
  if (saved?.swBySet && saved?.srBySet && saved?.ds && saved?.skip) {
    return {
      swBySet: saved.swBySet,
      srBySet: saved.srBySet,
      ds: saved.ds,
      skip: saved.skip,
      warmDone: saved.warmDone,
      finisherDone: saved.finisherDone,
      postDone: saved.postDone,
      focusMode: saved.focusMode,
      focusExIdx: saved.focusExIdx,
    };
  }
  const w: Record<string, number[]> = {};
  const r: Record<string, number[]> = {};
  const s: Record<string, number> = {};
  const o: Record<string, boolean> = {};
  wo.exercises.forEach((e) => {
    const b = gw(e.id);
    w[e.id] = Array.from({ length: e.sets }, () => b);
    r[e.id] = Array.from({ length: e.sets }, () => e.reps);
    s[e.id] = 0;
    o[e.id] = false;
  });
  return {
    swBySet: w,
    srBySet: r,
    ds: s,
    skip: o,
    warmDone: false,
    finisherDone: false,
    postDone: false,
    focusMode: false,
    focusExIdx: 0,
  };
}

function RestRing({ left, total }: { left: number; total: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  return (
    <svg width={52} height={52} viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--border, #2a2535)" strokeWidth={5} />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="#a78bfa"
        strokeWidth={5}
        strokeDasharray={`${frac * c} ${c}`}
        transform="rotate(-90 26 26)"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Sparkline({ pts }: { pts: number[] }) {
  const w = 80;
  const h = 32;
  const max = Math.max(...pts, 1e-6);
  const pos = pts.filter((x) => x > 0);
  const minRaw = pos.length ? Math.min(...pos) : 0;
  const min = Math.min(0, minRaw);
  const span = max - min || 1;
  const d = pts
    .map((p, i) => {
      const x = (i / Math.max(pts.length - 1, 1)) * w;
      const val = p > 0 ? p : min;
      const y = h - ((val - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const hasData = pts.some((p) => p > 0);
  return (
    <svg width={w} height={h} style={{ opacity: hasData ? 1 : 0.35 }}>
      <path d={d} fill="none" stroke="#a78bfa" strokeWidth="2" />
    </svg>
  );
}

export function WorkoutRunner({
  wo,
  gw,
  wH,
  onDone,
  onBack,
  sP,
  sSP,
  ro,
  log,
  popup,
  fbNote,
  setFbNote,
  fbTags,
  setFbTags,
  rId,
  rL,
  rMax,
  startRest,
  clearRest,
  getExInfo,
  persistKey,
  filaSwipe,
  S,
}: {
  wo: WoDef;
  gw: (id: string) => number;
  wH: (id: string) => { date?: string; weight?: number }[];
  onDone: (w: WoDef, weights: Record<string, { kg?: number[]; reps?: number[] }>, fb: { tags: string[]; note: string; skipped: string[] }) => void;
  onBack: () => void;
  sP: boolean;
  sSP: (v: boolean | ((p: boolean) => boolean)) => void;
  ro?: boolean;
  log: LogEntry[] | undefined;
  popup: React.ReactNode;
  fbNote: string;
  setFbNote: (v: string) => void;
  fbTags: string[];
  setFbTags: (v: string[] | ((p: string[]) => string[])) => void;
  rId: string | null;
  rL: number;
  rMax: number;
  startRest: (exId: string, sec: number) => void;
  clearRest: () => void;
  getExInfo: (id: string) => ExInfo | undefined;
  persistKey: string;
  filaSwipe?: { onDelta: (d: -1 | 1) => void } | null;
  S: SMap;
}) {
  const sig = workoutSessionSignature(wo, !!wo.quick, persistKey);
  const today = useMemo(() => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const y = p.find((x) => x.type === "year")?.value;
    const m = p.find((x) => x.type === "month")?.value;
    const d = p.find((x) => x.type === "day")?.value;
    return `${y}-${m}-${d}`;
  }, []);

  const fullInitRef = useRef<ReturnType<typeof getInitialWorkoutState> | null>(null);
  if (fullInitRef.current === null) fullInitRef.current = getInitialWorkoutState(wo, gw, persistKey);
  const ini = fullInitRef.current;
  const [swBySet, sSwBySet] = useState(ini.swBySet);
  const [srBySet, sSrBySet] = useState(ini.srBySet);
  const [ds, sDs] = useState(ini.ds);
  const [skip, sSkip] = useState(ini.skip);
  const [warmDone, setWarmDone] = useState(ini.warmDone);
  const [finisherDone, setFinisherDone] = useState(ini.finisherDone);
  const [postDone, setPostDone] = useState(ini.postDone);
  const [focusMode, setFocusMode] = useState(ini.focusMode);
  const [focusExIdx, setFocusExIdx] = useState(ini.focusExIdx);

  const [showFb, setShowFb] = useState(false);
  const [exModal, setExModal] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      saveWorkoutSession({
        v: 1,
        signature: sig,
        swBySet,
        srBySet,
        ds,
        skip,
        warmDone,
        finisherDone,
        postDone,
        focusMode,
        focusExIdx,
      });
    }, 280);
    return () => clearTimeout(t);
  }, [sig, swBySet, srBySet, ds, skip, warmDone, finisherDone, postDone, focusMode, focusExIdx]);

  function tick(id: string, total: number, rest: number) {
    if (ro || skip[id]) return;
    sDs((p) => {
      const c = p[id] || 0;
      const n = c < total ? c + 1 : 0;
      if (n > 0 && n < total) startRest(id, rest);
      return { ...p, [id]: n };
    });
  }

  function toggleSkip(id: string) {
    if (ro) return;
    sSkip((p) => {
      const nv = !p[id];
      if (nv) sDs((q) => ({ ...q, [id]: 0 }));
      return { ...p, [id]: nv };
    });
  }

  const activeEx = wo.exercises.filter((e) => !skip[e.id]);
  const doneSets = activeEx.reduce((a, e) => a + (ds[e.id] || 0), 0);
  const totalSets = activeEx.reduce((a, e) => a + e.sets, 0);
  const allSkipped = wo.exercises.length > 0 && wo.exercises.every((e) => skip[e.id]);
  const pct = totalSets > 0 ? (doneSets / totalSets) * 100 : allSkipped ? 100 : 0;
  const hasAny = doneSets > 0 || allSkipped;

  function canChangeFila() {
    if (ro) return false;
    if (warmDone || finisherDone || postDone) return false;
    if (doneSets > 0) return false;
    if (Object.values(skip).some(Boolean)) return false;
    return true;
  }

  function doFinish() {
    clearWorkoutSession();
    const skippedIds = wo.exercises.filter((e) => skip[e.id]).map((e) => e.id);
    const weights: Record<string, { kg?: number[]; reps?: number[] }> = {};
    wo.exercises.forEach((ex) => {
      if (skip[ex.id]) return;
      weights[ex.id] = { kg: swBySet[ex.id] || [], reps: srBySet[ex.id] || [] };
    });
    onDone(wo, weights, { tags: fbTags, note: fbNote, skipped: skippedIds });
  }

  function toggleFb(t: string) {
    setFbTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  }

  const modalInfo = exModal ? getExInfo(exModal) : undefined;
  const modalEx = exModal ? wo.exercises.find((e) => e.id === exModal) : undefined;

  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const edgeRef = useRef<{ x: number } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    if (t.clientX < 28) edgeRef.current = { x: t.clientX };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const te = e.changedTouches[0];
    const st = touchRef.current;
    touchRef.current = null;
    if (!st) {
      edgeRef.current = null;
      return;
    }
    const dx = te.clientX - st.x;
    const dy = te.clientY - st.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (edgeRef.current && te.clientX - edgeRef.current.x > 56 && adx > ady) {
      edgeRef.current = null;
      onBack();
      return;
    }
    edgeRef.current = null;

    if (focusMode && ady > 50 && ady > adx) {
      if (dy < -40) setFocusExIdx((i) => Math.min(i + 1, wo.exercises.length - 1));
      if (dy > 40) setFocusExIdx((i) => Math.max(i - 1, 0));
      return;
    }

    if (!filaSwipe || !canChangeFila()) return;
    if (adx > 56 && adx > ady) {
      if (dx < 0) filaSwipe.onDelta(1);
      else filaSwipe.onDelta(-1);
    }
  }

  function adjustKg(ex: ExDef, si: number, delta: number) {
    if (ro) return;
    const step = plateStepKg(ex.id);
    const d = delta > 0 ? step : -step;
    sSwBySet((p) => {
      const a = [...(p[ex.id] || [])];
      while (a.length < ex.sets) a.push(gw(ex.id));
      const cur = a[si] ?? gw(ex.id);
      a[si] = Math.max(0, Math.round((cur + d) * 1000) / 1000);
      return { ...p, [ex.id]: a };
    });
  }

  const cardBg = "var(--card, #13101e)";
  const cardBorder = "var(--border, #1a1528)";

  if (showFb)
    return (
      <div style={S.root}>
        {popup}
        <div style={S.bar}>
          <button type="button" style={S.bk} onClick={() => setShowFb(false)}>
            ←
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Avaliação do treino</div>
          </div>
        </div>
        <div style={S.pd}>
          <p style={{ fontSize: 14, color: "var(--muted, #b0a8c4)", marginBottom: 16 }}>
            Como foi <b>{wo.label}</b>?
          </p>
          <div style={S.fbTs}>
            {["💪 Me senti forte", "😓 Pesado", "😴 Sem energia", "🔥 Perfeito!", "⚡ Quero mais", "🤕 Desconforto"].map((t) => (
              <button
                key={t}
                type="button"
                style={{
                  ...S.fbT,
                  background: fbTags.includes(t) ? "#a78bfa" : "var(--card2, #1a1528)",
                  color: fbTags.includes(t) ? "#0c0a14" : "var(--muted, #b0a8c4)",
                }}
                onClick={() => toggleFb(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            style={S.fbI}
            placeholder="Observações (opcional)..."
            value={fbNote}
            onChange={(e) => setFbNote(e.target.value)}
            rows={3}
          />
          <button style={{ ...S.bp, marginTop: 16 }} onClick={doFinish}>
            Salvar e concluir 🎉
          </button>
          <button style={{ ...S.bg2, marginTop: 10 }} onClick={doFinish}>
            Continuar sem comentários
          </button>
        </div>
      </div>
    );

  const focusEx = wo.exercises[focusExIdx] || wo.exercises[0];

  return (
    <div
      style={{ ...S.root, touchAction: focusMode ? "pan-y" : "manipulation" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {popup}
      {!focusMode && (
        <>
          <div style={S.bar}>
            <button type="button" style={S.bk} onClick={() => { clearWorkoutSession(); onBack(); }}>
              ←
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{wo.label}</div>
              {wo.quick && <div style={{ fontSize: 11, color: "var(--muted, #6b6280)" }}>{wo.focus} · ⚡ Modo rápido</div>}
              {!wo.quick && <div style={{ fontSize: 11, color: "var(--muted, #6b6280)" }}>{wo.focus}</div>}
            </div>
            <button
              type="button"
              style={{ ...S.bk, fontSize: 12, width: "auto", padding: "0 12px" }}
              onClick={() => setFocusMode(true)}
            >
              Foco
            </button>
          </div>
          {wo.quick && (
            <div style={S.quickStrip}>Prioridade: completar o essencial no menor tempo. Ajuste as cargas se precisar.</div>
          )}
        </>
      )}
      {focusMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: `1px solid ${cardBorder}`,
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "var(--app-bg, #0c0a14)",
          }}
        >
          <button type="button" style={S.bk} onClick={() => setFocusMode(false)}>
            ✕
          </button>
          <span style={{ fontWeight: 800, fontSize: 13 }}>Modo foco · deslize ↑↓</span>
          <span style={{ width: 40 }} />
        </div>
      )}

      <div style={S.wPBg}>
        <div style={{ ...S.wPF, width: `${pct}%` }} />
      </div>

      {rId && rL > 0 && !focusMode && (
        <div style={S.tmr}>
          <span>
            ⏱ <b>{rL}s</b>
          </span>
          <button type="button" style={S.tmrS} onClick={clearRest}>
            Pular
          </button>
        </div>
      )}

      <div style={{ ...S.pd, paddingBottom: focusMode ? 120 : 48 }}>
        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
          {wo.exercises.map((ex) => {
            const sk = skip[ex.id];
            const prog = sk ? 0 : Math.min(1, (ds[ex.id] || 0) / ex.sets);
            return (
              <div
                key={ex.id}
                title={ex.name}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: "var(--card2, #2a2535)",
                  position: "relative",
                  overflow: "hidden",
                  opacity: sk ? 0.35 : 1,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${prog * 100}%`,
                    background: prog >= 1 ? "#22c55e" : "#a78bfa",
                  }}
                />
              </div>
            );
          })}
        </div>

        {wo.warmup && wo.warmup.length > 0 && !focusMode && (
          <div style={{ ...S.blk, borderLeft: warmDone ? "3px solid #22c55e" : "3px solid transparent", background: cardBg }}>
            <div style={S.blkR} onClick={() => setWarmDone(!warmDone)}>
              <div style={{ ...S.chk, background: warmDone ? "#22c55e" : "#2a2535" }}>{warmDone && "✓"}</div>
              <div style={S.blkH}>🔥 Aquecimento</div>
            </div>
            {wo.warmup.map((w, i) => (
              <div key={i} style={S.blkI}>
                • {w}
              </div>
            ))}
          </div>
        )}

        {!focusMode && <div style={S.blkH}>💪 Exercícios</div>}

        {(focusMode ? [focusEx] : wo.exercises).map((ex) => {
          const i = wo.exercises.indexOf(ex);
          const sk = skip[ex.id];
          const fin = !sk && (ds[ex.id] || 0) >= ex.sets;
          const h = wH(ex.id);
          const kgs = swBySet[ex.id] || [];
          const rps = srBySet[ex.id] || [];
          const cw = kgs.length ? kgs[kgs.length - 1] : gw(ex.id);
          const lastW = h.length ? h[h.length - 1].weight : null;
          const p = progressGymTip(ex.id, log, cw);
          const ei = getExInfo(ex.id);
          const bc = sk ? "#6b7280" : fin ? "#22c55e" : "#a78bfa";
          const spark = sparkWeightsForExercise(log, ex.id, 5);
          const lastLine = lastSessionLineForExercise(log, wo.id, ex.id, today);
          const showVs = !sk && lastW !== null && lastW !== cw;
          const step = plateStepKg(ex.id);
          const timerHere = rId === ex.id && rL > 0;

          const big = focusMode ? { fontSize: 26, fontWeight: 900 } : {};
          const nameFs = focusMode ? 24 : 14;

          return (
            <div
              key={ex.id}
              style={{
                ...S.eC,
                borderLeftColor: bc,
                opacity: sk ? 0.72 : 1,
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                marginBottom: focusMode ? 16 : 10,
                padding: focusMode ? 22 : 16,
              }}
            >
              <div style={S.eT}>
                {!focusMode &&
                  (ei ? (
                    <button type="button" style={S.eThWrap} onClick={() => !sk && setExModal(ex.id)} aria-label={`Ilustração: ${ex.name}`} disabled={sk}>
                      <img src={ei.img} alt="" style={{ ...S.eThImg, filter: sk ? "grayscale(0.6)" : undefined }} loading="lazy" decoding="async" />
                      <span style={S.eThBadge}>{i + 1}</span>
                    </button>
                  ) : (
                    <div style={S.eI} onClick={() => !sk && setExModal(ex.id)}>
                      {i + 1}
                    </div>
                  ))}
                <div style={{ flex: 1 }}>
                  <div style={{ ...S.eN, ...big, fontSize: nameFs }}>
                    {ex.name}
                    {sk && <span style={S.eSkip}> · não feito</span>}{" "}
                    {!focusMode && (
                      <button type="button" style={S.eInfoBt} onClick={() => setExModal(ex.id)} aria-label="Instruções">
                        📷
                      </button>
                    )}
                  </div>
                  <div style={{ ...S.eM, fontSize: focusMode ? 15 : 11 }}>
                    {ex.sets} séries · sugerido {ex.reps} reps · {ex.rest}s
                  </div>
                  {ex.tech && <div style={S.eTc}>{ex.tech}</div>}
                  {!sk && spark.some((x) => x > 0) && (
                    <div style={{ marginTop: 8 }}>
                      <Sparkline pts={spark} />
                    </div>
                  )}
                  {!sk && h.length >= 2 && !focusMode && (
                    <div style={{ fontSize: 10, marginTop: 6, fontWeight: 600, color: p.color }}>
                      {p.icon} {p.tip}
                    </div>
                  )}
                  {lastLine && (
                    <div style={{ fontSize: focusMode ? 14 : 10, marginTop: 6, fontWeight: 600, color: "var(--muted, #a78bfa)" }}>
                      {lastLine}
                    </div>
                  )}
                  {showVs && (
                    <div style={{ fontSize: focusMode ? 13 : 10, marginTop: 4, fontWeight: 700, color: cw > lastW! ? "#22c55e" : "#ef4444" }}>
                      vs último treino: {cw > lastW! ? "+" : ""}
                      {(cw - lastW!).toFixed(1).replace(/\.0$/, "")} kg (última série)
                    </div>
                  )}
                </div>
                {timerHere && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <RestRing left={rL} total={rMax || ex.rest} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#c4b5fd", textAlign: "center" }}>
                      Próxima série em {rL}s
                    </span>
                  </div>
                )}
              </div>
              {!ro && !focusMode && (
                <div style={S.eSkipRow}>
                  <button
                    type="button"
                    style={{ ...S.eSkipBt, background: sk ? "#3a3348" : "transparent", color: sk ? "#ede9f7" : "var(--muted, #6b6280)" }}
                    onClick={() => toggleSkip(ex.id)}
                  >
                    {sk ? "↩ Desfazer" : "⊘ Não realizado"}
                  </button>
                </div>
              )}
              {!sk ? (
                <>
                  <div style={{ ...S.eSetWrap, gap: focusMode ? 12 : 6 }}>
                    {Array.from({ length: ex.sets }).map((_, si) => {
                      const kgV = kgs[si] ?? gw(ex.id);
                      const rpV = rps[si] ?? ex.reps;
                      const done = si < (ds[ex.id] || 0);
                      return (
                        <div key={si} style={{ ...S.eSetRow, opacity: done ? 1 : 0.92, flexWrap: focusMode ? "wrap" : "wrap" }}>
                          <span style={{ ...S.eSetLbl, fontSize: focusMode ? 14 : 10 }}>S{si + 1}</span>
                          {!ro && (
                            <button
                              type="button"
                              style={{
                                minWidth: 36,
                                padding: "6px 8px",
                                borderRadius: 10,
                                border: `1px solid ${cardBorder}`,
                                background: "var(--card2, #1d1735)",
                                color: "#c4b5fd",
                                fontWeight: 800,
                                fontSize: focusMode ? 16 : 12,
                              }}
                              onClick={() => adjustKg(ex, si, -1)}
                            >
                              −{step}
                            </button>
                          )}
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            style={{ ...S.eSetIn, width: focusMode ? 72 : 54, fontSize: focusMode ? 20 : 13 }}
                            value={kgV}
                            readOnly={!!ro}
                            disabled={ro}
                            onChange={(e) => {
                              const n = parseFloat(e.target.value);
                              if (isNaN(n) || n < 0) return;
                              sSwBySet((p) => {
                                const a = [...(p[ex.id] || [])];
                                while (a.length < ex.sets) a.push(gw(ex.id));
                                a[si] = n;
                                return { ...p, [ex.id]: a };
                              });
                            }}
                          />
                          {!ro && (
                            <button
                              type="button"
                              style={{
                                minWidth: 36,
                                padding: "6px 8px",
                                borderRadius: 10,
                                border: `1px solid ${cardBorder}`,
                                background: "var(--card2, #1d1735)",
                                color: "#c4b5fd",
                                fontWeight: 800,
                                fontSize: focusMode ? 16 : 12,
                              }}
                              onClick={() => adjustKg(ex, si, 1)}
                            >
                              +{step}
                            </button>
                          )}
                          <span style={S.eSetUnit}>kg</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            style={{ ...S.eSetInR, width: focusMode ? 56 : 42, fontSize: focusMode ? 18 : 13 }}
                            value={rpV}
                            readOnly={!!ro}
                            disabled={ro}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              if (isNaN(n) || n < 0) return;
                              sSrBySet((p) => {
                                const a = [...(p[ex.id] || [])];
                                while (a.length < ex.sets) a.push(ex.reps);
                                a[si] = n;
                                return { ...p, [ex.id]: a };
                              });
                            }}
                          />
                          <span style={S.eSetUnit}>reps</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={S.eB}>
                    <div style={S.wGhost} />
                    <div style={S.sR}>
                      {Array.from({ length: ex.sets }).map((_, si) => (
                        <div
                          key={si}
                          style={{
                            ...S.sD,
                            width: focusMode ? 32 : 24,
                            height: focusMode ? 32 : 24,
                            background: sk ? "#2a2535" : si < (ds[ex.id] || 0) ? "#22c55e" : "#2a2535",
                            opacity: sk ? 0.35 : 1,
                            cursor: sk || ro ? "default" : "pointer",
                          }}
                          onClick={() => tick(ex.id, ex.sets, ex.rest)}
                        />
                      ))}
                      <span style={{ ...S.sCtn, fontSize: focusMode ? 14 : 11 }}>{sk ? "—" : `${ds[ex.id] || 0}/${ex.sets}`}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={S.eB}>
                  <div style={S.wGhost}>—</div>
                </div>
              )}
            </div>
          );
        })}

        {focusMode && (
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted, #6b6280)", marginTop: 8 }}>
            {focusExIdx + 1}/{wo.exercises.length} — deslize para cima para o próximo
          </p>
        )}

        {wo.finisher && !focusMode && (
          <div style={{ ...S.blk, borderLeft: finisherDone ? "3px solid #22c55e" : "3px solid transparent", background: cardBg }}>
            <div style={S.blkR} onClick={() => setFinisherDone(!finisherDone)}>
              <div style={{ ...S.chk, background: finisherDone ? "#22c55e" : "#2a2535" }}>{finisherDone && "✓"}</div>
              <div style={S.blkH}>🏃 Finalizador</div>
            </div>
            <div style={S.blkI}>{wo.finisher}</div>
          </div>
        )}

        {wo.posture && wo.posture.length > 0 && !focusMode && (
          <div style={{ ...S.blk, borderLeft: postDone ? "3px solid #22c55e" : "3px solid transparent", marginTop: 8, background: cardBg }}>
            <div style={S.blkR} onClick={() => setPostDone(!postDone)}>
              <div style={{ ...S.chk, background: postDone ? "#22c55e" : "#2a2535" }}>{postDone && "✓"}</div>
              <button type="button" style={S.pBtn} onClick={(e) => { e.stopPropagation(); sSP(!sP); }}>
                {sP ? "▾" : "▸"} 🧘 Postural ({wo.posture.length})
              </button>
            </div>
            {sP && wo.posture.map((p, i) => (
              <div key={i} style={S.blkI}>
                • {p}
              </div>
            ))}
          </div>
        )}

        {!ro && !focusMode && (
          <>
            <p style={S.doneHint}>
              A barra e “Encerrar” contam só <b>exercícios</b> (séries). Aquecimento, finalizador e postural são opcionais — os ✓ são só para te organizares.
            </p>
            <button style={{ ...S.bp, marginTop: 12, width: "100%", opacity: hasAny ? 1 : 0.4 }} onClick={() => hasAny && setShowFb(true)}>
              {hasAny ? "Encerrar treino" : "Marca séries ou ‘Não realizado’"}
            </button>
            {!hasAny && <p style={{ fontSize: 11, color: "var(--muted, #4a4260)", textAlign: "center", marginTop: 6 }}>Pelo menos uma série num exercício, ou todos como não realizado.</p>}
          </>
        )}
        {ro && !focusMode && <p style={{ fontSize: 12, color: "var(--muted, #4a4260)", textAlign: "center", marginTop: 22, fontStyle: "italic" }}>Somente visualização.</p>}
      </div>

      {modalInfo && modalEx && (
        <div style={S.mdOv} onClick={() => setExModal(null)} role="presentation">
          <div style={S.mdBox} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={S.mdX} onClick={() => setExModal(null)} aria-label="Fechar">
              ✕
            </button>
            <img src={modalInfo.img} alt="" style={S.mdImg} loading="lazy" />
            <h2 style={S.mdT}>{modalEx.name}</h2>
            <p style={S.mdSub}>Como executar</p>
            <ol style={S.mdOl}>
              {modalInfo.steps.map((st, si) => (
                <li key={si} style={S.mdLi}>
                  {st}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
