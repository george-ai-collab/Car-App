import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, Film, Image as ImageIcon, Plus, X, ChevronLeft, Crop, Sparkles, SlidersHorizontal, Type, Square, RotateCw, Trash2, Loader2, MapPin, AtSign, Users, Car, Search } from "lucide-react";
import { T } from "../../theme";
import { uid } from "../../lib/utils";
import { readPhoto } from "./CameraCapture";
import { canPickNatively, pickFromGallery, takePhoto } from "../../lib/media";
import { SHAPES, FILTERS, TEXT_COLORS, blankEdit, shapeRatio, angleOf, coverScale, clampPan, dragToPan, cssFilter, warmthLayer, bakeEdit } from "./edit";
import { Avatar, BottomSheet, ChipPicker, Section, TextArea, TextInput } from "../ui";
import { labelFor, placeArea } from "../LocationPicker";
import { MAX_LINES } from "../../lib/text";
import { VideoTrim } from "./VideoTrim";
import { readVideo, processVideo, MAX_SECONDS, fmtSecs } from "../../lib/video";
import { REMOTE } from "../../backend/config";

const MAX_PHOTOS = 10;
const blobToDataUrl = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const alertVideo = () => window.dispatchEvent(new CustomEvent("carfooly-flash", { detail: "Couldn't open that video." }));

