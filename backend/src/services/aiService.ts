import OpenAI from 'openai';
import { AIMessage, FlowNode, FlowEdge } from '../types';

const client = new OpenAI();

const SYSTEM_PROMPT = `你是"智蛛"AI助手，一个专业的网络爬虫流程设计专家。

你的核心能力：
1. 根据用户描述的爬取需求，生成完整的爬虫流程节点配置（含反爬虫策略）
2. 分析用户选择的网页元素，推荐合适的 CSS 选择器
3. 诊断和解决反爬虫问题（UA 检测、IP 封锁、验证码、JS 渲染、Cookie 验证等）
4. 优化已有的爬虫流程，提升成功率和效率
5. 支持视频资源爬取（m3u8、mp4、视频平台）

可用的节点类型：
- **start**: 开始节点（每个流程必须有且只有一个）
- **fetch**: 爬取节点，发送 HTTP 请求获取网页
  - data: { url, method, headers, params, timeout, followRedirects, body, proxy, retries, retryDelay, userAgent }
  - 反爬虫配置: userAgent(UA伪装), proxy(代理IP), retries(重试次数), retryDelay(重试延迟ms)
- **extract**: 提取节点，从网页中提取数据
  - data: { selector, selectorType(css/xpath/regex/jsonpath), attribute(text/html/href/src/data-src/...), multiple, outputVar }
- **video_extract**: 视频提取节点，专门用于提取视频资源
  - data: { url, extractType(auto/m3u8/mp4/iframe), outputVar, quality(best/worst/720p/1080p), extractFrom(page/direct) }
  - extractType: auto=自动检测, m3u8=HLS流, mp4=直接链接, iframe=内嵌视频
- **anti_crawl**: 反爬虫处理节点，处理各种反爬机制
  - data: { strategy(delay/rotate_ua/cookie/captcha_skip), delayMin, delayMax, userAgents(数组), cookieStr }
  - strategy: delay=随机延迟, rotate_ua=轮换UA, cookie=注入Cookie
- **loop**: 循环节点，遍历列表数据
  - data: { source, itemVar, indexVar }
- **condition**: 条件节点，根据条件分支执行
  - data: { expression }
- **variable**: 变量节点，定义或修改变量
  - data: { name, value }
- **output**: 输出节点，收集最终结果
  - data: { items: [{name, value}], format(json/csv/excel) }
- **end**: 结束节点

当用户要求生成流程时，请以 JSON 格式返回节点和边的配置，格式如下：
\`\`\`json
{
  "nodes": [
    {
      "id": "node_1",
      "type": "start",
      "label": "开始",
      "position": { "x": 100, "y": 200 },
      "data": {}
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ]
}
\`\`\`

节点位置建议（横向布局）：
- 开始节点：x=100, y=200
- 后续节点：每个节点 x 增加 220
- 分支节点：y 偏移 ±150
- 循环内的节点：y 偏移 150

反爬虫最佳实践：
- 普通网站：在 fetch 节点设置合适的 userAgent 和 headers
- 有频率限制：在 fetch 前加 anti_crawl 节点（delay 策略，随机延迟 1000-3000ms）
- IP 封锁：在 fetch 节点配置 proxy 字段
- 需要登录：在 fetch 节点 headers 中设置 Cookie
- JS 渲染页面：提示用户需要 Puppeteer/Playwright 支持

视频爬取最佳实践：
- 先用 fetch 节点获取页面
- 再用 video_extract 节点提取视频链接
- m3u8 流媒体：设置 extractType 为 m3u8
- 普通 mp4：设置 extractType 为 mp4 或 auto

请用中文回复，专业且详细，遇到反爬虫问题要给出具体解决方案。`;

// 预设流程模板
export const FLOW_TEMPLATES = {
  basic_list: {
    name: '基础列表爬取',
    description: '爬取网页中的列表数据（标题、链接等）',
    icon: '📋',
  },
  paginated: {
    name: '分页爬取',
    description: '自动翻页爬取多页数据',
    icon: '📄',
  },
  detail_pages: {
    name: '列表+详情页',
    description: '先爬列表，再进入每个详情页提取数据',
    icon: '🔗',
  },
  video_download: {
    name: '视频资源爬取',
    description: '提取网页中的视频链接（m3u8/mp4）',
    icon: '🎬',
  },
  anti_crawl_basic: {
    name: '反爬虫基础方案',
    description: '带 UA 伪装、随机延迟的爬取流程',
    icon: '🛡️',
  },
  api_json: {
    name: 'API 接口爬取',
    description: '爬取 JSON API 接口并提取字段',
    icon: '⚡',
  },
};

