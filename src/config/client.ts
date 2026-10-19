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
  // Google Maps embed + turn-by-turn link for the branch (coordinates are from the Maps listing above)
  googleMapsEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3455.240762819966!2d31.45133547617349!3d30.001242420615263!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145823da15b7dca9%3A0xb388d9b9c32ebce5!2sRevera%20Clinic%20-%20Tagamoa%20Branch!5e0!3m2!1sen!2sit!4v1792411408256!5m2!1sen!2sit",
  googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=30.0012378,31.4539104",
  instagramUrl: "https://www.instagram.com/reveraclinicss/",
  addressAr: "Ozone Medical Center، عيادة C261، حي النرجس، التجمع الخامس، القاهرة الجديدة",
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

