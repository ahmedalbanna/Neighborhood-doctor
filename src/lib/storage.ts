import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadMessageFile(file: File, consultationId: string): Promise<string> {
  const filePath = `consultations/${consultationId}/messages/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, filePath);
  
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}
