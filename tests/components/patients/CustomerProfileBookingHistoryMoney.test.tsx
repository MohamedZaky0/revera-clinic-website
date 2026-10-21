import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import CustomerProfileDrawer from '@/components/admin/patients/CustomerProfileDrawer';
import { adminTranslations } from '@/components/admin/translations';

const noop = () => {};

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    viewingCustomerProfile: { id: 'cust-1', name: 'Zara Ahmed', mobile: '01012345678', phone: '01012345678' },
    setViewingCustomerProfile: noop,
    setPrescriptionBookingContext: noop,
    medicalRecordForm: {},
    setMedicalRecordForm: noop,
    medicalReports: [],
    setMedicalReports: noop,
    showMedicalFormModal: false,
    setShowMedicalFormModal: noop,
    showMedicalReportModal: false,
    setShowMedicalReportModal: noop,
    customerProfileTab: 'history',
    setCustomerProfileTab: noop,
    customerRecordsSubTab: 'prescriptions',
    setCustomerRecordsSubTab: noop,
    customerPrescriptions: [],
    loadingPrescriptions: false,
    prescriptionEditMode: false,
    setPrescriptionEditMode: noop,
    editingPrescription: null,
    customerProductsSubTab: 'balances',
    setCustomerProductsSubTab: noop,
    customerProductBalances: [],
    loadingCustomerProducts: false,
    logUsageModalBalance: null,
    setLogUsageModalBalance: noop,
    logUsageQty: 1,
    setLogUsageQty: noop,
    logUsageNotes: '',
    setLogUsageNotes: noop,
    savingUsageLog: false,
    showAddPatientProductModal: false,
    setShowAddPatientProductModal: noop,
    selectedAddProductId: '',
    setSelectedAddProductId: noop,
    selectedAddProductName: '',
    setSelectedAddProductName: noop,
    selectedAddProductQty: 1,
    setSelectedAddProductQty: noop,
    selectedAddProductUnitPrice: 0,
    setSelectedAddProductUnitPrice: noop,
    addingProductToPatient: false,
    customerPackagesSubTab: 'active',
    setCustomerPackagesSubTab: noop,
    customerProfilePackages: [],
    loadingCustomerPackages: false,
    showSellPackageModal: false,
    setShowSellPackageModal: noop,
    availablePackageOffers: [],
    selectedSellPackageId: '',
    setSelectedSellPackageId: noop,
    sellPackagePaymentMethod: 'cash',
    setSellPackagePaymentMethod: noop,
    sellingPackage: false,
    customerPackageRedemptions: [],
    rxDiagnosis: '',
    setRxDiagnosis: noop,
    rxMedications: [],
    setRxMedications: noop,
    rxMedInput: '',
    setRxMedInput: noop,
    rxMedDropdown: '',
    setRxMedDropdown: noop,
    rxGeneralNotes: '',
    setRxGeneralNotes: noop,
    rxDocNotes: '',
    setRxDocNotes: noop,
    rxFollowUpDate: '',
    setRxFollowUpDate: noop,
    savingPrescription: false,
    fetchAvailablePackageOffers: noop,
    handleSellPackageToCustomer: noop,
    fetchCustomerProfilePackages: async () => {},
    handleSaveUsageLog: noop,
    handleAddProductToPatient: noop,
    handleStartCreatePrescription: noop,
    handleStartEditPrescription: noop,
    handleAddMedication: noop,
    handleRemoveMedication: noop,
    handleSavePrescription: noop,
    handleDeletePrescription: noop,
    handleOpenMedicalFormModal: noop,
    handleOpenMedicalReportModal: noop,
    handleDeleteMedicalReport: noop,
    handlePrintPrescription: noop,
    hasPermission: () => true,
    adminRole: 'superadmin',
    handleOpenEditCustomer: noop,
    customerAvatars: {},
    handleAvatarUpload: noop,
    handleAvatarRemove: noop,
    allReservations: [],
    localServices: [{ id: 1, en: 'Hydrafacial', ar: 'هيدرافيشال', price: 400 }],
    rooms: [],
    getStatusBadgeClass: () => '',
    productSalesHistory: [],
    inventoryProducts: [],
    authenticatedJsonHeaders: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    lang: 'en' as const,
    adminTranslations,
    MOCK_MEDICINES: [],
    ...overrides,
  };
}

