<template>
  <div class="editor-view">
    <!-- Flow Sidebar -->
    <FlowSidebar />

    <!-- Main Content -->
    <div class="editor-main">
      <!-- Tab Bar -->
      <div class="tab-bar">
        <div
          class="tab"
          :class="{ active: activeTab === 'flow' }"
          @click="activeTab = 'flow'"
        >
          <el-icon><Connection /></el-icon> 流程编辑
        </div>
        <div
          class="tab"
          :class="{ active: activeTab === 'preview' }"
          @click="activeTab = 'preview'"
        >
          <el-icon><Monitor /></el-icon> 网页预览
          <el-badge
            v-if="previewStore.selectedElements.length > 0"
            :value="previewStore.selectedElements.length"
            class="tab-badge"
          />
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <div v-show="activeTab === 'flow'" class="tab-pane">
          <div v-if="!flowStore.currentFlow" class="no-flow">
            <el-icon :size="64" color="#c0c4cc"><Connection /></el-icon>
            <h3>选择或创建一个爬虫流程</h3>
            <p>从左侧列表选择已有流程，或点击"新建"创建新流程</p>
            <el-button type="primary" @click="createNewFlow">
              <el-icon><Plus /></el-icon> 新建流程
            </el-button>
          </div>
          <FlowEditor v-else />
        </div>

        <div v-show="activeTab === 'preview'" class="tab-pane">
          <WebPreview />
        </div>
      </div>
    </div>

    <!-- AI Panel -->
    <div class="ai-sidebar" :class="{ collapsed: aiCollapsed }">
      <div class="ai-toggle" @click="aiCollapsed = !aiCollapsed">
        <el-icon :size="16">
          <component :is="aiCollapsed ? 'ArrowLeft' : 'ArrowRight'" />
        </el-icon>
        <span v-if="!aiCollapsed" class="ai-toggle-label">AI 助手</span>
      </div>
      <AIPanel v-if="!aiCollapsed" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Connection, Monitor, Plus } from '@element-plus/icons-vue'
import { useFlowStore } from '../stores/flowStore'
import { usePreviewStore } from '../stores/previewStore'
import FlowSidebar from '../components/common/FlowSidebar.vue'
import FlowEditor from '../components/flow/FlowEditor.vue'
import WebPreview from '../components/preview/WebPreview.vue'
import AIPanel from '../components/ai/AIPanel.vue'

const flowStore = useFlowStore()
const previewStore = usePreviewStore()

const activeTab = ref<'flow' | 'preview'>('flow')
const aiCollapsed = ref(false)

async function createNewFlow() {
  await flowStore.createFlow()
}
</script>

<style scoped>
.editor-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  flex-shrink: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  position: relative;
}

.tab:hover {
  color: #409EFF;
  background: #f5f7fa;
}

.tab.active {
  color: #409EFF;
  border-bottom-color: #409EFF;
  font-weight: 500;
}

.tab-badge {
  margin-left: 2px;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.tab-pane {
  height: 100%;
  overflow: hidden;
}

.no-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #909399;
}

.no-flow h3 {
  font-size: 18px;
  color: #606266;
  margin: 0;
}

.no-flow p {
  font-size: 14px;
  margin: 0;
}

.ai-sidebar {
  display: flex;
  flex-direction: row;
  border-left: 1px solid #e4e7ed;
  background: #fff;
  transition: width 0.2s;
  width: 320px;
  overflow: hidden;
}

.ai-sidebar.collapsed {
  width: 36px;
}

.ai-toggle {
  width: 36px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  gap: 8px;
  color: #606266;
  transition: background 0.15s;
}

.ai-toggle:hover {
  background: #ecf5ff;
  color: #409EFF;
}

.ai-toggle-label {
  font-size: 12px;
  writing-mode: vertical-lr;
  letter-spacing: 2px;
}

.ai-sidebar:not(.collapsed) .ai-toggle {
  width: 28px;
}

.ai-sidebar:not(.collapsed) > :last-child {
  flex: 1;
  overflow: hidden;
}
</style>
