import React, { useCallback, useState } from 'react';
import { Button } from '../ui/Components';
import { uploadWithCompression } from '../../services/utils';

interface FileUploadProps {
  label: string;
  path: string; // Storage path
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  accept?: string;
  disabled?: boolean;
  required?: boolean;
  errorMessage?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  path,
  onUploadComplete,
  currentUrl,
  accept = "image/*,.pdf",
  disabled,
  required,
  errorMessage
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const url = await uploadWithCompression(file, path);
      onUploadComplete(url);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [path, onUploadComplete]);

  return (
    <div className="border border-dashed border-stone-300 rounded-xl p-4 bg-stone-50 hover:bg-stone-100 transition-colors">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-700">{label}</label>
          {required && !currentUrl && <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Required</span>}
        </div>
        <div className="text-xs sm:text-right">
          {uploading && <span className="text-primary-600 animate-pulse">Uploading...</span>}
          {!uploading && errorMessage && <span className="text-red-600 font-medium">{errorMessage}</span>}
        </div>
      </div>
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {!currentUrl && (
          <div className="relative overflow-hidden w-full">
            <input 
              type="file" 
              accept={accept}
              onChange={handleFileChange} 
              disabled={uploading || disabled}
              className="block w-full text-sm text-stone-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-xs file:font-semibold
                file:bg-stone-200 file:text-stone-700
                hover:file:bg-stone-300 cursor-pointer"
            />
          </div>
        )}

        {currentUrl && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700 text-lg font-semibold">✓</div>
            <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline truncate sm:flex-1">View File</a>
            {!disabled && (
               <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => document.getElementById(`file-${path}`)?.click()}>Replace</Button>
            )}
            {/* Hidden input for replace */}
            <input id={`file-${path}`} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
};
