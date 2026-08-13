import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Resizes and compresses local image URIs for fast network uploads 
 * using the modern Expo ImageManipulator Context API.
 */
export const compressImage = async (
  uri: string,
  maxWidth: number = 1080,
  compressQuality: number = 0.7
): Promise<string> => {
  try {
    // 1. Create the manipulation context
    const context = ImageManipulator.manipulate(uri);
    
    // 2. Chain the resize action and render it asynchronously
    const manipulatedImage = await context
      .resize({ width: maxWidth })
      .renderAsync();
      
    // 3. Save the result with compression and format settings
    const savedImage = await manipulatedImage.saveAsync({
      format: SaveFormat.JPEG,
      compress: compressQuality,
    });
    
    // Return the newly compressed local file URI
    return savedImage.uri;
    
  } catch (error) {
    console.warn("Image compression failed, falling back to original URI:", error);
    return uri; // Graceful fallback so the app never crashes
  }
};