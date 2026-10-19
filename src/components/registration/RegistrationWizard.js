"use client";

import { cloneElement, useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Clipboard, HeartHandshake, ShieldCheck } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { publicConfig } from "@/lib/public-config";
import { isMatchingUpiQrPayload } from "@/lib/payment/upi";
import { assessmentOptions, concernOptions, durationOptions, impactOptions, registrationSchema, supportOptions } from "@/lib/validation/registration";
import Link from "next/link";

const steps = ["Personal information", "Areas of concern", "Duration & support", "UPI payment", "Consent & review"];
const fieldNames = [
  ["fullName", "dateOfBirth", "phone", "email", "address.line", "address.city", "address.state", "address.postalCode", "akgecDetails.studentNumber", "akgecDetails.branch", "akgecDetails.specialization", "akgecDetails.section", "akgecDetails.yearOfStudy", "guardian.name", "guardian.email"],
  ["concerns"],
  ["duration", "impact", "previousAssessment", "preferredSupport", "additionalInformation"],
  ["payment.utr"],
  ["consents.screening", "consents.privacy", "consents.professionalSupport", "consents.terms", "consents.participantAssent"],
];
const defaultValues = {
  fullName: "", dateOfBirth: "", guardian: { name: "", email: "" }, phone: "+91 ", email: "", gender: "Prefer not to say",
  address: { line: "", city: "", state: "", postalCode: "", countryCode: "IN" }, isAKGECStudent: false,
  concerns: {}, duration: "", impact: "", previousAssessment: "", preferredSupport: [], additionalInformation: "",
  payment: { utr: "" }, consents: { screening: false, privacy: false, professionalSupport: false, terms: false, participantAssent: false },
};

function Field({ label, required, error, children, hint }) {
  const id = useId();
  return <div className="form-field"><label htmlFor={id}>{label}{required && <span className="required-mark"> *</span>}</label>{cloneElement(children, { id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined })}{hint && <small className="field-hint">{hint}</small>}{error && <small id={`${id}-error`} className="field-error" role="alert">{error}</small>}</div>;
}

function ChoiceGroup({ label, values, selected, onChange, type = "radio", columns = 2 }) {
  return <fieldset className={`choice-grid choice-grid-${columns}`}><legend>{label}</legend>{values.map((value) => {
    const checked = type === "radio" ? selected === value : selected.includes(value);
    return <label className={`choice-option ${checked ? "is-selected" : ""}`} key={value}>
      <input type={type} checked={checked} onChange={() => onChange(value)} />
      <span className="choice-indicator" aria-hidden="true">{checked && <Check size={14} />}</span><span>{value}</span>
    </label>;
  })}</fieldset>;
}

function calculateAge(dateValue) {
  if (!dateValue) return null;
  const birth = new Date(`${dateValue}T00:00:00`);
  let age = new Date().getFullYear() - birth.getFullYear();
  if (new Date().getMonth() < birth.getMonth() || (new Date().getMonth() === birth.getMonth() && new Date().getDate() < birth.getDate())) age -= 1;
  return age;
}

