<template>
  <div class="node-properties" v-if="node">
    <div class="props-header">
      <div class="props-title">
        <el-icon :color="nodeConfig?.color">
          <component :is="nodeConfig?.icon || 'Document'" />
        </el-icon>
        <span>{{ nodeConfig?.label || node.type }} 属性</span>
      </div>
      <el-button size="small" text @click="emit('close')">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <div class="props-body">
      <!-- Common: Label -->
      <div class="prop-group">
        <div class="prop-label">节点名称</div>
        <el-input
          v-model="localLabel"
          size="small"
          placeholder="节点名称"
          @change="onLabelChange"
        />
      </div>

      <!-- Fetch Node -->
      <template v-if="node.type === 'fetch'">
        <div class="prop-section-title">基本配置</div>
        <div class="prop-group">
          <div class="prop-label">请求地址 <span class="required">*</span></div>
          <el-input
            v-model="localData.url"
            size="small"
            placeholder="https://example.com 或 ${变量}"
            @change="onDataChange"
          />
        </div>
        <div class="prop-group">
          <div class="prop-label">请求方法</div>
          <el-select v-model="localData.method" size="small" @change="onDataChange">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </div>
        <div class="prop-group">
          <div class="prop-label">超时时间 (ms)</div>
          <el-input-number
            v-model="localData.timeout"
            size="small"
            :min="1000"
            :max="60000"
            :step="1000"
            @change="onDataChange"
          />
        </div>
        <div class="prop-group">
          <el-checkbox v-model="localData.followRedirects" @change="onDataChange">
            跟随重定向
          </el-checkbox>
        </div>
        <div class="prop-group">
          <div class="prop-label">请求体 (JSON/Text)</div>
          <el-input
            v-model="localData.body"
            type="textarea"
            size="small"
            :rows="3"
            placeholder="POST 请求体内容"
            @change="onDataChange"
          />
        </div>

        <div class="prop-section-title">
          <el-icon color="#FF6D00"><Lock /></el-icon>
          反爬虫配置
        </div>
        <div class="prop-group">
          <div class="prop-label">User-Agent</div>
          <el-select
            v-model="localData.userAgent"
            size="small"
            @change="onDataChange"
            allow-create
            filterable
            placeholder="选择或自定义 UA"
          >
            <el-option label="默认（不设置）" value="" />
            <el-option label="Chrome 120 (Windows)" value="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" />
            <el-option label="Chrome 120 (Mac)" value="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" />
            <el-option label="Firefox 121" value="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0" />
            <el-option label="Safari 17 (Mac)" value="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15" />
            <el-option label="Mobile Chrome (Android)" value="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36" />
            <el-option label="Googlebot" value="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" />
          </el-select>
        </div>
        <div class="prop-group">
          <div class="prop-label">代理地址</div>
          <el-input
            v-model="localData.proxy"
            size="small"
            placeholder="http://user:pass@host:port"
            @change="onDataChange"
          />
        </div>
        <div class="prop-group">
          <div class="prop-label">重试次数</div>
          <el-input-number
            v-model="localData.retries"
            size="small"
            :min="0"
            :max="10"
            :value-on-clear="0"
            @change="(v: number) => { localData.retries = v; onDataChange() }"
          />
        </div>
        <div class="prop-group" v-if="localData.retries > 0">
          <div class="prop-label">重试延迟 (ms)</div>
          <el-input-number
            v-model="localData.retryDelay"
            size="small"
            :min="500"
            :max="30000"
            :step="500"
            :value-on-clear="1000"
            @change="(v: number) => { localData.retryDelay = v; onDataChange() }"
          />
        </div>
        <div class="prop-group">
          <div class="prop-label">自定义请求头</div>
          <div v-for="(_, key) in (localData.headers || {})" :key="String(key)" class="header-row">
            <el-input
              :model-value="String(key)"
              size="small"
              placeholder="Header 名"
              style="width: 110px"
              @change="(v: string) => updateHeaderKey(String(key), v)"
            />
            <el-input
              v-model="localData.headers[String(key)]"
              size="small"
              placeholder="值"
              style="flex: 1"
              @change="onDataChange"
            />
            <el-button size="small" text type="danger" @click="removeHeader(String(key))">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button size="small" @click="addHeader" style="margin-top: 4px">
            <el-icon><Plus /></el-icon> 添加请求头
          </el-button>
        </div>
      </template>

      <!-- Extract Node -->
      <template v-if="node.type === 'extract'">
        <div class="prop-group">
          <div class="prop-label">选择器 <span class="required">*</span></div>
          <el-input
            v-model="localData.selector"
            size="small"
            placeholder="CSS 选择器 / XPath / 正则"
            @change="onDataChange"
          />
          <div v-if="suggestedSelector" class="suggestion">
            <el-tag size="small" type="success" @click="applySuggestion">
              AI 建议: {{ suggestedSelector }}
            </el-tag>
          </div>
          <div class="prop-hint">可在网页预览中点击元素自动填入选择器</div>
        </div>
        <div class="prop-group">
          <div class="prop-label">选择器类型</div>
          <el-select v-model="localData.selectorType" size="small" @change="onDataChange">
            <el-option label="CSS 选择器" value="css" />
            <el-option label="XPath" value="xpath" />
            <el-option label="正则表达式" value="regex" />
            <el-option label="JSONPath" value="jsonpath" />
          </el-select>
        </div>
        <div class="prop-group">
          <div class="prop-label">提取属性</div>
          <el-select v-model="localData.attribute" size="small" @change="onDataChange" allow-create filterable>
            <el-option label="文本内容 (text)" value="text" />
            <el-option label="HTML 内容 (html)" value="html" />
            <el-option label="链接 (href)" value="href" />
            <el-option label="图片 (src)" value="src" />
            <el-option label="懒加载图片 (data-src)" value="data-src" />
            <el-option label="值 (value)" value="value" />
            <el-option label="标题 (title)" value="title" />
            <el-option label="alt 文本 (alt)" value="alt" />
          </el-select>
        </div>
        <div class="prop-group">
          <div class="prop-label">输出变量名 <span class="required">*</span></div>
          <el-input
            v-model="localData.outputVar"
            size="small"
            placeholder="extracted"
            @change="onDataChange"
          />
        </div>
        <div class="prop-group">
          <el-checkbox v-model="localData.multiple" @change="onDataChange">
            提取多个结果（返回数组）
          </el-checkbox>
        </div>
      </template>

      <!-- Video Extract Node -->
      <template v-if="node.type === 'video_extract'">
        <div class="prop-group video-node-hint">
          <el-icon color="#E040FB"><VideoCamera /></el-icon>
          <span>视频提取节点：从网页中提取视频资源链接</span>
        </div>
        <div class="prop-group">
          <div class="prop-label">提取方式</div>
          <el-select v-model="localData.extractType" size="small" @change="onDataChange">
            <el-option label="🔍 自动检测（推荐）" value="auto" />
            <el-option label="📺 HLS 流 (m3u8)" value="m3u8" />
            <el-option label="🎬 MP4 直链" value="mp4" />
            <el-option label="🖼️ 内嵌 iframe 视频" value="iframe" />
          </el-select>
          <div class="prop-hint">
            <template v-if="localData.extractType === 'auto'">自动检测页面中的 video、source 标签及 m3u8/mp4 链接</template>
            <template v-else-if="localData.extractType === 'm3u8'">提取 HLS 流媒体播放列表链接（.m3u8）</template>
            <template v-else-if="localData.extractType === 'mp4'">提取直接可下载的 MP4 视频链接</template>
            <template v-else-if="localData.extractType === 'iframe'">提取 iframe 内嵌的视频播放器链接</template>
          </div>
        </div>
        <div class="prop-group">
          <div class="prop-label">提取来源</div>
          <el-radio-group v-model="localData.extractFrom" size="small" @change="onDataChange">
            <el-radio-button value="page">从页面 HTML 提取</el-radio-button>
            <el-radio-button value="direct">直接 URL 解析</el-radio-button>
          </el-radio-group>
        </div>
        <div class="prop-group">
          <div class="prop-label">画质偏好</div>
          <el-select v-model="localData.quality" size="small" @change="onDataChange">
            <el-option label="最高画质" value="best" />
            <el-option label="1080p" value="1080p" />
            <el-option label="720p" value="720p" />
            <el-option label="480p" value="480p" />
            <el-option label="360p" value="360p" />
            <el-option label="最低画质" value="worst" />
          </el-select>
        </div>
        <div class="prop-group">
          <div class="prop-label">自定义选择器（可选）</div>
          <el-input
            v-model="videoSelectorInput"
            size="small"
            placeholder="video, source[src], .video-player"
            @change="onVideoSelectorChange"
          />
          <div class="prop-hint">指定包含视频的元素选择器，留空则自动检测</div>
        </div>
        <div class="prop-group">
          <div class="prop-label">输出变量名 <span class="required">*</span></div>
          <el-input
            v-model="localData.outputVar"
            size="small"
            placeholder="videoUrl"
            @change="onDataChange"
          />
        </div>
      </template>

      <!-- Anti-Crawl Node -->
      <template v-if="node.type === 'anti_crawl'">
        <div class="prop-group anticrawl-node-hint">
          <el-icon color="#FF6D00"><Lock /></el-icon>
          <span>反爬虫处理节点：在请求前执行反爬虫策略</span>
        </div>
        <div class="prop-group">
          <div class="prop-label">处理策略</div>
          <el-select v-model="localData.strategy" size="small" @change="onDataChange">
            <el-option label="⏱️ 随机延迟" value="delay" />
            <el-option label="🔄 轮换 User-Agent" value="rotate_ua" />
            <el-option label="🍪 注入 Cookie" value="cookie" />
            <el-option label="🛡️ 综合策略（延迟+UA轮换）" value="combined" />
          </el-select>
        </div>

        <!-- Delay config -->
        <template v-if="localData.strategy === 'delay' || localData.strategy === 'combined'">
          <div class="prop-group">
            <div class="prop-label">最小延迟 (ms)</div>
            <el-input-number
              v-model="localData.delayMin"
              size="small"
              :min="100"
              :max="30000"
              :step="100"
              @change="(v: number) => { localData.delayMin = v; onDataChange() }"
            />
          </div>
          <div class="prop-group">
            <div class="prop-label">最大延迟 (ms)</div>
            <el-input-number
              v-model="localData.delayMax"
              size="small"
              :min="100"
              :max="60000"
              :step="100"
              @change="(v: number) => { localData.delayMax = v; onDataChange() }"
            />
          </div>
          <div class="prop-hint" style="padding: 0 0 8px 0; color: #909399; font-size: 11px;">
            每次执行前随机等待 {{ localData.delayMin || 1000 }}ms ~ {{ localData.delayMax || 3000 }}ms
          </div>
        </template>

        <!-- UA rotation config -->
        <template v-if="localData.strategy === 'rotate_ua' || localData.strategy === 'combined'">
          <div class="prop-group">
            <div class="prop-label">UA 池（每行一个）</div>
            <el-input
              v-model="uaPoolText"
              type="textarea"
              size="small"
              :rows="4"
              placeholder="每行输入一个 User-Agent..."
              @change="onUaPoolChange"
            />
            <el-button size="small" @click="fillDefaultUAs" style="margin-top: 4px">
              填入默认 UA 池
            </el-button>
          </div>
        </template>

        <!-- Cookie config -->
        <template v-if="localData.strategy === 'cookie'">
          <div class="prop-group">
            <div class="prop-label">Cookie 字符串</div>
            <el-input
              v-model="localData.cookieStr"
              type="textarea"
              size="small"
              :rows="3"
              placeholder="key1=value1; key2=value2"
              @change="onDataChange"
            />
            <div class="prop-hint">从浏览器开发者工具中复制 Cookie 请求头的值</div>
          </div>
        </template>
      </template>

      <!-- Loop Node -->
      <template v-if="node.type === 'loop'">
        <div class="prop-group">
          <div class="prop-label">数据源 <span class="required">*</span></div>
          <el-input
            v-model="localData.source"
            size="small"
            placeholder="${extracted} 或数字"
            @change="onDataChange"
          />
          <div class="prop-hint">引用变量用 ${变量名}，或填入数字表示循环次数</div>
        </div>
        <div class="prop-group">
          <div class="prop-label">循环变量名</div>
          <el-input
            v-model="localData.itemVar"
            size="small"
            placeholder="item"
            @change="onDataChange"
          />
        </div>
        <div class="prop-group">
          <div class="prop-label">下标变量名</div>
          <el-input
            v-model="localData.indexVar"
            size="small"
            placeholder="index"
            @change="onDataChange"
          />
        </div>
      </template>

      <!-- Condition Node -->
      <template v-if="node.type === 'condition'">
        <div class="prop-group">
          <div class="prop-label">条件表达式 <span class="required">*</span></div>
          <el-input
            v-model="localData.expression"
            size="small"
            placeholder="item.length > 0"
            @change="onDataChange"
          />
          <div class="prop-hint">支持 JavaScript 表达式，可引用流程变量（如 ${item}）</div>
        </div>
      </template>

      <!-- Variable Node -->
      <template v-if="node.type === 'variable'">
        <div class="prop-group">
          <div class="prop-label">变量名 <span class="required">*</span></div>
          <el-input
            v-model="localData.name"
            size="small"
            placeholder="myVar"
            @change="onDataChange"
          />
        </div>
        <div class="prop-group">
          <div class="prop-label">变量值</div>
          <el-input
            v-model="localData.value"
            size="small"
            placeholder="常量或 ${表达式}"
            @change="onDataChange"
          />
        </div>
      </template>

      <!-- Output Node -->
      <template v-if="node.type === 'output'">
        <div class="prop-group">
          <div class="prop-label">输出字段</div>
          <div
            v-for="(item, idx) in localData.items"
            :key="idx"
            class="output-item"
          >
            <el-input
              v-model="item.name"
              size="small"
              placeholder="字段名"
              style="width: 80px"
              @change="onDataChange"
            />
            <span class="output-sep">:</span>
            <el-input
              v-model="item.value"
              size="small"
              placeholder="${item}"
              style="flex: 1"
              @change="onDataChange"
            />
            <el-button
              size="small"
              text
              type="danger"
              @click="removeOutputItem(Number(idx))"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button size="small" @click="addOutputItem" style="margin-top: 6px">
            <el-icon><Plus /></el-icon> 添加字段
          </el-button>
        </div>
        <div class="prop-group">
          <div class="prop-label">输出格式</div>
          <el-select v-model="localData.format" size="small" @change="onDataChange">
            <el-option label="JSON" value="json" />
            <el-option label="CSV" value="csv" />
            <el-option label="Excel" value="excel" />
          </el-select>
        </div>
      </template>

      <!-- Delete Node -->
      <div class="prop-actions">
        <el-button size="small" type="danger" plain @click="emit('delete-node', node.id)">
          <el-icon><Delete /></el-icon> 删除节点
        </el-button>
      </div>
    </div>
  </div>
  <div v-else class="no-selection">
    <el-icon :size="32" color="#c0c4cc"><Select /></el-icon>
    <p>点击节点查看属性</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Close, Delete, Plus, Select, VideoCamera, Lock } from '@element-plus/icons-vue'
