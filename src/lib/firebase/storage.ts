/**
 * Firebase Storage utilities for image uploads.
 * Requires Firebase Blaze plan.
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from './config';

/**
 * Upload a file to Firebase Storage and return the download URL.
 */
export async function uploadFile(path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return url;
}

/**
 * Upload a profile photo for a professional.
 * Path: professionals/{id}/profile.{ext}
 */
export async function uploadProfilePhoto(
  professionalId: string,
  file: File
): Promise<string> {
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `professionals/${professionalId}/profile.${extension}`;
  return uploadFile(path, file);
}

/**
 * Upload a gallery image for a professional.
 * Path: professionals/{id}/gallery/{timestamp}.{ext}
 */
export async function uploadGalleryImage(
  professionalId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `professionals/${professionalId}/gallery/${timestamp}.${extension}`;
  return uploadFile(path, file);
}

/**
 * Upload a certification document.
 * Path: professionals/{id}/certifications/cert_{index}.{ext}
 */
export async function uploadCertificationDoc(
  professionalId: string,
  file: File,
  index: number
): Promise<string> {
  const extension = file.name.split('.').pop() || 'pdf';
  const path = `professionals/${professionalId}/certifications/cert_${index}.${extension}`;
  return uploadFile(path, file);
}

/**
 * Delete a file by its download URL.
 */
export async function deleteFileByUrl(url: string): Promise<void> {
  const storageRef = ref(storage, url);
  await deleteObject(storageRef);
}

/**
 * Delete a file by its storage path.
 */
export async function deleteFileByPath(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * List all gallery images for a professional.
 */
export async function listGalleryImages(
  professionalId: string
): Promise<string[]> {
  const listRef = ref(storage, `professionals/${professionalId}/gallery`);
  const result = await listAll(listRef);
  const urls = await Promise.all(
    result.items.map((item) => getDownloadURL(item))
  );
  return urls;
}

/**
 * Validate image file (type and size).
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Format accepté : JPG, PNG ou WebP' };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Taille maximum : ${maxSizeMB} Mo` };
  }
  return { valid: true };
}
