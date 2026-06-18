import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface PhotoEditorProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: (editedImage?: string) => void; // passes edited image back if saved
}

const PhotoEditor: React.FC<PhotoEditorProps> = ({ imageSrc, isOpen, onClose }) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(0); // -100 to 100
  const [contrast, setContrast] = useState<number>(0); // -100 to 100
  const [saturation, setSaturation] = useState<number>(0); // -100 to 100
  const [previewUrl, setPreviewUrl] = useState<string>(imageSrc);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Apply adjustments and render preview
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Apply rotation
      let w = img.width;
      let h = img.height;
      if (rotation % 180 !== 0) {
        [w, h] = [h, w];
      }
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      // Translate to center, rotate, then draw
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      // Flip
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);

      // Apply brightness/contrast/saturation (using canvas filters)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const b = brightness / 100; // -1 to 1
      const c = contrast / 100;   // -1 to 1
      const s = saturation / 100; // -1 to 1
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b2 = data[i + 2];
        // Contrast
        if (c !== 0) {
          const factor = (259 * (c + 255)) / (255 * (259 - c));
          r = factor * (r - 128) + 128;
          g = factor * (g - 128) + 128;
          b2 = factor * (b2 - 128) + 128;
        }
        // Brightness
        if (b !== 0) {
          r += b * 255;
          g += b * 255;
          b2 += b * 255;
        }
        // Saturation (simple)
        if (s !== 0) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b2;
          r = gray + (r - gray) * (1 + s);
          g = gray + (g - gray) * (1 + s);
          b2 = gray + (b2 - gray) * (1 + s);
        }
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b2));
      }
      ctx.putImageData(imageData, 0, 0);
      setPreviewUrl(canvas.toDataURL('image/jpeg'));
    };
    img.src = imageSrc;
  }, [imageSrc, rotation, flipH, flipV, brightness, contrast, saturation]);

  // Apply crop
  const applyCrop = () => {
    if (!completedCrop) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pixelCrop = completedCrop;
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      ctx.drawImage(
        img,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      // Also apply any existing adjustments? We'll re‑apply them after crop.
      // But we can simply use the previewUrl which already has adjustments.
      // Actually we can crop the adjusted image (previewUrl).
      // We'll do that: load previewUrl, crop.
      const cropped = canvas.toDataURL('image/jpeg');
      // Close and return cropped image
      onClose(cropped);
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
          <div style={styles.cropContainer}>
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={undefined}
            >
              <img src={previewUrl} alt="Edit preview" style={styles.previewImage} />
            </ReactCrop>
          </div>

          <div style={styles.controls}>
            <div style={styles.sliderGroup}>
              <label>Brightness: {brightness}</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
              />
            </div>
            <div style={styles.sliderGroup}>
              <label>Contrast: {contrast}</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
              />
            </div>
            <div style={styles.sliderGroup}>
              <label>Saturation: {saturation}</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
              />
            </div>
            <div style={styles.buttonGroup}>
              <button onClick={() => setRotation((r) => r + 90)} style={styles.actionBtn}>↻ Rotate 90°</button>
              <button onClick={() => setFlipH(!flipH)} style={styles.actionBtn}>↔ Flip H</button>
              <button onClick={() => setFlipV(!flipV)} style={styles.actionBtn}>↕ Flip V</button>
              <button onClick={() => { setRotation(0); setFlipH(false); setFlipV(false); setBrightness(0); setContrast(0); setSaturation(0); }} style={styles.actionBtn}>⟲ Reset</button>
            </div>
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
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
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
    overflowY: 'auto',
    flex: 1,
  },
  cropContainer: {
    display: 'flex',
    justifyContent: 'center',
    maxHeight: '50vh',
    overflow: 'hidden',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '10px 0',
  },
  sliderGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'white',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
  saveBtn: {
    padding: '10px 24px',
    borderRadius: '30px',
    border: 'none',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px',
  },
};

export default PhotoEditor;
