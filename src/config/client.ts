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
  whatsappDepositReceipt: ({
    patientName,
    phone,
    whatsappNumber,
    serviceName,
    date,
    time,
    depositAmount,
    paymentMethod,
    sender,
  }: {
    patientName: string;
    phone: string;
    whatsappNumber?: string;
    serviceName: string;
    date: string;
    time: string | null;
    depositAmount: number;
    paymentMethod: string;
    sender: string;
  }) => `Hello Revera Clinics,

I have paid the reservation deposit for my booking:
• Patient: ${patientName}
• Phone: ${phone}${whatsappNumber ? ` (WhatsApp: ${whatsappNumber})` : ""}
• Service: ${serviceName}
• Date: ${date} at ${time}
• Deposit Amount: EGP ${depositAmount}
• Payment Method: ${paymentMethod}
• Sent From: ${sender}

Attached is my payment transaction receipt photo.`, 

  // Public web presence (used by the ad landing pages: canonical URLs, footer links, review badge)
  siteUrl: "https://www.reveraclinics.com",
  googleMapsUrl:
    "https://www.google.com/maps/place/Revera+Clinic+-+Tagamoa+Branch/@30.0012424,31.4513301,956m/data=!3m2!1e3!4b1!4m6!3m5!1s0x145823da15b7dca9:0xb388d9b9c32ebce5!8m2!3d30.0012378!4d31.4539104!16s%2Fg%2F11z28vdn2h",
  instagramUrl: "https://www.instagram.com/reveraclinicss/",
  addressAr: "المنطقة الصناعية، قسم أول القاهرة الجديدة",
  // Google Tag Manager container for the ad landing pages (public id; NEXT_PUBLIC_GTM_ID overrides it)
  gtmId: "GTM-5ZXBL7LR",
  // Laser device named on the ad landing pages (the pages promise "know the device before you book")
  laserDevice: "Candela GentleMax Pro",
  // Google Business Profile snapshot shown on the landing pages. Update by hand when it moves —
  // it is a marketing claim, so it must match what a visitor sees on the Maps listing.
  googleRating: { score: "4.9", count: 31 },

  // Brand Assets
  logoPath: "/images/main_logo.png",
  logoMarkPath: "/images/landing/revera-mark.png",
  faviconPath: "/icon.png",

  // localStorage Key Prefix (prevents collisions between forks on the same domain)
  storagePrefix: "revera",
} as const;

export const clientConfig = CLIENT;