const baseRes = {
  serviceId: 1,
  date: '2026-10-01',
  phone: '01012345678',
  customerId: 'cust-1',
  timeSlot: '10:00',
};

describe('Patient profile -> Booking History money columns (DEC-119)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ logs: [], stats: null }) })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows Service Price, Paid and Outstanding headers (English)', () => {
    render(<CustomerProfileDrawer {...(buildProps() as any)} />);
    const t = adminTranslations.en.patients.customerProfileDrawer;
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toContain('Service Price');
    expect(headers).toContain('Paid');
    expect(headers).toContain('Outstanding');
    expect(headers).toEqual(expect.arrayContaining([t.colServicePrice, t.colPaid, t.colOutstanding]));
  });

  it('shows the Arabic headers when lang is ar', () => {
    render(<CustomerProfileDrawer {...(buildProps({ lang: 'ar' }) as any)} />);
    const t = adminTranslations.ar.patients.customerProfileDrawer;
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(expect.arrayContaining([t.colServicePrice, t.colPaid, t.colOutstanding]));
    expect(t.colServicePrice).not.toBe(adminTranslations.en.patients.customerProfileDrawer.colServicePrice);
  });

  it('renders price / paid / outstanding per booking from amount_paid and amount_left', () => {
    const reservations = [
      { ...baseRes, id: 'res-partial', notes: 'partial-note', status: 'completed', amountPaid: 700, amountLeft: 300 },
      { ...baseRes, id: 'res-paid', notes: 'paid-note', status: 'completed', amountPaid: 1250, amountLeft: 0 },
    ];
    render(<CustomerProfileDrawer {...(buildProps({ allReservations: reservations }) as any)} />);
    const rows = screen.getAllByTestId('history-service-price').map((c) => c.closest('tr') as HTMLElement);
    expect(rows).toHaveLength(2);

    const partial = rows[0];
    expect(within(partial).getByTestId('history-service-price').textContent).toContain('1,000');
    expect(within(partial).getByTestId('history-paid').textContent).toContain('700');
    expect(within(partial).getByTestId('history-outstanding').textContent).toContain('300');

    const paid = rows[1];
    expect(within(paid).getByTestId('history-service-price').textContent).toContain('1,250');
    expect(within(paid).getByTestId('history-paid').textContent).toContain('1,250');
    expect(within(paid).getByTestId('history-outstanding').textContent).toMatch(/^0/);
  });

  it('shows a dash, never a made-up number, when the balance was never recorded', () => {
    const reservations = [{ ...baseRes, id: 'res-unknown', status: 'approved', amountPaid: 0, amountLeft: null }];
    render(<CustomerProfileDrawer {...(buildProps({ allReservations: reservations }) as any)} />);
    expect(screen.getByTestId('history-service-price').textContent).toBe('—');
    expect(screen.getByTestId('history-outstanding').textContent).toBe('—');
    expect(screen.getByTestId('history-paid').textContent).toContain('0');
  });

  it('cancelled booking: no price, nothing outstanding, even if a stale balance is stored', () => {
    const reservations = [{ ...baseRes, id: 'res-rejected', status: 'rejected', amountPaid: 0, amountLeft: 500 }];
    render(<CustomerProfileDrawer {...(buildProps({ allReservations: reservations }) as any)} />);
    const t = adminTranslations.en.patients.customerProfileDrawer;
    expect(screen.getByTestId('history-service-price').textContent).toBe(t.moneyNotDelivered);
    expect(screen.getByTestId('history-outstanding').textContent).toMatch(/^0/);
  });

  it('package-covered session is labelled instead of showing a fake price', () => {
    const reservations = [{ ...baseRes, id: 'res-pkg', status: 'completed', amountPaid: 0, amountLeft: 0 }];
    const redemptions = [{ reservationId: 'res-pkg', packageName: 'Laser 6', packagePurchasedAt: null }];
    render(
      <CustomerProfileDrawer
        {...(buildProps({ allReservations: reservations, customerPackageRedemptions: redemptions }) as any)}
      />
    );
    const t = adminTranslations.en.patients.customerProfileDrawer;
    expect(screen.getByTestId('history-service-price').textContent).toBe(t.moneyCoveredByPackage);
    expect(screen.getByTestId('history-paid').textContent).toContain('0');
  });

  // The Payment badge reads the same stored amounts as the columns (it used to guess from the catalog and a
  // hard-coded price map when the balance was missing).
  it('Payment badge: paid, partial and unpaid follow the stored paid and outstanding amounts', () => {
    const reservations = [
      { ...baseRes, id: 'b-paid', status: 'completed', amountPaid: 400, amountLeft: 0 },
      { ...baseRes, id: 'b-partial', status: 'completed', amountPaid: 100, amountLeft: 300 },
      { ...baseRes, id: 'b-unpaid', status: 'approved', amountPaid: 0, amountLeft: 400 },
    ];
    render(<CustomerProfileDrawer {...(buildProps({ allReservations: reservations }) as any)} />);
    const t = adminTranslations.en.patients.customerProfileDrawer;
    const badges = screen.getAllByTestId('history-payment').map((b) => b.textContent);
    expect(badges).toEqual([t.paymentStatusLabels.paid, t.paymentStatusLabels.partial, t.paymentStatusLabels.unpaid]);
  });

  it('Payment badge: a missing balance is a dash, not a guess from the catalog price (even for a known service)', () => {
    // service 1 is in the catalog at 400 and was in the old hard-coded map: the old badge computed 400 - 0 and said Unpaid
    const reservations = [{ ...baseRes, id: 'b-unknown', status: 'approved', amountPaid: 0, amountLeft: null }];
    render(<CustomerProfileDrawer {...(buildProps({ allReservations: reservations }) as any)} />);
    expect(screen.getByTestId('history-payment').textContent).toBe('—');
    expect(screen.getByTestId('history-outstanding').textContent).toBe('—');
  });

  it('Payment badge: a cancelled booking is a dash, not "Paid"', () => {
    const reservations = [{ ...baseRes, id: 'b-cancel', status: 'cancelled', amountPaid: 0, amountLeft: 0 }];
    render(<CustomerProfileDrawer {...(buildProps({ allReservations: reservations }) as any)} />);
    expect(screen.getByTestId('history-payment').textContent).toBe('—');
  });

  it('Payment badge: an old "Add Previous Booking" entry is partial when the invoice value exceeds what was paid', () => {
    const reservations = [{
      ...baseRes, id: 'b-hist', status: 'completed', amountPaid: 300, amountLeft: null,
      notes: '[Historical Booking] Added manually. [Invoice Total]: 800 EGP. Actual Spent: 300 EGP.',
    }];
    render(<CustomerProfileDrawer {...(buildProps({ allReservations: reservations }) as any)} />);
    const t = adminTranslations.en.patients.customerProfileDrawer;
    expect(screen.getByTestId('history-service-price').textContent).toContain('800');
    expect(screen.getByTestId('history-outstanding').textContent).toContain('500');
    expect(screen.getByTestId('history-payment').textContent).toBe(t.paymentStatusLabels.partial);
  });

  // DEC-121: the card read the stored spent_amount (0) and ignored the figure worked out from the bookings.
  it('Financial summary: Total Spend shows what was worked out from the bookings when the stored column is 0', () => {
    const profile = { id: 'cust-1', name: 'Zara Ahmed', mobile: '01012345678', phone: '01012345678', spent_amount: 0, spent: 2700 };
    render(<CustomerProfileDrawer {...(buildProps({ viewingCustomerProfile: profile }) as any)} />);
    const t = adminTranslations.en.patients.customerProfileDrawer;
    const card = screen.getByText(t.totalSpend).closest('div[class*="rounded-2xl"]') as HTMLElement;
    expect(card.textContent).toContain('2,700');
  });

  it('Financial summary: a larger stored Total Spend is kept', () => {
    const profile = { id: 'cust-1', name: 'Zara Ahmed', mobile: '01012345678', phone: '01012345678', spent_amount: 5000, spent: 2700 };
    render(<CustomerProfileDrawer {...(buildProps({ viewingCustomerProfile: profile }) as any)} />);
    const t = adminTranslations.en.patients.customerProfileDrawer;
    const card = screen.getByText(t.totalSpend).closest('div[class*="rounded-2xl"]') as HTMLElement;
    expect(card.textContent).toContain('5,000');
  });

  it('shows the empty state across all nine columns', () => {
    const { container } = render(<CustomerProfileDrawer {...(buildProps() as any)} />);
    const td = container.querySelector('tbody td[colspan]');
    expect(td?.getAttribute('colspan')).toBe('9');
    expect(container.querySelectorAll('thead th')).toHaveLength(9);
  });
});
