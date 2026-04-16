import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LifeAppStateV1, VisionBoardGradientId, VisionBoardItem } from "../../types";
import { todayISO } from "../../lib/dates";
import { resizeImageFileToDataUrl } from "../../lib/imageResize";
import { GRADIENT_CSS, GRADIENT_LABELS } from "../../lib/visionBoardGradients";

const CATEGORIES = ["Corpo", "Carreira", "Lifestyle", "Relacionamento", "Financeiro", "Viagem", "Casa", "Outro"];

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `vb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function VisionBoardScreen({
  life,
  setLife,
  onBack,
}: {
  life: LifeAppStateV1;
  setLife: (fn: (p: LifeAppStateV1) => LifeAppStateV1) => void;
  onBack: () => void;
}) {
  const today = todayISO();
  const vb = life.visionBoard;
  const [filter, setFilter] = useState<string>("Todos");
  const [fabOpen, setFabOpen] = useState(false);
  const [addKind, setAddKind] = useState<"photo" | "quote" | null>(null);
  const [editing, setEditing] = useState<VisionBoardItem | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [ritual, setRitual] = useState(false);
  const [ritualDone, setRitualDone] = useState(false);
  const [ritualIdx, setRitualIdx] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const sorted = useMemo(() => [...vb.items].sort((a, b) => a.order - b.order), [vb.items]);
  const filtered = useMemo(
    () => (filter === "Todos" ? sorted : sorted.filter((i) => i.category === filter)),
    [sorted, filter],
  );

  const [ritualSequence, setRitualSequence] = useState<VisionBoardItem[]>([]);

  useEffect(() => {
    if (!ritual || ritualDone || ritualSequence.length === 0) return;
    const ms = vb.settings.secondsPerCard * 1000;
    const id = setInterval(() => {
      setRitualIdx((prev) => {
        if (prev >= ritualSequence.length - 1) {
          setRitualDone(true);
          return prev;
        }
        return prev + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [ritual, ritualDone, ritualSequence.length, vb.settings.secondsPerCard]);

  function completeRitual() {
    setLife((p) => {
      const day = { ...(p.quickChecks[today] || {}), vision_board: true };
      return {
        ...p,
        quickChecks: { ...p.quickChecks, [today]: day },
        visionBoard: {
          ...p.visionBoard,
          viewLog: { ...p.visionBoard.viewLog, [today]: true },
        },
      };
    });
    setRitual(false);
    setRitualDone(false);
    setRitualIdx(0);
    setRitualSequence([]);
  }

  function deleteItem(id: string) {
    if (!confirm("Remover este item?")) return;
    setLife((p) => ({
      ...p,
      visionBoard: { ...p.visionBoard, items: p.visionBoard.items.filter((x) => x.id !== id) },
    }));
    setViewer(null);
    setMenuId(null);
  }

  function moveItem(id: string, dir: -1 | 1) {
    setLife((p) => {
      const items = [...p.visionBoard.items].sort((a, b) => a.order - b.order);
      const idx = items.findIndex((x) => x.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= items.length) return p;
      const a = items[idx].order;
      const b = items[j].order;
      return {
        ...p,
        visionBoard: {
          ...p.visionBoard,
          items: p.visionBoard.items.map((it) => {
            if (it.id === items[idx].id) return { ...it, order: b };
            if (it.id === items[j].id) return { ...it, order: a };
            return it;
          }),
        },
      };
    });
    setMenuId(null);
  }

  const startRitual = useCallback(() => {
    if (!sorted.length) {
      alert("Adicione fotos ou frases ao mural primeiro.");
      return;
    }
    let list = filter === "Todos" ? [...sorted] : sorted.filter((i) => i.category === filter);
    if (vb.settings.shuffle) {
      list = [...list].sort(() => Math.random() - 0.5);
    }
    setRitualSequence(list);
    setRitualIdx(0);
    setRitualDone(false);
    setRitual(true);
  }, [sorted, filter, vb.settings.shuffle]);

  if (ritual && ritualDone) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0c0a14] px-6 text-center">
        <p className="mb-4 text-2xl">✨</p>
        <h2 className="mb-2 text-xl font-black text-[#ede9f7]">Vision Board do dia: feito!</h2>
        <p className="mb-8 text-sm leading-relaxed text-[#b0a8c4]">
          &quot;Visualize quem você quer ser.
          <br />
          Depois vá ser.&quot;
        </p>
        <button
          type="button"
          onClick={completeRitual}
          className="min-h-[48px] rounded-2xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] px-8 font-bold text-[#0c0a14]"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (ritual && ritualSequence.length > 0) {
    const item = ritualSequence[ritualIdx];
    return (
      <RitualSlide
        item={item}
        settings={vb.settings}
        onClose={() => {
          setRitual(false);
          setRitualIdx(0);
          setRitualSequence([]);
        }}
        onPrev={() => setRitualIdx((i) => Math.max(0, i - 1))}
        onNext={() => setRitualIdx((i) => Math.min(ritualSequence.length - 1, i + 1))}
        onFinish={() => setRitualDone(true)}
        isLast={ritualIdx >= ritualSequence.length - 1}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c0a14] pb-32 pt-4 text-[#ede9f7]">
      <div className="sticky top-0 z-40 border-b border-[#1f1b2e] bg-[#0c0a14]/95 px-4 pb-3 backdrop-blur-md">
        <button type="button" onClick={onBack} className="mb-3 min-h-[44px] text-[#a78bfa]">
          ← Painel
        </button>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black">Vision Board 🌟</h1>
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="ml-auto rounded-xl border border-[#2a2535] px-3 py-1 text-xs font-bold"
          >
            ⚙️
          </button>
        </div>
        <button
          type="button"
          onClick={startRitual}
          className="mb-3 w-full rounded-2xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] py-3 text-sm font-black text-[#0c0a14]"
        >
          ▶ Ver Vision Board
        </button>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["Todos", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                filter === c ? "border-[#a78bfa] bg-[#a78bfa33]" : "border-[#2a2535] text-[#b0a8c4]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {settingsOpen && (
        <div className="mx-4 mb-4 rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4 text-sm">
          <p className="mb-2 font-bold">Configurações</p>
          <p className="mb-1 text-xs text-[#6b6280]">Tempo por card</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {([3, 5, 8, 10] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setLife((p) => ({
                    ...p,
                    visionBoard: { ...p.visionBoard, settings: { ...p.visionBoard.settings, secondsPerCard: s } },
                  }))
                }
                className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                  vb.settings.secondsPerCard === s ? "border-[#a78bfa] bg-[#a78bfa33]" : "border-[#2a2535]"
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
          <label className="mb-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={vb.settings.shuffle}
              onChange={(e) =>
                setLife((p) => ({
                  ...p,
                  visionBoard: { ...p.visionBoard, settings: { ...p.visionBoard.settings, shuffle: e.target.checked } },
                }))
              }
            />
            Ordem aleatória no ritual
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={vb.settings.showCategories}
              onChange={(e) =>
                setLife((p) => ({
                  ...p,
                  visionBoard: { ...p.visionBoard, settings: { ...p.visionBoard.settings, showCategories: e.target.checked } },
                }))
              }
            />
            Mostrar categorias no card
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 px-2">
        {filtered.map((it, idx) => (
          <div key={it.id} className="relative">
            <button
              type="button"
              onClick={() => {
                const i = sorted.findIndex((x) => x.id === it.id);
                setViewer(i >= 0 ? i : 0);
              }}
              className="w-full overflow-hidden rounded-2xl border border-[#1f1b2e] bg-[#13101e] text-left active:opacity-90"
            >
              {it.type === "photo" ? (
                <>
                  <div className="aspect-square w-full overflow-hidden bg-[#161321]">
                    {it.imageBase64 && <img src={it.imageBase64} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-2">
                    {it.caption && <p className="line-clamp-2 text-xs text-[#ede9f7]">{it.caption}</p>}
                    {vb.settings.showCategories && <p className="text-[10px] text-[#a78bfa]">#{it.category}</p>}
                    <p className="text-[10px] text-[#6b6280]">{it.tags.map((t) => `#${t}`).join(" ")}</p>
                  </div>
                </>
              ) : (
                <div
                  className="flex min-h-[180px] flex-col justify-center p-3 text-center"
                  style={{ background: GRADIENT_CSS[it.gradientId || "purple"] }}
                >
                  <p className="text-sm font-bold leading-snug text-white drop-shadow-md">&quot;{it.text}&quot;</p>
                  {it.author && <p className="mt-2 text-xs text-white/90">— {it.author}</p>}
                  {vb.settings.showCategories && <p className="mt-2 text-[10px] text-white/80">{it.category}</p>}
                </div>
              )}
            </button>
            <button
              type="button"
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-lg"
              onClick={(e) => {
                e.stopPropagation();
                setMenuId(menuId === it.id ? null : it.id);
              }}
            >
              ⋯
            </button>
            {menuId === it.id && (
              <div className="absolute right-0 top-10 z-50 min-w-[160px] rounded-xl border border-[#1f1b2e] bg-[#161321] py-1 text-xs shadow-xl">
                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#1f1b2e]" onClick={() => { setEditing(it); setMenuId(null); }}>
                  Editar
                </button>
                <button type="button" className="block w-full px-3 py-2 text-left text-[#f87171]" onClick={() => deleteItem(it.id)}>
                  Deletar
                </button>
                <button type="button" className="block w-full px-3 py-2 text-left" onClick={() => moveItem(it.id, -1)}>
                  Mover ↑
                </button>
                <button type="button" className="block w-full px-3 py-2 text-left" onClick={() => moveItem(it.id, 1)}>
                  Mover ↓
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="px-4 py-12 text-center text-sm text-[#4a4260]">Nenhum item neste filtro. Toque em + para criar.</p>
      )}

      <button
        type="button"
        onClick={() => {
          setFabOpen(true);
          setAddKind(null);
        }}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-3xl font-light text-[#0c0a14] shadow-lg"
        aria-label="Adicionar"
      >
        +
      </button>

      {fabOpen && !addKind && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
            <p className="mb-4 text-center font-bold">Que tipo?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="min-h-[56px] rounded-xl border border-[#a78bfa] bg-[#a78bfa22] font-bold"
                onClick={() => setAddKind("photo")}
              >
                📷 Foto
              </button>
              <button
                type="button"
                className="min-h-[56px] rounded-xl border border-[#a78bfa] bg-[#a78bfa22] font-bold"
                onClick={() => setAddKind("quote")}
              >
                ✍️ Frase
              </button>
            </div>
            <button type="button" className="mt-4 w-full py-2 text-sm text-[#6b6280]" onClick={() => setFabOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(addKind || editing) && (
        <AddEditModal
          kind={editing ? editing.type : addKind!}
          initial={editing}
          maxOrder={sorted.reduce((m, x) => Math.max(m, x.order), -1)}
          onClose={() => {
            setAddKind(null);
            setEditing(null);
            setFabOpen(false);
          }}
          onSave={(item) => {
            setLife((p) => {
              if (editing) {
                return {
                  ...p,
                  visionBoard: {
                    ...p.visionBoard,
                    items: p.visionBoard.items.map((x) => (x.id === item.id ? item : x)),
                  },
                };
              }
              return {
                ...p,
                visionBoard: {
                  ...p.visionBoard,
                  items: [...p.visionBoard.items, item],
                },
              };
            });
            setAddKind(null);
            setEditing(null);
            setFabOpen(false);
          }}
        />
      )}

      {viewer != null && sorted[viewer] && (
        <FullscreenViewer
          items={sorted}
          index={viewer}
          onClose={() => setViewer(null)}
          onEdit={(it) => {
            setEditing(it);
            setViewer(null);
          }}
          onDelete={deleteItem}
          onIndex={setViewer}
        />
      )}
    </div>
  );
}

