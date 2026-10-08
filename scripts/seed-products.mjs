import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import mongoose from '../../Wadaq store back end/node_modules/mongoose/index.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore if not supported
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wadaq_store';

// Helper: Slug generator
function generateSlug(text) {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\w\s\u0621-\u064A\u0660-\u0669-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatEnglishTitle(id) {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Category schema
const localizedStringSchema = new mongoose.Schema(
  {
    ar: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const localizedOptionalSchema = new mongoose.Schema(
  {
    ar: { type: String, default: '', trim: true },
    en: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const imageItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    alt: { type: localizedOptionalSchema, default: () => ({ ar: '', en: '' }) },
  },
  { _id: false }
);

const specItemSchema = new mongoose.Schema(
  {
    label: { type: localizedStringSchema, required: true },
    value: { type: localizedStringSchema, required: true },
  },
  { _id: false }
);

const seoSchema = new mongoose.Schema(
  {
    title: { type: localizedOptionalSchema },
    description: { type: localizedOptionalSchema },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: localizedStringSchema, required: true },
    slug: {
      ar: { type: String, required: true, unique: true, index: true },
      en: { type: String, required: true, unique: true, index: true },
    },
    description: { type: localizedStringSchema },
    image: { type: imageItemSchema },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: localizedStringSchema, required: true },
    slug: {
      ar: { type: String, required: true, unique: true, index: true },
      en: { type: String, required: true, unique: true, index: true },
    },
    shortDescription: { type: localizedStringSchema, required: true },
    description: { type: localizedStringSchema, required: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    images: { type: [imageItemSchema], default: [] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    specs: { type: [specItemSchema], default: [] },
    sensorySystem: { type: localizedOptionalSchema },
    ageRange: { type: localizedOptionalSchema },
    inStock: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    seo: { type: seoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const CATEGORY_DEFINITIONS = {
  proprioceptive: {
    name: { ar: 'الحس العميق', en: 'Proprioceptive Processing' },
    slug: { ar: 'الحس-العميق', en: 'proprioceptive' },
    description: {
      ar: 'أدوات تنشيط المستقبلات العصبية العميقة والمفاصل والعضلات لدعم التهدئة والتنظيم الحسي الذاتي والوعي الجسدي.',
      en: 'Proprioceptive input tools for joint/muscle stimulation, calming, and body awareness.',
    },
    order: 1,
    imageUrl: '/images/products/back-tapping-massager-1.webp',
  },
  tactile: {
    name: { ar: 'المعالجة التلامسية', en: 'Tactile Processing' },
    slug: { ar: 'المعالجة-التلامسية', en: 'tactile' },
    description: {
      ar: 'أدوات التحفيز اللمسي وتطوير التمييز الحسي وعلاج الحساسية اللمسية المفرطة أو نقص الإحساس السطحي.',
      en: 'Tactile sensory tools for tactile defensiveness, texture adaptation, and sensory discrimination.',
    },
    order: 2,
    imageUrl: '/images/products/vibrating-facial-brush-textured.webp',
  },
  visual: {
    name: { ar: 'المعالجة البصرية', en: 'Visual Processing' },
    slug: { ar: 'المعالجة-البصرية', en: 'visual' },
    description: {
      ar: 'أنظمة الإنارة الحسية، غرف سنوزلين، والمؤثرات البصرية لتنمية التتبع البصري والتركيز والاسترخاء.',
      en: 'Visual stimulation tools, sensory lighting, and Snoezelen equipment for visual tracking and calm.',
    },
    order: 3,
    imageUrl: '/images/products/sensory-light-tunnel-3500.webp',
  },
  vestibular: {
    name: { ar: 'المعالجة الدهليزية', en: 'Vestibular Processing' },
    slug: { ar: 'المعالجة-الدهليزية', en: 'vestibular' },
    description: {
      ar: 'أدوات التوازن، كرات الجيم، والأنظمة الدهليزية لتطوير التوازن والتوافق الحركي العضلي والتحكم الوضعي.',
      en: 'Balance domes, therapy gym balls, and vestibular training tools for equilibrium and motor planning.',
    },
    order: 4,
    imageUrl: '/images/products/balance-ball-dome-1300.webp',
  },
};

async function main() {
  console.log(`[Seed] Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log('[Seed] Connected successfully.');

  // 1. Upsert Categories
  const categoryMap = new Map();

  for (const [key, def] of Object.entries(CATEGORY_DEFINITIONS)) {
    let cat = await Category.findOne({
      $or: [
        { 'slug.en': def.slug.en },
        { 'slug.ar': def.slug.ar },
        { 'name.ar': def.name.ar },
      ],
    });

    if (!cat) {
      cat = await Category.create({
        name: def.name,
        slug: def.slug,
        description: def.description,
        order: def.order,
        isActive: true,
        isDeleted: false,
        image: {
          url: def.imageUrl,
          publicId: '',
          alt: def.name,
        },
      });
      console.log(`[Seed] Category created: ${def.name.ar} (${def.slug.en})`);
    } else {
      cat.name = def.name;
      cat.slug = def.slug;
      cat.description = def.description;
      cat.order = def.order;
      cat.isActive = true;
      cat.isDeleted = false;
      if (!cat.image || !cat.image.url) {
        cat.image = {
          url: def.imageUrl,
          publicId: '',
          alt: def.name,
        };
      }
      await cat.save();
      console.log(`[Seed] Category updated: ${def.name.ar} (${cat._id})`);
    }
    categoryMap.set(key, cat);
  }

  // Remove old dummy categories and any orphaned products
  const validCatIds = Array.from(categoryMap.values()).map(c => c._id);
  const deletedOldProducts = await Product.deleteMany({ category: { $nin: validCatIds } });
  const deletedOldCategories = await Category.deleteMany({ _id: { $nin: validCatIds } });
  if (deletedOldProducts.deletedCount > 0) {
    console.log(`[Seed] Purged ${deletedOldProducts.deletedCount} old dummy products.`);
  }
  if (deletedOldCategories.deletedCount > 0) {
    console.log(`[Seed] Purged ${deletedOldCategories.deletedCount} old dummy categories.`);
  }

  // 2. Read products JSON
  const jsonPath = path.resolve(__dirname, '../public/wadaq-products.json');
  const rawProducts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`[Seed] Read ${rawProducts.length} products from ${jsonPath}`);

  const usedArSlugs = new Set();
  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < rawProducts.length; i++) {
    const item = rawProducts[i];
    const catDoc = categoryMap.get(item.category);
    if (!catDoc) {
      console.warn(`[Seed] Unknown category '${item.category}' for item ${item.id}`);
      continue;
    }

    // Determine unique Arabic slug
    let baseArSlug = generateSlug(item.name);
    let finalArSlug = baseArSlug;
    let suffix = 1;
    while (usedArSlugs.has(finalArSlug)) {
      finalArSlug = `${baseArSlug}-${suffix++}`;
    }
    usedArSlugs.add(finalArSlug);

    const enSlug = item.id;
    const enName = formatEnglishTitle(item.id);

    const price = item.price && item.price > 0 ? item.price : 450;
    const oldPrice = item.oldPrice && item.oldPrice > price
      ? item.oldPrice
      : item.discount
      ? Math.round(price / 0.7)
      : undefined;

    // Specs
    const specs = [];
    if (item.clinicalIndications && item.clinicalIndications.length > 0) {
      specs.push({
        label: { ar: 'دواعي الاستخدام والتأهيل الحسي', en: 'Clinical Indications' },
        value: {
          ar: item.clinicalIndications.join('، '),
          en: item.clinicalIndications.join(', '),
        },
      });
    }

    if (item.specs) {
      for (const [k, v] of Object.entries(item.specs)) {
        specs.push({
          label: { ar: k, en: k },
          value: { ar: String(v), en: String(v) },
        });
      }
    }

    if (item.discount) {
      specs.push({
        label: { ar: 'العرض الترويجي', en: 'Special Promotion' },
        value: { ar: `خصم ${item.discount}`, en: `Discount ${item.discount}` },
      });
    }

    const fullDescAr = [
      item.description,
      item.clinicalIndications && item.clinicalIndications.length > 0
        ? `\n\nدواعي الاستخدام وأهداف التكامل الحسي:\n• ${item.clinicalIndications.join('\n• ')}`
        : '',
      '\n\nمنتج معتمد للاستخدام في مراكز التأهيل الحسي، عيادات العلاج الوظيفي، والبيئات التعليمية والمنازل.',
    ]
      .filter(Boolean)
      .join('');

    const fullDescEn = [
      `Specialized sensory integration equipment for clinical and home occupational therapy.`,
      item.clinicalIndications && item.clinicalIndications.length > 0
        ? `\n\nClinical Indications:\n• ${item.clinicalIndications.join('\n• ')}`
        : '',
    ]
      .filter(Boolean)
      .join('');

    const imageUrl = item.images && item.images.length > 0 && item.images[0].url
      ? item.images[0].url
      : `/images/products/${item.id}.webp`;

    // Make select items featured (approx 10 featured items)
    const isFeatured = i % 5 === 0;

    const docPayload = {
      name: {
        ar: item.name,
        en: enName,
      },
      slug: {
        ar: finalArSlug,
        en: enSlug,
      },
      shortDescription: {
        ar: item.description,
        en: `High quality ${enName.toLowerCase()} designed for sensory integration and physical therapy.`,
      },
      description: {
        ar: fullDescAr,
        en: fullDescEn,
      },
      price,
      oldPrice,
      images: [
        {
          url: imageUrl,
          publicId: '',
          alt: {
            ar: item.name,
            en: enName,
          },
        },
      ],
      category: catDoc._id,
      specs,
      sensorySystem: {
        ar: item.categoryNameAr,
        en: CATEGORY_DEFINITIONS[item.category].name.en,
      },
      ageRange: {
        ar: 'مناسب لجميع الأعمار (أطفال وبالغين)',
        en: 'Suitable for all ages',
      },
      inStock: true,
      isFeatured,
      isActive: true,
      isDeleted: false,
      seo: {
        title: {
          ar: `${item.name} | متجر ودق للتكامل الحسي`,
          en: `${enName} | Wadaq Sensory Store`,
        },
        description: {
          ar: item.description,
          en: `High quality ${enName.toLowerCase()} designed for sensory integration and physical therapy.`,
        },
      },
    };

    const existingProduct = await Product.findOne({ 'slug.en': enSlug });
    if (existingProduct) {
      await Product.findByIdAndUpdate(existingProduct._id, docPayload);
      updatedCount++;
    } else {
      await Product.create(docPayload);
      createdCount++;
    }
  }

  const totalActive = await Product.countDocuments({ isDeleted: false });
  console.log(`[Seed] Products seeding completed successfully:`);
  console.log(`  - Newly Created: ${createdCount}`);
  console.log(`  - Updated: ${updatedCount}`);
  console.log(`  - Total Active in MongoDB: ${totalActive}`);

  await mongoose.disconnect();
  console.log('[Seed] Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed] Error during seeding:', err);
  process.exit(1);
});
