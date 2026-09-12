import React, { useState, useRef } from 'react';
import { Upload, X, Star, Image as ImageIcon, Link as LinkIcon, AlertCircle, Loader2 } from 'lucide-react';
import { uploadImages } from '../services/resourceService';

export default function ImageUploader({ images = [], onChange, maxImages = 5 }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  const maxBytes = 5 * 1024 * 1024; // 5MB

  // Helper to normalize images list to objects: { id?, image_url, is_primary }
  const normalizedImages = (images || []).map((img, idx) => {
    if (typeof img === 'string') {
      return { image_url: img, is_primary: idx === 0 };
    }
    return {
      ...img,
      is_primary: Boolean(img.is_primary)
    };
  });

  const handleFiles = async (files) => {
    setError('');
    const fileList = Array.from(files);

    if (fileList.length === 0) return;

    if (normalizedImages.length + fileList.length > maxImages) {
      setError(`Maximum of ${maxImages} images allowed. You can only add ${maxImages - normalizedImages.length} more.`);
      return;
    }

    // Validate client-side
    for (const file of fileList) {
      if (!allowedTypes.includes(file.type)) {
        setError(`"${file.name}" has an unsupported format. Allowed: JPEG, PNG, WebP, GIF, SVG.`);
        return;
      }
      if (file.size > maxBytes) {
        setError(`"${file.name}" exceeds the 5MB file size limit.`);
        return;
      }
    }

    try {
      setUploading(true);
      const formData = new FormData();
      fileList.forEach(file => {
        formData.append('images', file);
      });

      const res = await uploadImages(formData);
      if (res.success && Array.isArray(res.data)) {
        const newUploaded = res.data.map((item, idx) => ({
          image_url: item.image_url,
          is_primary: normalizedImages.length === 0 && idx === 0
        }));

        const updated = [...normalizedImages, ...newUploaded];
        // Ensure at least one image is primary
        if (!updated.some(img => img.is_primary) && updated.length > 0) {
          updated[0].is_primary = true;
        }
        onChange(updated);
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload images. Please check connection and file types.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAddUrl = (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (normalizedImages.length >= maxImages) {
      setError(`Maximum limit of ${maxImages} images reached.`);
      return;
    }

    const updated = [
      ...normalizedImages,
      {
        image_url: trimmed,
        is_primary: normalizedImages.length === 0
      }
    ];
    onChange(updated);
    setUrlInput('');
    setShowUrlInput(false);
    setError('');
  };

  const handleRemove = (index) => {
    const wasPrimary = normalizedImages[index]?.is_primary;
    const updated = normalizedImages.filter((_, idx) => idx !== index);

    if (wasPrimary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    onChange(updated);
  };

  const handleSetPrimary = (index) => {
    const updated = normalizedImages.map((img, idx) => ({
      ...img,
      is_primary: idx === index
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-300">
          Resource Images ({normalizedImages.length} / {maxImages})
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showUrlInput ? 'Hide URL input' : 'Add via URL'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-3 py-2 text-xs animate-fadeIn">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* URL Input Bar */}
      {showUrlInput && (
        <div className="flex items-center space-x-2 bg-[#0d111c]/90 border border-slate-700/60 rounded-xl p-1.5 animate-fadeIn">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste image web URL (e.g. https://...)"
            className="flex-1 px-3 py-1.5 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={!urlInput.trim() || normalizedImages.length >= maxImages}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all"
          >
            Add
          </button>
        </div>
      )}

      {/* Drag and Drop Zone */}
      {normalizedImages.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-700/70 hover:border-indigo-500/50 bg-[#0d111c]/60 hover:bg-[#0d111c]/90'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            {uploading ? (
              <div className="flex flex-col items-center space-y-2 py-2">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">Optimizing & uploading images...</p>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  Drag & drop images here, or <span className="text-indigo-400 underline">browse</span>
                </p>
                <p className="text-xs text-slate-500">
                  Supports JPEG, PNG, WebP, GIF, SVG up to 5MB (Max {maxImages} images)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Previews Grid */}
      {normalizedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          {normalizedImages.map((img, idx) => (
            <div
              key={idx}
              className={`group relative rounded-xl overflow-hidden border aspect-square bg-slate-900/80 shadow-md transition-all duration-200 ${
                img.is_primary ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-700/60 hover:border-slate-500'
              }`}
            >
              <img
                src={img.image_url}
                alt={`Preview ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://placehold.co/400x400/1e293b/white?text=Invalid+Image';
                }}
              />

              {/* Primary Badge */}
              {img.is_primary && (
                <div className="absolute top-1.5 left-1.5 bg-amber-500/90 backdrop-blur-md text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 shadow">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  <span>PRIMARY</span>
                </div>
              )}

              {/* Action Overlays */}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    className="p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md transition-colors"
                    title="Remove Image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {!img.is_primary && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPrimary(idx);
                    }}
                    className="w-full py-1 px-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-[11px] font-medium rounded transition-colors flex items-center justify-center space-x-1"
                  >
                    <Star className="h-3 w-3" />
                    <span>Make Primary</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
