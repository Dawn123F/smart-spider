<template>
  <div class="node-panel">
    <div class="panel-title">
      <el-icon :size="14" color="#409EFF"><Grid /></el-icon>
      节点库
    </div>
    <div class="node-list">
      <div
        v-for="group in nodeGroups"
        :key="group.label"
        class="node-group"
      >
        <div class="group-label">{{ group.label }}</div>
        <div
          v-for="nodeType in group.nodes"
          :key="nodeType.type"
          class="node-item"
          :style="{ '--color': nodeType.color }"
          draggable="true"
          @dragstart="onDragStart($event, nodeType)"
          @click="emit('add-node', nodeType)"
        >
          <div class="node-item-icon">
            <el-icon :size="15" :color="nodeType.color">
              <component :is="nodeType.icon" />
            </el-icon>
          </div>
          <div class="node-item-info">
            <div class="node-item-label">{{ nodeType.label }}</div>
            <div class="node-item-desc">{{ nodeType.description }}</div>
          </div>
          <div class="node-item-drag-hint">
            <el-icon :size="10" color="#c0c4cc"><DCaret /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Grid, DCaret } from '@element-plus/icons-vue'
import { NODE_TYPES } from '../../types'
import type { NodeTypeConfig } from '../../types'

const emit = defineEmits<{
  (e: 'add-node', nodeType: NodeTypeConfig): void
}>()

const nodeGroups = [
  {
    label: '流程控制',
    nodes: NODE_TYPES.filter(n => ['start', 'end', 'condition', 'loop'].includes(n.type)),
  },
  {
    label: '数据处理',
    nodes: NODE_TYPES.filter(n => ['fetch', 'extract', 'video_extract', 'variable', 'output'].includes(n.type)),
  },
  {
    label: '反爬虫',
    nodes: NODE_TYPES.filter(n => ['anti_crawl'].includes(n.type)),
  },
]

function onDragStart(event: DragEvent, nodeType: NodeTypeConfig) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/zhizhu-node', JSON.stringify(nodeType))
    event.dataTransfer.effectAllowed = 'copy'
  }
}
</script>

<style scoped>
.node-panel {
  width: 185px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-title {
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.node-group {
  margin-bottom: 4px;
}

.group-label {
  font-size: 10px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 6px 8px 3px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 7px;
  cursor: grab;
  transition: all 0.15s;
  border: 1px solid transparent;
  margin-bottom: 2px;
  position: relative;
}

.node-item:hover {
  background: color-mix(in srgb, var(--color, #409EFF) 8%, white);
  border-color: color-mix(in srgb, var(--color, #409EFF) 30%, transparent);
}

.node-item:hover .node-item-drag-hint {
  opacity: 1;
}

.node-item:active {
  cursor: grabbing;
  transform: scale(0.97);
}

.node-item-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--color, #409EFF) 12%, white);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--color, #409EFF) 20%, transparent);
}

.node-item-info {
  flex: 1;
  min-width: 0;
}

.node-item-label {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  line-height: 1.3;
}

.node-item-desc {
  font-size: 10px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.node-item-drag-hint {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
</style>
