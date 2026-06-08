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
          welcome: "Revera Clinics",
          heading: "The Clinic You've Been Looking For.",
          description:
            "Revera is New Cairo's destination for women who want visible results. Expert dermatology, cosmetic surgery, and laser care in a setting that respects your time and your standards.",
          bookBtn: "Reserve a Consultation",
          rating: "4.5",
          reviewCount: "(1000+ review)",
        },
        {
          welcome: "Revera Clinics",
          heading: "15 Years of Results. Designed for You.",
          description:
            "Dr. Mahmoud Nasr Abu Obeid, MRCS Edinburgh, has spent his career delivering precise skin outcomes. Every treatment plan at Revera is built around your specific concerns, not a standard protocol.",
          bookBtn: "Reserve a Consultation",
          rating: "4.5",
          reviewCount: "(1000+ review)",
        },
        {
          welcome: "Revera Clinics",
          heading: "This Is What the Right Clinic Feels Like.",
          description:
            "From first consultation to final result, Revera is built for the woman who values quality and privacy above all. Limited monthly appointments. Reserve yours.",
          bookBtn: "Reserve a Consultation",
          rating: "4.5",
          reviewCount: "(1000+ review)",
        },
      ],
    },
    about: {
      tag: "About Us",
      subtitle: "Precision care for women who expect more.",
      heading: "Where Expertise Meets Care",
      description:
        "Revera Clinics operates under the direct supervision of Dr. Mahmoud Nasr Abu Obeid, Consultant Surgical Dermatologist, MRCS Edinburgh, with 15 years of experience across Egypt, Saudi Arabia, and the USA. Every treatment plan is personal. Every result is the standard we hold ourselves to.",
      services: [
        "Dermatology & Laser Treatments",
        "Cosmetic & Plastic Surgery",
        "Dental Care Services",
      ],
      needHelp: "Need Help?",
      phone: "(+20) 01035595691",
      readMore: "Reserve a Consultation",
    },
    results: {
      tag: "See the Difference",
      heading: "Real Patients. Real Results.",
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
        "Expert treatments designed for your skin and your goals.",
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
      ctaText: "Ready to start?",
      ctaBtn: "Book a Consultation",
    },
    whatWeDo: {
      tag: "what we do",
      heading: "Everything Your Skin and Confidence Need.",
      description:
        "From precision dermatology to cosmetic surgery and dental care, Revera covers every dimension of aesthetic health. One clinic. One doctor who knows your history. Consistent, expert results.",
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
      heading: "Why Women Choose Revera",
      description:
        "Revera does not compete on price. It competes on outcomes. Board-certified surgical dermatology, a clinic designed for privacy, and treatment plans that hold to one standard: what actually works for your skin.",
      quote:
        '"Skin responds to precision, not promises. At Revera, every patient receives a plan built specifically for her condition, her timeline, and her goals. My job is to earn your trust through results, not marketing."',
      contactLabel: "Contact Us:",
      phone: "(+20) 01035595691",
    },
    howItWorks: {
      tag: "how it works",
      heading: "Your Journey at Revera",
      description:
        "From first contact to lasting results, every step is guided, explained, and built around your specific needs. Nothing is rushed. Everything is intentional.",
      contactBtn: "contact us",
      steps: [
        {
          number: "1.",
          title: "Consultation",
          description:
            "A private one-on-one with Dr. Abu Obeid. Your skin concerns, your history, your goals. We listen before we suggest anything.",
        },
        {
          number: "2.",
          title: "Your Plan",
          description:
            "A treatment program built for your skin, your timeline, and your expectations. No standard protocols.",
        },
        {
          number: "3.",
          title: "Treatment",
          description:
            "Expert care in a space designed for your comfort and privacy. From preparation to procedure, you are in capable hands.",
        },
        {
          number: "4.",
          title: "Follow-Up",
          description:
            "We monitor your results and adjust as needed. Your outcome is our ongoing responsibility, not a one-time visit.",
        },
      ],
    },
    testimonials: {
      tag: "From Our Patients",
      heading: "A message from Dr. Mahmoud Nasr Abu Obeid",
      quote:
        '"Over 15 years in surgical dermatology, I have seen what precision medicine can do when it is built around the individual, not a protocol. At Revera, we do not offer the same treatment to every patient. We listen, we assess, and we build a plan that is yours alone. Confidence is not a luxury. With the right care, it is achievable."',
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
          text: '"أنا بشكر دكتور محمود نصر على المجهود الرائع اللي بذله معايا، كنت بعاني من مشاكل في البشرة ومكنتش متخيلة إني هوصل للنتيجة دي. الحمد لله بمجهودات د. محمود في عيادات ريفيرا حصل تغيير كبير في بشرتي وثقتي بنفسي!"',
          author: "Aya Mahmoud",
          role: "Client",
        },
        {
          text: '"Revera Clinics is very professional, skilled and highly experienced medical center. Dr. Mahmoud provides the most effective and advanced dermatology treatments."',
          author: "Sarah Ahmed",
          role: "Client",
        },
        {
          text: '"Very professional and knowledgeable. Dr. Mahmoud was very welcoming and informative about skin care and treatments. The results were amazing. I definitely recommend Revera Clinics!"',
          author: "Omar Abdel Meguid",
          role: "Client",
        },
      ],
    },
    appointment: {
      tag: "Get Started",
      heading: "Reserve Your Consultation",
      fields: {
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email",
        phone: "Phone",
        message: "Message",
      },
      sendBtn: "Book a Consultation",
      whatsappBtn: "WhatsApp Us",
    },
    footer: {
      blogHeading: "Skin knowledge from our experts",
      description:
        "A premium dermatology and cosmetic clinic in New Cairo, built for women who value expertise, privacy, and results that last.",
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
      aboutTag: "About Us",
      aboutHeading: "Your beauty journey with us",
      aboutDescription:
        "Welcome to Revera Clinics, operated by ABU OBEID Group Co. and under the supervision of Dr. Mahmoud Nasr Abu Obeid, Consultant Surgical Dermatologist with over 15 years of experience. We believe beauty and health are unique reflections of personalized care, enhanced through advanced medical techniques and comprehensive treatment plans designed just for you.",
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
      phone: "(+20) 01035595691",
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
          question: "1. What services does Revera Clinics offer?",
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
      phone: "(+20) 01035595691",
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
          welcome: "عيادات ريفيرا",
          heading: "العيادة التي كنتِ تبحثين عنها.",
          description:
            "ريفيرا هي وجهة نساء القاهرة الجديدة اللواتي يُردن نتائج حقيقية. طب جلدية متخصص وجراحة تجميلية وليزر في مكان يحترم وقتكِ ومعاييركِ.",
          bookBtn: "احجزي استشارتكِ",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
        },
        {
          welcome: "عيادات ريفيرا",
          heading: "15 عاماً من النتائج. مُصمَّمة لكِ.",
          description:
            "دكتور محمود نصر أبو عبيد، حاصل على MRCS من إدنبرة، أمضى مسيرته في تحقيق أفضل نتائج الجلد. كل خطة علاج في ريفيرا مبنية على احتياجاتكِ أنتِ، لا على بروتوكول عام.",
          bookBtn: "احجزي استشارتكِ",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
        },
        {
          welcome: "عيادات ريفيرا",
          heading: "هكذا تبدو العيادة المناسبة.",
          description:
            "من أول استشارة حتى آخر نتيجة، ريفيرا مُصمَّمة للمرأة التي تُقدّر الجودة والخصوصية. عدد محدود من المواعيد شهرياً. احجزي مكانكِ.",
          bookBtn: "احجزي استشارتكِ",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
        },
      ],
    },
    about: {
      tag: "من نحن",
      subtitle: "رعاية دقيقة للمرأة التي تستحق الأفضل.",
      heading: "حيث تلتقي الخبرة بالاهتمام",
      description:
        "عيادات ريفيرا تعمل تحت الإشراف المباشر للدكتور محمود نصر أبو عبيد، استشاري جراحة الجلدية، MRCS إدنبرة، بخبرة تمتد لأكثر من 15 عاماً في مصر والمملكة العربية السعودية والولايات المتحدة. كل خطة علاج شخصية. كل نتيجة هي المعيار الذي نلتزم به.",
      services: [
        "الجلدية وعلاجات الليزر",
        "الجراحة التجميلية والتشكيلية",
        "خدمات طب الأسنان",
      ],
      needHelp: "تحتاجين مساعدة؟",
      phone: "(+20) 01035595691",
      readMore: "احجزي استشارة",
    },
    results: {
      tag: "شاهد الفرق",
      heading: "مريضات حقيقيات. نتائج حقيقية.",
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
        "علاجات متخصصة مُصممة لبشرتكِ وأهدافكِ.",
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
      ctaText: "هل أنتِ مستعدة لبدء رحلتكِ؟",
      ctaBtn: "احجزي استشارة",
    },
    whatWeDo: {
      tag: "ما نقدمه",
      heading: "كل ما تحتاجه بشرتكِ وثقتكِ.",
      description:
        "من طب الجلدية الدقيق إلى الجراحة التجميلية وطب الأسنان، ريفيرا تغطي كل جوانب الصحة الجمالية. عيادة واحدة. طبيب يعرف تاريخكِ. نتائج متسقة ومحترفة.",
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
      heading: "لماذا تختار النساء ريفيرا",
      description:
        "ريفيرا لا تنافس على السعر. تنافس على النتائج. طب جلدية جراحي معتمد، وعيادة مصممة للخصوصية، وخطط علاج تلتزم بمعيار واحد: ما يناسب بشرتكِ فعلاً.",
      quote:
        '"البشرة تستجيب للدقة، لا للوعود. في ريفيرا، كل مريضة تحصل على خطة مبنية خصيصاً لحالتها وجدولها الزمني وأهدافها. مهمتي أن أكسب ثقتكِ من خلال النتائج، لا التسويق."',
      contactLabel: "تواصل معنا:",
      phone: "(+20) 01035595691",
    },
    howItWorks: {
      tag: "كيف يعمل",
      heading: "رحلتكِ في ريفيرا",
      description:
        "من أول تواصل حتى النتائج الدائمة، كل خطوة مُرشَدة ومُفسَّرة ومُصممة حول احتياجاتكِ الخاصة. لا شيء مستعجل. كل شيء مدروس.",
      contactBtn: "تواصل معنا",
      steps: [
        {
          number: "١.",
          title: "الاستشارة",
          description:
            "جلسة خاصة مع الدكتور أبو عبيد. مخاوف بشرتكِ، تاريخكِ الطبي، وأهدافكِ. نستمع قبل أن نقترح أي شيء.",
        },
        {
          number: "٢.",
          title: "خطتكِ",
          description:
            "برنامج علاجي مبني خصيصاً لبشرتكِ وجدولكِ الزمني وتوقعاتكِ. لا بروتوكولات عامة.",
        },
        {
          number: "٣.",
          title: "العلاج",
          description:
            "رعاية متخصصة في مكان مُصمَّم لراحتكِ وخصوصيتكِ. من التحضير حتى الإجراء، أنتِ في أيدٍ أمينة.",
        },
        {
          number: "٤.",
          title: "المتابعة",
          description:
            "نراقب نتائجكِ ونعدّل وفقاً للحاجة. نتيجتكِ هي مسؤوليتنا المستمرة، لا زيارة واحدة.",
        },
      ],
    },
    testimonials: {
      tag: "من مريضاتنا",
      heading: "رسالة من د. محمود نصر أبو عبيد",
      quote:
        '"على مدار أكثر من 15 عاماً في جراحة الجلدية، رأيت ما تستطيع فعله الطب الدقيق حين يُبنى حول الفرد لا حول بروتوكول. في ريفيرا، لا نقدم نفس العلاج لكل مريضة. نستمع، نُقيّم، ونضع خطة هي خطتكِ وحدكِ. الثقة بالنفس ليست رفاهية. مع الرعاية الصحيحة، هي قابلة للتحقيق."',
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
          text: '"أنا بشكر دكتور محمود نصر على المجهود الرائع اللي بذله معايا، كنت بعاني من مشاكل في البشرة ومكنتش متخيلة إني هوصل للنتيجة دي. الحمد لله بمجهودات د. محمود في عيادات ريفيرا حصل تغيير كبير في بشرتي وثقتي بنفسي!"',
          author: "آية محمود",
          role: "عميلة",
        },
        {
          text: '"عيادات ريفيرا محترفة جداً وذات مهارة وخبرة عالية. يقدم الدكتور محمود أكثر علاجات الجلدية فعالية وتطوراً."',
          author: "سارة أحمد",
          role: "عميلة",
        },
        {
          text: '"محترف جداً ومتمكن. كان الدكتور محمود مرحباً جداً ومفيداً في شرح العناية بالبشرة والعلاجات. كانت النتائج مذهلة. أنصح بشدة بعيادات ريفيرا!"',
          author: "عمر عبد المجيد",
          role: "عميل",
        },
      ],
    },
    appointment: {
      tag: "ابدئي الآن",
      heading: "احجزي استشارتكِ",
      fields: {
        firstName: "الاسم الأول",
        lastName: "اسم العائلة",
        email: "البريد الإلكتروني",
        phone: "رقم الهاتف",
        message: "الرسالة",
      },
      sendBtn: "احجزي استشارة",
      whatsappBtn: "راسلينا عبر واتساب",
    },
    footer: {
      blogHeading: "معرفة البشرة من خبرائنا",
      description:
        "عيادة جلدية وتجميلية متميزة في القاهرة الجديدة، مُصممة للمرأة التي تُقدّر الخبرة والخصوصية ونتائج تدوم.",
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
      aboutHeading: "قصتنا",
      aboutDescription:
        "عيادات ريفيرا تعمل تحت الإشراف المباشر للدكتور محمود نصر أبو عبيد، استشاري جراحة الجلدية، MRCS إدنبرة، بخبرة تمتد لأكثر من 15 عاماً في مصر والمملكة العربية السعودية والولايات المتحدة. نؤمن بأن الجمال والصحة نتاج رعاية شخصية دقيقة، لا بروتوكولات عامة.",
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
      phone: "(+20) 01035595691",
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
          question: "١. ما الخدمات التي تقدمها عيادات ريفيرا؟",
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
      phone: "(+20) 01035595691",
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
      title: "مرحباً بك في ريفيرا",
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