function RitualSlide({
  item,
  settings,
  onClose,
  onPrev,
  onNext,
  onFinish,
  isLast,
}: {
  item: VisionBoardItem;
  settings: { secondsPerCard: number; shuffle: boolean; showCategories: boolean };
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  isLast: boolean;
}) {
  const touch = useRef<{ x: number } | null>(null);
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX };
      }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        if (dx > 50) onPrev();
        if (dx < -50) {
          if (isLast) onFinish();
          else onNext();
        }
        touch.current = null;
      }}
    >
      <div className="flex justify-between p-4">
        <button type="button" className="text-[#a78bfa]" onClick={onClose}>
          ✕ Fechar
        </button>
        <button type="button" className="text-white/80" onClick={isLast ? onFinish : onNext}>
          {isLast ? "Concluir →" : "Próximo →"}
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {item.type === "photo" ? (
          <>
            {item.imageBase64 && (
              <img src={item.imageBase64} alt="" className="max-h-[70vh] max-w-full rounded-lg object-contain" />
            )}
            {item.caption && <p className="mt-4 text-center text-sm text-white/90">{item.caption}</p>}
            {settings.showCategories && <p className="mt-2 text-xs text-[#a78bfa]">{item.category}</p>}
          </>
        ) : (
          <div
            className="flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center rounded-2xl p-6 text-center"
            style={{ background: GRADIENT_CSS[item.gradientId || "purple"] }}
          >
            <p className="text-2xl font-black leading-snug text-white drop-shadow-lg">&quot;{item.text}&quot;</p>
            {item.author && <p className="mt-6 text-lg text-white/95">— {item.author}</p>}
          </div>
        )}
      </div>
      <button type="button" className="p-6 text-center text-sm text-white/60" onClick={isLast ? onFinish : onNext}>
        Toque nos lados ou use o botão
      </button>
    </div>
  );
}

