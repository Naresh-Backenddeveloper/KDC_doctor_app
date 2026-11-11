import { launchImageLibrary } from 'react-native-image-picker';
import type { PickedFile } from '../types';

export type PickResult =
  | { status: 'picked'; file: PickedFile }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

/** Opens the photo library; every outcome comes back as a value, never a throw. */
export async function pickDocument(): Promise<PickResult> {
  try {
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
    if (res.didCancel) return { status: 'cancelled' };
    if (res.errorCode === 'permission') return { status: 'denied' };
    if (res.errorCode) return { status: 'error', message: res.errorMessage ?? 'The photo could not be opened.' };
    const asset = res.assets?.[0];
    if (!asset?.uri) return { status: 'cancelled' };
    return {
      status: 'picked',
      file: { name: asset.fileName ?? 'document.jpg', size: asset.fileSize ?? 0, uri: asset.uri },
    };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'The photo could not be opened.' };
  }
}
