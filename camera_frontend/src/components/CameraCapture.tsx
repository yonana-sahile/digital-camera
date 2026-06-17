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
  const [timerDelay, setTimerDelay] = useState<number>(3); // seconds
  const [burstCount, setBurstCount] = useState<number>(3);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

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
    vignette: 'brightness(1.1) contrast(1.2) drop-shadow(0 0 100px rgba(0,0,0,0.5))', // not perfect but okay
  };

  // --- Notifications ---
  const showNotification = (text: string, type: 'success' | 'error' | 'info') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Capture with filter (canvas) ---
  const captureWithFilter = (): string | null => {
    const video = webcamRef.current?.video;
    if (!video) return null;

    if (activeFilter === 'none') {
      return webcamRef.current?.getScreenshot() || null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.filter = filterStyles[activeFilter];
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
  }, [webcamRef, activeFilter]);

  // --- Timer & Burst logic ---
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
        await new Promise((r) => setTimeout(r, 400)); // 400ms between shots
      }
      if (images.length > 0) {
        setImgSrc(images[0]); // show first as preview
        setCapturedImages(images);
        showNotification(`Captured ${images.length} burst shots!`, 'success');
      }
      setIsCapturing(false);
    }
  }, [mode, timerDelay, burstCount, performCapture, captureWithFilter, isCapturing]);

  // --- Upload ---
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

  // --- Download ---
  const downloadImage = () => {
    if (!imgSrc) return;
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Share (Web Share API) ---
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
        showNotification('Share not supported on this browser.', 'info');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // --- Retake ---
  const retake = () => {
    setImgSrc(null);
    setCapturedImages([]);
    setCountdown(null);
    setNotification(null);
  };

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

  // --- Grid overlay ---
  const GridOverlay = () => (
    <div style={styles.gridOverlay}>
      <div style={styles.gridLineH} />
      <div style={styles.gridLineH} />
      <div style={styles.gridLineV} />
      <div style={styles.gridLineV} />
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
          padding: 6px 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
          min-width: 60px;
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

      {/* Toolbar (mode, grid, etc.) */}
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
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {!imgSrc && (
        <motion.div
          style={styles.filterBar}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
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
              style={styles.filterBtn}
              onClick={() => setActiveFilter(filter)}
            >
              <span style={styles.filterLabel}>{filter.replace('-', ' ').toUpperCase()}</span>
              <div
                style={{
                  ...styles.filterPreview,
                  filter: filterStyles[filter],
                  backgroundImage: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                }}
              />
            </button>
          ))}
        </motion.div>
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

      {/* Burst previews (if multiple) */}
      {capturedImages.length > 1 && (
        <div style={styles.burstPreviews}>
          {capturedImages.map((img, idx) => (
            <img key={idx} src={img} alt={`burst-${idx}`} style={styles.burstThumb} />
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      <div style={styles.keyHint}>
        <span>Space: Capture &nbsp;|&nbsp; R: Retake</span>
      </div>
    </div>
  );
};

// --- Styles (extensive) ---
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #0b0b0b 0%, #1a1a1a 100%)',
    fontFamily: '"Inter", -apple-system, sans-serif',
    padding: '20px',
    position: 'relative',
  },
  notification: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '30px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
    zIndex: 100,
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
  webcamWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '800px',
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
  gridLineH: {
    position: 'absolute',
    left: '0%',
    width: '100%',
    height: '1px',
    background: 'rgba(255,255,255,0.15)',
    top: '33.33%',
    borderTop: '1px dashed rgba(255,255,255,0.2)',
  },
  gridLineV: {
    position: 'absolute',
    top: '0%',
    height: '100%',
    width: '1px',
    background: 'rgba(255,255,255,0.15)',
    left: '33.33%',
    borderLeft: '1px dashed rgba(255,255,255,0.2)',
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
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '800px',
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
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginTop: '15px',
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '800px',
    width: '100%',
  },
  filterBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid transparent',
    borderRadius: '12px',
    padding: '6px 12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    minWidth: '60px',
  },
  filterLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  filterPreview: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    transition: 'filter 0.2s',
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