function FullscreenViewer({
  items,
  index,
  onClose,
  onEdit,
  onDelete,
  onIndex,
}: {
  items: VisionBoardItem[];
  index: number;
  onClose: () => void;
  onEdit: (it: VisionBoardItem) => void;
  onDelete: (id: string) => void;
  onIndex: (i: number) => void;
}) {
  const item = items[index];
  const touch = useRef<{ x: number } | null>(null);
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-black"
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX };
      }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        if (dx > 60) onIndex(Math.max(0, index - 1));
        if (dx < -60) onIndex(Math.min(items.length - 1, index + 1));
        touch.current = null;
      }}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <button type="button" onClick={onClose}>
          ←
        </button>
        <span className="text-xs opacity-60">
          {index + 1}/{items.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center overflow-auto px-4">
        {item.type === "photo" ? (
          <>
            {item.imageBase64 && <img src={item.imageBase64} alt="" className="max-h-[75vh] max-w-full object-contain" />}
            {item.caption && <p className="mt-4 text-center text-sm">{item.caption}</p>}
          </>
        ) : (
          <div
            className="flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center rounded-2xl p-8"
            style={{ background: GRADIENT_CSS[item.gradientId || "purple"] }}
          >
            <p className="text-center text-2xl font-bold leading-snug text-white">&quot;{item.text}&quot;</p>
            {item.author && <p className="mt-6 text-white/90">— {item.author}</p>}
          </div>
        )}
      </div>
      <div className="flex gap-2 p-4">
        <button type="button" className="flex-1 rounded-xl border border-white/30 py-3 text-sm" onClick={() => onEdit(item)}>
          Editar
        </button>
        <button type="button" className="flex-1 rounded-xl border border-red-500/50 py-3 text-sm text-red-300" onClick={() => onDelete(item.id)}>
          Deletar
        </button>
      </div>
    </div>
  );
}

