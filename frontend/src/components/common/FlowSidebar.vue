<template>
  <div class="flow-sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">爬虫流程</span>
      <el-button size="small" type="primary" @click="createFlow">
        <el-icon><Plus /></el-icon> 新建
      </el-button>
    </div>

    <div class="sidebar-search">
      <el-input
        v-model="searchText"
        size="small"
        placeholder="搜索流程..."
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <div class="flow-list" v-loading="isLoading">
      <div v-if="filteredFlows.length === 0" class="flow-empty">
        <el-icon :size="24" color="#c0c4cc"><Document /></el-icon>
        <p>暂无流程</p>
      </div>

      <div
        v-for="flow in filteredFlows"
        :key="flow.id"
        class="flow-item"
        :class="{ active: currentFlowId === flow.id }"
        @click="selectFlow(flow.id)"
      >
        <div class="flow-item-icon">🕷️</div>
        <div class="flow-item-info">
          <div class="flow-item-name">{{ flow.name }}</div>
          <div class="flow-item-meta">
            {{ flow.nodes.length }} 个节点 · {{ formatDate(flow.updatedAt) }}
          </div>
        </div>
        <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, flow.id)" @click.stop>
          <el-button size="small" text @click.stop>
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="rename">重命名</el-dropdown-item>
              <el-dropdown-item command="duplicate">复制</el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <span style="color: #F56C6C">删除</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Search, Document, MoreFilled } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useFlowStore } from '../../stores/flowStore'

const flowStore = useFlowStore()
const searchText = ref('')
const isLoading = ref(false)

const currentFlowId = computed(() => flowStore.currentFlow?.id)

const filteredFlows = computed(() =>
  flowStore.flows.filter(f =>
    f.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
)

onMounted(async () => {
  isLoading.value = true
  try {
    await flowStore.loadFlows()
  } finally {
    isLoading.value = false
  }
})

async function createFlow() {
  try {
      const result = await ElMessageBox.prompt('请输入流程名称', '新建流程', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputValue: '新建爬虫流程',
    })
    const name = (result as any).value
    if (name) {
      await flowStore.createFlow(name)
    }
  } catch {}
}

async function selectFlow(id: string) {
  if (flowStore.isDirty) {
    try {
      await ElMessageBox.confirm('当前流程有未保存的更改，是否保存？', '提示', {
        confirmButtonText: '保存',
        cancelButtonText: '不保存',
        type: 'warning',
      })
      await flowStore.saveFlow()
    } catch {}
  }
  await flowStore.loadFlow(id)
}

async function handleCommand(command: string, flowId: string) {
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除此流程吗？此操作不可撤销。', '删除确认', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      })
      await flowStore.deleteFlow(flowId)
      ElMessage.success('流程已删除')
    } catch {}
  } else if (command === 'rename') {
    const flow = flowStore.flows.find(f => f.id === flowId)
    if (!flow) return
    try {
      const result2 = await ElMessageBox.prompt('请输入新名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: flow.name,
    })
    const name2 = (result2 as any).value
    if (name2) {
      const { flowApi } = await import('../../api')
      await flowApi.update(flowId, { name: name2 })
      await flowStore.loadFlows()
      if (flowStore.currentFlow?.id === flowId) {
        flowStore.currentFlow.name = name2
      }
    }
    } catch {}
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.flow-sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.sidebar-search {
  padding: 8px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.flow-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.flow-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #c0c4cc;
  font-size: 13px;
  gap: 8px;
}

.flow-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}

.flow-item:hover {
  background: #f5f7fa;
}

.flow-item.active {
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
}

.flow-item-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.flow-item-info {
  flex: 1;
  min-width: 0;
}

.flow-item-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-item-meta {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}
</style>
