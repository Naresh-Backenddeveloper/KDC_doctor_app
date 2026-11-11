import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { DOCTOR_SCREENS } from '../src/navigation/registry';
import { useAppointments } from '../src/store/appointments';
import { usePrescriptions } from '../src/store/prescriptions';
import { useSession } from '../src/store/session';
import { useBank } from '../src/store/bank';
import { useEarnings } from '../src/store/earnings';
import { useRecords } from '../src/store/records';
import { useSelection } from '../src/store/selection';
import { DEFAULT_APPT_ID } from '../src/mock-data/seed';
import { injectFailure, mockControl } from '../src/services';
import * as Auth from '../src/screens/auth';
import * as Rx from '../src/screens/prescription';
import * as States from '../src/screens/states';
import * as Prof from '../src/screens/profile';
import * as Call from '../src/screens/consultation';
import * as Rep from '../src/screens/reports';

const mockNavigate = jest.fn();
const mockResetTo = jest.fn();
jest.mock('../src/navigation/navigation', () => ({
  useNav: () => ({ current: 'x', stack: [], tab: 'home', navigate: mockNavigate, back: jest.fn(), resetTo: mockResetTo, isStatic: false }),
  isDevLaunch: () => false,
  devLaunchScreen: () => undefined,
  MAIN: 'main',
  routes: { aliases: {}, tabRoots: new Set() },
  resetAction: jest.fn(),
}));

function allText(node: any): string {
  if (typeof node === 'string') return node;
  if (!node?.children) return '';
  return node.children.map(allText).join('');
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

function makeHarness(element: React.ReactElement) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  mounted.push(renderer);
  const root = renderer.root;
  const buttons = () => root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && typeof n.type !== 'string');
  const press = async (label: string) => {
    // Sheets render after the screen, so the last match is the frontmost control.
    const ordered = buttons().reverse();
    const b = ordered.find((n) => allText(n).trim() === label) ?? ordered.find((n) => allText(n).trim().includes(label));
    if (!b) throw new Error(`No button "${label}" in: ${buttons().map((n) => allText(n)).join(' | ')}`);
    await act(async () => {
      await b.props.onPress();
    });
  };
  const inputs = () => root.findAll((n) => (n.type as unknown) === 'TextInput');
  const type = async (index: number, value: string) => {
    await act(async () => {
      inputs()[index].props.onChangeText(value);
    });
  };
  const text = () => allText(renderer.toJSON() as any);
  return { root, press, type, text, inputs, renderer };
}

const initial = new Map<any, any>();
const stores = [useSession, useAppointments, usePrescriptions, useBank, useEarnings, useRecords];

beforeAll(() => {
  mockControl.latency = 0;
  stores.forEach((s: any) => initial.set(s, s.getState()));
});

beforeEach(() => {
  stores.forEach((s: any) => s.setState(initial.get(s), true));
  useSelection.getState().reset();
  mockNavigate.mockClear();
  mockResetTo.mockClear();
});

afterEach(() => {
  mounted.splice(0).forEach((r) => act(() => r.unmount()));
});

describe('every screen renders from the default store', () => {
  it.each(DOCTOR_SCREENS.map((d) => [d.id, d.Component] as const))('%s', async (id, Component) => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Component />);
    });
    expect(renderer.toJSON()).toBeTruthy();
    expect(id).toBeTruthy();
    await act(async () => renderer.unmount());
  });
});

