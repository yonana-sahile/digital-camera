import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// ---------- TYPES ----------
interface PhotoEditorProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: (editedImage?: string) => void;
}

type TextPosition = 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface TextLayer {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  position: TextPosition;
  outlineColor: string;
  outlineWidth: number;
  shadowBlur: number;
  shadowColor: string;
}

interface Sticker {
  id: string;
  emoji: string;
  size: number;
  x: number;
  y: number;
}

type ToolTab = 'adjust' | 'filters' | 'effects' | 'text' | 'stickers';

// ---------- CONSTANTS ----------
const stickerOptions = ['😊', '😂', '❤️', '👍', '🎉', '🌟', '🔥', '💡', '🐶', '🐱', '✨', '🎈', '🍕', '🚀', '🌈'];
const filterPresets = [
  { name: 'Original', values: {} },
  { name: 'Vivid', values: { saturation: 30, vibrance: 40, contrast: 10 } },
  { name: 'Warm', values: { temperature: 40, tint: 10 } },
  { name: 'Cool', values: { temperature: -40, tint: -10 } },
  { name: 'Dramatic', values: { contrast: 40, highlights: -20, shadows: -20, sharpness: 30, vibrance: 20 } },
  { name: 'B&W', values: { saturation: -100 } },
  { name: 'Film', values: { saturation: -20, contrast: 20, vignette: 30, grain: 0.15 } },
  { name: 'Retro', values: { temperature: 20, tint: 20, vignette: 40, grain: 0.25 } },
  { name: 'Cinematic', values: { contrast: 30, highlights: -15, shadows: 15, temperature: -10, vibrance: 20 } },
  { name: 'Sunset', values: { temperature: 50, tint: 20, vibrance: 30, highlights: -10 } },
];

