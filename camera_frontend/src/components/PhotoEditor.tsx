import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, X, Eye, Wand2, RotateCw, FlipHorizontal, FlipVertical,
  Crop as CropIcon, SlidersHorizontal, Palette, Sparkles, Type as TypeIcon,
  Smile, Download, Trash2, Plus, Sun, Moon, Heart, Sticker, Crosshair
} from 'lucide-react';

// =====================================================================
// CONSTANTS
// =====================================================================
const STICKERS = ['😊', '😂', '❤️', '👍', '🎉', '🌟', '🔥', '💡', '🐶', '🐱', '✨', '🎈', '🍕', '🚀', '🌈', '💯'];

const FILTERS = [
  { name: 'Original', swatch: ['#8a8a8a', '#c9c9c9'], values: {} },
  { name: 'Vivid', swatch: ['#ff5e62', '#ffb347'], values: { saturation: 30, vibrance: 40, contrast: 10 } },
  { name: 'Warm', swatch: ['#ff9966', '#ffcc99'], values: { temperature: 40, tint: 10 } },
  { name: 'Cool', swatch: ['#4facfe', '#00f2fe'], values: { temperature: -40, tint: -10 } },
  { name: 'Dramatic', swatch: ['#232526', '#8e9eab'], values: { contrast: 40, highlights: -20, shadows: -20, sharpness: 30, vibrance: 20 } },
  { name: 'Noir', swatch: ['#141414', '#a9a9a9'], values: { saturation: -100, contrast: 15 } },
  { name: 'Film', swatch: ['#7b6a5e', '#c9b89b'], values: { saturation: -20, contrast: 20, vignette: 30, grain: 0.15 } },
  { name: 'Retro', swatch: ['#e0a96d', '#7b5b47'], values: { temperature: 20, tint: 20, vignette: 40, grain: 0.25 } },
  { name: 'Cinema', swatch: ['#0f2027', '#2c5364'], values: { contrast: 30, highlights: -15, shadows: 15, temperature: -10, vibrance: 20 } },
  { name: 'Sunset', swatch: ['#ff5f6d', '#ffc371'], values: { temperature: 50, tint: 20, vibrance: 30, highlights: -10 } },
];

const ASPECTS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

const TABS = [
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'crop', label: 'Crop', icon: CropIcon },
  { id: 'filters', label: 'Filters', icon: Palette },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'beauty', label: 'Beauty', icon: Heart },
  { id: 'text', label: 'Text', icon: TypeIcon },
  { id: 'stickers', label: 'Stickers', icon: Smile },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// =====================================================================
