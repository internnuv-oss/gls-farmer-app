import { ImageManipulator, SaveFormat, manipulateAsync } from 'expo-image-manipulator';

/**
 * Resizes and compresses local image URIs for fast network uploads.
 * Tries the Expo ImageManipulator context API first, then manipulateAsync
 * (same path used in dealer/distributor onboarding).
 */
export const compressImage = async (
  uri: string,
  maxWidth: number = 1024,
  compressQuality: number = 0.6
): Promise<string> => {
  try {
    const context = ImageManipulator.manipulate(uri);
    const manipulatedImage = await context
      .resize({ width: maxWidth })
      .renderAsync();
    const savedImage = await manipulatedImage.saveAsync({
      format: SaveFormat.JPEG,
      compress: compressQuality,
    });
    return savedImage.uri;
  } catch (error) {
    try {
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: maxWidth } }],
        { compress: compressQuality, format: SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (fallbackError) {
      console.warn("Image compression failed, falling back to original URI:", fallbackError);
      return uri;
    }
  }
};