<template>
  <div class="web-preview">
    <!-- URL Bar -->
    <div class="url-bar">
      <el-input
        v-model="urlInput"
        size="small"
        placeholder="输入网址预览，例如 https://example.com"
        @keyup.enter="loadUrl"
        class="url-input"
      >
        <template #prefix>
          <el-icon color="#909399"><Link /></el-icon>
        </template>
      </el-input>
      <el-button size="small" type="primary" @click="loadUrl" :loading="previewStore.isLoading">
        <el-icon><Search /></el-icon> 加载
      </el-button>
      <el-divider direction="vertical" />
      <el-tooltip :content="previewStore.isSelectionMode ? '退出元素选择模式' : '进入元素选择模式：点击或框选网页元素'">
        <el-button
          size="small"
          :type="previewStore.isSelectionMode ? 'warning' : 'default'"
          :class="{ 'selection-active': previewStore.isSelectionMode }"
          @click="previewStore.toggleSelectionMode"
        >
          <el-icon><Aim /></el-icon>
          {{ previewStore.isSelectionMode ? '退出选择' : '选择元素' }}
        </el-button>
      </el-tooltip>
      <el-tooltip content="多选模式：按住 Ctrl 可选择多个元素">
        <el-button
          v-if="previewStore.isSelectionMode"
          size="small"
          :type="multiSelectMode ? 'success' : 'default'"
          @click="multiSelectMode = !multiSelectMode"
        >
          <el-icon><Grid /></el-icon>
          {{ multiSelectMode ? '多选中' : '多选' }}
        </el-button>
      </el-tooltip>
    </div>

    <!-- Status Bar -->
    <div v-if="previewStore.title || previewStore.isSelectionMode" class="status-bar">
      <template v-if="previewStore.isSelectionMode">
        <el-icon color="#E6A23C"><Aim /></el-icon>
        <span class="status-selection">
          选择元素模式 · 点击选择单个元素
          <template v-if="multiSelectMode"> · <strong>多选模式已开启</strong>（可选多个不同元素）</template>
        </span>
      </template>
      <template v-else-if="previewStore.title">
        <el-icon color="#909399"><Document /></el-icon>
        <span class="page-title">{{ previewStore.title }}</span>
        <el-tag size="small" type="info" effect="plain">{{ previewStore.url }}</el-tag>
      </template>
    </div>

    <!-- Error -->
    <el-alert
      v-if="previewStore.error"
      :title="previewStore.error"
      type="error"
      show-icon
      :closable="false"
      style="margin: 8px; border-radius: 6px;"
    />

    <!-- Loading -->
    <div v-if="previewStore.isLoading" class="preview-loading">
      <el-icon class="is-loading" :size="36" color="#409EFF"><Loading /></el-icon>
      <p>正在加载网页...</p>
      <p class="loading-hint">{{ urlInput }}</p>
    </div>

    <!-- Preview Frame -->
    <div v-else-if="previewStore.html" class="preview-container">
      <div
        class="preview-selection-overlay"
        v-if="previewStore.isSelectionMode"
      />
      <iframe
        ref="iframeRef"
        class="preview-iframe"
        :class="{ 'selection-mode': previewStore.isSelectionMode }"
        sandbox="allow-same-origin allow-scripts"
        @load="onIframeLoad"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="preview-empty">
      <div class="preview-empty-icon">🌐</div>
      <p class="preview-empty-title">输入网址后点击加载</p>
      <p class="preview-empty-hint">在选择元素模式下，点击或框选网页中的元素可自动生成 CSS 选择器</p>
      <div class="preview-examples">
        <span class="example-label">快速尝试：</span>
        <el-button size="small" text type="primary" @click="loadExample('https://example.com')">example.com</el-button>
        <el-button size="small" text type="primary" @click="loadExample('https://quotes.toscrape.com')">quotes.toscrape.com</el-button>
      </div>
    </div>

    <!-- Selected Elements Panel -->
    <transition name="slide-up">
      <div v-if="previewStore.selectedElements.length > 0" class="selected-elements">
        <div class="selected-header">
          <div class="selected-title">
            <el-icon color="#E6A23C"><Aim /></el-icon>
            <span>已选择元素</span>
            <el-badge :value="previewStore.selectedElements.length" type="warning" />
          </div>
          <div class="selected-actions">
            <el-tooltip content="AI 生成爬虫流程">
              <el-button
                size="small"
                type="primary"
                @click="generateFlowFromSelection"
                :loading="isGenerating"
              >
                <el-icon><MagicStick /></el-icon> 生成流程
              </el-button>
            </el-tooltip>
            <el-button size="small" text @click="previewStore.clearSelectedElements">
              <el-icon><Delete /></el-icon> 清空
            </el-button>
          </div>
        </div>
        <div class="selected-list">
          <div
            v-for="el in previewStore.selectedElements"
            :key="el.selector"
            class="selected-item"
            :class="getElementTypeClass(el)"
          >
            <el-tag
              size="small"
              :type="getElementTagType(el)"
              effect="light"
              class="element-type-tag"
            >
              {{ getElementTypeLabel(el) }}
            </el-tag>
            <code class="selector-code" :title="el.selector">{{ el.selector }}</code>
            <span class="element-text" :title="el.text">{{ truncate(el.text || getAttrPreview(el), 30) }}</span>
            <div class="item-actions">
              <el-tooltip content="复制选择器">
                <el-button size="small" text @click="copySelector(el.selector)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="应用到当前节点">
                <el-button size="small" text type="success" @click="applyToNode(el.selector)">
                  <el-icon><Check /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="移除">
                <el-button size="small" text type="danger" @click="previewStore.removeSelectedElement(el.selector)">
                  <el-icon><Close /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- Batch Operations -->
        <div v-if="previewStore.selectedElements.length > 1" class="batch-ops">
          <span class="batch-hint">已选 {{ previewStore.selectedElements.length }} 个元素</span>
          <el-button size="small" text type="primary" @click="copyAllSelectors">
            <el-icon><CopyDocument /></el-icon> 复制全部选择器
          </el-button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import {
  Link, Search, Aim, Document, Loading, CopyDocument, Close, Delete,
  MagicStick, Check, Grid
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { usePreviewStore } from '../../stores/previewStore'
import { useFlowStore } from '../../stores/flowStore'
import { aiApi } from '../../api'
import type { SelectedElement } from '../../stores/previewStore'

const previewStore = usePreviewStore()
const flowStore = useFlowStore()
const urlInput = ref('')
const iframeRef = ref<HTMLIFrameElement>()
const multiSelectMode = ref(false)
const isGenerating = ref(false)

const emit = defineEmits<{
  (e: 'flow-generated', nodes: any[], edges: any[]): void
}>()

async function loadUrl() {
  if (!urlInput.value) return
  let url = urlInput.value.trim()
  if (!url.startsWith('http')) url = 'https://' + url
  urlInput.value = url
  await previewStore.fetchPage(url)
}

async function loadExample(url: string) {
  urlInput.value = url
  await loadUrl()
}

// Inject HTML into iframe after fetch
watch(
  () => previewStore.html,
  async (html) => {
    if (!html) return
    await nextTick()
    const iframe = iframeRef.value
    if (!iframe) return

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const injectedHtml = html.replace(
      '</body>',
      `<script>
(function() {
  var isSelectionMode = false;
  var multiSelect = false;
  var highlighted = null;
  var selectedEls = new Set();

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SET_SELECTION_MODE') {
      isSelectionMode = e.data.value;
      document.body.style.cursor = isSelectionMode ? 'crosshair' : '';
      if (!isSelectionMode) {
        if (highlighted) {
          highlighted.style.outline = highlighted._oldOutline || '';
          highlighted.style.outlineOffset = '';
          highlighted = null;
        }
      }
    }
    if (e.data && e.data.type === 'SET_MULTI_SELECT') {
      multiSelect = e.data.value;
    }
    if (e.data && e.data.type === 'CLEAR_SELECTION') {
      selectedEls.forEach(function(el) {
        el.style.outline = el._oldOutline || '';
        el.style.outlineOffset = '';
      });
      selectedEls.clear();
    }
  });

  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    var parts = [];
    var current = el;
    while (current && current !== document.body && current.tagName) {
      var part = current.tagName.toLowerCase();
      if (current.id) {
        part = '#' + current.id;
        parts.unshift(part);
        break;
      }
      var classes = Array.from(current.classList || [])
        .filter(function(c) { return c && !/[^a-zA-Z0-9_-]/.test(c); })
        .slice(0, 2);
      if (classes.length) {
        part += '.' + classes.join('.');
      } else {
        var parent = current.parentElement;
        if (parent) {
          var siblings = Array.from(parent.children).filter(function(c) {
            return c.tagName === current.tagName;
          });
          if (siblings.length > 1) {
            part += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
          }
        }
      }
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function getElementCount(selector) {
    try { return document.querySelectorAll(selector).length; } catch(e) { return 1; }
  }

  document.addEventListener('mouseover', function(e) {
    if (!isSelectionMode) return;
    var target = e.target;
    if (highlighted && highlighted !== target && !selectedEls.has(highlighted)) {
      highlighted.style.outline = highlighted._oldOutline || '';
      highlighted.style.outlineOffset = '';
    }
    if (!selectedEls.has(target)) {
      highlighted = target;
      highlighted._oldOutline = highlighted.style.outline;
      highlighted.style.outline = '2px solid #409EFF';
      highlighted.style.outlineOffset = '1px';
    }
    e.stopPropagation();
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (!isSelectionMode || !highlighted) return;
    if (selectedEls.has(highlighted)) return;
    if (!e.relatedTarget || !highlighted.contains(e.relatedTarget)) {
      highlighted.style.outline = highlighted._oldOutline || '';
      highlighted.style.outlineOffset = '';
      highlighted = null;
    }
  }, true);

  document.addEventListener('click', function(e) {
    if (!isSelectionMode) return;
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    var selector = getSelector(el);
    var text = (el.textContent || '').trim().substring(0, 100);
    var attrs = {};
    Array.from(el.attributes || []).forEach(function(a) { attrs[a.name] = a.value; });
    var count = getElementCount(selector);

    // Mark as selected
    if (multiSelect) {
      if (selectedEls.has(el)) {
        selectedEls.delete(el);
        el.style.outline = el._oldOutline || '';
        el.style.outlineOffset = '';
      } else {
        selectedEls.add(el);
        el._oldOutline = el.style.outline;
        el.style.outline = '3px solid #67C23A';
        el.style.outlineOffset = '2px';
      }
    } else {
      // Single select: clear previous
      selectedEls.forEach(function(prev) {
        if (prev !== el) {
          prev.style.outline = prev._oldOutline || '';
          prev.style.outlineOffset = '';
        }
      });
      selectedEls.clear();
      selectedEls.add(el);
      el._oldOutline = el.style.outline;
      el.style.outline = '3px solid #67C23A';
      el.style.outlineOffset = '2px';
    }

    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      selector: selector,
      tagName: el.tagName ? el.tagName.toLowerCase() : '',
      text: text,
      attrs: attrs,
      outerHTML: el.outerHTML ? el.outerHTML.substring(0, 500) : '',
      matchCount: count,
      multiSelect: multiSelect
    }, '*');
  }, true);
})();
<\/script></body>`
    )

    doc.open()
    doc.write(injectedHtml)
    doc.close()
  }
)

// Sync selection mode to iframe
watch(
  () => previewStore.isSelectionMode,
  (val) => {
    const iframe = iframeRef.value
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'SET_SELECTION_MODE', value: val }, '*')
    }
    if (!val) multiSelectMode.value = false
  }
)