// COMPONENT
// =====================================================================
export default function PhotoEditor({ imageSrc, isOpen, onClose }) {
  // ---- crop (percentages of displayed image) ----
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [aspect, setAspect] = useState(null);
  const cropDrag = useRef(null);
  const imgWrapRef = useRef(null);
  const imgElRef = useRef(null);

  // ---- transform ----
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // ---- adjustments ----
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [exposure, setExposure] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [vibrance, setVibrance] = useState(0);

  // ---- effects ----
  const [vignette, setVignette] = useState(0);
  const [grain, setGrain] = useState(0);
  const [tiltShift, setTiltShift] = useState(0);
  const [skinSmoothing, setSkinSmoothing] = useState(0);

  // ---- beauty sliders (automated) ----
  const [blemishRemoval, setBlemishRemoval] = useState(0);
  const [teethWhitening, setTeethWhitening] = useState(0);
  const [redEyeRemoval, setRedEyeRemoval] = useState(false);

  // ---- interactive healing brush ----
  const [healActive, setHealActive] = useState(false);
  const [healBrushSize, setHealBrushSize] = useState(20);
  const [healStrength, setHealStrength] = useState(0.6);
  const healRef = useRef(false);
  const previewCanvasRef = useRef(null);
  const editedCanvasRef = useRef(null); // holds the fully rendered image (before splitting)
  const originalImageRef = useRef(null);

  // ---- text & stickers ----
  const [textLayers, setTextLayers] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState('😊');

  // ---- history ----
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);

  // ---- ui ----
  const [activeTab, setActiveTab] = useState('adjust');
  const [comparePos, setComparePos] = useState(50);
  const [histogram, setHistogram] = useState(null);
  const [dark, setDark] = useState(true);

  const currentState = {
    rotation, flipH, flipV,
    brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, sharpness, vibrance,
    vignette, grain, tiltShift, skinSmoothing,
    blemishRemoval, teethWhitening, redEyeRemoval,
    textLayers: textLayers.map((l) => ({ ...l })),
    stickers: stickers.map((s) => ({ ...s })),
  };

  useEffect(() => {
    if (!isUndoRedo.current) {
      const next = history.slice(0, historyIndex + 1);
      next.push(currentState);
      if (next.length > 50) next.shift();
      setHistory(next);
      setHistoryIndex(next.length - 1);
    }
    isUndoRedo.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, flipH, flipV, brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, sharpness, vibrance, vignette, grain, tiltShift, skinSmoothing, blemishRemoval, teethWhitening, redEyeRemoval, textLayers, stickers]);

  const applyState = (s) => {
    setRotation(s.rotation); setFlipH(s.flipH); setFlipV(s.flipV);
    setBrightness(s.brightness); setContrast(s.contrast); setSaturation(s.saturation);
    setExposure(s.exposure); setHighlights(s.highlights); setShadows(s.shadows);
    setTemperature(s.temperature); setTint(s.tint); setSharpness(s.sharpness); setVibrance(s.vibrance);
    setVignette(s.vignette); setGrain(s.grain); setTiltShift(s.tiltShift); setSkinSmoothing(s.skinSmoothing);
    setBlemishRemoval(s.blemishRemoval); setTeethWhitening(s.teethWhitening); setRedEyeRemoval(s.redEyeRemoval);
    setTextLayers(s.textLayers.map((l) => ({ ...l })));
    setStickers(s.stickers.map((st) => ({ ...st })));
  };

  const undo = () => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      setHistoryIndex(historyIndex - 1);
      applyState(history[historyIndex - 1]);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      setHistoryIndex(historyIndex + 1);
      applyState(history[historyIndex + 1]);
    }
  };

  const resetAll = () => {
    setBrightness(0); setContrast(0); setSaturation(0); setExposure(0);
    setHighlights(0); setShadows(0); setTemperature(0); setTint(0);
    setVibrance(0); setSharpness(0); setVignette(0); setGrain(0);
    setTiltShift(0); setSkinSmoothing(0);
    setBlemishRemoval(0); setTeethWhitening(0); setRedEyeRemoval(false);
  };

  const autoEnhance = () => {
    setBrightness(6); setContrast(14); setSaturation(16);
    setExposure(4); setVibrance(12); setSharpness(10);
  };

  // ---------------------------------------------------------------
  // RENDER PIPELINE → edit canvas (offscreen)
  // ---------------------------------------------------------------
  const renderEditedImage = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (rotation % 180 !== 0) [w, h] = [h, w];
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();

      let imageData = ctx.getImageData(0, 0, w, h);
      imageData = applyPixelAdjustments(imageData, {
        brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, vibrance, sharpness,
      });
      ctx.putImageData(imageData, 0, 0);

      if (skinSmoothing > 0) {
        const smoothed = applySkinSmoothing(ctx, w, h, skinSmoothing);
        ctx.putImageData(smoothed, 0, 0);
      }
      if (blemishRemoval > 0) {
        applyBlemishRemoval(ctx, w, h, blemishRemoval);
      }
      if (teethWhitening > 0) {
        applyTeethWhitening(ctx, w, h, teethWhitening);
      }
      if (redEyeRemoval) {
        applyRedEyeRemoval(ctx, w, h);
      }

      if (vignette > 0) applyVignette(ctx, w, h, vignette);
      if (tiltShift > 0) applyTiltShift(ctx, w, h, tiltShift);
      if (grain > 0) applyGrain(ctx, w, h, grain);

      textLayers.forEach((layer) => drawTextLayer(ctx, w, h, layer));
      stickers.forEach((s) => {
        ctx.save();
        ctx.font = `${s.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, s.x, s.y);
        ctx.restore();
      });

      editedCanvasRef.current = canvas;
      originalImageRef.current = img;
      setHistogram(computeHistogram(ctx, w, h));
      drawPreviewCanvas();
    };
    img.src = imageSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, rotation, flipH, flipV, brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, sharpness, vibrance, vignette, grain, tiltShift, skinSmoothing, blemishRemoval, teethWhitening, redEyeRemoval, textLayers, stickers]);

  useEffect(() => {
    renderEditedImage();
  }, [renderEditedImage]);

  // ---------------------------------------------------------------
  // DRAW PREVIEW CANVAS (split compare view)
  // ---------------------------------------------------------------
  const drawPreviewCanvas = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const origImg = originalImageRef.current;
    const editCanvas = editedCanvasRef.current;
    if (!origImg || !editCanvas) return;

    // Calculate scale to fit the canvas while maintaining aspect ratio
    const scale = Math.min(canvas.width / editCanvas.width, canvas.height / editCanvas.height);
    const dw = editCanvas.width * scale;
    const dh = editCanvas.height * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;

    // Draw original image (left side up to comparePos%)
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, (dw * comparePos) / 100, dh);
    ctx.clip();
    ctx.drawImage(origImg, dx, dy, dw, dh);
    ctx.restore();

    // Draw edited image (right side from comparePos%)
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx + (dw * comparePos) / 100, dy, dw - (dw * comparePos) / 100, dh);
    ctx.clip();
    ctx.drawImage(editCanvas, dx, dy, dw, dh);
    ctx.restore();

    // Draw compare line
    const lineX = dx + (dw * comparePos) / 100;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineX, dy);
    ctx.lineTo(lineX, dy + dh);
    ctx.stroke();
  }, [comparePos]);

  useEffect(() => {
    drawPreviewCanvas();
  }, [comparePos, drawPreviewCanvas]);

  // Redraw when edited canvas changes (via brushes or slider changes)
  useEffect(() => {
    drawPreviewCanvas();
  }, [editedCanvasRef.current, drawPreviewCanvas]);

  // ---------------------------------------------------------------
  // INTERACTIVE HEALING BRUSH
  // ---------------------------------------------------------------
  const getImageCoords = (e) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const editCanvas = editedCanvasRef.current;
    if (!editCanvas) return null;

    const scaleX = editCanvas.width / canvas.width;
    const scaleY = editCanvas.height / canvas.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x: Math.round(x), y: Math.round(y), scaleX, scaleY };
  };

  const applyHealAt = (x, y) => {
    const editCanvas = editedCanvasRef.current;
    if (!editCanvas) return;
    const ctx = editCanvas.getContext('2d');
    if (!ctx) return;
    const radius = Math.max(1, Math.floor(healBrushSize / 2));
    // Get image data of the area
    const imageData = ctx.getImageData(
      Math.max(0, x - radius),
      Math.max(0, y - radius),
      Math.min(editCanvas.width, x + radius + 1) - Math.max(0, x - radius),
      Math.min(editCanvas.height, y + radius + 1) - Math.max(0, y - radius)
    );
    // Apply a small median or bilateral-like filter (simple average of similar colors)
    const data = imageData.data;
    const copy = new Uint8ClampedArray(data);
    const areaSize = (radius * 2 + 1);
    for (let dy = radius; dy < imageData.height - radius; dy++) {
      for (let dx = radius; dx < imageData.width - radius; dx++) {
        const idx = (dy * imageData.width + dx) * 4;
        // Compute average of surrounding pixels that are close in color
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        const r0 = copy[idx], g0 = copy[idx + 1], b0 = copy[idx + 2];
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const nidx = ((dy + ky) * imageData.width + (dx + kx)) * 4;
            const nr = copy[nidx], ng = copy[nidx + 1], nb = copy[nidx + 2];
            const diff = Math.abs(nr - r0) + Math.abs(ng - g0) + Math.abs(nb - b0);
            if (diff < 50 * (1 - healStrength) + 20) { // tolerance based on strength
              rSum += nr; gSum += ng; bSum += nb;
              count++;
            }
          }
        }
        if (count > 1) {
          data[idx] = rSum / count;
          data[idx + 1] = gSum / count;
          data[idx + 2] = bSum / count;
        }
      }
    }
    ctx.putImageData(imageData,
      Math.max(0, x - radius),
      Math.max(0, y - radius)
    );
    drawPreviewCanvas();
  };

  const handlePointerDown = (e) => {
    if (!healActive) return;
    e.preventDefault();
    const coords = getImageCoords(e);
    if (coords) {
      healRef.current = true;
      applyHealAt(coords.x, coords.y);
    }
  };

  const handlePointerMove = (e) => {
    if (!healActive || !healRef.current) return;
    const coords = getImageCoords(e);
    if (coords) applyHealAt(coords.x, coords.y);
  };

  const handlePointerUp = () => {
    healRef.current = false;
  };

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [healActive, healBrushSize, healStrength]);

  // ---------------------------------------------------------------
  // TEXT & STICKER HANDLERS (unchanged)
  // ---------------------------------------------------------------
  const addTextLayer = () => {
    const layer = {
      id: Date.now().toString(), text: 'Your text', fontSize: 64, color: '#ffffff',
      position: 'center', outlineColor: '#000000', outlineWidth: 4, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.8)',
    };
    setTextLayers([...textLayers, layer]);
  };
  const updateTextLayer = (id, updates) => setTextLayers((p) => p.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  const removeTextLayer = (id) => setTextLayers((p) => p.filter((l) => l.id !== id));

  const addSticker = () => {
    setStickers([...stickers, { id: Date.now().toString(), emoji: selectedSticker, size: 100, x: 200, y: 200 }]);
  };
  const removeSticker = (id) => setStickers((p) => p.filter((s) => s.id !== id));

  // ---------------------------------------------------------------
  // CROP OVERLAY — pointer handling (unchanged)
  // ---------------------------------------------------------------
  const setAspectRect = (a) => {
    setAspect(a);
    if (!a) return;
    const el = imgElRef.current;
    if (!el) return;
    const dispW = el.clientWidth, dispH = el.clientHeight;
    const targetRatio = a;
    let w, h;
    if (dispW / dispH > targetRatio) { h = dispH; w = h * targetRatio; }
    else { w = dispW; h = w / targetRatio; }
    const wPct = (w / dispW) * 100, hPct = (h / dispH) * 100;
    setCropRect({ x: (100 - wPct) / 2, y: (100 - hPct) / 2, width: wPct, height: hPct });
  };

  const onCropPointerDown = (e, mode, corner) => {
    e.stopPropagation();
    e.preventDefault();
    const bounds = imgWrapRef.current.getBoundingClientRect();
    cropDrag.current = { mode, corner, startX: e.clientX, startY: e.clientY, startRect: { ...cropRect }, bounds };
    window.addEventListener('pointermove', onCropPointerMove);
    window.addEventListener('pointerup', onCropPointerUp);
  };
  const onCropPointerMove = (e) => {
    const d = cropDrag.current;
    if (!d) return;
    const dxPct = ((e.clientX - d.startX) / d.bounds.width) * 100;
    const dyPct = ((e.clientY - d.startY) / d.bounds.height) * 100;
    let r = { ...d.startRect };
    if (d.mode === 'move') {
      r.x = clamp(d.startRect.x + dxPct, 0, 100 - r.width);
      r.y = clamp(d.startRect.y + dyPct, 0, 100 - r.height);
    } else if (d.mode === 'resize') {
      const c = d.corner;
      if (c.includes('e')) r.width = clamp(d.startRect.width + dxPct, 5, 100 - r.x);
      if (c.includes('s')) r.height = clamp(d.startRect.height + dyPct, 5, 100 - r.y);
      if (c.includes('w')) {
        const newX = clamp(d.startRect.x + dxPct, 0, d.startRect.x + d.startRect.width - 5);
        r.width = d.startRect.width + (d.startRect.x - newX);
        r.x = newX;
      }
      if (c.includes('n')) {
        const newY = clamp(d.startRect.y + dyPct, 0, d.startRect.y + d.startRect.height - 5);
        r.height = d.startRect.height + (d.startRect.y - newY);
        r.y = newY;
      }
      if (aspect) {
        r.height = r.width / aspect;
        if (r.y + r.height > 100) r.height = 100 - r.y;
      }
    }
    setCropRect(r);
  };
  const onCropPointerUp = () => {
    cropDrag.current = null;
    window.removeEventListener('pointermove', onCropPointerMove);
    window.removeEventListener('pointerup', onCropPointerUp);
  };

  // ---------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------
  const applyCropAndSave = () => {
    if (!editedCanvasRef.current) return;
    const isFullCrop = cropRect.x === 0 && cropRect.y === 0 && cropRect.width === 100 && cropRect.height === 100;
    if (isFullCrop) {
      const dataUrl = editedCanvasRef.current.toDataURL('image/jpeg', 0.95);
      onClose(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const x = (cropRect.x / 100) * img.width;
      const y = (cropRect.y / 100) * img.height;
      const w = (cropRect.width / 100) * img.width;
      const h = (cropRect.height / 100) * img.height;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      onClose(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = editedCanvasRef.current.toDataURL();
  };
  const handleClose = (save) => (save ? applyCropAndSave() : onClose());

  // ---------------------------------------------------------------
  // COMPARE SLIDER DRAG
  // ---------------------------------------------------------------
  const compareDrag = useRef(false);
  const onCompareDown = (e) => {
    e.preventDefault();
    compareDrag.current = true;
    window.addEventListener('pointermove', onCompareMove);
    window.addEventListener('pointerup', onCompareUp);
  };
  const onCompareMove = (e) => {
    if (!compareDrag.current || !imgWrapRef.current) return;
    const b = imgWrapRef.current.getBoundingClientRect();
    setComparePos(clamp(((e.clientX - b.left) / b.width) * 100, 0, 100));
  };
  const onCompareUp = () => {
    compareDrag.current = false;
    window.removeEventListener('pointermove', onCompareMove);
    window.removeEventListener('pointerup', onCompareUp);
  };

  if (!isOpen) return null;

  return (
    <div className={`pe-root ${dark ? 'pe-dark' : 'pe-light'}`}>
      <style>{CSS}</style>
      <div className="pe-overlay">
        <div className="pe-modal">
          {/* ---------------- HEADER ---------------- */}
          <header className="pe-header">
            <div className="pe-header-left">
              <div className="pe-brand">
                <span className="pe-sprocket" />
                <span className="pe-sprocket" />
                <span className="pe-brand-text">Editor</span>
              </div>
              <div className="pe-divider" />
              <button type="button" className="pe-icon-btn" onClick={undo} disabled={historyIndex <= 0} title="Undo"><Undo2 size={16} /></button>
              <button type="button" className="pe-icon-btn" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo"><Redo2 size={16} /></button>
              <button type="button" className="pe-icon-btn" onClick={resetAll} title="Reset adjustments">Reset</button>
            </div>
            <div className="pe-header-right">
              <button type="button" className="pe-icon-btn" onClick={() => setDark((d) => !d)} title="Toggle theme">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button type="button" className="pe-close-btn" onClick={() => handleClose(false)} title="Close"><X size={18} /></button>
            </div>
          </header>

          {/* ---------------- MAIN ---------------- */}
          <div className="pe-main">
            <div className="pe-preview-section">
              <div className="pe-canvas-frame" ref={imgWrapRef} style={{ position: 'relative' }}>
                {/* Preview canvas (replaces image tags) */}
                <canvas
                  ref={previewCanvasRef}
                  className="pe-preview-canvas"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    cursor: healActive ? 'crosshair' : (activeTab === 'crop' ? 'default' : 'ew-resize'),
                  }}
                />

                {/* Compare handle */}
                <div
                  className="pe-compare-line"
                  style={{ left: `${comparePos}%`, touchAction: 'none' }}
                  onPointerDown={onCompareDown}
                >
                  <div className="pe-compare-handle" onPointerDown={onCompareDown}>
                    <Eye size={13} />
                  </div>
                </div>

                {/* Crop overlay */}
                {activeTab === 'crop' && (
                  <div className="pe-crop-overlay">
                    <div className="pe-crop-mask" style={{ clipPath: cropClipPath(cropRect) }} />
                    <div
                      className="pe-crop-rect"
                      style={{ left: `${cropRect.x}%`, top: `${cropRect.y}%`, width: `${cropRect.width}%`, height: `${cropRect.height}%`, touchAction: 'none' }}
                      onPointerDown={(e) => onCropPointerDown(e, 'move')}
                    >
                      <div className="pe-crop-grid"><span /><span /><span /></div>
                      {['nw', 'ne', 'sw', 'se'].map((c) => (
                        <div key={c} className={`pe-crop-handle pe-crop-${c}`} onPointerDown={(e) => onCropPointerDown(e, 'resize', c)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="pe-preview-hint">
                {healActive ? 'Click or drag to heal spots' : 'Drag the divider to compare — left original, right edited'}
              </div>
            </div>

            {/* ---------------- TOOL PANEL ---------------- */}
            <aside className="pe-panel">
              <nav className="pe-tabs">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} type="button" className={`pe-tab ${activeTab === t.id ? 'pe-tab-active' : ''}`} onClick={() => setActiveTab(t.id)}>
                      <Icon size={16} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pe-tab-content">
                {activeTab === 'adjust' && (
                  <>
                    <Histogram data={histogram} />
                    <button type="button" className="pe-auto-btn" onClick={autoEnhance}><Wand2 size={14} /> Auto Enhance</button>
                    <Slider label="Exposure" value={exposure} onChange={setExposure} />
                    <Slider label="Brightness" value={brightness} onChange={setBrightness} />
                    <Slider label="Contrast" value={contrast} onChange={setContrast} />
                    <Slider label="Highlights" value={highlights} onChange={setHighlights} />
                    <Slider label="Shadows" value={shadows} onChange={setShadows} />
                    <div className="pe-group-label">Color</div>
                    <Slider label="Temperature" value={temperature} onChange={setTemperature} />
                    <Slider label="Tint" value={tint} onChange={setTint} />
                    <Slider label="Saturation" value={saturation} onChange={setSaturation} />
                    <Slider label="Vibrance" value={vibrance} onChange={setVibrance} />
                    <div className="pe-group-label">Detail</div>
                    <Slider label="Sharpness" value={sharpness} onChange={setSharpness} />
                  </>
                )}

                {activeTab === 'crop' && (
                  <>
                    <div className="pe-group-label">Aspect ratio</div>
                    <div className="pe-aspect-grid">
                      {ASPECTS.map((a) => (
                        <button key={a.label} type="button" className={`pe-aspect-btn ${aspect === a.value ? 'pe-aspect-active' : ''}`} onClick={() => setAspectRect(a.value)}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                    <div className="pe-group-label">Transform</div>
                    <div className="pe-transform-grid">
                      <button type="button" className="pe-tool-btn" onClick={() => setRotation((r) => r + 90)}><RotateCw size={16} /><span>Rotate</span></button>
                      <button type="button" className="pe-tool-btn" onClick={() => setFlipH((f) => !f)}><FlipHorizontal size={16} /><span>Flip H</span></button>
                      <button type="button" className="pe-tool-btn" onClick={() => setFlipV((f) => !f)}><FlipVertical size={16} /><span>Flip V</span></button>
                    </div>
                    <p className="pe-hint-text">Drag the frame on the image to reposition, or pull a corner to resize.</p>
                  </>
                )}

                {activeTab === 'filters' && (
                  <div className="pe-filter-grid">
                    {FILTERS.map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        className="pe-filter-chip"
                        onClick={() => {
                          resetAll();
                          setTimeout(() => {
                            Object.entries(f.values).forEach(([k, v]) => {
                              const setters = { brightness: setBrightness, contrast: setContrast, saturation: setSaturation, exposure: setExposure, highlights: setHighlights, shadows: setShadows, temperature: setTemperature, tint: setTint, vibrance: setVibrance, sharpness: setSharpness, vignette: setVignette, grain: setGrain };
                              if (setters[k]) setters[k](v);
                            });
                          }, 0);
                        }}
                      >
                        <span className="pe-filter-swatch" style={{ background: `linear-gradient(135deg, ${f.swatch[0]}, ${f.swatch[1]})` }} />
                        <span className="pe-filter-name">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'effects' && (
                  <>
                    <Slider label="Vignette" value={vignette} onChange={setVignette} min={0} max={100} />
                    <Slider label="Film Grain" value={Math.round(grain * 100)} onChange={(v) => setGrain(v / 100)} min={0} max={100} />
                    <Slider label="Tilt-Shift" value={tiltShift} onChange={setTiltShift} min={0} max={100} />
                    <Slider label="Skin Smoothing" value={skinSmoothing} onChange={setSkinSmoothing} min={0} max={100} />
                  </>
                )}

                {activeTab === 'beauty' && (
                  <>
                    <div className="pe-group-label">Manual retouch</div>
                    <button
                      type="button"
                      className={`pe-tool-btn ${healActive ? 'pe-aspect-active' : ''}`}
                      onClick={() => setHealActive(!healActive)}
                      style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    >
                      <Crosshair size={16} />
                      <span>Healing Brush</span>
                    </button>
                    {healActive && (
                      <>
                        <Slider label="Brush size" value={healBrushSize} onChange={setHealBrushSize} min={4} max={60} />
                        <Slider label="Strength" value={Math.round(healStrength * 100)} onChange={(v) => setHealStrength(v / 100)} min={10} max={100} />
                      </>
                    )}
                    <div className="pe-group-label">Auto corrections</div>
                    <Slider label="Blemish Removal" value={blemishRemoval} onChange={setBlemishRemoval} min={0} max={100} />
                    <Slider label="Teeth Whitening" value={teethWhitening} onChange={setTeethWhitening} min={0} max={100} />
                    <div className="pe-group-label">Correction</div>
                    <label className="pe-toggle-label">
                      <input type="checkbox" checked={redEyeRemoval} onChange={(e) => setRedEyeRemoval(e.target.checked)} />
                      <span>Red‑eye Removal</span>
                    </label>
                  </>
                )}

                {activeTab === 'text' && (
                  <div className="pe-stack">
                    <button type="button" className="pe-add-btn" onClick={addTextLayer}><Plus size={14} /> Add text</button>
                    {textLayers.length === 0 && <p className="pe-hint-text">No text yet — add a caption or title.</p>}
                    {textLayers.map((layer) => (
                      <div key={layer.id} className="pe-card">
                        <div className="pe-card-row">
                          <input className="pe-input" value={layer.text} onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })} />
                          <button type="button" className="pe-icon-btn pe-danger" onClick={() => removeTextLayer(layer.id)}><Trash2 size={14} /></button>
                        </div>
                        <div className="pe-card-row">
                          <select className="pe-select" value={layer.position} onChange={(e) => updateTextLayer(layer.id, { position: e.target.value })}>
                            <option value="top-left">Top left</option><option value="top-center">Top center</option><option value="top-right">Top right</option>
                            <option value="center">Center</option><option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option>
                          </select>
                          <input type="color" className="pe-color" value={layer.color} onChange={(e) => updateTextLayer(layer.id, { color: e.target.value })} />
                        </div>
                        <Slider label="Size" value={layer.fontSize} min={12} max={200} onChange={(v) => updateTextLayer(layer.id, { fontSize: v })} />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'stickers' && (
                  <div className="pe-stack">
                    <div className="pe-emoji-grid">
                      {STICKERS.map((e) => (
                        <button key={e} type="button" className={`pe-emoji-btn ${selectedSticker === e ? 'pe-emoji-active' : ''}`} onClick={() => setSelectedSticker(e)}>{e}</button>
                      ))}
                    </div>
                    <button type="button" className="pe-add-btn" onClick={addSticker}><Plus size={14} /> Place sticker</button>
                    {stickers.length > 0 && (
                      <div className="pe-placed-grid">
                        {stickers.map((s) => (
                          <div key={s.id} className="pe-placed-chip" onClick={() => removeSticker(s.id)} title="Remove">
                            {s.emoji}<X size={10} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* ---------------- FOOTER ---------------- */}
          <footer className="pe-footer">
            <span className="pe-footer-hint">{history.length > 0 ? `${historyIndex + 1} / ${history.length} edits` : 'No edits yet'}</span>
            <div className="pe-footer-actions">
              <button type="button" className="pe-cancel-btn" onClick={() => handleClose(false)}>Cancel</button>
              <button type="button" className="pe-save-btn" onClick={() => handleClose(true)}><Download size={15} /> Save photo</button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// SLIDER (unchanged)
// =====================================================================
function Slider({ label, value, onChange, min = -100, max = 100 }) {
  const pct = ((value - min) / (max - min)) * 100;
  const zero = ((0 - min) / (max - min)) * 100;
  const lo = Math.min(pct, zero), hi = Math.max(pct, zero);
  return (
    <div className="pe-slider-row">
      <div className="pe-slider-top">
        <span className="pe-slider-label">{label}</span>
        <span className="pe-slider-value">{value}</span>
      </div>
      <div className="pe-slider-track-wrap">
        <div className="pe-slider-track" />
        <div className="pe-slider-fill" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
        <input
          type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="pe-slider-input"
        />
      </div>
    </div>
  );
}

// =====================================================================
// HISTOGRAM (unchanged)
// =====================================================================
function Histogram({ data }) {
  if (!data) return <div className="pe-histogram-empty" />;
  const max = Math.max(...data, 1);
  return (
    <div className="pe-histogram">
      {data.map((v, i) => (
        <div key={i} className="pe-histogram-bar" style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

function computeHistogram(ctx, w, h) {
  const bins = new Array(32).fill(0);
  const { data } = ctx.getImageData(0, 0, w, h);
  const stride = 16;
  for (let i = 0; i < data.length; i += 4 * stride) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    bins[Math.min(31, Math.floor((lum / 255) * 32))]++;
  }
  return bins;
}

function cropClipPath(r) {
  const x1 = r.x, y1 = r.y, x2 = r.x + r.width, y2 = r.y + r.height;
  return `polygon(0% 0%, 0% 100%, ${x1}% 100%, ${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%, ${x1}% 100%, 100% 100%, 100% 0%)`;
}

// =====================================================================
// PIXEL PROCESSING (unchanged plus beauty functions)
// =====================================================================
function applyPixelAdjustments(imageData, o) {
  const data = imageData.data;
  const exposureFactor = Math.pow(2, o.exposure / 100);
  const tempR = 1 + o.temperature / 200;
  const tempB = 1 - o.temperature / 200;
  const tintG = 1 + o.tint / 200;
  const tintRB = 1 + o.tint / 200;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    r += (o.brightness / 100) * 255; g += (o.brightness / 100) * 255; b += (o.brightness / 100) * 255;
    if (o.contrast !== 0) {
      const factor = (259 * (o.contrast + 255)) / (255 * (259 - o.contrast));
      r = factor * (r - 128) + 128; g = factor * (g - 128) + 128; b = factor * (b - 128) + 128;
    }
    r *= exposureFactor; g *= exposureFactor; b *= exposureFactor;
    r *= tempR; b *= tempB;
    if (o.tint >= 0) g *= tintG; else { r *= tintRB; b *= tintRB; }

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (o.shadows !== 0) { const t = Math.max(0, 1 - lum / 128); const f = 1 + (o.shadows / 100) * t; r *= f; g *= f; b *= f; }
    if (o.highlights !== 0) { const t = Math.max(0, lum / 128 - 1); const f = 1 - (o.highlights / 100) * t; r *= f; g *= f; b *= f; }

    if (o.saturation !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b; const s = o.saturation / 100;
      r = gray + (r - gray) * (1 + s); g = gray + (g - gray) * (1 + s); b = gray + (b - gray) * (1 + s);
    }
    if (o.vibrance !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      const vib = o.vibrance / 100; const scale = 1 + vib * (1 - sat);
      r = gray + (r - gray) * scale; g = gray + (g - gray) * scale; b = gray + (b - gray) * scale;
    }
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
  if (o.sharpness !== 0) applySharpen(imageData, o.sharpness / 100);
  return imageData;
}

function applySharpen(imageData, amount) {
  const data = imageData.data, width = imageData.width, height = imageData.height;
  const copy = new Uint8ClampedArray(data);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            val += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.max(0, Math.min(255, copy[idx] + amount * (val - copy[idx])));
      }
    }
  }
}

function applyVignette(ctx, w, h, intensity) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.5);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${intensity / 100})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function applyTiltShift(ctx, w, h, intensity) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(0.4, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, `rgba(255,255,255,${intensity / 100})`);
  gradient.addColorStop(0.6, 'rgba(0,0,0,0)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function applyGrain(ctx, w, h, amount) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * amount;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

function applySkinSmoothing(ctx, w, h, intensity) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const radius = Math.floor(intensity / 20);
  if (radius < 1) return imageData;
  const copy = new Uint8ClampedArray(data);
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const isSkin = r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b;
      if (isSkin) {
        let sr = 0, sg = 0, sb = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nidx = ((y + dy) * w + (x + dx)) * 4;
            sr += copy[nidx]; sg += copy[nidx + 1]; sb += copy[nidx + 2]; count++;
          }
        }
        data[idx] = sr / count; data[idx + 1] = sg / count; data[idx + 2] = sb / count;
      }
    }
  }
  return imageData;
}

function applyBlemishRemoval(ctx, w, h, intensity) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const radius = Math.floor(intensity / 20) + 1;
  if (radius < 1) return;
  const copy = new Uint8ClampedArray(data);
  const isSkinPixel = (r, g, b) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b;
  };

  const neighbourhood = new Array((2 * radius + 1) ** 2);
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const idx = (y * w + x) * 4;
      if (!isSkinPixel(data[idx], data[idx+1], data[idx+2])) continue;
      let len = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nidx = ((y + dy) * w + (x + dx)) * 4;
          neighbourhood[len] = copy[nidx];
          neighbourhood[len + 1] = copy[nidx + 1];
          neighbourhood[len + 2] = copy[nidx + 2];
          len += 3;
        }
      }
      const getMedian = (arr, start, stride) => {
        const a = [];
        for (let i = start; i < arr.length; i += 3) a.push(arr[i]);
        a.sort((a,b) => a - b);
        return a[Math.floor(a.length / 2)];
      };
      data[idx] = getMedian(neighbourhood, 0, 3);
      data[idx+1] = getMedian(neighbourhood, 1, 3);
      data[idx+2] = getMedian(neighbourhood, 2, 3);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyTeethWhitening(ctx, w, h, intensity) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const factor = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const hue = (max === r ? ((g - b) / (max - min)) * 60 : max === g ? (2 + (b - r) / (max - min)) * 60 : (4 + (r - g) / (max - min)) * 60);
    if (lum > 180 && sat < 0.2 && hue > 30 && hue < 60) {
      const whiten = 0.3 * factor;
      r = r + (255 - r) * whiten;
      g = g + (255 - g) * whiten * 0.8;
      b = b + (255 - b) * whiten * 1.2;
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * (1 - whiten * 0.5);
      g = gray + (g - gray) * (1 - whiten * 0.5);
      b = gray + (b - gray) * (1 - whiten * 0.5);
      data[i] = Math.max(0, Math.min(255, r));
      data[i+1] = Math.max(0, Math.min(255, g));
      data[i+2] = Math.max(0, Math.min(255, b));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyRedEyeRemoval(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const isSkin = (r,g,b) => {
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    return r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b;
  };
  const radius = 3;
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      if (r > 100 && g < 60 && b < 60 && r > g * 1.5 && r > b * 1.5) {
        let skinCount = 0, total = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nidx = ((y+dy)*w + (x+dx)) * 4;
            total++;
            if (isSkin(data[nidx], data[nidx+1], data[nidx+2])) skinCount++;
          }
        }
        if (skinCount > total * 0.4) {
          const gray = (g + b) / 2;
          data[idx] = gray * 0.8;
          data[idx+1] = g * 1.1;
          data[idx+2] = b * 1.1;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// =====================================================================
// TEXT DRAWING (unchanged)
// =====================================================================
function drawTextLayer(ctx, w, h, layer) {
  ctx.save();
  const fontSize = layer.fontSize;
  ctx.font = `bold ${fontSize}px Impact, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const margin = 20;
  let x = w / 2, y = h / 2;
  switch (layer.position) {
    case 'top-left': x = margin; y = fontSize / 2 + margin; ctx.textAlign = 'left'; break;
    case 'top-center': x = w / 2; y = fontSize / 2 + margin; break;
    case 'top-right': x = w - margin; y = fontSize / 2 + margin; ctx.textAlign = 'right'; break;
    case 'bottom-left': x = margin; y = h - fontSize / 2 - margin; ctx.textAlign = 'left'; break;
    case 'bottom-center': x = w / 2; y = h - fontSize / 2 - margin; break;
    case 'bottom-right': x = w - margin; y = h - fontSize / 2 - margin; ctx.textAlign = 'right'; break;
    default: break;
  }
  if (layer.shadowBlur > 0) { ctx.shadowColor = layer.shadowColor; ctx.shadowBlur = layer.shadowBlur; }
  if (layer.outlineWidth > 0) { ctx.strokeStyle = layer.outlineColor; ctx.lineWidth = layer.outlineWidth; ctx.strokeText(layer.text, x, y); }
  ctx.fillStyle = layer.color;
  ctx.fillText(layer.text, x, y);
  ctx.restore();
}

// =====================================================================
// STYLES (updated with canvas class and minor additions)
// =====================================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

.pe-root { --font-display: 'Space Grotesk', sans-serif; --font-mono: 'JetBrains Mono', monospace; --font-body: 'Inter', sans-serif; }
.pe-root.pe-dark {
  --pe-bg: #0c0c0e; --pe-panel: #151517; --pe-panel-2: #1b1b1e; --pe-border: rgba(255,255,255,0.08);
  --pe-border-2: rgba(255,255,255,0.14); --pe-text: #f3f1ec; --pe-text-dim: #8f8c86;
  --pe-accent: #ff7a4d; --pe-accent-2: #38e0c4; --pe-track: rgba(255,255,255,0.10);
  --pe-danger: #ff5d5d; --pe-shadow: 0 30px 80px rgba(0,0,0,0.65);
}
.pe-root.pe-light {
  --pe-bg: #eeece7; --pe-panel: #ffffff; --pe-panel-2: #f6f4ef; --pe-border: rgba(20,18,14,0.08);
  --pe-border-2: rgba(20,18,14,0.16); --pe-text: #1a1917; --pe-text-dim: #7a766d;
  --pe-accent: #e85f2e; --pe-accent-2: #0fae93; --pe-track: rgba(20,18,14,0.08);
  --pe-danger: #d9412f; --pe-shadow: 0 30px 80px rgba(0,0,0,0.25);
}

.pe-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.78); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 20px; font-family: var(--font-body); }

