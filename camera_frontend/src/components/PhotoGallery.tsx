import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Photo {
  id: string;
  dataURL: string;
  timestamp: number;
}

interface PhotoGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ isOpen, onClose }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Load photos from localStorage on mount and when isOpen changes
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('adwashield_photos');
      if (stored) {
        try {
          setPhotos(JSON.parse(stored));
        } catch (e) {
          setPhotos([]);
        }
      }
    }
  }, [isOpen]);

  // Save to localStorage whenever photos change
  const savePhotos = (newPhotos: Photo[]) => {
    localStorage.setItem('adwashield_photos', JSON.stringify(newPhotos));
    setPhotos(newPhotos);
  };

  const deletePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    savePhotos(updated);
    if (selectedPhoto?.id === id) setSelectedPhoto(null);
  };

  const clearAll = () => {
    if (window.confirm('Delete all photos?')) {
      savePhotos([]);
      setSelectedPhoto(null);
    }
  };

  const downloadPhoto = (dataURL: string) => {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

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
          <h2 style={styles.title}>📸 Photo Gallery</h2>
          <div style={styles.headerActions}>
            {photos.length > 0 && (
              <button onClick={clearAll} style={styles.clearBtn}>
                🗑️ Clear All
              </button>
            )}
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>

        {photos.length === 0 ? (
          <p style={styles.empty}>No photos saved yet. Capture some!</p>
        ) : (
          <div style={styles.grid}>
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={styles.thumbnailWrapper}
                onClick={() => setSelectedPhoto(photo)}
              >
                <img src={photo.dataURL} alt={`Photo ${photo.id}`} style={styles.thumbnail} />
                <div style={styles.thumbnailDate}>{formatDate(photo.timestamp)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Preview modal for selected photo */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div
              style={styles.previewOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
            >
              <motion.div
                style={styles.previewModal}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <img src={selectedPhoto.dataURL} alt="Preview" style={styles.previewImage} />
                <div style={styles.previewActions}>
                  <button onClick={() => downloadPhoto(selectedPhoto.dataURL)} style={styles.previewBtn}>
                    ⬇ Download
                  </button>
                  <button onClick={() => deletePhoto(selectedPhoto.id)} style={styles.previewBtnDanger}>
                    🗑️ Delete
                  </button>
                  <button onClick={() => setSelectedPhoto(null)} style={styles.previewBtn}>
                    ✕ Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// --- Styles for the gallery ---
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
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '24px',
    padding: '24px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  title: {
    color: 'white',
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  clearBtn: {
    background: 'rgba(255,50,50,0.15)',
    border: '1px solid rgba(255,50,50,0.3)',
    color: '#ff6b6b',
    padding: '6px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
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
  empty: {
    color: '#888',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: '18px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
    overflowY: 'auto',
    padding: '4px',
    maxHeight: 'calc(90vh - 120px)',
  },
  thumbnailWrapper: {
    cursor: 'pointer',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid transparent',
    transition: 'border 0.2s',
    position: 'relative',
    aspectRatio: '4/3',
    backgroundColor: '#0a0a0a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailDate: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '10px',
    padding: '4px 8px',
    textAlign: 'right',
  },
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
  },
  previewModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '20px',
    padding: '20px',
    maxWidth: '80%',
    maxHeight: '80%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '70vh',
    borderRadius: '12px',
    objectFit: 'contain',
  },
  previewActions: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  previewBtn: {
    padding: '8px 20px',
    borderRadius: '30px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
  previewBtnDanger: {
    padding: '8px 20px',
    borderRadius: '30px',
    border: 'none',
    background: 'rgba(255,50,50,0.2)',
    color: '#ff6b6b',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
};

export default PhotoGallery;
