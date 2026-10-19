import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });

async function main() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32 || /change.?me|placeholder/i.test(process.env.AUTH_SECRET)) throw new Error("Set AUTH_SECRET to at least 32 unique random characters before provisioning an administrator.");
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set INITIAL_ADMIN_EMAIL to a valid administrator email.");
  if (!password || password.length < 16 || password.length > 200) throw new Error("Set INITIAL_ADMIN_PASSWORD to a unique password with at least 16 characters.");
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI before provisioning an administrator.");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || "neurosage" });
  const schema = new mongoose.Schema({ emailNormalized: { type: String, required: true, unique: true }, passwordHash: { type: String, required: true }, role: { type: String, default: "ADMIN" }, active: { type: Boolean, default: true } }, { collection: "admin_users", timestamps: true });
  const AdminUserModel = mongoose.models.AdminUser || mongoose.model("AdminUser", schema);
  if (await AdminUserModel.exists({ emailNormalized: email })) throw new Error("An administrator with that email already exists; no account was changed.");
  await AdminUserModel.create({ emailNormalized: email, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", active: true });
  process.stdout.write(`Administrator provisioned for ${email}. The password was not displayed.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});