.pe-modal { width: 100%; max-width: 1240px; height: 88vh; background: var(--pe-bg); border-radius: 20px;
  border: 1px solid var(--pe-border); box-shadow: var(--pe-shadow); display: flex; flex-direction: column; overflow: hidden;
  animation: pe-pop 0.22s cubic-bezier(.2,.9,.3,1); }
@keyframes pe-pop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }

/* header */
.pe-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px;
  border-bottom: 1px solid var(--pe-border); background: var(--pe-panel); }
.pe-header-left, .pe-header-right { display: flex; align-items: center; gap: 6px; }
.pe-brand { display: flex; align-items: center; gap: 6px; margin-right: 6px; }
.pe-sprocket { width: 6px; height: 6px; border-radius: 50%; background: var(--pe-accent); opacity: 0.9; }
.pe-sprocket:nth-child(2) { background: var(--pe-accent-2); }
.pe-brand-text { font-family: var(--font-display); font-weight: 600; font-size: 15px; color: var(--pe-text); letter-spacing: 0.2px; margin-left: 4px; }
.pe-divider { width: 1px; height: 20px; background: var(--pe-border-2); margin: 0 6px; }
.pe-icon-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--pe-panel-2); border: 1px solid var(--pe-border);
  color: var(--pe-text); padding: 7px 10px; border-radius: 9px; cursor: pointer; font-size: 12.5px; font-family: var(--font-body); transition: all .15s; }
