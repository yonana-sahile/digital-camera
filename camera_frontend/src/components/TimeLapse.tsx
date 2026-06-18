import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TimeLapseProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (count: number) => void; // callback to capture one frame
}

const TimeLapse: React.FC<TimeLapseProps> = ({ isOpen, onClose, onCapture }) => {
  const [intervalSeconds, setIntervalSeconds] = useState<number>(2);
  const [totalShots, setTotalShots] = useState<number>(10);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [remainingShots, setRemainingShots] = useState<number>(0);
  const [nextShotIn, setNextShotIn] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    if (isRunning && remainingShots > 0) {
      // countdown to next shot
      setNextShotIn(intervalSeconds);
      countdownTimer = setInterval(() => {
        setNextShotIn((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);

      // capture after intervalSeconds
      timer = setTimeout(() => {
        onCapture(remainingShots);
        setRemainingShots((prev) => prev - 1);
      }, intervalSeconds * 1000);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(countdownTimer);
    };
  }, [isRunning, remainingShots, intervalSeconds, onCapture]);

  const startTimeLapse = () => {
    setRemainingShots(totalShots);
    setIsRunning(true);
  };

  const stopTimeLapse = () => {
    setIsRunning(false);
    setRemainingShots(0);
    setNextShotIn(0);
  };

  const handleClose = () => {
    stopTimeLapse();
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
          <h2 style={styles.title}>⏱️ Time‑lapse</h2>
          <button onClick={handleClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          {!isRunning ? (
            <>
              <div style={styles.controls}>
                <label style={styles.label}>
                  Interval (seconds):
                  <input
                    type="number"
                    value={intervalSeconds}
                    onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                    min={1}
                    max={60}
                    step={1}
                    style={styles.input}
                  />
                </label>
                <label style={styles.label}>
                  Total shots:
                  <input
                    type="number"
                    value={totalShots}
                    onChange={(e) => setTotalShots(Number(e.target.value))}
                    min={2}
                    max={100}
                    step={1}
                    style={styles.input}
                  />
                </label>
              </div>
              <button onClick={startTimeLapse} style={styles.startBtn}>
                ▶ Start Time‑lapse
              </button>
            </>
          ) : (
            <div style={styles.status}>
              <div style={styles.statusText}>
                <span>Remaining shots: {remainingShots}</span>
                <span>Next shot in: {nextShotIn}s</span>
              </div>
              <button onClick={stopTimeLapse} style={styles.stopBtn}>
                ⏹ Stop
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Styles ---
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
    zIndex: 1100,
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
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    color: 'white',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '6px 12px',
    color: 'white',
    fontSize: '14px',
    width: '80px',
  },
  startBtn: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    border: 'none',
    borderRadius: '30px',
    padding: '12px 24px',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
  },
  status: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  statusText: {
    color: 'white',
    fontSize: '18px',
    fontWeight: '500',
    display: 'flex',
    gap: '30px',
  },
  stopBtn: {
    background: 'rgba(255,50,50,0.2)',
    border: '1px solid rgba(255,50,50,0.3)',
    borderRadius: '30px',
    padding: '10px 24px',
    color: '#ff6b6b',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
  },
};

export default TimeLapse;
