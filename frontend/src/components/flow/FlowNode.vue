<template>
  <div
    class="flow-node"
    :class="[`node-${data.nodeType}`, { selected: selected }]"
    :style="{ '--node-color': nodeConfig?.color || '#409EFF' }"
  >
    <Handle type="target" :position="Position.Left" class="handle handle-target" />

    <div class="node-header">
      <el-icon class="node-icon" :size="13">
        <component :is="nodeConfig?.icon || 'Document'" />
      </el-icon>
      <span class="node-type-label">{{ nodeConfig?.label || data.nodeType }}</span>
      <div class="node-status-dot" />
    </div>

    <div class="node-body">
      <div class="node-label">{{ label }}</div>

      <!-- Fetch node meta -->
      <div v-if="data.url && data.nodeType === 'fetch'" class="node-meta">
        <el-icon :size="10"><Link /></el-icon>
        {{ truncate(data.url, 26) }}
      </div>
      <div v-if="data.nodeType === 'fetch' && data.userAgent" class="node-meta node-meta-badge">
        🛡️ UA 伪装
      </div>
      <div v-if="data.nodeType === 'fetch' && data.proxy" class="node-meta node-meta-badge">
        🌐 代理
      </div>
      <div v-if="data.nodeType === 'fetch' && data.retries > 0" class="node-meta node-meta-badge">
        🔄 重试 {{ data.retries }}次
      </div>

      <!-- Extract node meta -->
      <div v-if="data.selector && (data.nodeType === 'extract')" class="node-meta">
        <el-icon :size="10"><Aim /></el-icon>
        {{ truncate(data.selector, 26) }}
      </div>

      <!-- Video extract node meta -->
      <div v-if="data.nodeType === 'video_extract'" class="node-meta">
        <el-icon :size="10"><VideoCamera /></el-icon>
        {{ videoExtractLabel }}
      </div>
      <div v-if="data.nodeType === 'video_extract' && data.quality" class="node-meta node-meta-badge">
        📺 {{ data.quality }}
      </div>

      <!-- Anti-crawl node meta -->
      <div v-if="data.nodeType === 'anti_crawl'" class="node-meta">
        <el-icon :size="10"><Lock /></el-icon>
        {{ antiCrawlLabel }}
      </div>
      <div v-if="data.nodeType === 'anti_crawl' && (data.strategy === 'delay' || data.strategy === 'combined')" class="node-meta node-meta-badge">
        ⏱️ {{ data.delayMin || 1000 }}-{{ data.delayMax || 3000 }}ms
      </div>

      <!-- Condition node meta -->
      <div v-if="data.expression" class="node-meta">
        <el-icon :size="10"><Switch /></el-icon>
        {{ truncate(data.expression, 26) }}
      </div>

      <!-- Loop node meta -->
      <div v-if="data.source" class="node-meta">
        <el-icon :size="10"><Refresh /></el-icon>
        {{ truncate(data.source, 26) }}
      </div>

      <!-- Variable node meta -->
      <div v-if="data.name && data.nodeType === 'variable'" class="node-meta">
        <el-icon :size="10"><Edit /></el-icon>
        {{ data.name }} = {{ truncate(data.value || '', 18) }}
      </div>
    </div>

    <Handle
      v-if="data.nodeType !== 'end'"
      type="source"
      :position="Position.Right"
      class="handle handle-source"
    />
    <Handle
      v-if="data.nodeType === 'condition'"
      id="false"
      type="source"
      :position="Position.Bottom"
      class="handle handle-source handle-bottom"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { Link, Aim, Switch, Refresh, Edit, VideoCamera, Lock } from '@element-plus/icons-vue'
import { NODE_TYPE_MAP } from '../../types'

const props = defineProps<{
  id: string
  label: string
  selected: boolean
  data: Record<string, any>
}>()

const nodeConfig = computed(() => NODE_TYPE_MAP.get(props.data.nodeType))

const videoExtractLabel = computed(() => {
  const typeMap: Record<string, string> = {
    auto: '自动检测',
    m3u8: 'HLS 流 (m3u8)',
    mp4: 'MP4 直链',
    iframe: 'iframe 视频',
  }
  return typeMap[props.data.extractType] || '自动检测'
})

const antiCrawlLabel = computed(() => {
  const strategyMap: Record<string, string> = {
    delay: '随机延迟',
    rotate_ua: 'UA 轮换',
    cookie: 'Cookie 注入',
    combined: '综合策略',
  }
  return strategyMap[props.data.strategy] || '随机延迟'
})

function truncate(str: string, len: number) {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}
</script>

<style scoped>
.flow-node {
  background: #fff;
  border: 2px solid var(--node-color, #409EFF);
  border-radius: 10px;
  min-width: 155px;
  max-width: 215px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s, transform 0.15s;
  cursor: pointer;
  overflow: hidden;
}

.flow-node:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.flow-node.selected {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--node-color, #409EFF) 30%, transparent),
              0 6px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  background: var(--node-color, #409EFF);
  color: white;
}

.node-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.node-type-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  flex: 1;
  text-transform: uppercase;
}

.node-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.node-body {
  padding: 8px 10px;
  background: #fff;
}

.node-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 3px;
  line-height: 1.3;
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #909399;
  font-family: 'SF Mono', 'Fira Code', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
  background: #f5f7fa;
  padding: 2px 5px;
  border-radius: 3px;
}

.node-meta-badge {
  font-family: inherit;
  background: color-mix(in srgb, var(--node-color, #409EFF) 12%, white);
  color: var(--node-color, #409EFF);
  border: 1px solid color-mix(in srgb, var(--node-color, #409EFF) 25%, transparent);
}

.handle {
  width: 12px !important;
  height: 12px !important;
  background: var(--node-color, #409EFF) !important;
  border: 2px solid white !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
  transition: transform 0.15s !important;
}

.handle:hover {
  transform: scale(1.3) !important;
}

.handle-bottom {
  bottom: -7px !important;
  top: auto !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
}

.handle-bottom:hover {
  transform: translateX(-50%) scale(1.3) !important;
}
</style>