// Sync multi-select mode to iframe
watch(multiSelectMode, (val) => {
  const iframe = iframeRef.value
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'SET_MULTI_SELECT', value: val }, '*')
  }
})

function onIframeLoad() {
  if (previewStore.isSelectionMode) {
    const iframe = iframeRef.value
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'SET_SELECTION_MODE', value: true }, '*')
    }
  }
}

// Listen for element selection messages from iframe
window.addEventListener('message', (event) => {
  if (event.data?.type === 'ELEMENT_SELECTED') {
    const el: SelectedElement = {
      selector: event.data.selector,
      tagName: event.data.tagName,
      text: event.data.text,
      attrs: event.data.attrs,
      outerHTML: event.data.outerHTML,
    }
    previewStore.addSelectedElement(el)

    const matchInfo = event.data.matchCount > 1 ? `（匹配 ${event.data.matchCount} 个元素）` : ''
    const typeLabel = getElementTypeLabel(el)
    ElMessage({
      message: `已选择 ${typeLabel}: ${el.selector} ${matchInfo}`,
      type: 'success',
      duration: 2000,
      showClose: true,
    })
  }
})

function getElementTypeLabel(el: SelectedElement): string {
  const tag = el.tagName?.toLowerCase() || ''
  const src = el.attrs?.src || el.attrs?.['data-src'] || ''
  if (tag === 'video' || tag === 'source') return '🎬 视频'
  if (tag === 'img') return '🖼️ 图片'
  if (tag === 'a') return '🔗 链接'
  if (src.includes('.m3u8') || src.includes('.mp4')) return '🎬 视频'
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return '📝 表单'
  if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return '📌 标题'
  if (tag === 'p' || tag === 'span' || tag === 'div') return '📄 文本'
  if (tag === 'table' || tag === 'tr' || tag === 'td') return '📊 表格'
  return `<${tag}>`
}

