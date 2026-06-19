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
          welcome: "Welcome to Revera Clinics",
          heading: "Transform Your Beauty Naturally!",
          description:
            "Expert dermatology and cosmetic surgery services with personalized care designed to help you achieve your beauty and health goals through advanced medical techniques.",
          bookBtn: "Book Appointment",
          rating: "4.5",
          reviewCount: "(1000+ review)",
        },
        {
          welcome: "Welcome to Revera Clinics",
          heading: "Advanced Medical Care You Can Trust!",
          description:
            "Discover comprehensive dermatology, cosmetic surgery, laser treatments, and dental services tailored to your unique needs. With over 15 years of professional expertise, we're here to guide you toward lasting beauty and wellness.",
          bookBtn: "Book Appointment",
          rating: "4.5",
          reviewCount: "(1000+ review)",
        },
        {
          welcome: "Welcome to Revera Clinics",
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
      tag: "About Revera",
      subtitle: "Refined aesthetics. Elevated standards.",
      heading: "A destination built for you",
      description:
        "Revera is a premium aesthetic polyclinic in New Cairo — where science-backed medicine meets a deeply personal luxury experience. We specialize in dermatology, women's health, physical therapy, and wellness, delivering exceptional care tailored exclusively to you.",
      services: [
        "Dermatology & Aesthetic Treatments",
        "Gynecology & Women's Health",
        "Physical Therapy & Osteopathy",
      ],
      needHelp: "Book a Consultation",
      phone: "(+20) 01035595691",
      readMore: "more about us",
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
      heading: "Refined care. Visible transformation.",
      description:
        "We specialize in women's aesthetics and wellness — combining science-backed medicine with a luxury experience tailored exclusively to you.",
      services: [
        "Dermatology & Aesthetic",
        "Gynecology & Women's Health",
        "Physical Therapy & Osteopathy",
      ],
      learnMore: "learn more",
      yearsLabel: "Years of Excellence",
    },
    introVideo: {
      playBtn: "Play",
    },
    whyChooseUs: {
      yearsLabel: "15+ years excellence",
      tag: "why choose us",
      heading: "Where medical expertise meets a luxury experience",
      description:
        "At Revera, every detail is intentional — from your first consultation to the moment you walk out transformed. We deliver science-backed care with the calm confidence of a private medical destination.",
      quote:
        '"We don\'t treat conditions — we transform confidence. Every session at Revera is designed around you: your goals, your skin, your journey."',
      contactLabel: "Reach us:",
      phone: "(+20) 01035595691",
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
      heading: "A destination built on trust and transformation",
      quote:
        '"Every woman who walks through our doors deserves to feel seen, heard, and transformed. At Revera, we don\'t offer generic treatments — we craft personalized experiences grounded in medical excellence and delivered with genuine care. Your confidence is our measure of success."',
      doctorName: "Revera Clinics",
      doctorTitle: "Refined Aesthetics. Elevated Standards.",
      doctorInfo: "New Cairo · Egypt",
      reviews: [
        {
          text: '"Dr. Sarah is absolutely wonderful — her technique is precise and her guidance throughout the treatment was exceptional. The results surpassed all my expectations. I\'m still continuing with her at Revera and it just keeps getting better!"',
          author: "Samar Sayed",
          role: "Client",
        },
        {
          text: '"I am truly grateful to Dr. Arwa for her dedication and expertise. I had been struggling with skin concerns for years, and the transformation I\'ve experienced at Revera Clinics has completely changed how I feel about myself!"',
          author: "Aya Mahmoud",
          role: "Client",
        },
        {
          text: '"Revera Clinics is incredibly professional, skilled, and experienced. Dr. Rana delivers the most effective and advanced dermatology treatments I have ever received."',
          author: "Sarah Ahmed",
          role: "Client",
        },
        {
          text: '"Very professional and attentive. Dr. Omaima was extremely welcoming and thorough in explaining every step of my treatment plan. The results were beyond amazing. I cannot recommend Revera Clinics enough!"',
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
      hoursLine1: "Daily: 10:00 AM – 10:00 PM",
      hoursLine2: "Open 7 Days a Week",
      contact: "Contact:",
      email: "E-mail:",
      address: "Address:",
      copyright: "Copyright © 2026 All Rights Reserved.",
      poweredBy: "Powered by Octpoii",
    },
    booking: {
      title: "Book Your Service",
      subtitle: "Select your preferred service, date and time",
      steps: ["Select Service", "Select Date", "Select Time", "Confirm"],
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
      title: "Welcome to Revera",
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
      aboutTag: "About Revera",
      aboutHeading: "Refined aesthetics. Elevated standards.",
      aboutDescription:
        "Revera is a premium aesthetic polyclinic in New Cairo — a destination where science-backed medicine meets a deeply personal luxury experience. We specialize in dermatology, women's health, physical therapy, and wellness, delivering exceptional care tailored exclusively to you.",
      aboutList: [
        "Dermatology & Aesthetic Treatments",
        "Gynecology & Women's Health",
        "Physical Therapy & Osteopathy",
      ],
      needHelp: "Book a Consultation",
      servicesTag: "our approach",
      servicesHeading: "Medicine and elegance, in perfect harmony",
      servicesDescription:
        "We believe that excellence in care and the luxury of experience are not opposites. At Revera, every consultation, every treatment, and every follow-up is designed around your goals — not a protocol.",
      skinCareTitle: "Personalized Medical Care",
      skinCareDescription:
        "Your skin, your body, and your wellness are unique. Every treatment plan at Revera is built from your specific needs, current condition, and aesthetic goals — never a one-size-fits-all approach.",
      hairCareTitle: "Transformative Results",
      hairCareDescription:
        "Visible, honest results are at the heart of what we do. From your first session to your final follow-up, we track your progress and refine your care to ensure the transformation you deserve.",
      supportLabel: "Consultation Available",
      phone: "(+20) 01035595691",
      whatWeDoHeading: "A complete wellness experience",
      whatWeDoDescription:
        "From your first consultation to your final follow-up, Revera covers every aspect of your aesthetic and medical wellbeing — beautifully and thoroughly.",
      whatWeDoList: [
        "Dermatology & Aesthetic Treatments",
        "Gynecology & Women's Health",
        "Physical Therapy & Rehabilitation",
        "Osteopathy & Therapeutic Nutrition",
      ],
      storiesTag: "our difference",
      storiesHeading: "What sets Revera apart",
      storiesList: [
        "Luxury Experience at Every Touchpoint",
        "Science-Backed, Doctor-Led Care",
        "Real, Honest Transformations",
        "Exclusively Tailored to You",
      ],
      journeyItems: ["Your confidence is our purpose", "Precision care, lasting results"],
      faqTag: "frequently asked questions",
      faqHeading: "Questions? We have answers.",
      faqs: [
        {
          question: "1. What services does Revera offer?",
          answer:
            "Revera is a premium polyclinic specializing in dermatology and aesthetic treatments, gynecology and women's health, physical therapy and rehabilitation, and osteopathy and therapeutic nutrition. Every service is delivered with medical precision and a luxury experience tailored to you.",
        },
        {
          question: "2. Who is Revera designed for?",
          answer:
            "Revera is designed for women who value elegance, privacy, and visible results. Our clients seek the best — not the cheapest — and expect a medical experience that matches their standards.",
        },
        {
          question: "3. How does my treatment plan work?",
          answer:
            "Your journey begins with a comprehensive consultation where we assess your health, aesthetic goals, and lifestyle. From this, our doctors build a fully personalized treatment plan — never a template — that evolves with your progress and needs.",
        },
        {
          question: "4. What makes Revera different from other clinics?",
          answer:
            "Revera is a destination, not a clinic. The difference is in the feeling: a private, unhurried environment, doctors who listen, and a standard of care that you can see and feel at every touchpoint — from your first appointment to your last follow-up.",
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
          image: "/images/blog/post-1.webp",
        },
        {
          title: "Retinol Revolution: Transform Your Skin While You Sleep",
          slug: "retinol",
          image: "/images/blog/post-2.jpg",
        },
        {
          title: "Hyaluronic Acid: The Ultimate Hydration Hero for All Skin Types",
          slug: "hyaluronic-acid",
          image: "/images/blog/post-3.webp",
        },
      ],
    },
    contactPage: {
      pageTitle: "Contact Us",
      reachOutHeading: "Reach out for your perfect look!",
      reachOutDescription:
        "Have questions or ready to get started? Contact us today for expert personalized consultations, and top-quality care.",
      locationTitle: "Location",
      locationText: "Ozone Medical Center, C261, New Cairo",
      locationTextZayed: "Elnada Clinics, Beverly Hills 209, Sheikh Zayed",
      contactTitle: "Contact Us",
      phone: "(+20) 01035595691",
      phoneZayed: "(+20) 01023122323",
      emailTitle: "Email",
      email: "info@reveraclinics.com",
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
      tag: "عن ريفيرا",
      subtitle: "جماليات راقية. معايير متميزة.",
      heading: "وجهة مصممة لكِ",
      description:
        "ريفيرا عيادة تجميل ورعاية متميزة في القاهرة الجديدة — تجمع بين الطب المبني على العلم وتجربة فاخرة شخصية حقيقية. نتخصص في الجلدية والتجميل وصحة المرأة والعلاج الطبيعي والعافية، لنقدم رعاية استثنائية مصممة حصراً لكِ.",
      services: [
        "علاجات الجلدية والتجميل",
        "النساء والتوليد وصحة المرأة",
        "العلاج الطبيعي وتقويم العظام",
      ],
      needHelp: "احجزي استشارتكِ",
      phone: "(+20) 01035595691",
      readMore: "اعرفي أكثر",
    },
    results: {
      tag: "شاهد الفرق",
      heading: "تحولات عملائنا الحقيقية ونتائج ملهمة",
      stats: [
        { value: "20+", label: "سنوات من الخبرة" },
        { value: "10K+", label: "عميل سعيد" },
        { value: "20+", label: "برنامج ناجح" },
        { value: "50K+", label: "استشارة مقدمة" },
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
      heading: "رعاية راقية. تحوّل حقيقي.",
      description:
        "نتخصص في جماليات المرأة وصحتها — نجمع بين الطب المبني على العلم وتجربة فاخرة مصممة حصراً لكِ.",
      services: [
        "الجلدية والتجميل",
        "النساء والتوليد وصحة المرأة",
        "العلاج الطبيعي وتقويم العظام",
      ],
      learnMore: "اعرفي أكثر",
      yearsLabel: "سنوات من التميز",
    },
    introVideo: {
      playBtn: "تشغيل",
    },
    whyChooseUs: {
      yearsLabel: "+15 سنة تميز",
      tag: "لماذا تختارينا",
      heading: "حيث تلتقي الخبرة الطبية بتجربة فارهة",
      description:
        "في ريفيرا، كل تفصيل مقصود — من استشارتكِ الأولى حتى لحظة خروجكِ متجددة. نقدم رعاية طبية مبنية على العلم بهدوء وثقة وجهة طبية خاصة.",
      quote:
        '"نحن لا نعالج فقط — بل نُحوّل الثقة. كل جلسة في ريفيرا مصممة حولكِ: أهدافكِ، بشرتكِ، رحلتكِ."',
      contactLabel: "تواصلي معنا:",
      phone: "(+20) 01035595691",
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
      heading: "وجهة مبنية على الثقة والتحوّل",
      quote:
        '"كل امرأة تدخل أبوابنا تستحق أن تُرى وتُسمع وتتحوّل. في ريفيرا، لا نقدم علاجات عامة — بل نصمم تجارب شخصية راقية مبنية على التميز الطبي وتُقدَّم بعناية حقيقية. ثقتكِ بنفسكِ هي مقياس نجاحنا."',
      doctorName: "عيادات ريفيرا",
      doctorTitle: "جماليات راقية. معايير متميزة.",
      doctorInfo: "القاهرة الجديدة · مصر",
      reviews: [
        {
          text: '"د. سارة ممتازة جداً وأسلوبها في الشرح رائع وطريقتها في العلاج دقيقة جداً. النتيجة اللي وصلتلها معاها فاقت توقعاتي تماماً 🥰 بجد شكراً جداً وأنا لسه مستمرة معاها 💐"',
          author: "سمر سيد",
          role: "عميلة",
        },
        {
          text: '"أنا بشكر د. أروى على المجهود الرائع اللي بذلته معايا، كنت بعاني من مشاكل في البشرة ومكنتش متخيلة إني هوصل للنتيجة دي. الحمد لله بمجهودات د. أروى في عيادات ريفيرا حصل تغيير كبير في بشرتي وثقتي بنفسي!"',
          author: "آية محمود",
          role: "عميلة",
        },
        {
          text: '"عيادات ريفيرا محترفة جداً وذات مهارة وخبرة عالية. تقدم الدكتورة رنا أكثر علاجات الجلدية فعالية وتطوراً."',
          author: "سارة أحمد",
          role: "عميلة",
        },
        {
          text: '"محترفة جداً ومتمكنة. كانت الدكتورة أميمة مرحبة جداً ومفيدة في شرح كل خطوة من خطوات خطة علاجي. كانت النتائج مذهلة. أنصح بشدة بعيادات ريفيرا!"',
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
      hoursLine1: "يومياً: 10:00 ص – 10:00 م",
      hoursLine2: "مفتوح 7 أيام في الأسبوع",
      contact: "اتصل:",
      email: "البريد الإلكتروني:",
      address: "العنوان:",
      copyright: "حقوق النشر © 2026 جميع الحقوق محفوظة.",
      poweredBy: "تشغيل بواسطة Octpoii",
    },
    booking: {
      title: "احجز خدمتك",
      subtitle: "اختر الخدمة والتاريخ والوقت المناسبين لك",
      steps: ["اختر الخدمة", "اختر التاريخ", "اختر الوقت", "تأكيد"],
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
      aboutTag: "عن ريفيرا",
      aboutHeading: "جماليات راقية. معايير متميزة.",
      aboutDescription:
        "ريفيرا عيادة تجميل ورعاية متميزة في القاهرة الجديدة — وجهة تجمع بين الطب المبني على العلم وتجربة فاخرة شخصية حقيقية. نتخصص في الجلدية والتجميل وصحة المرأة والعلاج الطبيعي والعافية، لنقدم رعاية استثنائية مصممة حصراً لكِ.",
      aboutList: [
        "علاجات الجلدية والتجميل",
        "النساء والتوليد وصحة المرأة",
        "العلاج الطبيعي وتقويم العظام",
      ],
      needHelp: "احجزي استشارتكِ",
      servicesTag: "منهجنا",
      servicesHeading: "الطب والأناقة في تناغم تام",
      servicesDescription:
        "نؤمن بأن التميز في الرعاية وفخامة التجربة ليسا نقيضين. في ريفيرا، كل استشارة وكل جلسة وكل متابعة مصممة حول أهدافكِ — ليس حول بروتوكول جاهز.",
      skinCareTitle: "رعاية طبية شخصية",
      skinCareDescription:
        "بشرتكِ وجسدكِ وصحتكِ فريدة. كل خطة علاج في ريفيرا مبنية على احتياجاتكِ الخاصة وحالتكِ الراهنة وأهدافكِ الجمالية — لا أسلوب موحد لدينا.",
      hairCareTitle: "نتائج تحويلية حقيقية",
      hairCareDescription:
        "النتائج الحقيقية والواضحة هي جوهر ما نقدمه. من جلستكِ الأولى وحتى متابعتكِ الأخيرة، نتابع تقدمكِ ونطوّر رعايتكِ لنضمن لكِ التحوّل الذي تستحقينه.",
      supportLabel: "الاستشارة متاحة",
      phone: "(+20) 01035595691",
      whatWeDoHeading: "تجربة عافية متكاملة",
      whatWeDoDescription:
        "من استشارتكِ الأولى إلى متابعتكِ الأخيرة، تغطي ريفيرا كل جانب من جوانب رفاهيتكِ الجمالية والطبية — بعناية وبأسلوب راقٍ.",
      whatWeDoList: [
        "علاجات الجلدية والتجميل",
        "النساء والتوليد وصحة المرأة",
        "العلاج الطبيعي وإعادة التأهيل",
        "تقويم العظام والتغذية العلاجية",
      ],
      storiesTag: "ما يميزنا",
      storiesHeading: "ما يجعل ريفيرا مختلفة",
      storiesList: [
        "تجربة فاخرة في كل لحظة",
        "رعاية طبية مبنية على العلم",
        "تحولات حقيقية وموثوقة",
        "مصممة حصراً لكِ",
      ],
      journeyItems: ["ثقتكِ بنفسكِ هي هدفنا", "دقة في الرعاية ونتائج دائمة"],
      faqTag: "أسئلة شائعة",
      faqHeading: "أسئلة؟ لدينا إجابات.",
      faqs: [
        {
          question: "١. ما الخدمات التي تقدمها ريفيرا؟",
          answer:
            "ريفيرا عيادة متميزة متخصصة في علاجات الجلدية والتجميل، وصحة المرأة والنساء والتوليد، والعلاج الطبيعي وإعادة التأهيل، وتقويم العظام والتغذية العلاجية. كل خدمة تُقدَّم بدقة طبية وتجربة فاخرة مصممة لكِ.",
        },
        {
          question: "٢. لمن صُمِّمت ريفيرا؟",
          answer:
            "ريفيرا مصممة للمرأة التي تقدّر الأناقة والخصوصية والنتائج الحقيقية. عميلاتنا يبحثن عن الأفضل — لا الأرخص — ويتوقعن تجربة طبية تليق بمعاييرهن.",
        },
        {
          question: "٣. كيف تعمل خطة علاجي؟",
          answer:
            "تبدأ رحلتكِ باستشارة شاملة نُقيّم فيها صحتكِ وأهدافكِ الجمالية وأسلوب حياتكِ. بناءً على ذلك، يضع أطباؤنا خطة علاج شخصية متكاملة — لا نموذجاً جاهزاً — تتطور مع تقدمكِ واحتياجاتكِ.",
        },
        {
          question: "٤. ما الذي يجعل ريفيرا مختلفة؟",
          answer:
            "ريفيرا وجهة، لا مجرد عيادة. الفرق في الإحساس: بيئة خاصة وهادئة، وأطباء يستمعون، ومستوى رعاية يمكنكِ رؤيته والشعور به في كل لحظة — من موعدكِ الأول إلى متابعتكِ الأخيرة.",
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
          image: "/images/blog/post-1.webp",
        },
        {
          title: "ثورة الريتينول: حوّل بشرتك أثناء نومك",
          slug: "retinol",
          image: "/images/blog/post-2.jpg",
        },
        {
          title: "حمض الهيالورونيك: بطل الترطيب الأمثل لجميع أنواع البشرة",
          slug: "hyaluronic-acid",
          image: "/images/blog/post-3.webp",
        },
      ],
    },
    contactPage: {
      pageTitle: "اتصل بنا",
      reachOutHeading: "تواصل معنا للحصول على مظهرك المثالي!",
      reachOutDescription:
        "هل لديك أسئلة أو مستعد للبدء؟ اتصل بنا اليوم للحصول على استشارات شخصية متخصصة ورعاية عالية الجودة.",
      locationTitle: "الموقع",
      locationText: "مركز أوزون الطبي، C261، القاهرة الجديدة",
      locationTextZayed: "عيادات النداء، بيفرلي هيلز 209، الشيخ زايد",
      contactTitle: "اتصل بنا",
      phone: "(+20) 01035595691",
      phoneZayed: "(+20) 01023122323",
      emailTitle: "البريد الإلكتروني",
      email: "info@reveraclinics.com",
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
