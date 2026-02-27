<template>
  <div class="flow-editor" @keydown.ctrl.s.prevent="flowStore.saveFlow" tabindex="0">
    <!-- Toolbar -->
    <div class="flow-toolbar">
      <div class="toolbar-left">
        <el-input
          v-if="flowStore.currentFlow"
          v-model="flowStore.currentFlow.name"
          size="small"
          style="width: 180px"
          placeholder="流程名称"
        />
        <el-tag v-if="flowStore.isDirty" type="warning" size="small" effect="light">
          <el-icon><Edit /></el-icon> 未保存
        </el-tag>
      </div>
      <div class="toolbar-center">
        <el-button-group>
          <el-button size="small" @click="onFitView" title="适应视图 (F)">
            <el-icon><FullScreen /></el-icon>
          </el-button>
          <el-button size="small" @click="onZoomIn" title="放大">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
          <el-button size="small" @click="onZoomOut" title="缩小">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
        </el-button-group>
        <el-divider direction="vertical" />
        <el-button
          size="small"
          :disabled="!flowStore.isDirty"
          @click="flowStore.saveFlow"
          title="保存 (Ctrl+S)"
        >
          <el-icon><DocumentChecked /></el-icon> 保存
        </el-button>
        <el-button
          size="small"
          type="primary"
          :loading="flowStore.isRunning"
          @click="flowStore.runFlow"
          title="运行流程"
        >
          <el-icon><VideoPlay /></el-icon>
          {{ flowStore.isRunning ? '运行中...' : '运行' }}
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-tag
          v-if="flowStore.executionResult"
          :type="flowStore.executionResult.success ? 'success' : 'danger'"
          size="small"
          effect="light"
        >
          <el-icon>
            <component :is="flowStore.executionResult.success ? 'Check' : 'Close'" />
          </el-icon>
          {{ flowStore.executionResult.success
            ? `成功 · ${flowStore.executionResult.data.length} 条`
            : '执行失败' }}
        </el-tag>
        <el-tag v-if="flowStore.currentFlow" type="info" size="small" effect="plain">
          {{ flowStore.currentFlow.nodes.length }} 节点
        </el-tag>
      </div>
    </div>

    <!-- Main area -->
    <div class="flow-main">
      <!-- Node Panel -->
      <NodePanel @add-node="onAddNode" />

      <!-- Canvas -->
      <div
        class="flow-canvas"
        @dragover.prevent
        @drop="onDrop"
        ref="canvasRef"
      >
        <VueFlow
          v-model:nodes="vfNodes"
          v-model:edges="vfEdges"
          :node-types="nodeTypes"
          :default-edge-options="{
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#409EFF', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#409EFF' }
          }"
          :connect-on-click="false"
          :snap-to-grid="true"
          :snap-grid="[15, 15]"
          fit-view-on-init
          @node-click="onNodeClick"
          @pane-click="onPaneClick"
          @connect="onConnect"
          @nodes-change="onNodesChange"
          @edges-change="onEdgesChange"
          ref="vfRef"
        >
          <Background pattern-color="#e8ecf0" :gap="20" :size="1" />
          <Controls show-interactive />
          <MiniMap
            :node-color="getMiniMapColor"
            :height="100"
            :width="160"
            :node-stroke-width="3"
          />

          <!-- Empty state -->
          <template #empty>
            <div class="canvas-empty">
              <div class="canvas-empty-icon">🕷️</div>
              <p class="canvas-empty-title">从左侧拖拽节点到此处</p>
              <p class="canvas-empty-hint">或使用右侧 AI 助手自动生成流程</p>
            </div>
          </template>
        </VueFlow>
      </div>

      <!-- Properties Panel -->
      <NodeProperties
        :node="flowStore.selectedNode"
        :suggested-selector="suggestedSelector"
        @close="flowStore.selectNode(null)"
        @update-data="flowStore.updateNodeData"
        @update-label="flowStore.updateNodeLabel"
        @delete-node="flowStore.removeNode"
      />
    </div>

    <!-- Execution Result Panel -->
    <transition name="slide-up">
      <div v-if="flowStore.executionResult" class="result-panel">
        <div class="result-header">
          <div class="result-title">
            <el-icon :color="flowStore.executionResult.success ? '#67C23A' : '#F56C6C'">
              <component :is="flowStore.executionResult.success ? 'CircleCheck' : 'CircleClose'" />
            </el-icon>
            <span>执行结果</span>
            <el-tag
              :type="flowStore.executionResult.success ? 'success' : 'danger'"
              size="small"
              effect="light"
            >
              {{ flowStore.executionResult.success ? `${flowStore.executionResult.data.length} 条数据` : '失败' }}
            </el-tag>
          </div>
          <el-button size="small" text @click="flowStore.executionResult = null">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <el-tabs size="small" class="result-tabs">
          <el-tab-pane label="数据">
            <div class="result-data">
              <pre>{{ JSON.stringify(flowStore.executionResult.data, null, 2) }}</pre>
            </div>
          </el-tab-pane>
          <el-tab-pane :label="`日志 (${flowStore.executionLogs.length})`">
            <div class="result-logs">
              <div
                v-for="(log, i) in flowStore.executionLogs"
                :key="i"
                class="log-entry"
                :class="`log-${log.level}`"
              >
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-level">{{ log.level.toUpperCase() }}</span>
                <span class="log-msg">{{ log.message }}</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import {
  FullScreen, ZoomIn, ZoomOut, DocumentChecked, VideoPlay, Close, Edit
} from '@element-plus/icons-vue'
import { v4 as uuidv4 } from 'uuid'
import { useFlowStore } from '../../stores/flowStore'
import { NODE_TYPE_MAP } from '../../types'
import type { NodeTypeConfig, FlowNode, FlowEdge } from '../../types'
import NodePanel from './NodePanel.vue'
import NodeProperties from './NodeProperties.vue'
import FlowNodeComp from './FlowNode.vue'

