import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

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
  | 'hue-rotate';

const CameraCapture: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('none');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/captures/';

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'user',
  };

  // Map filter names to CSS filter strings (also usable on Canvas)
  const filterStyles: Record<FilterType, string> = {
    none: 'none',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    invert: 'invert(100%)',
    blur: 'blur(4px)',
    vintage: 'sepia(50%) contrast(1.2) brightness(0.9) saturate(0.8)',
    'hue-rotate': 'hue-rotate(180deg)',
  };

  const showNotification = (text: string, type: 'success' | 'error' | 'info') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  /**
   * Capture a frame with the currently selected filter applied.
   * If filter is 'none', use the Webcam screenshot (faster).
   * Otherwise, draw the video to a canvas with the filter and export.
   */
  const captureWithFilter = (): string | null => {
    const video = webcamRef.current?.video;
    if (!video) return null;

    // If no filter, use the built‑in screenshot (fastest)
    if (activeFilter === 'none') {
      return webcamRef.current?.getScreenshot() || null;
    }

    // Apply filter via Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply the same filter string to the canvas context
    ctx.filter = filterStyles[activeFilter];
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg');
  };

  const capture = useCallback(async () => {
    const image = captureWithFilter();
    if (image) {
      setImgSrc(image);
      showNotification('Photo captured with filter!', 'info');
    } else {
      showNotification('Failed to capture. Please check camera.', 'error');
    }
  }, [webcamRef, activeFilter]);

  const uploadPhoto = async () => {
    if (!imgSrc) return;
    setLoading(true);
    try {
      const response = await axios.post<UploadResponse>(API_URL, { image: imgSrc });
      console.log('Upload Success:', response.data);
      showNotification('✓ Securely saved to database!', 'success');
      setTimeout(() => setImgSrc(null), 2000);
    } catch (error) {
      console.error('Upload Error:', error);
      showNotification('✖ Failed to connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const retake = () => {
    setImgSrc(null);
    setNotification(null);
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.5; transform: scale(1); }
        }
        .filter-btn {
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .filter-btn.active {
          border-color: #007bff;
          background-color: rgba(0, 123, 255, 0.2);
        }
      `}</style>

      <div style={styles.pageContainer}>
        <div style={styles.header}>
          <h1 style={styles.title}>AdwaShield Smart Cam</h1>
          <div style={styles.liveIndicator}>
            <div style={styles.redDot}></div>
            <span style={styles.liveText}>LIVE FEED</span>
          </div>
        </div>

        {/* Notification Banner */}
        <div
          style={{
            ...styles.notification,
            opacity: notification ? 1 : 0,
            backgroundColor:
              notification?.type === 'error'
                ? '#dc3545'
                : notification?.type === 'success'
                ? '#28a745'
                : '#17a2b8',
          }}
        >
          {notification?.text || ' '}
        </div>

        <div style={styles.webcamWrapper}>
          <div style={styles.cameraOverlay}>
            <div
              style={{
                ...styles.corner,
                top: 0,
                left: 0,
                borderTop: '4px solid white',
                borderLeft: '4px solid white',
              }}
            ></div>
            <div
              style={{
                ...styles.corner,
                top: 0,
                right: 0,
                borderTop: '4px solid white',
                borderRight: '4px solid white',
              }}
            ></div>
            <div
              style={{
                ...styles.corner,
                bottom: 0,
                left: 0,
                borderBottom: '4px solid white',
                borderLeft: '4px solid white',
              }}
            ></div>
            <div
              style={{
                ...styles.corner,
                bottom: 0,
                right: 0,
                borderBottom: '4px solid white',
                borderRight: '4px solid white',
              }}
            ></div>
          </div>

          {imgSrc ? (
            <img src={imgSrc} alt="captured preview" style={styles.videoStream} />
          ) : (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              style={{
                ...styles.videoStream,
                transform: 'scaleX(-1)',
                filter: filterStyles[activeFilter], // Live preview with filter
              }}
            />
          )}
        </div>

        {/* Filter Bar */}
        {!imgSrc && (
          <div style={styles.filterBar}>
            {(
              ['none', 'grayscale', 'sepia', 'invert', 'blur', 'vintage', 'hue-rotate'] as FilterType[]
            ).map((filter) => (
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
                    backgroundImage: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)',
                  }}
                />
              </button>
            ))}
          </div>
        )}

        <div style={styles.controls}>
          {!imgSrc ? (
            <button onClick={capture} style={styles.captureBtn}>
              <div style={styles.innerCaptureBtn}></div>
            </button>
          ) : (
            <div style={styles.actionButtonGroup}>
              <button onClick={retake} style={styles.secondaryBtn}>
                ⟲ Retake
              </button>
              <button onClick={uploadPhoto} disabled={loading} style={styles.primaryBtn}>
                {loading ? 'Syncing...' : '⬆ Upload to Server'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// --- Styles (extended) ---
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, sans-serif',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '800px',
    marginBottom: '10px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    letterSpacing: '1px',
    margin: 0,
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  redDot: {
    width: '10px',
    height: '10px',
    backgroundColor: '#ff3333',
    borderRadius: '50%',
    boxShadow: '0 0 8px #ff3333',
    animation: 'pulse 1.5s infinite',
  },
  liveText: {
    color: '#ff3333',
    fontWeight: 'bold',
    fontSize: '12px',
    letterSpacing: '1px',
  },
  notification: {
    width: '100%',
    maxWidth: '800px',
    padding: '12px',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: '15px',
    transition: 'opacity 0.3s ease',
  },
  webcamWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '800px',
    aspectRatio: '16/9',
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
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
    width: '40px',
    height: '40px',
    opacity: 0.7,
  },
  videoStream: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  filterBar: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '800px',
    width: '100%',
  },
  filterBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid transparent',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s',
    minWidth: '60px',
  },
  filterLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  filterPreview: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    backgroundImage: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)',
    transition: 'filter 0.2s',
  },
  controls: {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '80px',
  },
  captureBtn: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: '4px solid white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 0.2s',
  },
  innerCaptureBtn: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: 'white',
  },
  actionButtonGroup: {
    display: 'flex',
    gap: '20px',
  },
  secondaryBtn: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  primaryBtn: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 123, 255, 0.4)',
  },
};

export default CameraCapture;