import type { FlowNode } from '../../types'
import { NODE_TYPE_MAP } from '../../types'

const props = defineProps<{
  node: FlowNode | null
  suggestedSelector?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update-data', nodeId: string, data: Record<string, any>): void
  (e: 'update-label', nodeId: string, label: string): void
  (e: 'delete-node', nodeId: string): void
}>()

const localLabel = ref('')
const localData = ref<Record<string, any>>({})
const uaPoolText = ref('')
const videoSelectorInput = ref('')

const nodeConfig = computed(() => props.node ? NODE_TYPE_MAP.get(props.node.type) : null)

watch(
  () => props.node,
  (node) => {
    if (node) {
      localLabel.value = node.label
      localData.value = JSON.parse(JSON.stringify(node.data))
      // Sync UA pool text
      if (node.type === 'anti_crawl' && node.data.userAgents) {
        uaPoolText.value = node.data.userAgents.join('\n')
      }
      // Sync video selector
      if (node.type === 'video_extract' && node.data.selectors) {
        videoSelectorInput.value = node.data.selectors.join(', ')
      }
    }
  },
  { immediate: true, deep: true }
)

function onLabelChange() {
  if (props.node) {
    emit('update-label', props.node.id, localLabel.value)
  }
}

function onDataChange() {
  if (props.node) {
    emit('update-data', props.node.id, { ...localData.value })
  }
}

