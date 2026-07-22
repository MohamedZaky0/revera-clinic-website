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
  price: number;
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
    .map(
      (s) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: left; color: #111827; font-weight: 600;">${s.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #4B5563;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #111827;">EGP ${(s.price || 0).toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #111827; font-weight: bold;">EGP ${(s.price || 0).toLocaleString()}</td>
      </tr>
    `
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
export function printPrescription(rx: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print prescriptions.');
    return;
  }

  const items = Array.isArray(rx.items) ? rx.items : [];
  const itemRows = items
    .map(
      (it: any, idx: number) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-weight: bold;">${idx + 1}. ${it.medicine_name || it.name || 'Medication'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${it.dosage || '—'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${it.frequency || '—'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${it.duration || '—'}</td>
    </tr>
  `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Prescription - ${rx.patient_name || 'Patient'}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: sans-serif; padding: 20px; color: #111827; }
          .header { border-bottom: 2px solid #414E36; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          h1 { color: #414E36; margin: 0; font-size: 22px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { background: #F3F4F6; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${CLIENT.name}</h1>
            <p style="margin:2px 0; font-size:12px; color:#6B7280;">Medical Prescription</p>
          </div>
          <div style="text-align:right; font-size:12px;">
            <p style="margin:2px 0;"><strong>Date:</strong> ${rx.created_at ? new Date(rx.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
            <p style="margin:2px 0;"><strong>Rx ID:</strong> ${rx.id ? rx.id.slice(0, 8) : '—'}</p>
          </div>
        </div>

        <div style="margin-bottom: 20px; font-size: 13px;">
          <p><strong>Patient:</strong> ${rx.patient_name || '—'}</p>
          <p><strong>Doctor:</strong> ${rx.doctor_name || '—'}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="4" style="padding:10px;">No medications listed.</td></tr>'}
          </tbody>
        </table>

        ${rx.notes ? `<div style="margin-top:20px; font-size:12px; background:#F9FAFB; padding:12px; border-radius:6px;"><strong>Notes / Instructions:</strong> ${rx.notes}</div>` : ''}

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
