# 🌱 FarmerApp - Sales Executive Portal

FarmerApp is a comprehensive, mobile-first React Native application built for Sales Executives (SE). It streamlines the onboarding and management process for Agricultural Dealers, Distributors, and Farmers. 

With offline-first draft capabilities, rich media uploads, dynamic PDF dossier generation, and a Supabase backend, it serves as the ultimate on-the-go tool for field executives.

---

## 🚀 Features
* **Dealer Onboarding:** A robust 9-step wizard capturing basic info, scoring, geolocation, compliance documents, and customized SE Annexures.
* **Dynamic PDF Generation:** Instantly compiles captured data, photos, and signatures into a professional Dealer Agreement Dossier.
* **Offline Drafts:** Built with Zustand & AsyncStorage, allowing executives to pause onboarding and safely resume later without losing data.
* **Rich Media & Location:** Integrated camera, document picker, audio note recording, and precise GPS location capture.
* **Multi-Language Support:** Fully integrated i18n supporting English, Gujarati, and Hindi.
* **Role-Based Authentication:** Secure login and registration powered by Supabase Auth.

---

## 🛠 Tech Stack
* **Frontend Framework:** React Native (Expo)
* **Language:** TypeScript
* **State Management:** Zustand
* **Form Handling & Validation:** React Hook Form + Zod
* **Backend & Auth:** Supabase (PostgreSQL + Row Level Security)
* **Media Storage:** Cloudinary (Images, Audio, PDFs)
* **Styling:** NativeWind / Tailwind CSS & Custom Design System Tokens

---

## 📁 Folder Structure
```text
FarmerApp/
├── .cursor/               # Cursor IDE specific configurations
├── Frontend/              # React Native Expo Application
│   ├── assets/            # Static images and icons
│   ├── src/
│   │   ├── core/          # Supabase, Cloudinary, i18n, & Permissions Config
│   │   ├── design-system/ # Reusable UI components, templates, and tokens
│   │   ├── modules/       # Feature-based architecture (auth, dashboard, onboarding)
│   │   ├── navigation/    # React Navigation setup
│   │   └── store/         # Zustand global stores (authStore, draftStore)
│   ├── App.tsx            # Application entry point
│   ├── app.json           # Expo configuration
│   └── package.json       # Dependencies
├── .gitignore             
└── README.md              
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
Make sure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Expo CLI](https://docs.expo.dev/get-started/installation/)
* Expo Go app installed on your iOS or Android device (for physical device testing).

### 2. Clone the repository
```bash
git clone https://github.com/your-username/FarmerApp.git
cd FarmerApp/Frontend
```

### 3. Install Dependencies
```bash
npm install
# or
yarn install
```

### 4. Environment Variables
Create a `.env` file inside the `Frontend` directory. You will need to provision projects on Supabase and Cloudinary and retrieve their respective keys.

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Cloudinary Configuration
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
```

### 5. Run the App
Start the Metro bundler:
```bash
npx expo start
```
* Press **`a`** to open in Android Emulator.
* Press **`i`** to open in iOS Simulator.
* **Scan the QR code** with your phone's camera (iOS) or Expo Go app (Android) to run it on a physical device.

---

## 🗄️ Database Schema Details
The app relies on a PostgreSQL database hosted on Supabase. Key tables include:
1. **`profiles`**: Stores Sales Executive details (linked to Supabase Auth).
2. **`dealers`**: Stores comprehensive JSONB records for onboarded dealers (`commitments`, `scoring`, `documents`, `annexures`). 

*(Note: Ensure Row Level Security (RLS) is enabled on the `dealers` table so SEs can only view and mutate their own onboarded dealers).*

---

## 🤝 Contributing
1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

---

## 📄 License
This project is proprietary and confidential.