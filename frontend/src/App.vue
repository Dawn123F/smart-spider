<template>
  <div class="app">
    <header class="app-header">
      <div class="header-logo">
        <span class="logo-icon">🕷️</span>
        <span class="logo-text">智蛛</span>
        <span class="logo-sub">AI 爬虫流程设计器</span>
      </div>
      <div class="header-center">
        <el-tag v-if="flowStore.currentFlow" type="info" size="small" class="flow-tag">
          <el-icon><Connection /></el-icon>
          {{ flowStore.currentFlow.name }}
        </el-tag>
        <el-tag v-if="flowStore.isDirty" type="warning" size="small">未保存</el-tag>
      </div>
      <div class="header-right">
        <el-tooltip content="快捷键: Ctrl+S 保存">
          <el-tag size="small" effect="plain" style="background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); cursor: default;">Ctrl+S 保存</el-tag>
        </el-tooltip>
        <el-tooltip content="关于智蛛">
          <el-button text size="small" style="color: rgba(255,255,255,0.6)" @click="showAbout = true">
            <el-icon><InfoFilled /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </header>
    <main class="app-main">
      <EditorView />
    </main>

    <!-- About Dialog -->
    <el-dialog v-model="showAbout" title="关于智蛛" width="420px" align-center>
      <div class="about-content">
        <div class="about-logo">🕷️</div>
        <h2 class="about-title">智蛛</h2>
        <p class="about-sub">AI 爬虫流程设计器</p>
        <el-divider />
        <div class="about-features">
          <div class="feature-item">
            <el-icon color="#409EFF"><Connection /></el-icon>
            <span>可视化流程编辑器，拖拽式节点设计</span>
          </div>
          <div class="feature-item">
            <el-icon color="#E6A23C"><Monitor /></el-icon>
            <span>内嵌网页预览，点击选择元素生成选择器</span>
          </div>
          <div class="feature-item">
            <el-icon color="#67C23A"><MagicStick /></el-icon>
            <span>AI 智能助手，自动生成爬虫流程配置</span>
          </div>
          <div class="feature-item">
            <el-icon color="#F56C6C"><VideoPlay /></el-icon>
            <span>一键运行流程，实时查看爬取结果</span>
          </div>
        </div>
        <el-divider />
        <p class="about-tech">技术栈：Vue 3 + TypeScript + Node.js + OpenAI</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showAbout = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Connection, InfoFilled, Monitor, MagicStick, VideoPlay } from '@element-plus/icons-vue'
import { useFlowStore } from './stores/flowStore'
import EditorView from './views/EditorView.vue'

const flowStore = useFlowStore()
const showAbout = ref(false)
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 48px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
  z-index: 100;
}
.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-icon { font-size: 22px; }
.logo-text {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.logo-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  letter-spacing: 1px;
  margin-left: 4px;
  border-left: 1px solid rgba(255,255,255,0.2);
  padding-left: 8px;
}
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}
.flow-tag {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-right { display: flex; align-items: center; gap: 4px; }
.app-main { flex: 1; overflow: hidden; }

.about-content {
  text-align: center;
}
.about-logo {
  font-size: 48px;
  margin-bottom: 8px;
}
.about-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.about-sub {
  color: #909399;
  font-size: 13px;
  margin: 0;
}
.about-features {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #606266;
}
.about-tech {
  font-size: 12px;
  color: #909399;
  margin: 0;
}
</style>
