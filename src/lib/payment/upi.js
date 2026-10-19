export function isMatchingUpiQrPayload(payload, { upiId, amount }) {
  if (typeof payload !== "string" || !upiId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return false;
  try {
    const uri = new URL(payload);
    const actualAmount = Number(uri.searchParams.get("am"));
    return uri.protocol === "upi:"
      && uri.hostname === "pay"
      && uri.searchParams.get("pa")?.trim().toLowerCase() === upiId.trim().toLowerCase()
      && Number.isFinite(actualAmount)
      && Math.round(actualAmount * 100) === Math.round(Number(amount) * 100)
      && uri.searchParams.get("cu")?.toUpperCase() === "INR";
  } catch {
    return false;
  }
}