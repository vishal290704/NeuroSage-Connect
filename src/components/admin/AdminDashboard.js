"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LogOut, RefreshCw, Search } from "lucide-react";

const emptyData = {
  items: [],
  stats: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    akgec: 0,
    failedEmails: 0,
  },
  total: 0,
  page: 1,
  pageSize: 25,
};

export default function AdminDashboard({
  studentsOnly = false,
  registrationId = "",
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState(emptyData);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = params.get("status") || "ALL";
  const student = params.get("student") || "ALL";
  const search = params.get("search") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const page = params.get("page") || "1";

  async function load() {
    setError("");
    const url = registrationId
      ? `/api/admin/registrations/${encodeURIComponent(registrationId)}`
      : studentsOnly
        ? "/api/admin/akgec-students"
        : `/api/admin/registrations?${new URLSearchParams({ status, student, search, page, from, to })}`;
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Records could not be loaded.");
      return;
    }
    if (registrationId) setDetail(result);
    else setData(result);
  }

  useEffect(() => {
    let active = true;
    const url = registrationId
      ? `/api/admin/registrations/${encodeURIComponent(registrationId)}`
      : studentsOnly
        ? "/api/admin/akgec-students"
        : `/api/admin/registrations?${new URLSearchParams({ status, student, search, page })}`;
    fetch(url, { cache: "no-store" })
      .then(async (response) => ({
        response,
        result: await response.json().catch(() => ({})),
      }))
      .then(({ response, result }) => {
        if (!active) return;
        if (response.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (!response.ok) {
          setError(result.error || "Records could not be loaded.");
          return;
        }
        setError("");
        if (registrationId) setDetail(result);
        else setData(result);
      })
      .catch(() => {
        if (active) setError("Records could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [
    status,
    student,
    search,
    page,
    from,
    to,
    registrationId,
    studentsOnly,
    router,
  ]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(params.toString());
    if (value === "ALL" || value === "" || value === "1") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.replace(`/admin/registrations?${next.toString()}`);
  }

  async function mutate(path, body) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error || "The action could not be completed.");
        return;
      }
      toast.success(result.message || "Changes saved.");
      await load();
    } catch {
      toast.error("The action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (registrationId)
    return (
      <section className="admin-detail-shell">
        <Link className="back-link" href="/admin/registrations">
          ← All registrations
        </Link>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        {!detail && !error ? (
          <p>Loading registration…</p>
        ) : (
          detail && (
            <>
              <div className="admin-page-title">
                <div>
                  <p className="eyebrow">Registration review</p>
                  <h1>{detail.registration.fullName}</h1>
                  <p>
                    {detail.registration.registrationId} ·{" "}
                    {detail.registration.emailNormalized}
                  </p>
                </div>
                <span
                  className={`status-pill ${detail.registration.payment.status.toLowerCase()}`}
                >
                  {detail.registration.payment.status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="admin-detail-grid">
                <section className="admin-panel">
                  <h2>Participant details</h2>
                  <dl>
                    <dt>Phone</dt>
                    <dd>{detail.registration.phone}</dd>
                    <dt>Date of birth</dt>
                    <dd>
                      {new Date(
                        detail.registration.dateOfBirth,
                      ).toLocaleDateString()}
                    </dd>
                    <dt>Address</dt>
                    <dd>
                      {detail.registration.address?.line},{" "}
                      {detail.registration.address?.city},{" "}
                      {detail.registration.address?.state}{" "}
                      {detail.registration.address?.postalCode}
                    </dd>
                    <dt>AKGEC student</dt>
                    <dd>{detail.registration.isAKGECStudent ? "Yes" : "No"}</dd>
                    {detail.registration.akgecDetails && (
                      <>
                        <dt>Student number</dt>
                        <dd>
                          {detail.registration.akgecDetails.studentNumber}
                        </dd>
                        <dt>Branch / specialization</dt>
                        <dd>
                          {detail.registration.akgecDetails.branch} ·{" "}
                          {detail.registration.akgecDetails.specialization}
                        </dd>
                        <dt>Year / section</dt>
                        <dd>
                          {detail.registration.akgecDetails.yearOfStudy} ·{" "}
                          {detail.registration.akgecDetails.section}
                        </dd>
                      </>
                    )}
                    <dt>Registration status</dt>
                    <dd>
                      {detail.registration.registrationStatus.replaceAll(
                        "_",
                        " ",
                      )}
                    </dd>
                    <dt>Guardian consent</dt>
                    <dd>
                      {detail.registration.guardianConsent.status.replaceAll(
                        "_",
                        " ",
                      )}
                    </dd>
                    <dt>Screening consent</dt>
                    <dd>
                      {detail.registration.consents?.screening
                        ? "Recorded"
                        : "Missing"}
                    </dd>
                    <dt>Privacy consent</dt>
                    <dd>
                      {detail.registration.consents?.privacy
                        ? "Recorded"
                        : "Missing"}
                    </dd>
                    <dt>Support-sharing consent</dt>
                    <dd>
                      {detail.registration.consents?.professionalSupport
                        ? "Recorded"
                        : "Missing"}
                    </dd>
                    <dt>Terms consent</dt>
                    <dd>
                      {detail.registration.consents?.terms
                        ? "Recorded"
                        : "Missing"}
                    </dd>
                    <dt>Consent timestamp</dt>
                    <dd>
                      {detail.registration.consents?.recordedAt
                        ? new Date(
                            detail.registration.consents.recordedAt,
                          ).toLocaleString()
                        : "—"}
                    </dd>
                    <dt>Payment amount</dt>
                    <dd>₹{detail.registration.payment.amountExpected}</dd>
                    <dt>UTR reference</dt>
                    <dd className="utr-value">
                      {detail.registration.payment.utr}
                    </dd>
                    <dt>Submitted</dt>
                    <dd>
                      {new Date(detail.registration.createdAt).toLocaleString()}
                    </dd>
                  </dl>
                  <p className="admin-privacy-note">
                    Screening responses and optional personal notes are excluded
                    from this operational view.
                  </p>
                </section>
                <section className="admin-panel">
                  <h2>Review history</h2>
                  {detail.audit.length ? (
                    <ul className="audit-list">
                      {detail.audit.map((item) => (
                        <li key={item._id}>
                          <strong>{item.action.replaceAll("_", " ")}</strong>
                          <span>
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                          {item.metadata?.reason && (
                            <p>Reason: {item.metadata.reason}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No administrative decisions recorded.</p>
                  )}
                  <p className="email-status-note">
                    Approval email:{" "}
                    {detail.registration.approvalEmailStatus?.replaceAll(
                      "_",
                      " ",
                    ) || "NOT SENT"}
                  </p>
                  {detail.notification?.safeError && (
                    <p className="email-delivery-error" role="status">
                      {detail.notification.safeError}
                    </p>
                  )}
                  {["FAILED", "PENDING"].includes(
                    detail.registration.approvalEmailStatus,
                  ) && (
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        mutate(
                          `/api/admin/registrations/${registrationId}/retry-email`,
                        )
                      }
                    >
                      Retry approval email
                    </button>
                  )}
                  {detail.registration.registrationStatus ===
                    "PENDING_PAYMENT_REVIEW" && (
                    <div className="admin-actions">
                      <button
                        className="primary-button"
                        disabled={busy}
                        onClick={() =>
                          window.confirm(
                            "Confirm that you checked the actual payment record and want to approve this registration?",
                          ) &&
                          mutate(
                            `/api/admin/registrations/${registrationId}/approve`,
                          )
                        }
                      >
                        Approve registration
                      </button>
                      <button
                        className="danger-button"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm("Reject this registration?"))
                            return;
                          const reason = window.prompt(
                            "Add a participant-appropriate reason (5–500 characters):",
                          );
                          if (reason)
                            mutate(
                              `/api/admin/registrations/${registrationId}/reject`,
                              { reason },
                            );
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )
        )}
      </section>
    );

  return (
    <section className="admin-dashboard">
      <div className="admin-topbar">
        <Link className="brand" href="/">
          <span className="admin-brand-mark">N</span>
          <span>
            <strong>NeuroSage</strong>
            <small>Administration</small>
          </span>
        </Link>
        <nav>
          <Link href="/admin/dashboard">Overview</Link>
          <Link href="/admin/registrations">Registrations</Link>
          <Link href="/admin/akgec-students">AKGEC students</Link>
          <button
            className="icon-button"
            onClick={() => load()}
            aria-label="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="icon-button"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </nav>
      </div>
      {studentsOnly ? (
        <>
          <div className="admin-page-title">
            <div>
              <p className="eyebrow">Academic classification</p>
              <h1>AKGEC students</h1>
              <p>
                Academic administration details only. Screening information is
                not stored here.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Student number</th>
                  <th>Branch</th>
                  <th>Specialization</th>
                  <th>Year / section</th>
                  <th>Payment</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((item) => (
                  <tr key={item.registrationId}>
                    <td>
                      {item.fullName}
                      <small>{item.emailNormalized}</small>
                    </td>
                    <td>{item.studentNumber}</td>
                    <td>{item.branch}</td>
                    <td>{item.specialization}</td>
                    <td>
                      {item.yearOfStudy} / {item.section}
                    </td>
                    <td>{item.paymentStatus.replaceAll("_", " ")}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items?.length && (
              <p className="empty-state">No AKGEC student registrations yet.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="admin-page-title">
            <div>
              <p className="eyebrow">Registration operations</p>
              <h1>
                {status === "ALL" ? "Overview" : status.replaceAll("_", " ")}
              </h1>
              <p>
                Verify submitted UPI references against actual payment records
                before approval.
              </p>
            </div>
            <button className="secondary-button" onClick={() => load()}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
          <div className="stat-grid">
            {[
              ["Total registrations", data.stats.total],
              ["Awaiting review", data.stats.pending],
              ["Approved", data.stats.approved],
              ["Rejected", data.stats.rejected],
              ["AKGEC students", data.stats.akgec],
              ["Email failures", data.stats.failedEmails],
            ].map(([label, value]) => (
              <article className="stat-card" key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="table-toolbar">
            <label className="search-control">
              <Search size={17} />
              <input
                aria-label="Search registrations"
                placeholder="Search reference, name, email"
                value={search}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </label>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING_PAYMENT_REVIEW">Pending review</option>
              <option value="PENDING_GUARDIAN_CONSENT">Guardian consent</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              aria-label="Filter AKGEC status"
              value={student}
              onChange={(event) => updateFilter("student", event.target.value)}
            >
              <option value="ALL">All participants</option>
              <option value="YES">AKGEC students</option>
              <option value="NO">Non-AKGEC</option>
            </select>
            <label className="date-filter">
              From
              <input
                aria-label="Filter from date"
                type="date"
                value={from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
            </label>
            <label className="date-filter">
              To
              <input
                aria-label="Filter to date"
                type="date"
                value={to}
                onChange={(event) => updateFilter("to", event.target.value)}
              />
            </label>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Participant</th>
                  <th>UPI reference</th>
                  <th>Expected amount</th>
                  <th>AKGEC</th>
                  <th>Payment</th>
                  <th>Registered</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.registrationId}>
                    <td>
                      <Link
                        className="table-reference"
                        href={`/admin/registrations/${encodeURIComponent(item.registrationId)}`}
                      >
                        {item.registrationId}
                      </Link>
                      <small>
                        {item.registrationStatus.replaceAll("_", " ")}
                      </small>
                    </td>
                    <td>
                      {item.fullName}
                      <small>{item.emailNormalized}</small>
                    </td>
                    <td className="utr-value">{item.payment.utr}</td>
                    <td>₹{item.payment.amountExpected}</td>
                    <td>{item.isAKGECStudent ? "Yes" : "No"}</td>
                    <td>
                      <span
                        className={`status-pill ${item.payment.status.toLowerCase()}`}
                      >
                        {item.payment.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link
                        href={`/admin/registrations/${encodeURIComponent(item.registrationId)}`}
                        aria-label={`Review ${item.registrationId}`}
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items.length && (
              <p className="empty-state">
                No registrations match these filters.
              </p>
            )}
          </div>
          <div className="pagination">
            <span>{data.total} registrations</span>
            <div>
              <button
                className="back-button"
                disabled={Number(page) <= 1}
                onClick={() => updateFilter("page", String(Number(page) - 1))}
              >
                Previous
              </button>
              <span>Page {data.page || page}</span>
              <button
                className="back-button"
                disabled={Number(page) * data.pageSize >= data.total}
                onClick={() => updateFilter("page", String(Number(page) + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
