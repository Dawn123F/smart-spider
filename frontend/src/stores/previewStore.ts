import { defineStore } from 'pinia'
import { ref } from 'vue'
import { proxyApi } from '../api'

export interface SelectedElement {
  selector: string
  tagName: string
  text: string
  attrs: Record<string, string>
  outerHTML: string
}

export const usePreviewStore = defineStore('preview', () => {
  const url = ref('')
  const html = ref('')
  const title = ref('')
  const isLoading = ref(false)
  const error = ref('')
  const selectedElements = ref<SelectedElement[]>([])
  const isSelectionMode = ref(false)

  async function fetchPage(targetUrl: string) {
    isLoading.value = true
    error.value = ''
    try {
      const res = await proxyApi.fetch(targetUrl)
      url.value = targetUrl
      html.value = res.data.data.html
      title.value = res.data.data.title
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || '加载失败'
    } finally {
      isLoading.value = false
    }
  }

  function addSelectedElement(element: SelectedElement) {
    // Avoid duplicates
    if (!selectedElements.value.find(e => e.selector === element.selector)) {
      selectedElements.value.push(element)
    }
  }

  function removeSelectedElement(selector: string) {
    selectedElements.value = selectedElements.value.filter(e => e.selector !== selector)
  }

  function clearSelectedElements() {
    selectedElements.value = []
  }

  function toggleSelectionMode() {
    isSelectionMode.value = !isSelectionMode.value
  }

  return {
    url,
    html,
    title,
    isLoading,
    error,
    selectedElements,
    isSelectionMode,
    fetchPage,
    addSelectedElement,
    removeSelectedElement,
    clearSelectedElements,
    toggleSelectionMode,
  }
})
