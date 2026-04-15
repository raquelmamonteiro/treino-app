import { useState, useCallback, useEffect, type CSSProperties } from "react";
import type { BodyWeeklyEntry } from "../lib/treinoSync";
import {
  bodyFatPercentJacksonPollockFemale3,
  bodyFatPercentNavyFemale,
  fatMassKg,
  leanMassKg,
} from "../lib/bodyComposition";

const TZ_BR = "America/Sao_Paulo";

function tdBr(): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_BR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = p.find((x) => x.type === "year")?.value;
  const m = p.find((x) => x.type === "month")?.value;
  const d = p.find((x) => x.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function shortDate(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: TZ_BR,
    });
  } catch {
    return iso;
  }
}

function parseNum(s: string): number | null {
  const x = parseFloat(String(s || "").replace(",", "."));
  return isFinite(x) && x >= 0 ? x : null;
}

export function compressImageFile(file: File, maxW = 1000, quality = 0.82): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(u);
      let w = img.naturalWidth,
        h = img.naturalHeight;
      if (w > maxW) {
        h = (h * maxW) / w;
        w = maxW;
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(c.toDataURL("image/jpeg", quality));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(u);
      resolve(null);
    };
    img.src = u;
  });
}

/** Estilos locais espelhando o app (evita import circular de S). */
const B: Record<string, CSSProperties> = {
  pd: { padding: "16px 20px" },
  hint: { fontSize: 12, color: "#4a4260", marginBottom: 12, lineHeight: 1.5 },
  lbl: { display: "block", fontSize: 10, fontWeight: 700, color: "#5c5475", textTransform: "uppercase", letterSpacing: 1, margin: "12px 0 6px" },
  inp: {
    background: "#16132188",
    border: "1px solid #1f1b2e",
    borderRadius: 12,
    padding: "10px 14px",
    color: "#ede9f7",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  blk: { background: "#161321", borderRadius: 16, padding: 14, marginBottom: 12, border: "1px solid #1a1528" },
  bp: {
    background: "linear-gradient(135deg,#a78bfa,#7c3aed)",
    color: "#fff",
    border: "none",
    padding: "14px 22px",
    borderRadius: 16,
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
    marginTop: 16,
  },
  tableWrap: { overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: 8, borderRadius: 12, border: "1px solid #1f1b2e" },
  th: { fontSize: 10, fontWeight: 800, color: "#a78bfa", padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #2a2535", minWidth: 56 },
  td: { fontSize: 11, color: "#b0a8c4", padding: "6px", textAlign: "center", borderBottom: "1px solid #1a1528" },
  tdL: { fontSize: 10, fontWeight: 700, color: "#6b6280", padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #1a1528", whiteSpace: "nowrap" },
  bar: { display: "flex", alignItems: "center", gap: 12, padding: "24px 20px 12px", borderBottom: "1px solid #161321" },
  bk: {
    background: "#13101e",
    border: "1px solid #1a1528",
    color: "#a78bfa",
    fontSize: 18,
    width: 40,
    height: 40,
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 800,
  },
  photoThumb: { width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "1px solid #2a2535" },
};

export function BodyCompositionView({
  profile,
  onSaveProfile,
  entries,
  onSaveEntry,
  onDeleteEntry,
  onBack,
}: {
  profile: { age: number; heightCm: number };
  onSaveProfile: (p: { age: number; heightCm: number }) => void;
  entries: BodyWeeklyEntry[];
  onSaveEntry: (e: BodyWeeklyEntry) => void;
  onDeleteEntry: (date: string) => void;
  onBack: () => void;
}) {
  const [ageStr, setAgeStr] = useState(String(profile.age));
  const [hStr, setHStr] = useState(String(profile.heightCm));
  const [date, setDate] = useState(tdBr());
  const [peso, setPeso] = useState("");
  const [tri, setTri] = useState("");
  const [sup, setSup] = useState("");
  const [coxaD, setCoxaD] = useState("");
  const [cint, setCint] = useState("");
  const [quad, setQuad] = useState("");
  const [braco, setBraco] = useState("");
  const [coxaF, setCoxaF] = useState("");
  const [pesc, setPesc] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    setAgeStr(String(profile.age));
    setHStr(String(profile.heightCm));
  }, [profile.age, profile.heightCm]);

  const applyProfile = useCallback(() => {
    const age = Math.round(parseNum(ageStr) ?? profile.age);
    const h = Math.round(parseNum(hStr) ?? profile.heightCm);
    if (age >= 18 && age <= 90 && h >= 120 && h <= 220) onSaveProfile({ age, heightCm: h });
  }, [ageStr, hStr, profile, onSaveProfile]);

  const saveWeek = useCallback(async () => {
    applyProfile();
    const age = Math.round(parseNum(ageStr) ?? profile.age);
    const pKg = parseNum(peso);
    const t = parseNum(tri);
    const s = parseNum(sup);
    const cx = parseNum(coxaD);
    const sum = t !== null && s !== null && cx !== null ? t + s + cx : null;
    const jp = sum !== null ? bodyFatPercentJacksonPollockFemale3(sum, age) : null;
    const neck = parseNum(pesc);
    const w = parseNum(cint);
    const hp = parseNum(quad);
    const heightCm = Math.round(parseNum(hStr) ?? profile.heightCm);
    const navy =
      neck && w && hp && heightCm
        ? bodyFatPercentNavyFemale(heightCm, neck, w, hp)
        : null;
    const bfUse = jp ?? navy;
    const gord = pKg !== null && bfUse !== null ? fatMassKg(pKg, bfUse) : null;
    const mag = pKg !== null && bfUse !== null ? leanMassKg(pKg, bfUse) : null;

    const entry: BodyWeeklyEntry = {
      date: date.slice(0, 10),
      photoDataUrl: photo || undefined,
      pesoKg: pKg,
      dobraTricepsMm: t,
      dobraSuprailiacaMm: s,
      dobraCoxaMm: cx,
      cinturaCm: parseNum(cint),
      quadrilCm: parseNum(quad),
      bracoCm: parseNum(braco),
      coxaCm: parseNum(coxaF),
      pescocoCm: neck,
      bfJacksonPct: jp,
      bfNavyPct: navy,
      gorduraKg: gord,
      magroKg: mag,
    };
    onSaveEntry(entry);
    setPeso("");
    setTri("");
    setSup("");
    setCoxaD("");
    setCint("");
    setQuad("");
    setBraco("");
    setCoxaF("");
    setPesc("");
    setPhoto(null);
    setDate(tdBr());
  }, [
    applyProfile,
    ageStr,
    peso,
    tri,
    sup,
    coxaD,
    cint,
    quad,
    braco,
    coxaF,
    pesc,
    hStr,
    profile,
    photo,
    date,
    onSaveEntry,
  ]);

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const cols = sorted;

  const rows: { label: string; get: (e: BodyWeeklyEntry) => string }[] = [
    { label: "Peso (kg)", get: (e) => (e.pesoKg != null ? String(e.pesoKg) : "—") },
    { label: "% gord. (JP 3 dobras)", get: (e) => (e.bfJacksonPct != null ? `${e.bfJacksonPct}%` : "—") },
    { label: "% gord. (Navy)", get: (e) => (e.bfNavyPct != null ? `${e.bfNavyPct}%` : "—") },
    { label: "Gordura (kg)", get: (e) => (e.gorduraKg != null ? String(e.gorduraKg) : "—") },
    { label: "Massa magra (kg)", get: (e) => (e.magroKg != null ? String(e.magroKg) : "—") },
    { label: "Cintura (cm)", get: (e) => (e.cinturaCm != null ? String(e.cinturaCm) : "—") },
    { label: "Quadril (cm)", get: (e) => (e.quadrilCm != null ? String(e.quadrilCm) : "—") },
    {
      label: "RCQ (cint./quadril)",
      get: (e) =>
        e.cinturaCm && e.quadrilCm && e.quadrilCm > 0
          ? (e.cinturaCm / e.quadrilCm).toFixed(2)
          : "—",
    },
    { label: "Braço (cm)", get: (e) => (e.bracoCm != null ? String(e.bracoCm) : "—") },
    { label: "Coxa fita (cm)", get: (e) => (e.coxaCm != null ? String(e.coxaCm) : "—") },
    {
      label: "Dobras Σ (mm)",
      get: (e) => {
        const tr = e.dobraTricepsMm,
          su = e.dobraSuprailiacaMm,
          cx = e.dobraCoxaMm;
        if (tr != null && su != null && cx != null) return String(Math.round((tr + su + cx) * 10) / 10);
        return "—";
      },
    },
  ];

  return (
    <div style={{ fontFamily: "inherit", background: "#0c0a14", color: "#ede9f7", minHeight: "100vh", maxWidth: 500, margin: "0 auto", paddingBottom: 48 }}>
      <div style={B.bar}>
        <button type="button" style={B.bk} onClick={onBack}>
          ←
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Corpo & composição</div>
          <div style={{ fontSize: 11, color: "#6b6280" }}>Foto semanal, peso, dobras e fita</div>
        </div>
      </div>
      <div style={B.pd}>
        <p style={B.hint}>
          <b>Jackson & Pollock (3 dobras)</b>: tríceps + supra-ilíaca + coxa (mm) + idade. <b>Navy</b>:
          alternativa por cintura, quadril, pescoço e altura (cm). Os valores são estimativas; use sempre a
          mesma postura e horário.
        </p>

        <div style={B.blk}>
          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 10, color: "#c4b5fd" }}>Perfil (fórmulas)</div>
          <div style={B.row2}>
            <div>
              <label style={B.lbl}>Idade</label>
              <input style={B.inp} inputMode="numeric" value={ageStr} onChange={(e) => setAgeStr(e.target.value)} />
            </div>
            <div>
              <label style={B.lbl}>Altura (cm)</label>
              <input style={B.inp} inputMode="decimal" value={hStr} onChange={(e) => setHStr(e.target.value)} />
            </div>
          </div>
          <button type="button" style={{ ...B.bp, marginTop: 10, padding: "10px", fontSize: 13 }} onClick={applyProfile}>
            Guardar perfil
          </button>
        </div>

        <div style={B.blk}>
          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 10, color: "#c4b5fd" }}>Novo registo</div>
          <label style={B.lbl}>Data</label>
          <input style={B.inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <label style={B.lbl}>Foto (opcional)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ fontSize: 12, color: "#b0a8c4" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const url = await compressImageFile(f);
              setPhoto(url);
              e.target.value = "";
            }}
          />
          {photo && (
            <img src={photo} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12, marginTop: 8 }} />
          )}
          <label style={B.lbl}>Peso (kg)</label>
          <input style={B.inp} inputMode="decimal" placeholder="ex: 62,5" value={peso} onChange={(e) => setPeso(e.target.value)} />
          <div style={{ fontWeight: 800, fontSize: 11, marginTop: 14, color: "#f59e0b" }}>Dobras cutâneas (mm)</div>
          <div style={B.row2}>
            <div>
              <label style={B.lbl}>Tríceps</label>
              <input style={B.inp} inputMode="decimal" value={tri} onChange={(e) => setTri(e.target.value)} />
            </div>
            <div>
              <label style={B.lbl}>Supra-ilíaca</label>
              <input style={B.inp} inputMode="decimal" value={sup} onChange={(e) => setSup(e.target.value)} />
            </div>
          </div>
          <label style={B.lbl}>Coxa (dobra)</label>
          <input style={B.inp} inputMode="decimal" value={coxaD} onChange={(e) => setCoxaD(e.target.value)} />
          <div style={{ fontWeight: 800, fontSize: 11, marginTop: 14, color: "#06b6d4" }}>Fita métrica (cm)</div>
          <div style={B.row2}>
            <div>
              <label style={B.lbl}>Cintura</label>
              <input style={B.inp} inputMode="decimal" value={cint} onChange={(e) => setCint(e.target.value)} />
            </div>
            <div>
              <label style={B.lbl}>Quadril</label>
              <input style={B.inp} inputMode="decimal" value={quad} onChange={(e) => setQuad(e.target.value)} />
            </div>
          </div>
          <div style={B.row2}>
            <div>
              <label style={B.lbl}>Braço</label>
              <input style={B.inp} inputMode="decimal" value={braco} onChange={(e) => setBraco(e.target.value)} />
            </div>
            <div>
              <label style={B.lbl}>Coxa</label>
              <input style={B.inp} inputMode="decimal" value={coxaF} onChange={(e) => setCoxaF(e.target.value)} />
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 11, marginTop: 12, color: "#a78bfa" }}>Para Navy (opcional)</div>
          <div style={B.row2}>
            <div>
              <label style={B.lbl}>Pescoço</label>
              <input style={B.inp} inputMode="decimal" value={pesc} onChange={(e) => setPesc(e.target.value)} />
            </div>
            <div />
          </div>
          <button type="button" style={B.bp} onClick={() => void saveWeek()}>
            Guardar registo semanal
          </button>
        </div>

        {cols.length > 0 && (
          <>
            <h3 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#4a4260", marginTop: 8, fontWeight: 800 }}>
              Evolução (colunas por data)
            </h3>
            <div style={B.tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: cols.length * 72 + 120 }}>
                <thead>
                  <tr>
                    <th style={{ ...B.th, textAlign: "left", position: "sticky", left: 0, background: "#13101e", zIndex: 1 }}>Métrica</th>
                    {cols.map((c) => (
                      <th key={c.date} style={B.th}>
                        <div>{shortDate(c.date)}</div>
                        {c.photoDataUrl ? <img src={c.photoDataUrl} alt="" style={B.photoThumb} /> : <span style={{ fontSize: 9, color: "#4a4260" }}>—</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td style={{ ...B.tdL, position: "sticky", left: 0, background: "#13101e", zIndex: 1 }}>{row.label}</td>
                      {cols.map((c) => (
                        <td key={c.date + row.label} style={B.td}>
                          {row.get(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ ...B.hint, marginTop: 10 }}>Para apagar um dia, use a lista abaixo.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...entries]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((c) => (
                  <div
                    key={c.date}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#13101e",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #1a1528",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{shortDate(c.date)}</span>
                    <button
                      type="button"
                      style={{ background: "transparent", border: "none", color: "#ef444488", fontSize: 12, cursor: "pointer" }}
                      onClick={() => {
                        if (confirm("Apagar este registo de corpo?")) onDeleteEntry(c.date);
                      }}
                    >
                      Apagar
                    </button>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
