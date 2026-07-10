import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface PhotoEditorProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: (editedImage?: string) => void;
}

type TextPosition = 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';

const PhotoEditor: React.FC<PhotoEditorProps> = ({ imageSrc, isOpen, onClose }) => {
  // Crop
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);

  // Transform
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Basic adjustments (already existed)
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);

  // New adjustments
  const [exposure, setExposure] = useState<number>(0);
  const [highlights, setHighlights] = useState<number>(0);
  const [shadows, setShadows] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(0);
  const [tint, setTint] = useState<number>(0);
  const [sharpness, setSharpness] = useState<number>(0);
  const [vibrance, setVibrance] = useState<number>(0);

  // Text overlay
  const [textOverlay, setTextOverlay] = useState<{ text: string; fontSize: number; color: string; position: TextPosition }>({
    text: '',
    fontSize: 48,
    color: '#ffffff',
    position: 'center',
  });

  // Stickers
  const [stickers, setStickers] = useState<{ emoji: string; size: number; x: number; y: number }[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string>('😊');

  // Preview URL
  const [previewUrl, setPreviewUrl] = useState<string>(imageSrc);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Apply all adjustments and overlays → preview
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle rotation swap
      let w = img.width;
      let h = img.height;
      if (rotation % 180 !== 0) [w, h] = [h, w];
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      // Apply transform (rotation + flip)
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? 1 : -1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();

      // Get image data for pixel adjustments
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Expose multipliers
      const exposureFactor = Math.pow(2, exposure / 100);
      const tempFactorR = 1 + temperature / 200;
      const tempFactorB = 1 - temperature / 200;
      const tintFactorG = 1 + tint / 200;
      const tintFactorRB = 1 - tint / 200;  // for negative tint (magenta)

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        let br = brightness / 100;
        r += br * 255;
        g += br * 255;
        b += br * 255;

        // Contrast
        let ct = contrast / 100;
        if (ct !== 0) {
          const factor = (259 * (ct + 255)) / (255 * (259 - ct));
          r = factor * (r - 128) + 128;
          g = factor * (g - 128) + 128;
          b = factor * (b - 128) + 128;
        }

        // Exposure (multiplicative)
        r *= exposureFactor;
        g *= exposureFactor;
        b *= exposureFactor;

        // Temperature
        r *= tempFactorR;
        b *= tempFactorB;

        // Tint
        if (tint >= 0) {
          g *= tintFactorG;
        } else {
          r *= tintFactorRB;
          b *= tintFactorRB;
        }

        // Shadows / Highlights (simple luminance‑based)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (shadows !== 0) {
          // brighten dark areas
          const shadowAmount = shadows / 100;
          const t = Math.min(1, Math.max(0, 1 - lum / 128));
          const factor = 1 + shadowAmount * t;
          r *= factor;
          g *= factor;
          b *= factor;
        }
        if (highlights !== 0) {
          // darken bright areas
          const highlightAmount = highlights / 100;
          const t = Math.min(1, Math.max(0, lum / 128 - 1));
          const factor = 1 - highlightAmount * t;
          r *= factor;
          g *= factor;
          b *= factor;
        }

        // Saturation (original method)
        if (saturation !== 0) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const s = saturation / 100;
          r = gray + (r - gray) * (1 + s);
          g = gray + (g - gray) * (1 + s);
          b = gray + (b - gray) * (1 + s);
        }

        // Vibrance (boosts low‑saturation colours more)
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

        // Clamp values
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }
      ctx.putImageData(imageData, 0, 0);

      // Sharpness (convolution after pixel adjustments)
      if (sharpness !== 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
          const sharpImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
          applySharpen(sharpImageData, sharpness / 100);
          ctx.putImageData(sharpImageData, 0, 0);
        }
      }

      // Draw text overlay
      if (textOverlay.text) {
        ctx.save();
        const fontSize = textOverlay.fontSize;
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = textOverlay.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const margin = 20;
        let x = canvas.width / 2;
        let y = canvas.height / 2;
        switch (textOverlay.position) {
          case 'top-left': x = margin; y = fontSize / 2 + margin; ctx.textAlign = 'left'; break;
          case 'top-center': x = canvas.width / 2; y = fontSize / 2 + margin; break;
          case 'top-right': x = canvas.width - margin; y = fontSize / 2 + margin; ctx.textAlign = 'right'; break;
          case 'bottom-left': x = margin; y = canvas.height - fontSize / 2 - margin; ctx.textAlign = 'left'; break;
          case 'bottom-center': x = canvas.width / 2; y = canvas.height - fontSize / 2 - margin; break;
          case 'bottom-right': x = canvas.width - margin; y = canvas.height - fontSize / 2 - margin; ctx.textAlign = 'right'; break;
          default: break; // center
        }
        ctx.fillText(textOverlay.text, x, y);
        ctx.restore();
      }

      // Draw stickers
      stickers.forEach(sticker => {
        ctx.save();
        ctx.font = `${sticker.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(sticker.emoji, sticker.x, sticker.y);
        ctx.restore();
      });

      setPreviewUrl(canvas.toDataURL('image/jpeg'));
    };
    img.src = imageSrc;
  }, [imageSrc, rotation, flipH, flipV, brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, sharpness, vibrance, textOverlay, stickers]);

  // Simple sharpen kernel
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
          data[idx] = Math.min(255, Math.max(0, copy[idx] + amount * (val - copy[idx])));
        }
      }
    }
  };

  // Crop & save
  const applyCrop = () => {
    if (!completedCrop) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { x, y, width, height } = completedCrop;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      onClose(canvas.toDataURL('image/jpeg'));
    };
    img.src = previewUrl;
  };

  const handleClose = (save: boolean) => {
    if (save && completedCrop) {
      applyCrop();
    } else {
      onClose();
    }
  };

  // Filter presets
  const presets: { name: string; values: Partial<typeof initialState> }[] = [
    { name: 'Original', values: { brightness: 0, contrast: 0, saturation: 0, exposure: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, sharpness: 0, vibrance: 0 } },
    { name: 'Vivid', values: { saturation: 30, vibrance: 40, contrast: 10 } },
    { name: 'Warm', values: { temperature: 40, tint: 10 } },
    { name: 'Cool', values: { temperature: -40, tint: -10 } },
    { name: 'Dramatic', values: { contrast: 40, highlights: -20, shadows: -20, sharpness: 30, vibrance: 20 } },
    { name: 'B&W', values: { saturation: -100 } },
  ];

  const initialState = {
    brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, sharpness, vibrance,
  };

  const applyPreset = (preset: typeof presets[0]) => {
    // Reset all to zero
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setExposure(0);
    setHighlights(0);
    setShadows(0);
    setTemperature(0);
    setTint(0);
    setSharpness(0);
    setVibrance(0);
    // Then apply preset values (with a tiny delay to ensure state updates are batched)
    setTimeout(() => {
      if (preset.values.brightness !== undefined) setBrightness(preset.values.brightness);
      if (preset.values.contrast !== undefined) setContrast(preset.values.contrast);
      if (preset.values.saturation !== undefined) setSaturation(preset.values.saturation);
      if (preset.values.exposure !== undefined) setExposure(preset.values.exposure);
      if (preset.values.highlights !== undefined) setHighlights(preset.values.highlights);
      if (preset.values.shadows !== undefined) setShadows(preset.values.shadows);
      if (preset.values.temperature !== undefined) setTemperature(preset.values.temperature);
      if (preset.values.tint !== undefined) setTint(preset.values.tint);
      if (preset.values.sharpness !== undefined) setSharpness(preset.values.sharpness);
      if (preset.values.vibrance !== undefined) setVibrance(preset.values.vibrance);
    }, 0);
  };

  // Sticker handling
  const addSticker = () => {
    // Place sticker at center of image (natural size)
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const x = img.width / 2;
      const y = img.height / 2;
      const size = Math.min(img.width, img.height) * 0.15; // 15% of smallest dimension
      setStickers(prev => [...prev, { emoji: selectedSticker, x, y, size }]);
    };
  };

  const removeAllStickers = () => setStickers([]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <motion.div
        style={styles.modal}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>✏️ Photo Editor</h2>
          <button onClick={() => handleClose(false)} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          {/* Crop area */}
          <div style={styles.cropContainer}>
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              <img src={previewUrl} alt="Edit preview" style={styles.previewImage} />
            </ReactCrop>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            {/* Filter presets */}
            <div style={styles.section}>
              <label style={styles.sectionTitle}>Filters</label>
              <div style={styles.presetGroup}>
                {presets.map(p => (
                  <button key={p.name} onClick={() => applyPreset(p)} style={styles.presetBtn}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect ratio */}
            <div style={styles.section}>
              <label style={styles.sectionTitle}>Crop Aspect</label>
              <div style={styles.aspectGroup}>
                <button onClick={() => setAspect(undefined)} style={{ ...styles.aspectBtn, fontWeight: aspect === undefined ? 'bold' : 'normal' }}>Free</button>
                <button onClick={() => setAspect(1)} style={{ ...styles.aspectBtn, fontWeight: aspect === 1 ? 'bold' : 'normal' }}>1:1</button>
                <button onClick={() => setAspect(4 / 3)} style={{ ...styles.aspectBtn, fontWeight: aspect === 4 / 3 ? 'bold' : 'normal' }}>4:3</button>
                <button onClick={() => setAspect(16 / 9)} style={{ ...styles.aspectBtn, fontWeight: aspect === 16 / 9 ? 'bold' : 'normal' }}>16:9</button>
              </div>
            </div>

            {/* Adjustment sliders */}
            <div style={styles.slidersContainer}>
              {[
                { label: 'Brightness', value: brightness, setter: setBrightness },
                { label: 'Contrast', value: contrast, setter: setContrast },
                { label: 'Saturation', value: saturation, setter: setSaturation },
                { label: 'Exposure', value: exposure, setter: setExposure },
                { label: 'Highlights', value: highlights, setter: setHighlights },
                { label: 'Shadows', value: shadows, setter: setShadows },
                { label: 'Temperature', value: temperature, setter: setTemperature },
                { label: 'Tint', value: tint, setter: setTint },
                { label: 'Vibrance', value: vibrance, setter: setVibrance },
                { label: 'Sharpness', value: sharpness, setter: setSharpness },
              ].map(slider => (
                <div key={slider.label} style={styles.sliderGroup}>
                  <label>{slider.label}: {slider.value}</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={slider.value}
                    onChange={(e) => slider.setter(Number(e.target.value))}
                  />
                </div>
              ))}
            </div>

            {/* Transform buttons */}
            <div style={styles.buttonGroup}>
              <button onClick={() => setRotation(r => r + 90)} style={styles.actionBtn}>↻ Rotate 90°</button>
              <button onClick={() => setFlipH(!flipH)} style={styles.actionBtn}>↔ Flip H</button>
              <button onClick={() => setFlipV(!flipV)} style={styles.actionBtn}>↕ Flip V</button>
              <button
                onClick={() => {
                  setRotation(0); setFlipH(false); setFlipV(false);
                  setBrightness(0); setContrast(0); setSaturation(0);
                  setExposure(0); setHighlights(0); setShadows(0);
                  setTemperature(0); setTint(0); setVibrance(0); setSharpness(0);
                  setTextOverlay({ text: '', fontSize: 48, color: '#ffffff', position: 'center' });
                  setStickers([]);
                }}
                style={styles.actionBtn}
              >
                ⟲ Reset All
              </button>
            </div>

            {/* Text overlay */}
            <div style={styles.section}>
              <label style={styles.sectionTitle}>Text Overlay</label>
              <div style={styles.textControls}>
                <input
                  type="text"
                  placeholder="Enter text..."
                  value={textOverlay.text}
                  onChange={(e) => setTextOverlay(prev => ({ ...prev, text: e.target.value }))}
                  style={styles.textInput}
                />
                <select
                  value={textOverlay.position}
                  onChange={(e) => setTextOverlay(prev => ({ ...prev, position: e.target.value as TextPosition }))}
                  style={styles.select}
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="center">Center</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
                <input
                  type="color"
                  value={textOverlay.color}
                  onChange={(e) => setTextOverlay(prev => ({ ...prev, color: e.target.value }))}
                  style={styles.colorPicker}
                />
                <input
                  type="number"
                  min={12}
                  max={200}
                  value={textOverlay.fontSize}
                  onChange={(e) => setTextOverlay(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                  style={styles.numberInput}
                />
              </div>
            </div>

            {/* Stickers */}
            <div style={styles.section}>
              <label style={styles.sectionTitle}>Stickers</label>
              <div style={styles.stickerControls}>
                <select value={selectedSticker} onChange={(e) => setSelectedSticker(e.target.value)} style={styles.select}>
                  {['😊', '😂', '❤️', '👍', '🎉', '🌟', '🔥', '💡', '🐶', '🐱'].map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                <button onClick={addSticker} style={styles.actionBtn}>Add Sticker</button>
                <button onClick={removeAllStickers} style={styles.actionBtn}>Remove All</button>
              </div>
              {stickers.length > 0 && (
                <div style={styles.stickerList}>
                  {stickers.map((s, i) => (
                    <span key={i} style={styles.stickerChip} onClick={() => setStickers(prev => prev.filter((_, idx) => idx !== i))}>
                      {s.emoji} ✕
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <button onClick={() => handleClose(true)} style={styles.saveBtn}>💾 Apply Crop & Save</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1200,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '24px',
    padding: '24px',
    maxWidth: '1000px',
    width: '100%',
    maxHeight: '95vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: { color: 'white', margin: 0, fontSize: '24px', fontWeight: '600' },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '24px',
    cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    flex: 1,
    paddingRight: '8px',
  },
  cropContainer: {
    display: 'flex',
    justifyContent: 'center',
    maxHeight: '40vh',
    overflow: 'hidden',
    background: '#000',
    borderRadius: '12px',
  },
  previewImage: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  controls: { display: 'flex', flexDirection: 'column', gap: '16px' },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  sectionTitle: { color: '#fff', fontWeight: '600', fontSize: '14px', marginBottom: '4px' },
  presetGroup: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  presetBtn: {
    padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '13px',
  },
  aspectGroup: { display: 'flex', gap: '8px' },
  aspectBtn: {
    padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '13px',
  },
  slidersContainer: { display: 'flex', flexDirection: 'column', gap: '8px' },
  sliderGroup: {
    display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', gap: '8px',
    color: 'white', fontSize: '13px',
  },
  buttonGroup: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  actionBtn: {
    padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '13px',
    transition: 'background 0.2s',
  },
  textControls: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  textInput: {
    padding: '6px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', minWidth: '150px',
  },
  select: {
    padding: '6px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px',
  },
  colorPicker: { width: '36px', height: '36px', padding: '2px', borderRadius: '50%', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' },
  numberInput: {
    padding: '6px 10px', width: '70px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px',
  },
  stickerControls: { display: 'flex', gap: '8px', alignItems: 'center' },
  stickerList: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' },
  stickerChip: {
    padding: '4px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white',
    cursor: 'pointer', fontSize: '16px',
  },
  saveBtn: {
    padding: '12px 24px', borderRadius: '30px', border: 'none',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white', fontWeight: '600', fontSize: '16px', cursor: 'pointer', marginTop: '8px',
  },
};

export default PhotoEditor;
