import { useState, useEffect, useMemo } from 'react';
import UploadForm from './components/UploadForm';
import SearchBar from './components/SearchBar';
import ImageGrid from './components/ImageGrid';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import TrashBin from './components/TrashBin';
import Albums from './components/Albums';
import HiddenFolder from './components/HiddenFolder';
import { useAuth } from './contexts/AuthContext';

interface ImageData {
  id: string;
  url: string;
  filename: string;
  tags: string[];
  created_at: string;
  is_favorite?: boolean;
}

function App() {
  const { user, session, loading: authLoading } = useAuth();
  const [allImages, setAllImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isAlbumsOpen, setIsAlbumsOpen] = useState(false);
  const [isHiddenOpen, setIsHiddenOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const fetchImages = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showFavoritesOnly) {
        params.append('favorites', 'true');
      }
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-images?${params.toString()}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllImages(data.images || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch images:', errorData);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchImages = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      fetchImages();
      return;
    }

    if (!session) return;

    setLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-images?query=${encodeURIComponent(query)}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllImages(data.images || []);
      }
    } catch (error) {
      console.error('Error searching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && session) {
      fetchImages();
    }
  }, [user, session, showFavoritesOnly]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    allImages.forEach(image => {
      image.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [allImages]);

  const filteredImages = useMemo(() => {
    if (selectedTags.length === 0) {
      return allImages;
    }
    return allImages.filter(image =>
      selectedTags.some(selectedTag =>
        image.tags?.includes(selectedTag)
      )
    );
  }, [allImages, selectedTags]);

  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-900 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onOpenTrash={() => setIsTrashOpen(true)}
        onOpenAlbums={() => setIsAlbumsOpen(true)}
        onOpenHidden={() => setIsHiddenOpen(true)}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UploadForm onUploadSuccess={fetchImages} sessionToken={session.access_token} />

        <SearchBar onSearch={searchImages} />
        {searchQuery && (
          <p className="text-sm text-gray-600 mb-4">
            Searching for: <span className="font-semibold">{searchQuery}</span>
          </p>
        )}

        <FilterPanel
          allTags={allTags}
          selectedTags={selectedTags}
          onTagSelect={handleTagSelect}
          onClearFilters={handleClearFilters}
        />

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredImages.length} of {allImages.length} images
          </p>
        </div>

        <ImageGrid
          images={filteredImages}
          loading={loading}
          onImageRenamed={fetchImages}
          onImageDeleted={fetchImages}
          sessionToken={session.access_token}
          showFavoritesOnly={showFavoritesOnly}
        />
      </div>

      <TrashBin
        sessionToken={session.access_token}
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onImageRestored={fetchImages}
      />

      <Albums
        sessionToken={session.access_token}
        isOpen={isAlbumsOpen}
        onClose={() => setIsAlbumsOpen(false)}
      />

      <HiddenFolder
        sessionToken={session.access_token}
        isOpen={isHiddenOpen}
        onClose={() => setIsHiddenOpen(false)}
        onImageUnhidden={fetchImages}
      />
    </div>
  );
}

export default App;