describe('login', () => {
  it('shows inline errors and blocks an invalid mobile', async () => {
    const h = makeHarness(<Auth.LoginScreen />);
    await h.type(0, '123');
    await h.press('Continue');
    expect(h.text()).toContain('10-digit registered mobile');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('goes to OTP with a valid mobile and password', async () => {
    const h = makeHarness(<Auth.LoginScreen />);
    await h.press('Continue');
    expect(mockNavigate).toHaveBeenCalledWith('dr-otp');
  });

  it('shows the OTP error for 000000 and proceeds with any other code', async () => {
    useSession.setState({ otpMobile: '9849011204' });
    const h = makeHarness(<Auth.OtpScreen />);
    await h.type(0, '000000');
    await h.press('Verify');
    expect(h.text()).toContain('not valid');
    expect(mockResetTo).not.toHaveBeenCalled();
    await h.type(0, '123456');
    await h.press('Verify');
    expect(mockResetTo).toHaveBeenCalledWith('dr-verification');
    expect(useSession.getState().token).toBeTruthy();
  });
});

describe('prescription allergy flow (Rahul, Penicillin)', () => {
  it('warns prominently on a penicillin-class medicine and requires explicit override', async () => {
    const h = makeHarness(<Rx.CreatePrescriptionScreen />);
    await h.press('Add Medicine');
    await h.press('Mox 500 Capsule');
    expect(h.text()).toContain('Allergy risk: Penicillin');
    expect(h.text()).toContain('Contains amoxicillin');

    await h.press('Override and add');
    expect(h.text()).toContain('Confirm you have reviewed');
    expect(usePrescriptions.getState().drafts[DEFAULT_APPT_ID].medicines).toHaveLength(2);

    await h.press('I have reviewed');
    await h.type(h.inputs().length - 1, 'No alternative available today');
    await h.press('Override and add');

    const meds = usePrescriptions.getState().drafts[DEFAULT_APPT_ID].medicines;
    expect(meds).toHaveLength(3);
    expect(meds[2].allergyOverride).toMatchObject({ allergens: ['Penicillin'], reason: 'No alternative available today' });
    expect(h.text()).toContain('Allergy override · Penicillin');
    expect(h.text()).toContain('1 allergy override');
  });

  it('adds a safe medicine from a recent chip without any override step', async () => {
    const h = makeHarness(<Rx.CreatePrescriptionScreen />);
    await h.press('Telma 40');
    expect(h.text()).not.toContain('Allergy risk');
    await h.press('Add Medicine');
    expect(usePrescriptions.getState().drafts[DEFAULT_APPT_ID].medicines).toHaveLength(3);
  });

  it('removes a medicine', async () => {
    const h = makeHarness(<Rx.CreatePrescriptionScreen />);
    const icons = h.root.findAll((n) => typeof n.type !== 'string' && n.props.accessibilityRole === 'button' && Boolean(n.props.onPress) && allText(n) === '');
    // Back arrow, then the first card's pencil, then its bin.
    await act(async () => {
      icons[2].props.onPress();
    });
    expect(usePrescriptions.getState().drafts[DEFAULT_APPT_ID].medicines).toHaveLength(1);
  });

  it('search filters the catalogue inline', async () => {
    const h = makeHarness(<Rx.CreatePrescriptionScreen />);
    const search = h.inputs().find((i) => i.props.placeholder?.includes('Search'))!;
    await act(async () => {
      search.props.onChangeText('metformin');
    });
    expect(h.text()).toContain('Glycomet 500 Tablet');
  });

  it('needs at least one medicine before review', async () => {
    usePrescriptions.getState().updateDraft(DEFAULT_APPT_ID, { medicines: [] });
    const h = makeHarness(<Rx.CreatePrescriptionScreen />);
    await h.press('Review Prescription');
    expect(h.text()).toContain('Add at least one medicine');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('routes a successful send to the sent screen and into history', async () => {
    const h = makeHarness(<Rx.ReviewPrescriptionScreen />);
    await h.press('Send Prescription');
    expect(mockNavigate).toHaveBeenCalledWith('dr-rx-sent');
    expect(usePrescriptions.getState().drafts[DEFAULT_APPT_ID].status).toBe('sent');
  });

  it('routes a failed send to the failure screen, keeps the draft, and retry succeeds', async () => {
    injectFailure('prescriptions.send');
    const h = makeHarness(<Rx.ReviewPrescriptionScreen />);
    await h.press('Send Prescription');
    expect(mockNavigate).toHaveBeenCalledWith('dr-st-rx-failed');
    expect(usePrescriptions.getState().drafts[DEFAULT_APPT_ID].status).toBe('failed');

    mockNavigate.mockClear();
    const f = makeHarness(<States.PrescriptionFailedScreen />);
    expect(f.text()).toContain('2 medicines');
    await f.press('Retry sending');
    expect(mockNavigate).toHaveBeenCalledWith('dr-rx-sent');
  });

  it('blocks send and names the conflict if an override is missing', async () => {
    usePrescriptions.getState().saveMedicine(DEFAULT_APPT_ID, { name: 'Mox 500 Capsule', strength: 'Amoxicillin 500 mg', dosage: '1 capsule', frequency: 'Three times daily', duration: '5 days', food: 'After food', instructions: '' });
    const h = makeHarness(<Rx.ReviewPrescriptionScreen />);
    await h.press('Send Prescription');
    expect(h.text()).toContain('Allergy not overridden');
    expect(mockNavigate).not.toHaveBeenCalledWith('dr-rx-sent');
  });
});

describe('forms', () => {
  it('shows vitals validation inline on the notes form', async () => {
    const h = makeHarness(<Call.NotesScreen />);
    const pulse = h.inputs().find((i) => i.props.value === '78')!;
    await act(async () => {
      pulse.props.onChangeText('999');
    });
    await h.press('Save draft');
    expect(h.text()).toContain('Pulse must be 30–220');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('adds and removes a symptom chip', async () => {
    const h = makeHarness(<Call.NotesScreen />);
    await h.press('Chest pain');
    expect(h.text()).toContain('Chest pain×');
    await h.press('Chest pain');
    expect(h.text()).not.toContain('Chest pain×');
  });

  it('live net earnings update as a fee changes', async () => {
    const h = makeHarness(<Prof.FeesScreen />);
    expect(h.text()).toContain('₹704');
    const video = h.inputs().find((i) => i.props.value === '800')!;
    await act(async () => {
      video.props.onChangeText('1000');
    });
    expect(h.text()).toContain('₹880');
  });

  it('rejects mismatched bank numbers and a bad IFSC inline', async () => {
    const h = makeHarness(<Prof.BankEditScreen />);
    const [, account, confirm, ifsc] = h.inputs();
    await act(async () => {
      account.props.onChangeText('123456789012');
      confirm.props.onChangeText('123456789013');
      ifsc.props.onChangeText('BAD');
    });
    await h.press('Verify');
    expect(h.text()).toContain('Account numbers do not match');
    expect(h.text()).toContain('IFSC must be 11 characters');
  });

  it('takes valid bank details through PAN confirmation', async () => {
    const h = makeHarness(<Prof.BankEditScreen />);
    const [holder, account, confirm, ifsc] = h.inputs();
    await act(async () => {
      holder.props.onChangeText('Arjun Mehta');
      account.props.onChangeText('123456789012');
      confirm.props.onChangeText('123456789012');
      ifsc.props.onChangeText('icic0000123');
    });
    await h.press('Verify');
    expect(h.text()).toContain('Confirm your PAN');
    await h.press('Confirm and verify');
    expect(h.text()).toContain('PAN must look like ABCDE1234F');
    await act(async () => {
      h.inputs()[h.inputs().length - 1].props.onChangeText('abcde1234f');
    });
    await h.press('Confirm and verify');
    expect(useBank.getState().bank).toMatchObject({ status: 'verifying', name: 'ICICI Bank' });
    expect(mockNavigate).toHaveBeenCalledWith('dr-bank');
  });

  it('opens a BottomSheet from SelectField and applies the choice', async () => {
    const h = makeHarness(<Prof.ProfessionalInfoScreen />);
    await h.press('Cardiology');
    expect(h.text()).toContain('Nephrology');
    await h.press('Nephrology');
    expect(h.text()).not.toContain('Psychiatry');
    expect(h.text()).toContain('Nephrology');
  });
});

describe('reports', () => {
  it('marks reviewed and updates status', async () => {
    const h = makeHarness(<Rep.ReportDetailScreen />);
    await h.press('Mark reviewed');
    expect(useRecords.getState().reports.find((r) => r.id === 'KDC-LR-77210')?.status).toBe('reviewed');
    expect(mockNavigate).toHaveBeenCalledWith('dr-rx-create');
  });
});

describe('logout', () => {
  it('clears the session and returns to login', async () => {
    useSession.setState({ token: 'abc', mobile: '9849011204' });
    const h = makeHarness(<Prof.SettingsScreen />);
    await h.press('Log out');
    expect(useSession.getState().token).toBeNull();
    expect(mockResetTo).toHaveBeenCalledWith('dr-login');
  });
});
