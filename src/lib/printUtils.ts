import { CLIENT } from '@/config/client';

export interface InvoiceBookingData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  date: string;
  timeSlot?: string;
  doctorName?: string;
  amountPaid: number;
  amountLeft: number;
}

export interface ServiceItemData {
  name: string;
  qty?: number;
  unitPrice?: number;
  price?: number;
  total?: number;
}

/** Standardized cross-browser PDF invoice printer */
export function printInvoice(
  booking: InvoiceBookingData,
  servicesList: ServiceItemData[],
  totalCost: number,
  walletUsed: number = 0,
  branchName: string = 'Main Branch'
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print/download the invoice.');
    return;
  }

  const invoiceNo = `INV-${booking.id.slice(0, 8).toUpperCase()}`;

  const serviceRows = servicesList
    .filter((s) => {
      const name = String(s.name || '').toLowerCase();
      const isPulse = name.includes('pulse') || name.includes('device —') || name.includes('device -');
      const qty = Number(s.qty) || 1;
      const uPrice = Number(s.unitPrice !== undefined ? s.unitPrice : (s.price !== undefined ? s.price : 0));
      const itemTotal = Number(s.total !== undefined ? s.total : (qty * uPrice));
      if (isPulse && (itemTotal === 0 || uPrice === 0)) {
        return false;
      }
      return true;
    })
    .map(
      (s) => {
        const qty = Number(s.qty) || 1;
        const uPrice = Number(s.unitPrice !== undefined ? s.unitPrice : (s.price !== undefined ? s.price : 0));
        const itemTotal = Number(s.total !== undefined ? s.total : (qty * uPrice));
        return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: left; color: #111827; font-weight: 600;">${s.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #4B5563;">${qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #111827;">EGP ${uPrice.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #111827; font-weight: bold;">EGP ${itemTotal.toLocaleString()}</td>
      </tr>
    `;
      }
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${invoiceNo} - ${CLIENT.name}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            color: #111827;
            background-color: #ffffff;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #414E36;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .logo-area h1 {
            color: #414E36;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .logo-area p {
            margin: 3px 0 0 0;
            font-size: 12px;
            color: #4B5563;
          }
          .invoice-title-area {
            text-align: right;
          }
          .invoice-title-area h2 {
            margin: 0;
            color: #C4AE7C;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 0.05em;
          }
          .invoice-title-area p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #4B5563;
          }
          .billing-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 13px;
          }
          .billed-to, .booking-details {
            width: 48%;
          }
          .billing-info h3 {
            color: #414E36;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin: 0 0 10px 0;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 4px;
          }
          .billing-info p {
            margin: 4px 0;
          }
          .table-container {
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background-color: #F3F4F6;
            color: #374151;
            font-weight: 700;
            padding: 10px 12px;
            text-align: left;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
          }
          .summary-table {
            width: 300px;
            margin-left: auto;
            font-size: 13px;
          }
          .summary-table td {
            padding: 6px 12px;
          }
          .summary-table tr.total-row {
            font-weight: bold;
            font-size: 15px;
            color: #414E36;
            border-top: 2px solid #414E36;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
            padding-top: 16px;
            font-size: 11px;
            color: #6B7280;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            <h1>${CLIENT.name}</h1>
            <p>Phone: ${CLIENT.phoneDisplay}</p>
            <p>Tagline: ${CLIENT.tagline}</p>
          </div>
          <div class="invoice-title-area">
            <h2>INVOICE</h2>
            <p><strong>Invoice No:</strong> ${invoiceNo}</p>
            <p><strong>Date:</strong> ${booking.date}</p>
          </div>
        </div>

        <div class="billing-info">
          <div class="billed-to">
            <h3>Billed To</h3>
            <p><strong>Patient Name:</strong> ${booking.name}</p>
            <p><strong>Phone:</strong> ${booking.phone}</p>
            <p><strong>Email:</strong> ${booking.email || '—'}</p>
          </div>
          <div class="booking-details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time Slot:</strong> ${booking.timeSlot || '—'}</p>
            <p><strong>Doctor:</strong> ${booking.doctorName || '—'}</p>
            <p><strong>Branch:</strong> ${branchName}</p>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Service Rendered</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 120px;">Unit Price</th>
                <th style="text-align: right; width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${serviceRows}
            </tbody>
          </table>
        </div>

        <table class="summary-table">
          <tr>
            <td style="color: #4B5563;">Subtotal:</td>
            <td style="text-align: right; font-weight: 600;">EGP ${(totalCost || 0).toLocaleString()}</td>
          </tr>
          ${
            walletUsed > 0
              ? `
          <tr>
            <td style="color: #4B5563;">Paid from Wallet:</td>
            <td style="text-align: right; font-weight: 600; color: #414E36;">- EGP ${walletUsed.toLocaleString()}</td>
          </tr>
          `
              : ''
          }
          <tr class="total-row">
            <td>Amount Paid:</td>
            <td style="text-align: right;">EGP ${(booking.amountPaid || 0).toLocaleString()}</td>
          </tr>
          ${
            booking.amountLeft > 0
              ? `
          <tr style="color: #DC2626; font-weight: 600;">
            <td>Outstanding Due:</td>
            <td style="text-align: right;">EGP ${booking.amountLeft.toLocaleString()}</td>
          </tr>
          `
              : ''
          }
        </table>

        <div class="footer">
          <p>Thank you for choosing ${CLIENT.name}!</p>
          <p style="font-size: 10px; margin-top: 4px; color: #9CA3AF;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/** Standardized cross-browser prescription printer */
export function printPrescription(rx: any, booking?: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print prescriptions.');
    return;
  }

  const patientName = rx.patient_name || rx.customer_name || booking?.name || 'Patient';
  const patientPhone = rx.patient_phone || rx.phone || booking?.phone || '—';
  const doctorName = rx.doctor_name || booking?.doctorName || 'Treating Doctor';
  const rxDate = rx.date ? String(rx.date).slice(0, 10) : (rx.created_at ? new Date(rx.created_at).toLocaleDateString() : new Date().toLocaleDateString());
  const rxId = rx.id ? `RX-${String(rx.id).slice(0, 8).toUpperCase()}` : '—';
  const diagnosis = rx.diagnosis || 'Clinical Consultation & Treatment';
  const notes = rx.general_notes || rx.instructions || rx.doctor_notes || rx.notes || '';

  const medsList: any[] = Array.isArray(rx.medications) && rx.medications.length > 0
    ? rx.medications
    : (Array.isArray(rx.items) ? rx.items : []);

  const itemRows = medsList
    .map(
      (it: any, idx: number) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #5A6A51; font-weight: bold; width: 40px;">${idx + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: left; color: #111827; font-weight: 700; font-size: 14px;">
        ${it.name || it.medicine_name || it.medicine || 'Medication'}
        ${it.dosage ? `<span style="color: #414E36; font-size: 12px; font-weight: 600; display: block; margin-top: 2px;">(${it.dosage})</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: left; color: #374151; font-weight: 500;">${it.frequency || 'As directed'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: left; color: #374151; font-weight: 500;">${it.duration || 'As needed'}</td>
    </tr>
  `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Prescription - ${patientName}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111827; background: #fff; line-height: 1.5; }
          .header { border-bottom: 2px solid #414E36; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .logo-title { color: #414E36; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
          .subtitle { margin: 2px 0 0 0; font-size: 12px; color: #5A6A51; font-weight: 600; }
          .contact { font-size: 11px; color: #6B7280; margin-top: 2px; }
          .rx-badge { text-align: right; }
          .rx-badge h2 { margin: 0; color: #C4AE7C; font-size: 26px; font-weight: 800; letter-spacing: 0.05em; }
          .rx-badge p { margin: 2px 0 0 0; font-size: 12px; color: #4B5563; }
          .patient-card { display: flex; justify-content: space-between; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; }
          .patient-card p { margin: 3px 0; }
          .rx-symbol { font-family: serif; font-size: 32px; font-weight: bold; color: #414E36; margin-bottom: 8px; line-height: 1; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
          th { background: #EDF1EC; color: #414E36; font-weight: 700; padding: 10px 12px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; border-bottom: 1px solid #E5E7EB; }
          .instructions-box { margin-top: 20px; font-size: 12px; background: #FAF5EB; border: 1px solid #C4AE7C; padding: 14px 18px; border-radius: 10px; color: #414E36; }
          .instructions-box strong { color: #1F251A; display: block; margin-bottom: 4px; font-size: 13px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #D1D5DB; padding-top: 20px; font-size: 12px; color: #6B7280; }
          .doctor-sig { text-align: right; width: 200px; }
          .sig-line { border-bottom: 1px solid #374151; margin-bottom: 6px; height: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="logo-title">${CLIENT.name}</h1>
            <p class="subtitle">Sheikh Zayed / New Cairo Clinics</p>
            <p class="contact">Phone: (+20) 01035595691 | Email: inquiries@reveraclinics.com</p>
          </div>
          <div class="rx-badge">
            <h2>PRESCRIPTION</h2>
            <p><strong>No:</strong> ${rxId}</p>
            <p><strong>Date:</strong> ${rxDate}</p>
          </div>
        </div>

        <div class="patient-card">
          <div>
            <p><strong>Patient Name:</strong> ${patientName}</p>
            <p><strong>Phone Number:</strong> ${patientPhone}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Treating Doctor:</strong> ${doctorName}</p>
            <p><strong>Diagnosis:</strong> ${diagnosis}</p>
          </div>
        </div>

        <div class="rx-symbol">℞</div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Medication & Strength</th>
              <th>Dosage / Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #6B7280;">No medications prescribed.</td></tr>'}
          </tbody>
        </table>

        ${notes ? `
          <div class="instructions-box">
            <strong>Doctor Instructions & Advice / تعليمات الطبيب:</strong>
            ${notes}
          </div>
        ` : ''}

        <div class="footer">
          <div>
            <p>✨ Revera Clinics wishes you a swift recovery and radiant health.</p>
            <p style="font-size: 10px; color: #9CA3AF; margin-top: 4px;">Electronic Medical Record - Valid without physical stamp.</p>
          </div>
          <div class="doctor-sig">
            <div class="sig-line"></div>
            <p style="margin: 0; font-weight: 700; color: #1F251A;">${doctorName}</p>
            <p style="margin: 0; font-size: 11px;">Specialist Physician</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/** Standardized cross-browser employee profile printer */
export function printEmployeeProfile(emp: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print employee profile.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Employee Profile - ${emp.name || 'Staff'}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: sans-serif; padding: 20px; color: #111827; line-height: 1.5; }
          .header { border-bottom: 2px solid #414E36; padding-bottom: 12px; margin-bottom: 20px; }
          h1 { color: #414E36; margin: 0; font-size: 22px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px; }
          .card { border: 1px solid #E5E7EB; padding: 12px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${CLIENT.name} - Staff Record</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6B7280;">Employee Record for ${emp.name || 'Employee'}</p>
        </div>

        <div class="grid">
          <div class="card">
            <p><strong>Full Name:</strong> ${emp.name || '—'}</p>
            <p><strong>Role:</strong> ${emp.role_name || emp.role || 'Staff'}</p>
            <p><strong>Email:</strong> ${emp.email || '—'}</p>
            <p><strong>Phone:</strong> ${emp.phone || '—'}</p>
          </div>
          <div class="card">
            <p><strong>Employee ID:</strong> ${emp.employee_id || emp.id || '—'}</p>
            <p><strong>Branch:</strong> ${emp.branch || emp.branch_name || 'Main'}</p>
            <p><strong>Status:</strong> ${emp.status || 'Active'}</p>
            <p><strong>Start Date:</strong> ${emp.start_date || '—'}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