// Posting, in three steps like the big apps:
//   1. pick photos (camera or gallery, up to 10)  2. edit them  3. details, then Share.
export function ComposerFlow({ me, cars, communities, users, initialCommunityId, onSubmit, onCancel }) {
  const [step, setStep] = useState("pick");
  const [edits, setEdits] = useState([]);
  const [shape, setShape] = useState("original");
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState(null); // { url, duration, w, h, start, end, muted }
  const [preparing, setPreparing] = useState(null); // 0..1 while the video is being prepared

  const addVideo = async (file) => {
    if (!file) return;
    try {
      const v = await readVideo(file);
      if (!(v.duration > 0.5)) throw new Error("too short");
      setVideo({ ...v, start: 0, end: Math.min(v.duration, MAX_SECONDS), muted: false });
      setStep("video");
    } catch { alertVideo(); }
  };

  const addFiles = async (files) => {
    const list = [...files].slice(0, MAX_PHOTOS - edits.length);
    const loaded = [];
    for (const f of list) { try { const p = await readPhoto(f, 1600, 0.85); loaded.push(blankEdit(p.src, p.w, p.h)); } catch { /* skip bad file */ } }
    if (!loaded.length) return;
    setEdits((prev) => [...prev, ...loaded].slice(0, MAX_PHOTOS));
    setStep("edit");
  };

  const share = async (details) => {
    setBusy(true);
    if (video) {
      try {
        setPreparing(0);
        const out = await processVideo(video.url, video.start, video.end, { muted: video.muted, onProgress: setPreparing });
        setPreparing(null);
        // Online: the file is uploaded when the post is saved. Phone-only test mode keeps it as text.
        const url = REMOTE ? URL.createObjectURL(out.blob) : await blobToDataUrl(out.blob);
        await onSubmit({ ...details, photos: [{ type: "video", url, poster: out.poster, aspect: out.aspect, duration: out.duration, mime: out.type }] });
      } catch (e) {
        setPreparing(null);
        if (e?.message !== "cancelled") window.dispatchEvent(new CustomEvent("carfooly-flash", { detail: "Couldn't prepare that video. Try a shorter part." }));
      }
      setBusy(false);
      return;
    }
    const ratio = shapeRatio(shape, edits[0]);
    const photos = [];
    for (const e of edits) photos.push(await bakeEdit(e, ratio));
    await onSubmit({ ...details, photos });
    setBusy(false);
  };

  return (
    <div data-testid={`compose-${step}`} style={{ paddingBottom: 10 }}>
      {step === "pick" && <PickStep onFiles={addFiles} onVideo={addVideo} onCancel={onCancel} />}
      {step === "video" && video && (
        <VideoTrim video={video} setVideo={setVideo} onBack={() => { setVideo(null); setStep("pick"); }} onNext={() => setStep("details")} />
      )}
      {preparing !== null && (
        <div data-testid="video-preparing" style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(6,6,7,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 30 }}>
          <Loader2 size={30} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
          <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>Preparing your video… {Math.round(preparing * 100)}%</div>
          <div style={{ width: 220, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <div style={{ width: `${Math.round(preparing * 100)}%`, height: "100%", background: T.accent, transition: "width 0.3s" }} />
          </div>
          <div style={{ color: T.textDim, fontSize: 12.5, textAlign: "center" }}>Making it smaller so it uploads fast. This takes about as long as the clip.</div>
        </div>
      )}
      {step === "edit" && (
        <EditStep edits={edits} setEdits={setEdits} shape={shape} setShape={setShape} onFiles={addFiles}
          onBack={() => { setEdits([]); setStep("pick"); }} onNext={() => setStep("details")} />
      )}
      {step === "details" && (
        <DetailsStep me={me} cars={cars} communities={communities} users={users} initialCommunityId={initialCommunityId}
          edits={edits} shape={shape} busy={busy} video={video} onBack={() => setStep(video ? "video" : "edit")} onShare={share} />
      )}
    </div>
  );
}

// ---------- 1. pick: gallery first (recent photos + albums), camera as the other option ----------
function PickStep({ onFiles, onVideo, onCancel }) {
  const cam = useRef(null), lib = useRef(null), vid = useRef(null);
  const [opening, setOpening] = useState(false);
  const openGallery = async () => {
    if (canPickNatively()) {
      setOpening(true);
      const blobs = await pickFromGallery(MAX_PHOTOS);
      setOpening(false);
      if (blobs.length) onFiles(blobs);
    } else lib.current.click();
  };
  return (
    <div>
      <TopRow title="New post" left={<IconBtn label="Close" onClick={onCancel}><X size={20} /></IconBtn>} />
      <input ref={cam} type="file" accept="image/*" capture="environment" style={{ display: "none" }} data-testid="pick-camera" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <input ref={lib} type="file" accept="image/*" multiple style={{ display: "none" }} data-testid="pick-gallery" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <button data-testid="open-gallery" onClick={openGallery} className="press" style={{
        width: "100%", aspectRatio: "4 / 3", borderRadius: 26, border: "none", padding: 20, marginBottom: 12,
        background: `linear-gradient(160deg, ${T.accent}, ${T.accentDeep})`, boxShadow: T.shadowAccent,
        display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start", textAlign: "left",
      }}>
        {opening ? <Loader2 size={32} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> : <ImageIcon size={34} color="#fff" />}
        <div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>Choose from gallery</div>
          <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, marginTop: 3 }}>Recent photos and albums · up to {MAX_PHOTOS}</div>
        </div>
      </button>
      <button data-testid="open-camera" onClick={async () => { if (canPickNatively()) { const b = await takePhoto(); if (b) onFiles([b]); } else cam.current.click(); }} className="press" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 20, border: `1px solid ${T.lineDark}`, background: T.surface, textAlign: "left" }}>
        <Camera size={22} color={T.text} />
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>Take a photo</div>
          <div style={{ color: T.textDim, fontSize: 12.5 }}>Use the camera instead</div>
        </div>
      </button>
      <input ref={vid} type="file" accept="video/*" style={{ display: "none" }} data-testid="pick-video" onChange={(e) => { onVideo(e.target.files?.[0]); e.target.value = ""; }} />
      <button data-testid="open-video" onClick={() => vid.current.click()} className="press" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 16, marginTop: 10, borderRadius: 20, border: `1px solid ${T.lineDark}`, background: T.surface, textAlign: "left" }}>
        <Film size={22} color={T.text} />
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>Post a video</div>
          <div style={{ color: T.textDim, fontSize: 12.5 }}>Up to 1 minute · you can trim longer clips</div>
        </div>
      </button>
    </div>
  );
}

// ---------- 2. edit ----------
const TOOLS = [
  { id: "crop", label: "Crop", icon: Crop },
  { id: "filter", label: "Filters", icon: Sparkles },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
  { id: "text", label: "Text", icon: Type },
  { id: "plate", label: "Plates", icon: Square },
];