function getElementTagType(el: SelectedElement): string {
  const tag = el.tagName?.toLowerCase() || ''
  const src = el.attrs?.src || el.attrs?.['data-src'] || ''
  if (tag === 'video' || tag === 'source' || src.includes('.m3u8') || src.includes('.mp4')) return 'danger'
  if (tag === 'img') return 'warning'
  if (tag === 'a') return 'primary'
  return 'info'
}

function getElementTypeClass(el: SelectedElement): string {
  const tag = el.tagName?.toLowerCase() || ''
  if (tag === 'video' || tag === 'source') return 'item-video'
  if (tag === 'a') return 'item-link'
  if (tag === 'img') return 'item-image'
  return ''
}

function getAttrPreview(el: SelectedElement): string {
  if (el.attrs?.href) return el.attrs.href
  if (el.attrs?.src) return el.attrs.src
  if (el.attrs?.['data-src']) return el.attrs['data-src']
  return ''
}

async function generateFlowFromSelection() {
  if (previewStore.selectedElements.length === 0) return
  if (!previewStore.url) {
    ElMessage.warning('请先加载一个网页')
    return
  }

  isGenerating.value = true
  try {
    const res = await aiApi.generateFromSelection(
      previewStore.url,
      previewStore.selectedElements
    )
    if (res.data.data.nodes?.length > 0) {
      emit('flow-generated', res.data.data.nodes, res.data.data.edges)
      ElMessage.success('已根据选择的元素生成爬虫流程！')
    }
  } catch (e: any) {
    ElMessage.error('生成失败：' + e.message)
  } finally {
    isGenerating.value = false
  }
}

