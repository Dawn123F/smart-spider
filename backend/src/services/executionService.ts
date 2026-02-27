import axios from 'axios';
import * as cheerio from 'cheerio';
import { FlowNode, FlowEdge, ExecutionContext, ExecutionResult, LogEntry } from '../types';

export class ExecutionService {
  async executeFlow(
    nodes: FlowNode[],
    edges: FlowEdge[],
    onLog?: (log: LogEntry) => void
  ): Promise<ExecutionResult> {
    const context: ExecutionContext = {
      variables: {},
      results: [],
      logs: [],
    };

    const log = (level: LogEntry['level'], message: string, nodeId?: string) => {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        nodeId,
      };
      context.logs.push(entry);
      if (onLog) onLog(entry);
    };

    try {
      // Build adjacency map
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const outEdges = new Map<string, FlowEdge[]>();
      for (const edge of edges) {
        if (!outEdges.has(edge.source)) outEdges.set(edge.source, []);
        outEdges.get(edge.source)!.push(edge);
      }

      // Find start node
      const startNode = nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error('No start node found in flow');
      }

      log('info', 'Starting flow execution');
      await this.executeNode(startNode, nodeMap, outEdges, context, log);
      log('info', `Flow execution completed. Collected ${context.results.length} result(s)`);

      return {
        success: true,
        data: context.results,
        logs: context.logs,
      };
    } catch (error: any) {
      log('error', `Flow execution failed: ${error.message}`);
      return {
        success: false,
        data: context.results,
        logs: context.logs,
        error: error.message,
      };
    }
  }

  private async executeNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    log('info', `Executing node: ${node.label} (${node.type})`, node.id);

    switch (node.type) {
      case 'start':
        await this.executeNextNodes(node, nodeMap, outEdges, context, log);
        break;

      case 'fetch':
        await this.executeFetchNode(node, nodeMap, outEdges, context, log);
        break;

      case 'extract':
        await this.executeExtractNode(node, nodeMap, outEdges, context, log);
        break;

      case 'loop':
        await this.executeLoopNode(node, nodeMap, outEdges, context, log);
        break;

      case 'condition':
        await this.executeConditionNode(node, nodeMap, outEdges, context, log);
        break;

      case 'variable':
        await this.executeVariableNode(node, nodeMap, outEdges, context, log);
        break;

      case 'output':
        await this.executeOutputNode(node, nodeMap, outEdges, context, log);
        break;

      case 'video_extract':
        await this.executeVideoExtractNode(node, nodeMap, outEdges, context, log);
        break;

      case 'anti_crawl':
        await this.executeAntiCrawlNode(node, nodeMap, outEdges, context, log);
        break;

      case 'end':
        log('info', 'Reached end node', node.id);
        break;

      default:
        log('warn', `Unknown node type: ${node.type}`, node.id);
        await this.executeNextNodes(node, nodeMap, outEdges, context, log);
    }
  }

  private async executeFetchNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const data = node.data;
    const url = this.resolveExpression(data.url || '', context.variables);
    const method = data.method || 'GET';

    if (!url) {
      log('error', 'Fetch node: URL is empty', node.id);
      return;
    }

    // Determine User-Agent
    const userAgent = data.userAgent ||
      context.variables['__currentUA'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const retries = data.retries || 0;
    const retryDelay = data.retryDelay || 1000;

    log('info', `Fetching: ${method} ${url}${data.proxy ? ' (via proxy)' : ''}`, node.id);

    const doFetch = async () => {
      const axiosConfig: any = {
        method: method.toLowerCase(),
        url,
        timeout: data.timeout || 10000,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          ...(data.headers || {}),
        },
        params: data.params,
        data: data.body,
        maxRedirects: data.followRedirects !== false ? 5 : 0,
        validateStatus: () => true,
      };

      if (data.proxy) {
        try {
          const proxyUrl = new URL(data.proxy);
          axiosConfig.proxy = {
            protocol: proxyUrl.protocol.replace(':', ''),
            host: proxyUrl.hostname,
            port: parseInt(proxyUrl.port),
            auth: proxyUrl.username ? { username: proxyUrl.username, password: proxyUrl.password } : undefined,
          };
        } catch {}
      }

      return axios(axiosConfig);
    };

    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          log('info', `Retry attempt ${attempt}/${retries}...`, node.id);
          await new Promise(r => setTimeout(r, retryDelay));
        }

        const response = await doFetch();
        const $ = cheerio.load(response.data);

        context.variables['resp'] = {
          html: response.data,
          json: (() => { try { return JSON.parse(response.data); } catch { return null; } })(),
          statusCode: response.status,
          headers: response.headers,
          url,
          title: $('title').text(),
          $,
        };

        log('info', `Fetched successfully (status: ${response.status}, UA: ${userAgent.substring(0, 40)}...)`, node.id);
        await this.executeNextNodes(node, nodeMap, outEdges, context, log);
        return;
      } catch (error: any) {
        lastError = error;
        log('warn', `Fetch attempt ${attempt + 1} failed: ${error.message}`, node.id);
      }
    }

    log('error', `Fetch failed after ${retries + 1} attempt(s): ${lastError?.message}`, node.id);
    context.variables['ex'] = lastError;
  }

  private async executeVideoExtractNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const data = node.data;
    const resp = context.variables['resp'];
    const outputVar = data.outputVar || 'videoUrl';
    const extractType = data.extractType || 'auto';

    if (!resp) {
      log('error', 'Video extract node: No response available', node.id);
      return;
    }

    log('info', `Extracting video links (type: ${extractType})`, node.id);

    try {
      const html: string = resp.html || '';
      const $ = resp.$;
      const videoLinks: string[] = [];

      if (extractType === 'auto' || extractType === 'm3u8') {
        // Extract m3u8 links from HTML
        const m3u8Regex = /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/gi;
        let match;
        while ((match = m3u8Regex.exec(html)) !== null) {
          if (!videoLinks.includes(match[0])) videoLinks.push(match[0]);
        }
        // Also check src attributes
        if ($) {
          $('source[src*=".m3u8"], video[src*=".m3u8"]').each((_: number, el: any) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && !videoLinks.includes(src)) videoLinks.push(src);
          });
        }
      }

      if (extractType === 'auto' || extractType === 'mp4') {
        // Extract mp4 links
        const mp4Regex = /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi;
        let match;
        while ((match = mp4Regex.exec(html)) !== null) {
          if (!videoLinks.includes(match[0])) videoLinks.push(match[0]);
        }
        if ($) {
          $('source[src*=".mp4"], video[src*=".mp4"]').each((_: number, el: any) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && !videoLinks.includes(src)) videoLinks.push(src);
          });
        }
      }

      if (extractType === 'auto' || extractType === 'iframe') {
        // Extract video from iframes
        if ($) {
          $('iframe[src]').each((_: number, el: any) => {
            const src = $(el).attr('src') || '';
            if (src && (src.includes('youtube') || src.includes('vimeo') || src.includes('bilibili') || src.includes('player'))) {
              if (!videoLinks.includes(src)) videoLinks.push(src);
            }
          });
        }
      }

      // Custom selectors
      if (data.selectors && data.selectors.length > 0 && $) {
        for (const sel of data.selectors) {
          $(sel).each((_: number, el: any) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('href') || '';
            if (src && !videoLinks.includes(src)) videoLinks.push(src);
          });
        }
      }

      context.variables[outputVar] = videoLinks.length === 1 ? videoLinks[0] : videoLinks;
      log('info', `Found ${videoLinks.length} video link(s) in variable "${outputVar}"`, node.id);
      if (videoLinks.length > 0) {
        videoLinks.forEach((link, i) => log('info', `  Video ${i + 1}: ${link.substring(0, 80)}`, node.id));
      }

      await this.executeNextNodes(node, nodeMap, outEdges, context, log);
    } catch (error: any) {
      log('error', `Video extract failed: ${error.message}`, node.id);
    }
  }

  private async executeAntiCrawlNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const data = node.data;
    const strategy = data.strategy || 'delay';

    if (strategy === 'delay' || strategy === 'combined') {
      const min = data.delayMin || 1000;
      const max = data.delayMax || 3000;
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;
      log('info', `Anti-crawl: Random delay ${delay}ms (${min}-${max}ms)`, node.id);
      await new Promise(r => setTimeout(r, delay));
    }

    if (strategy === 'rotate_ua' || strategy === 'combined') {
      const userAgents = data.userAgents || [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ];
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      context.variables['__currentUA'] = ua;
      log('info', `Anti-crawl: Rotated UA to: ${ua.substring(0, 60)}...`, node.id);
    }

    if (strategy === 'cookie') {
      if (data.cookieStr) {
        if (!context.variables['__cookies']) context.variables['__cookies'] = {};
        // Parse cookie string into object
        data.cookieStr.split(';').forEach((pair: string) => {
          const [k, v] = pair.trim().split('=');
          if (k) context.variables['__cookies'][k.trim()] = v?.trim() || '';
        });
        log('info', `Anti-crawl: Injected ${Object.keys(context.variables['__cookies']).length} cookies`, node.id);
      }
    }

    await this.executeNextNodes(node, nodeMap, outEdges, context, log);
  }
  private async executeExtractNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const data = node.data;
    const resp = context.variables['resp'];
    if (!resp) {
      log('error', 'Extract node: No response available (resp is undefined)', node.id);
      return;
    }

    const selector = this.resolveExpression(data.selector || '', context.variables);
    const selectorType = data.selectorType || 'css';
    const outputVar = data.outputVar || 'extracted';
    const multiple = data.multiple !== false;
    const attribute = data.attribute || 'text';

    log('info', `Extracting with ${selectorType}: ${selector}`, node.id);

    try {
      let results: string[] = [];

      if (selectorType === 'css' || selectorType === 'xpath') {
        const $ = resp.$;
        if ($) {
          $(selector).each((_: number, el: any) => {
            const $el = $(el);
            let value = '';
            if (attribute === 'text') {
              value = $el.text().trim();
            } else if (attribute === 'html') {
              value = $el.html() || '';
            } else {
              value = $el.attr(attribute) || '';
            }
            results.push(value);
          });
        }
      } else if (selectorType === 'regex') {
        const html = resp.html || '';
        const regex = new RegExp(selector, 'g');
        let match;
        while ((match = regex.exec(html)) !== null) {
          results.push(match[1] || match[0]);
        }
      } else if (selectorType === 'jsonpath') {
        const json = resp.json;
        if (json) {
          // Simple jsonpath: support $.key.subkey and $.key[*].subkey
          results = this.simpleJsonPath(json, selector);
        }
      }

      const extracted = multiple ? results : (results[0] || '');
      context.variables[outputVar] = extracted;
      log('info', `Extracted ${multiple ? results.length + ' items' : '1 item'} into variable "${outputVar}"`, node.id);

      await this.executeNextNodes(node, nodeMap, outEdges, context, log);
    } catch (error: any) {
      log('error', `Extract failed: ${error.message}`, node.id);
      context.variables['ex'] = error;
    }
  }

  private async executeLoopNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const data = node.data;
    const sourceExpr = data.source || '';
    const itemVar = data.itemVar || 'item';
    const indexVar = data.indexVar || 'index';

    const source = this.resolveExpression(sourceExpr, context.variables);
    let items: any[] = [];

    if (Array.isArray(source)) {
      items = source;
    } else if (typeof source === 'number') {
      items = Array.from({ length: source }, (_, i) => i);
    } else if (typeof source === 'string') {
      try {
        items = JSON.parse(source);
      } catch {
        items = [source];
      }
    }

    log('info', `Looping over ${items.length} items`, node.id);

    for (let i = 0; i < items.length; i++) {
      context.variables[itemVar] = items[i];
      context.variables[indexVar] = i;
      await this.executeNextNodes(node, nodeMap, outEdges, context, log);
    }
  }

  private async executeConditionNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const data = node.data;
    const expression = data.expression || 'true';

    let result = false;
    try {
      const fn = new Function(...Object.keys(context.variables), `return !!(${expression})`);
      result = fn(...Object.values(context.variables));
    } catch (e: any) {
      log('error', `Condition evaluation failed: ${e.message}`, node.id);
    }

    log('info', `Condition "${expression}" evaluated to: ${result}`, node.id);

    const edges = outEdges.get(node.id) || [];
    for (const edge of edges) {
      const isTrue = edge.sourceHandle === 'true' || edge.label === 'true' || edge.label === 'yes';
      const isFalse = edge.sourceHandle === 'false' || edge.label === 'false' || edge.label === 'no';

      if ((result && (isTrue || (!isTrue && !isFalse))) || (!result && isFalse)) {
        const nextNode = nodeMap.get(edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, nodeMap, outEdges, context, log);
        }
      }
    }
  }

  private async executeVariableNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const data = node.data;
    const name = data.name || '';
    const value = this.resolveExpression(data.value || '', context.variables);

    if (name) {
      context.variables[name] = value;
      log('info', `Set variable "${name}" = ${JSON.stringify(value)}`, node.id);
    }

    await this.executeNextNodes(node, nodeMap, outEdges, context, log);
  }

  private async executeOutputNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const data = node.data;
    const items = data.items || [];

    const record: Record<string, any> = {};
    for (const item of items) {
      record[item.name] = this.resolveExpression(item.value, context.variables);
    }

    context.results.push(record);
    log('info', `Output: ${JSON.stringify(record)}`, node.id);

    await this.executeNextNodes(node, nodeMap, outEdges, context, log);
  }

  private async executeNextNodes(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
    context: ExecutionContext,
    log: (level: LogEntry['level'], message: string, nodeId?: string) => void
  ): Promise<void> {
    const edges = outEdges.get(node.id) || [];
    for (const edge of edges) {
      const nextNode = nodeMap.get(edge.target);
      if (nextNode) {
        await this.executeNode(nextNode, nodeMap, outEdges, context, log);
      }
    }
  }

  private resolveExpression(expr: string, variables: Record<string, any>): any {
    if (!expr) return expr;

    // Replace ${varName} or ${varName.prop} expressions
    const interpolated = expr.replace(/\$\{([^}]+)\}/g, (_, path) => {
      try {
        const fn = new Function(...Object.keys(variables), `return ${path}`);
        const result = fn(...Object.values(variables));
        return result !== undefined ? String(result) : '';
      } catch {
        return '';
      }
    });

    // If the whole expression is a variable reference, return the actual value
    if (expr.startsWith('${') && expr.endsWith('}') && expr.indexOf('${', 1) === -1) {
      const path = expr.slice(2, -1);
      try {
        const fn = new Function(...Object.keys(variables), `return ${path}`);
        return fn(...Object.values(variables));
      } catch {
        return '';
      }
    }

    return interpolated;
  }

  private simpleJsonPath(json: any, path: string): string[] {
    const results: string[] = [];
    const parts = path.replace(/^\$\.?/, '').split('.');

    const traverse = (obj: any, parts: string[]): void => {
      if (parts.length === 0) {
        if (Array.isArray(obj)) {
          obj.forEach(item => results.push(String(item)));
        } else {
          results.push(String(obj));
        }
        return;
      }

      const [head, ...rest] = parts;
      if (head === '*' || head === '[*]') {
        if (Array.isArray(obj)) {
          obj.forEach(item => traverse(item, rest));
        }
      } else if (obj && typeof obj === 'object') {
        traverse(obj[head], rest);
      }
    };

    traverse(json, parts);
    return results;
  }
}

export const executionService = new ExecutionService();
