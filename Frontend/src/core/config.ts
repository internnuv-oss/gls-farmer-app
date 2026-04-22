export const appConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  cloudinaryCloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryUploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "",
};
