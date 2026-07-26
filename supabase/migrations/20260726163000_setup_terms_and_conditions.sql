-- Create terms_and_conditions table
CREATE TABLE IF NOT EXISTS public.terms_and_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sort_order INT NOT NULL DEFAULT 0,
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL DEFAULT '',
    content_en TEXT NOT NULL,
    content_ar TEXT NOT NULL DEFAULT '',
    link_text_en TEXT DEFAULT '',
    link_text_ar TEXT DEFAULT '',
    link_url TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_terms_and_conditions_sort ON public.terms_and_conditions (sort_order ASC);

-- Seed initial terms matching image_1 content if table is empty
INSERT INTO public.terms_and_conditions (sort_order, title_en, title_ar, content_en, content_ar, link_text_en, link_text_ar, link_url, is_active)
SELECT * FROM (VALUES
  (
    1, 
    'Acceptance of Terms', 
    'قبول الشروط', 
    'By using Revera Clinic''s website or services, you agree to be bound by these Terms & Conditions and all applicable laws and regulations.', 
    'باستخدامك لموقع أو خدمات عيادة ريفيرا، فإنك توافق على الالتزام بهذه الشروط والأحكام وجميع القوانين واللوائح المعمول بها.',
    '', '', '', true
  ),
  (
    2, 
    'Use of Services', 
    'استخدام الخدمات', 
    'You agree to use our services only for lawful purposes and in accordance with our policies. You must provide accurate and complete information when booking or registering.', 
    'تتوافق على استخدام خدماتنا فقط لأغراض قانونية ووفقاً لسياساتنا. يجب عليك تقديم معلومات دقيقة وكاملة عند الحجز أو التسجيل.',
    '', '', '', true
  ),
  (
    3, 
    'Appointments & Bookings', 
    'المواعيد والحجوزات', 
    'All appointments are subject to availability and confirmation. Please arrive on time. Late arrivals may result in shortened or rescheduled appointments.', 
    'جميع المواعيد تخضع للتوافر والتأكيد. يرجى الحضور في الموعد المحدد. قد يؤدي التأخير إلى تقصير مدة الجلسة أو إعادة جدولتها.',
    '', '', '', true
  ),
  (
    4, 
    'Cancellations & Rescheduling', 
    'الإلغاء وإعادة الجدولة', 
    'You can cancel or reschedule your appointment through our website or by contacting us. Please review our cancellation policy for more details.', 
    'يمكنك إلغاء أو إعادة جدولة موعدك من خلال موقعنا أو بالاتصال بنا. يرجى مراجعة سياسة الإلغاء الخاصة بنا للمزيد من التفاصيل.',
    'cancellation policy', 'سياسة الإلغاء', '/terms#cancellation', true
  ),
  (
    5, 
    'Payments & Refunds', 
    'المدفوعات واسترداد الأموال', 
    'Certain services may require advance payment. Refund eligibility depends on our refund policy. We accept payments through the methods displayed at checkout.', 
    'قد تتطلب بعض الخدمات الدفع المسبق. تعتمد أهليّة الاسترداد على سياسة الاسترداد الخاصة بنا. نقبل الدفع عبر الطرق الموضحة عند الدفع.',
    'refund policy', 'سياسة الاسترداد', '/terms#refund', true
  ),
  (
    6, 
    'User Responsibilities', 
    'مسؤوليات المستخدم', 
    'You are responsible for maintaining the confidentiality of your information and account details. You agree not to misuse our services or attempt unauthorized access.', 
    'أنت مسؤول عن الحفاظ على سرية معلوماتك وبيانات حسابك. وتتعهد بعدم إساءة استخدام خدماتنا أو محاولة الوصول غير المصرح به.',
    '', '', '', true
  ),
  (
    7, 
    'Limitation of Liability', 
    'تحديد المسؤولية', 
    'Revera Clinic is not liable for any indirect or incidental damages resulting from the use of our services. Our total liability shall not exceed the amount paid for the service.', 
    'عيادة ريفيرا غير مسؤولة عن أي أضرار غير مباشرة أو عرضية ناتجة عن استخدام خدماتنا. لا تتجاوز مسؤوليتنا الإجمالية المبلغ المدفوع مقابل الخدمة.',
    '', '', '', true
  ),
  (
    8, 
    'Changes to Terms', 
    'التغييرات في الشروط', 
    'We may update these Terms & Conditions from time to time. Continued use of our services after changes means you accept the updated terms.', 
    'قد نقوم بتحديث هذه الشروط والأحكام من وقت لآخر. استمرارك في استخدام خدماتنا بعد التغييرات يعني قبولك للشروط المحدثة.',
    '', '', '', true
  ),
  (
    9, 
    'Contact Us', 
    'اتصل بنا', 
    'If you have any questions about these Terms & Conditions, please contact us:', 
    'إذا كانت لديك أي أسئلة حول هذه الشروط والأحكام، يرجى الاتصال بنا:',
    '', '', '', true
  )
) AS v(sort_order, title_en, title_ar, content_en, content_ar, link_text_en, link_text_ar, link_url, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.terms_and_conditions);
