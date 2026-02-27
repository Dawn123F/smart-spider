import axios from 'axios'
import type { SpiderFlow, FlowNode, FlowEdge, AIMessage, FlowTemplate } from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// Flow API
export const flowApi = {
  list: () => api.get<{ success: boolean; data: SpiderFlow[] }>('/flows'),
  get: (id: string) => api.get<{ success: boolean; data: SpiderFlow }>(`/flows/${id}`),
  create: (data: Partial<SpiderFlow>) => api.post<{ success: boolean; data: SpiderFlow }>('/flows', data),
  update: (id: string, data: Partial<SpiderFlow>) =>
    api.put<{ success: boolean; data: SpiderFlow }>(`/flows/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/flows/${id}`),
  run: (id: string) => api.post<{ success: boolean; data: any }>(`/flows/${id}/run`),
  runPreview: (nodes: FlowNode[], edges: FlowEdge[]) =>
    api.post<{ success: boolean; data: any }>('/flows/run/preview', { nodes, edges }),
}

// Proxy API
export const proxyApi = {
  fetch: (url: string) =>
    api.post<{ success: boolean; data: { html: string; title: string; url: string; statusCode: number } }>(
      '/proxy/fetch',
      { url }
    ),
  extract: (url: string, selector: string) =>
    api.post<{ success: boolean; data: any[] }>('/proxy/extract', { url, selector }),
}

export interface SelectedElementDetail {
  selector: string
  tagName: string
  text: string
  attrs: Record<string, string>
  outerHTML: string
}

// AI API
export const aiApi = {
  chat: (
    messages: AIMessage[],
    flowContext?: {
      nodes: FlowNode[]
      edges: FlowEdge[]
      selectedUrl?: string
      selectedElements?: string[]
      selectedElementsDetail?: SelectedElementDetail[]
    }
  ) =>
    api.post<{ success: boolean; data: { content: string } }>('/ai/chat', {
      messages,
      flowContext,
    }),

  suggestSelector: (html: string, description: string) =>
    api.post<{ success: boolean; data: { selector: string; explanation: string } }>(
      '/ai/suggest-selector',
      { html, description }
    ),

  getTemplates: () =>
    api.get<{ success: boolean; data: Record<string, FlowTemplate> }>('/ai/templates'),

  generateFromTemplate: (templateKey: string, url?: string, elements?: SelectedElementDetail[]) =>
    api.post<{ success: boolean; data: { nodes: FlowNode[]; edges: FlowEdge[]; description: string } }>(
      '/ai/generate-from-template',
      { templateKey, url, elements }
    ),

  analyzeAntiCrawl: (url: string, errorInfo?: string) =>
    api.post<{
      success: boolean
      data: { strategies: string[]; recommendations: string; suggestedNodes: any[] }
    }>('/ai/analyze-anti-crawl', { url, errorInfo }),

  generateFromSelection: (url: string, elements: SelectedElementDetail[]) =>
    api.post<{ success: boolean; data: { nodes: FlowNode[]; edges: FlowEdge[]; description: string } }>(
      '/ai/generate-from-selection',
      { url, elements }
    ),
}

export default api
