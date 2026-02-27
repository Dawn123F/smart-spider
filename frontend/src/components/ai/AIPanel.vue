<template>
  <div class="ai-panel">
    <!-- Header -->
    <div class="ai-header">
      <div class="ai-title">
        <div class="ai-avatar">🤖</div>
        <div>
          <div class="ai-name">智蛛 AI 助手</div>
          <div class="ai-status">{{ isLoading ? '思考中...' : '在线' }}</div>
        </div>
      </div>
      <div class="ai-header-actions">
        <el-tooltip content="清空对话">
          <el-button size="small" text @click="clearChat">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="ai-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="ai-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- Tab: Chat -->
    <template v-if="activeTab === 'chat'">
      <!-- Quick Actions -->
      <div class="quick-actions">
        <el-button
          v-for="action in quickActions"
          :key="action.label"
          size="small"
          round
          @click="sendQuickAction(action.prompt)"
        >
          {{ action.label }}
        </el-button>
      </div>

      <!-- Generate from selection button -->
      <div v-if="previewStore.selectedElements.length > 0" class="selection-banner">
        <div class="selection-info">
          <el-icon color="#E6A23C"><Aim /></el-icon>
          <span>已选择 <strong>{{ previewStore.selectedElements.length }}</strong> 个元素</span>
        </div>
        <el-button
          size="small"
          type="warning"
          :loading="isLoading"
          @click="generateFromSelection"
        >
          <el-icon><MagicStick /></el-icon> AI 生成流程
        </el-button>
      </div>

      <!-- Messages -->
      <div class="messages" ref="messagesRef">
        <div v-if="messages.length === 0" class="messages-empty">
          <div class="empty-icon">🕷️</div>
          <p class="empty-title">智蛛 AI 助手</p>
          <p class="empty-desc">我可以帮你：</p>
          <ul class="empty-list">
            <li>📋 根据选择的网页元素生成爬虫流程</li>
            <li>🛡️ 分析并解决反爬虫问题</li>
            <li>🎬 配置视频资源爬取流程</li>
            <li>⚡ 使用流程模板快速创建</li>
            <li>🔍 推荐精准的 CSS 选择器</li>
          </ul>
        </div>

        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="message"
          :class="`message-${msg.role}`"
        >
          <div class="message-avatar">
            {{ msg.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <div class="message-text" v-html="renderMarkdown(msg.content)" />

            <!-- Apply flow button if message contains flow JSON -->
            <div v-if="msg.role === 'assistant' && extractedFlow(msg.content)" class="apply-flow">
              <el-button
                size="small"
                type="success"
                @click="applyFlow(extractedFlow(msg.content)!)"
              >
                <el-icon><Check /></el-icon> 应用此流程到编辑器
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="message message-assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="ai-input">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          placeholder="描述爬取需求，或询问反爬虫解决方案..."
          @keydown.enter.exact.prevent="sendMessage"
          resize="none"
        />
        <el-button
          type="primary"
          :loading="isLoading"
          :disabled="!inputText.trim()"
          @click="sendMessage"
        >
          <el-icon><Promotion /></el-icon>
        </el-button>
      </div>
      <div class="input-hint">Enter 发送 · Shift+Enter 换行</div>
    </template>

    <!-- Tab: Templates -->
    <template v-if="activeTab === 'templates'">
      <div class="templates-panel">
        <div class="templates-header">
          <p class="templates-desc">选择模板，AI 将自动生成对应的爬虫流程</p>
          <div v-if="previewStore.url" class="current-url">
            <el-icon><Link /></el-icon>
            <span>{{ truncateUrl(previewStore.url) }}</span>
          </div>
        </div>
        <div class="templates-list">
          <div
            v-for="(tpl, key) in templates"
            :key="key"
            class="template-card"
            :class="{ loading: generatingTemplate === key }"
            @click="generateFromTemplate(key)"
          >
            <div class="template-icon">{{ tpl.icon }}</div>
            <div class="template-info">
              <div class="template-name">{{ tpl.name }}</div>
              <div class="template-desc">{{ tpl.description }}</div>
            </div>
            <div class="template-action">
              <el-icon v-if="generatingTemplate === key" class="is-loading"><Loading /></el-icon>
              <el-icon v-else><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Tab: Anti-Crawl -->
    <template v-if="activeTab === 'anticrawl'">
      <div class="anticrawl-panel">
        <div class="anticrawl-header">
          <h4>反爬虫诊断与解决</h4>
          <p>输入目标网址，AI 分析其反爬虫机制并提供解决方案</p>
        </div>

        <div class="anticrawl-input-group">
          <el-input
            v-model="anticrawlUrl"
            size="small"
            placeholder="https://example.com"
            :prefix-icon="Link"
          />
          <el-input
            v-model="anticrawlError"
            type="textarea"
            :rows="2"
            size="small"
            placeholder="（可选）描述遇到的问题，如：返回403、被重定向到验证页、数据为空..."
            resize="none"
            style="margin-top: 8px"
          />
          <el-button
            type="primary"
            size="small"
            style="margin-top: 8px; width: 100%"
            :loading="isAnalyzing"
            @click="analyzeAntiCrawl"
          >
            <el-icon><Search /></el-icon> 分析反爬虫机制
          </el-button>
        </div>

        <!-- Analysis Result -->
        <div v-if="anticrawlResult" class="anticrawl-result">
          <div v-if="anticrawlResult.strategies.length > 0" class="strategies-section">
            <div class="section-title">🔍 检测到的反爬虫技术</div>
            <div class="strategies-list">
              <el-tag
                v-for="s in anticrawlResult.strategies"
                :key="s"
                size="small"
                type="danger"
                effect="light"
              >
                {{ s }}
              </el-tag>
            </div>
          </div>

          <div class="recommendations-section">
            <div class="section-title">💡 解决方案</div>
            <div class="recommendations-text" v-html="renderMarkdown(anticrawlResult.recommendations)" />
          </div>

          <div v-if="anticrawlResult.suggestedNodes?.length > 0" class="suggested-nodes-section">
            <div class="section-title">⚡ 建议添加的节点</div>
            <div
              v-for="(node, i) in anticrawlResult.suggestedNodes"
              :key="i"
              class="suggested-node"
            >
              <div class="node-preview">
                <span class="node-type-badge" :style="getNodeBadgeStyle(node.type)">
                  {{ getNodeLabel(node.type) }}
                </span>
                <span class="node-label">{{ node.label }}</span>
              </div>
              <el-button
                size="small"
                type="primary"
                plain
                @click="addSuggestedNode(node)"
              >
                添加到流程
              </el-button>
            </div>
          </div>
        </div>

        <!-- Common Anti-Crawl Tips -->
        <div v-else class="anticrawl-tips">
          <div class="tips-title">常见反爬虫类型</div>
          <div
            v-for="tip in antiCrawlTips"
            :key="tip.type"
            class="tip-item"
            @click="anticrawlError = tip.symptom"
          >
            <div class="tip-type">{{ tip.icon }} {{ tip.type }}</div>
            <div class="tip-symptom">症状：{{ tip.symptom }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import {
  MagicStick, Delete, Check, Promotion, Aim, Link,
  ArrowRight, Loading, Search
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { aiApi } from '../../api'
import { useFlowStore } from '../../stores/flowStore'
import { usePreviewStore } from '../../stores/previewStore'
import { NODE_TYPE_MAP } from '../../types'
import type { AIMessage, FlowNode, FlowEdge, FlowTemplate } from '../../types'

const flowStore = useFlowStore()
const previewStore = usePreviewStore()

const activeTab = ref('chat')
const tabs = [
  { key: 'chat', label: '💬 对话' },
  { key: 'templates', label: '📋 模板' },
  { key: 'anticrawl', label: '🛡️ 反爬虫' },
]

// Chat state
const messages = ref<AIMessage[]>([])
const inputText = ref('')
const isLoading = ref(false)
const messagesRef = ref<HTMLElement>()

// Templates state
const templates = ref<Record<string, FlowTemplate>>({})
const generatingTemplate = ref<string | null>(null)

// Anti-crawl state
const anticrawlUrl = ref('')
const anticrawlError = ref('')
const isAnalyzing = ref(false)
const anticrawlResult = ref<{
  strategies: string[]
  recommendations: string
  suggestedNodes: any[]
} | null>(null)

const quickActions = [
  { label: '解释流程', prompt: '请解释当前流程中每个节点的作用和配置' },
  { label: '优化建议', prompt: '请分析当前流程并给出优化建议，包括性能和稳定性' },
  { label: '提取列表', prompt: '如何用爬虫提取网页中的列表数据？请给出完整流程' },
  { label: '处理分页', prompt: '如何配置流程来自动处理多页数据的爬取？' },
  { label: '爬取视频', prompt: '如何配置流程来爬取网页中的视频资源？支持 m3u8 和 mp4' },
  { label: '反爬虫', prompt: '当前流程遇到反爬虫问题，请帮我添加反爬虫处理策略' },
]

const antiCrawlTips = [
  { icon: '🚫', type: 'IP 封锁', symptom: '请求返回 403 或被重定向' },
  { icon: '🤖', type: 'UA 检测', symptom: '返回空数据或要求验证' },
  { icon: '⏱️', type: '频率限制', symptom: '短时间内多次请求后被封' },
  { icon: '🍪', type: 'Cookie 验证', symptom: '需要登录或 Session 验证' },
  { icon: '📜', type: 'JS 渲染', symptom: '页面内容需要 JavaScript 执行后才显示' },
  { icon: '🔐', type: '验证码', symptom: '出现滑块或图形验证码' },
]

onMounted(async () => {
  try {
    const res = await aiApi.getTemplates()
    templates.value = res.data.data
  } catch {}
})

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  isLoading.value = true
  await scrollToBottom()

  try {
    const flowContext = {
      nodes: flowStore.currentFlow?.nodes || [],
      edges: flowStore.currentFlow?.edges || [],
      selectedUrl: previewStore.url,
      selectedElements: previewStore.selectedElements.map(e => `${e.selector} (${e.text || ''})`),
      selectedElementsDetail: previewStore.selectedElements,
    }

    const res = await aiApi.chat(messages.value, flowContext)
    messages.value.push({ role: 'assistant', content: res.data.data.content })
  } catch (error: any) {
    messages.value.push({
      role: 'assistant',
      content: `抱歉，发生了错误：${error.message}`,
    })
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

async function sendQuickAction(prompt: string) {
  inputText.value = prompt
  await sendMessage()
}

async function generateFromSelection() {
  const elements = previewStore.selectedElements
  if (elements.length === 0) return

  const hasVideo = elements.some(el =>
    el.tagName === 'video' || el.tagName === 'source' ||
    (el.attrs?.src && (el.attrs.src.includes('.m3u8') || el.attrs.src.includes('.mp4')))
  )

  const selectors = elements.map((e, i) => {
    let desc = `${i + 1}. ${e.tagName} | ${e.selector}`
    if (e.text) desc += ` | "${e.text.substring(0, 30)}"`
    if (e.attrs?.href) desc += ` | href: ${e.attrs.href}`
    if (e.attrs?.src) desc += ` | src: ${e.attrs.src}`
    return desc
  }).join('\n')

  const prompt = `我在网页 ${previewStore.url || '(未知)'} 中选择了以下 ${elements.length} 个元素：
${selectors}
${hasVideo ? '\n注意：包含视频元素，请使用 video_extract 节点。' : ''}

请帮我生成一个完整的爬虫流程，包含：
1. 爬取该网页（考虑是否需要反爬虫措施）
2. 精确提取这些元素的数据
3. 如果有多个同类元素，使用循环遍历
4. 输出结果

请以 JSON 格式返回完整的流程配置，并说明每个节点的作用。`

  inputText.value = prompt
  activeTab.value = 'chat'
  await sendMessage()
}

async function generateFromTemplate(templateKey: string) {
  generatingTemplate.value = templateKey
  try {
    const res = await aiApi.generateFromTemplate(
      templateKey,
      previewStore.url,
      previewStore.selectedElements.length > 0 ? previewStore.selectedElements : undefined
    )

    if (res.data.data.nodes?.length > 0) {
      if (!flowStore.currentFlow) {
        ElMessage.warning('请先创建或选择一个流程')
        return
      }
      flowStore.applyGeneratedFlow(res.data.data.nodes, res.data.data.edges)
      ElMessage.success(`已应用"${templates.value[templateKey]?.name}"流程模板！`)

      // Switch to chat tab and show description
      activeTab.value = 'chat'
      if (res.data.data.description) {
        messages.value.push({
          role: 'assistant',
          content: res.data.data.description,
        })
        await scrollToBottom()
      }
    } else {
      ElMessage.warning('模板生成失败，请重试')
    }
  } catch (e: any) {
    ElMessage.error('生成失败：' + e.message)
  } finally {
    generatingTemplate.value = null
  }
}

async function analyzeAntiCrawl() {
  const url = anticrawlUrl.value || previewStore.url
  if (!url) {
    ElMessage.warning('请输入目标网址')
    return
  }

  isAnalyzing.value = true
  anticrawlResult.value = null
  try {
    const res = await aiApi.analyzeAntiCrawl(url, anticrawlError.value || undefined)
    anticrawlResult.value = res.data.data
  } catch (e: any) {
    ElMessage.error('分析失败：' + e.message)
  } finally {
    isAnalyzing.value = false
  }
}

function addSuggestedNode(nodeConfig: any) {
  if (!flowStore.currentFlow) {
    ElMessage.warning('请先创建或选择一个流程')
    return
  }

  const nodeType = NODE_TYPE_MAP.get(nodeConfig.type)
  const newNode: FlowNode = {
    id: `node_${Date.now()}`,
    type: nodeConfig.type,
    label: nodeConfig.label || nodeType?.label || nodeConfig.type,
    position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 100 },
    data: nodeConfig.data || nodeType?.defaultData || {},
  }

  flowStore.addNode(newNode)
  ElMessage.success(`已添加"${newNode.label}"节点到流程`)
}

function extractedFlow(content: string): { nodes: FlowNode[]; edges: FlowEdge[] } | null {
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
  if (!jsonMatch) return null
  try {
    const parsed = JSON.parse(jsonMatch[1] || '{}')
    if (parsed.nodes && parsed.edges) return parsed
  } catch {}
  return null
}

function applyFlow(flow: { nodes: FlowNode[]; edges: FlowEdge[] }) {
  if (!flowStore.currentFlow) {
    ElMessage.warning('请先创建或选择一个流程')
    return
  }
  flowStore.applyGeneratedFlow(flow.nodes, flow.edges)
  ElMessage.success('流程已应用到编辑器')
}

function clearChat() {
  messages.value = []
}

function getNodeLabel(type: string): string {
  return NODE_TYPE_MAP.get(type)?.label || type
}

function getNodeBadgeStyle(type: string): string {
  const color = NODE_TYPE_MAP.get(type)?.color || '#909399'
  return `background: ${color}20; color: ${color}; border: 1px solid ${color}40`
}

function truncateUrl(url: string): string {
  if (url.length <= 40) return url
  return url.substring(0, 40) + '...'
}

function renderMarkdown(text: string): string {
  return text
    .replace(/```json\n([\s\S]*?)\n```/g, '<pre class="code-block json-block"><code>$1</code></pre>')
    .replace(/```(\w*)\n([\s\S]*?)\n```/g, '<pre class="code-block"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hup]|<li|<pre)(.+)$/gm, '<p>$1</p>')
}

async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}
</script>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #e4e7ed;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex-shrink: 0;
}

.ai-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-avatar {
  font-size: 24px;
}

.ai-name {
  font-size: 14px;
  font-weight: 600;
}

.ai-status {
  font-size: 11px;
  opacity: 0.8;
}

.ai-header-actions {
  display: flex;
  gap: 4px;
}

/* Tabs */
.ai-tabs {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
  flex-shrink: 0;
}

.ai-tab {
  flex: 1;
  padding: 8px 4px;
  text-align: center;
  font-size: 12px;
  cursor: pointer;
  color: #606266;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}

.ai-tab:hover {
  color: #409EFF;
  background: #f0f6ff;
}

.ai-tab.active {
  color: #409EFF;
  border-bottom-color: #409EFF;
  background: #fff;
  font-weight: 600;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
}

/* Selection Banner */
.selection-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: linear-gradient(135deg, #fdf6ec, #fef9f0);
  border-bottom: 1px solid #faecd8;
  flex-shrink: 0;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #E6A23C;
}

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.messages-empty {
  color: #909399;
  font-size: 13px;
  padding: 16px;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #606266;
  margin: 0 0 8px;
}

.empty-desc {
  color: #909399;
  margin: 0 0 6px;
}

.empty-list {
  text-align: left;
  display: inline-block;
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.empty-list li {
  margin-bottom: 6px;
  font-size: 12px;
  color: #606266;
}

.message {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.message-user {
  flex-direction: row-reverse;
}

.message-avatar {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.message-content {
  max-width: 88%;
}

.message-user .message-content {
  background: #409EFF;
  color: white;
  border-radius: 12px 2px 12px 12px;
  padding: 8px 12px;
  font-size: 13px;
}

.message-assistant .message-content {
  background: #f5f7fa;
  border-radius: 2px 12px 12px 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: #303133;
}

.message-text :deep(p) { margin: 4px 0; }
.message-text :deep(.code-block) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  overflow-x: auto;
  margin: 6px 0;
  max-height: 200px;
  overflow-y: auto;
}
.message-text :deep(.json-block) { color: #9cdcfe; }
.message-text :deep(.inline-code) {
  background: rgba(0,0,0,0.1);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}
.message-text :deep(h1), .message-text :deep(h2), .message-text :deep(h3) {
  margin: 8px 0 4px;
  font-size: 14px;
}
.message-text :deep(ul) { padding-left: 16px; margin: 4px 0; }
.message-text :deep(li) { margin-bottom: 3px; }
.message-text :deep(strong) { color: #303133; }

.apply-flow { margin-top: 8px; }

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 4px;
}
.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #909399;
  border-radius: 50%;
  animation: typing 1.2s infinite;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* Input */
.ai-input {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #e4e7ed;
  align-items: flex-end;
  flex-shrink: 0;
}
.ai-input .el-textarea { flex: 1; }
.input-hint {
  text-align: center;
  font-size: 11px;
  color: #c0c4cc;
  padding: 2px 0 6px;
  flex-shrink: 0;
}

/* Templates Panel */
.templates-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
.templates-header {
  margin-bottom: 12px;
}
.templates-desc {
  font-size: 12px;
  color: #909399;
  margin: 0 0 8px;
}
.current-url {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #409EFF;
  background: #ecf5ff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #b3d8ff;
}
.current-url span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.templates-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.template-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}
.template-card:hover {
  border-color: #409EFF;
  background: #ecf5ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}
.template-card.loading {
  opacity: 0.7;
  pointer-events: none;
}
.template-icon { font-size: 24px; flex-shrink: 0; }
.template-info { flex: 1; }
.template-name { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 3px; }
.template-desc { font-size: 11px; color: #909399; }
.template-action { color: #c0c4cc; }

/* Anti-Crawl Panel */
.anticrawl-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.anticrawl-header h4 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #303133;
}
.anticrawl-header p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}
.anticrawl-input-group {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.anticrawl-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}
.strategies-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.recommendations-text {
  font-size: 12px;
  color: #303133;
  line-height: 1.6;
  background: #f5f7fa;
  padding: 10px;
  border-radius: 6px;
}
.recommendations-text :deep(p) { margin: 4px 0; }
.recommendations-text :deep(li) { margin-bottom: 4px; }
.recommendations-text :deep(strong) { color: #303133; }
.suggested-nodes-section { display: flex; flex-direction: column; gap: 8px; }
.suggested-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}
.node-preview { display: flex; align-items: center; gap: 8px; }
.node-type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.node-label { font-size: 12px; color: #606266; }
.anticrawl-tips { display: flex; flex-direction: column; gap: 6px; }
.tips-title { font-size: 12px; font-weight: 600; color: #606266; margin-bottom: 4px; }
.tip-item {
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid transparent;
}
.tip-item:hover {
  background: #ecf5ff;
  border-color: #b3d8ff;
}
.tip-type { font-size: 12px; font-weight: 600; color: #303133; margin-bottom: 2px; }
.tip-symptom { font-size: 11px; color: #909399; }
</style>
