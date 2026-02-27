export interface FlowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface SpiderFlow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionContext {
  variables: Record<string, any>;
  results: any[];
  logs: LogEntry[];
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  nodeId?: string;
}

export interface ExecutionResult {
  success: boolean;
  data: any[];
  logs: LogEntry[];
  error?: string;
}

// Node type definitions
export type NodeType =
  | 'start'
  | 'fetch'
  | 'extract'
  | 'video_extract'
  | 'anti_crawl'
  | 'loop'
  | 'condition'
  | 'variable'
  | 'output'
  | 'end';

export interface FetchNodeData {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
  timeout?: number;
  followRedirects?: boolean;
  encoding?: string;
  userAgent?: string;
  proxy?: string;
  retries?: number;
  retryDelay?: number;
}

export interface VideoExtractNodeData {
  url?: string;
  extractType: 'auto' | 'm3u8' | 'mp4' | 'iframe';
  outputVar: string;
  quality?: 'best' | 'worst' | '1080p' | '720p' | '480p' | '360p';
  extractFrom?: 'page' | 'direct';
  selectors?: string[];
}

export interface AntiCrawlNodeData {
  strategy: 'delay' | 'rotate_ua' | 'cookie' | 'combined';
  delayMin?: number;
  delayMax?: number;
  userAgents?: string[];
  cookieStr?: string;
}

export interface ExtractNodeData {
  selector: string;
  selectorType: 'css' | 'xpath' | 'regex' | 'jsonpath';
  attribute?: string;
  multiple?: boolean;
  outputVar: string;
}

export interface LoopNodeData {
  source: string;
  itemVar: string;
  indexVar?: string;
}

export interface ConditionNodeData {
  expression: string;
}

export interface VariableNodeData {
  name: string;
  value: string;
}

export interface OutputNodeData {
  items: Array<{ name: string; value: string }>;
  saveToFile?: boolean;
  filePath?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  flowContext?: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    selectedUrl?: string;
    selectedElements?: string[];
  };
}
