// src/config/client.ts
// Edit this file when forking the repository for a new client.

export const CLIENT = {
  name: "Revera Clinics",
  nameShort: "Revera",

  // Used in page <head> metadata
  tagline: "Medical Center",
  metaDescription: "Expert dermatology and cosmetic surgery services in Egypt.",

  // Contact Information
  phoneDisplay: "(+20) 01035595691",
  phoneTel: "+201035595691",
  whatsappNumber: "201035595691",
  whatsappGreeting: "Hello Revera, I'd love to schedule a consultation at your New Cairo branch. Please let me know your earliest availability. Thank you.",
  whatsappBookingGreeting: (serviceName: string) =>
    `Hello Revera, I'm interested in booking "${serviceName}". Please let me know your availability at your New Cairo branch. Thank you.`,

  // Brand Assets
  logoPath: "/images/main_logo.png",
  faviconPath: "/icon.png",

  // localStorage Key Prefix (prevents collisions between forks on the same domain)
  storagePrefix: "revera",

  // Superadmin Email Bypass
  superadminEmail: "superadmin@revera.com",
} as const;
