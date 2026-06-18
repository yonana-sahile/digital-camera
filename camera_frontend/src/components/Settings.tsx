import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  watermarkText: string;
  onWatermarkTextChange: (text: string) => void;
  watermarkImage: string | null;
  onWatermarkImageChange: (imageData: string | null) => void;
  watermarkOpacity: number;
  onWatermarkOpacityChange: (opacity: number) => void;
  watermarkPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  onWatermarkPositionChange: (pos: any) => void;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  watermarkText,
  onWatermarkTextChange,
  watermarkImage,
  onWatermarkImageChange,
  watermarkOpacity,
  onWatermarkOpacityChange,
  watermarkPosition,
  onWatermarkPositionChange,
}) => {
  const [tempText, setTempText] = useState(watermarkText);
  const [tempImage, setTempImage] = useState<string | null>(watermarkImage);
  const [tempOpacity, setTempOpacity] = useState(watermarkOpacity);
  const [tempPosition, setTempPosition] = useState(watermarkPosition);

  // Load initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempText(watermarkText);
      setTempImage(watermarkImage);
      setTempOpacity(watermarkOpacity);
      setTempPosition(watermarkPosition);
    }
  }, [isOpen, watermarkText, watermarkImage, watermarkOpacity, watermarkPosition]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTempImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onWatermarkTextChange(tempText);
    onWatermarkImageChange(tempImage);
    onWatermarkOpacityChange(tempOpacity);
    onWatermarkPositionChange(tempPosition);
    onClose();
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
          <h2 style={styles.title}>⚙️ Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.section}>
            <h3>Watermark</h3>
            <div style={styles.row}>
              <label>Text Watermark:</label>
              <input
                type="text"
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                placeholder="e.g. AdwaShield"
                style={styles.input}
              />
            </div>
            <div style={styles.row}>
              <label>Image Watermark (PNG/JPEG):</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={styles.fileInput}
              />
              {tempImage && (
                <div style={styles.imagePreview}>
                  <img src={tempImage} alt="Watermark preview" style={styles.previewThumb} />
                  <button onClick={() => setTempImage(null)} style={styles.removeBtn}>Remove</button>
                </div>
              )}
            </div>
            <div style={styles.row}>
              <label>Opacity: {tempOpacity}%</label>
              <input
                type="range"
                min="10"
                max="100"
                value={tempOpacity}
                onChange={(e) => setTempOpacity(Number(e.target.value))}
                style={styles.range}
              />
            </div>
            <div style={styles.row}>
              <label>Position:</label>
              <select
                value={tempPosition}
                onChange={(e) => setTempPosition(e.target.value as any)}
                style={styles.select}
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
                <option value="center">Center</option>
              </select>
            </div>
          </div>

          <button onClick={handleSave} style={styles.saveBtn}>💾 Save Settings</button>
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
    zIndex: 1300,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '24px',
    padding: '24px',
    maxWidth: '500px',
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
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    color: 'white',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '14px',
  },
  fileInput: {
    color: 'white',
    fontSize: '14px',
  },
  imagePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
  },
  previewThumb: {
    maxHeight: '60px',
    maxWidth: '60px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  removeBtn: {
    background: 'rgba(255,50,50,0.2)',
    border: '1px solid rgba(255,50,50,0.3)',
    color: '#ff6b6b',
    padding: '4px 12px',
    borderRadius: '20px',
    cursor: 'pointer',
  },
  range: {
    width: '100%',
    accentColor: '#f5576c',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '14px',
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
  },
};

export default Settings;
