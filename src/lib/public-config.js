function listFromEnvironment(name, fallback) {
  const configured = process.env[name]?.split(",").map((item) => item.trim()).filter(Boolean);
  return configured?.length ? configured : fallback;
}

export const publicConfig = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  upiId: process.env.NEXT_PUBLIC_UPI_ID || "",
  payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || "NeuroSage",
  fee: Number(process.env.NEXT_PUBLIC_REGISTRATION_FEE_INR || 0),
  campName: process.env.NEXT_PUBLIC_CAMP_NAME || "NeuroSage Mental Wellness Camp",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  upiQrImage: process.env.NEXT_PUBLIC_UPI_QR_IMAGE || "",
  akgecBranches: listFromEnvironment("NEXT_PUBLIC_AKGEC_BRANCHES", ["Computer Science and Engineering", "Information Technology", "Electronics and Communication", "Electrical and Electronics", "Mechanical Engineering", "Civil Engineering", "Other"]),
  akgecSpecializations: listFromEnvironment("NEXT_PUBLIC_AKGEC_SPECIALIZATIONS", []),
  akgecYears: listFromEnvironment("NEXT_PUBLIC_AKGEC_YEARS", ["1", "2", "3", "4", "5", "Other"]),
};