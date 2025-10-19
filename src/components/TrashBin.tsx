import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, X, XCircle, CheckSquare, Square } from 'lucide-react';

interface ImageData {
  id: string;
  url: string;
  filename: string;
  tags: string[];
  deleted_at: string;
}

interface TrashBinProps {
  sessionToken: string;
  isOpen: boolean;
  onClose: () => void;
  onImageRestored: () => void;
}

export default function TrashBin({ sessionToken, isOpen, onClose, onImageRestored }: TrashBinProps) {
  const [deletedImages, setDeletedImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<string | null>(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkRestoring, setBulkRestoring] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDeletedImages();
    }
  }, [isOpen]);

  const fetchDeletedImages = async () => {
    setLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-images?deleted=true`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeletedImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to fetch deleted images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (imageId: string) => {
    setRestoring(imageId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restore-image`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        throw new Error('Restore failed');
      }

      setDeletedImages(prev => prev.filter(img => img.id !== imageId));
      onImageRestored();
    } catch (error) {
      console.error('Restore error:', error);
      alert('Failed to restore image. Please try again.');
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to permanently delete this image? This action cannot be undone!')) {
      return;
    }

    setPermanentDeleting(imageId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/permanent-delete-image`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        throw new Error('Permanent delete failed');
      }

      setDeletedImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Permanent delete error:', error);
      alert('Failed to permanently delete image. Please try again.');
    } finally {
      setPermanentDeleting(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (deletedImages.length === 0) {
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete all ${deletedImages.length} images in trash? This action cannot be undone!`)) {
      return;
    }

    setEmptyingTrash(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/empty-trash`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Empty trash failed');
      }

      setDeletedImages([]);
    } catch (error) {
      console.error('Empty trash error:', error);
      alert('Failed to empty trash. Please try again.');
    } finally {
      setEmptyingTrash(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedImages(new Set());
  };

  const selectAll = () => {
    setSelectedImages(new Set(deletedImages.map(img => img.id)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkRestore = async () => {
    if (selectedImages.size === 0) return;

    if (!confirm(`Restore ${selectedImages.size} images?`)) {
      return;
    }

    setBulkRestoring(true);

    try {
      const restorePromises = Array.from(selectedImages).map(imageId =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restore-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageId }),
        })
      );

      await Promise.all(restorePromises);
      setDeletedImages(prev => prev.filter(img => !selectedImages.has(img.id)));
      setSelectedImages(new Set());
      setIsSelectionMode(false);
      onImageRestored();
    } catch (error) {
      console.error('Bulk restore error:', error);
      alert('Failed to restore some images. Please try again.');
    } finally {
      setBulkRestoring(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;

    if (!confirm(`Permanently delete ${selectedImages.size} images? This action cannot be undone!`)) {
      return;
    }

    setBulkDeleting(true);

    try {
      const deletePromises = Array.from(selectedImages).map(imageId =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/permanent-delete-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageId }),
        })
      );

      await Promise.all(deletePromises);
      setDeletedImages(prev => prev.filter(img => !selectedImages.has(img.id)));
      setSelectedImages(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Failed to delete some images. Please try again.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleImageClick = (imageId: string) => {
    if (isSelectionMode) {
      toggleImageSelection(imageId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Trash Bin</h2>
              <p className="text-sm text-gray-500">
                {deletedImages.length} {deletedImages.length === 1 ? 'image' : 'images'} in trash
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {deletedImages.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                disabled={emptyingTrash}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {emptyingTrash ? 'Emptying...' : 'Empty Trash'}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading deleted images...</p>
              </div>
            </div>
          ) : (
            <>
              {deletedImages.length > 0 && (
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleSelectionMode}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {isSelectionMode ? 'Cancel Selection' : 'Select Images'}
                      </span>
                    </button>
                    {isSelectionMode && (
                      <>
                        <button
                          onClick={selectAll}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        {selectedImages.size > 0 && (
                          <button
                            onClick={deselectAll}
                            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                          >
                            Deselect All
                          </button>
                        )}
                        <span className="text-sm text-gray-600">
                          {selectedImages.size} selected
                        </span>
                      </>
                    )}
                  </div>
                  {selectedImages.size > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBulkRestore}
                        disabled={bulkRestoring}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {bulkRestoring ? 'Restoring...' : `Restore (${selectedImages.size})`}
                        </span>
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {bulkDeleting ? 'Deleting...' : `Delete (${selectedImages.size})`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {deletedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Trash2 className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Trash is empty</h3>
              <p className="text-gray-500">Deleted images will appear here</p>
            </div>
          ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {deletedImages.map((image) => (
                <div
                  key={image.id}
                  onClick={() => handleImageClick(image.id)}
                  className={`group relative aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-sm ${
                    isSelectionMode ? 'cursor-pointer' : ''
                  } ${
                    selectedImages.has(image.id) ? 'ring-4 ring-blue-500' : ''
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-2 left-2">
                      {isSelectionMode && (
                        <div className="p-2 bg-white/90 rounded-lg backdrop-blur-sm">
                          {selectedImages.has(image.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      {!isSelectionMode && (
                        <>
                          <button
                            onClick={() => handleRestore(image.id)}
                            className="p-2 bg-green-500/90 hover:bg-green-600 rounded-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                            title="Restore image"
                            disabled={restoring === image.id || permanentDeleting === image.id}
                          >
                            <RotateCcw className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(image.id)}
                            className="p-2 bg-red-600/90 hover:bg-red-700 rounded-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                            title="Permanently delete"
                            disabled={restoring === image.id || permanentDeleting === image.id}
                          >
                            <XCircle className="w-4 h-4 text-white" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white text-sm font-medium truncate">{image.filename}</p>
                      <p className="text-white/70 text-xs mt-1">
                        Deleted {new Date(image.deleted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