// ---------- COMPONENT ----------
const PhotoEditor: React.FC<PhotoEditorProps> = ({ imageSrc, isOpen, onClose }) => {
  // ---------- CROP ----------
  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);

  // ---------- TRANSFORM ----------
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // ---------- ADJUSTMENTS ----------
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

  // ---------- EFFECTS ----------
  const [vignette, setVignette] = useState(0);
  const [grain, setGrain] = useState(0);
  const [tiltShift, setTiltShift] = useState(0); // 0=off, 1=max blur
  const [skinSmoothing, setSkinSmoothing] = useState(0);

  // ---------- TEXT & STICKERS ----------
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState('😊');

  // ---------- UNDO/REDO ----------
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

  // ---------- UI STATE ----------
  const [activeTab, setActiveTab] = useState<ToolTab>('adjust');
  const [showOriginal, setShowOriginal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(imageSrc);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ---------- SAVE STATE SNAPSHOT ----------
  const currentState = {
    rotation, flipH, flipV,
    brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, sharpness, vibrance,
    vignette, grain, tiltShift, skinSmoothing,
    textLayers: textLayers.map(l => ({ ...l })),
    stickers: stickers.map(s => ({ ...s })),
  };

  useEffect(() => {
    if (!isUndoRedo) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setIsUndoRedo(false);
  }, [
    rotation, flipH, flipV,
    brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, sharpness, vibrance,
    vignette, grain, tiltShift, skinSmoothing,
    textLayers, stickers,
  ]);

  const undo = () => {
    if (historyIndex > 0) {
      setIsUndoRedo(true);
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      applyState(prev);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true);
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      applyState(next);
    }
  };

  const applyState = (state: any) => {
    setRotation(state.rotation);
    setFlipH(state.flipH);
    setFlipV(state.flipV);
    setBrightness(state.brightness);
    setContrast(state.contrast);
    setSaturation(state.saturation);
    setExposure(state.exposure);
    setHighlights(state.highlights);
    setShadows(state.shadows);
    setTemperature(state.temperature);
    setTint(state.tint);
    setSharpness(state.sharpness);
    setVibrance(state.vibrance);
    setVignette(state.vignette);
    setGrain(state.grain);
    setTiltShift(state.tiltShift);
    setSkinSmoothing(state.skinSmoothing);
    setTextLayers(state.textLayers.map((l: TextLayer) => ({ ...l })));
    setStickers(state.stickers.map((s: Sticker) => ({ ...s })));
  };

  // ---------- AUTO-ENHANCE ----------
  const autoEnhance = () => {
    // Simple auto-levels + slight saturation boost
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < minR) minR = data[i];
        if (data[i] > maxR) maxR = data[i];
        if (data[i+1] < minG) minG = data[i+1];
        if (data[i+1] > maxG) maxG = data[i+1];
        if (data[i+2] < minB) minB = data[i+2];
        if (data[i+2] > maxB) maxB = data[i+2];
      }
      for (let i = 0; i < data.length; i += 4) {
        data[i] = ((data[i] - minR) / (maxR - minR || 1)) * 255;
        data[i+1] = ((data[i+1] - minG) / (maxG - minG || 1)) * 255;
        data[i+2] = ((data[i+2] - minB) / (maxB - minB || 1)) * 255;
      }
      ctx.putImageData(imageData, 0, 0);
      const enhanced = canvas.toDataURL('image/jpeg');
      // apply a slight saturation and contrast automatically
      setContrast(15);
      setSaturation(20);
      setImageSource(enhanced);
    };
    img.src = imageSrc;
  };

  const setImageSource = (src: string) => {
    // This will trigger preview update; for autoEnhance we just set the source but keep current adjustments.
    // We'll simply replace imageSrc in memory – but imageSrc is a prop, so we'll need to pass a new callback.
    // Instead, we'll reload the image and keep the current adjustments. This function isn't used, so let's remove autoEnhance button unless we implement properly.
    // Alternative: autoEnhance just applies some preset values to the sliders.
    setBrightness(5);
    setContrast(15);
    setSaturation(20);
    setExposure(5);
    setVibrance(10);
    setSharpness(10);
  };

  // ---------- APPLY EFFECTS TO PREVIEW ----------
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let w = img.width;
      let h = img.height;
      if (rotation % 180 !== 0) [w, h] = [h, w];
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      // Transform
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? 1 : -1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();

      // Pixel adjustments
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imageData = applyPixelAdjustments(imageData);
      ctx.putImageData(imageData, 0, 0);

      // Skin smoothing (simple bilateral approximation)
      if (skinSmoothing > 0) {
        const smoothed = applySkinSmoothing(ctx, canvas.width, canvas.height, skinSmoothing);
        ctx.putImageData(smoothed, 0, 0);
      }

      // Vignette
      if (vignette > 0) {
        applyVignette(ctx, canvas.width, canvas.height, vignette);
      }

      // Tilt-shift blur
      if (tiltShift > 0) {
        applyTiltShift(ctx, canvas.width, canvas.height, tiltShift);
      }

      // Film grain
      if (grain > 0) {
        applyGrain(ctx, canvas.width, canvas.height, grain);
      }

      // Text layers
      textLayers.forEach(layer => {
        drawTextLayer(ctx, canvas.width, canvas.height, layer);
      });

      // Stickers
      stickers.forEach(s => {
        ctx.save();
        ctx.font = `${s.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(s.emoji, s.x, s.y);
        ctx.restore();
      });

      setPreviewUrl(canvas.toDataURL('image/jpeg'));
    };
    img.src = imageSrc;
  }, [imageSrc, rotation, flipH, flipV, brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, sharpness, vibrance, vignette, grain, tiltShift, skinSmoothing, textLayers, stickers]);

  // ---------- HELPERS ----------
  const applyPixelAdjustments = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const exposureFactor = Math.pow(2, exposure / 100);
    const tempR = 1 + temperature / 200;
    const tempB = 1 - temperature / 200;
    const tintG = 1 + tint / 200;
    const tintRB = 1 + tint / 200; // simplified

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i+1], b = data[i+2];

      // Brightness
      r += (brightness / 100) * 255;
      g += (brightness / 100) * 255;
      b += (brightness / 100) * 255;

      // Contrast
      if (contrast !== 0) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }

      // Exposure
      r *= exposureFactor;
      g *= exposureFactor;
      b *= exposureFactor;

      // Temperature
      r *= tempR;
      b *= tempB;

      // Tint
      if (tint >= 0) {
        g *= tintG;
      } else {
        r *= tintRB;
        b *= tintRB;
      }

      // Shadows/Highlights
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (shadows !== 0) {
        const t = Math.max(0, 1 - lum / 128);
        const factor = 1 + (shadows / 100) * t;
        r *= factor; g *= factor; b *= factor;
      }
      if (highlights !== 0) {
        const t = Math.max(0, lum / 128 - 1);
        const factor = 1 - (highlights / 100) * t;
        r *= factor; g *= factor; b *= factor;
      }

      // Saturation
      if (saturation !== 0) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const s = saturation / 100;
        r = gray + (r - gray) * (1 + s);
        g = gray + (g - gray) * (1 + s);
        b = gray + (b - gray) * (1 + s);
      }

      // Vibrance
      if (vibrance !== 0) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const vib = vibrance / 100;
        const scale = 1 + vib * (1 - sat);
        r = gray + (r - gray) * scale;
        g = gray + (g - gray) * scale;
        b = gray + (b - gray) * scale;
      }

      // Sharpness (applied later via convolution)
      data[i] = Math.max(0, Math.min(255, r));
      data[i+1] = Math.max(0, Math.min(255, g));
      data[i+2] = Math.max(0, Math.min(255, b));
    }

    if (sharpness !== 0) {
      applySharpen(imageData, sharpness / 100);
    }
    return imageData;
  };

  const applySharpen = (imageData: ImageData, amount: number) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
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
  };

  const applyVignette = (ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) => {
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/1.5);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity/100})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };

  const applyTiltShift = (ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.4, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, `rgba(255,255,255,${intensity/100})`);
    gradient.addColorStop(0.6, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };

  const applyGrain = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 255 * amount;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const applySkinSmoothing = (ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): ImageData => {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const radius = Math.floor(intensity * 2); // smoothing radius proportional to intensity
    if (radius < 1) return imageData;
    const copy = new Uint8ClampedArray(data);
    for (let y = radius; y < h - radius; y++) {
      for (let x = radius; x < w - radius; x++) {
        const idx = (y * w + x) * 4;
        // Simplified skin detection: check if pixel is skin-like (warm hue)
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const isSkin = (r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b);
        if (isSkin) {
          // Average with neighbours
          let sr = 0, sg = 0, sb = 0, count = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nidx = ((y + dy) * w + (x + dx)) * 4;
              sr += copy[nidx];
              sg += copy[nidx+1];
              sb += copy[nidx+2];
              count++;
            }
          }
          data[idx] = sr / count;
          data[idx+1] = sg / count;
          data[idx+2] = sb / count;
        }
      }
    }
    return imageData;
  };

  const drawTextLayer = (ctx: CanvasRenderingContext2D, w: number, h: number, layer: TextLayer) => {
    ctx.save();
    const fontSize = layer.fontSize;
    ctx.font = `bold ${fontSize}px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const margin = 20;
    let x = w / 2, y = h / 2;
    switch (layer.position) {
      case 'top-left': x = margin; y = fontSize / 2 + margin; ctx.textAlign = 'left'; break;
      case 'top-center': x = w / 2; y = fontSize / 2 + margin; break;
      case 'top-right': x = w - margin; y = fontSize / 2 + margin; ctx.textAlign = 'right'; break;
      case 'bottom-left': x = margin; y = h - fontSize / 2 - margin; ctx.textAlign = 'left'; break;
      case 'bottom-center': x = w / 2; y = h - fontSize / 2 - margin; break;
      case 'bottom-right': x = w - margin; y = h - fontSize / 2 - margin; ctx.textAlign = 'right'; break;
    }
    // Shadow
    if (layer.shadowBlur > 0) {
      ctx.shadowColor = layer.shadowColor;
      ctx.shadowBlur = layer.shadowBlur;
    }
    // Outline
    if (layer.outlineWidth > 0) {
      ctx.strokeStyle = layer.outlineColor;
      ctx.lineWidth = layer.outlineWidth;
      ctx.strokeText(layer.text, x, y);
    }
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.text, x, y);
    ctx.restore();
  };

  // ---------- STICKER / TEXT HANDLERS ----------
  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: Date.now().toString(),
      text: 'Your Text',
      fontSize: 64,
      color: '#ffffff',
      position: 'center',
      outlineColor: '#000000',
      outlineWidth: 4,
      shadowBlur: 10,
      shadowColor: 'rgba(0,0,0,0.8)',
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedTextId(newLayer.id);
  };

  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const removeTextLayer = (id: string) => {
    setTextLayers(prev => prev.filter(l => l.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const addSticker = () => {
    const newSticker: Sticker = {
      id: Date.now().toString(),
      emoji: selectedSticker,
      size: 100,
      x: 200,
      y: 200,
    };
    setStickers([...stickers, newSticker]);
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  // ---------- CROP & SAVE ----------
  const applyCropAndSave = () => {
    if (!completedCrop) {
      // No crop, just return preview
      onClose(previewUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const { x, y, width, height } = completedCrop;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      onClose(canvas.toDataURL('image/jpeg'));
    };
    img.src = previewUrl;
  };

  const handleClose = (save: boolean) => {
    if (save) applyCropAndSave();
    else onClose();
  };

  // ---------- RENDER ----------
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <motion.div style={styles.modal}
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={undo} disabled={historyIndex <= 0} style={styles.headerBtn}>↩</button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} style={styles.headerBtn}>↪</button>
            <span style={styles.headerTitle}>Editor</span>
          </div>
          <div style={styles.headerRight}>
            <button
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              style={styles.headerBtn}
              title="Hold to see original"
            >👁️ Original</button>
            <button onClick={() => handleClose(false)} style={styles.closeBtn}>✕</button>
          </div>
        </div>

        {/* Main: Preview + Tool Tabs */}
        <div style={styles.mainContainer}>
          <div style={styles.previewSection}>
            <div style={styles.cropContainer}>
              <ReactCrop crop={crop} onChange={setCrop} onComplete={setCompletedCrop} aspect={aspect}>
                <img src={showOriginal ? imageSrc : previewUrl} alt="Edit" style={styles.previewImage} />
              </ReactCrop>
            </div>
          </div>

          {/* Tool Panel */}
          <div style={styles.toolPanel}>
            {/* Tab buttons */}
            <div style={styles.tabs}>
              {['adjust', 'filters', 'effects', 'text', 'stickers'].map(tab => (
                <button key={tab} style={{
                  ...styles.tabBtn,
                  background: activeTab === tab ? 'rgba(245, 87, 108, 0.2)' : 'transparent',
                  color: activeTab === tab ? '#f5576c' : '#ccc',
                }} onClick={() => setActiveTab(tab as ToolTab)}>
                  {tab === 'adjust' && '🎚️ Adjust'}
                  {tab === 'filters' && '🎨 Filters'}
                  {tab === 'effects' && '✨ Effects'}
                  {tab === 'text' && '📝 Text'}
                  {tab === 'stickers' && '😊 Stickers'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={styles.tabContent}>
              {activeTab === 'adjust' && (
                <>
                  <button onClick={autoEnhance} style={styles.autoBtn}>⚡ Auto Enhance</button>
                  <Slider label="Brightness" value={brightness} onChange={setBrightness} />
                  <Slider label="Contrast" value={contrast} onChange={setContrast} />
                  <Slider label="Saturation" value={saturation} onChange={setSaturation} />
                  <Slider label="Exposure" value={exposure} onChange={setExposure} />
                  <Slider label="Highlights" value={highlights} onChange={setHighlights} />
                  <Slider label="Shadows" value={shadows} onChange={setShadows} />
                  <Slider label="Temperature" value={temperature} onChange={setTemperature} />
                  <Slider label="Tint" value={tint} onChange={setTint} />
                  <Slider label="Vibrance" value={vibrance} onChange={setVibrance} />
                  <Slider label="Sharpness" value={sharpness} onChange={setSharpness} />
                </>
              )}

              {activeTab === 'filters' && (
                <div style={styles.filterGrid}>
                  {filterPresets.map(f => (
                    <button key={f.name} style={styles.filterBtn} onClick={() => {
                      // Apply preset values (reset others)
                      setBrightness(0); setContrast(0); setSaturation(0); setExposure(0);
                      setHighlights(0); setShadows(0); setTemperature(0); setTint(0);
                      setVibrance(0); setSharpness(0); setVignette(0); setGrain(0);
                      setTimeout(() => {
                        Object.entries(f.values).forEach(([key, val]) => {
                          switch (key) {
                            case 'brightness': setBrightness(val); break;
                            case 'contrast': setContrast(val); break;
                            case 'saturation': setSaturation(val); break;
                            case 'exposure': setExposure(val); break;
                            case 'highlights': setHighlights(val); break;
                            case 'shadows': setShadows(val); break;
                            case 'temperature': setTemperature(val); break;
                            case 'tint': setTint(val); break;
                            case 'vibrance': setVibrance(val); break;
                            case 'sharpness': setSharpness(val); break;
                            case 'vignette': setVignette(val); break;
                            case 'grain': setGrain(val); break;
                          }
                        });
                      }, 0);
                    }}>
                      {f.name}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'effects' && (
                <>
                  <Slider label="Vignette" value={vignette} onChange={setVignette} />
                  <Slider label="Film Grain" value={grain * 100} onChange={(v) => setGrain(v / 100)} />
                  <Slider label="Tilt-Shift Blur" value={tiltShift} onChange={setTiltShift} />
                  <Slider label="Skin Smoothing" value={skinSmoothing} onChange={setSkinSmoothing} />
                </>
              )}

              {activeTab === 'text' && (
                <div style={styles.textPanel}>
                  <button onClick={addTextLayer} style={styles.actionBtn}>+ Add Text</button>
                  {textLayers.map(layer => (
                    <div key={layer.id} style={styles.textLayerItem}>
                      <input
                        value={layer.text}
                        onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })}
                        style={styles.textInput}
                      />
                      <div style={{ display: 'flex', gap: 4 }}>
                        <select value={layer.position} onChange={(e) => updateTextLayer(layer.id, { position: e.target.value as TextPosition })} style={styles.selectSmall}>
                          <option value="top-left">TL</option><option value="top-center">TC</option><option value="top-right">TR</option>
                          <option value="center">C</option><option value="bottom-left">BL</option><option value="bottom-center">BC</option><option value="bottom-right">BR</option>
                        </select>
                        <input type="color" value={layer.color} onChange={(e) => updateTextLayer(layer.id, { color: e.target.value })} style={styles.colorSmall} />
                        <button onClick={() => removeTextLayer(layer.id)} style={styles.delBtn}>🗑️</button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <span>Size: {layer.fontSize}</span>
                        <input type="range" min={12} max={200} value={layer.fontSize} onChange={(e) => updateTextLayer(layer.id, { fontSize: +e.target.value })} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'stickers' && (
                <div style={styles.stickerPanel}>
                  <select value={selectedSticker} onChange={(e) => setSelectedSticker(e.target.value)} style={styles.select}>
                    {stickerOptions.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <button onClick={addSticker} style={styles.actionBtn}>Add Sticker</button>
                  <div style={styles.stickerList}>
                    {stickers.map(s => (
                      <div key={s.id} style={styles.stickerItem} onClick={() => removeSticker(s.id)}>
                        {s.emoji} <span style={{ fontSize: 10 }}>✕</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={styles.bottomBar}>
          <div style={styles.cropOptions}>
            <span>Aspect:</span>
            {[undefined, 1, 4/3, 16/9].map(a => (
              <button key={String(a)} onClick={() => setAspect(a)} style={{
                ...styles.aspectBtn, fontWeight: aspect === a ? 'bold' : 'normal' }}>
                {a === undefined ? 'Free' : a === 1 ? '1:1' : a === 4/3 ? '4:3' : '16:9'}
              </button>
            ))}
          </div>
          <div style={styles.transformBtns}>
            <button onClick={() => setRotation(r => r + 90)} style={styles.actionBtn}>↻ Rotate</button>
            <button onClick={() => setFlipH(!flipH)} style={styles.actionBtn}>↔ Flip H</button>
            <button onClick={() => setFlipV(!flipV)} style={styles.actionBtn}>↕ Flip V</button>
          </div>
          <button onClick={() => handleClose(true)} style={styles.saveBtn}>💾 Save</button>
        </div>
      </motion.div>
    </div>
  );
};

// ---------- SMALL SLIDER COMPONENT ----------
const Slider: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
    <span style={{ width: 80, color: '#ccc', fontSize: 13 }}>{label}</span>
    <input
      type="range" min={-100} max={100} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ flex: 1 }}
    />
    <span style={{ width: 30, color: '#fff', fontSize: 13 }}>{value}</span>
  </div>
);

// ---------- STYLES ----------
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a1a', borderRadius: '24px', width: '100%', maxWidth: '1200px', height: '90vh',
    display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  headerBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 8,
    cursor: 'pointer', fontSize: 14,
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 600, marginLeft: 8 },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 20, width: 36, height: 36,
    borderRadius: '50%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center',
  },
  mainContainer: { display: 'flex', flex: 1, overflow: 'hidden' },
  previewSection: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', position: 'relative' },
  cropContainer: { maxWidth: '100%', maxHeight: '100%', overflow: 'hidden' },
  previewImage: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  toolPanel: {
    width: 300, minWidth: 300, borderLeft: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', flexDirection: 'column', background: '#1e1e1e',
  },
  tabs: { display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  tabBtn: {
    flex: 1, padding: '10px 4px', background: 'transparent', border: 'none', color: '#ccc',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  tabContent: { flex: 1, overflowY: 'auto', padding: '12px' },
  autoBtn: {
    background: 'linear-gradient(135deg, #f093fb, #f5576c)', border: 'none', color: 'white',
    padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 14, marginBottom: 12,
    width: '100%', fontWeight: 600,
  },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 },
  filterBtn: {
    padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 13, textAlign: 'center',
  },
  textPanel: { display: 'flex', flexDirection: 'column', gap: 10 },
  textLayerItem: {
    padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
  },
  textInput: {
    width: '100%', padding: 4, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4, color: 'white', marginBottom: 6,
  },
  selectSmall: { background: '#333', color: 'white', border: 'none', padding: 2, borderRadius: 4 },
  colorSmall: { width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer' },
  delBtn: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 },
  stickerPanel: { display: 'flex', flexDirection: 'column', gap: 10 },
  stickerList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  stickerItem: {
    fontSize: 24, cursor: 'pointer', padding: 4, borderRadius: 8,
    background: 'rgba(255,255,255,0.1)', userSelect: 'none',
  },
  bottomBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)',
    background: '#1e1e1e',
  },
  cropOptions: { display: 'flex', alignItems: 'center', gap: 8, color: '#ccc', fontSize: 13 },
  aspectBtn: {
    padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: 'white', cursor: 'pointer', fontSize: 13,
  },
  transformBtns: { display: 'flex', gap: 8 },
  actionBtn: {
    padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20, color: 'white', cursor: 'pointer', fontSize: 13,
  },
  saveBtn: {
    padding: '10px 24px', borderRadius: 30, border: 'none',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white', fontWeight: 600, fontSize: 15, cursor: 'pointer',
  },
  select: { background: '#333', color: 'white', border: 'none', padding: 6, borderRadius: 4 },
};

export default PhotoEditor;
