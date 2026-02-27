import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SpiderFlow, FlowNode, FlowEdge, ExecutionResult, ExecutionLog } from '../types'
import { flowApi } from '../api'
import { v4 as uuidv4 } from 'uuid'

export const useFlowStore = defineStore('flow', () => {
  // State
  const flows = ref<SpiderFlow[]>([])
  const currentFlow = ref<SpiderFlow | null>(null)
  const selectedNodeId = ref<string | null>(null)
  const isRunning = ref(false)
  const executionResult = ref<ExecutionResult | null>(null)
  const executionLogs = ref<ExecutionLog[]>([])
  const isDirty = ref(false)

  // Getters
  const selectedNode = computed(() =>
    currentFlow.value?.nodes.find(n => n.id === selectedNodeId.value) || null
  )

  // Actions
  async function loadFlows() {
    const res = await flowApi.list()
    flows.value = res.data.data
  }

  async function loadFlow(id: string) {
    const res = await flowApi.get(id)
    currentFlow.value = res.data.data
    isDirty.value = false
  }

  async function createFlow(name: string = '新建爬虫流程') {
    const initialNodes: FlowNode[] = [
      {
        id: uuidv4(),
        type: 'start',
        label: '开始',
        position: { x: 100, y: 200 },
        data: {},
      },
    ]
    const res = await flowApi.create({ name, nodes: initialNodes, edges: [] })
    const newFlow = res.data.data
    flows.value.unshift(newFlow)
    currentFlow.value = newFlow
    isDirty.value = false
    return newFlow
  }

  async function saveFlow() {
    if (!currentFlow.value) return
    const res = await flowApi.update(currentFlow.value.id, {
      name: currentFlow.value.name,
      description: currentFlow.value.description,
      nodes: currentFlow.value.nodes,
      edges: currentFlow.value.edges,
    })
    currentFlow.value = res.data.data
    const idx = flows.value.findIndex(f => f.id === currentFlow.value!.id)
    if (idx >= 0) flows.value[idx] = currentFlow.value
    isDirty.value = false
  }

  async function deleteFlow(id: string) {
    await flowApi.delete(id)
    flows.value = flows.value.filter(f => f.id !== id)
    if (currentFlow.value?.id === id) {
      currentFlow.value = null
    }
  }

  async function runFlow() {
    if (!currentFlow.value) return
    isRunning.value = true
    executionResult.value = null
    executionLogs.value = []

    try {
      const res = await flowApi.runPreview(
        currentFlow.value.nodes,
        currentFlow.value.edges
      )
      executionResult.value = res.data.data
      executionLogs.value = res.data.data.logs || []
    } catch (error: any) {
      executionResult.value = {
        success: false,
        data: [],
        logs: [],
        error: error.message,
      }
    } finally {
      isRunning.value = false
    }
  }

  function updateNodes(nodes: FlowNode[]) {
    if (!currentFlow.value) return
    currentFlow.value.nodes = nodes
    isDirty.value = true
  }

  function updateEdges(edges: FlowEdge[]) {
    if (!currentFlow.value) return
    currentFlow.value.edges = edges
    isDirty.value = true
  }

  function addNode(node: FlowNode) {
    if (!currentFlow.value) return
    currentFlow.value.nodes.push(node)
    isDirty.value = true
  }

  function updateNodeData(nodeId: string, data: Record<string, any>) {
    if (!currentFlow.value) return
    const node = currentFlow.value.nodes.find(n => n.id === nodeId)
    if (node) {
      node.data = { ...node.data, ...data }
      isDirty.value = true
    }
  }

  function updateNodeLabel(nodeId: string, label: string) {
    if (!currentFlow.value) return
    const node = currentFlow.value.nodes.find(n => n.id === nodeId)
    if (node) {
      node.label = label
      isDirty.value = true
    }
  }

  function removeNode(nodeId: string) {
    if (!currentFlow.value) return
    currentFlow.value.nodes = currentFlow.value.nodes.filter(n => n.id !== nodeId)
    currentFlow.value.edges = currentFlow.value.edges.filter(
      e => e.source !== nodeId && e.target !== nodeId
    )
    if (selectedNodeId.value === nodeId) selectedNodeId.value = null
    isDirty.value = true
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  function applyGeneratedFlow(nodes: FlowNode[], edges: FlowEdge[]) {
    if (!currentFlow.value) return
    currentFlow.value.nodes = nodes
    currentFlow.value.edges = edges
    isDirty.value = true
  }

  return {
    flows,
    currentFlow,
    selectedNodeId,
    selectedNode,
    isRunning,
    executionResult,
    executionLogs,
    isDirty,
    loadFlows,
    loadFlow,
    createFlow,
    saveFlow,
    deleteFlow,
    runFlow,
    updateNodes,
    updateEdges,
    addNode,
    updateNodeData,
    updateNodeLabel,
    removeNode,
    selectNode,
    applyGeneratedFlow,
  }
})
