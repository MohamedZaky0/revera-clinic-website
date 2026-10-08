import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientsDirectoryView from '@/components/admin/patients/PatientsDirectoryView';
import { adminTranslations } from '@/components/admin/translations';

describe('PatientsDirectoryView — Total Spend Column & Sorting Engine (TC-096)', () => {
  const mockCustomers = [
    {
      id: 'cust-1',
      name: 'Zara Ahmed',
      phone: '01012345678',
      email: 'zara@example.com',
      lastBookingDate: '2026-10-01',
      lastBookingTime: '10:00 AM',
      bookings: 3,
      spent: 8500,
      wallet: 500,
      outstanding: 0,
      active: true,
    },
    {
      id: 'cust-2',
      name: 'Amir Hassan',
      phone: '01123456789',
      email: 'amir@example.com',
      lastBookingDate: '2026-10-05',
      lastBookingTime: '02:00 PM',
      bookings: 1,
      spent: 1200,
      wallet: 0,
      outstanding: 300,
      active: true,
    },
    {
      id: 'cust-3',
      name: 'Mona Kamal',
      phone: '01234567890',
      email: 'mona@example.com',
      lastBookingDate: '2026-09-20',
      lastBookingTime: '12:00 PM',
      bookings: 5,
      spent: 15000,
      wallet: 1000,
      outstanding: 0,
      active: true,
    },
  ];

  const defaultProps = {
    filteredCustomers: mockCustomers,
    hasPermission: () => true,
    handleOpenAddCustomer: vi.fn(),
    handleOpenEditCustomer: vi.fn(),
    setViewingCustomerProfile: vi.fn(),
    customerSearch: '',
    setCustomerSearch: vi.fn(),
    showCustomerFilterPanel: false,
    setShowCustomerFilterPanel: vi.fn(),
    customerFilterGender: 'All',
    setCustomerFilterGender: vi.fn(),
    customerFilterStatus: 'All',
    setCustomerFilterStatus: vi.fn(),
    customerFilterReferral: 'All',
    setCustomerFilterReferral: vi.fn(),
    showCustomerMoreMenu: false,
    setShowCustomerMoreMenu: vi.fn(),
    setShowExportCustomersModal: vi.fn(),
    setShowImportCustomersModal: vi.fn(),
    activeCustomerRowMenuId: null,
    setActiveCustomerRowMenuId: vi.fn(),
    customerMoreMenuRef: { current: null },
    fetchCustomers: vi.fn(),
    lang: 'en' as const,
    t: adminTranslations.en.patients.patientsDirectoryView,
  };

  it('renders the Total Spend column header and patient row values', () => {
    render(<PatientsDirectoryView {...defaultProps} />);

    // Header check
    expect(screen.getByText('Total Spend')).toBeDefined();

    // Value checks
    expect(screen.getByText('8,500 EGP')).toBeDefined();
    expect(screen.getByText('1,200 EGP')).toBeDefined();
    expect(screen.getByText('15,000 EGP')).toBeDefined();
  });

  it('sorts patients by Name (A to Z) when Name A-Z is selected', () => {
    render(<PatientsDirectoryView {...defaultProps} />);

    // Open Customer Name sort dropdown
    const sortButtons = screen.getAllByTitle('Sort by');
    const nameSortBtn = sortButtons[0]; // First column is Customer
    fireEvent.click(nameSortBtn);

    // Click "Name (A to Z)"
    const aToZOption = screen.getByText('Name (A to Z)');
    fireEvent.click(aToZOption);

    // Verify order in table rows
    const rows = screen.getAllByRole('row').slice(1); // omit header row
    expect(rows[0].textContent).toContain('Amir Hassan');
    expect(rows[1].textContent).toContain('Mona Kamal');
    expect(rows[2].textContent).toContain('Zara Ahmed');
  });

  it('sorts patients by Name (Z to A) when Name Z-A is selected', () => {
    render(<PatientsDirectoryView {...defaultProps} />);

    // Open Customer Name sort dropdown
    const sortButtons = screen.getAllByTitle('Sort by');
    const nameSortBtn = sortButtons[0];
    fireEvent.click(nameSortBtn);

    // Click "Name (Z to A)"
    const zToAOption = screen.getByText('Name (Z to A)');
    fireEvent.click(zToAOption);

    // Verify order in table rows
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Zara Ahmed');
    expect(rows[1].textContent).toContain('Mona Kamal');
    expect(rows[2].textContent).toContain('Amir Hassan');
  });

  it('sorts patients by Total Spend (High to Low and Low to High)', () => {
    render(<PatientsDirectoryView {...defaultProps} />);

    // Column order: Customer (0), Last Booking (1), Total Spend (2), Wallet (3), Outstanding (4)
    const sortButtons = screen.getAllByTitle('Sort by');
    const totalSpendSortBtn = sortButtons[2];
    fireEvent.click(totalSpendSortBtn);

    // Click High to Low
    const highToLowOption = screen.getByText('High to Low');
    fireEvent.click(highToLowOption);

    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Mona Kamal'); // 15,000
    expect(rows[1].textContent).toContain('Zara Ahmed'); // 8,500
    expect(rows[2].textContent).toContain('Amir Hassan'); // 1,200

    // Click Low to High
    fireEvent.click(totalSpendSortBtn);
    const lowToHighOption = screen.getByText('Low to High');
    fireEvent.click(lowToHighOption);

    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Amir Hassan'); // 1,200
    expect(rows[1].textContent).toContain('Zara Ahmed'); // 8,500
    expect(rows[2].textContent).toContain('Mona Kamal'); // 15,000
  });

  it('supports Arabic language translation and formatted currency', () => {
    render(
      <PatientsDirectoryView
        {...defaultProps}
        lang="ar"
        t={adminTranslations.ar.patients.patientsDirectoryView}
      />
    );

    // Header check in Arabic
    expect(screen.getByText(adminTranslations.ar.patients.patientsDirectoryView.colTotalSpend)).toBeDefined();
    expect(screen.getByText('8,500 ج.م')).toBeDefined();
  });
});