function EditStep({ edits, setEdits, shape, setShape, onFiles, onBack, onNext }) {
  const [i, setI] = useState(0);
  const [tool, setTool] = useState("crop");
  const [selText, setSelText] = useState(null);
  const [textSheet, setTextSheet] = useState(false);
  const more = useRef(null);
  const e = edits[Math.min(i, edits.length - 1)];
  const ratio = shapeRatio(shape, edits[0]);
  const update = (patch) => setEdits((all) => all.map((x, k) => (k === i ? { ...x, ...(typeof patch === "function" ? patch(x) : patch) } : x)));
  const remove = (k) => {
    const next = edits.filter((_, n) => n !== k);
    if (!next.length) { onBack(); return; }
    setEdits(next); setI(Math.max(0, Math.min(i, next.length - 1)));
  };
  if (!e) return null;
  const selected = e.texts.find((t) => t.id === selText);

  return (
    <div>
      <TopRow title="Edit" left={<IconBtn label="Back" onClick={onBack}><ChevronLeft size={22} /></IconBtn>}
        right={<button onClick={onNext} className="press" style={nextBtn}>Next</button>} />

      <Frame e={e} ratio={ratio} update={update} tool={tool} selText={selText} setSelText={setSelText} />

      {/* photos in this post */}
      <div data-noswipe style={{ display: "flex", gap: 8, overflowX: "auto", margin: "12px 0", paddingBottom: 2 }}>
        {edits.map((x, k) => (
          <div key={k} style={{ position: "relative", flexShrink: 0 }}>
            <button data-testid="thumb" onClick={() => { setI(k); setSelText(null); }} style={{
              width: 56, height: 56, borderRadius: 12, padding: 0, overflow: "hidden", border: `2px solid ${k === i ? T.accent : "transparent"}`,
              background: `url(${x.src}) center/cover`, filter: cssFilter(x),
            }} />
            {edits.length > 0 && (
              <button aria-label={`Remove photo ${k + 1}`} onClick={() => remove(k)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 999, border: "none", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <X size={12} color={T.text} />
              </button>
            )}
          </div>
        ))}
        {edits.length < MAX_PHOTOS && (
          <button aria-label="Add more photos" onClick={async () => { if (canPickNatively()) { const b = await pickFromGallery(MAX_PHOTOS - edits.length); if (b.length) onFiles(b); } else more.current.click(); }} style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 12, border: `1.5px dashed ${T.lineDark}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={20} color={T.textDim} />
          </button>
        )}
        <input ref={more} type="file" accept="image/*" multiple style={{ display: "none" }} data-testid="pick-more" onChange={(ev) => { onFiles(ev.target.files); ev.target.value = ""; }} />
      </div>

      {/* tool panel */}
      <div style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, padding: 14, minHeight: 112 }}>
        {tool === "crop" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {SHAPES.map((sh) => (
                <button key={sh.id} onClick={() => setShape(sh.id)} className="press" style={chip(shape === sh.id)}>{sh.label}</button>
              ))}
            </div>
            <Slider label="Zoom" min={1} max={4} step={0.01} value={e.zoom} onChange={(v) => update((x) => ({ zoom: v, ...clampPan({ ...x, zoom: v }, 1, 1 / ratio, x.panX, x.panY) }))} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Slider label="Straighten" min={-15} max={15} step={0.5} value={e.straighten} onChange={(v) => update((x) => ({ straighten: v, ...clampPan({ ...x, straighten: v }, 1, 1 / ratio, x.panX, x.panY) }))} />
              </div>
              <button aria-label="Rotate" onClick={() => update((x) => ({ rot: (x.rot + 1) % 4, panX: 0, panY: 0 }))} className="press" style={{ ...chip(false), display: "flex", alignItems: "center", gap: 5 }}>
                <RotateCw size={14} /> Rotate
              </button>
            </div>
            <div style={{ color: T.textDim, fontSize: 11, marginTop: 4 }}>Drag the photo to move it. Pinch or use Zoom to get closer.</div>
          </>
        )}
        {tool === "filter" && (
          <div data-noswipe style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
            {FILTERS.map((f) => (
              <button key={f.id} data-testid={`filter-${f.id}`} onClick={() => update({ filter: f.id })} style={{ flexShrink: 0, background: "none", border: "none", padding: 0, textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 14, background: `url(${e.src}) center/cover`, filter: f.css || "none", border: `2px solid ${e.filter === f.id ? T.accent : "transparent"}` }} />
                <div style={{ color: e.filter === f.id ? T.text : T.textDim, fontSize: 11.5, fontWeight: 600, marginTop: 5 }}>{f.label}</div>
              </button>
            ))}
          </div>
        )}
        {tool === "adjust" && (
          <>
            {[["brightness", "Brightness"], ["contrast", "Contrast"], ["saturation", "Saturation"], ["warmth", "Warmth"]].map(([k, label]) => (
              <Slider key={k} label={label} min={-100} max={100} step={1} value={e.adjust[k]} center testid={`adjust-${k}`}
                onChange={(v) => update((x) => ({ adjust: { ...x.adjust, [k]: v } }))} />
            ))}
          </>
        )}
        {tool === "text" && (
          <>
            <button onClick={() => setTextSheet(true)} className="press" style={{ ...chip(false), display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}><Plus size={14} /> Add text</button>
            {selected ? (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {TEXT_COLORS.map((c) => (
                    <button key={c} aria-label={`Colour ${c}`} onClick={() => update((x) => ({ texts: x.texts.map((t) => (t.id === selText ? { ...t, color: c } : t)) }))} style={{ width: 28, height: 28, borderRadius: 999, background: c, border: `2px solid ${selected.color === c ? T.accent : "rgba(255,255,255,0.3)"}` }} />
                  ))}
                  <span style={{ flex: 1 }} />
                  <button aria-label="Delete text" onClick={() => { update((x) => ({ texts: x.texts.filter((t) => t.id !== selText) })); setSelText(null); }} style={{ background: "none", border: "none" }}><Trash2 size={18} color={T.accent} /></button>
                </div>
                <Slider label="Size" min={0.04} max={0.16} step={0.005} value={selected.size} onChange={(v) => update((x) => ({ texts: x.texts.map((t) => (t.id === selText ? { ...t, size: v } : t)) }))} />
              </>
            ) : <div style={{ color: T.textDim, fontSize: 12 }}>Tap text on the photo to change its colour or size. Drag to move it.</div>}
          </>
        )}
        {tool === "plate" && (
          <>
            <button onClick={() => update((x) => ({ stickers: [...x.stickers, { id: uid("st"), x: 34, y: 60, w: 30, h: 10 }] }))} className="press" style={{ ...chip(false), display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> Cover a plate
            </button>
            <div style={{ color: T.textDim, fontSize: 11.5, marginTop: 8, lineHeight: 1.4 }}>Drag a cover onto the plate. Use the corner to resize, the × to remove. Keeps your car (and you) private.</div>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", marginTop: 10 }}>
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button key={id} data-testid={`tool-${id}`} onClick={() => { setTool(id); if (id !== "text") setSelText(null); }} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tool === id ? T.accent : T.textDim, fontSize: 11, fontWeight: 700, padding: "6px 4px" }}>
            <Icon size={20} /> {label}
          </button>
        ))}
      </div>

      <TextSheet open={textSheet} onClose={() => setTextSheet(false)} onAdd={(text) => {
        const id = uid("tx");
        update((x) => ({ texts: [...x.texts, { id, text, x: 0.5, y: 0.5, size: 0.08, color: "#FFFFFF" }] }));
        setSelText(id); setTool("text");
      }} />
    </div>
  );
}

// The live photo: drag to pan, pinch to zoom, drag texts and plate covers.
function Frame({ e, ratio, update, tool, selText, setSelText }) {
  const ref = useRef(null);
  const [W, setW] = useState(0);
  const pts = useRef(new Map());
  const g = useRef(null);
  useLayoutEffect(() => {
    const measure = () => ref.current && setW(ref.current.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const H = W / ratio;
  const sc = W ? coverScale(e, W, H) : 1;

  const down = (ev, kind, id) => {
    ev.stopPropagation();
    try { ref.current.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
    pts.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      g.current = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), zoom: e.zoom };
    } else {
      g.current = { kind, id, x: ev.clientX, y: ev.clientY };
      if (kind === "text") setSelText(id);
    }
  };
  const move = (ev) => {
    if (!pts.current.has(ev.pointerId) || !g.current) return;
    pts.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const st = g.current;
    if (st.kind === "pinch" && pts.current.size >= 2) {
      const [a, b] = [...pts.current.values()];
      const z = Math.max(1, Math.min(4, st.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / st.d)));
      update((x) => ({ zoom: z, ...clampPan({ ...x, zoom: z }, W, H, x.panX, x.panY) }));
      return;
    }
    const dx = ev.clientX - st.x, dy = ev.clientY - st.y;
    st.x = ev.clientX; st.y = ev.clientY;
    if (st.kind === "pan") {
      const d = dragToPan(e, W, dx, dy);
      update((x) => clampPan(x, W, H, x.panX + d.x, x.panY + d.y));
    } else if (st.kind === "text") {
      update((x) => ({ texts: x.texts.map((t) => (t.id === st.id ? { ...t, x: Math.max(0, Math.min(1, t.x + dx / W)), y: Math.max(0, Math.min(1, t.y + dy / H)) } : t)) }));
    } else if (st.kind === "sticker" || st.kind === "resize") {
      const px = (dx / W) * 100, py = (dy / H) * 100;
      update((x) => ({
        stickers: x.stickers.map((s) => {
          if (s.id !== st.id) return s;
          if (st.kind === "sticker") return { ...s, x: Math.max(0, Math.min(100 - s.w, s.x + px)), y: Math.max(0, Math.min(100 - s.h, s.y + py)) };
          return { ...s, w: Math.max(8, Math.min(100 - s.x, s.w + px)), h: Math.max(5, Math.min(100 - s.y, s.h + py)) };
        }),
      }));
    }
  };
  const up = (ev) => { pts.current.delete(ev.pointerId); if (pts.current.size === 0) g.current = null; };
  const warm = warmthLayer(e);

  return (
    <div ref={ref} data-noswipe data-photo-frame onPointerDown={(ev) => down(ev, "pan")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{ position: "relative", width: `min(100%, calc(54vh * ${ratio}))`, margin: "0 auto", aspectRatio: String(ratio), overflow: "hidden", borderRadius: 18, background: "#000", touchAction: "none", cursor: "grab" }}>
      {W > 0 && (
        <img src={e.src} alt="" draggable={false} style={{
          position: "absolute", left: W / 2, top: H / 2, width: e.w, height: e.h, maxWidth: "none", transformOrigin: "0 0",
          transform: `rotate(${angleOf(e)}deg) translate(${e.panX * W}px, ${e.panY * W}px) scale(${sc}) translate(-50%, -50%)`,
          filter: cssFilter(e), pointerEvents: "none", userSelect: "none",
        }} />
      )}
      {warm && <div style={{ position: "absolute", inset: 0, background: warm.color, opacity: warm.alpha, mixBlendMode: "soft-light", pointerEvents: "none" }} />}
      {tool === "crop" && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)", backgroundSize: "33.33% 33.33%" }} />
      )}
      {e.stickers.map((s) => (
        <div key={s.id} data-testid="plate-cover" onPointerDown={(ev) => down(ev, "sticker", s.id)} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%`, background: "rgba(10,10,11,0.94)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab" }}>
          <span className="plate" style={{ fontSize: 9, color: "rgba(255,255,255,0.45)" }}>PLATE</span>
          <button aria-label="Remove plate cover" onPointerDown={(ev) => ev.stopPropagation()} onClick={() => update((x) => ({ stickers: x.stickers.filter((k) => k.id !== s.id) }))} style={{ position: "absolute", top: -8, right: -8, width: 18, height: 18, borderRadius: 999, background: T.accent, border: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={11} color="#fff" /></button>
          <div onPointerDown={(ev) => down(ev, "resize", s.id)} style={{ position: "absolute", right: -5, bottom: -5, width: 16, height: 16, borderRadius: 999, background: "#fff", border: `2px solid ${T.accent}` }} />
        </div>
      ))}
      {e.texts.map((t) => (
        <div key={t.id} data-testid="photo-text" onPointerDown={(ev) => down(ev, "text", t.id)} style={{
          position: "absolute", left: `${t.x * 100}%`, top: `${t.y * 100}%`, transform: "translate(-50%, -50%)", whiteSpace: "nowrap",
          color: t.color, fontWeight: 800, fontSize: t.size * W, textShadow: "0 1px 8px rgba(0,0,0,0.55)", cursor: "grab",
          outline: selText === t.id ? `1.5px dashed ${T.accent}` : "none", outlineOffset: 4, padding: "0 2px",
        }}>{t.text}</div>
      ))}
    </div>
  );
}

