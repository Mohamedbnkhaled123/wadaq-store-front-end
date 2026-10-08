export interface LocalizedString {
  ar: string;
  en: string;
}

export interface ImageItem {
  url: string;
  publicId?: string;
  alt?: LocalizedString;
}

export interface SpecItem {
  label: LocalizedString;
  value: LocalizedString;
}

export interface SeoData {
  title?: LocalizedString;
  description?: LocalizedString;
}

export interface Category {
  _id: string;
  name: LocalizedString;
  slug: LocalizedString;
  description?: LocalizedString;
  image?: ImageItem;
  order: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  id?: string;
  name: LocalizedString;
  slug: LocalizedString;
  shortDescription: LocalizedString;
  description: LocalizedString;
  price: number;
  oldPrice?: number;
  images: ImageItem[];
  category: Category | string;
  specs: SpecItem[];
  sensorySystem?: LocalizedString;
  ageRange?: LocalizedString;
  inStock: boolean;
  isFeatured: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  seo?: SeoData;
  // Computed fields from API for view
  isAvailable?: boolean;
  statusReason?: 'deleted' | 'inactive' | 'out_of_stock' | null;
  statusMessage?: LocalizedString | null;
  createdAt: string;
  updatedAt: string;
}

export interface PackageItemRef {
  product: Product;
  quantity: number;
}

export interface Package {
  _id: string;
  name: LocalizedString;
  slug: LocalizedString;
  tier: 'basic' | 'standard' | 'premium';
  shortDescription: LocalizedString;
  description: LocalizedString;
  roomSize?: LocalizedString;
  items: PackageItemRef[];
  price: number;
  oldPrice?: number;
  images: ImageItem[];
  isFeatured: boolean;
  isActive: boolean;
  isDeleted: boolean;
  seo?: SeoData;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  title: LocalizedString;
  slug: LocalizedString;
  clientName?: LocalizedString;
  location?: LocalizedString;
  description: LocalizedString;
  images: ImageItem[];
  relatedPackage?: Package | string;
  completedAt?: string;
  isActive: boolean;
  isDeleted: boolean;
  seo?: SeoData;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
}

export interface HeroCMS {
  image?: string;
  title: LocalizedString;
  subtitle: LocalizedString;
  ctaPrimary: LocalizedString;
  ctaSecondary: LocalizedString;
}

export interface AboutCMS {
  image?: string;
  title: LocalizedString;
  content: LocalizedString;
  mission: LocalizedString;
  vision: LocalizedString;
}

export interface StatItem {
  label: LocalizedString;
  value: string;
}

export interface CustomProductCtaCMS {
  image?: string;
  title: LocalizedString;
  description: LocalizedString;
  buttonText: LocalizedString;
}

export interface AiTopicCardCMS {
  _id?: string;
  iconType: string;
  title: LocalizedString;
  description: LocalizedString;
  promptText: LocalizedString;
}

export interface AiConsultantSettings {
  suggestions: {
    ar: string[];
    en: string[];
  };
  topicCards: AiTopicCardCMS[];
}

export interface Settings {
  _id?: string;
  logo?: string;
  whatsappNumber: string;
  phone: string;
  email: string;
  address: LocalizedString;
  currency: string;
  shippingNote: LocalizedString;
  freeShippingThreshold?: number;
  social: SocialLinks;
  hero: HeroCMS;
  about: AboutCMS;
  stats: StatItem[];
  customProductCta: CustomProductCtaCMS;
  aiConsultant?: AiConsultantSettings;
  showPackagesSection?: boolean;
  showProjectsSection?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}
