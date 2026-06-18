import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GIF from 'gif.js';

interface GifMakerProps {
  images: string[];          // array of data URLs
  isOpen: boolean;
  onClose: () => void;
}

const GifMaker: React.FC<GifMakerProps> = ({ images, isOpen, onClose }) => {
  const [delay, setDelay] = useState<number>(200); // ms per frame
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  const generateGif = async () => {
    if (images.length < 2) {
      alert('Need at least 2 images for a GIF.');
      return;
    }
    setIsGenerating(true);
    setGifUrl(null);

    // Load all images into canvas
    const loadedImages = await Promise.all(
      images.map((dataUrl) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = dataUrl;
        });
      })
    );

    // Find max dimensions
    const maxWidth = Math.max(...loadedImages.map((img) => img.width));
    const maxHeight = Math.max(...loadedImages.map((img) => img.height));

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: maxWidth,
      height: maxHeight,
    });

    loadedImages.forEach((img) => {
      // Draw onto a canvas to get ImageData
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Center the image
      const x = (maxWidth - img.width) / 2;
      const y = (maxHeight - img.height) / 2;
      ctx.drawImage(img, x, y, img.width, img.height);
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
          <h2 style={styles.title}>🎞️ GIF Maker</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          <p style={styles.info}>
            {images.length} images loaded. Set delay per frame and generate.
          </p>
          <div style={styles.controls}>
            <label style={styles.label}>
              Delay (ms):
              <input
                type="number"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                min={50}
                max={1000}
                step={50}
                style={styles.input}
              />
            </label>
            <button
              onClick={generateGif}
              disabled={isGenerating}
              style={styles.generateBtn}
            >
              {isGenerating ? 'Generating...' : '⚡ Generate GIF'}
            </button>
          </div>

          {gifUrl && (
            <div style={styles.preview}>
              <img src={gifUrl} alt="Generated GIF" style={styles.gifImage} />
              <button onClick={downloadGif} style={styles.downloadBtn}>
                ⬇ Download GIF
              </button>
            </div>
          )}
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
    maxWidth: '600px',
    width: '100%',
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
  info: {
    color: '#aaa',
    fontSize: '14px',
    margin: 0,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  label: {
    color: 'white',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  input: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '6px 12px',
    color: 'white',
    fontSize: '14px',
    width: '80px',
  },
  generateBtn: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    border: 'none',
    borderRadius: '30px',
    padding: '10px 24px',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    marginTop: '10px',
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
    padding: '8px 24px',
    color: 'white',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};

export default GifMaker;
