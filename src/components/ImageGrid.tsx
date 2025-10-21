import { useState } from 'react';
import { Image as ImageIcon, Edit2, Check, X, Trash2, CheckSquare, Square, Heart, FolderPlus, EyeOff, ZoomIn, Plus } from 'lucide-react';

interface ImageData {
  id: string;
  url: string;
  filename: string;
  tags: string[];
  created_at: string;
  is_favorite?: boolean;
}

interface ImageGridProps {
  images: ImageData[];
  loading: boolean;
  onImageRenamed: () => void;
  onImageDeleted: () => void;
  sessionToken: string;
  showFavoritesOnly?: boolean;
}

export default function ImageGrid({ images, loading, onImageRenamed, onImageDeleted, sessionToken, showFavoritesOnly = false }: ImageGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showAddToAlbum, setShowAddToAlbum] = useState(false);
  const [albums, setAlbums] = useState<any[]>([]);
  const [addingToAlbum, setAddingToAlbum] = useState(false);
  const [hiding, setHiding] = useState<string | null>(null);
  const [bulkHiding, setBulkHiding] = useState(false);
  const [bulkFavoriting, setBulkFavoriting] = useState(false);
  const [viewingImage, setViewingImage] = useState<ImageData | null>(null);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  const handleStartRename = (image: ImageData, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingId(image.id);
    setNewName(image.filename);
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setNewName('');
  };

  const handleRename = async (imageId: string, originalFilename: string) => {
    if (!newName.trim()) {
      return;
    }

    setRenaming(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rename-image`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          newFilename: newName,
        }),
      });

      if (!response.ok) {
        throw new Error('Rename failed');
      }

      setEditingId(null);
      setNewName('');
      onImageRenamed();
    } catch (error) {
      console.error('Rename error:', error);
      alert('Failed to rename image. Please try again.');
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Move this image to trash?')) {
      return;
    }

    setDeleting(imageId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-image`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setDeleting(null);
      onImageDeleted();
    } catch (error) {
      console.error('Delete error:', error);
      setDeleting(null);
      alert('Failed to delete image. Please try again.');
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
    setSelectedImages(new Set(images.map(img => img.id)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;

    if (!confirm(`Move ${selectedImages.size} images to trash?`)) {
      return;
    }

    setBulkDeleting(true);

    try {
      const deletePromises = Array.from(selectedImages).map(imageId =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageId }),
        })
      );

      await Promise.all(deletePromises);
      setSelectedImages(new Set());
      setIsSelectionMode(false);
      onImageDeleted();
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
    } else {
      const image = images.find(img => img.id === imageId);
      if (image) {
        setViewingImage(image);
      }
    }
  };

  const handleHideImage = async (imageId: string) => {
    if (!confirm('Hide this image? You\'ll need a password to view it again.')) {
      return;
    }

    setHiding(imageId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-hidden`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId, hidden: true }),
      });

      if (!response.ok) {
        throw new Error('Hide failed');
      }

      onImageDeleted();
    } catch (error) {
      console.error('Hide error:', error);
      alert('Failed to hide image. Please try again.');
    } finally {
      setHiding(null);
    }
  };

  const handleToggleFavorite = async (imageId: string, currentFavoriteStatus: boolean) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-favorite`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          isFavorite: !currentFavoriteStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Toggle favorite failed');
      }

      onImageRenamed();
    } catch (error) {
      console.error('Toggle favorite error:', error);
      alert('Failed to toggle favorite. Please try again.');
    }
  };

  const fetchAlbums = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-albums`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlbums(data.albums || []);
      }
    } catch (error) {
      console.error('Failed to fetch albums:', error);
    }
  };

  const handleShowAddToAlbum = () => {
    if (selectedImages.size === 0) return;
    fetchAlbums();
    setShowAddToAlbum(true);
  };

  const handleBulkHide = async () => {
    if (selectedImages.size === 0) return;

    if (!confirm(`Hide ${selectedImages.size} images? You'll need a password to view them again.`)) {
      return;
    }

    setBulkHiding(true);

    try {
      const hidePromises = Array.from(selectedImages).map(imageId =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-hidden`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageId, hidden: true }),
        })
      );

      await Promise.all(hidePromises);
      setSelectedImages(new Set());
      setIsSelectionMode(false);
      onImageDeleted();
    } catch (error) {
      console.error('Bulk hide error:', error);
      alert('Failed to hide some images. Please try again.');
    } finally {
      setBulkHiding(false);
    }
  };

  const handleBulkFavorite = async () => {
    if (selectedImages.size === 0) return;

    setBulkFavoriting(true);

    try {
      const favoritePromises = Array.from(selectedImages).map(imageId =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-favorite`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageId, isFavorite: !showFavoritesOnly }),
        })
      );

      await Promise.all(favoritePromises);
      setSelectedImages(new Set());
      setIsSelectionMode(false);
      onImageRenamed();
    } catch (error) {
      console.error('Bulk favorite error:', error);
      alert(`Failed to ${showFavoritesOnly ? 'unfavourite' : 'favourite'} some images. Please try again.`);
    } finally {
      setBulkFavoriting(false);
    }
  };

  const handleAddToAlbum = async (albumId: string) => {
    if (selectedImages.size === 0) return;

    setAddingToAlbum(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-to-album`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          albumId,
          imageIds: Array.from(selectedImages),
        }),
      });

      if (!response.ok) {
        throw new Error('Add to album failed');
      }

      setShowAddToAlbum(false);
      setSelectedImages(new Set());
      setIsSelectionMode(false);
      alert(`Added ${selectedImages.size} image(s) to album successfully!`);
    } catch (error) {
      console.error('Add to album error:', error);
      alert('Failed to add images to album. Please try again.');
    } finally {
      setAddingToAlbum(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      alert('Please enter an album name');
      return;
    }

    setCreatingAlbum(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-album`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAlbumName.trim(),
          description: newAlbumDescription.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Create album failed');
      }

      const data = await response.json();
      setShowCreateAlbum(false);
      setNewAlbumName('');
      setNewAlbumDescription('');

      // Add the new album to albums and select it
      await fetchAlbums();

      // Automatically add images to the newly created album
      if (data.albumId) {
        await handleAddToAlbum(data.albumId);
      }
    } catch (error) {
      console.error('Create album error:', error);
      alert('Failed to create album. Please try again.');
    } finally {
      setCreatingAlbum(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-900 font-medium">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-indigo-100 rounded-full mb-4 shadow-sm">
          <ImageIcon className="w-12 h-12 text-indigo-600" />
        </div>
        <h3 className="text-xl font-bold text-indigo-900 mb-2">No photos found</h3>
        <p className="text-indigo-700">Upload some photos to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectionMode}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg transition-all font-medium shadow-sm border border-indigo-200"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="text-sm">
                {isSelectionMode ? 'Cancel Selection' : 'Select Photos'}
              </span>
            </button>
            {isSelectionMode && (
              <>
                <button
                  onClick={selectAll}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Select All
                </button>
                {selectedImages.size > 0 && (
                  <button
                    onClick={deselectAll}
                    className="text-sm text-indigo-900 hover:text-indigo-700 font-semibold"
                  >
                    Deselect All
                  </button>
                )}
                <span className="text-sm text-indigo-900 font-medium bg-indigo-100 px-3 py-1 rounded-full">
                  {selectedImages.size} selected
                </span>
              </>
            )}
          </div>
          {selectedImages.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkFavorite}
                disabled={bulkFavoriting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
                title={showFavoritesOnly ? 'Remove from Favourites' : 'Mark as Favourite'}
              >
                <Heart className="w-4 h-4" />
                <span className="text-sm font-medium hidden md:inline">
                  {bulkFavoriting ? (showFavoritesOnly ? 'Removing...' : 'Adding...') : (showFavoritesOnly ? 'Unfavourite' : 'Favourite')}
                </span>
              </button>
              <button
                onClick={handleBulkHide}
                disabled={bulkHiding}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
                title="Hide Images"
              >
                <EyeOff className="w-4 h-4" />
                <span className="text-sm font-medium hidden md:inline">
                  {bulkHiding ? 'Hiding...' : 'Hide'}
                </span>
              </button>
              <button
                onClick={handleShowAddToAlbum}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm"
                title="Add to Album"
              >
                <FolderPlus className="w-4 h-4" />
                <span className="text-sm font-medium hidden md:inline">
                  Album
                </span>
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium hidden md:inline">
                  {bulkDeleting ? 'Deleting...' : 'Delete'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {images.map((image) => (
        <div
          key={image.id}
          onClick={() => {
            if (editingId !== image.id) {
              handleImageClick(image.id);
            }
          }}
          className={`group relative aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-sm hover:shadow-md transition-all duration-300 ${
            isSelectionMode || editingId === image.id ? 'cursor-pointer' : ''
          } ${
            selectedImages.has(image.id) ? 'ring-4 ring-indigo-600' : ''
          }`}
        >
          <img
            src={image.url}
            alt={image.filename}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute top-2 left-2">
              {isSelectionMode && (
                <div className="p-2 bg-white/90 rounded-lg backdrop-blur-sm">
                  {selectedImages.has(image.id) ? (
                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Square className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
              )}
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              {!isSelectionMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(image.id, image.is_favorite || false);
                  }}
                  className="p-2 bg-white/90 hover:bg-white rounded-lg backdrop-blur-sm transition-colors"
                  title={image.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-4 h-4 ${image.is_favorite ? 'fill-pink-500 text-pink-500' : 'text-gray-700'}`} />
                </button>
              )}
              {editingId !== image.id && !isSelectionMode && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(image, e);
                    }}
                    className="p-2 bg-white/90 hover:bg-white rounded-lg backdrop-blur-sm transition-colors"
                    title="Rename image"
                    disabled={deleting === image.id || hiding === image.id}
                  >
                    <Edit2 className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHideImage(image.id);
                    }}
                    className="p-2 bg-indigo-500/90 hover:bg-indigo-600 rounded-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                    title="Hide image"
                    disabled={deleting === image.id || hiding === image.id}
                  >
                    <EyeOff className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    className="p-2 bg-red-500/90 hover:bg-red-600 rounded-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                    title="Delete image"
                    disabled={deleting === image.id || hiding === image.id}
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {editingId === image.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="New filename"
                    className="w-full px-3 py-2 text-sm bg-white/95 backdrop-blur-sm rounded-lg outline-none"
                    disabled={renaming}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename(image.id, image.filename);
                      } else if (e.key === 'Escape') {
                        handleCancelRename();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRename(image.id, image.filename);
                      }}
                      disabled={renaming || !newName.trim()}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      {renaming ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelRename();
                      }}
                      disabled={renaming}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-white text-sm font-medium truncate">{image.filename}</p>
                  {image.tags && image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {image.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      </div>

      {viewingImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite(viewingImage.id, viewingImage.is_favorite || false);
              }}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
              title={viewingImage.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-6 h-6 ${viewingImage.is_favorite ? 'fill-pink-500 text-pink-500' : 'text-white'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewingImage(null);
                handleHideImage(viewingImage.id);
              }}
              className="p-3 bg-indigo-500/90 hover:bg-indigo-600 rounded-lg backdrop-blur-sm transition-colors"
              title="Hide image"
              disabled={hiding === viewingImage.id}
            >
              <EyeOff className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewingImage(null);
                handleDelete(viewingImage.id);
              }}
              className="p-3 bg-red-500/90 hover:bg-red-600 rounded-lg backdrop-blur-sm transition-colors"
              title="Delete image"
              disabled={deleting === viewingImage.id}
            >
              <Trash2 className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => setViewingImage(null)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="relative flex flex-col items-center justify-center max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewingImage.url}
              alt={viewingImage.filename}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 max-w-full">
              <h3 className="text-white text-lg font-semibold mb-2">{viewingImage.filename}</h3>
              {viewingImage.tags && viewingImage.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {viewingImage.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-sm bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-lg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddToAlbum && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add to Album</h3>
            {albums.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No albums available</p>
                <button
                  onClick={() => {
                    setShowAddToAlbum(false);
                    setShowCreateAlbum(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors mb-2"
                >
                  Create Album
                </button>
                <button
                  onClick={() => setShowAddToAlbum(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  <button
                    onClick={() => {
                      setShowAddToAlbum(false);
                      setShowCreateAlbum(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors mb-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Create New Album</span>
                  </button>
                  {albums.map((album) => (
                    <button
                      key={album.id}
                      onClick={() => handleAddToAlbum(album.id)}
                      disabled={addingToAlbum}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 text-left"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{album.name}</p>
                        {album.description && (
                          <p className="text-sm text-gray-500">{album.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{album.image_count} images</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAddToAlbum(false)}
                  disabled={addingToAlbum}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showCreateAlbum && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Album</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Album Name
                </label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Enter album name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  disabled={creatingAlbum}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  placeholder="Enter album description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  disabled={creatingAlbum}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateAlbum}
                  disabled={creatingAlbum || !newAlbumName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {creatingAlbum ? 'Creating...' : 'Create & Add Photos'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateAlbum(false);
                    setNewAlbumName('');
                    setNewAlbumDescription('');
                    setShowAddToAlbum(true);
                  }}
                  disabled={creatingAlbum}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
