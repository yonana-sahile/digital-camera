import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';
import {
  Camera,
  Timer,
  SlidersHorizontal,
  Palette,
  Images,
  Film,
  Clock,
  Settings as SettingsIcon,
  ScanFace,
  Focus,
  Mic,
  Sparkles,
  BarChart3,
  Grid3x3,
  RotateCcw,
  Download,
  Share2,
  Pencil,
  UploadCloud,
  X,
} from 'lucide-react';
import PhotoGallery from './PhotoGallery';
import GifMaker from './GifMaker';
import TimeLapse from './TimeLapse';
import PhotoEditor from './PhotoEditor';
import Settings from './Settings';

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
  | 'vignette'
  | 'fade'
  | 'clarendon'
  | 'lark'
  | 'gingham'
  | 'juno'
  | 'ludwig'
  | 'reyes'
  | 'valencia'
  | 'xpro2'
  | 'willow'
  | 'lo-fi'
  | 'earlybird'
  | 'toaster'
  | '1977'
  | 'aden'
  | 'hudson'
  | 'kelvin'
  | 'mayfair'
  | 'nashville'
  | 'perpetua'
  | 'rise'
  | 'sierra'
  | 'sutro'
  | 'walden';

type CaptureMode = 'single' | 'timer' | 'burst';
type StickerType = 'none' | 'sunglasses' | 'hat' | 'moustache' | 'dogears';

const stickerMap: Record<StickerType, string> = {
  none: '',
  sunglasses: '😎',
  hat: '🧢',
  moustache: '🧔',
  dogears: '🐶',
};

interface SidebarAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  from: string;
  to: string;
}

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
  fade: 'brightness(1.1) contrast(0.85) saturate(0.8) sepia(0.1)',
  clarendon: 'brightness(1.1) contrast(1.2) saturate(1.35)',
  lark: 'brightness(1.15) contrast(0.85) saturate(0.85) hue-rotate(2deg)',
  gingham: 'brightness(1.05) contrast(0.9) saturate(0.85) hue-rotate(5deg)',
  juno: 'brightness(1.1) contrast(1.1) saturate(1.3) hue-rotate(-3deg)',
  ludwig: 'brightness(1.05) contrast(0.95) saturate(0.9) sepia(0.05)',
  reyes: 'brightness(1.1) contrast(0.9) saturate(0.75) sepia(0.15)',
  valencia: 'brightness(1.1) contrast(1.05) saturate(1.15) sepia(0.08)',
  xpro2: 'brightness(1.05) contrast(1.15) saturate(1.2) sepia(0.1)',
  willow: 'brightness(1.1) contrast(0.95) saturate(0.75) sepia(0.05) hue-rotate(2deg)',
  'lo-fi': 'brightness(1.1) contrast(1.3) saturate(1.5)',
  earlybird: 'brightness(1.1) contrast(0.9) saturate(1.1) sepia(0.2) hue-rotate(-2deg)',
  toaster: 'brightness(1.05) contrast(0.95) saturate(0.85) sepia(0.3) hue-rotate(-5deg)',
  '1977': 'brightness(1.1) contrast(1.05) saturate(1.1) hue-rotate(-5deg)',
  aden: 'brightness(1.1) contrast(0.9) saturate(0.85) sepia(0.1) hue-rotate(2deg)',
  hudson: 'brightness(1.2) contrast(0.9) saturate(1.1) hue-rotate(-5deg)',
  kelvin: 'brightness(1.1) contrast(1.05) saturate(1.2) sepia(0.3) hue-rotate(10deg)',
  mayfair: 'brightness(1.1) contrast(1.05) saturate(1.15) hue-rotate(-3deg)',
  nashville: 'brightness(1.1) contrast(0.9) saturate(0.85) sepia(0.15) hue-rotate(5deg)',
  perpetua: 'brightness(1.1) contrast(1.05) saturate(1.15) sepia(0.05)',
  rise: 'brightness(1.05) contrast(0.9) saturate(0.9) sepia(0.2) hue-rotate(3deg)',
  sierra: 'brightness(1.1) contrast(0.9) saturate(0.85) sepia(0.1)',
  sutro: 'brightness(1.05) contrast(1.1) saturate(1.1) sepia(0.15) hue-rotate(-3deg)',
  walden: 'brightness(1.1) contrast(0.9) saturate(0.85) sepia(0.1) hue-rotate(2deg)',
};