.pe-icon-btn:hover:not(:disabled) { border-color: var(--pe-border-2); transform: translateY(-1px); }
.pe-icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pe-close-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%;
  background: var(--pe-panel-2); border: 1px solid var(--pe-border); color: var(--pe-text); cursor: pointer; transition: all .15s; }
.pe-close-btn:hover { background: var(--pe-danger); border-color: var(--pe-danger); color: white; transform: rotate(90deg); }

/* main layout */
.pe-main { flex: 1; display: flex; overflow: hidden; }
.pe-preview-section { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(circle at 30% 20%, rgba(255,122,77,0.06), transparent 45%),
              radial-gradient(circle at 80% 80%, rgba(56,224,196,0.05), transparent 45%),
              var(--pe-bg);
  position: relative; padding: 24px; gap: 10px; }
.pe-canvas-frame { position: relative; width: 100%; height: 100%; max-height: 65vh; border-radius: 12px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid var(--pe-border-2); }
.pe-preview-canvas { display: block; width: 100%; height: 100%; }
.pe-preview-hint { font-size: 11.5px; color: var(--pe-text-dim); font-family: var(--font-mono); letter-spacing: 0.2px; }

.pe-compare-line { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--pe-text); opacity: 0.85; cursor: ew-resize; z-index: 5; }
.pe-compare-handle { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 30px; height: 30px;
  border-radius: 50%; background: var(--pe-accent); color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(0,0,0,0.4); cursor: ew-resize; }

