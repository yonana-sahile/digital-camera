import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, Camera, Image as ImageIcon, Upload,
  Monitor, Mic, ScanFace, Grid3X3, BarChart3, Sparkles, Focus,
} from 'lucide-react';

// --------------------------------------------------------------------
// PROPS – all optional so the component remains backward‑compatible
// --------------------------------------------------------------------
interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;

  // ---- Watermark (existing) ----
  watermarkText: string;
  onWatermarkTextChange: (text: string) => void;
  watermarkImage: string | null;
  onWatermarkImageChange: (image: string | null) => void;
  watermarkOpacity: number;
  onWatermarkOpacityChange: (opacity: number) => void;
  watermarkPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  onWatermarkPositionChange: (pos: typeof watermarkPosition) => void;

  // ---- Capture quality ----
  captureQuality?: number;                     // 0‑1 JPEG quality
  onCaptureQualityChange?: (q: number) => void;
  resolutionWidth?: number;
  resolutionHeight?: number;
  onResolutionChange?: (width: number, height: number) => void;

  // ---- Default tool states ----
  autoEnhanceDefault?: boolean;
  onAutoEnhanceDefaultChange?: (v: boolean) => void;
  gridDefault?: boolean;
  onGridDefaultChange?: (v: boolean) => void;
  histogramDefault?: boolean;
  onHistogramDefaultChange?: (v: boolean) => void;
  faceDetectionDefault?: boolean;
  onFaceDetectionDefaultChange?: (v: boolean) => void;
  backgroundBlurDefault?: boolean;
  onBackgroundBlurDefaultChange?: (v: boolean) => void;
  voiceDefault?: boolean;
  onVoiceDefaultChange?: (v: boolean) => void;

  // ---- UI ----
  theme?: 'dark' | 'light';
  onThemeChange?: (t: 'dark' | 'light') => void;
  apiUrl?: string;
  onApiUrlChange?: (url: string) => void;
}

// --------------------------------------------------------------------
// CONSTANTS
// --------------------------------------------------------------------
type TabId = 'general' | 'capture' | 'watermark' | 'advanced';

const TABS: { id: TabId; label: string; icon: React.FC<any> }[] = [
  { id: 'general', label: 'General', icon: Monitor },
  { id: 'capture', label: 'Capture', icon: Camera },
  { id: 'watermark', label: 'Watermark', icon: ImageIcon },
  { id: 'advanced', label: 'Advanced', icon: Upload },
];

const ASPECT_RATIOS = [
  { label: '4:3', w: 1280, h: 960 },
  { label: '16:9', w: 1280, h: 720 },
  { label: '1:1', w: 1080, h: 1080 },
];