export default function RegistrationWizard() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [customQrValid, setCustomQrValid] = useState(false);
  const [customQrFailed, setCustomQrFailed] = useState(false);
  const { register, control, handleSubmit, setValue, unregister, trigger, getValues, formState: { errors } } = useForm({ resolver: zodResolver(registrationSchema), defaultValues, mode: "onTouched" });
  const values = useWatch({ control });
  const age = calculateAge(values.dateOfBirth);
  const isMinor = age !== null && age < 18;

  useEffect(() => {
    if (!publicConfig.upiId || !publicConfig.fee) return;
    const uri = `upi://pay?${new URLSearchParams({ pa: publicConfig.upiId, pn: publicConfig.payeeName, am: publicConfig.fee.toFixed(2), cu: "INR", tn: `${publicConfig.campName} registration` })}`;
    QRCode.toDataURL(uri, { width: 280, margin: 1, color: { dark: "#195d64", light: "#ffffff" } }).then(setQrCode).catch(() => setQrCode(""));
  }, []);

  useEffect(() => {
    if (!publicConfig.upiQrImage) return;
    let active = true;
    const image = new window.Image();
    image.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas is unavailable.");
        context.drawImage(image, 0, 0);
        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
        if (!decoded || !isMatchingUpiQrPayload(decoded.data, { upiId: publicConfig.upiId, amount: publicConfig.fee })) {
          setCustomQrFailed(true);
          return;
        }
        setCustomQrValid(true);
      } catch {
        setCustomQrFailed(true);
      }
    };
    image.onerror = () => { if (active) setCustomQrFailed(true); };
    image.src = publicConfig.upiQrImage;
    return () => { active = false; };
  }, []);

  async function continueStep() {
    const valid = await trigger(fieldNames[step], { shouldFocus: true });
    if (!valid) {
      toast.error("Please complete all required fields before continuing.");
      const firstError = document.querySelector("[aria-invalid='true']");
      firstError?.focus();
      return;
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function submitForm(data) {
    setBusy(true);
    try {
      const response = await fetch("/api/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Registration could not be submitted.");
        if (result.fieldErrors) Object.entries(result.fieldErrors).forEach(([key, messages]) => setValue(key, getValues(key), { shouldValidate: true, shouldTouch: true }));
        return;
      }
      setSubmitted(result);
      sessionStorage.setItem("neurosage-registration", JSON.stringify({ registrationId: result.registrationId, token: result.statusToken }));
    } catch {
      toast.error("We could not reach the registration service. Your information is still here; please try again.");
    } finally { setBusy(false); }
  }

  function toggleConcern(group, option) {
    const current = getValues(`concerns.${group}`) || [];
    const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    setValue(`concerns.${group}`, next, { shouldDirty: true, shouldValidate: true });
  }

  async function copyUpi() {
    try { await navigator.clipboard.writeText(publicConfig.upiId); toast.success("UPI ID copied."); }
    catch { toast.error("Unable to copy the UPI ID. Select and copy it manually."); }
  }

  if (submitted) return <section className="success-panel" aria-live="polite">
    <motion.div initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="success-mark"><Check size={32} /></motion.div>
    <p className="eyebrow">Registration received</p><h1>Thank you for registering with NeuroSage.</h1>
    <p>Your registration details and payment reference have been received. Our team will review your payment, and you will receive an email confirmation once your registration has been approved.</p>
    <div className="reference-box"><span>Registration reference</span><strong>{submitted.registrationId}</strong></div>
    <div className="status-row"><span className="status-dot" />{submitted.registrationStatus === "PENDING_GUARDIAN_CONSENT" ? "Awaiting parent or guardian consent" : "Payment verification: Pending Review"}</div>
    <p className="success-small">Keep this reference for future communication. Do not share your transaction reference publicly.</p>
    {publicConfig.supportEmail && <a className="text-link" href={`mailto:${publicConfig.supportEmail}`}>Questions? Contact NeuroSage support</a>}
  </section>;

  return <form className="wizard" onSubmit={handleSubmit(submitForm)} noValidate>
    <div className="wizard-heading"><div><p className="eyebrow">NeuroSage · Registration</p><h1>Your well-being deserves attention.</h1><p>Share only what feels comfortable. Your responses help us understand your support preferences, not make a diagnosis.</p></div><div className="privacy-chip"><ShieldCheck size={17} /> Private by design</div></div>
    <div className="progress-track" aria-label={`Step ${step + 1} of ${steps.length}`}>
      {steps.map((title, index) => <div key={title} className={`progress-step ${index <= step ? "active" : ""}`}><span>{index < step ? <Check size={14} /> : index + 1}</span><small>{title}</small></div>)}
    </div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.section key={step} className="step-content" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
        {step === 0 && <>
          <h2>Personal information</h2><p className="step-intro">A few details help us coordinate your registration.</p>
          <div className="form-grid">
            <Field label="Full name" required error={errors.fullName?.message}><input {...register("fullName")} autoComplete="name" aria-invalid={Boolean(errors.fullName)} placeholder="Your name" /></Field>
            <Field label="Date of birth" required error={errors.dateOfBirth?.message}><input {...register("dateOfBirth")} type="date" max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(errors.dateOfBirth)} /></Field>
            <Field label="Contact / WhatsApp number" required error={errors.phone?.message} hint="Include a country code. India (+91) is prefilled."><input {...register("phone")} type="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} placeholder="+91 98765 43210" /></Field>
            <Field label="Email address" required error={errors.email?.message}><input {...register("email")} type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} placeholder="you@example.com" /></Field>
            <Field label="Gender" hint="Optional"><select {...register("gender")}><option value="">Choose not to say</option><option>Male</option><option>Female</option><option>Other / Non-binary</option><option>Prefer not to say</option></select></Field>
            <Field label="Address line" required error={errors.address?.line?.message}><input {...register("address.line")} autoComplete="street-address" aria-invalid={Boolean(errors.address?.line)} /></Field>
            <Field label="City" required error={errors.address?.city?.message}><input {...register("address.city")} autoComplete="address-level2" aria-invalid={Boolean(errors.address?.city)} /></Field>
            <Field label="State / region" required error={errors.address?.state?.message}><input {...register("address.state")} autoComplete="address-level1" aria-invalid={Boolean(errors.address?.state)} /></Field>
            <Field label="PIN / postal code" required error={errors.address?.postalCode?.message}><input {...register("address.postalCode")} autoComplete="postal-code" aria-invalid={Boolean(errors.address?.postalCode)} /></Field>
            <Field label="Country / region" hint="Optional; India is selected by default."><select {...register("address.countryCode")}><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="SG">Singapore</option><option value="AE">United Arab Emirates</option><option value="ZZ">Other / add code in your address</option></select></Field>
          </div>
          <label className="toggle-row"><input type="checkbox" {...register("isAKGECStudent", { onChange: (event) => { if (!event.target.checked) unregister("akgecDetails"); } })} /><span className="toggle-copy"><strong>Are you a student of Ajay Kumar Garg Engineering College (AKGEC)?</strong><small>This is optional for all other participants.</small></span></label>
          <AnimatePresence initial={false}>{values.isAKGECStudent && <motion.div className="conditional-panel" initial={reduceMotion ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduceMotion ? undefined : { height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
            <div className="form-grid"><Field label="Student number / roll number" required error={errors.akgecDetails?.studentNumber?.message}><input {...register("akgecDetails.studentNumber")} /></Field>
              <Field label="Branch" required error={errors.akgecDetails?.branch?.message}><select {...register("akgecDetails.branch")}><option value="">Choose branch</option>{publicConfig.akgecBranches.map((option) => <option key={option}>{option}</option>)}</select></Field>
              <Field label="Specialization" required error={errors.akgecDetails?.specialization?.message}>{publicConfig.akgecSpecializations.length ? <select {...register("akgecDetails.specialization")}><option value="">Choose specialization</option>{publicConfig.akgecSpecializations.map((option) => <option key={option}>{option}</option>)}</select> : <input {...register("akgecDetails.specialization")} placeholder="Enter your specialization" />}</Field>
              <Field label="Section" required error={errors.akgecDetails?.section?.message}><input {...register("akgecDetails.section")} placeholder="e.g. A" /></Field>
              <Field label="Current year of study" required error={errors.akgecDetails?.yearOfStudy?.message}><select {...register("akgecDetails.yearOfStudy")}><option value="">Choose year</option>{publicConfig.akgecYears.map((year) => <option key={year} value={year}>{year === "Other" ? year : `Year ${year}`}</option>)}</select></Field></div>
          </motion.div>}</AnimatePresence>
          {isMinor && <div className="guardian-box"><h3>Parent or legal guardian</h3><p>Participants under 18 need a parent or legal guardian to review a secure confirmation email before payment review can proceed.</p><div className="form-grid"><Field label="Guardian name" required error={errors.guardian?.name?.message}><input {...register("guardian.name")} /></Field><Field label="Guardian email" required error={errors.guardian?.email?.message}><input {...register("guardian.email")} type="email" /></Field></div></div>}
        </>}
        {step === 1 && <>
          <h2>Areas of concern</h2><p className="step-intro">Select any areas you would like support with. You may skip this section. These responses are not a diagnosis.</p>
          <div className="concern-grid">{Object.entries(concernOptions).map(([group, options]) => <fieldset className="concern-card" key={group}><legend>{group === "ADHD" ? "ADHD · Attention & hyperactivity" : group === "OCD" ? "OCD · Obsessions & compulsions" : group === "Depression" ? "Depression & low mood" : group === "Autism" ? "Autism-related concerns" : group === "Dyslexia" ? "Dyslexia · Reading difficulties" : group === "Stress" ? "Stress & emotional regulation" : group === "Sleep" ? "Sleep difficulties" : group}</legend>{options.map((option) => <label className="check-option" key={option}><input type="checkbox" checked={(values.concerns?.[group] || []).includes(option)} onChange={() => toggleConcern(group, option)} /><span>{option}</span></label>)}</fieldset>)}</div>
          <aside className="notice-box"><HeartHandshake size={18} /><p>These questions support preliminary screening and awareness only. They do not establish a diagnosis or replace an assessment by a qualified professional.</p></aside>
        </>}
        {step === 2 && <>
          <h2>Duration & preferred support</h2><p className="step-intro">Your answers help us understand the kind of information you are looking for.</p>
          <ChoiceGroup label="How long have you experienced these difficulties?" values={durationOptions} selected={values.duration} onChange={(value) => setValue("duration", value, { shouldValidate: true })} />
          {errors.duration && <small className="field-error">Choose an option to continue.</small>}
          <ChoiceGroup label="How much do these difficulties affect your daily life?" values={impactOptions} selected={values.impact} onChange={(value) => setValue("impact", value, { shouldValidate: true })} />
          {errors.impact && <small className="field-error">Choose an option to continue.</small>}
          <ChoiceGroup label="Have you previously received an assessment or professional support?" values={assessmentOptions} selected={values.previousAssessment} onChange={(value) => setValue("previousAssessment", value, { shouldValidate: true })} />
          {errors.previousAssessment && <small className="field-error">Choose an option to continue.</small>}
          <ChoiceGroup label="What type of support or information would you prefer?" values={supportOptions} selected={values.preferredSupport || []} type="checkbox" onChange={(value) => { const selected = values.preferredSupport || []; setValue("preferredSupport", selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value], { shouldValidate: true }); }} />
          {errors.preferredSupport && <small className="field-error">Select at least one preference.</small>}
          <Field label="Anything else you'd like us to know?" hint="Optional. Avoid sharing diagnoses, prescriptions, or medical records. Maximum 1,200 characters." error={errors.additionalInformation?.message}><textarea {...register("additionalInformation")} rows={4} maxLength={1200} placeholder="Share anything relevant to participation or support preferences." /></Field>
        </>}
        {step === 3 && <>
          <h2>UPI payment</h2><p className="step-intro">Complete payment in your preferred UPI app, then enter the transaction reference shown in your receipt.</p>
          <div className="payment-layout"><div className="qr-frame">{publicConfig.upiQrImage && customQrValid ? <Image src={publicConfig.upiQrImage} alt={`UPI payment QR for ${publicConfig.payeeName}`} width={240} height={240} unoptimized /> : qrCode ? <Image src={qrCode} alt={`UPI payment QR for ${publicConfig.payeeName}`} width={240} height={240} unoptimized /> : <div className="qr-empty"><span>QR setup pending</span><small>The organizer has not configured the UPI ID and fee yet.</small></div>}</div>
            {customQrFailed && <p className="qr-warning" role="status">Scan the displayed QR, then confirm the payee and amount in your UPI app before completing payment.</p>}
            <div className="payment-details"><span className="payment-label">Registration fee</span><strong className="amount">{publicConfig.fee ? `₹${publicConfig.fee.toLocaleString("en-IN")}` : "Not configured"}</strong><p>{publicConfig.campName}</p>
              <div className="upi-id"><div><small>Payee</small><strong>{publicConfig.payeeName}</strong></div><div><small>UPI ID</small><strong>{publicConfig.upiId || "Organizer setup pending"}</strong></div>{publicConfig.upiId && <button type="button" className="icon-button" onClick={copyUpi} aria-label="Copy UPI ID"><Clipboard size={17} /></button>}</div>
              {publicConfig.upiId && publicConfig.fee > 0 && <a className="secondary-button" href={`upi://pay?${new URLSearchParams({ pa: publicConfig.upiId, pn: publicConfig.payeeName, am: publicConfig.fee.toFixed(2), cu: "INR", tn: `${publicConfig.campName} registration` })}`}>Open UPI app <ArrowRight size={16} /></a>}
            </div></div>
          <ol className="payment-steps"><li>Scan the QR with a UPI application and pay the exact fee.</li><li>Wait for the payment receipt, then copy its UTR / transaction ID.</li><li>Enter the reference below. NeuroSage will verify payment manually.</li></ol>
          <Field label="UTR / UPI transaction reference" required error={errors.payment?.utr?.message} hint="Find this in your successful payment receipt. Enter 6–64 letters, numbers, hyphens, underscores or slashes."><input {...register("payment.utr")} autoComplete="off" aria-invalid={Boolean(errors.payment?.utr)} placeholder="Transaction reference" /></Field>
          <div className="warning-box">Submitting a transaction reference does not confirm payment. Your registration remains pending until an administrator verifies it.</div>
        </>}
        {step === 4 && <>
          <h2>Consent & review</h2><p className="step-intro">Please review the information and consent statements before submitting.</p>
          <div className="review-grid"><div><small>Participant</small><strong>{values.fullName}</strong></div><div><small>Email</small><strong>{values.email}</strong></div><div><small>Event</small><strong>{publicConfig.campName}</strong></div><div><small>Registration fee</small><strong>{publicConfig.fee ? `₹${publicConfig.fee.toLocaleString("en-IN")}` : "Not configured"}</strong></div><div><small>Payment reference</small><strong>{values.payment?.utr ? `${values.payment.utr.slice(0, 3)}••••${values.payment.utr.slice(-3)}` : "Not entered"}</strong></div><div><small>Payment status</small><strong className="pending-text">Pending Review</strong></div></div>
          <div className="consent-list">
            <label><input type="checkbox" {...register("consents.screening")} /><span>I understand that information collected is for preliminary mental wellness screening, awareness, and support coordination. This form does not provide a diagnosis or replace professional assessment, advice, or treatment.</span></label>
            <label><input type="checkbox" {...register("consents.privacy")} /><span>I have read the <Link href="/privacy" target="_blank">Privacy Policy</Link> and understand what information is collected, why it is used, who may access it, and how to contact NeuroSage about my information.</span></label>
            <label><input type="checkbox" {...register("consents.professionalSupport")} /><span>I understand relevant information may be shared with qualified professionals assigned to provide the support described by NeuroSage, subject to the Privacy Policy and applicable law.</span></label>
            <label><input type="checkbox" {...register("consents.terms")} /><span>I have read and agree to the <Link href="/terms" target="_blank">Terms and Conditions</Link>.</span></label>
            {isMinor && <label><input type="checkbox" {...register("consents.participantAssent")} /><span>I understand what this registration is for and agree to participate. My parent or guardian must also confirm through their secure email link.</span></label>}
          </div>
          {Object.keys(errors.consents || {}).length > 0 && <small className="field-error">Please select each required consent.</small>}
          <div className="notice-box"><ShieldCheck size={18} /><p>This website is not an emergency mental-health service. If you or someone else is in immediate danger, contact local emergency services or go to an appropriate emergency department.</p></div>
          <p className="legal-note">Terms and privacy information are working drafts and require review by qualified Indian legal counsel before public launch.</p>
        </>}
      </motion.section>
    </AnimatePresence>
    <div className="wizard-actions">{step > 0 ? <button className="back-button" type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> Back</button> : <span />}
      {step < steps.length - 1 ? <button className="primary-button" type="button" onClick={continueStep}>Continue <ArrowRight size={17} /></button> : <button className="primary-button" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit registration"} {!busy && <ArrowRight size={17} />}</button>}
    </div>
    <p className="form-footer">By continuing, your information is handled as described in our <Link href="/privacy">Privacy Policy</Link>.</p>
  </form>;
}