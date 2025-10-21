import { useState, useEffect } from 'react';
import { Lock, X, Eye, EyeOff, CheckSquare, Square, Trash2 } from 'lucide-react';
import ImageGrid from './ImageGrid';

interface HiddenFolderProps {
  sessionToken: string;
  isOpen: boolean;
  onClose: () => void;
  onImageUnhidden?: () => void;
}

export default function HiddenFolder({ sessionToken, isOpen, onClose, onImageUnhidden }: HiddenFolderProps) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hiddenImages, setHiddenImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      checkPassword();
    } else {
      setIsUnlocked(false);
      setPassword('');
      setConfirmPassword('');
      setError('');
      setShowResetPassword(false);
      setResetSuccess(false);
      setCurrentPassword('');
      setNewPassword('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isUnlocked) {
      fetchHiddenImages();
    }
  }, [isUnlocked]);

  const checkPassword = async () => {
    setLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-hidden-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'check' }),
      });

      if (response.ok) {
        const data = await response.json();
        setHasPassword(data.hasPassword);
      }
    } catch (error) {
      console.error('Check password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSettingPassword(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-hidden-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'set', password }),
      });

      if (!response.ok) {
        throw new Error('Failed to set password');
      }

      setHasPassword(true);
      setIsUnlocked(true);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Set password error:', error);
      setError('Failed to set password. Please try again.');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password) {
      setError('Please enter password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-hidden-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'verify', password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setIsUnlocked(true);
          setPassword('');
        } else {
          setError('Incorrect password');
        }
      } else {
        throw new Error('Failed to verify password');
      }
    } catch (error) {
      console.error('Verify password error:', error);
      setError('Failed to verify password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-hidden-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset',
          currentPassword,
          newPassword
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      setResetSuccess(true);
      setTimeout(() => {
        setShowResetPassword(false);
        setResetSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const fetchHiddenImages = async () => {
    setLoadingImages(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-hidden-images`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHiddenImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to fetch hidden images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleImageUnhidden = () => {
    fetchHiddenImages();
    if (onImageUnhidden) {
      onImageUnhidden();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Lock className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Hidden Folder</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && !isUnlocked ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading...</p>
              </div>
            </div>
          ) : !isUnlocked ? (
            <div className="max-w-md mx-auto py-8">
              {hasPassword === false ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex p-4 bg-orange-100 rounded-full mb-4">
                      <Lock className="w-12 h-12 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Set Hidden Folder Password</h3>
                    <p className="text-gray-600">Create a password to protect your hidden images</p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                          disabled={isSettingPassword}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        disabled={isSettingPassword}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSetPassword();
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSetPassword}
                      disabled={isSettingPassword || !password || !confirmPassword}
                      className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {isSettingPassword ? 'Setting Password...' : 'Set Password'}
                    </button>
                  </div>
                </div>
              ) : showResetPassword ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex p-4 bg-orange-100 rounded-full mb-4">
                      <Lock className="w-12 h-12 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Reset Password</h3>
                    <p className="text-gray-600">Enter your current password to set a new one</p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  {resetSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      Password reset successfully!
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                          disabled={resetLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        disabled={resetLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        disabled={resetLoading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleResetPassword();
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={handleResetPassword}
                      disabled={resetLoading || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {resetLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setError('');
                      }}
                      className="w-full text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Back to login
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex p-4 bg-orange-100 rounded-full mb-4">
                      <Lock className="w-12 h-12 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Enter Password</h3>
                    <p className="text-gray-600">Enter your password to access hidden images</p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                          disabled={loading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleVerifyPassword();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleVerifyPassword}
                      disabled={loading || !password}
                      className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {loading ? 'Verifying...' : 'Unlock'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPassword(true);
                        setPassword('');
                        setError('');
                      }}
                      className="w-full text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Hidden Images ({hiddenImages.length})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  These images are hidden from your main gallery
                </p>
              </div>

              {loadingImages ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500">Loading images...</p>
                  </div>
                </div>
              ) : hiddenImages.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                    <EyeOff className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Hidden Images</h3>
                  <p className="text-gray-500">Hide images from your gallery to see them here</p>
                </div>
              ) : (
                <HiddenImageGrid
                  images={hiddenImages}
                  sessionToken={sessionToken}
                  onImageUnhidden={handleImageUnhidden}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HiddenImageGridProps {
  images: any[];
  sessionToken: string;
  onImageUnhidden: () => void;
}

function HiddenImageGrid({ images, sessionToken, onImageUnhidden }: HiddenImageGridProps) {
  const [unhiding, setUnhiding] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkUnhiding, setBulkUnhiding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleUnhide = async (imageId: string) => {
    if (!confirm('Unhide this image?')) {
      return;
    }

    setUnhiding(imageId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-hidden`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId, hidden: false }),
      });

      if (!response.ok) {
        throw new Error('Unhide failed');
      }

      onImageUnhidden();
    } catch (error) {
      console.error('Unhide error:', error);
      alert('Failed to unhide image. Please try again.');
    } finally {
      setUnhiding(null);
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

  const handleBulkUnhide = async () => {
    if (selectedImages.size === 0) return;

    if (!confirm(`Unhide ${selectedImages.size} images?`)) {
      return;
    }

    setBulkUnhiding(true);

    try {
      const unhidePromises = Array.from(selectedImages).map(imageId =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-hidden`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageId, hidden: false }),
        })
      );

      await Promise.all(unhidePromises);
      setSelectedImages(new Set());
      setIsSelectionMode(false);
      onImageUnhidden();
    } catch (error) {
      console.error('Bulk unhide error:', error);
      alert('Failed to unhide some images. Please try again.');
    } finally {
      setBulkUnhiding(false);
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

      onImageUnhidden();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image. Please try again.');
    } finally {
      setDeleting(null);
    }
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
      onImageUnhidden();
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

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-slate-200">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectionMode}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-all font-medium shadow-sm"
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
                  className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
                >
                  Select All
                </button>
                {selectedImages.size > 0 && (
                  <button
                    onClick={deselectAll}
                    className="text-sm text-slate-600 hover:text-slate-700 font-semibold"
                  >
                    Deselect All
                  </button>
                )}
                <span className="text-sm text-slate-700 font-medium bg-slate-100 px-3 py-1 rounded-full">
                  {selectedImages.size} selected
                </span>
              </>
            )}
          </div>
          {selectedImages.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkUnhide}
                disabled={bulkUnhiding}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-md disabled:opacity-50"
                title="Unhide Images"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium hidden md:inline">
                  {bulkUnhiding ? 'Unhiding...' : 'Unhide'}
                </span>
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md disabled:opacity-50"
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
            onClick={() => handleImageClick(image.id)}
            className={`group relative aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 ${
              isSelectionMode ? 'cursor-pointer' : ''
            } ${selectedImages.has(image.id) ? 'ring-4 ring-amber-500' : ''}`}
          >
            {isSelectionMode && (
              <div className="absolute top-2 left-2 z-10">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  selectedImages.has(image.id)
                    ? 'bg-amber-500'
                    : 'bg-white/80 backdrop-blur-sm border-2 border-slate-300'
                }`}>
                  {selectedImages.has(image.id) && (
                    <CheckSquare className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            )}
            <img
              src={image.url}
              alt={image.filename}
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
            {!isSelectionMode && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleUnhide(image.id)}
                    disabled={unhiding === image.id}
                    className="p-2 bg-emerald-500/90 hover:bg-emerald-600 rounded-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                    title="Unhide image"
                  >
                    <Eye className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    disabled={deleting === image.id}
                    className="p-2 bg-red-500/90 hover:bg-red-600 rounded-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                    title="Move to trash"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white text-sm font-medium truncate">{image.filename}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