function TextSheet({ open, onClose, onAdd }) {
  const [text, setText] = useState("");
  return (
    <BottomSheet open={open} onClose={() => { setText(""); onClose(); }} title="Add text" maxHeight="60vh">
      <TextInput value={text} onChange={setText} placeholder="Type something" maxLength={40} autoFocus />
      <button disabled={!text.trim()} onClick={() => { onAdd(text.trim()); setText(""); onClose(); }} className="press" style={{ width: "100%", marginTop: 12, padding: 13, borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15 }}>Add</button>
    </BottomSheet>
  );
}

// ---------- 3. details ----------
function DetailsStep({ me, cars, communities, users, initialCommunityId, edits, shape, busy, video, onBack, onShare }) {
  const byName = (a, b) => a.make.localeCompare(b.make);
  const myCars = Object.values(cars).filter((c) => c.ownerUsername === me).sort(byName);
  const spotted = Object.values(cars).filter((c) => c.ownerUsername !== me && c.hasPage !== false && c.spotterUsernames.includes(me)).sort(byName);
  const joined = Object.values(communities || {}).filter((c) => c.members.includes(me) || c.id === initialCommunityId);
  const [carId, setCarId] = useState(myCars[0]?.id || (spotted[0] ? spotted[0].id : "none"));
  const [carLabel, setCarLabel] = useState("");
  const [communityId, setCommunityId] = useState(initialCommunityId || "");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState(null);
  const [tags, setTags] = useState([]);
  const canShare = !busy && (edits.length > 0 || !!video);
  const ratio = shapeRatio(shape, edits[0]);

  const carOptions = [
    ...myCars.map((c) => ({ id: c.id, label: c.nickname || `${c.make} ${c.model}`, sub: `Your car · '${c.year}` })),
    ...spotted.map((c) => ({ id: c.id, label: `${c.make} ${c.model}`, sub: `Spotted · @${c.ownerUsername}` })),
    { id: "other", label: "Another car", sub: "Type what it is" },
    { id: "none", label: "No car tag", sub: "Just the post" },
  ];

  return (
    <div>
      <TopRow title="Details" left={<IconBtn label="Back" onClick={onBack}><ChevronLeft size={22} /></IconBtn>}
        right={<button disabled={!canShare} onClick={() => onShare({
          caption, communityId, location, tags,
          carId: carId !== "other" && carId !== "none" ? carId : null, carLabel: carId === "other" ? carLabel : "",
        })} className="press" style={{ ...nextBtn, opacity: canShare ? 1 : 0.5 }}>{busy ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Share"}</button>} />

      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {video && (
          <div style={{ position: "relative", width: 84, flexShrink: 0, aspectRatio: String(Math.max(0.56, Math.min(1.78, video.w / video.h || 1))), borderRadius: 14, overflow: "hidden", background: "#000", alignSelf: "flex-start" }}>
            <video src={`${video.url}#t=${video.start}`} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <span style={{ position: "absolute", right: 4, bottom: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 999 }}>{fmtSecs(video.end - video.start)}</span>
          </div>
        )}
        {edits.length > 0 && !video && (
          <div style={{ position: "relative", width: 84, flexShrink: 0, aspectRatio: String(ratio), borderRadius: 14, overflow: "hidden", background: `url(${edits[0].src}) center/cover`, filter: cssFilter(edits[0]), alignSelf: "flex-start" }}>
            {edits.length > 1 && <span style={{ position: "absolute", right: 4, top: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 999 }}>{edits.length}</span>}
          </div>
        )}
        <div style={{ flex: 1 }}><TextArea value={caption} onChange={setCaption} placeholder="Write a caption…" maxLength={280} maxLines={MAX_LINES.caption} rows={4} /></div>
      </div>

      <Section title="Car" icon={<Car size={16} color={T.accent} />} testid="post-details">
        <ChipPicker testid="car-chips" value={carId} onChange={setCarId} options={carOptions} />
        {carId === "other" && <div style={{ marginTop: 10 }}><TextInput value={carLabel} onChange={setCarLabel} placeholder="e.g. Porsche 911 GT3 RS" maxLength={50} /></div>}
      </Section>

      <Section title="Location" icon={<MapPin size={16} color={T.accent2} />}>
        <PlaceField value={location} onChange={setLocation} />
      </Section>

      <Section title="Tag people" icon={<AtSign size={16} color={T.accentWarm} />}>
        <PeopleField me={me} users={users} value={tags} onChange={setTags} />
      </Section>

      {joined.length > 0 && (
        <Section title="Community" icon={<Users size={16} color={T.accent} />}>
          <ChipPicker testid="community-chips" value={communityId} onChange={setCommunityId} options={[{ id: "", label: "None" }, ...joined.map((c) => ({ id: c.id, label: c.name }))]} />
        </Section>
      )}
    </div>
  );
}

function PlaceField({ value, onChange }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); return; }
    let off = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}&limit=5`);
        const j = await r.json();
        if (!off) setResults((j.features || []).map((f) => ({ label: labelFor(f.properties || {}), ...placeArea(f.properties || {}), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] })).filter((x) => x.label));
      } catch { if (!off) setResults([]); }
    }, 400);
    return () => { off = true; clearTimeout(t); };
  }, [q]);
  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 14, background: T.surface2 }}>
        <MapPin size={14} color={T.accent2} />
        <span data-testid="post-location" style={{ color: T.text, fontSize: 13.5, flex: 1 }}>{value.label}</span>
        <button aria-label="Remove location" onClick={() => onChange(null)} style={{ background: "none", border: "none", padding: 0, display: "flex" }}><X size={15} color={T.textDim} /></button>
      </div>
    );
  }
  return (
    <>
      <TextInput value={q} onChange={setQ} placeholder="Add a place (optional)" icon={<Search size={14} />} />
      {results.map((r, k) => (
        <button key={k} data-testid="place-option" onClick={() => { onChange({ ...r, label: r.label.split(",").slice(0, 2).join(",") }); setQ(""); setResults([]); }} style={{ width: "100%", display: "flex", gap: 8, padding: "10px 4px", background: "none", border: "none", borderBottom: `1px solid ${T.lineDark}`, color: T.text, fontSize: 13, textAlign: "left" }}>
          <MapPin size={13} color={T.accent2} /> {r.label}
        </button>
      ))}
    </>
  );
}

function PeopleField({ me, users, value, onChange }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase().replace(/^@/, "");
  const matches = term ? Object.entries(users).filter(([h, u]) => h !== me && !value.includes(h) && (h.includes(term) || (u.name || "").toLowerCase().includes(term))).slice(0, 5) : [];
  return (
    <>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {value.map((h) => (
            <span key={h} data-testid="tag-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 5px", borderRadius: 999, background: T.surface2, color: T.text, fontSize: 12.5, fontWeight: 600 }}>
              <Avatar username={h} size={20} /> @{h}
              <button aria-label={`Untag ${h}`} onClick={() => onChange(value.filter((x) => x !== h))} style={{ background: "none", border: "none", padding: 0, display: "flex" }}><X size={13} color={T.textDim} /></button>
            </span>
          ))}
        </div>
      )}
      {value.length < 10 && <TextInput value={q} onChange={setQ} placeholder="Search people" icon={<AtSign size={14} />} />}
      {matches.map(([h, u]) => (
        <button key={h} data-testid="tag-option" onClick={() => { onChange([...value, h]); setQ(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", background: "none", border: "none", textAlign: "left" }}>
          <Avatar username={h} size={28} />
          <span style={{ color: T.text, fontSize: 13.5, fontWeight: 600 }}>{u.name || h}</span>
          <span style={{ color: T.textDim, fontSize: 12 }}>@{h}</span>
        </button>
      ))}
    </>
  );
}

// ---------- small pieces ----------
function TopRow({ title, left, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, minHeight: 40 }}>
      {left}
      <div className="display" style={{ fontSize: 20, color: T.text, flex: 1 }}>{title}</div>
      {right}
    </div>
  );
}
function IconBtn({ label, onClick, children }) {
  return <button aria-label={label} onClick={onClick} className="press" style={{ width: 38, height: 38, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.07)", color: T.text, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</button>;
}
function Slider({ label, min, max, step, value, onChange, center, testid }) {
  const shown = center ? Math.round(value) : label === "Zoom" ? `${value.toFixed(1)}×` : label === "Straighten" ? `${value}°` : value.toFixed(2);
  return (
    <div data-noswipe style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: T.textDim, fontSize: 11.5, fontWeight: 600, marginBottom: 2 }}>
        <span>{label}</span><span style={{ color: T.text }}>{shown}</span>
      </div>
      <input data-testid={testid} type="range" min={min} max={max} step={step} value={value} onChange={(ev) => onChange(Number(ev.target.value))}
        onDoubleClick={() => center && onChange(0)} style={{ width: "100%", accentColor: T.accent }} />
    </div>
  );
}
const chip = (on) => ({
  flex: 1, padding: "7px 10px", borderRadius: 999, border: `1px solid ${on ? T.accent : T.lineDark}`,
  background: on ? "rgba(230,56,70,0.14)" : T.surface2, color: on ? T.accent : T.textDim, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
});
const nextBtn = { padding: "9px 18px", borderRadius: 999, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 14, boxShadow: T.shadowAccent, minWidth: 74, display: "flex", justifyContent: "center" };
