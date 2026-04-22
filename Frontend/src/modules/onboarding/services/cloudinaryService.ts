import { appConfig } from "../../../core/config";

export async function uploadFileToCloudinary(uri: string, type: "image" | "raw" | "audio") {
  const resourceType = type === "image" ? "image" : type === "audio" ? "video" : "raw";
  const endpoint = `https://api.cloudinary.com/v1_1/${appConfig.cloudinaryCloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("upload_preset", appConfig.cloudinaryUploadPreset);
  
  const extractedFileName = uri.split('/').pop() || (type === "image" ? "upload.jpg" : type === "audio" ? "upload.m4a" : "document.pdf");
  
  let mimeType = "application/pdf";
  if (type === "image") mimeType = "image/jpeg";
  else if (type === "audio") mimeType = "audio/m4a";

  formData.append("file", { 
    uri, 
    type: mimeType, 
    name: extractedFileName 
  } as never);

  const response = await fetch(endpoint, { method: "POST", body: formData });
  const data = await response.json();
  
  return data.secure_url as string;
}