import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, Trash2, Search, Grid3X3, List, ArrowUpDown,
  CheckSquare, Square, ImageOff,
} from 'lucide-react';

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
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Load photos
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('adwashield_photos');
      if (stored) {
        try {
          setPhotos(JSON.parse(stored));
        } catch {
          setPhotos([]);
        }
      }
    }
  }, [isOpen]);

  // Persist
  const savePhotos = (newPhotos: Photo[]) => {
    localStorage.setItem('adwashield_photos', JSON.stringify(newPhotos));
    setPhotos(newPhotos);
  };

  // Delete selected (or single)
  const deleteSelected = () => {
    if (selectedPhotos.size === 0) return;
    const updated = photos.filter((p) => !selectedPhotos.has(p.id));
    savePhotos(updated);
    setSelectedPhotos(new Set());
  };

  const deletePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    savePhotos(updated);
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (previewPhoto?.id === id) setPreviewPhoto(null);
  };

  const clearAll = () => {
    if (window.confirm('Delete all photos permanently?')) {
      savePhotos([]);
      setSelectedPhotos(new Set());
      setPreviewPhoto(null);
    }
  };

  // Download
  const downloadSelected = () => {
    selectedPhotos.forEach((id) => {
      const photo = photos.find((p) => p.id === id);
      if (photo) {
        const link = document.createElement('a');
        link.href = photo.dataURL;
        link.download = `photo-${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const downloadPhoto = (dataURL: string) => {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  // Filter & sort
  const filteredPhotos = photos
    .filter((p) => {
      if (!searchTerm) return true;
      const date = new Date(p.timestamp).toLocaleString().toLowerCase();
      return date.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) =>
      sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

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
          <h2 style={styles.title}>📸 Gallery</h2>
          <div style={styles.headerRight}>
            {photos.length > 0 && (
              <button onClick={clearAll} style={styles.clearBtn}>
                <Trash2 size={14} /> Clear All
              </button>
            )}
            <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
          </div>
        </div>

        {/* Toolbar */}
        {photos.length > 0 && (
          <div style={styles.toolbar}>
            <div style={styles.searchWrap}>
              <Search size={14} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.toolbarRight}>
              <button
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                style={styles.toolBtn}
                title="Sort order"
              >
                <ArrowUpDown size={14} /> {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                style={styles.toolBtn}
                title="Toggle view"
              >
                {viewMode === 'grid' ? <List size={14} /> : <Grid3X3 size={14} />}
              </button>
              {selectedPhotos.size > 0 && (
                <div style={styles.selectionBar}>
                  <button onClick={toggleSelectAll} style={styles.toolBtn}>
                    {selectedPhotos.size === filteredPhotos.length ? <CheckSquare size={14} /> : <Square size={14} />}
                    {selectedPhotos.size} selected
                  </button>
                  <button onClick={downloadSelected} style={styles.toolBtn}>
                    <Download size={14} /> Download
                  </button>
                  <button onClick={deleteSelected} style={styles.toolBtnDanger}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {filteredPhotos.length === 0 ? (
          <div style={styles.emptyState}>
            <ImageOff size={48} strokeWidth={1} style={styles.emptyIcon} />
            <p style={styles.emptyText}>
              {photos.length === 0 ? 'No photos yet. Start capturing!' : 'No photos match your search.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={styles.grid}>
            {filteredPhotos.map((photo) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  ...styles.card,
                  borderColor: selectedPhotos.has(photo.id) ? '#f5576c' : 'transparent',
                }}
                onClick={() => {
                  if (selectedPhotos.size > 0) {
                    toggleSelect(photo.id);
                  } else {
                    setPreviewPhoto(photo);
                  }
                }}
                onDoubleClick={() => toggleSelect(photo.id)}
              >
                <img src={photo.dataURL} alt="thumb" style={styles.thumb} />
                <div style={styles.cardOverlay}>
                  <div style={styles.cardDate}>{formatDate(photo.timestamp)}</div>
                  <div style={styles.cardActions}>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadPhoto(photo.dataURL); }}
                      style={styles.cardBtn}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
                      style={{ ...styles.cardBtn, color: '#ff5d5d' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {selectedPhotos.has(photo.id) && (
                    <div style={styles.checkMark}><CheckSquare size={20} /></div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={styles.listView}>
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  ...styles.listItem,
                  borderColor: selectedPhotos.has(photo.id) ? '#f5576c' : 'rgba(255,255,255,0.05)',
                }}
                onClick={() => {
                  if (selectedPhotos.size > 0) toggleSelect(photo.id);
                  else setPreviewPhoto(photo);
                }}
                onDoubleClick={() => toggleSelect(photo.id)}
              >
                <img src={photo.dataURL} alt="thumb" style={styles.listThumb} />
                <span style={styles.listDate}>{formatDate(photo.timestamp)}</span>
                <div style={styles.listActions}>
                  <button onClick={(e) => { e.stopPropagation(); downloadPhoto(photo.dataURL); }} style={styles.cardBtn}>
                    <Download size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }} style={{ ...styles.cardBtn, color: '#ff5d5d' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {selectedPhotos.has(photo.id) && <CheckSquare size={18} style={{ color: '#f5576c' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Preview modal */}
        <AnimatePresence>
          {previewPhoto && (
            <motion.div
              style={styles.previewOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewPhoto(null)}
            >
              <motion.div
                style={styles.previewModal}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
              >
                <img src={previewPhoto.dataURL} alt="Preview" style={styles.previewImage} />
                <div style={styles.previewActions}>
                  <button onClick={() => downloadPhoto(previewPhoto.dataURL)} style={styles.previewBtn}>
                    <Download size={14} /> Download
                  </button>
                  <button onClick={() => deletePhoto(previewPhoto.id)} style={styles.previewBtnDanger}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button onClick={() => setPreviewPhoto(null)} style={styles.previewBtn}>
                    <X size={14} /> Close
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

// ===================== STYLES =====================
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: '20px',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  modal: {
    backgroundColor: '#0f0f11',
    borderRadius: '24px',
    padding: '24px',
    width: '100%',
    maxWidth: '1100px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerRight: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  clearBtn: {
    background: 'rgba(255,80,80,0.1)',
    border: '1px solid rgba(255,80,80,0.25)',
    color: '#ff6b6b',
    padding: '8px 14px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: '#fff',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'background 0.2s',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '16px',
  },
  searchWrap: {
    position: 'relative',
    flex: '1 1 200px',
    maxWidth: '300px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#888',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 34px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  toolbarRight: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  toolBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ccc',
    padding: '8px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.15s',
  },
  toolBtnDanger: {
    background: 'rgba(255,80,80,0.15)',
    border: '1px solid rgba(255,80,80,0.3)',
    color: '#ff6b6b',
    padding: '8px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.15s',
  },
  selectionBar: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginLeft: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
    overflowY: 'auto',
    flex: 1,
    paddingRight: '4px',
  },
  card: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    aspectRatio: '4/3',
    backgroundColor: '#1a1a1e',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border 0.2s, transform 0.15s',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  thumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7))',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '8px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  cardDate: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '10px',
    fontWeight: 500,
    marginBottom: '4px',
  },
  cardActions: {
    display: 'flex',
    gap: '6px',
  },
  cardBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.15s',
  },
  checkMark: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    color: '#f5576c',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '4px',
    padding: '2px',
  },
  listView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    overflowY: 'auto',
    flex: 1,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'border 0.2s',
  },
  listThumb: {
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    objectFit: 'cover',
  },
  listDate: {
    flex: 1,
    color: '#ccc',
    fontSize: '13px',
  },
  listActions: {
    display: 'flex',
    gap: '6px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#666',
  },
  emptyIcon: { marginBottom: '16px', opacity: 0.6 },
  emptyText: { fontSize: '16px', fontWeight: 500 },
  previewOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1200,
    backdropFilter: 'blur(8px)',
  },
  previewModal: {
    backgroundColor: '#1a1a1e',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '85vw',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '70vh',
    borderRadius: '12px',
    objectFit: 'contain',
  },
  previewActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  previewBtn: {
    padding: '10px 18px',
    borderRadius: '24px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s',
  },
  previewBtnDanger: {
    padding: '10px 18px',
    borderRadius: '24px',
    border: 'none',
    background: 'rgba(255,80,80,0.2)',
    color: '#ff6b6b',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s',
  },
};

// Hover styles via CSS-in-JS pseudo-classes (add this at the bottom)
const hoverStyles = `
  .card:hover .card-overlay { opacity: 1; }
  .card:hover { transform: scale(1.02); }
  .tool-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
  .tool-btn-danger:hover { background: rgba(255,80,80,0.25); }
  .preview-btn:hover { background: rgba(255,255,255,0.2); }
  .preview-btn-danger:hover { background: rgba(255,80,80,0.35); }
`;

export default PhotoGallery;
