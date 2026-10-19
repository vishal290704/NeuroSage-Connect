# NeuroSage

NeuroSage is a registration, UPI payment-reference submission, manual payment-verification, and preliminary mental wellness awareness portal. It does not diagnose, recommend treatment, or provide emergency care.

## Stack and structure

- Next.js App Router, React, JavaScript, Tailwind CSS 4
- React Hook Form, shared Zod validation, Framer Motion, Sonner, Lucide
- MongoDB Atlas with Mongoose; collections: `registrations`, `akgec_students`, `admin_users`, `audit_logs`, `notification_logs`
- UPI QR generation with `qrcode`; payment verification remains manual
- Brevo transactional email API for guardian-consent and post-approval email
- Signed HTTP-only admin session cookies with `jose`; bcrypt password hashes

Primary code lives in `src/app`, `src/components`, `src/lib`, and `src/models`. Replace the editable logo at `public/images/neurosage-logo.svg`. A supplied static UPI QR may be placed under `public/images/` and selected with `NEXT_PUBLIC_UPI_QR_IMAGE`.

## Requirements

- Node.js 20.9 or later and npm
- MongoDB Atlas replica-set deployment (transactions are required for master/AKGEC record creation and state transitions)
- A Brevo account with a transactional API key and verified sender address
- Organizer-supplied UPI ID, payee, fee, event details, support contacts, and legally reviewed policies before public launch

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local`; fill in `MONGODB_URI`, a unique `AUTH_SECRET` of at least 32 random characters, `DATA_ENCRYPTION_KEY` generated with `openssl rand -base64 32`, and public UPI settings. Keep `.env.local` private and store a secure backup of the encryption key; losing it makes stored screening ciphertext unrecoverable.
3. In Atlas, create a least-privilege database user, use TLS, restrict Network Access to required IPs, and use a replica-set connection string. The app selects database `neurosage` by default.
4. Configure `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` before testing email flows. The sender address must be verified in Brevo. Set actual `SUPPORT_EMAIL` and `PRIVACY_CONTACT_EMAIL` contacts.
5. Run `npm run seed:admin` once with `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` set in `.env.local` or the shell. The password must be at least 16 characters; existing accounts are never overwritten. Do not put credentials in source control or deployment build logs.
6. Run `npm run dev` and open `http://localhost:3000`.

`REGISTRATION_OPEN=false` disables new registrations. If public UPI configuration is absent, the payment step displays that setup is pending and the server rejects submission. The app never invents a UPI ID or fee. Optional comma-separated `NEXT_PUBLIC_AKGEC_BRANCHES`, `NEXT_PUBLIC_AKGEC_SPECIALIZATIONS`, and `NEXT_PUBLIC_AKGEC_YEARS` values configure the student options.

## Routes and workflow

- `/` public overview; `/register` five-step registration
- `/privacy` and `/terms` working policy drafts, not legally approved documents
- `/admin/login`, `/admin/dashboard`, `/admin/registrations`, `/admin/akgec-students`
- `/api/registrations` creates pending registrations; `/api/registration-status` requires an unguessable status token
- Admin APIs authenticate and authorize each request. An administrator must check the actual payment record before approving.

The registration state machine is `PENDING_GUARDIAN_CONSENT` (minors only) → `PENDING_PAYMENT_REVIEW` → `APPROVED` or `REJECTED`. Payment state is independently `PENDING_REVIEW`, `APPROVED`, or `REJECTED`; email state is independently `NOT_SENT`, `PENDING`, `SENT`, or `FAILED`. A submitted UTR never verifies payment. A guardian link expires after 48 hours and records link confirmation; it does not verify guardian identity or legal authority.

The `akgec_students` collection contains academic classification and payment/registration state only, never screening responses or free-text health notes. The full preliminary screening payload is AES-256-GCM encrypted into a single `screeningDataEncrypted` field; the payment-admin interface does not display or decrypt it. No clinician accounts or clinician portal are included. Back up and rotate the encryption key using a reviewed migration procedure before changing it.

## Quality checks

```sh
npm run lint
npm test
npm run build
```

Automated tests cover shared form validation, consent and conditional fields, normalization, and server-side age calculation. Database transactions, concurrency, admin APIs, Brevo delivery, payment verification, and browser/mobile flows still need integration and end-to-end tests against isolated test services; do not use real participant data in tests.

## Production deployment checklist

1. Create MongoDB Atlas and a dedicated production database user. Allow only required IPs, confirm the deployment supports replica-set transactions, establish encrypted backups, and rehearse restore.
2. Provision environment variables from `.env.example` in the hosting platform. Use a unique strong `AUTH_SECRET`; `NEXT_PUBLIC_SITE_URL` must use HTTPS. Keep `BREVO_API_KEY`, MongoDB, encryption, and authentication values server-side; never use `NEXT_PUBLIC_*` for secrets.
3. Set and test the actual UPI ID, payee name, amount, event name, and optional supplied QR. Perform an end-to-end payment and compare its UTR with the actual bank/UPI record before approval.
4. Configure the Brevo transactional API key and a verified sender. Test guardian consent, approval delivery, failed delivery tracking, and admin retry. Approval remains approved if email delivery fails.
5. Provision the single administrator deliberately, disable the account when no longer needed, and test logout, cookie security, session expiry, CSRF origin checks, rate limits, and recovery.
6. Have qualified Indian legal counsel review the actual organization, services, fee/cancellation/refund policy, privacy basis, processor contracts, provider locations, retention/deletion, complaints, child data and guardian flow, accessibility, and public policy wording. Replace all placeholders and draft versions before launch.
7. Complete a security review: shared/distributed rate limiting and abuse controls, Brevo and database secrets, HTTPS/security headers, backup/key management, incident response, dependency advisories, data access, audit retention, and recovery.
8. Verify support/privacy contacts, event logistics, emergency notice, actual email rendering, responsive keyboard/screen-reader behavior, UPI receipt verification, and the admin approval/rejection workflow.
9. Deploy with production variables, run `npm run build`, then conduct an end-to-end test using organizer-controlled test registrations and payments. A successful build is not a production security certification.

## Known launch gates

- Brevo, MongoDB Atlas, UPI, contacts, and initial admin values are deliberately not supplied here.
- Multi-document transactions require Atlas/replica-set support.
- Terms and privacy are drafts. Legal identity, provider list, retention schedule, refund/cancellation terms, complaint process, and children's data review remain outstanding.
- Abuse throttles use atomic shared MongoDB counters; deploy edge/WAF protection as an additional network-level control.
- There is no payment gateway by design. An authorized administrator must verify the UTR against the real transaction record.
- Browser E2E tests and live Atlas/Brevo tests are not included; they must be added/run in an isolated environment.