const flowStore = useFlowStore()
const canvasRef = ref<HTMLElement>()
const suggestedSelector = ref('')

const { fitView, zoomIn, zoomOut, project } = useVueFlow()

// Register custom node types
const nodeTypes: Record<string, any> = {
  start: markRaw(FlowNodeComp),
  fetch: markRaw(FlowNodeComp),
  extract: markRaw(FlowNodeComp),
  loop: markRaw(FlowNodeComp),
  condition: markRaw(FlowNodeComp),
  variable: markRaw(FlowNodeComp),
  output: markRaw(FlowNodeComp),
  end: markRaw(FlowNodeComp),
}

// Convert flow nodes to VueFlow format
const vfNodes = computed({
  get() {
    return (flowStore.currentFlow?.nodes || []).map(n => ({
      id: n.id,
      type: n.type,
      label: n.label,
      position: n.position,
      data: { ...n.data, nodeType: n.type },
      selected: n.id === flowStore.selectedNodeId,
    }))
  },
  set(nodes: any[]) {
    flowStore.updateNodes(
      nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label || n.data?.label || '',
        position: n.position,
        data: n.data || {},
      }))
    )
  },
})

const vfEdges = computed({
  get() {
    return (flowStore.currentFlow?.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#409EFF', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#409EFF' },
    }));
  },
  set(edges: any[]) {
    flowStore.updateEdges(
      edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
      }))
    )
  },
})

function onNodeClick(event: any) {
  flowStore.selectNode(event.node.id)
}

function onPaneClick() {
  flowStore.selectNode(null)
}

function onConnect(params: any) {
  const edge: FlowEdge = {
    id: uuidv4(),
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
  }
  const edges = [...(flowStore.currentFlow?.edges || []), edge]
  flowStore.updateEdges(edges)
}

function onNodesChange(changes: any[]) {
  if (!flowStore.currentFlow) return
  const updatedNodes = [...flowStore.currentFlow.nodes]
  for (const change of changes) {
    if (change.type === 'position' && change.position) {
      const node = updatedNodes.find(n => n.id === change.id)
      if (node) node.position = change.position
    }
    if (change.type === 'remove') {
      const idx = updatedNodes.findIndex(n => n.id === change.id)
      if (idx >= 0) updatedNodes.splice(idx, 1)
    }
  }
  flowStore.updateNodes(updatedNodes)
}

function onEdgesChange(changes: any[]) {
  if (!flowStore.currentFlow) return
  const updatedEdges = [...flowStore.currentFlow.edges]
  for (const change of changes) {
    if (change.type === 'remove') {
      const idx = updatedEdges.findIndex(e => e.id === change.id)
      if (idx >= 0) updatedEdges.splice(idx, 1)
    }
  }
  flowStore.updateEdges(updatedEdges)
}

function onAddNode(nodeType: NodeTypeConfig) {
  const node: FlowNode = {
    id: uuidv4(),
    type: nodeType.type,
    label: nodeType.label,
    position: { x: 300 + Math.random() * 120, y: 200 + Math.random() * 120 },
    data: { ...nodeType.defaultData },
  }
  flowStore.addNode(node)
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const data = event.dataTransfer?.getData('application/zhizhu-node')
  if (!data) return

  const nodeType: NodeTypeConfig = JSON.parse(data)
  const bounds = canvasRef.value?.getBoundingClientRect()
  if (!bounds) return

  const position = project({
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  })

  const node: FlowNode = {
    id: uuidv4(),
    type: nodeType.type,
    label: nodeType.label,
    position,
    data: { ...nodeType.defaultData },
  }
  flowStore.addNode(node)
}

function onFitView() {
  fitView({ padding: 0.2, duration: 300 })
}

function onZoomIn() {
  zoomIn({ duration: 200 })
}

function onZoomOut() {
  zoomOut({ duration: 200 })
}

function getMiniMapColor(node: any) {
  return NODE_TYPE_MAP.get(node.type)?.color || '#409EFF'
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
</style>

<style scoped>
.flow-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #f0f2f5;
  outline: none;
}

.flow-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 14px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  gap: 12px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  z-index: 10;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.flow-canvas {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.canvas-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  pointer-events: none;
}

.canvas-empty-icon {
  font-size: 48px;
  opacity: 0.25;
}

.canvas-empty-title {
  font-size: 15px;
  color: #c0c4cc;
  font-weight: 500;
  margin: 0;
}

.canvas-empty-hint {
  font-size: 12px;
  color: #dcdfe6;
  margin: 0;
}

.result-panel {
  flex-shrink: 0;
  height: 220px;
  background: #fff;
  border-top: 2px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  flex-shrink: 0;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.result-tabs {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.result-data,
.result-logs {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  font-size: 12px;
  max-height: 155px;
}

.result-data pre {
  margin: 0;
  font-family: 'SF Mono', 'Fira Code', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: #303133;
  font-size: 11px;
}

.log-entry {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  border-bottom: 1px solid #f5f5f5;
}

.log-info { color: #606266; }
.log-warn { color: #E6A23C; background: #fdf6ec; }
.log-error { color: #F56C6C; background: #fef0f0; }

.log-time { color: #909399; flex-shrink: 0; }
.log-level { font-weight: 700; width: 42px; flex-shrink: 0; }
.log-msg { flex: 1; }

/* Slide up animation */
.slide-up-enter-active {
  animation: slideUp 0.25s ease;
}

.slide-up-leave-active {
  animation: slideUp 0.2s ease reverse;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
