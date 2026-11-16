# KDC+ Doctor

The doctor app for KDC+: verification, schedule and availability, consultations, prescriptions, patient records and reports, earnings and payouts, notifications and support. It's a bare React Native CLI app (no Expo) for Android and iOS, ported from the KDC+ blueprint.

## Run

```bash
npm install
npm start                      # Metro
npm run android                # or: npm run ios  (run `cd ios && pod install` first)
```

## Live or demo

`src/services/config.ts` decides, per build:

- **Live** (`useMock: false`, the default): set `baseUrl` to the KDC+ backend's API root, e.g. `https://api.kdcplus.in/api/v1`.
  - Doctors are invited by operations in the admin panel and set their first password with *Forgot password?*.
  - They sign in with their mobile number and password, then an SMS code.
- **Demo** (`useMock: true`): the original prototype, with seeded data on its fixed date (5 Oct 2026) and a prefilled sign-in. Never use it with real patients.

## Where things live

| Path | What |
| --- | --- |
| `src/services/config.ts` | Live or demo, and the backend address |
| `src/services/index.ts` | The services switch: `services/live/*` (backend) or the mock services |
| `src/services/live/http.ts` | Calls the backend and throws the app's `ServiceError` with the server's message and field. Refreshes an expired access token once (one refresh at a time), ends the session once when it can't continue, never on an outage. Uploads with progress. |
| `src/services/live/sync*.ts` | Loads the stores from the backend: schedule (appointments, availability, blocks), records (patients, reports, prescriptions), account (profile, verification, earnings, bank, notifications, tickets). Runs after sign-in and on every launch; cleared on sign-out. |
| `src/services/live/flows-*.ts` | The live versions of `store/flows.ts`: the server decides, then the stores reload |
| `src/store/secure.ts` | The refresh token in the iOS Keychain / Android Keystore (`react-native-keychain`) |
| `src/store/` | Zustand stores. Live: they start empty, are filled from the server, and persist nothing about patients. |

## Live mode

How live builds behave, by design (the backend's rules from Phases 5–8):

- **Session:**
  - The refresh token lives in the Keychain / Keystore (after first unlock, this device only). The access token is never written to disk.
  - Launching restores the session and reloads everything; *Log out* ends it on the server and clears every patient detail from the phone.
  - An outage never signs the doctor out.
- **Recovery and first password:** the SMS code comes with a new-password field; afterwards the doctor signs in with it.
- **Verification:** documents upload to the server, the declaration is saved there, and *Submit for review* sends the application to the verification queue. The server says what's missing.
- **Schedule:**
  - Duty, running late, reschedules, no-shows, cancellations (a full refund to the patient) and blocks all happen on the server.
  - A block cancels the appointments inside it.
  - No-show is accepted only some minutes after the start (Settings).
- **Consultations:** starting, notes and ending are recorded on the server. **There's no video or audio yet:** the provider (decision D5) isn't chosen, so the call screens have no media.
- **Prescriptions:**
  - The app's allergy check runs, and the server runs its own. Issuing completes the consultation.
  - Every prescription belongs to a consultation, so prescribing from a patient's profile asks the doctor to open the appointment first.
  - Follow-ups are recorded on the prescription and not booked automatically.
- **Earnings, bank and statements:**
  - From the server. A new bank account is "verifying" until operations check it.
  - The month's statement shows its totals; the PDF needs a file viewer, which the app doesn't have yet.
- **Not yet:** push (needs the KDC+ Firebase files), profile photos (they need authenticated image loading), and in-app viewing of report files and statement PDFs.

## Tests

`npm test` covers the stores, flows, validation, the allergy check and a render of every screen, all in demo mode.

`__tests__/live.contract.test.ts` runs the app's own stores and flows on a running backend:
- **Sign-in:** password and SMS code.
- **Loading** everything from the server.
- **A consultation:** start, notes, a prescription from the catalogue, issued.
- **Appointment changes:** a no-show, a cancellation with refund, and a reschedule.
- **Schedule:** duty, running late and blocks.
- **Account:** profile, bank account, support and sign-out.
- **An applicant's** declaration and submission.

It is skipped unless `DOCTOR_LIVE_URL` and `DOCTOR_DATA` are set; see the file's header.
