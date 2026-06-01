import type { Translation } from "@/types";

export const translations: Record<"en" | "ar", Translation> = {
  en: {
    nav: {
      home: "Home",
      about: "About Us",
      services: "Services",
      blog: "Blog",
      medicalTourism: "Tourism Medical Care",
      contact: "Contact Us",
      makeAppointment: "Make an Appointment",
      login: "Login",
      logout: "Logout",
      user: "User",
    },
    hero: {
      slides: [
        {
          welcome: "Welcome to Crystal Rose Clinics",
          heading: "Transform Your Beauty Naturally!",
          description:
            "Expert dermatology and cosmetic surgery services with personalized care designed to help you achieve your beauty and health goals through advanced medical techniques.",
          bookBtn: "Book Appointment",
          rating: "4.5",
          reviewCount: "(1000+ review)",
        },
        {
          welcome: "Welcome to Crystal Rose Clinics",
          heading: "Advanced Medical Care You Can Trust!",
          description:
            "Discover comprehensive dermatology, cosmetic surgery, laser treatments, and dental services tailored to your unique needs. With over 15 years of professional expertise, we're here to guide you toward lasting beauty and wellness.",
          bookBtn: "Book Appointment",
          rating: "4.5",
          reviewCount: "(1000+ review)",
        },
        {
          welcome: "Welcome to Crystal Rose Clinics",
          heading: "Your Beauty & Health Journey Starts Here!",
          description:
            "Specialized clinics under full medical supervision offering services in dermatology, cosmetic surgery, laser treatments, and dental care for all ages.",
          bookBtn: "Book Appointment",
          rating: "4.5",
          reviewCount: "(1000+ review)",
        },
      ],
    },
    about: {
      tag: "About Us",
      subtitle: "Your journey to beauty and wellness",
      heading: "Welcome to Crystal Rose",
      description:
        "Welcome to Crystal Rose Clinics, operated by ABU OBEID Group Co. and under the supervision of Dr. Mahmoud Nasr Abu Obeid, Consultant Surgical Dermatologist with over 15 years of experience. We believe in providing comprehensive medical care enhanced through advanced techniques and personalized treatment.",
      services: [
        "Dermatology & Laser Treatments",
        "Cosmetic & Plastic Surgery",
        "Dental Care Services",
      ],
      needHelp: "Need Help!",
      phone: "(+20) 01125787019",
      readMore: "more about",
    },
    results: {
      tag: "See the Difference",
      heading: "Real client transformations & inspiring results",
      stats: [
        { value: "20+", label: "Years Of Experience" },
        { value: "10K+", label: "Happy clients" },
        { value: "20+", label: "Success Programs" },
        { value: "50K+", label: "Consultations Given" },
      ],
    },
    services: {
      tag: "Services",
      heading:
        "Explore our comprehensive dermatology, cosmetic surgery, and dental services",
      selectCategory: "Select a category to view services",
      categories: [
        { id: "dental", label: "Dental Clinic", sublabel: "عياده اسنان" },
        { id: "general", label: "General", sublabel: "عام" },
        { id: "dermatology", label: "Dermatology", sublabel: "قسم الجلديه" },
        { id: "derma", label: "Derma", sublabel: "ديرما" },
      ],
      loadingText: "Loading our services...",
      errorText: "Unable to load services at the moment. Please try again later.",
      retryBtn: "Retry",
      freeLabel: "Free",
      ctaText: "Let's make something great work together.",
      ctaBtn: "Get Free Quote",
    },
    whatWeDo: {
      tag: "what we do",
      heading: "Transforming lives through advanced medical care",
      description:
        "We specialize in transforming lives through comprehensive medical services, helping you achieve your beauty and health goals with advanced treatments and optimal care.",
      services: [
        "Dermatology & Cosmetic Dermatology",
        "Laser Treatments",
        "Dentistry & Cosmetic Dentistry",
      ],
      learnMore: "learn more",
      yearsLabel: "Years of Experience",
    },
    introVideo: {
      playBtn: "Play",
    },
    whyChooseUs: {
      yearsLabel: "15+ years experience",
      tag: "why choose us",
      heading: "Experience advanced medical care with expert guidance",
      description:
        "Experience personalized care and transformative results with evidence-based medical techniques, dedicated to helping you achieve lasting beauty and wellness.",
      quote:
        '"Delivering Exceptional Medical Care Through Expert Dermatology, Cosmetic Surgery, Hospitality, and Dental Care. Personalized Solutions For Your Beauty and Health, Boost Confidence, and Ensure Outstanding Results with Professional Support Every Step of Your Journey."',
      contactLabel: "Contact Us:",
      phone: "(+20) 01125787019",
    },
    howItWorks: {
      tag: "how it works",
      heading: "Simple steps to beauty transformations",
      description:
        "Discover a seamless process designed to enhance your beauty and health through personalized consultations, customized treatment plans, and dedicated medical support. We guide you every step toward achieving your beauty and wellness goals.",
      contactBtn: "contact us",
      steps: [
        {
          number: "1.",
          title: "Initial Consultation",
          description:
            "A comprehensive medical evaluation to understand your beauty and health goals, current condition, and treatment needs.",
        },
        {
          number: "2.",
          title: "Customized Treatment Plan",
          description:
            "A tailored medical treatment program designed specifically for your needs, condition, and beauty objectives.",
        },
        {
          number: "3.",
          title: "Treatment & Care",
          description:
            "Professional medical treatment and support to help you achieve optimal results with expert care.",
        },
        {
          number: "4.",
          title: "Follow-up & Monitoring",
          description:
            "Regular follow-ups to monitor your progress and make necessary adjustments to ensure optimal and lasting results.",
        },
      ],
    },
    testimonials: {
      tag: "Our Mission",
      heading: "A message from Dr. Mahmoud Nasr Abu Obeid",
      quote:
        '"Throughout my 15+ years career in surgical dermatology and plastic surgery, I have witnessed the transformative power of advanced medical care and personalized treatment. At Crystal Rose Clinics, we don\'t just provide treatments – we understand your unique needs and create comprehensive solutions. Everyone deserves to feel beautiful, confident, and healthy. Using evidence-based methods and cutting-edge techniques, we\'re here to guide you on your journey to lasting beauty and wellness."',
      doctorName: "Dr. Mahmoud Nasr Abu Obeid",
      doctorTitle: "Consultant Surgical Dermatologist - MRCS Edinburgh, UK",
      doctorInfo: "Worked in Saudi Arabia, USA & Egypt",
      reviews: [
        {
          text: '"دكتور محمود ممتاز جداً وروحه حلوة وأسلوبه رائع في الشرح. النتيجة اللي وصلتلها في بشرتي معاه ممتازة 🥰 بجد شكراً جداً وأنا لسه مستمرة معاه ودايماً من تميز لتميز 💐"',
          author: "Samar Sayed",
          role: "Client",
        },
        {
          text: '"أنا بشكر دكتور محمود نصر على المجهود الرائع اللي بذله معايا، كنت بعاني من مشاكل في البشرة ومكنتش متخيلة إني هوصل للنتيجة دي. الحمد لله بمجهودات د. محمود في عيادات كريستال روز حصل تغيير كبير في بشرتي وثقتي بنفسي!"',
          author: "Aya Mahmoud",
          role: "Client",
        },
        {
          text: '"Crystal Rose Clinics is very professional, skilled and highly experienced medical center. Dr. Mahmoud provides the most effective and advanced dermatology treatments."',
          author: "Sarah Ahmed",
          role: "Client",
        },
        {
          text: '"Very professional and knowledgeable. Dr. Mahmoud was very welcoming and informative about skin care and treatments. The results were amazing. I definitely recommend Crystal Rose Clinics!"',
          author: "Omar Abdel Meguid",
          role: "Client",
        },
      ],
    },
    appointment: {
      tag: "Message Us",
      heading: "Send us a message!",
      fields: {
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email",
        phone: "Phone",
        message: "Message",
      },
      sendBtn: "Send Message",
    },
    footer: {
      blogHeading: "Latest insights on beauty & medical care",
      description:
        "Transforming lives with expert dermatology, cosmetic surgery, laser treatments, and comprehensive dental care.",
      quickLinks: "quick link",
      links: ["Home", "About us", "services", "Contact us"],
      openHours: "Open Hours:",
      hoursLine1: "Daily: 12:00 PM - 8:00 PM",
      hoursLine2: "Friday - Day Off",
      contact: "Contact:",
      email: "E-mail:",
      address: "Address:",
      copyright: "Copyright © 2026 All Rights Reserved.",
      poweredBy: "Powered by Octpoii",
    },
    booking: {
      title: "Book Your Service",
      subtitle: "Select your preferred date and time",
      steps: ["Select Date", "Select Time", "Confirm"],
      selectDate: "Select Your Preferred Date",
      selectTime: "Select Your Preferred Time",
      confirmTitle: "Confirm Your Booking",
      notes: "Additional Notes (Optional)",
      confirmBtn: "Confirm Booking",
      successTitle: "Booking Confirmed!",
      successSubtitle: "Your appointment has been successfully scheduled.",
      closeBtn: "Close",
      backBtn: "Back",
      nextBtn: "Next",
      labels: { service: "Service", date: "Date", time: "Time", provider: "Provider" },
    },
    auth: {
      title: "Welcome to Crystal Rose",
      subtitle: "Enter your phone number to get started",
      phonePlaceholder: "Phone Number",
      phoneHint: "Egyptian phone number (11 digits, starts with 01)",
      otpPlaceholder: "OTP Code",
      otpHint: "Enter the 6-digit code sent to your phone",
      resendOtp: "Resend OTP",
      sendOtp: "Send OTP",
      sending: "Sending OTP...",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email (Optional)",
      gender: "Gender",
      female: "Female",
      male: "Male",
    },
    aboutPage: {
      pageTitle: "About Us",
      aboutTag: "About Us",
      aboutHeading: "Your beauty journey with us",
      aboutDescription:
        "Welcome to Crystal Rose Clinics, operated by ABU OBEID Group Co. and under the supervision of Dr. Mahmoud Nasr Abu Obeid, Consultant Surgical Dermatologist with over 15 years of experience. We believe beauty and health are unique reflections of personalized care, enhanced through advanced medical techniques and comprehensive treatment plans designed just for you.",
      aboutList: [
        "Dermatology & Laser Treatments",
        "Cosmetic & Plastic Surgery",
        "Comprehensive Dental Care",
      ],
      needHelp: "Need Help!",
      servicesTag: "our services",
      servicesHeading: "Your beauty with us",
      servicesDescription:
        "We combine evidence-based medical techniques with personalized solutions to help you achieve lasting beauty, optimal health, and wellness. We offer comprehensive medical care for all your needs, from dermatology and cosmetic surgery to laser treatments and dental care.",
      skinCareTitle: "Dermatology & Skin Care",
      skinCareDescription:
        "If you want to achieve optimal skin health, you need personalized dermatological care. We provide evidence-based treatments to help you achieve healthy, glowing skin naturally and effectively.",
      hairCareTitle: "Cosmetic Surgery",
      hairCareDescription:
        "We combine advanced cosmetic surgery with personalized care that delivers lasting results. Get the professional guidance you need for a more confident, beautiful you.",
      supportLabel: "24/7 Support",
      phone: "(+20) 01125787019",
      whatWeDoHeading: "Complete care for your beauty",
      whatWeDoDescription:
        "We provide comprehensive medical solutions including dermatology treatments, cosmetic surgery procedures, laser treatments, and dental care for complete wellness.",
      whatWeDoList: [
        "Dermatology & Laser Treatments",
        "Cosmetic & Plastic Surgery",
        "Comprehensive Dental Care",
      ],
      storiesTag: "success stories",
      storiesHeading: "Your beauty with us",
      storiesList: [
        "Advanced Medical Techniques",
        "Professional Cosmetic Surgery",
        "Complete Beauty Solutions",
        "Personalized Medical Care",
      ],
      journeyItems: ["Beautiful Skin is Healthy Skin", "Advanced Care, Lasting Results"],
      faqTag: "frequently asked questions",
      faqHeading: "Got questions? We've got answers!",
      faqs: [
        {
          question: "1. What services does Crystal Rose Clinics offer?",
          answer:
            "We provide comprehensive medical services including dermatology, cosmetic and plastic surgery, laser treatments, and dental care. Our services use evidence-based medical techniques to understand your unique needs and provide personalized treatment plans tailored to your beauty and health goals.",
        },
        {
          question: "2. What makes your medical care special?",
          answer:
            "We combine advanced medical techniques with personalized care that delivers lasting results. Whether you need dermatology treatments, cosmetic surgery, laser procedures, or dental care, we provide the professional expertise you need for a more beautiful, confident you.",
        },
        {
          question: "3. How do you determine the right treatment plan for me?",
          answer:
            "We conduct a comprehensive medical assessment of your health history, current condition, aesthetic goals, and specific needs. Through detailed consultation, we understand your unique situation and challenges, then create a personalized treatment plan designed specifically for you that is safe and effective.",
        },
        {
          question: "4. What makes your approach different from other clinics?",
          answer:
            "We believe in personalized medical care. Our approach focuses on comprehensive treatment plans tailored to each patient. We provide evidence-based medical techniques combined with ongoing support and follow-up care, ensuring you achieve your beauty and health goals with professional guidance every step of the way.",
        },
      ],
    },
    servicesPage: {
      pageTitle: "Our Services",
      selectCategory: "Select a category to view services",
      loadingText: "Loading services...",
      errorText: "Unable to load services at the moment. Please try again later.",
      retryBtn: "Retry",
    },
    blogPage: {
      pageTitle: "Our Blog",
      posts: [
        {
          title: "The Amazing Benefits of Vitamin C for Radiant, Glowing Skin",
          slug: "vitamin-c",
          image: "/images/assets/blog-1.webp",
        },
        {
          title: "Retinol Revolution: Transform Your Skin While You Sleep",
          slug: "retinol",
          image: "/images/assets/blog-2.jpg",
        },
        {
          title: "Hyaluronic Acid: The Ultimate Hydration Hero for All Skin Types",
          slug: "hyaluronic-acid",
          image: "/images/assets/blog-3.webp",
        },
      ],
    },
    contactPage: {
      pageTitle: "Contact Us",
      reachOutHeading: "Reach out for your perfect look!",
      reachOutDescription:
        "Have questions or ready to get started? Contact us today for expert personalized consultations, and top-quality care.",
      locationTitle: "Location",
      locationText: "36 A El-Nozha St, Ard El Golf, Nasr City.",
      contactTitle: "Contact Us",
      phone: "(+20) 01125787019",
      emailTitle: "Email",
      email: "info@crystalroseclinics.com",
      formHeading: "Have any questions?",
      fields: {
        firstName: "First Name",
        lastName: "Last Name",
        phone: "Phone No.",
        email: "Email Address",
        message: "Write Message...",
      },
      submitBtn: "submit now",
    },
  },

  ar: {
    nav: {
      home: "الرئيسية",
      about: "من نحن",
      services: "الخدمات",
      blog: "المدونة",
      medicalTourism: "السياحة العلاجية",
      contact: "اتصل بنا",
      makeAppointment: "احجز موعد",
      login: "تسجيل الدخول",
      logout: "تسجيل الخروج",
      user: "المستخدم",
    },
    hero: {
      slides: [
        {
          welcome: "مرحباً بكم في عيادات كريستال روز",
          heading: "حوّل جمالك بشكل طبيعي!",
          description:
            "خدمات متخصصة في طب الجلدية والجراحة التجميلية مع رعاية شخصية مصممة لمساعدتك على تحقيق أهدافك في الجمال والصحة من خلال تقنيات طبية متقدمة.",
          bookBtn: "احجز موعدًا",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
        },
        {
          welcome: "مرحباً بكم في عيادات كريستال روز",
          heading: "رعاية طبية متقدمة يمكنك الوثوق بها!",
          description:
            "اكتشف خدمات شاملة في طب الجلدية والجراحة التجميلية وعلاجات الليزر وطب الأسنان المصممة لاحتياجاتك الفريدة. مع أكثر من 15 عامًا من الخبرة المهنية، نحن هنا لإرشادك نحو الجمال الدائم والعافية.",
          bookBtn: "احجز موعدًا",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
        },
        {
          welcome: "مرحباً بكم في عيادات كريستال روز",
          heading: "رحلتك نحو الجمال والصحة تبدأ هنا!",
          description:
            "عيادات متخصصة تحت إشراف طبي كامل تقدم خدمات في طب الجلدية والجراحة التجميلية وعلاجات الليزر وطب الأسنان لجميع الأعمار.",
          bookBtn: "احجز موعدًا",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
        },
      ],
    },
    about: {
      tag: "من نحن",
      subtitle: "رحلتك نحو الجمال والعافية",
      heading: "مرحباً بكم في كريستال روز",
      description:
        "مرحباً بكم في عيادات كريستال روز، التي تديرها مجموعة أبو عبيد وتعمل تحت إشراف الدكتور محمود نصر أبو عبيد، استشاري جراحة الجلدية بخبرة تزيد عن 15 عامًا. نؤمن بتقديم رعاية طبية شاملة معززة بالتقنيات المتقدمة والعلاج الشخصي.",
      services: [
        "الجلدية وعلاجات الليزر",
        "الجراحة التجميلية والتشكيلية",
        "خدمات طب الأسنان",
      ],
      needHelp: "تحتاج مساعدة!",
      phone: "(+20) 01125787019",
      readMore: "اعرف أكثر",
    },
    results: {
      tag: "شاهد الفرق",
      heading: "تحولات عملائنا الحقيقية ونتائج ملهمة",
      stats: [
        { value: "+20", label: "سنوات من الخبرة" },
        { value: "+10K", label: "عميل سعيد" },
        { value: "+20", label: "برنامج ناجح" },
        { value: "+50K", label: "استشارة مقدمة" },
      ],
    },
    services: {
      tag: "الخدمات",
      heading:
        "استكشف خدمات الجلدية والجراحة التجميلية والأسنان الشاملة لدينا",
      selectCategory: "اختر فئة لعرض الخدمات",
      categories: [
        { id: "dental", label: "عيادة الأسنان", sublabel: "Dental Clinic" },
        { id: "general", label: "عام", sublabel: "General" },
        { id: "dermatology", label: "قسم الجلدية", sublabel: "Dermatology" },
        { id: "derma", label: "ديرما", sublabel: "Derma" },
      ],
      loadingText: "جارٍ تحميل خدماتنا...",
      errorText: "تعذّر تحميل الخدمات في الوقت الحالي. يرجى المحاولة مرة أخرى.",
      retryBtn: "إعادة المحاولة",
      freeLabel: "مجاني",
      ctaText: "لنصنع شيئاً رائعاً معاً.",
      ctaBtn: "احصل على عرض مجاني",
    },
    whatWeDo: {
      tag: "ما نقدمه",
      heading: "تحويل الحياة من خلال الرعاية الطبية المتقدمة",
      description:
        "نتخصص في تحويل الحياة من خلال الخدمات الطبية الشاملة، مما يساعدك على تحقيق أهداف الجمال والصحة بعلاجات متقدمة ورعاية مثلى.",
      services: [
        "الجلدية والجلدية التجميلية",
        "علاجات الليزر",
        "طب الأسنان وتجميل الأسنان",
      ],
      learnMore: "اعرف أكثر",
      yearsLabel: "سنوات من الخبرة",
    },
    introVideo: {
      playBtn: "تشغيل",
    },
    whyChooseUs: {
      yearsLabel: "+15 سنة خبرة",
      tag: "لماذا تختارنا",
      heading: "اختبر الرعاية الطبية المتقدمة مع إرشاد خبير",
      description:
        "استمتع بالرعاية الشخصية والنتائج التحويلية بتقنيات طبية مبنية على الأدلة، مكرسة لمساعدتك على تحقيق الجمال والعافية الدائمين.",
      quote:
        '"تقديم رعاية طبية استثنائية من خلال طب الجلدية والجراحة التجميلية والضيافة وطب الأسنان على مستوى عالٍ من الخبرة. حلول مخصصة لجمالك وصحتك، تعزيز الثقة بالنفس، وضمان نتائج متميزة بدعم احترافي في كل خطوة من رحلتك."',
      contactLabel: "تواصل معنا:",
      phone: "(+20) 01125787019",
    },
    howItWorks: {
      tag: "كيف يعمل",
      heading: "خطوات بسيطة لتحولات الجمال",
      description:
        "اكتشف عملية سلسة مصممة لتعزيز جمالك وصحتك من خلال استشارات شخصية وخطط علاجية مخصصة ودعم طبي متخصص. نرشدك في كل خطوة نحو تحقيق أهداف الجمال والعافية.",
      contactBtn: "تواصل معنا",
      steps: [
        {
          number: "١.",
          title: "الاستشارة الأولية",
          description:
            "تقييم طبي شامل لفهم أهدافك في الجمال والصحة وحالتك الراهنة واحتياجاتك العلاجية.",
        },
        {
          number: "٢.",
          title: "خطة العلاج المخصصة",
          description:
            "برنامج علاجي طبي مصمم خصيصاً لاحتياجاتك وحالتك وأهدافك الجمالية.",
        },
        {
          number: "٣.",
          title: "العلاج والرعاية",
          description:
            "علاج طبي احترافي ودعم مستمر لمساعدتك على تحقيق نتائج مثالية بخبرة متميزة.",
        },
        {
          number: "٤.",
          title: "المتابعة والمراقبة",
          description:
            "متابعات منتظمة لرصد تقدمك وإجراء التعديلات اللازمة لضمان نتائج مثالية ودائمة.",
        },
      ],
    },
    testimonials: {
      tag: "رسالتنا",
      heading: "رسالة من د. محمود نصر أبو عبيد",
      quote:
        '"على مدار مسيرتي المهنية التي تمتد لأكثر من 15 عامًا في جراحة الجلدية والجراحة التجميلية، شهدت القوة التحويلية للرعاية الطبية المتقدمة والعلاج الشخصي. في عيادات كريستال روز، لا نقدم العلاجات فحسب - بل نفهم احتياجاتك الفريدة ونبتكر حلولاً شاملة. يستحق كل شخص أن يشعر بالجمال والثقة والصحة. باستخدام أساليب مبنية على الأدلة وتقنيات متطورة، نحن هنا لإرشادك في رحلتك نحو الجمال والعافية الدائمين."',
      doctorName: "د. محمود نصر أبو عبيد",
      doctorTitle: "استشاري جراحة الجلدية - MRCS إدنبرة، المملكة المتحدة",
      doctorInfo: "عمل في المملكة العربية السعودية والولايات المتحدة ومصر",
      reviews: [
        {
          text: '"دكتور محمود ممتاز جداً وروحه حلوة وأسلوبه رائع في الشرح. النتيجة اللي وصلتلها في بشرتي معاه ممتازة 🥰 بجد شكراً جداً وأنا لسه مستمرة معاه ودايماً من تميز لتميز 💐"',
          author: "سمر سيد",
          role: "عميلة",
        },
        {
          text: '"أنا بشكر دكتور محمود نصر على المجهود الرائع اللي بذله معايا، كنت بعاني من مشاكل في البشرة ومكنتش متخيلة إني هوصل للنتيجة دي. الحمد لله بمجهودات د. محمود في عيادات كريستال روز حصل تغيير كبير في بشرتي وثقتي بنفسي!"',
          author: "آية محمود",
          role: "عميلة",
        },
        {
          text: '"عيادات كريستال روز محترفة جداً وذات مهارة وخبرة عالية. يقدم الدكتور محمود أكثر علاجات الجلدية فعالية وتطوراً."',
          author: "سارة أحمد",
          role: "عميلة",
        },
        {
          text: '"محترف جداً ومتمكن. كان الدكتور محمود مرحباً جداً ومفيداً في شرح العناية بالبشرة والعلاجات. كانت النتائج مذهلة. أنصح بشدة بعيادات كريستال روز!"',
          author: "عمر عبد المجيد",
          role: "عميل",
        },
      ],
    },
    appointment: {
      tag: "راسلنا",
      heading: "أرسل لنا رسالة!",
      fields: {
        firstName: "الاسم الأول",
        lastName: "اسم العائلة",
        email: "البريد الإلكتروني",
        phone: "رقم الهاتف",
        message: "الرسالة",
      },
      sendBtn: "إرسال الرسالة",
    },
    footer: {
      blogHeading: "أحدث المقالات حول الجمال والرعاية الطبية",
      description:
        "تحويل الحياة من خلال طب الجلدية والجراحة التجميلية وعلاجات الليزر ورعاية طب الأسنان الشاملة.",
      quickLinks: "روابط سريعة",
      links: ["الرئيسية", "من نحن", "الخدمات", "اتصل بنا"],
      openHours: "ساعات العمل:",
      hoursLine1: "يومياً: 12:00 م - 8:00 م",
      hoursLine2: "الجمعة - يوم إجازة",
      contact: "اتصل:",
      email: "البريد الإلكتروني:",
      address: "العنوان:",
      copyright: "حقوق النشر © 2026 جميع الحقوق محفوظة.",
      poweredBy: "تشغيل بواسطة Octpoii",
    },
    booking: {
      title: "احجز خدمتك",
      subtitle: "اختر التاريخ والوقت المناسبين لك",
      steps: ["اختر التاريخ", "اختر الوقت", "تأكيد"],
      selectDate: "اختر تاريخك المفضل",
      selectTime: "اختر وقتك المفضل",
      confirmTitle: "تأكيد حجزك",
      notes: "ملاحظات إضافية (اختياري)",
      confirmBtn: "تأكيد الحجز",
      successTitle: "تم تأكيد الحجز!",
      successSubtitle: "تم جدولة موعدك بنجاح.",
      closeBtn: "إغلاق",
      backBtn: "رجوع",
      nextBtn: "التالي",
      labels: { service: "الخدمة", date: "التاريخ", time: "الوقت", provider: "المزود" },
    },
    aboutPage: {
      pageTitle: "من نحن",
      aboutTag: "من نحن",
      aboutHeading: "رحلتك الجمالية معنا",
      aboutDescription:
        "مرحباً بكم في عيادات كريستال روز، التي تديرها مجموعة أبو عبيد وتعمل تحت إشراف الدكتور محمود نصر أبو عبيد، استشاري جراحة الجلدية بخبرة تزيد عن 15 عامًا. نؤمن بأن الجمال والصحة انعكاسات فريدة للرعاية الشخصية، معززة بالتقنيات الطبية المتقدمة وخطط العلاج الشاملة المصممة خصيصاً لك.",
      aboutList: [
        "الجلدية وعلاجات الليزر",
        "الجراحة التجميلية والتشكيلية",
        "رعاية شاملة لطب الأسنان",
      ],
      needHelp: "تحتاج مساعدة!",
      servicesTag: "خدماتنا",
      servicesHeading: "جمالك معنا",
      servicesDescription:
        "نجمع بين التقنيات الطبية المبنية على الأدلة والحلول الشخصية لمساعدتك على تحقيق الجمال الدائم والصحة المثلى والعافية. نقدم رعاية طبية شاملة لجميع احتياجاتك، من طب الجلدية والجراحة التجميلية إلى علاجات الليزر وطب الأسنان.",
      skinCareTitle: "الجلدية وعناية البشرة",
      skinCareDescription:
        "لتحقيق صحة بشرة مثلى، تحتاج إلى رعاية جلدية شخصية. نقدم علاجات مبنية على الأدلة لمساعدتك على تحقيق بشرة صحية ومضيئة بشكل طبيعي وفعال.",
      hairCareTitle: "الجراحة التجميلية",
      hairCareDescription:
        "نجمع بين الجراحة التجميلية المتقدمة والرعاية الشخصية لتحقيق نتائج دائمة. احصل على التوجيه المهني الذي تحتاجه لتصبح أكثر ثقة وجمالاً.",
      supportLabel: "دعم على مدار الساعة",
      phone: "(+20) 01125787019",
      whatWeDoHeading: "رعاية شاملة لجمالك",
      whatWeDoDescription:
        "نقدم حلولاً طبية شاملة تشمل علاجات الجلدية وإجراءات الجراحة التجميلية وعلاجات الليزر وطب الأسنان لرفاهية كاملة.",
      whatWeDoList: [
        "الجلدية وعلاجات الليزر",
        "الجراحة التجميلية والتشكيلية",
        "رعاية شاملة لطب الأسنان",
      ],
      storiesTag: "قصص نجاح",
      storiesHeading: "جمالك معنا",
      storiesList: [
        "تقنيات طبية متقدمة",
        "جراحة تجميلية احترافية",
        "حلول جمال شاملة",
        "رعاية طبية شخصية",
      ],
      journeyItems: ["البشرة الجميلة هي بشرة صحية", "رعاية متقدمة، نتائج دائمة"],
      faqTag: "أسئلة شائعة",
      faqHeading: "لديك أسئلة؟ لدينا إجابات!",
      faqs: [
        {
          question: "١. ما الخدمات التي تقدمها عيادات كريستال روز؟",
          answer:
            "نقدم خدمات طبية شاملة تشمل الجلدية والجراحة التجميلية والتشكيلية وعلاجات الليزر وطب الأسنان. تستخدم خدماتنا تقنيات طبية مبنية على الأدلة لفهم احتياجاتك الفريدة وتقديم خطط علاجية مخصصة تتناسب مع أهدافك الجمالية والصحية.",
        },
        {
          question: "٢. ما الذي يجعل رعايتنا الطبية مميزة؟",
          answer:
            "نجمع بين التقنيات الطبية المتقدمة والرعاية الشخصية التي تحقق نتائج دائمة. سواء كنت تحتاج إلى علاجات جلدية أو جراحة تجميلية أو إجراءات ليزر أو رعاية أسنان، نقدم لك الخبرة المهنية التي تحتاجها لتصبح أكثر جمالاً وثقة.",
        },
        {
          question: "٣. كيف تحددون خطة العلاج المناسبة لي؟",
          answer:
            "نجري تقييماً طبياً شاملاً لتاريخك الصحي وحالتك الراهنة وأهدافك الجمالية واحتياجاتك الخاصة. من خلال استشارة مفصلة، نفهم وضعك الفريد وتحدياتك، ثم ننشئ خطة علاج شخصية مصممة خصيصاً لك وآمنة وفعالة.",
        },
        {
          question: "٤. ما الذي يجعل نهجكم مختلفاً عن العيادات الأخرى؟",
          answer:
            "نؤمن بالرعاية الطبية الشخصية. يركز نهجنا على خطط علاجية شاملة مخصصة لكل مريض. نقدم تقنيات طبية مبنية على الأدلة مقترنة بدعم مستمر ورعاية متابعة، مما يضمن تحقيقك لأهداف الجمال والصحة بتوجيه احترافي في كل خطوة.",
        },
      ],
    },
    servicesPage: {
      pageTitle: "خدماتنا",
      selectCategory: "اختر فئة لعرض الخدمات",
      loadingText: "جارٍ تحميل الخدمات...",
      errorText: "تعذّر تحميل الخدمات في الوقت الحالي. يرجى المحاولة مرة أخرى.",
      retryBtn: "إعادة المحاولة",
    },
    blogPage: {
      pageTitle: "مدونتنا",
      posts: [
        {
          title: "الفوائد المذهلة لفيتامين سي للحصول على بشرة مشعة ومتوهجة",
          slug: "vitamin-c",
          image: "/images/assets/blog-1.webp",
        },
        {
          title: "ثورة الريتينول: حوّل بشرتك أثناء نومك",
          slug: "retinol",
          image: "/images/assets/blog-2.jpg",
        },
        {
          title: "حمض الهيالورونيك: بطل الترطيب الأمثل لجميع أنواع البشرة",
          slug: "hyaluronic-acid",
          image: "/images/assets/blog-3.webp",
        },
      ],
    },
    contactPage: {
      pageTitle: "اتصل بنا",
      reachOutHeading: "تواصل معنا للحصول على مظهرك المثالي!",
      reachOutDescription:
        "هل لديك أسئلة أو مستعد للبدء؟ اتصل بنا اليوم للحصول على استشارات شخصية متخصصة ورعاية عالية الجودة.",
      locationTitle: "الموقع",
      locationText: "36 أ شارع النزهة، أرض الجولف، مدينة نصر.",
      contactTitle: "اتصل بنا",
      phone: "(+20) 01125787019",
      emailTitle: "البريد الإلكتروني",
      email: "info@crystalroseclinics.com",
      formHeading: "هل لديك أسئلة؟",
      fields: {
        firstName: "الاسم الأول",
        lastName: "اسم العائلة",
        phone: "رقم الهاتف",
        email: "عنوان البريد الإلكتروني",
        message: "اكتب رسالتك...",
      },
      submitBtn: "إرسال الآن",
    },
    auth: {
      title: "مرحباً بك في كريستال روز",
      subtitle: "أدخل رقم هاتفك للبدء",
      phonePlaceholder: "رقم الهاتف",
      phoneHint: "رقم هاتف مصري (11 رقمًا، يبدأ بـ 01)",
      otpPlaceholder: "رمز التحقق",
      otpHint: "أدخل الرمز المكون من 6 أرقام المرسل إلى هاتفك",
      resendOtp: "إعادة إرسال الرمز",
      sendOtp: "إرسال الرمز",
      sending: "جارٍ الإرسال...",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      email: "البريد الإلكتروني (اختياري)",
      gender: "الجنس",
      female: "أنثى",
      male: "ذكر",
    },
  },
};
