import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, StopCircle, X } from 'lucide-react';

interface TimeLapseProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: () => void; // captures one frame
}

const TimeLapse: React.FC<TimeLapseProps> = ({ isOpen, onClose, onCapture }) => {
  const [intervalSeconds, setIntervalSeconds] = useState(2);
  const [totalShots, setTotalShots] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingShots, setRemainingShots] = useState(0);
  const [nextShotIn, setNextShotIn] = useState(0);

  // Use refs to avoid stale closures
  const intervalRef = useRef(intervalSeconds);
  const totalShotsRef = useRef(totalShots);
  const remainingRef = useRef(remainingShots);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = intervalSeconds;
    totalShotsRef.current = totalShots;
    remainingRef.current = remainingShots;
  }, [intervalSeconds, totalShots, remainingShots]);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const captureShot = () => {
    onCapture();
    if (remainingRef.current <= 1) {
      // finished
      setIsRunning(false);
      setRemainingShots(0);
      setNextShotIn(0);
      clearTimers();
    } else {
      const newRemaining = remainingRef.current - 1;
      setRemainingShots(newRemaining);
      remainingRef.current = newRemaining;
      scheduleNext();
    }
  };

  const scheduleNext = () => {
    clearTimers();
    setNextShotIn(intervalRef.current);

    // Countdown every second
    let count = intervalRef.current;
    countdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
      }
      setNextShotIn(count);
    }, 1000);

    // Capture after interval
    timerRef.current = setTimeout(() => {
      captureShot();
    }, intervalRef.current * 1000);
  };

  const startTimeLapse = () => {
    setRemainingShots(totalShots);
    remainingRef.current = totalShots;
    setIsRunning(true);
    scheduleNext();
  };

  const stopTimeLapse = () => {
    clearTimers();
    setIsRunning(false);
    setRemainingShots(0);
    setNextShotIn(0);
  };

  const handleClose = () => {
    stopTimeLapse();
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  const progress = totalShots > 0 ? ((totalShots - remainingShots) / totalShots) * 100 : 0;
  const countdownProgress = intervalSeconds > 0 ? ((intervalSeconds - nextShotIn) / intervalSeconds) * 100 : 100;

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
          <h2 style={styles.title}>
            <Clock size={20} /> Time‑lapse
          </h2>
          <button onClick={handleClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {!isRunning ? (
            <>
              {/* Settings */}
              <div style={styles.settingsGrid}>
                <label style={styles.settingLabel}>
                  Interval (seconds)
                  <input
                    type="number"
                    value={intervalSeconds}
                    onChange={(e) => setIntervalSeconds(Math.max(1, Number(e.target.value)))}
                    min={1} max={60} step={1}
                    style={styles.input}
                  />
                </label>
                <label style={styles.settingLabel}>
                  Total shots
                  <input
                    type="number"
                    value={totalShots}
                    onChange={(e) => setTotalShots(Math.max(2, Number(e.target.value)))}
                    min={2} max={100} step={1}
                    style={styles.input}
                  />
                </label>
              </div>
              <button onClick={startTimeLapse} style={styles.startBtn}>
                <Play size={16} /> Start Time‑lapse
              </button>
            </>
          ) : (
            <>
              {/* Progress Circle */}
              <div style={styles.progressSection}>
                <div style={styles.circleContainer}>
                  {/* Circular progress bar */}
                  <svg width="160" height="160" style={styles.progressSvg}>
                    <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <motion.circle
                      cx="80" cy="80" r="70" fill="none"
                      stroke="url(#gradient)" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                      style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f093fb" />
                        <stop offset="100%" stopColor="#f5576c" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Center text */}
                  <div style={styles.circleCenter}>
                    <div style={styles.shotsRemaining}>{remainingShots}</div>
                    <div style={styles.shotsLabel}>left</div>
                  </div>
                </div>
                {/* Countdown bar */}
                <div style={styles.countdownBar}>
                  <div style={styles.countdownLabel}>Next shot in {nextShotIn}s</div>
                  <div style={styles.countdownTrack}>
                    <motion.div
                      style={{
                        ...styles.countdownFill,
                        width: `${countdownProgress}%`,
                        background: `linear-gradient(90deg, #f093fb, #f5576c)`,
                      }}
                      animate={{ width: `${countdownProgress}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </div>
                </div>
              </div>

              <button onClick={stopTimeLapse} style={styles.stopBtn}>
                <StopCircle size={16} /> Stop Early
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ===================== STYLES =====================
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(12px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1100, padding: '20px',
    fontFamily: "'Inter', sans-serif",
  },
  modal: {
    background: '#131316',
    borderRadius: '24px',
    padding: '24px',
    maxWidth: '480px',
    width: '100%',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff',
    width: 36, height: 36, borderRadius: '50%', display: 'flex',
    justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
  },
  content: {
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  settingsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
  },
  settingLabel: {
    display: 'flex', flexDirection: 'column', gap: 6,
    color: '#ccc', fontSize: '14px', fontWeight: 500,
  },
  input: {
    padding: '10px 12px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px',
    outline: 'none',
  },
  startBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px 0', borderRadius: '30px',
    border: 'none', background: 'linear-gradient(135deg, #f093fb, #f5576c)',
    color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(245,87,108,0.4)',
  },
  progressSection: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
  },
  circleContainer: {
    position: 'relative', width: 160, height: 160,
  },
  progressSvg: {
    transform: 'rotate(-90deg)',
  },
  circleCenter: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
  },
  shotsRemaining: {
    fontSize: '36px', fontWeight: 700, color: '#fff', lineHeight: 1,
  },
  shotsLabel: {
    fontSize: '12px', color: '#aaa', marginTop: 4,
  },
  countdownBar: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: 6,
  },
  countdownLabel: {
    fontSize: '14px', color: '#ccc', textAlign: 'center',
  },
  countdownTrack: {
    width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  countdownFill: {
    height: '100%', borderRadius: 3,
  },
  stopBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 0', borderRadius: '30px',
    border: '1px solid rgba(255,80,80,0.3)', background: 'rgba(255,80,80,0.1)',
    color: '#ff6b6b', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
  },
};

export default TimeLapse;
