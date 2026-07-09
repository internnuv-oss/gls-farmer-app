import { appConfig } from "../../../core/config";

export async function uploadFileToCloudinary(uri: string, type: "image" | "raw" | "audio" | "video") {
  // Cloudinary uses the "video" resource endpoint for both video and audio files
  const resourceType = type === "image" ? "image" : (type === "audio" || type === "video") ? "video" : "raw";
  const endpoint = `https://api.cloudinary.com/v1_1/${appConfig.cloudinaryCloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("upload_preset", appConfig.cloudinaryUploadPreset);
  
  // Set fallback extensions based on the type
  const extractedFileName = uri.split('/').pop() || (
    type === "image" ? "upload.jpg" : 
    type === "audio" ? "upload.m4a" : 
    type === "video" ? "upload.mp4" : 
    "document.pdf"
  );
  
  // Set the correct MIME type
  let mimeType = "application/pdf";
  if (type === "image") mimeType = "image/jpeg";
  else if (type === "audio") mimeType = "audio/m4a";
  else if (type === "video") mimeType = "video/mp4";

  formData.append("file", { 
    uri, 
    type: mimeType, 
    name: extractedFileName 
  } as never);

  const response = await fetch(endpoint, { method: "POST", body: formData });
  const data = await response.json();
  
  return data.secure_url as string;
}