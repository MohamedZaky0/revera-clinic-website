export type Language = "en" | "ar";
export type Direction = "ltr" | "rtl";

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
  };
  results: {
    tag: string;
    heading: string;
    stats: Array<{ value: string; label: string }>;
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
    whatsappBtn: string;
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
    storiesTag: string;
    storiesHeading: string;
    storiesList: string[];
    journeyItems: string[];
    faqTag: string;
    faqHeading: string;
    faqs: Array<{ question: string; answer: string }>;
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
    contactTitle: string;
    phone: string;
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
