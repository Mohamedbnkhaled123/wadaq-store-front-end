import dns from 'dns';
import mongoose from '../../Wadaq store back end/node_modules/mongoose/index.js';
import bcrypt from '../../Wadaq store back end/node_modules/bcryptjs/index.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://momokhaled937_db_user:uQrTrh0Zf9JdnP75@wadaq1.y3mik96.mongodb.net/wadaq_store?retryWrites=true&w=majority&appName=wadaq1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@wadaq.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminWadaq@2026';

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  },
  { timestamps: true }
);

const settingsSchema = new mongoose.Schema(
  {
    siteName: {
      ar: { type: String, default: 'متجر ودق للتكامل الحسي' },
      en: { type: String, default: 'Wadaq Sensory Integration Store' },
    },
    whatsappNumber: { type: String, default: '+201000000000' },
    freeShippingThreshold: { type: Number, default: 5000 },
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

async function run() {
  console.log(`[Seed Admin] Connecting to Atlas...`);
  await mongoose.connect(MONGO_URI);
  console.log(`[Seed Admin] Connected.`);

  // 1. Settings
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
    console.log('[Seed Admin] Created default Settings in Atlas.');
  }

  // 2. Admin
  let admin = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);
    admin = await Admin.create({
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: 'admin',
    });
    console.log(`[Seed Admin] Admin created in Atlas: ${admin.email}`);
  } else {
    console.log(`[Seed Admin] Admin already exists in Atlas: ${admin.email}`);
  }

  await mongoose.disconnect();
  console.log('[Seed Admin] Done!');
  process.exit(0);
}

run().catch((err) => {
  console.error('[Seed Admin] Error:', err);
  process.exit(1);
});
