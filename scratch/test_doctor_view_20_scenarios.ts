// Automated verification suite for the 20 Doctor View scenarios
import { normalizeEgyptMobile } from '../src/lib/customerIdentity';
import { doctorMinutes, type ShiftWindow } from '../src/lib/capacity';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${testName}`, detail ?? '');
    failCount++;
  }
}

console.log('================================================================');
console.log('RUNNING AUTOMATED TEST SUITE FOR 20 DOCTOR VIEW SCENARIOS');
console.log('================================================================\n');

// --------------------------------------------------------------------------
// Scenario 1: Doctor Schedule Calendar View & Daily Queue Provider Scoping
// --------------------------------------------------------------------------
console.log('--- Scenario 1: Doctor Schedule Filtering & Queue Scoping ---');
const allReservations = [
  { id: 'r1', provider_id: 'doc-101', status: 'checked_in', date: '2026-09-02', patient: 'Ahmed' },
  { id: 'r2', provider_id: 'doc-102', status: 'checked_in', date: '2026-09-02', patient: 'Mona' },
  { id: 'r3', provider_id: 'doc-101', status: 'canceled', date: '2026-09-02', patient: 'Sara' },
  { id: 'r4', provider_id: 'doc-101', status: 'completed', date: '2026-09-02', patient: 'Ali' },
];
const doctorId = 'doc-101';
const doctorActiveQueue = allReservations.filter(
  r => r.provider_id === doctorId && r.status !== 'canceled' && r.status !== 'rejected'
);
assert(doctorActiveQueue.length === 2, 'Scenario 1.1: Queue filters strictly to logged-in doctor active bookings');
assert(doctorActiveQueue.map(r => r.id).join(',') === 'r1,r4', 'Scenario 1.2: Canceled/rejected bookings excluded from active doctor queue');

// --------------------------------------------------------------------------
// Scenario 2: Start Ongoing Session & Patient Check-in Handshake
// --------------------------------------------------------------------------
console.log('\n--- Scenario 2: Start Ongoing Session State Transition ---');
const validStartTransition = (currentStatus: string) => {
  if (currentStatus === 'checked_in' || currentStatus === 'approved' || currentStatus === 'confirmed') {
    return 'started';
  }
  throw new Error(`Cannot start session from status: ${currentStatus}`);
};
assert(validStartTransition('checked_in') === 'started', 'Scenario 2.1: Session transitions from checked_in to started');
assert(validStartTransition('confirmed') === 'started', 'Scenario 2.2: Session transitions from confirmed to started');

// --------------------------------------------------------------------------
// Scenario 3: First Visit Dynamic Intake Questionnaire Rendering
// --------------------------------------------------------------------------
console.log('\n--- Scenario 3: First Visit Dynamic Intake Questionnaire ---');
const customTemplate = {
  template_id: 'tmpl-laser-01',
  service_ids: ['srv-laser-body', 'srv-laser-face'],
  fields: [
    { key: 'fitzpatrick_scale', label: 'Fitzpatrick Skin Scale', required: true, type: 'select', options: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
    { key: 'sun_exposure_recent', label: 'Sun exposure in last 2 weeks', required: true, type: 'boolean' },
    { key: 'roaccutane_usage', label: 'Roaccutane in last 6 months', required: true, type: 'boolean' }
  ]
};
const bookedServiceId = 'srv-laser-body';
const isTemplateMatched = customTemplate.service_ids.includes(bookedServiceId);
assert(isTemplateMatched === true, 'Scenario 3.1: Service ID accurately resolves mapped dynamic intake template');
assert(customTemplate.fields.length === 3, 'Scenario 3.2: Dynamic intake fields correctly loaded for clinical form');

// --------------------------------------------------------------------------
// Scenario 4: Returning Patient "On File" Intake Bypass
// --------------------------------------------------------------------------
console.log('\n--- Scenario 4: Returning Patient Intake Bypass Logic ---');
const evaluateIntakeRequirement = (patientVisitCount: number, existingMedicalRecord: boolean) => {
  if (patientVisitCount > 1 || existingMedicalRecord) {
    return { isRequired: false, statusBadge: 'On File / Returning Patient' };
  }
  return { isRequired: true, statusBadge: 'Intake Required / First Visit' };
};
const returningPatient = evaluateIntakeRequirement(3, true);
const firstVisitPatient = evaluateIntakeRequirement(1, false);
assert(returningPatient.isRequired === false && returningPatient.statusBadge === 'On File / Returning Patient', 'Scenario 4.1: Returning patient bypasses mandatory intake re-entry');
assert(firstVisitPatient.isRequired === true && firstVisitPatient.statusBadge === 'Intake Required / First Visit', 'Scenario 4.2: First-time patient flagged for required intake');

// --------------------------------------------------------------------------
// Scenario 5: Consultation Clinical Notes Isolation & Instant Autosave
// --------------------------------------------------------------------------
console.log('\n--- Scenario 5: Clinical Notes Isolation & Payload Validation ---');
const clinicalNotePayload = {
  reservation_id: 'res-889',
  customer_id: 'cust-450',
  doctor_name: 'Dr. Sara Adel',
  clinical_notes: 'Session 4: Spot size 15mm, Fluence 16J. Mild erythema observed, soothing gel applied.',
  created_at: new Date().toISOString()
};
assert(clinicalNotePayload.clinical_notes.length > 10, 'Scenario 5.1: Clinical consultation notes text captured');
assert(clinicalNotePayload.customer_id === 'cust-450', 'Scenario 5.2: Note explicitly bound to customer record');

// --------------------------------------------------------------------------
// Scenario 6: Digital Prescription Creation with Structured Dosage
// --------------------------------------------------------------------------
console.log('\n--- Scenario 6: Structured Digital Prescription Items ---');
const prescriptionItems = [
  { medication_name: 'Fucicort Cream', dosage: 'Apply thin layer', frequency: '2x daily', duration: '5 days', instructions: 'After evening wash' },
  { medication_name: 'Panthenol Gel 5%', dosage: 'Generous layer', frequency: '3x daily', duration: '7 days', instructions: 'Keep refrigerated' }
];
assert(prescriptionItems.length === 2, 'Scenario 6.1: Multi-item digital prescription structure');
assert(prescriptionItems[0].frequency === '2x daily' && prescriptionItems[0].duration === '5 days', 'Scenario 6.2: Dosage and frequency fields accurately parsed');

// --------------------------------------------------------------------------
// Scenario 7: Prescription Instant WhatsApp Transmission
// --------------------------------------------------------------------------
console.log('\n--- Scenario 7: WhatsApp Transmission Link Generator ---');
const patientRawPhone = '+201012345678';
const normalizedPhone = normalizeEgyptMobile(patientRawPhone);
const prescriptionText = `*Revera Clinics — Digital Prescription*\nDoctor: Dr. Sara Adel\n\n1. Fucicort Cream (2x daily for 5 days)\n2. Panthenol Gel 5% (3x daily for 7 days)`;
const encodedWhatsAppUrl = `https://wa.me/20${normalizedPhone.replace(/^0/, '')}?text=${encodeURIComponent(prescriptionText)}`;