export class AIService {
  async chat(
    messages: AIMessage[],
    flowContext?: {
      nodes: FlowNode[];
      edges: FlowEdge[];
      selectedUrl?: string;
      selectedElements?: string[];
      selectedElementsDetail?: Array<{
        selector: string;
        tagName: string;
        text: string;
        attrs: Record<string, string>;
        outerHTML: string;
      }>;
    }
  ): Promise<string> {
    const systemMessages: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    if (flowContext) {
      let contextStr = '';
      if (flowContext.selectedUrl) {
        contextStr += `\n当前预览的网页URL: ${flowContext.selectedUrl}`;
      }
      if (flowContext.selectedElementsDetail && flowContext.selectedElementsDetail.length > 0) {
        contextStr += `\n用户在网页中选择了 ${flowContext.selectedElementsDetail.length} 个元素：`;
        flowContext.selectedElementsDetail.forEach((el, i) => {
          contextStr += `\n  元素${i + 1}: 标签=${el.tagName}, 选择器=${el.selector}, 文本="${el.text.substring(0, 50)}"`;
          if (el.attrs.href) contextStr += `, href=${el.attrs.href}`;
          if (el.attrs.src) contextStr += `, src=${el.attrs.src}`;
          if (el.attrs['data-src']) contextStr += `, data-src=${el.attrs['data-src']}`;
        });
      } else if (flowContext.selectedElements && flowContext.selectedElements.length > 0) {
        contextStr += `\n用户选择的网页元素:\n${flowContext.selectedElements.map(e => `- ${e}`).join('\n')}`;
      }
      if (flowContext.nodes.length > 0) {
        const nodeTypes = flowContext.nodes.map(n => `${n.type}(${n.label})`).join(', ');
        contextStr += `\n当前流程已有 ${flowContext.nodes.length} 个节点: ${nodeTypes}`;
        contextStr += `\n${flowContext.edges.length} 条连线`;
      }

      if (contextStr) {
        systemMessages.push({
          role: 'system',
          content: `当前上下文：${contextStr}`,
        });
      }
    }

    const allMessages = [...systemMessages, ...messages];

    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: allMessages as any,
      temperature: 0.7,
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '抱歉，AI 暂时无法响应，请稍后再试。';
  }

