import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'chatMessageFormatter',
  standalone: true,
  pure: true,
})
export class ChatMessageFormatterPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(rawText: string | null | undefined): SafeHtml {
    if (!rawText) return '';

    // Strip internal slug tags completely and aggressively
    const cleaned = rawText
      .replace(/\[?\s*RECOMMENDED_SLUGS?.*$/gis, '')
      .replace(/\[?\s*RECOMMEND[A-Z_]*.*$/gis, '')
      .replace(/\[?\s*RECOMMENDED_SLUGS?:?[^\]\n]*\]?/gi, '')
      .replace(/RECOMMENDED_SLUGS?:?[^\n]*/gi, '')
      .replace(/\[?\s*RECOMMENDED_SLUG[^\n\]]*\]?/gi, '')
      .replace(/\[\s*$/g, '')
      .trim();

    // Escape HTML special characters to prevent XSS
    const escaped = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lines = escaped.split('\n');
    const resultParts: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (!line) {
        resultParts.push('<div class="msg-line-gap"></div>');
        continue;
      }

      // Convert Bold **text** -> <strong class="msg-bold">text</strong>
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="msg-bold">$1</strong>');
      // Clean single asterisks used for italics
      line = line.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');

      // Headings: ### or ####
      if (/^#{3,5}\s+(.*)/.test(line)) {
        const headingText = line.replace(/^#{3,5}\s+/, '');
        resultParts.push(`<h4 class="msg-section-heading">${headingText}</h4>`);
        continue;
      }

      // Main Headings: # or ##
      if (/^#{1,2}\s+(.*)/.test(line)) {
        const headingText = line.replace(/^#{1,2}\s+/, '');
        resultParts.push(`<h3 class="msg-main-heading">${headingText}</h3>`);
        continue;
      }

      // Numbered List: 1. or 2.
      const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
      if (numMatch) {
        const num = numMatch[1];
        const body = numMatch[2];
        resultParts.push(
          `<div class="msg-list-item"><span class="msg-num-badge">${num}</span><div class="msg-item-body">${body}</div></div>`
        );
        continue;
      }

      // Sub-letter List: أ. or ب. or ج. or a. or b.
      const subMatch = line.match(/^([أ-يa-zA-Z])[\.\)]\s+(.*)/);
      if (subMatch) {
        const letter = subMatch[1];
        const body = subMatch[2];
        resultParts.push(
          `<div class="msg-sublist-item"><span class="msg-sub-badge">${letter}</span><div class="msg-item-body">${body}</div></div>`
        );
        continue;
      }

      // Bullet items: * or - or •
      const bulletMatch = line.match(/^[\*\-•]\s+(.*)/);
      if (bulletMatch) {
        const body = bulletMatch[1];
        resultParts.push(
          `<div class="msg-bullet-item"><span class="msg-bullet-dot"></span><div class="msg-item-body">${body}</div></div>`
        );
        continue;
      }

      // Regular paragraph line
      resultParts.push(`<p class="msg-paragraph">${line}</p>`);
    }

    const htmlString = resultParts.join('');
    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }
}
