import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadResponse {
  message: string;
  data?: any;
}

type FilterType =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'blur'
  | 'vintage'
  | 'hue-rotate'
  | 'warm'
  | 'cool'
  | 'vivid'
  | 'dramatic'
  | 'vignette';

type CaptureMode = 'single' | 'timer' | 'burst';

const CameraCapture: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('none');
  const [mode, setMode] = useState<CaptureMode>('single');
  const [timerDelay, setTimerDelay] = useState<number>(3);
  const [burstCount, setBurstCount] = useState<number>(3);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  // --- NEW FEATURES ---
  const [isListening, setIsListening] = useState<boolean>(false);
  const [autoEnhance, setAutoEnhance] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('AdwaShield');
  const [showHistogram, setShowHistogram] = useState<boolean>(false);
  const [histogramData, setHistogramData] = useState<number[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/captures/';

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'user',
  };

  // --- Filter definitions ---
  const filterStyles: Record<FilterType, string> = {
    none: 'none',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    invert: 'invert(100%)',
    blur: 'blur(4px)',
    vintage: 'sepia(50%) contrast(1.2) brightness(0.9) saturate(0.8)',
    'hue-rotate': 'hue-rotate(180deg)',
    warm: 'sepia(30%) brightness(1.1) saturate(1.3)',
    cool: 'brightness(1.05) saturate(0.8) hue-rotate(15deg)',
    vivid: 'saturate(1.8) contrast(1.1)',
    dramatic: 'contrast(1.5) saturate(0.9) brightness(0.9)',
    vignette: 'brightness(1.1) contrast(1.2) drop-shadow(0 0 100px rgba(0,0,0,0.5))',
  };

  const filterLabels: Record<FilterType, string> = {
    none: 'Normal',
    grayscale: 'B&W',
    sepia: 'Sepia',
    invert: 'Invert',
    blur: 'Blur',
    vintage: 'Vintage',
    'hue-rotate': 'Hue',
    warm: 'Warm',
    cool: 'Cool',
    vivid: 'Vivid',
    dramatic: 'Dramatic',
    vignette: 'Vignette',
  };

  // --- Notifications ---
  const showNotification = (text: string, type: 'success' | 'error' | 'info') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Auto‑enhance (contrast stretch + saturation boost) ---
  const applyAutoEnhance = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    // Find min/max per channel
    let minR = 255,
      maxR = 0,
      minG = 255,
      maxG = 0,
      minB = 255,
      maxB = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (g < minG) minG = g;
      if (g > maxG) maxG = g;
      if (b < minB) minB = b;
      if (b > maxB) maxB = b;
    }
    // Stretch each channel to [0,255]
    const rangeR = maxR - minR || 1;
    const rangeG = maxG - minG || 1;
    const rangeB = maxB - minB || 1;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = ((data[i] - minR) / rangeR) * 255;
      data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255;
      data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255;
    }
    // Slight saturation boost (simple)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const boost = 1.2;
      data[i] = Math.min(255, gray + (r - gray) * boost);
      data[i + 1] = Math.min(255, gray + (g - gray) * boost);
      data[i + 2] = Math.min(255, gray + (b - gray) * boost);
    }
    return imageData;
  };

  // --- Capture with filter and enhancements ---
  const captureWithFilter = (): string | null => {
    const video = webcamRef.current?.video;
    if (!video) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // If auto‑enhance is on, apply it to the raw image
    if (autoEnhance) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const enhanced = applyAutoEnhance(imageData);
      ctx.putImageData(enhanced, 0, 0);
    }

    // Now apply the CSS filter if any (except 'none')
    if (activeFilter !== 'none') {
      ctx.filter = filterStyles[activeFilter];
      // Re‑draw with filter on top
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
        canvas.width = canvas.width; // clear
        ctx.filter = filterStyles[activeFilter];
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }

    // Add watermark if text is not empty
    if (watermarkText.trim()) {
      ctx.filter = 'none'; // reset filter
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      // Shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);
      ctx.shadowBlur = 0;
    }

    return canvas.toDataURL('image/jpeg');
  };

  // --- Single capture ---
  const performCapture = useCallback((): string | null => {
    const image = captureWithFilter();
    if (image) {
      setImgSrc(image);
      setCapturedImages([image]);
      showNotification('Photo captured!', 'info');
      return image;
    } else {
      showNotification('Failed to capture.', 'error');
      return null;
    }
  }, [webcamRef, activeFilter, autoEnhance, watermarkText]);

  // --- Timer & Burst (same as before, but uses performCapture) ---
  const startCaptureSequence = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    if (mode === 'single') {
      performCapture();
      setIsCapturing(false);
      return;
    }

    if (mode === 'timer') {
      setCountdown(timerDelay);
      for (let i = timerDelay; i > 0; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(null);
      performCapture();
      setIsCapturing(false);
      return;
    }

    if (mode === 'burst') {
      const images: string[] = [];
      for (let i = 0; i < burstCount; i++) {
        const img = captureWithFilter();
        if (img) {
          images.push(img);
          showNotification(`Burst ${i + 1}/${burstCount}`, 'info');
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      if (images.length > 0) {
        setImgSrc(images[0]);
        setCapturedImages(images);
        showNotification(`Captured ${images.length} burst shots!`, 'success');
      }
      setIsCapturing(false);
    }
  }, [mode, timerDelay, burstCount, performCapture, captureWithFilter, isCapturing]);

  // --- Upload, Download, Share (unchanged) ---
  const uploadPhoto = async () => {
    if (!imgSrc) return;
    setLoading(true);
    try {
      const response = await axios.post<UploadResponse>(API_URL, { image: imgSrc });
      console.log('Upload Success:', response.data);
      showNotification('✓ Saved to database!', 'success');
      setTimeout(() => {
        setImgSrc(null);
        setCapturedImages([]);
      }, 2000);
    } catch (error) {
      console.error('Upload Error:', error);
      showNotification('✖ Failed to connect.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imgSrc) return;
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareImage = async () => {
    if (!imgSrc) return;
    try {
      const response = await fetch(imgSrc);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      if (navigator.share) {
        await navigator.share({
          title: 'Check out my photo!',
          files: [file],
        });
      } else {
        showNotification('Share not supported.', 'info');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const retake = () => {
    setImgSrc(null);
    setCapturedImages([]);
    setCountdown(null);
    setNotification(null);
  };

  // --- Voice Commands (Web Speech API) ---
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return; // not supported
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();
      console.log('Voice command:', command);

      // Simple command parsing
      if (command.includes('capture') || command.includes('take photo')) {
        if (!imgSrc && !isCapturing) startCaptureSequence();
      } else if (command.includes('retake') || command.includes('delete')) {
        if (imgSrc) retake();
      } else if (command.includes('apply')) {
        // Try to match filter name
        const filterNames = Object.keys(filterLabels) as FilterType[];
        for (const key of filterNames) {
          if (command.includes(filterLabels[key].toLowerCase())) {
            setActiveFilter(key);
            showNotification(`Applied ${filterLabels[key]}`, 'info');
            break;
          }
        }
      } else if (command.includes('grid')) {
        setShowGrid(!showGrid);
      } else if (command.includes('enhance')) {
        setAutoEnhance(!autoEnhance);
        showNotification(`Auto‑enhance ${!autoEnhance ? 'on' : 'off'}`, 'info');
      }
    };

    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => {
      recognition.stop();
    };
  }, [isListening, startCaptureSequence, imgSrc, isCapturing]);

  // --- Live Histogram (optional) ---
  const updateHistogram = useCallback(() => {
    if (!showHistogram) return;
    const video = webcamRef.current?.video;
    if (!video || video.readyState !== 4) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 320, 180);
    const imageData = ctx.getImageData(0, 0, 320, 180);
    const data = imageData.data;
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      histogram[Math.floor(gray)]++;
    }
    setHistogramData(histogram);
  }, [showHistogram]);

  useEffect(() => {
    if (showHistogram) {
      const interval = setInterval(updateHistogram, 500);
      return () => clearInterval(interval);
    }
  }, [showHistogram, updateHistogram]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !imgSrc && !isCapturing) {
        e.preventDefault();
        startCaptureSequence();
      }
      if (e.key === 'r' && imgSrc) {
        retake();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imgSrc, isCapturing, startCaptureSequence]);

  // --- Grid overlay (unchanged) ---
  const GridOverlay = () => (
    <div style={styles.gridOverlay}>
      <div style={{ ...styles.gridLine, top: '33.33%' }} />
      <div style={{ ...styles.gridLine, top: '66.66%' }} />
      <div style={{ ...styles.gridLine, left: '33.33%', width: '1px', height: '100%' }} />
      <div style={{ ...styles.gridLine, left: '66.66%', width: '1px', height: '100%' }} />
    </div>
  );

  // --- Render ---
  return (
    <div style={styles.pageContainer}>
      <style>{`
        .filter-btn {
          background: rgba(255,255,255,0.05);
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
          width: 100%;
        }
        .filter-btn.active {
          border-color: #f5576c;
          background: rgba(245, 87, 108, 0.15);
        }
        .filter-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .mode-btn.active {
          background: rgba(245, 87, 108, 0.2);
          border-color: #f5576c;
        }
      `}</style>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              ...styles.notification,
              backgroundColor:
                notification.type === 'error' ? '#dc3545' :
                notification.type === 'success' ? '#28a745' : '#17a2b8',
            }}
          >
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📷 AdwaShield</h1>
        <div style={styles.liveIndicator}>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={styles.redDot}
          />
          <span style={styles.liveText}>LIVE</span>
        </div>
      </div>

      {/* Main container with sidebar */}
      <div style={styles.mainContainer}>
        {/* Filter Toggle */}
        <button
          style={styles.filterToggle}
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle Filters"
        >
          🎨
        </button>

        {/* Filter Sidebar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              style={styles.filterSidebar}
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div style={styles.sidebarHeader}>
                <span>Filters</span>
                <button onClick={() => setShowFilters(false)} style={styles.closeSidebar}>✕</button>
              </div>
              <div style={styles.filterList}>
                {([
                  'none',
                  'grayscale',
                  'sepia',
                  'invert',
                  'blur',
                  'vintage',
                  'hue-rotate',
                  'warm',
                  'cool',
                  'vivid',
                  'dramatic',
                  'vignette',
                ] as FilterType[]).map((filter) => (
                  <button
                    key={filter}
                    className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
                    onClick={() => {
                      setActiveFilter(filter);
                      setShowFilters(false);
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundImage: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        filter: filterStyles[filter],
                        flexShrink: 0,
                      }}
                    />
                    <span style={styles.filterLabel}>{filterLabels[filter]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera Section */}
        <div style={styles.cameraSection}>
          {/* Camera Preview */}
          <motion.div
            style={styles.webcamWrapper}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div style={styles.cameraOverlay}>
              <div style={{ ...styles.corner, top: 0, left: 0, borderTop: '3px solid rgba(255,255,255,0.6)', borderLeft: '3px solid rgba(255,255,255,0.6)' }} />
              <div style={{ ...styles.corner, top: 0, right: 0, borderTop: '3px solid rgba(255,255,255,0.6)', borderRight: '3px solid rgba(255,255,255,0.6)' }} />
              <div style={{ ...styles.corner, bottom: 0, left: 0, borderBottom: '3px solid rgba(255,255,255,0.6)', borderLeft: '3px solid rgba(255,255,255,0.6)' }} />
              <div style={{ ...styles.corner, bottom: 0, right: 0, borderBottom: '3px solid rgba(255,255,255,0.6)', borderRight: '3px solid rgba(255,255,255,0.6)' }} />
              {showGrid && !imgSrc && <GridOverlay />}
              {countdown !== null && (
                <div style={styles.countdownOverlay}>
                  <span style={styles.countdownNumber}>{countdown}</span>
                </div>
              )}
              {/* Histogram */}
              {showHistogram && !imgSrc && histogramData.length > 0 && (
                <div style={styles.histogramContainer}>
                  <canvas
                    ref={(canvas) => {
                      if (canvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          const width = canvas.width;
                          const height = canvas.height;
                          ctx.clearRect(0, 0, width, height);
                          const max = Math.max(...histogramData);
                          if (max > 0) {
                            for (let i = 0; i < histogramData.length; i++) {
                              const h = (histogramData[i] / max) * height;
                              ctx.fillStyle = 'rgba(255,255,255,0.6)';
                              ctx.fillRect(i * (width / 256), height - h, width / 256, h);
                            }
                          }
                        }
                      }
                    }}
                    width={256}
                    height={64}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              )}
            </div>

            {imgSrc ? (
              <motion.img
                src={imgSrc}
                alt="captured"
                style={styles.videoStream}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              />
            ) : (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                style={{
                  ...styles.videoStream,
                  transform: 'scaleX(-1)',
                  filter: filterStyles[activeFilter],
                }}
              />
            )}
          </motion.div>

          {/* Extended Toolbar */}
          {!imgSrc && (
            <div style={styles.toolbar}>
              <div style={styles.toolGroup}>
                <button
                  className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
                  style={styles.toolBtn}
                  onClick={() => setMode('single')}
                  title="Single shot"
                >
                  📸
                </button>
                <button
                  className={`mode-btn ${mode === 'timer' ? 'active' : ''}`}
                  style={styles.toolBtn}
                  onClick={() => setMode('timer')}
                  title="Timer"
                >
                  ⏱️
                </button>
                <button
                  className={`mode-btn ${mode === 'burst' ? 'active' : ''}`}
                  style={styles.toolBtn}
                  onClick={() => setMode('burst')}
                  title="Burst"
                >
                  🔫
                </button>
              </div>
              <div style={styles.toolGroup}>
                {mode === 'timer' && (
                  <select
                    value={timerDelay}
                    onChange={(e) => setTimerDelay(Number(e.target.value))}
                    style={styles.select}
                  >
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                  </select>
                )}
                {mode === 'burst' && (
                  <select
                    value={burstCount}
                    onChange={(e) => setBurstCount(Number(e.target.value))}
                    style={styles.select}
                  >
                    <option value={3}>3 shots</option>
                    <option value={5}>5 shots</option>
                    <option value={10}>10 shots</option>
                  </select>
                )}
                <button
                  style={{ ...styles.toolBtn, backgroundColor: showGrid ? 'rgba(245,87,108,0.2)' : 'transparent' }}
                  onClick={() => setShowGrid(!showGrid)}
                  title="Toggle Grid"
                >
                  ⊞
                </button>
                <button
                  style={{ ...styles.toolBtn, backgroundColor: autoEnhance ? 'rgba(245,87,108,0.2)' : 'transparent' }}
                  onClick={() => setAutoEnhance(!autoEnhance)}
                  title="Auto‑Enhance"
                >
                  ✨
                </button>
                <button
                  style={{ ...styles.toolBtn, backgroundColor: showHistogram ? 'rgba(245,87,108,0.2)' : 'transparent' }}
                  onClick={() => setShowHistogram(!showHistogram)}
                  title="Histogram"
                >
                  📊
                </button>
                <button
                  style={{ ...styles.toolBtn, backgroundColor: isListening ? 'rgba(245,87,108,0.2)' : 'transparent' }}
                  onClick={() => setIsListening(!isListening)}
                  title="Voice Commands"
                >
                  🎤
                </button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div style={styles.controls}>
            {!imgSrc ? (
              <motion.button
                onClick={startCaptureSequence}
                disabled={isCapturing}
                style={styles.captureBtn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div style={styles.innerCaptureBtn} />
              </motion.button>
            ) : (
              <motion.div
                style={styles.actionButtonGroup}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <button onClick={retake} style={styles.secondaryBtn}>
                  ⟲ Retake
                </button>
                <button onClick={downloadImage} style={styles.secondaryBtn}>
                  ⬇ Download
                </button>
                {navigator.share && (
                  <button onClick={shareImage} style={styles.secondaryBtn}>
                    📤 Share
                  </button>
                )}
                <motion.button
                  onClick={uploadPhoto}
                  disabled={loading}
                  style={styles.primaryBtn}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? 'Syncing...' : '⬆ Upload'}
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Burst thumbnails */}
          {capturedImages.length > 1 && (
            <div style={styles.burstPreviews}>
              {capturedImages.map((img, idx) => (
                <img key={idx} src={img} alt={`burst-${idx}`} style={styles.burstThumb} />
              ))}
            </div>
          )}

          {/* Keyboard hint */}
          <div style={styles.keyHint}>
            <span>Space: Capture &nbsp;|&nbsp; R: Retake &nbsp;|&nbsp; 🎤: Voice</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles (updated with histogram and new buttons) ---
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #0b0b0b 0%, #1a1a1a 100%)',
    fontFamily: '"Inter", -apple-system, sans-serif',
    padding: '20px',
    position: 'relative',
  },
  notification: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '30px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
    zIndex: 1000,
    maxWidth: '90%',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '800px',
    marginBottom: '15px',
    padding: '0 10px',
    zIndex: 5,
  },
  title: {
    fontSize: '26px',
    fontWeight: '600',
    letterSpacing: '1px',
    margin: 0,
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    padding: '6px 16px',
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  redDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#ff3333',
    boxShadow: '0 0 15px #ff3333',
  },
  liveText: {
    color: '#ff3333',
    fontWeight: 'bold',
    fontSize: '12px',
    letterSpacing: '1px',
  },
  mainContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    alignItems: 'flex-start',
  },
  filterToggle: {
    position: 'absolute',
    left: '-60px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '30px',
    padding: '12px 8px',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.2s',
    zIndex: 20,
  },
  filterSidebar: {
    position: 'absolute',
    left: '-20px',
    top: '0',
    width: '260px',
    height: '100%',
    background: 'rgba(20,20,20,0.9)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '20px 16px',
    overflowY: 'auto',
    zIndex: 30,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    color: 'white',
    fontWeight: '600',
    fontSize: '18px',
  },
  closeSidebar: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '20px',
    cursor: 'pointer',
  },
  filterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    color: '#eee',
    fontSize: '14px',
    fontWeight: '500',
  },
  cameraSection: {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  webcamWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: '#1a1a1a',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  cameraOverlay: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    bottom: '20px',
    pointerEvents: 'none',
    zIndex: 10,
  },
  corner: {
    position: 'absolute',
    width: '30px',
    height: '30px',
    opacity: 0.8,
  },
  videoStream: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 5,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: '1px',
    background: 'rgba(255,255,255,0.15)',
    borderTop: '1px dashed rgba(255,255,255,0.2)',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  countdownNumber: {
    fontSize: '120px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 0 30px rgba(0,0,0,0.8)',
  },
  histogramContainer: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    width: '160px',
    height: '40px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: '8px',
    padding: '4px',
    zIndex: 15,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: '15px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap',
    gap: '10px',
  },
  toolGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  toolBtn: {
    background: 'transparent',
    border: '2px solid transparent',
    borderRadius: '10px',
    padding: '6px 12px',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#ccc',
    transition: 'all 0.2s',
  },
  select: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '4px 8px',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
  },
  controls: {
    marginTop: '25px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '80px',
  },
  captureBtn: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: '4px solid rgba(255,255,255,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    padding: 0,
    outline: 'none',
    boxShadow: '0 0 30px rgba(255,255,255,0.1)',
  },
  innerCaptureBtn: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'white',
    boxShadow: '0 0 20px rgba(255,255,255,0.3)',
  },
  actionButtonGroup: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  secondaryBtn: {
    padding: '12px 28px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryBtn: {
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(245, 87, 108, 0.4)',
    transition: 'all 0.2s',
  },
  burstPreviews: {
    display: 'flex',
    gap: '8px',
    marginTop: '15px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '800px',
  },
  burstThumb: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '2px solid rgba(255,255,255,0.1)',
  },
  keyHint: {
    marginTop: '15px',
    fontSize: '12px',
    color: '#666',
    letterSpacing: '0.5px',
  },
};

export default CameraCapture;
