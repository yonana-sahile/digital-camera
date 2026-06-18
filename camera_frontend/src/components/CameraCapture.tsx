import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';
import PhotoGallery from './PhotoGallery';
import GifMaker from './GifMaker';
import TimeLapse from './TimeLapse';
import PhotoEditor from './PhotoEditor';      // new
import Settings from './Settings';            // new

// --- Type definitions ---
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
type StickerType = 'none' | 'sunglasses' | 'hat' | 'moustache' | 'dogears';

const stickerMap: Record<StickerType, string> = {
  none: '',
  sunglasses: '😎',
  hat: '🧢',
  moustache: '🧔',
  dogears: '🐶',
};

const CameraCapture: React.FC = () => {
  // --- State ---
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [isListening, setIsListening] = useState<boolean>(false);
  const [autoEnhance, setAutoEnhance] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('AdwaShield');
  const [showHistogram, setShowHistogram] = useState<boolean>(false);
  const [histogramData, setHistogramData] = useState<number[]>([]);

  // --- Snapchat features ---
  const [faceDetection, setFaceDetection] = useState<boolean>(false);
  const [selectedSticker, setSelectedSticker] = useState<StickerType>('none');
  const [backgroundBlur, setBackgroundBlur] = useState<boolean>(false);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [faceDetections, setFaceDetections] = useState<faceapi.FaceDetection[]>([]);

  // --- Component toggles ---
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [showGifMaker, setShowGifMaker] = useState<boolean>(false);
  const [showTimeLapse, setShowTimeLapse] = useState<boolean>(false);
  const [timeLapseImages, setTimeLapseImages] = useState<string[]>([]);

  // --- NEW: Photo Editor & Settings ---
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Custom watermark image settings
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(80);
  const [watermarkPosition, setWatermarkPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
  const watermarkImgRef = useRef<HTMLImageElement | null>(null);

  // Pre‑load watermark image when it changes
  useEffect(() => {
    if (watermarkImage) {
      const img = new Image();
      img.onload = () => {
        watermarkImgRef.current = img;
      };
      img.src = watermarkImage;
    } else {
      watermarkImgRef.current = null;
    }
  }, [watermarkImage]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/captures/';

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'user',
  };

  // --- Filters ---
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

  // --- Auto‑enhance ---
  const applyAutoEnhance = (imageData: ImageData): ImageData => {
    const data = imageData.data;
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
    const rangeR = maxR - minR || 1;
    const rangeG = maxG - minG || 1;
    const rangeB = maxB - minB || 1;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = ((data[i] - minR) / rangeR) * 255;
      data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255;
      data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255;
    }
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

  // --- Capture with all effects (synchronous) ---
  const captureWithFilter = useCallback((): string | null => {
    const video = webcamRef.current?.video;
    if (!video) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Background blur (with face preservation)
    if (backgroundBlur) {
      let faceBox = null;
      if (faceDetection && faceDetections.length > 0) {
        const det = faceDetections[0];
        faceBox = det.box;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
        canvas.width = canvas.width;
        ctx.filter = 'blur(20px)';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
        if (faceBox) {
          const { x, y, width, height } = faceBox;
          const pad = 0.3;
          const cx = x + width / 2;
          const cy = y + height / 2;
          const newW = width * (1 + pad);
          const newH = height * (1 + pad);
          const sx = cx - newW / 2;
          const sy = cy - newH / 2;
          const srcX = Math.max(0, sx);
          const srcY = Math.max(0, sy);
          const srcW = Math.min(canvas.width, sx + newW) - srcX;
          const srcH = Math.min(canvas.height, sy + newH) - srcY;
          ctx.drawImage(tempCanvas, srcX, srcY, srcW, srcH, srcX, srcY, srcW, srcH);
        }
      }
    }

    // Auto‑enhance
    if (autoEnhance) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const enhanced = applyAutoEnhance(imageData);
      ctx.putImageData(enhanced, 0, 0);
    }

    // Apply filter
    if (activeFilter !== 'none') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
        canvas.width = canvas.width;
        ctx.filter = filterStyles[activeFilter];
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
      }
    }

    // Draw sticker
    if (selectedSticker !== 'none' && faceDetections.length > 0) {
      const detection = faceDetections[0];
      const box = detection.box;
      const left = box.x,
        top = box.y,
        width = box.width,
        height = box.height;
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const fontSize = Math.min(width, height) * 0.8;
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(stickerMap[selectedSticker], centerX, centerY);
      ctx.shadowBlur = 0;
    }

    // --- Watermark (custom image or text) ---
    if (watermarkImgRef.current) {
      // Draw image watermark
      const img = watermarkImgRef.current;
      const margin = 20;
      let x = 0,
        y = 0;
      const w = img.width,
        h = img.height;
      // Scale if image is too large (max 200px width)
      let scale = 1;
      if (w > 200) scale = 200 / w;
      const drawW = w * scale;
      const drawH = h * scale;

      switch (watermarkPosition) {
        case 'bottom-right':
          x = canvas.width - drawW - margin;
          y = canvas.height - drawH - margin;
          break;
        case 'bottom-left':
          x = margin;
          y = canvas.height - drawH - margin;
          break;
        case 'top-right':
          x = canvas.width - drawW - margin;
          y = margin;
          break;
        case 'top-left':
          x = margin;
          y = margin;
          break;
        case 'center':
          x = (canvas.width - drawW) / 2;
          y = (canvas.height - drawH) / 2;
          break;
      }
      ctx.globalAlpha = watermarkOpacity / 100;
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.globalAlpha = 1.0;
    } else if (watermarkText.trim()) {
      // fallback to text
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);
      ctx.shadowBlur = 0;
    }

    return canvas.toDataURL('image/jpeg');
  }, [
    activeFilter,
    autoEnhance,
    watermarkText,
    backgroundBlur,
    selectedSticker,
    faceDetections,
    faceDetection,
    watermarkPosition,
    watermarkOpacity,
  ]);

  // --- Save to gallery (localStorage) ---
  const savePhotoToGallery = (dataURL: string) => {
    const stored = localStorage.getItem('adwashield_photos');
    let photos: any[] = stored ? JSON.parse(stored) : [];
    const newPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      dataURL: dataURL,
      timestamp: Date.now(),
    };
    photos.unshift(newPhoto);
    localStorage.setItem('adwashield_photos', JSON.stringify(photos));
  };

  // --- Single capture (synchronous) ---
  const performCapture = useCallback((): string | null => {
    const image = captureWithFilter();
    if (image) {
      setImgSrc(image);
      setCapturedImages([image]);
      savePhotoToGallery(image);
      showNotification('Photo captured!', 'info');
      return image;
    } else {
      showNotification('Failed to capture.', 'error');
      return null;
    }
  }, [captureWithFilter]);

  // --- Timer & Burst ---
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
          savePhotoToGallery(img);
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

  // --- Time‑lapse capture handler ---
  const handleTimeLapseCapture = useCallback(() => {
    const image = captureWithFilter();
    if (image) {
      setTimeLapseImages((prev) => [...prev, image]);
      showNotification(`Time‑lapse frame captured (${timeLapseImages.length + 1})`, 'info');
    }
  }, [captureWithFilter, timeLapseImages.length]);

  // --- Upload, Download, Share ---
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

  // --- Voice Commands (updated with new features) ---
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
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

      if (command.includes('capture') || command.includes('take photo')) {
        if (!imgSrc && !isCapturing) startCaptureSequence();
      } else if (command.includes('retake') || command.includes('delete')) {
        if (imgSrc) retake();
      } else if (command.includes('apply')) {
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
      } else if (command.includes('blur')) {
        setBackgroundBlur(!backgroundBlur);
        showNotification(`Background blur ${!backgroundBlur ? 'on' : 'off'}`, 'info');
      } else if (command.includes('sticker')) {
        const stickers: StickerType[] = ['none', 'sunglasses', 'hat', 'moustache', 'dogears'];
        const currentIndex = stickers.indexOf(selectedSticker);
        const nextIndex = (currentIndex + 1) % stickers.length;
        setSelectedSticker(stickers[nextIndex]);
        showNotification(`Sticker: ${stickers[nextIndex]}`, 'info');
      } else if (command.includes('face') || command.includes('detect')) {
        setFaceDetection(!faceDetection);
        showNotification(`Face detection ${!faceDetection ? 'on' : 'off'}`, 'info');
      } else if (command.includes('gallery')) {
        setShowGallery(true);
      } else if (command.includes('gif')) {
        setShowGifMaker(true);
      } else if (command.includes('timelapse') || command.includes('time lapse')) {
        setShowTimeLapse(true);
      } else if (command.includes('settings')) {
        setShowSettings(true);
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
  }, [isListening, startCaptureSequence, imgSrc, isCapturing, selectedSticker, faceDetection, backgroundBlur]);

  // --- Face‑API models ---
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/model/';
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        console.log('Face‑API models loaded');
      } catch (err) {
        console.error('Failed to load face‑api models:', err);
        showNotification('Failed to load face detection models.', 'error');
      }
    };
    loadModels();
  }, []);

  // --- Real‑time overlay ---
  useEffect(() => {
    if (!webcamRef.current?.video || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const drawLoop = async () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (faceDetection && modelsLoaded) {
        try {
          const detections = await faceapi.detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions()
          );
          setFaceDetections(detections);
          if (detections.length > 0) {
            const resized = detections.map((d) =>
              d.forSize(canvas.width, canvas.height)
            );
            faceapi.draw.drawDetections(canvas, resized);
            faceapi.draw.drawFaceLandmarks(canvas, resized);
          } else {
            setFaceDetections([]);
          }
        } catch (err) {
          console.warn('Face detection error:', err);
        }
      }

      if (selectedSticker !== 'none' && faceDetections.length > 0) {
        const detection = faceDetections[0];
        const box = detection.box;
        const left = box.x,
          top = box.y,
          width = box.width,
          height = box.height;
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const fontSize = Math.min(width, height) * 0.8;
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(stickerMap[selectedSticker], centerX, centerY);
        ctx.shadowBlur = 0;
      }

      if (showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        const thirdX = canvas.width / 3;
        const thirdY = canvas.height / 3;
        ctx.beginPath();
        ctx.moveTo(thirdX, 0);
        ctx.lineTo(thirdX, canvas.height);
        ctx.moveTo(2 * thirdX, 0);
        ctx.lineTo(2 * thirdX, canvas.height);
        ctx.moveTo(0, thirdY);
        ctx.lineTo(canvas.width, thirdY);
        ctx.moveTo(0, 2 * thirdY);
        ctx.lineTo(canvas.width, 2 * thirdY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationId = requestAnimationFrame(drawLoop);
    };

    drawLoop();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [faceDetection, modelsLoaded, selectedSticker, faceDetections, showGrid]);

  // --- Histogram ---
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

      {/* Main container */}
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

              {/* Overlay canvas */}
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />

              {countdown !== null && (
                <div style={styles.countdownOverlay}>
                  <span style={styles.countdownNumber}>{countdown}</span>
                </div>
              )}
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

          {/* Toolbar with new buttons */}
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
                <button
                  style={{ ...styles.toolBtn, backgroundColor: faceDetection ? 'rgba(245,87,108,0.2)' : 'transparent' }}
                  onClick={() => setFaceDetection(!faceDetection)}
                  title="Face Detection"
                >
                  👤
                </button>
                <button
                  style={{ ...styles.toolBtn, backgroundColor: backgroundBlur ? 'rgba(245,87,108,0.2)' : 'transparent' }}
                  onClick={() => setBackgroundBlur(!backgroundBlur)}
                  title="Background Blur"
                >
                  🌫️
                </button>
                <select
                  value={selectedSticker}
                  onChange={(e) => setSelectedSticker(e.target.value as StickerType)}
                  style={{ ...styles.select, minWidth: '80px' }}
                  title="Stickers"
                >
                  <option value="none">None</option>
                  <option value="sunglasses">😎</option>
                  <option value="hat">🧢</option>
                  <option value="moustache">🧔</option>
                  <option value="dogears">🐶</option>
                </select>
                {/* NEW BUTTONS */}
                <button
                  style={{ ...styles.toolBtn }}
                  onClick={() => setShowGallery(true)}
                  title="Gallery"
                >
                  🖼️
                </button>
                <button
                  style={{ ...styles.toolBtn }}
                  onClick={() => setShowGifMaker(true)}
                  title="GIF Maker"
                >
                  🎞️
                </button>
                <button
                  style={{ ...styles.toolBtn }}
                  onClick={() => setShowTimeLapse(true)}
                  title="Time‑lapse"
                >
                  ⏱️
                </button>
                <button
                  style={{ ...styles.toolBtn }}
                  onClick={() => setShowSettings(true)}
                  title="Settings"
                >
                  ⚙️
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
                <button
                  onClick={() => {
                    setEditorImage(imgSrc);
                    setShowEditor(true);
                  }}
                  style={styles.secondaryBtn}
                >
                  ✏️ Edit
                </button>
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

      {/* === New Components === */}
      <PhotoGallery
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />
      <GifMaker
        images={capturedImages}
        isOpen={showGifMaker}
        onClose={() => setShowGifMaker(false)}
      />
      <TimeLapse
        isOpen={showTimeLapse}
        onClose={() => {
          setShowTimeLapse(false);
          setTimeLapseImages([]);
        }}
        onCapture={handleTimeLapseCapture}
      />
      <PhotoEditor
        imageSrc={editorImage || ''}
        isOpen={showEditor}
        onClose={(editedImage) => {
          setShowEditor(false);
          if (editedImage) {
            setImgSrc(editedImage);
            // Optionally update the gallery or re‑save
            // We can replace the current gallery entry, but for simplicity we'll save as new.
            savePhotoToGallery(editedImage);
            showNotification('Edited photo saved!', 'success');
          }
          setEditorImage(null);
        }}
      />
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        watermarkText={watermarkText}
        onWatermarkTextChange={setWatermarkText}
        watermarkImage={watermarkImage}
        onWatermarkImageChange={setWatermarkImage}
        watermarkOpacity={watermarkOpacity}
        onWatermarkOpacityChange={setWatermarkOpacity}
        watermarkPosition={watermarkPosition}
        onWatermarkPositionChange={setWatermarkPosition}
      />
    </div>
  );
};

// --- Styles (unchanged) ---
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
    flexWrap: 'wrap',
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
