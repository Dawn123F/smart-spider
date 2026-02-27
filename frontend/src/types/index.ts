export interface FlowNode {
  id: string
  type: string
  label: string
  position: { x: number; y: number }
  data: Record<string, any>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface SpiderFlow {
  id: string
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  createdAt: string
  updatedAt: string
}

export interface ExecutionLog {
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  nodeId?: string
}

export interface ExecutionResult {
  success: boolean
  data: any[]
  logs: ExecutionLog[]
  error?: string
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface NodeTypeConfig {
  type: string
  label: string
  icon: string
  color: string
  description: string
  defaultData: Record<string, any>
  group?: string
}

export interface FlowTemplate {
  name: string
  description: string
  icon: string
}

export const NODE_TYPES: NodeTypeConfig[] = [
  {
    type: 'start',
    label: '开始',
    icon: 'VideoPlay',
    color: '#67C23A',
    description: '流程开始节点',
    defaultData: {},
    group: 'control',
  },
  {
    type: 'fetch',
    label: '爬取',
    icon: 'Download',
    color: '#409EFF',
    description: '发送 HTTP 请求获取网页',
    defaultData: {
      url: '',
      method: 'GET',
      timeout: 10000,
      followRedirects: true,
      retries: 0,
      retryDelay: 1000,
    },
    group: 'data',
  },
  {
    type: 'extract',
    label: '提取',
    icon: 'Scissor',
    color: '#E6A23C',
    description: '从网页中提取数据',
    defaultData: {
      selector: '',
      selectorType: 'css',
      attribute: 'text',
      multiple: true,
      outputVar: 'extracted',
    },
    group: 'data',
  },
  {
    type: 'video_extract',
    label: '视频提取',
    icon: 'VideoCamera',
    color: '#E040FB',
    description: '提取网页中的视频资源链接',
    defaultData: {
      extractType: 'auto',
      outputVar: 'videoUrl',
      quality: 'best',
      extractFrom: 'page',
    },
    group: 'data',
  },
  {
    type: 'anti_crawl',
    label: '反爬处理',
    icon: 'Lock',
    color: '#FF6D00',
    description: '处理反爬虫机制（延迟/UA轮换/Cookie）',
    defaultData: {
      strategy: 'delay',
      delayMin: 1000,
      delayMax: 3000,
    },
    group: 'control',
  },
  {
    type: 'loop',
    label: '循环',
    icon: 'Refresh',
    color: '#909399',
    description: '遍历列表数据',
    defaultData: {
      source: '${extracted}',
      itemVar: 'item',
      indexVar: 'index',
    },
    group: 'control',
  },
  {
    type: 'condition',
    label: '条件',
    icon: 'Switch',
    color: '#F56C6C',
    description: '根据条件分支执行',
    defaultData: {
      expression: 'true',
    },
    group: 'control',
  },
  {
    type: 'variable',
    label: '变量',
    icon: 'Edit',
    color: '#9B59B6',
    description: '定义或修改变量',
    defaultData: {
      name: 'myVar',
      value: '',
    },
    group: 'data',
  },
  {
    type: 'output',
    label: '输出',
    icon: 'Document',
    color: '#1ABC9C',
    description: '收集并输出结果',
    defaultData: {
      items: [{ name: 'title', value: '${item}' }],
      format: 'json',
    },
    group: 'data',
  },
  {
    type: 'end',
    label: '结束',
    icon: 'CircleClose',
    color: '#F56C6C',
    description: '流程结束节点',
    defaultData: {},
    group: 'control',
  },
]

export const NODE_TYPE_MAP = new Map(NODE_TYPES.map(t => [t.type, t]))