/* crop overlay */
.pe-crop-overlay { position: absolute; inset: 0; z-index: 6; }
.pe-crop-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
.pe-crop-rect { position: absolute; border: 1.5px solid var(--pe-accent); cursor: move; box-shadow: 0 0 0 4000px rgba(0,0,0,0); }
.pe-crop-grid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(3,1fr); pointer-events: none; }
.pe-crop-grid span { border-right: 1px solid rgba(255,255,255,0.35); }
.pe-crop-grid span:last-child { border-right: none; }
.pe-crop-handle { position: absolute; width: 12px; height: 12px; background: var(--pe-accent); border: 2px solid white; border-radius: 3px; }
.pe-crop-nw { top: -7px; left: -7px; cursor: nwse-resize; } .pe-crop-se { bottom: -7px; right: -7px; cursor: nwse-resize; }
.pe-crop-ne { top: -7px; right: -7px; cursor: nesw-resize; } .pe-crop-sw { bottom: -7px; left: -7px; cursor: nesw-resize; }

/* right panel */
.pe-panel { width: 320px; min-width: 320px; border-left: 1px solid var(--pe-border); background: var(--pe-panel);
  display: flex; flex-direction: column; }
.pe-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 10px; border-bottom: 1px solid var(--pe-border); }
.pe-tab { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 9px 4px; background: transparent;
  border: 1px solid transparent; border-radius: 10px; color: var(--pe-text-dim); cursor: pointer; font-size: 11px; font-family: var(--font-body); transition: all .15s; }