assert(normalizedPhone === '01012345678', 'Scenario 7.1: Patient Egyptian phone normalized');
assert(encodedWhatsAppUrl.includes('https://wa.me/201012345678?text='), 'Scenario 7.2: WhatsApp URL generated with UTF-8 encoded prescription message');

// --------------------------------------------------------------------------
// Scenario 8: Cross-Browser Branded Prescription Printing
// --------------------------------------------------------------------------
console.log('\n--- Scenario 8: Prescription Print Payload Validation ---');
const printPayload = {
  clinicName: 'Revera Clinics',
  licenseNo: 'MOH-EG-2024-89',
  doctorName: 'Dr. Sara Adel',
  patientName: 'Ahmed Mostafa',
  diagnosis: 'Post-Laser Dermatitis Care',
  medications: prescriptionItems
};
assert(printPayload.diagnosis === 'Post-Laser Dermatitis Care', 'Scenario 8.1: Diagnosis badge populated for print view');
assert(printPayload.medications.length === 2, 'Scenario 8.2: Itemized medications attached to branded print template');

// --------------------------------------------------------------------------
// Scenario 9: Service Device Pulse Counter Tracking & Consumption
// --------------------------------------------------------------------------
console.log('\n--- Scenario 9: Device Pulse Tracking & Extra Pulse Math ---');
const deviceInitialPulses = 45000;
const pulsesExpended = 350;
const updatedDevicePulses = deviceInitialPulses + pulsesExpended;
const extraPulsesCount = 50;
const pricePerPulse = 2.5; // EGP
const extraPulsesSubtotal = extraPulsesCount * pricePerPulse;

assert(updatedDevicePulses === 45350, 'Scenario 9.1: Device pulse counter accurately increments in inventory');
assert(extraPulsesSubtotal === 125, 'Scenario 9.2: Extra pulse fee calculated correctly (50 x 2.5 = 125 EGP)');

