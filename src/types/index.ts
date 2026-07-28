export type Language = "en" | "ar";
export type Direction = "ltr" | "rtl";

export interface Branch {
  id: string;
  name_en: string;
  name_ar: string;
  address_en: string;
  address_ar: string;
  phone?: string;
  maps_embed?: string;
  maps_link?: string;
  status: "active" | "inactive";
  sort_order: number;
  service_hours?: Array<{
    day: string;
    dayAr: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface Translation {
  nav: {
    home: string;
    about: string;
    services: string;
    blog: string;
    medicalTourism: string;
    contact: string;
    makeAppointment: string;
    login: string;
    logout: string;
    user: string;
  };
  hero: {
    slides: Array<{
      welcome: string;
      heading: string;
      description: string;
      bookBtn: string;
      rating: string;
      reviewCount: string;
      image?: string;
    }>;
  };
  about: {
    tag: string;
    subtitle: string;
    heading: string;
    description: string;
    services: string[];
    needHelp: string;
    phone: string;
    readMore: string;
    image1?: string;
    image2?: string;
    image3?: string;
  };
  results: {
    tag: string;
    heading: string;
    stats: Array<{ value: string; label: string }>;
    pairs?: Array<{ id: number; before: string; after: string }>;
  };
  services: {
    tag: string;
    heading: string;
    selectCategory: string;
    categories: Array<{ id: string; label: string; sublabel: string }>;
    loadingText: string;
    errorText: string;
    retryBtn: string;
    freeLabel: string;
    ctaText: string;
    ctaBtn: string;
  };
  packages: {
    tag: string;
    heading: string;
    loadingText: string;
    errorText: string;
  };
  whatWeDo: {
    tag: string;
    heading: string;
    description: string;
    services: string[];
    learnMore: string;
    yearsLabel: string;
  };
  introVideo: {
    playBtn: string;
  };
  whyChooseUs: {
    yearsLabel: string;
    tag: string;
    heading: string;
    description: string;
    quote: string;
    contactLabel: string;
    phone: string;
    image1?: string;
    image2?: string;
  };
  howItWorks: {
    tag: string;
    heading: string;
    description: string;
    contactBtn: string;
    steps: Array<{ number: string; title: string; description: string }>;
  };
  testimonials: {
    tag: string;
    heading: string;
    quote: string;
    doctorName: string;
    doctorTitle: string;
    doctorInfo: string;
    reviews: Array<{ text: string; author: string; role: string }>;
  };
  appointment: {
    tag: string;
    heading: string;
    fields: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      message: string;
    };
    sendBtn: string;
  };
  footer: {
    blogHeading: string;
    description: string;
    quickLinks: string;
    links: string[];
    openHours: string;
    hoursLine1: string;
    hoursLine2: string;
    contact: string;
    email: string;
    address: string;
    copyright: string;
    poweredBy: string;
    serviceHours?: Array<{
      day: string;
      dayAr: string;
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    }>;
  };
  booking: {
    title: string;
    subtitle: string;
    steps: string[];
    selectDate: string;
    selectTime: string;
    confirmTitle: string;
    notes: string;
    confirmBtn: string;
    successTitle: string;
    successSubtitle: string;
    closeBtn: string;
    backBtn: string;
    nextBtn: string;
    labels: { service: string; date: string; time: string; provider: string };
  };
  auth: {
    title: string;
    subtitle: string;
    phonePlaceholder: string;
    phoneHint: string;
    otpPlaceholder: string;
    otpHint: string;
    resendOtp: string;
    sendOtp: string;
    sending: string;
    firstName: string;
    lastName: string;
    email: string;
    gender: string;
    female: string;
    male: string;
  };
  aboutPage: {
    pageTitle: string;
    aboutTag: string;
    aboutHeading: string;
    aboutDescription: string;
    aboutList: string[];
    needHelp: string;
    servicesTag: string;
    servicesHeading: string;
    servicesDescription: string;
    skinCareTitle: string;
    skinCareDescription: string;
    hairCareTitle: string;
    hairCareDescription: string;
    supportLabel: string;
    phone: string;
    whatWeDoHeading: string;
    whatWeDoDescription: string;
    whatWeDoList: string[];
    whatWeDoImage1?: string;
    whatWeDoImage2?: string;
    storiesTag: string;
    storiesHeading: string;
    storiesList: string[];
    journeyItems: string[];
    faqTag: string;
    faqHeading: string;
    faqs: Array<{ question: string; answer: string }>;
    faqImage1?: string;
    faqImage2?: string;
  };
  servicesPage: {
    pageTitle: string;
    selectCategory: string;
    loadingText: string;
    errorText: string;
    retryBtn: string;
  };
  blogPage: {
    pageTitle: string;
    posts: Array<{ title: string; slug: string; image: string }>;
  };
  contactPage: {
    pageTitle: string;
    reachOutHeading: string;
    reachOutDescription: string;
    locationTitle: string;
    locationText: string;
    locationTextZayed: string;
    contactTitle: string;
    phone: string;
    phoneZayed: string;
    emailTitle: string;
    email: string;
    formHeading: string;
    fields: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      message: string;
    };
    submitBtn: string;
  };
}

export interface ServiceCard {
  id: string;
  title: string;
  description: string;
  image?: string;
  category: string;
  price?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  image?: string;
  date?: string;
  slug?: string;
}
