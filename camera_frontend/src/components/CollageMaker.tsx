import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CollageMakerProps {
  isOpen: boolean;
  onClose: () => void;
  initialImages?: string[]; // images from burst or recent captures
}

const CollageMaker: React.FC<CollageMakerProps> = ({ isOpen, onClose, initialImages = [] }) => {
  const [images, setImages] = useState<string[]>(initialImages);
  const [layout, setLayout] = useState<'2x2' | '3x3' | '4x4' | '2x3' | '3x2'>('2x2');
  const [spacing, setSpacing] = useState<number>(10);
  const [bgColor, setBgColor] = useState<string>('#000000');
  const [collageUrl, setCollageUrl] = useState<string | null>(null);

  // Load images from localStorage gallery if none passed
  useEffect(() => {
    if (isOpen && initialImages.length === 0) {
      const stored = localStorage.getItem('adwashield_photos');
      if (stored) {
        try {
          const photos = JSON.parse(stored);
          const urls = photos.map((p: any) => p.dataURL).slice(0, 16); // limit
          setImages(urls);
        } catch (e) {
          setImages([]);
        }
      }
    }
  }, [isOpen, initialImages]);

  const generateCollage = () => {
    if (images.length === 0) return;
    // Determine grid dimensions
    let cols = 2,
      rows = 2;
    switch (layout) {
      case '2x2':
        cols = 2;
        rows = 2;
        break;
      case '3x3':
        cols = 3;
        rows = 3;
        break;
      case '4x4':
        cols = 4;
        rows = 4;
        break;
      case '2x3':
        cols = 3;
        rows = 2;
        break;
      case '3x2':
        cols = 2;
        rows = 3;
        break;
    }
    const totalCells = cols * rows;
    const selected = images.slice(0, totalCells);
    if (selected.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = 200; // base size per cell
    const spacingPx = spacing;
    const canvasWidth = cols * cellSize + (cols + 1) * spacingPx;
    const canvasHeight = rows * cellSize + (rows + 1) * spacingPx;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Load images and draw
    let loaded = 0;
    selected.forEach((url, index) => {
      const img = new Image();
      img.onload = () => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = spacingPx + col * (cellSize + spacingPx);
        const y = spacingPx + row * (cellSize + spacingPx);
        // Draw image to fit cell, preserving aspect ratio (cover)
        const imgRatio = img.width / img.height;
        const cellRatio = cellSize / cellSize;
        let drawW = cellSize,
          drawH = cellSize;
        if (imgRatio > cellRatio) {
          drawH = cellSize;
          drawW = cellSize * imgRatio;
        } else {
          drawW = cellSize;
          drawH = cellSize / imgRatio;
        }
        const offsetX = (cellSize - drawW) / 2;
        const offsetY = (cellSize - drawH) / 2;
        ctx.drawImage(img, x + offsetX, y + offsetY, drawW, drawH);
        loaded++;
        if (loaded === selected.length) {
          setCollageUrl(canvas.toDataURL('image/jpeg'));
        }
      };
      img.src = url;
    });
  };

  const downloadCollage = () => {
    if (!collageUrl) return;
    const link = document.createElement('a');
    link.href = collageUrl;
    link.download = `collage-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div style={styles.header}>
          <h2 style={styles.title}>🖼️ Collage Maker</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.controls}>
            <div style={styles.row}>
              <label>Layout:</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as any)}
                style={styles.select}
              >
                <option value="2x2">2x2</option>
                <option value="3x3">3x3</option>
                <option value="4x4">4x4</option>
                <option value="2x3">2x3</option>
                <option value="3x2">3x2</option>
              </select>
            </div>
            <div style={styles.row}>
              <label>Spacing: {spacing}px</label>
              <input
                type="range"
                min="0"
                max="30"
                value={spacing}
                onChange={(e) => setSpacing(Number(e.target.value))}
                style={styles.range}
              />
            </div>
            <div style={styles.row}>
              <label>Background:</label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={styles.colorPicker}
              />
            </div>
            <button onClick={generateCollage} style={styles.generateBtn}>
              🎨 Generate Collage
            </button>
          </div>

          {collageUrl && (
            <div style={styles.preview}>
              <img src={collageUrl} alt="Collage" style={styles.previewImage} />
              <button onClick={downloadCollage} style={styles.downloadBtn}>
                ⬇ Download Collage
              </button>
            </div>
          )}
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
    zIndex: 1400,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '24px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
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
    padding: '0 8px',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'white',
    flexWrap: 'wrap',
  },
  select: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '14px',
  },
  range: {
    flex: 1,
    accentColor: '#f5576c',
  },
  colorPicker: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    background: 'transparent',
  },
  generateBtn: {
    padding: '10px 24px',
    borderRadius: '30px',
    border: 'none',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    marginTop: '10px',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  downloadBtn: {
    padding: '8px 24px',
    borderRadius: '30px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
  },
};

export default CollageMaker;
