// Frontend/src/core/permissions.ts

import * as ImagePicker from "expo-image-picker";

// Helper function to prevent Android permission dialogs from permanently hanging
const withTimeout = (promise: Promise<any>, timeoutMs: number = 5000) => {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => {
      resolve({ 
        granted: false, 
        fallbackMessage: "Permission request timed out or was dismissed. Please tap the button to try again." 
      });
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutHandle);
      return result;
    }),
    timeoutPromise,
  ]);
};

export async function requestMediaPermission() {
  const result: any = await withTimeout(
    (async () => {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return {
        granted: res.granted,
        fallbackMessage: res.granted
          ? ""
          : "Media access is required to upload documents.",
      };
    })(),
    5000 // 5 second timeout
  );

  return result;
}

export async function requestCameraPermission() {
  const result: any = await withTimeout(
    (async () => {
      const res = await ImagePicker.requestCameraPermissionsAsync();
      return {
        granted: res.granted,
        fallbackMessage: res.granted
          ? ""
          : "Camera access is required to capture photos.",
      };
    })(),
    5000 // 5 second timeout
  );

  return result;
}