function applyToNode(selector: string) {
  const currentNode = flowStore.selectedNode
  if (!currentNode) {
    ElMessage.warning('请先在流程编辑器中选择一个提取节点')
    return
  }
  if (currentNode.type !== 'extract' && currentNode.type !== 'video_extract') {
    ElMessage.warning('请选择一个"提取"或"视频提取"节点')
    return
  }
  flowStore.updateNodeData(currentNode.id, { selector })
  ElMessage.success(`选择器已应用到节点 "${currentNode.label}"`)
}

function copySelector(selector: string) {
  navigator.clipboard.writeText(selector).then(() => {
    ElMessage({ message: '选择器已复制', type: 'success', duration: 1500 })
  })
}

function copyAllSelectors() {
  const all = previewStore.selectedElements.map(e => e.selector).join('\n')
  navigator.clipboard.writeText(all).then(() => {
    ElMessage({ message: `已复制 ${previewStore.selectedElements.length} 个选择器`, type: 'success', duration: 2000 })
  })
}

function truncate(str: string, len: number) {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}
</script>

<style scoped>
.web-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
}

.url-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.url-input {
  flex: 1;
  min-width: 200px;
}

.selection-active {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(230, 162, 60, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(230, 162, 60, 0); }
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 12px;
  color: #606266;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
}

.status-selection {
  color: #E6A23C;
  font-weight: 500;
}

.page-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  gap: 10px;
}

.loading-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.preview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.preview-selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  pointer-events: none;
  border: 3px solid #E6A23C;
  box-shadow: inset 0 0 0 1px rgba(230, 162, 60, 0.3);
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-iframe.selection-mode {
  pointer-events: all;
}

.preview-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  gap: 8px;
  font-size: 14px;
  padding: 20px;
}

.preview-empty-icon {
  font-size: 48px;
  opacity: 0.4;
}

.preview-empty-title {
  font-size: 15px;
  color: #909399;
  font-weight: 500;
  margin: 0;
}

.preview-empty-hint {
  font-size: 12px;
  color: #c0c4cc;
  margin: 0;
  text-align: center;
}

.preview-examples {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.example-label {
  font-size: 12px;
  color: #909399;
}

.selected-elements {
  flex-shrink: 0;
  max-height: 240px;
  border-top: 2px solid #e4e7ed;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.selected-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #fdf6ec;
  border-bottom: 1px solid #faecd8;
  flex-shrink: 0;
}

.selected-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #E6A23C;
}

.selected-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.selected-list {
  overflow-y: auto;
  padding: 4px 8px;
  flex: 1;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 4px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.1s;
}

.selected-item:hover {
  background: #f5f7fa;
  border-radius: 4px;
}

.selected-item.item-video {
  background: #fef0f0;
}

.selected-item.item-link {
  background: #ecf5ff;
}

.selected-item.item-image {
  background: #fdf6ec;
}

.element-type-tag {
  flex-shrink: 0;
  font-size: 10px;
}

.selector-code {
  font-size: 11px;
  background: #ecf5ff;
  color: #409EFF;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  flex-shrink: 0;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid #b3d8ff;
}

.element-text {
  flex: 1;
  font-size: 11px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}

.batch-ops {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: #f0f9ff;
  border-top: 1px solid #e0f0ff;
  font-size: 12px;
  color: #606266;
  flex-shrink: 0;
}

.batch-hint {
  color: #909399;
}

/* Slide up animation */
.slide-up-enter-active {
  animation: slideUp 0.2s ease;
}

.slide-up-leave-active {
  animation: slideUp 0.15s ease reverse;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
