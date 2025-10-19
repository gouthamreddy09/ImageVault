import { useState, useEffect } from 'react';
import { FolderOpen, Plus, X, Folder, Images, Edit2, Trash2, Check } from 'lucide-react';
import ImageGrid from './ImageGrid';

interface Album {
  id: string;
  name: string;
  description: string;
  image_count: number;
  created_at: string;
}

interface AlbumsProps {
  sessionToken: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Albums({ sessionToken, isOpen, onClose }: AlbumsProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumImages, setAlbumImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAlbums();
    }
  }, [isOpen]);

  const fetchAlbums = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      alert('Please enter an album name');
      return;
    }

    setCreating(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-album`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAlbumName,
          description: newAlbumDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create album');
      }

      setNewAlbumName('');
      setNewAlbumDescription('');
      setShowCreateModal(false);
      fetchAlbums();
    } catch (error) {
      console.error('Create album error:', error);
      alert('Failed to create album. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleViewAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    setLoadingImages(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-album-images?albumId=${album.id}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlbumImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to fetch album images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setAlbumImages([]);
  };

  const handleStartEdit = (album: Album, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAlbum(album);
    setEditName(album.name);
    setEditDescription(album.description || '');
  };

  const handleCancelEdit = () => {
    setEditingAlbum(null);
    setEditName('');
    setEditDescription('');
  };

  const handleRenameAlbum = async () => {
    if (!editingAlbum || !editName.trim()) {
      alert('Please enter an album name');
      return;
    }

    setUpdating(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rename-album`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          albumId: editingAlbum.id,
          name: editName,
          description: editDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename album');
      }

      setEditingAlbum(null);
      setEditName('');
      setEditDescription('');
      fetchAlbums();
    } catch (error) {
      console.error('Rename album error:', error);
      alert('Failed to rename album. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this album? This will not delete the images.')) {
      return;
    }

    setDeleting(albumId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-album`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ albumId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete album');
      }

      fetchAlbums();
    } catch (error) {
      console.error('Delete album error:', error);
      alert('Failed to delete album. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  if (selectedAlbum) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToAlbums}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Folder className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedAlbum.name}</h2>
                {selectedAlbum.description && (
                  <p className="text-sm text-gray-500">{selectedAlbum.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <ImageGrid
              images={albumImages}
              loading={loadingImages}
              onImageRenamed={() => handleViewAlbum(selectedAlbum)}
              onImageDeleted={() => handleViewAlbum(selectedAlbum)}
              sessionToken={sessionToken}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Albums</h2>
              <p className="text-sm text-gray-500">
                {albums.length} {albums.length === 1 ? 'album' : 'albums'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Album</span>
            </button>
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
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading albums...</p>
              </div>
            </div>
          ) : albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <FolderOpen className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No albums yet</h3>
              <p className="text-gray-500 mb-4">Create your first album to organize your images</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Create Album</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {albums.map((album) => (
                <div
                  key={album.id}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                    <button
                      onClick={(e) => handleStartEdit(album, e)}
                      className="p-1.5 bg-white hover:bg-blue-50 rounded-lg shadow-sm transition-colors"
                      title="Rename album"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteAlbum(album.id, e)}
                      disabled={deleting === album.id}
                      className="p-1.5 bg-white hover:bg-red-50 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                      title="Delete album"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleViewAlbum(album)}
                    className="w-full h-full p-6 flex flex-col items-center justify-center text-center"
                  >
                    <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                      <Folder className="w-12 h-12 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 truncate w-full px-2">
                      {album.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <Images className="w-4 h-4" />
                      <span>{album.image_count}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingAlbum && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Rename Album</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Album Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter album name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={updating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter album description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  disabled={updating}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRenameAlbum}
                  disabled={updating || !editName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  {updating ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={creating}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  disabled={creating}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateAlbum}
                  disabled={creating || !newAlbumName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Album'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewAlbumName('');
                    setNewAlbumDescription('');
                  }}
                  disabled={creating}
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