.pe-tab:hover { background: var(--pe-panel-2); color: var(--pe-text); }
.pe-tab-active { background: var(--pe-panel-2); border-color: var(--pe-border-2); color: var(--pe-accent); }
.pe-tab-content { flex: 1; overflow-y: auto; padding: 16px; }
.pe-tab-content::-webkit-scrollbar { width: 6px; }
.pe-tab-content::-webkit-scrollbar-thumb { background: var(--pe-border-2); border-radius: 3px; }

.pe-group-label { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px;
  color: var(--pe-text-dim); margin: 18px 0 8px; }
.pe-group-label:first-child { margin-top: 0; }

/* histogram */
.pe-histogram { display: flex; align-items: flex-end; gap: 2px; height: 56px; background: var(--pe-panel-2);
  border: 1px solid var(--pe-border); border-radius: 10px; padding: 8px; margin-bottom: 14px; }
.pe-histogram-empty { height: 56px; background: var(--pe-panel-2); border: 1px solid var(--pe-border); border-radius: 10px; margin-bottom: 14px; }
.pe-histogram-bar { flex: 1; min-height: 2px; background: linear-gradient(180deg, var(--pe-accent), var(--pe-accent-2)); border-radius: 1px; opacity: 0.85; }

.pe-auto-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px;
  background: linear-gradient(135deg, var(--pe-accent), #ff5f7a); border: none; color: white; border-radius: 12px;
  font-family: var(--font-display); font-weight: 600; font-size: 13.5px; cursor: pointer; margin-bottom: 16px; transition: transform .15s; }
