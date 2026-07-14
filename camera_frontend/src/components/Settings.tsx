import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  X, Camera, Image as ImageIcon, Upload, Key, Copy, Check,
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
  onWatermarkPositionChange: (pos: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center') => void;

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
type TabId = 'general' | 'capture' | 'watermark' | 'developer' | 'advanced';

const TABS: { id: TabId; label: string; icon: React.FC<any> }[] = [
  { id: 'general', label: 'General', icon: Monitor },
  { id: 'capture', label: 'Capture', icon: Camera },
  { id: 'watermark', label: 'Watermark', icon: ImageIcon },
  { id: 'developer', label: 'API Portal', icon: Key }, // <-- NEW PORTAL TAB
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
  apiUrl = 'https://digital-camera-backend.onrender.com/',
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

  // API Key Generation State
  const [developerName, setDeveloperName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

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
      setGeneratedKey(null);
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

  // NEW: Calls your Django backend view to build a secure token
  const handleGenerateApiKey = async () => {
    if (!developerName.trim()) return;
    setGenerating(true);
    try {
      const cleanBaseUrl = tempApiUrl.endsWith('/') ? tempApiUrl : `${tempApiUrl}/`;
      const response = await axios.post(`${cleanBaseUrl}generate-key/`, {
        name: developerName
      });
      setGeneratedKey(response.data.raw_api_key);
      // Automatically store this in localStorage so your camera can use it immediately!
      localStorage.setItem('adwa_saved_api_key', response.data.raw_api_key);
    } catch (err) {
      alert('Failed to connect to backend server. Make sure your API Endpoint URL is correct.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    setTempApiUrl('https://digital-camera-backend.onrender.com/');
    setGeneratedKey(null);
    localStorage.removeItem('adwa_saved_api_key');
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <motion.div
        style={styles.modal}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tab,
                  color: isActive ? '#f5576c' : '#888',
                  borderBottom: isActive ? '2px solid #f5576c' : '2px solid transparent',
                  background: isActive ? 'rgba(245, 87, 108, 0.05)' : 'transparent',
                }}
              >
                <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'general' && (
            <motion.div style={styles.section} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={styles.card}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Theme Preference</label>
                  <select
                    value={tempTheme}
                    onChange={(e) => setTempTheme(e.target.value as 'dark' | 'light')}
                    style={styles.select}
                  >
                    <option value="dark">Dark Mode</option>
                    <option value="light">Light Mode</option>
                  </select>
                  <p style={styles.hint}>Theme affects the editor and UI panels across the application.</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'capture' && (
            <motion.div style={styles.section} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Image Quality</h3>
                <div style={styles.inputGroup}>
                  <div style={styles.sliderHeader}>
                    <label style={styles.label}>JPEG Compression</label>
                    <span style={styles.valueBadge}>{Math.round(tempQuality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={tempQuality}
                    onChange={(e) => setTempQuality(Number(e.target.value))}
                    style={styles.range}
                  />
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Resolution</h3>
                <div style={styles.resolutionGrid}>
                  {ASPECT_RATIOS.map((r) => {
                    const isSelected = tempWidth === r.w && tempHeight === r.h;
                    return (
                      <button
                        key={r.label}
                        onClick={() => handlePresetResolution(r.w, r.h)}
                        style={{
                          ...styles.presetBtn,
                          borderColor: isSelected ? '#f5576c' : 'rgba(255,255,255,0.08)',
                          background: isSelected ? 'rgba(245, 87, 108, 0.1)' : 'rgba(255,255,255,0.03)',
                          color: isSelected ? '#f5576c' : '#fff',
                        }}
                      >
                        <span style={{ fontWeight: 600, marginBottom: '4px' }}>{r.label}</span>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>{r.w} × {r.h}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ ...styles.inputGroup, marginTop: '16px' }}>
                  <label style={styles.label}>Custom Resolution (W × H)</label>
                  <div style={styles.customResRow}>
                    <input
                      type="number"
                      value={tempWidth}
                      onChange={(e) => setTempWidth(Number(e.target.value))}
                      style={styles.inputSmall}
                      placeholder="Width"
                    />
                    <span style={styles.resDivider}>×</span>
                    <input
                      type="number"
                      value={tempHeight}
                      onChange={(e) => setTempHeight(Number(e.target.value))}
                      style={styles.inputSmall}
                      placeholder="Height"
                    />
                  </div>
                </div>
              </div>

              <div style={styles.card}>
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
            </motion.div>
          )}

          {activeTab === 'watermark' && (
            <motion.div style={styles.section} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={styles.card}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Text Watermark</label>
                  <input
                    type="text"
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                    placeholder="Enter watermark text..."
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Image Watermark</label>
                  <div style={styles.fileUploadWrapper}>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={styles.fileInput} id="wm-upload" />
                    <label htmlFor="wm-upload" style={styles.fileLabel}>Choose Image...</label>
                  </div>
                  {tempImage && (
                    <div style={styles.imagePreviewBox}>
                      <img src={tempImage} alt="preview" style={styles.previewThumb} />
                      <button onClick={() => setTempImage(null)} style={styles.removeBtn}>Remove Image</button>
                    </div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <div style={styles.sliderHeader}>
                    <label style={styles.label}>Watermark Opacity</label>
                    <span style={styles.valueBadge}>{tempOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={tempOpacity}
                    onChange={(e) => setTempOpacity(Number(e.target.value))}
                    style={styles.range}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Position on Image</label>
                  <select value={tempPosition} onChange={(e) => setTempPosition(e.target.value as any)} style={styles.select}>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* 🔥 NEW API PORTAL TAB VIEW */}
          {activeTab === 'developer' && (
            <motion.div style={styles.section} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Generate Application Credentials</h3>
                <p style={styles.hint}>Create a private API authorization string to enable third-party components to upload directly to your server sandbox.</p>

                {!generatedKey ? (
                  <div style={{ ...styles.inputGroup, marginTop: '12px' }}>
                    <label style={styles.label}>Developer ID / Name</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={developerName}
                        onChange={(e) => setDeveloperName(e.target.value)}
                        placeholder="e.g. Mobile Camera Client"
                        style={{ ...styles.input, flex: 1 }}
                      />
                      <button
                        onClick={handleGenerateApiKey}
                        disabled={generating || !developerName.trim()}
                        style={{ ...styles.saveBtn, borderRadius: '10px', padding: '0 16px', height: '46px' }}
                      >
                        {generating ? 'Issuing...' : 'Create Key'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ ...styles.inputGroup, marginTop: '12px' }}>
                    <label style={{ ...styles.label, color: '#ff6b6b', fontWeight: 'bold' }}>⚠️ Copy token immediately!</label>
                    <p style={styles.hint}>For security purposes, this cleartext authorization credential can only be displayed once.</p>
                    <div style={styles.keyDisplayRow}>
                      <code style={styles.keyCode}>{generatedKey}</code>
                      <button onClick={handleCopyKey} style={styles.copyBtn}>
                        {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'advanced' && (
            <motion.div style={styles.section} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={styles.card}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>API Endpoint URL</label>
                  <input
                    type="text"
                    value={tempApiUrl}
                    onChange={(e) => setTempApiUrl(e.target.value)}
                    style={styles.input}
                    placeholder="https://api.yourdomain.com/captures/"
                  />
                  <p style={styles.hint}>The destination server where captured photos are securely uploaded.</p>
                </div>
              </div>

              <div style={{ ...styles.card, background: 'rgba(255, 50, 50, 0.05)', borderColor: 'rgba(255, 50, 50, 0.1)' }}>
                <h3 style={{ ...styles.sectionTitle, color: '#ff6b6b' }}>Danger Zone</h3>
                <p style={{ ...styles.hint, marginBottom: '16px' }}>Resetting will restore all settings back to their factory defaults. This action cannot be undone.</p>
                <button onClick={handleResetAll} style={styles.resetBtn}>Factory Reset Settings</button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSave} style={styles.saveBtn}>Save Changes</button>
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
      <Icon size={16} strokeWidth={2} style={{ color: value ? '#f5576c' : '#888', marginRight: 8 }} />
      <span style={{ color: value ? '#fff' : '#aaa' }}>{label}</span>
    </div>
    <button
      onClick={() => onChange(!value)}
      style={{
        ...styles.toggleBtn,
        background: value ? '#f5576c' : 'rgba(255,255,255,0.1)',
      }}
      aria-pressed={value}
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
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300, padding: '16px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  modal: {
    background: '#121214', borderRadius: '20px', width: '100%', maxWidth: '640px',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0',
  },
  title: {
    color: '#fff', fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: '#aaa',
    width: 36, height: 36, borderRadius: '50%', display: 'flex', justifyContent: 'center',
    alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
  },
  tabs: {
    display: 'flex', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginTop: 24,
    overflowX: 'auto',
  },
  tab: {
    flex: 1, minWidth: '100px', padding: '14px 0', border: 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex',
    justifyContent: 'center', alignItems: 'center', gap: 8, transition: 'all 0.2s ease',
    borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
  },
  content: {
    flex: 1, overflowY: 'auto', padding: '24px',
  },
  section: {
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20,
  },
  sectionTitle: {
    color: '#fff', fontSize: 15, fontWeight: 600, margin: '0', letterSpacing: '-0.01em',
  },
  inputGroup: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  label: {
    color: '#bbb', fontSize: 13, fontWeight: 500,
  },
  sliderHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  valueBadge: {
    background: 'rgba(245, 87, 108, 0.1)', color: '#f5576c', padding: '2px 8px',
    borderRadius: '12px', fontSize: 12, fontWeight: 600,
  },
  input: {
    padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  customResRow: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  resDivider: {
    color: '#666', fontWeight: 600, fontSize: 16,
  },
  inputSmall: {
    flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, outline: 'none', textAlign: 'center',
  },
  select: {
    padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer',
  },
  range: {
    width: '100%', accentColor: '#f5576c', height: '4px', background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px', outline: 'none', appearance: 'none', cursor: 'pointer', marginTop: '8px'
  },
  fileUploadWrapper: {
    position: 'relative', overflow: 'hidden', display: 'inline-block',
  },
  fileInput: {
    position: 'absolute', left: 0, top: 0, opacity: 0, cursor: 'pointer', height: '100%', width: '100%'
  },
  fileLabel: {
    display: 'inline-block', padding: '10px 16px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff',
    fontSize: '13px', fontWeight: 500, cursor: 'pointer', pointerEvents: 'none',
  },
  imagePreviewBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', marginTop: '4px',
  },
  previewThumb: {
    maxHeight: 40, maxWidth: 60, objectFit: 'contain', borderRadius: '4px',
  },
  removeBtn: {
    background: 'rgba(255,107,107,0.1)', border: 'none', color: '#ff6b6b',
    padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  resolutionGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10,
  },
  presetBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '12px', borderRadius: '12px', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
  },
  toggleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16,
  },
  toggleRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
  },
  toggleLabel: {
    display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 500,
  },
  toggleBtn: {
    width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
    position: 'relative', transition: 'background 0.3s ease', padding: 0,
  },
  toggleKnob: {
    width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute',
    top: 3, left: 3, transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  hint: {
    fontSize: 12, color: '#777', margin: 0, lineHeight: 1.4,
  },
  resetBtn: {
    background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)',
    color: '#ff6b6b', padding: '12px', borderRadius: '10px', cursor: 'pointer',
    fontWeight: 600, fontSize: 13, width: '100%', transition: 'background 0.2s',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
    padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)',
  },
  cancelBtn: {
    padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: '#aaa', cursor: 'pointer', fontWeight: 600, fontSize: 14,
    transition: 'all 0.2s',
  },
  saveBtn: {
    padding: '10px 24px', borderRadius: '8px', border: 'none',
    background: '#f5576c', color: '#fff',
    fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,87,108,0.3)',
    transition: 'all 0.2s',
  },
  keyDisplayRow: {
    display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', padding: '8px 12px', alignItems: 'center', marginTop: '6px'
  },
  keyCode: {
    flex: 1, color: '#4ade80', fontSize: '13px', overflowX: 'auto', whiteSpace: 'nowrap', fontFamily: 'monospace'
  },
  copyBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)',
    border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 500
  }
};

export default Settings;
