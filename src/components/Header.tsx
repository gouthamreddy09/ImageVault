import { LogOut, User, ImageIcon, Trash2, FolderOpen, Heart, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onOpenTrash: () => void;
  onOpenAlbums: () => void;
  onOpenHidden: () => void;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
}

export default function Header({ onOpenTrash, onOpenAlbums, onOpenHidden, showFavoritesOnly, onToggleFavorites }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-indigo-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-sm">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-indigo-900">
                ImageVault
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 bg-indigo-50 rounded-lg">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">{user?.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-900 rounded-lg transition-all font-medium border border-indigo-200 shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="border-t border-indigo-100 py-3.5">
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              <button
                onClick={onToggleFavorites}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap font-medium shadow-sm ${
                  showFavoritesOnly
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-200'
                }`}
              >
                <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                <span className="text-sm">Favourites</span>
              </button>
              <button
                onClick={onOpenAlbums}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-900 rounded-lg transition-all whitespace-nowrap font-medium border border-indigo-200 shadow-sm"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm">Albums</span>
              </button>
              <button
                onClick={onOpenHidden}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-900 rounded-lg transition-all whitespace-nowrap font-medium border border-indigo-200 shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm">Hidden</span>
              </button>
              <button
                onClick={onOpenTrash}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 rounded-lg transition-all whitespace-nowrap font-medium border border-red-200 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Trash</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