  async generateFlowFromTemplate(
    templateKey: string,
    url?: string,
    elements?: Array<{ selector: string; tagName: string; text: string; attrs: Record<string, string> }>
  ): Promise<{ nodes: FlowNode[]; edges: FlowEdge[]; description: string }> {
    const templatePrompts: Record<string, string> = {
      basic_list: `生成一个基础列表爬取流程。爬取网页中的列表数据（如标题、链接、图片等）。
${url ? `目标网址: ${url}` : ''}
${elements && elements.length > 0 ? `用户选择的元素: ${elements.map(e => `${e.selector}(${e.tagName})`).join(', ')}` : ''}
请生成包含: start → fetch → extract(列表项) → loop → output → end 的完整流程。`,

      paginated: `生成一个分页爬取流程，自动处理多页数据。
${url ? `目标网址: ${url}` : ''}
请生成包含翻页逻辑的完整流程: start → variable(初始URL) → fetch → extract(数据) → loop → output → extract(下一页) → condition(是否有下一页) → variable(更新URL) → 循环回fetch → end`,

      detail_pages: `生成一个"列表页+详情页"爬取流程。先爬取列表页获取所有详情页链接，再逐个访问详情页提取完整数据。
${url ? `目标网址: ${url}` : ''}
请生成完整流程: start → fetch(列表页) → extract(详情页链接列表) → loop(遍历链接) → fetch(详情页) → extract(详情数据) → output → end`,

      video_download: `生成一个视频资源爬取流程，提取网页中的视频链接（支持 m3u8 HLS 流和 mp4 直链）。
${url ? `目标网址: ${url}` : ''}
请生成包含 video_extract 节点的完整流程: start → fetch(网页) → video_extract(提取视频) → output(视频链接) → end
video_extract 节点的 data 配置: { extractType: "auto", outputVar: "videoUrl", quality: "best" }`,

      anti_crawl_basic: `生成一个带反爬虫策略的爬取流程，包含 UA 伪装、随机延迟。
${url ? `目标网址: ${url}` : ''}
请生成流程: start → anti_crawl(随机延迟+UA轮换) → fetch(带完整请求头) → extract → output → end
anti_crawl 节点配置: { strategy: "delay", delayMin: 1000, delayMax: 3000 }
fetch 节点需要设置完整的 headers (User-Agent, Referer, Accept-Language 等)`,

      api_json: `生成一个 API 接口爬取流程，请求 JSON 接口并用 JSONPath 提取数据。
${url ? `目标 API: ${url}` : ''}
请生成流程: start → fetch(API请求, 设置 Accept: application/json) → extract(JSONPath提取) → loop → output → end`,
    };

    const prompt = templatePrompts[templateKey] || `生成一个通用爬虫流程。${url ? `目标: ${url}` : ''}`;

    const response = await this.chat([{ role: 'user', content: prompt }]);

    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || '{}');
        if (parsed.nodes && parsed.edges) {
          return { ...parsed, description: response };
        }
      } catch {}
    }

    return { nodes: [], edges: [], description: response };
  }

  async analyzeAntiCrawl(
    url: string,
    errorInfo?: string
  ): Promise<{ strategies: string[]; recommendations: string; suggestedNodes: any[] }> {
    const prompt = `分析以下爬虫问题并给出反爬虫解决方案：

目标网址: ${url}
${errorInfo ? `遇到的问题: ${errorInfo}` : '请分析该网站可能的反爬虫机制'}

请提供：
1. 该网站可能使用的反爬虫技术列表
2. 具体的解决方案（包括需要添加哪些节点和配置）
3. 推荐的节点配置（JSON格式）

返回格式：
\`\`\`json
{
  "strategies": ["反爬虫技术1", "反爬虫技术2"],
  "recommendations": "详细建议",
  "suggestedNodes": [
    {
      "type": "anti_crawl",
      "label": "随机延迟",
      "data": { "strategy": "delay", "delayMin": 1000, "delayMax": 3000 }
    }
  ]
}
\`\`\``;

    const response = await this.chat([{ role: 'user', content: prompt }]);

    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || '{}');
      } catch {}
    }

    return {
      strategies: [],
      recommendations: response,
      suggestedNodes: [],
    };
  }

  async suggestSelector(
    html: string,
    description: string
  ): Promise<{ selector: string; explanation: string }> {
    const prompt = `根据以下网页 HTML 片段和用户描述，推荐最合适的 CSS 选择器。

用户描述: ${description}

HTML 片段:
${html.substring(0, 3000)}

请返回 JSON 格式：
{
  "selector": "CSS选择器",
  "explanation": "选择器说明"
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: '你是一个专业的网页爬虫工程师，擅长编写精准的 CSS 选择器。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '{}';
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}

    return {
      selector: '',
      explanation: content,
    };
  }

  async generateFlowFromSelection(
    url: string,
    elements: Array<{
      selector: string;
      tagName: string;
      text: string;
      attrs: Record<string, string>;
      outerHTML: string;
    }>
  ): Promise<{ nodes: FlowNode[]; edges: FlowEdge[]; description: string }> {
    const elementDesc = elements.map((el, i) => {
      let desc = `元素${i + 1}: 标签=${el.tagName}, 选择器="${el.selector}"`;
      if (el.text) desc += `, 文本="${el.text.substring(0, 50)}"`;
      if (el.attrs.href) desc += `, href="${el.attrs.href}"`;
      if (el.attrs.src) desc += `, src="${el.attrs.src}"`;
      if (el.attrs['data-src']) desc += `, data-src="${el.attrs['data-src']}"`;
      if (el.tagName === 'video' || el.tagName === 'source') desc += ' [视频元素]';
      return desc;
    }).join('\n');

    // 检测是否包含视频元素
    const hasVideo = elements.some(el =>
      el.tagName === 'video' || el.tagName === 'source' ||
      (el.attrs.src && (el.attrs.src.includes('.m3u8') || el.attrs.src.includes('.mp4'))) ||
      (el.attrs['data-src'] && (el.attrs['data-src'].includes('.m3u8') || el.attrs['data-src'].includes('.mp4')))
    );

    const prompt = `我在网页 ${url} 中选择了以下 ${elements.length} 个元素：
${elementDesc}

${hasVideo ? '注意：检测到视频相关元素，请在流程中使用 video_extract 节点。' : ''}

请帮我生成一个完整的爬虫流程，要求：
1. 爬取该网页（考虑是否需要反爬虫措施）
2. 精确提取这些元素的数据
3. 如果有多个同类元素，使用循环遍历
4. 输出结果
5. 给出选择器的优化建议

请以 JSON 格式返回完整的流程配置。`;

    const response = await this.chat([{ role: 'user', content: prompt }]);

    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || '{}');
        if (parsed.nodes && parsed.edges) {
          return { ...parsed, description: response };
        }
      } catch {}
    }

    return { nodes: [], edges: [], description: response };
  }
}

export const aiService = new AIService();