function AddEditModal({
  kind,
  initial,
  maxOrder,
  onClose,
  onSave,
}: {
  kind: "photo" | "quote";
  initial: VisionBoardItem | null;
  maxOrder: number;
  onClose: () => void;
  onSave: (item: VisionBoardItem) => void;
}) {
  const [caption, setCaption] = useState(initial?.caption || "");
  const [tags, setTags] = useState(initial?.tags.join(", ") || "");
  const [category, setCategory] = useState(initial?.category || "Lifestyle");
  const [text, setText] = useState(initial?.text || "");
  const [author, setAuthor] = useState(initial?.author || "");
  const [gradientId, setGradientId] = useState<VisionBoardGradientId>(initial?.gradientId || "purple");
  const [img, setImg] = useState(initial?.imageBase64 || "");
  const [busy, setBusy] = useState(false);

  async function onFile(f: File | null) {
    if (!f) return;
    setBusy(true);
    try {
      const data = await resizeImageFileToDataUrl(f, 800);
      setImg(data);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const tagList = tags
      .split(/[#,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const base: VisionBoardItem = {
      id: initial?.id || newId(),
      type: kind,
      category,
      tags: tagList,
      order: initial?.order ?? maxOrder + 1,
      createdAt: initial?.createdAt || new Date().toISOString(),
    };
    if (kind === "photo") {
      if (!img) {
        alert("Escolha uma imagem.");
        return;
      }
      onSave({ ...base, type: "photo", imageBase64: img, caption: caption.trim() || undefined });
    } else {
      if (!text.trim()) {
        alert("Escreva a frase.");
        return;
      }
      onSave({ ...base, type: "quote", text: text.trim(), author: author.trim() || undefined, gradientId });
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#1f1b2e] bg-[#13101e] p-4">
        <p className="mb-3 font-bold">{initial ? "Editar" : kind === "photo" ? "Nova foto" : "Nova frase"}</p>
        {kind === "photo" && (
          <>
            <input type="file" accept="image/*" className="mb-3 w-full text-sm" onChange={(e) => onFile(e.target.files?.[0] || null)} />
            {busy && <p className="text-xs text-[#a78bfa]">A processar…</p>}
            {img && <img src={img} alt="" className="mb-3 max-h-48 w-full rounded-lg object-cover" />}
            <label className="mb-1 block text-xs text-[#6b6280]">Legenda</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm" />
          </>
        )}
        {kind === "quote" && (
          <>
            <label className="mb-1 block text-xs text-[#6b6280]">Frase</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="mb-3 min-h-[100px] w-full rounded-xl border border-[#1f1b2e] bg-[#161321] p-3 text-sm" />
            <label className="mb-1 block text-xs text-[#6b6280]">Autor (opcional)</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm" />
            <p className="mb-2 text-xs text-[#6b6280]">Gradiente</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {GRADIENT_LABELS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGradientId(g.id)}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                    gradientId === g.id ? "border-[#a78bfa]" : "border-[#2a2535]"
                  }`}
                  style={{ background: GRADIENT_CSS[g.id] }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </>
        )}
        <label className="mb-1 block text-xs text-[#6b6280]">Tags (separadas por vírgula ou #)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className="mb-3 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm" placeholder="#corpo #meta" />
        <label className="mb-1 block text-xs text-[#6b6280]">Categoria</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mb-4 w-full rounded-xl border border-[#1f1b2e] bg-[#161321] px-3 py-2 text-sm">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="button" className="flex-1 rounded-xl border border-[#2a2535] py-3" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="flex-1 rounded-xl bg-[#a78bfa] py-3 font-bold text-[#0c0a14]" onClick={save}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