.pe-auto-btn:hover { transform: translateY(-1px); }

/* sliders */
.pe-slider-row { margin-bottom: 14px; }
.pe-slider-top { display: flex; justify-content: space-between; margin-bottom: 6px; }
.pe-slider-label { font-size: 12.5px; color: var(--pe-text); font-weight: 500; }
.pe-slider-value { font-family: var(--font-mono); font-size: 12px; color: var(--pe-text-dim); min-width: 28px; text-align: right; }
.pe-slider-track-wrap { position: relative; height: 18px; display: flex; align-items: center; }
.pe-slider-track { position: absolute; left: 0; right: 0; height: 4px; border-radius: 2px; background: var(--pe-track); }
.pe-slider-fill { position: absolute; height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--pe-accent), var(--pe-accent-2)); }
.pe-slider-input { position: relative; width: 100%; height: 18px; -webkit-appearance: none; appearance: none; background: transparent; margin: 0; cursor: pointer; }
.pe-slider-input::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
  background: var(--pe-text); border: 3px solid var(--pe-accent); cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4); margin-top: 0; }
.pe-slider-input::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--pe-text); border: 3px solid var(--pe-accent); cursor: pointer; }
.pe-slider-input::-moz-range-track { background: transparent; }

/* filters */
.pe-filter-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.pe-filter-chip { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px; background: var(--pe-panel-2);
  border: 1px solid var(--pe-border); border-radius: 12px; cursor: pointer; transition: all .15s; }
