import * as ImagePicker from "expo-image-picker";

export async function requestMediaPermission() {
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return {
    granted: result.granted,
    fallbackMessage: result.granted
      ? ""
      : "Media access is required to upload dealer documents.",
  };
}

export async function requestCameraPermission() {
  const result = await ImagePicker.requestCameraPermissionsAsync();
  return {
    granted: result.granted,
    fallbackMessage: result.granted
      ? ""
      : "Camera access is required to capture dealer photos.",
  };
}