// Mirror helper (capture fix)
function flipCanvasHorizontally(canvas: HTMLCanvasElement) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  tempCtx.translate(canvas.width, 0);
  tempCtx.scale(-1, 1);
  tempCtx.drawImage(canvas, 0, 0);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
  }
}

const CameraCapture: React.FC = () => {
  // --- Mobile Detection State ---
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Check immediately on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [faceDetection, setFaceDetection] = useState<boolean>(false);
  const [selectedSticker, setSelectedSticker] = useState<StickerType>('none');
  const [backgroundBlur, setBackgroundBlur] = useState<boolean>(false);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [faceDetections, setFaceDetections] = useState<faceapi.FaceDetection[]>([]);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [showGifMaker, setShowGifMaker] = useState<boolean>(false);
  const [showTimeLapse, setShowTimeLapse] = useState<boolean>(false);
  const [timeLapseImages, setTimeLapseImages] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(80);
  const [watermarkPosition, setWatermarkPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
  const watermarkImgRef = useRef<HTMLImageElement | null>(null);

  // UPDATED API_URL DIRECTLY TO YOUR RENDER INSTANCE
  const API_URL = import.meta.env.VITE_API_URL || 'https://digital-camera-backend.onrender.com/captures/';

  // Dynamic video constraints based on mobile vs desktop
  const videoConstraints = {
    width: isMobile ? 720 : 1280,
    height: isMobile ? 1280 : 720,
    facingMode: 'user'
  };

  // --- Notifications ---
  const showNotification = (text: string, type: 'success' | 'error' | 'info') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Auto‑enhance ---
  const applyAutoEnhance = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (g < minG) minG = g; if (g > maxG) maxG = g;
      if (b < minB) minB = b; if (b > maxB) maxB = b;
    }
    const rangeR = maxR - minR || 1, rangeG = maxG - minG || 1, rangeB = maxB - minB || 1;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = ((data[i] - minR) / rangeR) * 255;
      data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255;
      data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255;
    }
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const boost = 1.2;
      data[i] = Math.min(255, gray + (r - gray) * boost);
      data[i + 1] = Math.min(255, gray + (g - gray) * boost);
      data[i + 2] = Math.min(255, gray + (b - gray) * boost);
    }
    return imageData;
  };

  // --- Capture ---
  const captureWithFilter = useCallback((): string | null => {
    const video = webcamRef.current?.video;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    flipCanvasHorizontally(canvas);  // mirror fix

    if (backgroundBlur) {
      let faceBox = null;
      if (faceDetection && faceDetections.length > 0) {
        const det = faceDetections[0];
        faceBox = det.box;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
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
          const cx = x + width / 2, cy = y + height / 2;
          const newW = width * (1 + pad), newH = height * (1 + pad);
          const sx = cx - newW / 2, sy = cy - newH / 2;
          const srcX = Math.max(0, sx), srcY = Math.max(0, sy);
          const srcW = Math.min(canvas.width, sx + newW) - srcX;
          const srcH = Math.min(canvas.height, sy + newH) - srcY;
          ctx.drawImage(tempCanvas, srcX, srcY, srcW, srcH, srcX, srcY, srcW, srcH);
        }
      }
    }

    if (autoEnhance) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const enhanced = applyAutoEnhance(imageData);
      ctx.putImageData(enhanced, 0, 0);
    }

    if (activeFilter !== 'none') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
        canvas.width = canvas.width;
        ctx.filter = filterStyles[activeFilter];
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
      }
    }

    if (selectedSticker !== 'none' && faceDetections.length > 0) {
      const detection = faceDetections[0];
      const box = detection.box;
      const left = box.x, top = box.y, width = box.width, height = box.height;
      const centerX = left + width / 2, centerY = top + height / 2;
      const fontSize = Math.min(width, height) * 0.8;
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
      ctx.fillText(stickerMap[selectedSticker], centerX, centerY);
      ctx.shadowBlur = 0;
    }

    if (watermarkImgRef.current) {
      const img = watermarkImgRef.current;
      const margin = 20;
      let x = 0, y = 0;
      const w = img.width, h = img.height;
      let scale = 1;
      if (w > 200) scale = 200 / w;
      const drawW = w * scale, drawH = h * scale;
      switch (watermarkPosition) {
        case 'bottom-right': x = canvas.width - drawW - margin; y = canvas.height - drawH - margin; break;
        case 'bottom-left': x = margin; y = canvas.height - drawH - margin; break;
        case 'top-right': x = canvas.width - drawW - margin; y = margin; break;
        case 'top-left': x = margin; y = margin; break;
        case 'center': x = (canvas.width - drawW) / 2; y = (canvas.height - drawH) / 2; break;
      }
      ctx.globalAlpha = watermarkOpacity / 100;
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.globalAlpha = 1.0;
    } else if (watermarkText.trim()) {
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);
      ctx.shadowBlur = 0;
    }
    return canvas.toDataURL('image/jpeg');
  },
           [activeFilter,
           autoEnhance,
           watermarkText,
            backgroundBlur,
             selectedSticker,
            faceDetections,
             faceDetection,
             watermarkPosition,
            watermarkOpacity]);

  // --- Gallery save (unchanged) ---
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

  // --- Pre‑load watermark (unchanged) ---
  useEffect(() => {
    if (watermarkImage) {
      const img = new Image();
      img.onload = () => { watermarkImgRef.current = img; };
      img.src = watermarkImage;
    } else {
      watermarkImgRef.current = null;
    }
  }, [watermarkImage]);

  // --- Single capture (unchanged) ---
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

  // --- Timer & Burst (unchanged) ---
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

  // --- Time‑lapse handler (unchanged) ---
  const handleTimeLapseCapture = useCallback(() => {
    const image = captureWithFilter();
    if (image) {
      setTimeLapseImages((prev) => [...prev, image]);
      showNotification(`Time‑lapse frame captured (${timeLapseImages.length + 1})`, 'info');
    }
  }, [captureWithFilter, timeLapseImages.length]);

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
      // @ts-ignore
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

  // --- Voice Commands (unchanged) ---
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
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

    if (isListening) { recognition.start(); } else { recognition.stop(); }
    return () => { recognition.stop(); };
  }, [isListening, startCaptureSequence, imgSrc, isCapturing, selectedSticker, faceDetection, backgroundBlur]);

  // --- Face‑API models (local) ---
  const MODEL_URL = "/models";
  useEffect(() => {
    const loadModels = async () => {
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

  // --- Real‑time overlay (unchanged) ---
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
          const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
          setFaceDetections(detections);
          if (detections.length > 0) {
            const resized = detections.map((d) => d.forSize(canvas.width, canvas.height));
            faceapi.draw.drawDetections(canvas, resized);
            // @ts-ignore
            faceapi.draw.drawFaceLandmarks(canvas, resized);
          } else {
            setFaceDetections([]);
          }
        } catch (err) { console.warn('Face detection error:', err); }
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
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [faceDetection, modelsLoaded, selectedSticker, faceDetections, showGrid]);

  // --- Histogram (unchanged) ---
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

  // ===================== SIDEBAR ACTION GROUPS =====================
  const captureModes: SidebarAction[] = [
    { id: 'single', label: 'Single shot', icon: <Camera size={26} strokeWidth={1.8} />, active: mode === 'single', onClick: () => setMode('single'), from: '#fbbf24', to: '#f97316' },
    { id: 'timer', label: 'Self-timer', icon: <Timer size={26} strokeWidth={1.8} />, active: mode === 'timer', onClick: () => setMode('timer'), from: '#fb7185', to: '#e11d48' },
    { id: 'burst', label: 'Burst', icon: <SlidersHorizontal size={26} strokeWidth={1.8} />, active: mode === 'burst', onClick: () => setMode('burst'), from: '#f87171', to: '#dc2626' },
  ];

  const workspaceActions: SidebarAction[] = [
    { id: 'filters', label: 'Filters', icon: <Palette size={26} strokeWidth={1.8} />, active: showFilters, onClick: () => setShowFilters(!showFilters), from: '#c084fc', to: '#9333ea' },
    { id: 'gallery', label: 'Gallery', icon: <Images size={26} strokeWidth={1.8} />, onClick: () => setShowGallery(true), from: '#60a5fa', to: '#2563eb' },
    { id: 'gif', label: 'GIF maker', icon: <Film size={26} strokeWidth={1.8} />, onClick: () => setShowGifMaker(true), from: '#38bdf8', to: '#0284c7' },
    { id: 'timelapse', label: 'Time-lapse', icon: <Clock size={26} strokeWidth={1.8} />, onClick: () => setShowTimeLapse(true), from: '#2dd4bf', to: '#0d9488' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={26} strokeWidth={1.8} />, onClick: () => setShowSettings(true), from: '#a1a1aa', to: '#52525b' },
  ];

  const aiActions: SidebarAction[] = [
    { id: 'face', label: 'Face detection', icon: <ScanFace size={26} strokeWidth={1.8} />, active: faceDetection, onClick: () => setFaceDetection(!faceDetection), from: '#f472b6', to: '#db2777' },
    { id: 'blur', label: 'Background blur', icon: <Focus size={26} strokeWidth={1.8} />, active: backgroundBlur, onClick: () => setBackgroundBlur(!backgroundBlur), from: '#a78bfa', to: '#7c3aed' },
    { id: 'voice', label: 'Voice control', icon: <Mic size={26} strokeWidth={1.8} />, active: isListening, onClick: () => setIsListening(!isListening), from: '#fb923c', to: '#ea580c' },
    { id: 'enhance', label: 'Auto-enhance', icon: <Sparkles size={26} strokeWidth={1.8} />, active: autoEnhance, onClick: () => setAutoEnhance(!autoEnhance), from: '#facc15', to: '#ca8a04' },
    { id: 'histogram', label: 'Histogram', icon: <BarChart3 size={26} strokeWidth={1.8} />, active: showHistogram, onClick: () => setShowHistogram(!showHistogram), from: '#4ade80', to: '#16a34a' },
    { id: 'grid', label: 'Grid overlay', icon: <Grid3x3 size={26} strokeWidth={1.8} />, active: showGrid, onClick: () => setShowGrid(!showGrid), from: '#22d3ee', to: '#0891b2' },
  ];

  const IconButton: React.FC<{ action: SidebarAction }> = ({ action }) => (
    <button
      key={action.id}
      className={`sidebar-btn ${action.active ? 'active' : ''}`}
      onClick={action.onClick}
      aria-label={action.label}
      aria-pressed={!!action.active}
      style={{
        // @ts-ignore custom properties
        '--accent-from': action.from,
        '--accent-to': action.to,
        color: action.active ? '#ffffff' : action.from,
      }}
    >
      <span className="sidebar-btn-icon">{action.icon}</span>
      <span className="sidebar-btn-tip">{action.label}</span>
    </button>
  );

  // ===================== RENDER =====================
  return (
    <div style={styles.pageContainer}>
      <style>{`
        * { box-sizing: border-box; }

        .filter-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid transparent;
          border-radius: 12px;
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
          width: 100%;
        }
        .filter-btn.active {
          border-color: #f5576c;
          background: rgba(245, 87, 108, 0.15);
        }
        .filter-btn:hover {
          background: rgba(255,255,255,0.09);
          transform: translateX(2px);
        }

        .mode-btn.active {
          background: rgba(245, 87, 108, 0.2);
          border-color: #f5576c;
        }

        /* ---------- Sidebar icon rail ---------- */
        .sidebar-group-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #6b6b6f;
          padding: 2px 4px 4px;
          width: 100%;
          text-align: left;
        }

        .sidebar-btn {
          position: relative;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          cursor: pointer;
          color: #b9b9bd;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease,
                      transform 0.14s ease, box-shadow 0.2s ease;
          width: 56px;
          height: 56px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0;
          flex-shrink: 0;
        }
        .sidebar-btn-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          line-height: 0;
          filter: drop-shadow(0 0 0 rgba(0,0,0,0));
          transition: filter 0.18s ease, transform 0.18s ease;
        }
        .sidebar-btn:hover {
          background: rgba(255,255,255,0.09);
          border-color: color-mix(in srgb, var(--accent-from) 55%, transparent);
          color: var(--accent-from);
          transform: translateY(-2px) scale(1.04);
        }
        .sidebar-btn:hover .sidebar-btn-icon {
          filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent-from) 65%, transparent));
        }
        .sidebar-btn:active {
          transform: translateY(0) scale(0.97);
        }
        .sidebar-btn.active {
          border-color: color-mix(in srgb, var(--accent-to) 70%, transparent);
          background: linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%);
          color: #ffffff;
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--accent-to) 45%, transparent),
            0 6px 18px color-mix(in srgb, var(--accent-to) 55%, transparent),
            0 0 22px color-mix(in srgb, var(--accent-from) 40%, transparent);
        }
        .sidebar-btn.active .sidebar-btn-icon {
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35));
          transform: scale(1.05);
        }
        .sidebar-btn.active::after {
          content: '';
          position: absolute;
          left: -11px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 22px;
          border-radius: 3px;
          background: linear-gradient(180deg, var(--accent-from) 0%, var(--accent-to) 100%);
          box-shadow: 0 0 10px color-mix(in srgb, var(--accent-from) 70%, transparent);
        }
        .sidebar-btn:focus-visible {
          outline: 2px solid var(--accent-from);
          outline-offset: 2px;
        }

        /* Tooltip */
        .sidebar-btn-tip {
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%) translateX(-4px);
          background: #1c1c1f;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 8px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          box-shadow: 0 6px 18px rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.08);
          transition: opacity 0.14s ease, transform 0.14s ease;
          z-index: 40;
        }
        .sidebar-btn-tip::before {
          content: '';
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: #1c1c1f;
        }
        .sidebar-btn:hover .sidebar-btn-tip {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }

        .sidebar-select {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 8px 6px;
          color: white;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          width: 56px;
          height: 34px;
          text-align: center;
          appearance: none;
          transition: border-color 0.16s ease, background 0.16s ease;
          flex-shrink: 0;
        }
        .sidebar-select:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }

        /* --- MOBILE RESPONSIVENESS OVERRIDES --- */
        @media (max-width: 768px) {
          .sidebar-btn-tip {
            display: none !important; /* Hide tooltips on mobile to save space */
          }
          .sidebar-group-label {
            display: none !important; /* Hide labels for a cleaner bottom bar */
          }
          .sidebar-btn {
            width: 48px !important;
            height: 48px !important;
          }
          .sidebar-select {
            height: 48px !important;
          }
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
      <div style={{ ...styles.header, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0' }}>
        <h1 style={styles.title}>📷 Web Digital Camera</h1>
        <div style={styles.liveIndicator}>
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={styles.redDot} />
          <span style={styles.liveText}>CAMERA</span>
        </div>
      </div>

      {/* Main container: left sidebar + camera area */}
      <div style={{ ...styles.mainContainer, flexDirection: isMobile ? 'column-reverse' : 'row' }}>

        {/* SIDEBAR (Now acts as a bottom Nav on Mobile) */}
        <div style={{
          ...styles.sidebar,
          flexDirection: isMobile ? 'row' : 'column',
          minWidth: isMobile ? '100%' : '90px',
          maxWidth: isMobile ? '100%' : '90px',
          position: isMobile ? 'relative' : 'sticky',
          top: isMobile ? '0' : '80px',
          overflowX: isMobile ? 'auto' : 'visible',
          padding: isMobile ? '12px 10px' : '18px 14px',
          zIndex: 10
        }}>
          {/* Capture modes */}
          <div style={{ ...styles.sidebarGroup, flexDirection: isMobile ? 'row' : 'column', width: isMobile ? 'auto' : '100%' }}>
            <span className="sidebar-group-label">Capture</span>
            {captureModes.map((action) => <IconButton key={action.id} action={action} />)}
          </div>

          <div style={{ ...styles.sidebarDivider, width: isMobile ? '1px' : '70%', height: isMobile ? '40px' : '1px', margin: isMobile ? '0 10px' : '2px 0' }} />

          {/* Feature toggles */}
          <div style={{ ...styles.sidebarGroup, flexDirection: isMobile ? 'row' : 'column', width: isMobile ? 'auto' : '100%' }}>
            <span className="sidebar-group-label">Workspace</span>
            {workspaceActions.map((action) => <IconButton key={action.id} action={action} />)}
          </div>

          <div style={{ ...styles.sidebarDivider, width: isMobile ? '1px' : '70%', height: isMobile ? '40px' : '1px', margin: isMobile ? '0 10px' : '2px 0' }} />

          {/* AI & tools */}
          <div style={{ ...styles.sidebarGroup, flexDirection: isMobile ? 'row' : 'column', width: isMobile ? 'auto' : '100%' }}>
            <span className="sidebar-group-label">AI &amp; tools</span>
            {aiActions.map((action) => <IconButton key={action.id} action={action} />)}
          </div>

          <div style={{ ...styles.sidebarDivider, width: isMobile ? '1px' : '70%', height: isMobile ? '40px' : '1px', margin: isMobile ? '0 10px' : '2px 0' }} />

          {/* Stickers & timer/burst options */}
          <div style={{ ...styles.sidebarGroup, flexDirection: isMobile ? 'row' : 'column', width: isMobile ? 'auto' : '100%' }}>
            <span className="sidebar-group-label">Options</span>
            <select
              value={selectedSticker}
              onChange={(e) => setSelectedSticker(e.target.value as StickerType)}
              className="sidebar-select"
              title="Stickers"
            >
              <option value="none">None</option>
              <option value="sunglasses">😎</option>
              <option value="hat">🧢</option>
              <option value="moustache">🧔</option>
              <option value="dogears">🐶</option>
            </select>
            {mode === 'timer' && (
              <select
                value={timerDelay}
                onChange={(e) => setTimerDelay(Number(e.target.value))}
                className="sidebar-select"
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
                className="sidebar-select"
              >
                <option value={3}>3x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            )}
          </div>
        </div>

        {/* CENTER – Camera and main controls */}
        <div style={{ ...styles.centerArea, width: '100%' }}>
          {/* Camera Preview – wider */}
          <motion.div
            style={{ ...styles.webcamWrapper, aspectRatio: isMobile ? '3/4' : '16/9', maxHeight: isMobile ? '70vh' : 'none' }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div style={styles.cameraOverlay}>
              <div style={{ ...styles.corner, top: 0, left: 0, borderTop: '3px solid rgba(255,255,255,0.6)', borderLeft: '3px solid rgba(255,255,255,0.6)' }} />
              <div style={{ ...styles.corner, top: 0, right: 0, borderTop: '3px solid rgba(255,255,255,0.6)', borderRight: '3px solid rgba(255,255,255,0.6)' }} />
              <div style={{ ...styles.corner, bottom: 0, left: 0, borderBottom: '3px solid rgba(255,255,255,0.6)', borderLeft: '3px solid rgba(255,255,255,0.6)' }} />
              <div style={{ ...styles.corner, bottom: 0, right: 0, borderBottom: '3px solid rgba(255,255,255,0.6)', borderRight: '3px solid rgba(255,255,255,0.6)' }} />
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

          {/* Controls – capture button and post‑capture actions */}
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
              <motion.div style={styles.actionButtonGroup} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button onClick={retake} style={styles.secondaryBtn}>
                  <RotateCcw size={16} strokeWidth={2} /> Retake
                </button>
                <button onClick={downloadImage} style={styles.secondaryBtn}>
                  <Download size={16} strokeWidth={2} /> Download
                </button>
                {('share' in navigator) && (
                  <button onClick={shareImage} style={styles.secondaryBtn}>
                    <Share2 size={16} strokeWidth={2} /> Share
                  </button>
                )}
                <button onClick={() => { setEditorImage(imgSrc); setShowEditor(true); }} style={styles.secondaryBtn}>
                  <Pencil size={16} strokeWidth={2} /> Edit
                </button>
                <motion.button
                  onClick={uploadPhoto}
                  disabled={loading}
                  style={styles.primaryBtn}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <UploadCloud size={16} strokeWidth={2} /> {loading ? 'Syncing...' : 'Upload'}
                </motion.button>
              </motion.div>
            )}
          </div>

          {capturedImages.length > 1 && (
            <div style={styles.burstPreviews}>
              {capturedImages.map((img, idx) => <img key={idx} src={img} alt={`burst-${idx}`} style={styles.burstThumb} />)}
            </div>
          )}

          <div style={styles.keyHint}>
            <span>Space: Capture &nbsp;|&nbsp; R: Retake &nbsp;|&nbsp; Mic icon: Voice</span>
          </div>
        </div>
      </div>

      {/* Filter sidebar (slide‑in) */}
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
        <button onClick={() => setShowFilters(false)} style={styles.closeSidebar}>
          <X size={18} strokeWidth={2} />
        </button>
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
          'fade',
          'clarendon',
          'lark',
          'gingham',
          'juno',
          'ludwig',
          'reyes',
          'valencia',
          'xpro2',
          'willow',
          'lo-fi',
          'earlybird',
          'toaster',
          '1977',
          'aden',
          'hudson',
          'kelvin',
          'mayfair',
          'nashville',
          'perpetua',
          'rise',
          'sierra',
          'sutro',
          'walden',
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

      {/* Modals */}
      <PhotoGallery isOpen={showGallery} onClose={() => setShowGallery(false)} />
      <GifMaker images={capturedImages} isOpen={showGifMaker} onClose={() => setShowGifMaker(false)} />
      <TimeLapse
        isOpen={showTimeLapse}
        onClose={() => { setShowTimeLapse(false); setTimeLapseImages([]); }}
        onCapture={handleTimeLapseCapture}
      />
      <PhotoEditor
        imageSrc={editorImage || ''}
        isOpen={showEditor}
        onClose={(editedImage) => {
          setShowEditor(false);
          if (editedImage) {
            setImgSrc(editedImage);
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

// ===================== STYLES =====================
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
    maxWidth: '1200px',
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
    display: 'flex',
    width: '100%',
    maxWidth: '1200px',
    gap: '20px',
    position: 'relative',
  },
  // ---------- LEFT SIDEBAR ----------
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '18px 14px',
    background: 'rgba(20,20,20,0.7)',
    backdropFilter: 'blur(20px)',
    borderRadius: '22px',
    border: '1px solid rgba(255,255,255,0.06)',
    minWidth: '90px',
    maxWidth: '90px',
    gap: '10px',
    height: 'fit-content',
    position: 'sticky',
    top: '80px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  sidebarGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
  },
  sidebarDivider: {
    width: '70%',
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
    margin: '2px 0',
  },
  // ---------- CENTER AREA ----------
  centerArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
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
  controls: {
    marginTop: '20px',
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
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  secondaryBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  primaryBtn: {
    padding: '10px 28px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(245, 87, 108, 0.4)',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  burstPreviews: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
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
    marginTop: '10px',
    fontSize: '12px',
    color: '#666',
    letterSpacing: '0.5px',
  },
  // ---------- FILTER SIDEBAR ----------
  filterSidebar: {
    position: 'fixed',
    left: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '260px',
    maxHeight: '80vh',
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
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '6px',
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
};

export default CameraCapture;
