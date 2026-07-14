// Frontend/app.config.js

import 'dotenv/config';

export default ({ config }) => ({
  ...config,

  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },

  plugins: [
    ...(config.plugins ?? []),
    "expo-sqlite",
  ],
});