import { inject, Injectable } from '@angular/core';
import { Product, Package, CartItem, Settings } from '../models/models';
import { SettingsService } from './settings.service';
import { LanguageCode } from './language.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private settingsService = inject(SettingsService);

  private getWhatsAppNumber(): string {
    const rawNumber = this.settingsService.settings()?.whatsappNumber || '201000000000';
    return rawNumber.replace(/[^\d]/g, '');
  }

  private getCurrency(settings?: Settings | null): string {
    return settings?.currency || 'ج.م';
  }

  /**
   * Generates WhatsApp order link for a SINGLE product:
   * includes product name, localized slug URL, high-res image, price, quantity,
   * and "+ مصاريف الشحن".
   */
  public buildSingleProductLink(product: Product, quantity = 1, lang: LanguageCode = 'ar'): string {
    const number = this.getWhatsAppNumber();
    const settings = this.settingsService.settings();
    const currency = this.getCurrency(settings);

    const name = product.name[lang] || product.name.ar;
    const slug = product.slug[lang] || product.slug.ar;
    const productUrl = `${environment.siteUrl}/${lang}/products/${encodeURIComponent(slug)}`;
    const imageUrl = product.images?.[0]?.url || `${environment.siteUrl}/images/logo.png`;
    const itemTotal = (product.price * quantity).toLocaleString();
    const shippingText = settings?.shippingNote?.[lang] || 'يضاف مصاريف الشحن حسب المحافظة وموقع التوصيل';

    let message = '';
    if (lang === 'ar') {
      message = [
        'مرحباً متجر ودق للتكامل الحسي، أود تأكيد شراء المنتج التالي:',
        '',
        `• اسم المنتج: ${name}`,
        `• رابط المنتج: ${productUrl}`,
        `• صورة المنتج: ${imageUrl}`,
        `• السعر للقطعة: ${product.price.toLocaleString()} ${currency}`,
        `• الكمية المطلوبة: ${quantity}`,
        '---------------------------------------',
        `• الإجمالي: ${itemTotal} ${currency} (+ ${shippingText})`,
        '',
        'برجاء تأكيد الطلب وحساب تكلفة الشحن وموعد الاستلام.',
      ].join('\n');
    } else {
      message = [
        'Hello Wadaq Sensory Store, I would like to order the following product:',
        '',
        `• Product: ${name}`,
        `• Link: ${productUrl}`,
        `• Image: ${imageUrl}`,
        `• Unit Price: ${product.price.toLocaleString()} ${currency}`,
        `• Quantity: ${quantity}`,
        '---------------------------------------',
        `• Total: ${itemTotal} ${currency} (+ ${shippingText})`,
        '',
        'Please confirm order availability and shipping schedule.',
      ].join('\n');
    }

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Generates WhatsApp order link for MULTIPLE products in Cart:
   * lists each product with quantity and price, calculates total, includes logo link,
   * and "+ مصاريف الشحن".
   */
  public buildCartLink(items: CartItem[], lang: LanguageCode = 'ar', customerNote = ''): string {
    const number = this.getWhatsAppNumber();
    const settings = this.settingsService.settings();
    const currency = this.getCurrency(settings);

    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      .toLocaleString();
    const logoUrl = `${environment.siteUrl}/images/logo.png`;
    const shippingText = settings?.shippingNote?.[lang] || 'يضاف مصاريف الشحن حسب المحافظة وموقع التوصيل';
    const noteText = customerNote.trim() ? (lang === 'ar' ? `• ملاحظات إضافية: ${customerNote.trim()}` : `• Additional Notes: ${customerNote.trim()}`) : '';

    let message = '';
    if (lang === 'ar') {
      const itemsList = items
        .map((item, index) => {
          const name = item.product.name[lang] || item.product.name.ar;
          const subtotal = (item.product.price * item.quantity).toLocaleString();
          return `${index + 1}. ${name} × ${item.quantity} (${subtotal} ${currency})`;
        })
        .join('\n');

      message = [
        'مرحباً متجر ودق للتكامل الحسي، أود تأكيد طلب سلة المنتجات التالية:',
        '',
        itemsList,
        '---------------------------------------',
        `• إجمالي عدد القطع: ${totalQty}`,
        `• إجمالي المنتجات: ${totalPrice} ${currency} (+ ${shippingText})`,
        noteText,
        `• متجر ودق: ${environment.siteUrl}/${lang}`,
        `• شعار المتجر: ${logoUrl}`,
        '',
        'برجاء مراجعة وتأكيد توفر المنتجات وحساب قيمة الشحن لتأكيد الطلب.',
      ].filter(Boolean).join('\n');
    } else {
      const itemsList = items
        .map((item, index) => {
          const name = item.product.name[lang] || item.product.name.en;
          const subtotal = (item.product.price * item.quantity).toLocaleString();
          return `${index + 1}. ${name} × ${item.quantity} (${subtotal} ${currency})`;
        })
        .join('\n');

      message = [
        'Hello Wadaq Sensory Store, I would like to confirm my shopping cart order:',
        '',
        itemsList,
        '---------------------------------------',
        `• Total Items: ${totalQty}`,
        `• Total Amount: ${totalPrice} ${currency} (+ ${shippingText})`,
        noteText,
        `• Store: ${environment.siteUrl}/${lang}`,
        `• Store Logo: ${logoUrl}`,
        '',
        'Please confirm product availability and calculate final shipping to proceed.',
      ].filter(Boolean).join('\n');
    }

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Generates WhatsApp link for Room Setup Packages.
   */
  public buildPackageLink(pkg: Package, lang: LanguageCode = 'ar'): string {
    const number = this.getWhatsAppNumber();
    const settings = this.settingsService.settings();
    const currency = this.getCurrency(settings);

    const name = pkg.name[lang] || pkg.name.ar;
    const slug = pkg.slug[lang] || pkg.slug.ar;
    const pkgUrl = `${environment.siteUrl}/${lang}/packages/${encodeURIComponent(slug)}`;
    const priceText = `${pkg.price.toLocaleString()} ${currency}`;
    const roomSize = pkg.roomSize ? (pkg.roomSize[lang] || pkg.roomSize.ar) : '';

    let message = '';
    if (lang === 'ar') {
      message = [
        'مرحباً ودق لتجهيز غرف ومراكز التكامل الحسي،',
        `أود الاستفسار وطلب عرض سعر لتنفيذ باقة: "${name}"`,
        `• رابط الباقة: ${pkgUrl}`,
        `• السعر التقديري: ${priceText}`,
        roomSize ? `• المساحة المقترحة: ${roomSize}` : '',
        '---------------------------------------',
        'برجاء التواصل معي لتنسيق المعاينة والمخطط الهندسي للمركز وتأكيد التجهيز.',
      ].filter(Boolean).join('\n');
    } else {
      message = [
        'Hello Wadaq Sensory Room Equipping,',
        `I would like to inquire about and request a quotation for: "${name}"`,
        `• Package Link: ${pkgUrl}`,
        `• Estimated Price: ${priceText}`,
        roomSize ? `• Suggested Area: ${roomSize}` : '',
        '---------------------------------------',
        'Please get in touch to coordinate space layout and setup consultation.',
      ].filter(Boolean).join('\n');
    }

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Custom product request via WhatsApp:
   * "و كمان لو المستخدم ملقاش المنتج اللي بيدور عليه ممكن يطلبه بشكل خاص علي رقم الواتس"
   */
  public buildCustomInquiryLink(customNote = '', lang: LanguageCode = 'ar'): string {
    const number = this.getWhatsAppNumber();
    let message = '';

    if (lang === 'ar') {
      message = [
        'مرحباً متجر ودق للتكامل الحسي،',
        'أبحث عن أداة حسية / جهاز تأهيلي بمواصفات ومقاسات خاصة لم أجدها في المتجر:',
        customNote ? `\nالتفاصيل المطلوبة:\n${customNote}` : '\n[يرجى كتابة تفاصيل أو مقاسات الأداة المطلوبة هنا]',
        '\nهل يمكنكم تصنيعها أو توفيرها لمركزي؟',
      ].join('\n');
    } else {
      message = [
        'Hello Wadaq Sensory Store,',
        'I am looking for a customized sensory therapy tool / equipment not currently listed in the store:',
        customNote ? `\nRequested Details:\n${customNote}` : '\n[Please specify the tool dimensions and clinical requirements here]',
        '\nCan you manufacture or source this for our clinical facility?',
      ].join('\n');
    }

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
}