// --------------------------------------------------------------------
// COMPONENT
// --------------------------------------------------------------------
const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  // Watermark
  watermarkText,
  onWatermarkTextChange,
  watermarkImage,
  onWatermarkImageChange,
  watermarkOpacity,
  onWatermarkOpacityChange,
  watermarkPosition,
  onWatermarkPositionChange,
  // Optional props
  captureQuality = 0.92,
  onCaptureQualityChange,
  resolutionWidth = 1280,
  resolutionHeight = 720,
  onResolutionChange,
  autoEnhanceDefault = false,
  onAutoEnhanceDefaultChange,
  gridDefault = false,
  onGridDefaultChange,
  histogramDefault = false,
  onHistogramDefaultChange,
  faceDetectionDefault = false,
  onFaceDetectionDefaultChange,
  backgroundBlurDefault = false,
  onBackgroundBlurDefaultChange,
  voiceDefault = false,
  onVoiceDefaultChange,
  theme = 'dark',
  onThemeChange,
  apiUrl = 'http://localhost:8000/api/captures/',
  onApiUrlChange,
}) => {
  // ---- Local state ----
  const [activeTab, setActiveTab] = useState<TabId>('general');

  // Watermark temp
  const [tempText, setTempText] = useState(watermarkText);
  const [tempImage, setTempImage] = useState<string | null>(watermarkImage);
  const [tempOpacity, setTempOpacity] = useState(watermarkOpacity);
  const [tempPosition, setTempPosition] = useState(watermarkPosition);

  // Capture quality
  const [tempQuality, setTempQuality] = useState(captureQuality);
  const [tempWidth, setTempWidth] = useState(resolutionWidth);
  const [tempHeight, setTempHeight] = useState(resolutionHeight);

  // Tool defaults
  const [tempAutoEnhance, setTempAutoEnhance] = useState(autoEnhanceDefault);
  const [tempGrid, setTempGrid] = useState(gridDefault);
  const [tempHistogram, setTempHistogram] = useState(histogramDefault);
  const [tempFace, setTempFace] = useState(faceDetectionDefault);
  const [tempBlur, setTempBlur] = useState(backgroundBlurDefault);
  const [tempVoice, setTempVoice] = useState(voiceDefault);

  // UI
  const [tempTheme, setTempTheme] = useState(theme);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);

  // ---- Load defaults when opened ----
  useEffect(() => {
    if (isOpen) {
      setTempText(watermarkText);
      setTempImage(watermarkImage);
      setTempOpacity(watermarkOpacity);
      setTempPosition(watermarkPosition);
      setTempQuality(captureQuality);
      setTempWidth(resolutionWidth);
      setTempHeight(resolutionHeight);
      setTempAutoEnhance(autoEnhanceDefault);
      setTempGrid(gridDefault);
      setTempHistogram(histogramDefault);
      setTempFace(faceDetectionDefault);
      setTempBlur(backgroundBlurDefault);
      setTempVoice(voiceDefault);
      setTempTheme(theme);
      setTempApiUrl(apiUrl);
      setActiveTab('general');
    }
  }, [isOpen, watermarkText, watermarkImage, watermarkOpacity, watermarkPosition,
       captureQuality, resolutionWidth, resolutionHeight,
       autoEnhanceDefault, gridDefault, histogramDefault, faceDetectionDefault,
       backgroundBlurDefault, voiceDefault, theme, apiUrl]);

  // ---- Handlers ----
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setTempImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePresetResolution = (w: number, h: number) => {
    setTempWidth(w);
    setTempHeight(h);
  };

  const handleSave = () => {
    // Watermark
    onWatermarkTextChange(tempText);
    onWatermarkImageChange(tempImage);
    onWatermarkOpacityChange(tempOpacity);
    onWatermarkPositionChange(tempPosition);
    // Capture
    onCaptureQualityChange?.(tempQuality);
    onResolutionChange?.(tempWidth, tempHeight);
    // Defaults
    onAutoEnhanceDefaultChange?.(tempAutoEnhance);
    onGridDefaultChange?.(tempGrid);
    onHistogramDefaultChange?.(tempHistogram);
    onFaceDetectionDefaultChange?.(tempFace);
    onBackgroundBlurDefaultChange?.(tempBlur);
    onVoiceDefaultChange?.(tempVoice);
    // UI
    onThemeChange?.(tempTheme);
    onApiUrlChange?.(tempApiUrl);
    onClose();
  };

  const handleResetAll = () => {
    setTempText('AdwaShield');
    setTempImage(null);
    setTempOpacity(80);
    setTempPosition('bottom-right');
    setTempQuality(0.92);
    setTempWidth(1280);
    setTempHeight(720);
    setTempAutoEnhance(false);
    setTempGrid(false);
    setTempHistogram(false);
    setTempFace(false);
    setTempBlur(false);
    setTempVoice(false);
    setTempTheme('dark');
    setTempApiUrl('http://localhost:8000/api/captures/');
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <motion.div
        style={styles.modal}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                borderBottom: activeTab === tab.id ? '2px solid #f5576c' : '2px solid transparent',
                color: activeTab === tab.id ? '#f5576c' : '#aaa',
              }}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'general' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Appearance</h3>
              <label style={styles.row}>
                <span>Theme</span>
                <select
                  value={tempTheme}
                  onChange={(e) => setTempTheme(e.target.value as 'dark' | 'light')}
                  style={styles.select}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <p style={styles.hint}>Theme affects the editor and UI panels.</p>
            </div>
          )}

          {activeTab === 'capture' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Image Quality</h3>
              <label style={styles.row}>
                <span>JPEG Quality: {Math.round(tempQuality * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={tempQuality}
                  onChange={(e) => setTempQuality(Number(e.target.value))}
                  style={styles.range}
                />
              </label>
              <h3 style={styles.sectionTitle}>Resolution</h3>
              <div style={styles.resolutionGrid}>
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => handlePresetResolution(r.w, r.h)}
                    style={{
                      ...styles.presetBtn,
                      borderColor: tempWidth === r.w && tempHeight === r.h ? '#f5576c' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {r.label}
                    <br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{r.w}×{r.h}</span>
                  </button>
                ))}
              </div>
              <label style={styles.row}>
                <span>Custom (W×H)</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={tempWidth}
                    onChange={(e) => setTempWidth(Number(e.target.value))}
                    style={styles.inputSmall}
                  />
                  <span style={{ color: '#aaa', alignSelf: 'center' }}>×</span>
                  <input
                    type="number"
                    value={tempHeight}
                    onChange={(e) => setTempHeight(Number(e.target.value))}
                    style={styles.inputSmall}
                  />
                </div>
              </label>

              <h3 style={styles.sectionTitle}>Default Tools</h3>
              <div style={styles.toggleGrid}>
                <Toggle label="Auto‑Enhance" value={tempAutoEnhance} onChange={setTempAutoEnhance} icon={Sparkles} />
                <Toggle label="Grid Overlay" value={tempGrid} onChange={setTempGrid} icon={Grid3X3} />
                <Toggle label="Histogram" value={tempHistogram} onChange={setTempHistogram} icon={BarChart3} />
                <Toggle label="Face Detection" value={tempFace} onChange={setTempFace} icon={ScanFace} />
                <Toggle label="Background Blur" value={tempBlur} onChange={setTempBlur} icon={Focus} />
                <Toggle label="Voice Control" value={tempVoice} onChange={setTempVoice} icon={Mic} />
              </div>
            </div>
          )}

          {activeTab === 'watermark' && (
            <div style={styles.section}>
              <label style={styles.row}>
                <span>Text Watermark</span>
                <input
                  type="text"
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  placeholder="e.g. AdwaShield"
                  style={styles.input}
                />
              </label>
              <label style={styles.row}>
                <span>Image Watermark</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={styles.fileInput} />
                {tempImage && (
                  <div style={styles.imagePreview}>
                    <img src={tempImage} alt="preview" style={styles.previewThumb} />
                    <button onClick={() => setTempImage(null)} style={styles.removeBtn}>Remove</button>
                  </div>
                )}
              </label>
              <label style={styles.row}>
                <span>Opacity: {tempOpacity}%</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={tempOpacity}
                  onChange={(e) => setTempOpacity(Number(e.target.value))}
                  style={styles.range}
                />
              </label>
              <label style={styles.row}>
                <span>Position</span>
                <select value={tempPosition} onChange={(e) => setTempPosition(e.target.value as any)} style={styles.select}>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="center">Center</option>
                </select>
              </label>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div style={styles.section}>
              <label style={styles.row}>
                <span>API Endpoint</span>
                <input
                  type="text"
                  value={tempApiUrl}
                  onChange={(e) => setTempApiUrl(e.target.value)}
                  style={styles.input}
                  placeholder="http://localhost:8000/api/captures/"
                />
              </label>
              <p style={styles.hint}>Where captured photos are uploaded (if enabled).</p>
              <button onClick={handleResetAll} style={styles.resetBtn}>🔄 Reset All Settings</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSave} style={styles.saveBtn}>Save Settings</button>
        </div>
      </motion.div>
    </div>
  );
};

