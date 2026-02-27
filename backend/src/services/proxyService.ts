import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ProxyResult {
  html: string;
  title: string;
  url: string;
  statusCode: number;
}

export class ProxyService {
  async fetchPage(url: string): Promise<ProxyResult> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
        },
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);
      const title = $('title').text() || url;

      // Rewrite URLs to be absolute
      const rewrittenHtml = this.rewriteUrls(html, url);

      return {
        html: rewrittenHtml,
        title,
        url,
        statusCode: response.status,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch page: ${error.message}`);
    }
  }

  private rewriteUrls(html: string, baseUrl: string): string {
    const $ = cheerio.load(html);
    const base = new URL(baseUrl);

    // Rewrite relative URLs to absolute
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          $(el).attr('href', new URL(href, base).toString());
        } catch {}
      }
    });

    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
        try {
          $(el).attr('src', new URL(src, base).toString());
        } catch {}
      }
    });

    $('link[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('data:')) {
        try {
          $(el).attr('href', new URL(href, base).toString());
        } catch {}
      }
    });

    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//')) {
        try {
          $(el).attr('src', new URL(src, base).toString());
        } catch {}
      }
    });

    return $.html();
  }

  async extractElements(url: string, selector: string): Promise<any[]> {
    const result = await this.fetchPage(url);
    const $ = cheerio.load(result.html);
    const elements: any[] = [];

    $(selector).each((i, el) => {
      const $el = $(el);
      elements.push({
        index: i,
        text: $el.text().trim(),
        html: $el.html(),
        attrs: el.attribs,
        tagName: el.tagName,
      });
    });

    return elements;
  }
}

export const proxyService = new ProxyService();
