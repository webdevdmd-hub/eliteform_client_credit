import imageCompression from 'browser-image-compression';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.5, // Max 500KB
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp'
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error("Compression failed", error);
    return file; // Return original if compression fails
  }
};

export const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Upload a file to Firebase Storage with client-side compression for images.
 * Returns the download URL. Non-image files are uploaded unchanged.
 */
export const uploadWithCompression = async (file: File, path: string): Promise<string> => {
  const isImage = file.type.startsWith('image/');
  const processed = isImage ? await compressImage(file) : file;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, processed, { contentType: processed.type || file.type });
  return getDownloadURL(storageRef);
};