function addOutputItem() {
  if (!localData.value.items) localData.value.items = []
  localData.value.items.push({ name: 'field', value: '${item}' })
  onDataChange()
}

function removeOutputItem(idx: number) {
  localData.value.items.splice(idx, 1)
  onDataChange()
}

function applySuggestion() {
  if (props.suggestedSelector) {
    localData.value.selector = props.suggestedSelector
    onDataChange()
  }
}

function addHeader() {
  if (!localData.value.headers) localData.value.headers = {}
  localData.value.headers['X-Custom-Header'] = ''
  onDataChange()
}

function removeHeader(key: string) {
  delete localData.value.headers[key]
  onDataChange()
}

function updateHeaderKey(oldKey: string, newKey: string) {
  if (oldKey === newKey) return
  const val = localData.value.headers[oldKey]
  delete localData.value.headers[oldKey]
  localData.value.headers[newKey] = val
  onDataChange()
}

function onUaPoolChange() {
  localData.value.userAgents = uaPoolText.value
    .split('\n')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)
  onDataChange()
}

function fillDefaultUAs() {
  const defaults = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  ]
  uaPoolText.value = defaults.join('\n')
  onUaPoolChange()
}

function onVideoSelectorChange() {
  localData.value.selectors = videoSelectorInput.value
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)
  onDataChange()
}
</script>

<style scoped>
.node-properties {
  height: 100%;
  overflow-y: auto;
  background: #fff;
}

.props-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  position: sticky;
  top: 0;
  z-index: 1;
}

.props-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.props-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.prop-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 0 4px;
  border-top: 1px solid #f0f0f0;
  margin-top: 4px;
}

.prop-group {
  margin-bottom: 8px;
}

.prop-label {
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
  font-weight: 500;
}

.required {
  color: #F56C6C;
}

.prop-hint {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 3px;
  line-height: 1.4;
}

.suggestion {
  margin-top: 4px;
  cursor: pointer;
}

.output-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.output-sep {
  color: #909399;
  font-size: 12px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.prop-actions {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.no-selection {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  gap: 8px;
  font-size: 13px;
}

.video-node-hint,
.anticrawl-node-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
  background: #f9f0ff;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #e9d0ff;
  margin-bottom: 4px;
}

.anticrawl-node-hint {
  background: #fff3e0;
  border-color: #ffe0b2;
}
</style>