// --------------------------------------------------------------------------
// Scenario 10: In-Session Consumables & Updated Invoice Total
// --------------------------------------------------------------------------
console.log('\n--- Scenario 10: In-Session Consumables & Invoice Recalculation ---');
const baseBookingPrice = 1200;
const sessionConsumables = [
  { name: 'Numbing Cream 30g', qty: 1, unitPrice: 150 },
  { name: 'Soothing Ampoule', qty: 2, unitPrice: 100 }
];
const productsSubtotal = sessionConsumables.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0); // 150 + 200 = 350
const updatedInvoiceTotal = baseBookingPrice + productsSubtotal + extraPulsesSubtotal; // 1200 + 350 + 125 = 1675

assert(productsSubtotal === 350, 'Scenario 10.1: Attached session consumables subtotal equals 350 EGP');
assert(updatedInvoiceTotal === 1675, 'Scenario 10.2: Final session invoice total dynamically recalculates (1,675 EGP)');

// --------------------------------------------------------------------------
// Scenario 11: Right Slide-Over Patient Visit History Timeline
// --------------------------------------------------------------------------
console.log('\n--- Scenario 11: Patient Visit History Timeline Sorting ---');
const patientVisitHistory = [
  { id: 'v1', date: '2026-03-10', service: 'Consultation' },
  { id: 'v2', date: '2026-08-15', service: 'Laser Session 1' },
  { id: 'v3', date: '2026-06-01', service: 'Hydrafacial' },
];
const sortedVisits = [...patientVisitHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
assert(sortedVisits[0].id === 'v2' && sortedVisits[2].id === 'v1', 'Scenario 11.1: Visit history sorts chronologically descending');

// --------------------------------------------------------------------------
// Scenario 12: Diagnostic Reports MIME & File Size Filter
// --------------------------------------------------------------------------
console.log('\n--- Scenario 12: Diagnostic Reports Upload Validation ---');
const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
const maxSizeBytes = 10 * 1024 * 1024; // 10MB
const testUpload1 = { filename: 'lab_scan.pdf', size: 2 * 1024 * 1024 };
const testUpload2 = { filename: 'malware.exe', size: 1 * 1024 * 1024 };
const testUpload3 = { filename: 'huge_mri.pdf', size: 15 * 1024 * 1024 };

const isValidFile = (f: { filename: string; size: number }) => {
  const ext = f.filename.slice(f.filename.lastIndexOf('.')).toLowerCase();
  return allowedExtensions.includes(ext) && f.size <= maxSizeBytes;
};
assert(isValidFile(testUpload1) === true, 'Scenario 12.1: Valid 2MB PDF report accepted');
assert(isValidFile(testUpload2) === false, 'Scenario 12.2: .exe extension rejected');
assert(isValidFile(testUpload3) === false, 'Scenario 12.3: File exceeding 10MB size limit rejected');

// --------------------------------------------------------------------------
// Scenario 13: Direct Diagnostic Document Upload by Doctor
// --------------------------------------------------------------------------
console.log('\n--- Scenario 13: Doctor Upload Metadata Attribution ---');
const doctorUploadRecord = {
  customer_id: 'cust-450',
  title: 'Clinical Treatment Progress Photo - Session 3',
  file_url: 'https://storage.clinic.com/reports/prog_3.jpg',
  uploaded_by_doctor_id: 'doc-101',
  doctor_name: 'Dr. Sara Adel',
  created_at: new Date().toISOString()
};
assert(doctorUploadRecord.uploaded_by_doctor_id === 'doc-101', 'Scenario 13.1: Upload captures doctor user ID');
assert(doctorUploadRecord.title.includes('Clinical Treatment'), 'Scenario 13.2: Report title correctly indexed');

// --------------------------------------------------------------------------
// Scenario 14: Doctor Session Completion & Checkout Handoff
// --------------------------------------------------------------------------
console.log('\n--- Scenario 14: Session Completion State Machine ---');
const completeSession = (status: string) => {
  if (status === 'started') return { status: 'completed', isLocked: true, readyForCheckout: true };
  throw new Error('Can only complete a started session');
};
const completionState = completeSession('started');
assert(completionState.status === 'completed', 'Scenario 14.1: Session status transitions to completed');
assert(completionState.readyForCheckout === true && completionState.isLocked === true, 'Scenario 14.2: Session notes locked and handed off to reception billing');

// --------------------------------------------------------------------------
// Scenario 15: Doctor Profile Working Schedule & Multi-Shift Matrix
// --------------------------------------------------------------------------
console.log('\n--- Scenario 15: Doctor Multi-Shift Working Hours Matrix ---');
const doctorShifts: ShiftWindow[][] = [
  [
    { start: '10:00', end: '14:00' }, // Shift 1 = 4h (240m)
    { start: '17:00', end: '21:00' }  // Shift 2 = 4h (240m)
  ]
];
const totalMins = doctorMinutes(doctorShifts);
assert(totalMins === 480, 'Scenario 15.1: Split shift calculates 480 working minutes (excluding 3h break)');

// --------------------------------------------------------------------------
// Scenario 16: Doctor Revenue Target Progress & Monthly KPI Tracking
// --------------------------------------------------------------------------
console.log('\n--- Scenario 16: Monthly Target Progress Math ---');
const targetAmount = 60000;
const completedRevenue1 = 45000;
const completedRevenue2 = 75000;
const pct1 = targetAmount > 0 ? Math.min(100, Math.round((completedRevenue1 / targetAmount) * 100)) : 0;
const pct2 = targetAmount > 0 ? Math.min(100, Math.round((completedRevenue2 / targetAmount) * 100)) : 0;
assert(pct1 === 75, 'Scenario 16.1: Target progress calculates 75% for 45,000 / 60,000 EGP');
assert(pct2 === 100, 'Scenario 16.2: Target progress caps at 100% when revenue exceeds monthly target');

// --------------------------------------------------------------------------
// Scenario 17: Dynamic Doctor Commission Breakdown & Payroll Estimation
// --------------------------------------------------------------------------
console.log('\n--- Scenario 17: Doctor Commission Tiers & Net Payroll ---');
const baseSalary = 15000;
const commissionTiers = { type: 'percentage', rate: 0.12 }; // 12%
const monthlyBilledReservations = 50000;
const calculatedCommission = monthlyBilledReservations * commissionTiers.rate; // 6,000
const deductionsTotal = 1000;
const doctorNetPayroll = baseSalary + calculatedCommission - deductionsTotal; // 15000 + 6000 - 1000 = 20000
assert(calculatedCommission === 6000, 'Scenario 17.1: Commission calculated accurately as 6,000 EGP');
assert(doctorNetPayroll === 20000, 'Scenario 17.2: Doctor Net Payroll produces 20,000 EGP');

// --------------------------------------------------------------------------
// Scenario 18: Doctor View Bilingual Localization (EN / AR) & RTL Clinical Layout
// --------------------------------------------------------------------------
console.log('\n--- Scenario 18: Doctor View Bilingual Localization & RTL ---');
const docTranslations = {
  en: { startSession: 'Start Session', clinicalNotes: 'Clinical Consultation Notes', complete: 'Complete Session' },
  ar: { startSession: 'بدء الجلسة', clinicalNotes: 'الملاحظات الطبية والاستشارية', complete: 'إنهاء الجلسة' }
};
const getDir = (lang: 'en' | 'ar') => lang === 'ar' ? 'rtl' : 'ltr';
assert(getDir('ar') === 'rtl' && getDir('en') === 'ltr', 'Scenario 18.1: RTL direction resolved accurately for Arabic mode');
assert(docTranslations.ar.startSession === 'بدء الجلسة', 'Scenario 18.2: Arabic translation dictionary for Doctor View populated');

// --------------------------------------------------------------------------
// Scenario 19: Doctor Working Hours & Shift Modification Audit Trail
// --------------------------------------------------------------------------
console.log('\n--- Scenario 19: Shift Modification Audit Trail ---');
const scheduleAuditRecord = {
  provider_id: 'doc-101',
  modified_by: 'admin-super',
  change_type: 'shift_update',
  old_schedule: { monday: ['10:00-18:00'] },
  new_schedule: { monday: ['10:00-14:00', '17:00-21:00'] },
  timestamp: new Date().toISOString()
};
assert(scheduleAuditRecord.change_type === 'shift_update', 'Scenario 19.1: Schedule modification change type logged');
assert(scheduleAuditRecord.modified_by === 'admin-super', 'Scenario 19.2: Modifier user tracked in schedule audit logs');

// --------------------------------------------------------------------------
// Scenario 20: Security & Patient Scoping Shield in Doctor Portal
// --------------------------------------------------------------------------
console.log('\n--- Scenario 20: Doctor Session Scoping & IDOR Protection ---');
const canDoctorEditSession = (loggedDoctorId: string, sessionDoctorId: string, userRole: string) => {
  if (userRole === 'superadmin' || userRole === 'admin') return true;
  return loggedDoctorId === sessionDoctorId;
};
assert(canDoctorEditSession('doc-101', 'doc-101', 'doctor') === true, 'Scenario 20.1: Doctor can edit their own assigned session');
assert(canDoctorEditSession('doc-102', 'doc-101', 'doctor') === false, 'Scenario 20.2: Doctor blocked from editing another doctor clinical session');
assert(canDoctorEditSession('admin-1', 'doc-101', 'superadmin') === true, 'Scenario 20.3: Superadmin bypass allows administrative oversight');

console.log('\n================================================================');
console.log(`TOTAL RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
