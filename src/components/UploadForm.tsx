import { useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface UploadFormProps {
  onUploadSuccess: () => void;
  sessionToken: string;
}

export default function UploadForm({ onUploadSuccess, sessionToken }: UploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      const newPreviews: string[] = [];
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === selectedFiles.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage('Please select at least one file');
      return;
    }

    setUploading(true);
    setMessage('');
    setUploadProgress({ current: 0, total: files.length });

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        try {
          const formData = new FormData();
          formData.append('image', file);

          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-image`;
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
            body: formData,
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            const errorData = await response.json();
            console.error(`Upload failed for ${file.name}:`, errorData);
          }
        } catch (error) {
          failCount++;
          console.error(`Upload error for ${file.name}:`, error);
        }
      }

      if (failCount === 0) {
        setMessage(`All ${successCount} images uploaded successfully! ✓`);
      } else if (successCount === 0) {
        setMessage(`All uploads failed. Please try again.`);
      } else {
        setMessage(`${successCount} uploaded, ${failCount} failed.`);
      }

      setFiles([]);
      setPreviews([]);
      onUploadSuccess();

      setTimeout(() => {
        setMessage('');
        setUploadProgress(null);
      }, 3000);
    } catch (error) {
      setMessage('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-8 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-sm">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-indigo-900">Upload Photos</h2>
      </div>

      <div className="space-y-4">
        <div
          className="flex items-center justify-center w-full"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-600 bg-indigo-200 scale-[1.02]'
              : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100'
          }`}>
            {previews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 p-4 h-full w-full overflow-auto">
                {previews.map((preview, idx) => (
                  <img
                    key={idx}
                    src={preview}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="w-12 h-12 mb-4 text-indigo-400" />
                <p className="mb-2 text-sm text-indigo-900">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-indigo-700">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 shadow-sm">
              <p className="text-sm font-semibold text-indigo-900 mb-2">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </p>
              <div className="space-y-1 max-h-32 overflow-auto">
                {files.map((file, idx) => (
                  <div key={idx} className="text-xs text-indigo-700">
                    {idx + 1}. {file.name}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setFiles([]);
                  setPreviews([]);
                }}
                className="mt-3 text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {uploadProgress && (
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-indigo-900">
                Uploading {uploadProgress.current} of {uploadProgress.total}
              </span>
              <span className="text-sm font-medium text-indigo-700">
                {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {uploading ? 'Uploading...' : 'Upload Photos'}
        </button>

        {message && (
          <div
            className={`text-center text-sm py-2 px-4 rounded-lg ${
              message.includes('successful')
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