.pe-filter-chip:hover { border-color: var(--pe-accent); transform: translateY(-2px); }
.pe-filter-swatch { width: 100%; height: 40px; border-radius: 8px; }
.pe-filter-name { font-size: 11.5px; color: var(--pe-text); font-weight: 500; }

/* crop tab */
.pe-aspect-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.pe-aspect-btn { padding: 7px 13px; border-radius: 20px; background: var(--pe-panel-2); border: 1px solid var(--pe-border);
  color: var(--pe-text); font-size: 12px; cursor: pointer; font-family: var(--font-mono); }
.pe-aspect-active { border-color: var(--pe-accent); color: var(--pe-accent); background: color-mix(in srgb, var(--pe-accent) 12%, var(--pe-panel-2)); }
.pe-transform-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pe-tool-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px; background: var(--pe-panel-2);
  border: 1px solid var(--pe-border); border-radius: 12px; color: var(--pe-text); cursor: pointer; font-size: 11px; transition: all .15s; }
.pe-tool-btn:hover { border-color: var(--pe-accent-2); color: var(--pe-accent-2); }
.pe-hint-text { font-size: 12px; color: var(--pe-text-dim); line-height: 1.5; margin-top: 14px; }

/* text / stickers */
.pe-stack { display: flex; flex-direction: column; gap: 10px; }
.pe-add-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 10px;
  background: var(--pe-panel-2); border: 1px dashed var(--pe-border-2); color: var(--pe-text); cursor: pointer; font-size: 13px; }
.pe-add-btn:hover { border-color: var(--pe-accent); color: var(--pe-accent); }
.pe-card { background: var(--pe-panel-2); border: 1px solid var(--pe-border); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.pe-card-row { display: flex; gap: 8px; align-items: center; }
.pe-input { flex: 1; padding: 7px 10px; border-radius: 8px; background: var(--pe-panel); border: 1px solid var(--pe-border); color: var(--pe-text); font-size: 13px; }
.pe-select { flex: 1; padding: 7px 8px; border-radius: 8px; background: var(--pe-panel); border: 1px solid var(--pe-border); color: var(--pe-text); font-size: 12px; }
.pe-color { width: 34px; height: 32px; border-radius: 8px; border: 1px solid var(--pe-border); cursor: pointer; background: none; padding: 2px; }
.pe-danger { color: var(--pe-danger); }

.pe-emoji-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.pe-emoji-btn { font-size: 22px; padding: 8px 0; border-radius: 10px; background: var(--pe-panel-2); border: 1px solid var(--pe-border); cursor: pointer; }
.pe-emoji-active { border-color: var(--pe-accent); background: color-mix(in srgb, var(--pe-accent) 14%, var(--pe-panel-2)); }
.pe-placed-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.pe-placed-chip { display: flex; align-items: center; gap: 4px; font-size: 18px; padding: 6px 8px; border-radius: 10px;
  background: var(--pe-panel-2); border: 1px solid var(--pe-border); cursor: pointer; color: var(--pe-text-dim); }
.pe-placed-chip:hover { border-color: var(--pe-danger); color: var(--pe-danger); }

/* toggle */
.pe-toggle-label { display: flex; align-items: center; gap: 8px; color: var(--pe-text); font-size: 13px; cursor: pointer; }

/* footer */
.pe-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
  border-top: 1px solid var(--pe-border); background: var(--pe-panel); }
.pe-footer-hint { font-family: var(--font-mono); font-size: 11.5px; color: var(--pe-text-dim); }
.pe-footer-actions { display: flex; gap: 10px; }
.pe-cancel-btn { padding: 10px 18px; border-radius: 24px; background: transparent; border: 1px solid var(--pe-border-2);
  color: var(--pe-text); cursor: pointer; font-size: 13.5px; font-weight: 500; }
.pe-cancel-btn:hover { background: var(--pe-panel-2); }
.pe-save-btn { display: flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: 24px; border: none;
  background: linear-gradient(135deg, var(--pe-accent), var(--pe-accent-2)); color: #0c0c0e; font-weight: 700; font-size: 13.5px;
  cursor: pointer; box-shadow: 0 8px 24px rgba(255,122,77,0.25); transition: transform .15s; font-family: var(--font-display); }
.pe-save-btn:hover { transform: translateY(-1px); }

@media (max-width: 860px) {
  .pe-main { flex-direction: column; }
  .pe-panel { width: 100%; min-width: 0; border-left: none; border-top: 1px solid var(--pe-border); max-height: 44vh; }
}
`;
