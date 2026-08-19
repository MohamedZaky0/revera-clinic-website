/**
 * The doctor's "close a session" screen — module 3 / F-4 of ai_docs/TEST_COVERAGE_INVENTORY.md.
 * `additionalServicesSubtotal`, `totalSessionPulses`, and `finalSessionTotal` computed here are
 * exactly the numbers later PATCHed to `/api/reservations` at checkout (via the parent's
 * `handleCompleteTreatment`), so a wrong sum here is a wrong invoice.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFetchFake } from '../../helpers/fetchFake';

// `getAuthHeaders()` (src/components/admin/doctor/utils.ts) calls `supabase.auth.getSession()`.
// `@/lib/supabaseClient`'s export is `null` outside a real browser env (no NEXT_PUBLIC_SUPABASE_*
// vars here), so every fetch this component makes needs this mocked first.
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) } },
}));

import DoctorOngoingSessionTab from '@/components/admin/doctor/tabs/DoctorOngoingSessionTab';

const fetchFake = createFetchFake();

beforeEach(() => {
  fetchFake.reset();
  vi.stubGlobal('fetch', fetchFake.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// `t` is accessed as `t.someKey` throughout for i18n strings this component doesn't own the
// translation of; a Proxy that echoes the key back keeps assertions readable (`t.completeTreatmentBtn`
// renders literally as "completeTreatmentBtn") without hand-listing every key the component reads.
const t: any = new Proxy({}, { get: (_t, key) => String(key) });

// Neither the primary-service <label> nor the medical-intake <label>s carry htmlFor/id, so their
// sibling select/input has to be found by DOM position — same gap as AssetsScreen.
function fieldNear(labelText: string): HTMLInputElement | HTMLSelectElement {
  const label = screen.getByText(labelText, { selector: 'label' });
  const field = label.parentElement?.querySelector('input, select, textarea');
  if (!field) throw new Error(`No field found near label "${labelText}"`);
  return field as HTMLInputElement | HTMLSelectElement;
}

function additionalServicesPanel(): HTMLElement {
  const heading = screen.getByRole('heading', { name: 'addAdditionalServiceBtn' });
  return heading.closest('div') as HTMLElement;
}

const SERVICE_BOTOX = { id: 'srv-1', name: 'Botox', price: 800 };
const SERVICE_PEEL = { id: 'srv-2', name: 'Chemical Peel', price: 300 };
const DEVICE_LASER = { id: 'dev-1', name: 'CO2 Laser' };

function baseProps(overrides: Record<string, any> = {}) {
  return {
    activeSessionBooking: { id: 'res-1', name: 'Mona Ali', service: 'Botox', price: 800, status: 'started' },
    handleCompleteTreatment: vi.fn(),
    medicalRecord: null,
    medicalRecordLoading: false,
    showMedicalForm: false,
    setShowMedicalForm: vi.fn(),
    formSkinType: 'Normal',
    setFormSkinType: vi.fn(),
    formAllergies: '',
    setFormAllergies: vi.fn(),
    formMedicationDetails: '',
    setFormMedicationDetails: vi.fn(),
    formMedicalConditionsDetails: '',
    setFormMedicalConditionsDetails: vi.fn(),
    formPreviousTreatmentsDetails: '',
    setFormPreviousTreatmentsDetails: vi.fn(),
    savingMedicalRecord: false,
    handleSaveMedicalRecord: vi.fn(),
    servicesList: [SERVICE_BOTOX, SERVICE_PEEL],
    handleChangePrimaryService: vi.fn(),
    productsList: [],
    devicesList: [DEVICE_LASER],
    selectedProductId: '',
    setSelectedProductId: vi.fn(),
    selectedProductQty: 1,
    setSelectedProductQty: vi.fn(),
    usedProducts: [],
    handleAddProductToSession: vi.fn(),
    handleRemoveProductFromSession: vi.fn(),
    selectedDeviceId: '',
    setSelectedDeviceId: vi.fn(),
    extraPulsesCount: 0,
    setExtraPulsesCount: vi.fn(),
    pricePerPulse: 0,
    setPricePerPulse: vi.fn(),
    baseBookingPrice: 800,
    productsSubtotal: 0,
    extraPulsesSubtotal: 0,
    updatedInvoiceTotal: 0,
    clinicalNote: '',
    setClinicalNote: vi.fn(),
    handleSaveClinicalNote: vi.fn(),
    savingNote: false,
    setActiveTab: vi.fn(),
    reservations: [],
    setActiveSessionBooking: vi.fn(),
    onAdditionalServicesChange: vi.fn(),
    t,
    ...overrides,
  };
}

describe('session state switching', () => {
  it('shows the waiting screen, not the treatment grid, when there is no active session', () => {
    render(<DoctorOngoingSessionTab {...baseProps({ activeSessionBooking: null })} />);
    expect(screen.getByText('waitingForReceptionistTitle')).toBeInTheDocument();
    expect(screen.queryByText('completeTreatmentBtn')).not.toBeInTheDocument();
  });

  it('shows the waiting screen once the session status is completed, even if a booking object is still passed', () => {
    render(<DoctorOngoingSessionTab {...baseProps({ activeSessionBooking: { id: 'r1', status: 'completed' } })} />);
    expect(screen.getByText('waitingForReceptionistTitle')).toBeInTheDocument();
  });

  it('surfaces an in-progress reservation from the queue as an "active session detected" banner', () => {
    render(
      <DoctorOngoingSessionTab
        {...baseProps({
          activeSessionBooking: null,
          reservations: [{ id: 'r9', status: 'in_progress', name: 'Sara', service: 'Peel' }],
        })}
      />
    );
    expect(screen.getByText('activeSessionDetectedTitle')).toBeInTheDocument();
  });
});

describe('additional services — money math', () => {
  it('fetches the linked device and default pulses for the selected service, then adding it uses that default', async () => {
    fetchFake.on('GET', '/api/service-devices', (call) => {
      expect(call.query.get('serviceId')).toBe('srv-2');
      return { status: 200, body: { deviceLinks: [{ device_id: 'dev-1', pulses_per_session: 250 }] } };
    });
    const user = userEvent.setup();
    render(<DoctorOngoingSessionTab {...baseProps()} />);

    const panel = additionalServicesPanel();
    const [serviceSelect] = within(panel).getAllByRole('combobox');
    await user.selectOptions(serviceSelect, 'srv-2');

    await waitFor(() => expect(fetchFake.calls.some((c) => c.path === '/api/service-devices')).toBe(true));
    await waitFor(() => expect(within(panel).getByPlaceholderText('Pulses (e.g. 150)')).toHaveValue(250));

    await user.click(within(panel).getByRole('button', { name: /addAdditionalServiceBtn/ }));

    // "+300 EGP" appears twice by design: the added line item, and the additionalServicesSubtotal
    // in the breakdown summary — both must agree.
    expect(screen.getAllByText('+300 EGP')).toHaveLength(2);
    // finalSessionTotal = baseBookingPrice(800) + additionalServicesSubtotal(300) + productsSubtotal(0) + extraPulsesSubtotal(0)
    expect(screen.getByText('1100 EGP')).toBeInTheDocument();
  });

  it('defaults pulses to 100 when the selected service has no linked device', async () => {
    fetchFake.on('GET', '/api/service-devices', () => ({ status: 200, body: { deviceLinks: [] } }));
    const user = userEvent.setup();
    render(<DoctorOngoingSessionTab {...baseProps()} />);

    const panel = additionalServicesPanel();
    const [serviceSelect] = within(panel).getAllByRole('combobox');
    await user.selectOptions(serviceSelect, 'srv-2');

    await waitFor(() => expect(within(panel).getByPlaceholderText('Pulses (e.g. 150)')).toHaveValue(100));
  });

  it('a manual negative pulses override is clamped to zero, not sent as a negative charge', async () => {
    fetchFake.on('GET', '/api/service-devices', () => ({ status: 200, body: { deviceLinks: [] } }));
    const user = userEvent.setup();
    render(<DoctorOngoingSessionTab {...baseProps()} />);

    const panel = additionalServicesPanel();
    const [serviceSelect] = within(panel).getAllByRole('combobox');
    await user.selectOptions(serviceSelect, 'srv-2');
    await waitFor(() => expect(within(panel).getByPlaceholderText('Pulses (e.g. 150)')).toHaveValue(100));

    const pulsesInput = within(panel).getByPlaceholderText('Pulses (e.g. 150)');
    fireEvent.change(pulsesInput, { target: { value: '-50' } });
    expect(pulsesInput).toHaveValue(0);
  });

  it('removing an added service subtracts it back out of the final total', async () => {
    fetchFake.on('GET', '/api/service-devices', () => ({ status: 200, body: { deviceLinks: [] } }));
    const user = userEvent.setup();
    render(<DoctorOngoingSessionTab {...baseProps()} />);

    const panel = additionalServicesPanel();
    const [serviceSelect] = within(panel).getAllByRole('combobox');
    await user.selectOptions(serviceSelect, 'srv-2');
    await waitFor(() => expect(within(panel).getByPlaceholderText('Pulses (e.g. 150)')).toHaveValue(100));
    await user.click(within(panel).getByRole('button', { name: /addAdditionalServiceBtn/ }));
    expect(screen.getByText('1100 EGP')).toBeInTheDocument();

    // The remove button is icon-only with no accessible name, so it's found by scoping to the
    // added-service row (identified by its price text — the row's <span>, not the breakdown
    // summary's <strong> which shows the same "+300 EGP" for the subtotal).
    const row = screen.getAllByText('+300 EGP').find((el) => el.tagName === 'SPAN')!.closest('div')!.parentElement as HTMLElement;
    await user.click(within(row).getByRole('button'));

    expect(screen.queryByText('+300 EGP')).not.toBeInTheDocument();
    const finalRow = screen.getByText('finalInvoiceLabel').parentElement as HTMLElement;
    expect(within(finalRow).getByText('800 EGP')).toBeInTheDocument();
  });

  it('completing treatment passes the sum of extra pulses and every added service pulses to the parent handler', async () => {
    fetchFake.on('GET', '/api/service-devices', () => ({ status: 200, body: { deviceLinks: [{ device_id: 'dev-1', pulses_per_session: 40 }] } }));
    const handleCompleteTreatment = vi.fn();
    const user = userEvent.setup();
    render(<DoctorOngoingSessionTab {...baseProps({ handleCompleteTreatment, extraPulsesCount: 60 })} />);

    const panel = additionalServicesPanel();
    const [serviceSelect] = within(panel).getAllByRole('combobox');
    await user.selectOptions(serviceSelect, 'srv-2');
    await waitFor(() => expect(within(panel).getByPlaceholderText('Pulses (e.g. 150)')).toHaveValue(40));
    await user.click(within(panel).getByRole('button', { name: /addAdditionalServiceBtn/ }));

    await user.click(screen.getByText('completeTreatmentBtn'));

    // totalSessionPulses = extraPulsesCount(60) + additionalPulsesTotal(40) = 100
    expect(handleCompleteTreatment).toHaveBeenCalledWith(expect.objectContaining({ id: 'res-1' }), 100);
  });

  it('includes products and extra-pulses subtotals passed in from the parent in the final invoice total', () => {
    render(<DoctorOngoingSessionTab {...baseProps({ productsSubtotal: 150, extraPulsesSubtotal: 200 })} />);
    // finalSessionTotal = 800 (base) + 0 (no additional services) + 150 (products) + 200 (extra pulses)
    expect(screen.getByText('1150 EGP')).toBeInTheDocument();
  });
});

describe('inline prescription', () => {
  it('POSTs diagnosis, non-empty medications only, and instructions for the active booking', async () => {
    fetchFake.on('POST', '/api/prescriptions', (call) => {
      expect(call.body).toEqual({
        booking_id: 'res-1',
        customer_name: 'Mona Ali',
        diagnosis: 'Acne Vulgaris',
        medications: [{ name: 'Retin-A', dosage: '0.05%', frequency: 'Nightly', duration: '4 weeks' }],
        instructions: 'Avoid sun exposure',
      });
      return { status: 200, body: { id: 'rx-1' } };
    });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DoctorOngoingSessionTab {...baseProps()} />);

    await user.type(screen.getByPlaceholderText(/Post-laser inflammation/), 'Acne Vulgaris');
    await user.type(screen.getByPlaceholderText('medicationNamePlaceholder'), 'Retin-A');
    await user.type(screen.getByPlaceholderText('dosagePlaceholder'), '0.05%');
    await user.type(screen.getByPlaceholderText('frequencyPlaceholder'), 'Nightly');
    await user.type(screen.getByPlaceholderText('durationPlaceholder'), '4 weeks');
    await user.type(screen.getByPlaceholderText(/Apply sunscreen/), 'Avoid sun exposure');

    await user.click(screen.getByText('saveAndPrintRxBtn'));

    await waitFor(() => expect(fetchFake.calls.some((c) => c.path === '/api/prescriptions')).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('Prescription saved successfully!');
  });

  it('shows the server error message when the save fails, instead of a generic success alert', async () => {
    fetchFake.on('POST', '/api/prescriptions', () => ({ status: 400, body: { error: 'Diagnosis is required.' } }));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DoctorOngoingSessionTab {...baseProps()} />);

    await user.click(screen.getByText('saveAndPrintRxBtn'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Diagnosis is required.'));
  });
});
