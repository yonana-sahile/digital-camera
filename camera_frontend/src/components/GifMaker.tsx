import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import GIF from 'gif.js';

interface GifMakerProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
}

const GifMaker: React.FC<GifMakerProps> = ({ images, isOpen, onClose }) => {
  // Frame management
  const [frames, setFrames] = useState<string[]>([]);
  useEffect(() => {
    setFrames(images); // sync incoming images
  }, [images]);

  // Options
  const [delay, setDelay] = useState<number>(200);
  const [quality, setQuality] = useState<number>(10);
  const [maxWidth, setMaxWidth] = useState<number>(0); // 0 = original
  const [maxHeight, setMaxHeight] = useState<number>(0);
  const [loopCount, setLoopCount] = useState<number>(0); // 0 = infinite
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  // Delay presets
  const delayPresets = [
    { label: 'Fast', value: 100 },
    { label: 'Normal', value: 200 },
    { label: 'Slow', value: 400 },
    { label: 'Custom', value: -1 },
  ];

  // Quality presets
  const qualityPresets = [
    { label: 'Low', value: 20 },
    { label: 'Medium', value: 10 },
    { label: 'High', value: 5 },
    { label: 'Best', value: 1 },
  ];

  // Resolution presets
  const resolutionPresets = [
    { label: 'Original', width: 0, height: 0 },
    { label: '480p', width: 854, height: 480 },
    { label: '720p', width: 1280, height: 720 },
    { label: '1080p', width: 1920, height: 1080 },
  ];

  // Remove frame
  const removeFrame = (index: number) => {
    setFrames(prev => prev.filter((_, i) => i !== index));
  };

  // Generate GIF
  const generateGif = async () => {
    if (frames.length < 2) {
      alert('Need at least 2 frames to create a GIF.');
      return;
    }
    setIsGenerating(true);
    setGifUrl(null);

    // Load all frames
    const loadedImages = await Promise.all(
      frames.map(dataUrl => new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = dataUrl;
      }))
    );

    // Determine output size
    let outputWidth = maxWidth;
    let outputHeight = maxHeight;
    if (outputWidth === 0 || outputHeight === 0) {
      // Use max of all frames
      outputWidth = Math.max(...loadedImages.map(img => img.width));
      outputHeight = Math.max(...loadedImages.map(img => img.height));
    }

    const gif = new GIF({
      workers: 2,
      quality: quality,
      width: outputWidth,
      height: outputHeight,
      workerScript: '/gif.worker.js', // ensure worker is properly located
    });

    loadedImages.forEach(img => {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Center and scale image to fit
      const scale = Math.min(outputWidth / img.width, outputHeight / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (outputWidth - sw) / 2;
      const sy = (outputHeight - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);
      gif.addFrame(ctx, { copy: true, delay: delay });
    });

    gif.on('finished', (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      setIsGenerating(false);
    });

    gif.render();
  };

  const downloadGif = () => {
    if (!gifUrl) return;
    const link = document.createElement('a');
    link.href = gifUrl;
    link.download = `animated-${Date.now()}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setResolutionPreset = (preset: typeof resolutionPresets[0]) => {
    setMaxWidth(preset.width);
    setMaxHeight(preset.height);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <motion.div
        style={styles.modal}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🎞️ GIF Maker</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          {/* Frame selection */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>Frames ({frames.length})</span>
              <span style={styles.hint}>Click a frame to remove</span>
            </div>
            <div style={styles.frameGrid}>
              {frames.map((frame, idx) => (
                <div key={idx} style={styles.frameItem} onClick={() => removeFrame(idx)}>
                  <img src={frame} alt={`Frame ${idx+1}`} style={styles.frameThumb} />
                  <div style={styles.removeOverlay}>✕</div>
                </div>
              ))}
            </div>
            <div style={styles.frameControls}>
              <button
                onClick={() => setFrames(images)}
                style={styles.smallBtn}
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Options */}
          <div style={styles.optionsGrid}>
            <div style={styles.optionGroup}>
              <label style={styles.optionLabel}>Delay</label>
              <div style={styles.presetGroup}>
                {delayPresets.map(preset => (
                  <button
                    key={preset.label}
                    style={{
                      ...styles.presetBtn,
                      background: (preset.value === -1 ? delay !== 100 && delay !== 200 && delay !== 400 : delay === preset.value)
                        ? 'rgba(245, 87, 108, 0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: (preset.value === -1 ? delay !== 100 && delay !== 200 && delay !== 400 : delay === preset.value)
                        ? '#f5576c' : 'rgba(255,255,255,0.1)',
                    }}
                    onClick={() => {
                      if (preset.value !== -1) setDelay(preset.value);
                    }}
                  >
                    {preset.label}{preset.value > 0 ? ` (${preset.value}ms)` : ''}
                  </button>
                ))}
                <input
                  type="number"
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  min={50}
                  max={1000}
                  step={50}
                  style={styles.numberInput}
                  placeholder="ms"
                />
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.optionLabel}>Quality</label>
              <div style={styles.presetGroup}>
                {qualityPresets.map(preset => (
                  <button
                    key={preset.label}
                    style={{
                      ...styles.presetBtn,
                      background: quality === preset.value ? 'rgba(245, 87, 108, 0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: quality === preset.value ? '#f5576c' : 'rgba(255,255,255,0.1)',
                    }}
                    onClick={() => setQuality(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.optionLabel}>Resolution</label>
              <div style={styles.presetGroup}>
                {resolutionPresets.map(preset => (
                  <button
                    key={preset.label}
                    style={{
                      ...styles.presetBtn,
                      background: (maxWidth === preset.width && maxHeight === preset.height)
                        ? 'rgba(245, 87, 108, 0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: (maxWidth === preset.width && maxHeight === preset.height)
                        ? '#f5576c' : 'rgba(255,255,255,0.1)',
                    }}
                    onClick={() => setResolutionPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.optionLabel}>Loop</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={loopCount}
                  onChange={(e) => setLoopCount(Math.max(0, Number(e.target.value)))}
                  min={0}
                  style={styles.numberInput}
                />
                <span style={{ color: '#ccc', fontSize: 13 }}>
                  {loopCount === 0 ? 'Infinite' : `${loopCount} time${loopCount>1?'s':''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateGif}
            disabled={isGenerating || frames.length < 2}
            style={{
              ...styles.generateBtn,
              opacity: (isGenerating || frames.length < 2) ? 0.6 : 1,
            }}
          >
            {isGenerating ? 'Generating...' : '⚡ Generate GIF'}
          </button>

          {/* Preview */}
          <AnimatePresence>
            {gifUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.preview}
              >
                <img src={gifUrl} alt="Generated GIF" style={styles.gifImage} />
                <button onClick={downloadGif} style={styles.downloadBtn}>
                  ⬇ Download GIF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// --- Styles ---
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
    zIndex: 1100,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '24px',
    padding: '24px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '95vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    color: 'white',
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    marginBottom: '10px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  sectionTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
  },
  hint: {
    color: '#666',
    fontSize: '12px',
  },
  frameGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px',
  },
  frameItem: {
    width: '80px',
    height: '80px',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'transform 0.1s',
  },
  frameThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    fontSize: '20px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  frameControls: {
    display: 'flex',
    gap: '8px',
  },
  smallBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '4px 12px',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: '12px',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  optionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  optionLabel: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
  },
  presetGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  presetBtn: {
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  numberInput: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '4px 8px',
    color: 'white',
    fontSize: '13px',
    width: '70px',
  },
  generateBtn: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    border: 'none',
    borderRadius: '30px',
    padding: '12px 24px',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    width: '100%',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  gifImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  downloadBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '30px',
    padding: '10px 24px',
    color: 'white',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};

export default GifMaker;
