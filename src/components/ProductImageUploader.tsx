import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Camera, 
  X, 
  Image as ImageIcon, 
  Plus, 
  Check, 
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';

interface ProductImageUploaderProps {
  images: string[];
  onChange: (newImages: string[]) => void;
  maxImages?: number;
}

// Automatically compress and resize uploaded photos (e.g. mobile camera 5-10MB -> 40-70KB)
const compressProductImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let compressed = '';
        try {
          compressed = canvas.toDataURL('image/webp', 0.82);
          if (!compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', 0.82);
          }
        } catch {
          compressed = canvas.toDataURL('image/jpeg', 0.82);
        }
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 4,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    const fileArray = Array.from(files);
    
    if (images.length + fileArray.length > maxImages) {
      setErrorMsg(`Maximum ${maxImages} images allowed per product.`);
    }

    const availableSlots = maxImages - images.length;
    const toProcess = fileArray.slice(0, Math.max(0, availableSlots));
    if (toProcess.length === 0) return;

    setIsProcessing(true);
    try {
      const newImagesCollected: string[] = [];
      for (const file of toProcess) {
        if (!file.type.startsWith('image/')) {
          setErrorMsg('Please upload only valid image files (PNG, JPG, WEBP, etc.).');
          continue;
        }

        if (file.size > 20 * 1024 * 1024) {
          setErrorMsg('Image size must be less than 20MB.');
          continue;
        }

        const optimizedUrl = await compressProductImage(file);
        if (optimizedUrl) {
          newImagesCollected.push(optimizedUrl);
        }
      }

      if (newImagesCollected.length > 0) {
        onChange([...images, ...newImagesCollected]);
      }
    } catch (err) {
      console.error('Error optimizing image:', err);
      setErrorMsg('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const selected = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([selected, ...rest]);
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    if (images.length >= maxImages) {
      setErrorMsg(`Maximum ${maxImages} images allowed.`);
      return;
    }
    onChange([...images, urlInput.trim()]);
    setUrlInput('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Product Images (Upload File)
        </label>
        <span className="text-[11px] font-bold text-slate-400">
          {images.length}/{maxImages} Uploaded
        </span>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all text-center ${
          dragActive
            ? 'border-amber-500 bg-amber-50/50'
            : 'border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
          multiple
          onChange={(e) => {
            if (e.target.files) {
              processFiles(e.target.files);
            }
          }}
          className="hidden"
        />

        {/* Hidden Camera input for mobile device camera snap */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            if (e.target.files) {
              processFiles(e.target.files);
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              Drag &amp; drop product photo here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-amber-600 hover:text-amber-700 underline font-extrabold cursor-pointer"
              >
                browse files
              </button>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supports PNG, JPG, WEBP up to 20MB (auto-optimized for instant loading)
            </p>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-semibold animate-pulse">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Optimizing image for instant cloud sync...</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Select File</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              title="Snap photo with device camera"
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>Take Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUrlFallback(!showUrlFallback)}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{showUrlFallback ? 'Hide URL' : 'Paste URL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional URL input fallback */}
      {showUrlFallback && (
        <div className="flex gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200 animate-in fade-in">
          <input
            type="url"
            placeholder="Paste image link (https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
          >
            Add
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Thumbnails of Uploaded Images */}
      {images.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Uploaded Photos:
          </span>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {images.map((imgUrl, index) => (
              <div 
                key={index} 
                className="relative group rounded-xl overflow-hidden border-2 border-slate-200 aspect-square bg-white p-1.5 flex items-center justify-center shadow-xs"
              >
                <img
                  src={imgUrl}
                  alt={`Product view ${index + 1}`}
                  className="w-full h-full object-contain"
                />

                {/* Primary Tag */}
                {index === 0 ? (
                  <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 font-extrabold text-[9px] uppercase px-1.5 py-0.5 rounded shadow-xs">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(index)}
                    className="absolute top-1 left-1 bg-slate-900/70 hover:bg-amber-500 hover:text-slate-950 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Set Main
                  </button>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full opacity-90 group-hover:opacity-100 shadow-md transition-opacity"
                  title="Remove this photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {images.length < maxImages && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl aspect-square flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50/30 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-1">Add More</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