// --------------------------------------------------------------------
// TINY TOGGLE COMPONENT
// --------------------------------------------------------------------
const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void; icon: React.FC<any> }> = ({
  label, value, onChange, icon: Icon,
}) => (
  <div style={styles.toggleRow}>
    <div style={styles.toggleLabel}>
      <Icon size={16} style={{ marginRight: 8 }} />
      {label}
    </div>
    <button
      onClick={() => onChange(!value)}
      style={{
        ...styles.toggleBtn,
        background: value ? 'linear-gradient(135deg, #f093fb, #f5576c)' : 'rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          ...styles.toggleKnob,
          transform: value ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  </div>
);

// --------------------------------------------------------------------
// STYLES
// --------------------------------------------------------------------
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300, padding: '20px',
    fontFamily: "'Inter', sans-serif",
  },
  modal: {
    background: '#131316', borderRadius: '24px', width: '100%', maxWidth: '620px',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0',
  },
  title: {
    color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff',
    width: 36, height: 36, borderRadius: '50%', display: 'flex', justifyContent: 'center',
    alignItems: 'center', cursor: 'pointer',
  },
  tabs: {
    display: 'flex', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginTop: 16,
  },
  tab: {
    flex: 1, padding: '12px 0', background: 'none', border: 'none', color: '#aaa',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex',
    justifyContent: 'center', alignItems: 'center', gap: 6, transition: '0.2s',
  },
  content: {
    flex: 1, overflowY: 'auto', padding: '20px 24px',
  },
  section: {
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  sectionTitle: {
    color: '#ccc', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px',
  },
  row: {
    display: 'flex', flexDirection: 'column', gap: 6, color: '#bbb', fontSize: 14,
  },
  input: {
    padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14,
  },
  inputSmall: {
    width: 80, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13,
  },
  select: {
    padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14,
  },
  range: {
    width: '100%', accentColor: '#f5576c',
  },
  fileInput: {
    color: '#bbb', fontSize: 13,
  },
  imagePreview: {
    display: 'flex', alignItems: 'center', gap: 12, marginTop: 6,
  },
  previewThumb: {
    maxHeight: 50, maxWidth: 50, objectFit: 'contain', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  removeBtn: {
    background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.3)',
    color: '#ff6b6b', padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
  },
  resolutionGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
  },
  presetBtn: {
    padding: '8px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer', fontSize: 13,
  },
  toggleGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
  },
  toggleRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', color: '#ccc', fontSize: 13,
  },
  toggleLabel: {
    display: 'flex', alignItems: 'center', gap: 4,
  },
  toggleBtn: {
    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
    position: 'relative', transition: 'background 0.2s',
  },
  toggleKnob: {
    width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute',
    top: 3, left: 3, transition: 'transform 0.2s',
  },
  hint: {
    fontSize: 12, color: '#666', margin: 0,
  },
  resetBtn: {
    alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#ff6b6b', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', marginTop: 8,
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  cancelBtn: {
    padding: '10px 20px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600,
  },
  saveBtn: {
    padding: '10px 28px', borderRadius: 24, border: 'none',
    background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: '#fff',
    fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(245,87,108,0.4)',
  },
};

export default Settings;
