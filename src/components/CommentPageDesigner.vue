<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="designer-modal">
          <!-- Header -->
          <div class="modal-header">
            <h2>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {{ t('commentPageDesigner.title') }}
            </h2>

            <!-- Page Counter Badge -->
            <div class="page-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {{ pages.length }} {{ pages.length === 1 ? t('commentPageDesigner.page.singular') : t('commentPageDesigner.page.plural') }}
            </div>

            <button class="close-btn" @click="handleClose" :title="t('commentPageDesigner.close')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Main Content -->
          <div class="modal-body">
            <!-- Left Sidebar - Tools & Settings -->
            <div class="sidebar">
              <!-- Page Management Section -->
              <div class="tool-section page-section">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {{ t('commentPageDesigner.pageManagement.title') }}
                </h3>

                <!-- Current Page Info -->
                <div class="current-page-info">
                  <span class="page-number">{{ t('commentPageDesigner.pageManagement.pageOf', { current: currentPageIndex + 1, total: pages.length }) }}</span>
                  <span class="element-count">{{ t('commentPageDesigner.pageManagement.elementCount', { count: currentElements.length }, currentElements.length) }}</span>
                </div>

                <!-- Page Navigation -->
                <div class="page-navigation">
                  <button
                      @click="previousPage"
                      :disabled="currentPageIndex === 0"
                      class="nav-btn"
                      :title="t('commentPageDesigner.pageManagement.previousPage')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  <div class="page-thumbnails">
                    <button
                        v-for="(page, index) in pages"
                        :key="page.id"
                        @click="goToPage(index)"
                        :class="['page-thumb', { active: index === currentPageIndex }]"
                        :title="t('commentPageDesigner.pageManagement.pageTitle', { number: index + 1 })"
                    >
                      {{ index + 1 }}
                    </button>
                  </div>

                  <button
                      @click="nextPage"
                      :disabled="currentPageIndex === pages.length - 1"
                      class="nav-btn"
                      :title="t('commentPageDesigner.pageManagement.nextPage')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>

                <!-- Page Actions -->
                <div class="page-actions">
                  <button class="tool-btn primary" @click="addNewPage" :title="t('commentPageDesigner.pageManagement.addPageTooltip')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    {{ t('commentPageDesigner.pageManagement.addPageButton') }}
                  </button>

                  <button
                      class="tool-btn danger"
                      @click="deletePage"
                      :disabled="pages.length === 1"
                      :title="t('commentPageDesigner.pageManagement.deletePageTooltip')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    {{ t('commentPageDesigner.pageManagement.deletePageButton') }}
                  </button>
                </div>
              </div>

              <!-- Element Tools Section -->
              <div class="tool-section">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                    <path d="M2 2l7.586 7.586"></path>
                  </svg>
                  {{ t('commentPageDesigner.tools.title') }}
                </h3>

                <!-- Add Text Button -->
                <button class="tool-btn" @click="addTextElement" :disabled="currentElements.length >= 20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 7 4 4 20 4 20 7"></polyline>
                    <line x1="9" y1="20" x2="15" y2="20"></line>
                    <line x1="12" y1="4" x2="12" y2="20"></line>
                  </svg>
                  {{ t('commentPageDesigner.tools.addText') }}
                </button>

                <!-- Add Image Button -->
                <button class="tool-btn" @click="triggerImageUpload" :disabled="currentElements.length >= 20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  {{ t('commentPageDesigner.tools.addImage') }}
                </button>
                <input
                    ref="imageInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleImageUpload"
                >

                <!-- Clear Current Page Button -->
                <button class="tool-btn danger" @click="clearCurrentPage" v-if="currentElements.length > 0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  {{ t('commentPageDesigner.tools.clearPage') }}
                </button>
              </div>

              <!-- Element Properties -->
              <div class="properties-section" v-if="selectedElement">
                <h3>{{ t('commentPageDesigner.properties.title') }}</h3>

                <div class="property-group">
                  <label>{{ t('commentPageDesigner.properties.elementType') }}</label>
                  <div class="property-value">{{ selectedElement.type === 'text' ? t('commentPageDesigner.properties.typeText') : t('commentPageDesigner.properties.typeImage') }}</div>
                </div>

                <!-- Text Properties -->
                <template v-if="selectedElement.type === 'text'">
                  <div class="property-group">
                    <label for="text-content">{{ t('commentPageDesigner.properties.textLabel') }}</label>
                    <textarea
                        id="text-content"
                        v-model="selectedElement.content"
                        rows="4"
                        :placeholder="t('commentPageDesigner.properties.textPlaceholder')"
                    ></textarea>
                  </div>

                  <div class="property-group">
                    <label for="font-size">{{ t('commentPageDesigner.properties.fontSize', { size: selectedElement.fontSize }) }}</label>
                    <input
                        id="font-size"
                        type="range"
                        v-model.number="selectedElement.fontSize"
                        min="10"
                        max="72"
                        step="1"
                    >
                  </div>

                  <div class="property-group">
                    <label for="text-color">{{ t('commentPageDesigner.properties.textColor') }}</label>
                    <input
                        id="text-color"
                        type="color"
                        v-model="selectedElement.color"
                    >
                  </div>

                  <div class="property-group">
                    <label>{{ t('commentPageDesigner.properties.textAlignment') }}</label>
                    <div class="align-buttons">
                      <button
                          @click="selectedElement.align = 'left'"
                          :class="{ active: selectedElement.align === 'left' }"
                          :title="t('commentPageDesigner.properties.alignLeft')"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="17" y1="10" x2="3" y2="10"></line>
                          <line x1="21" y1="6" x2="3" y2="6"></line>
                          <line x1="21" y1="14" x2="3" y2="14"></line>
                          <line x1="17" y1="18" x2="3" y2="18"></line>
                        </svg>
                      </button>
                      <button
                          @click="selectedElement.align = 'center'"
                          :class="{ active: selectedElement.align === 'center' }"
                          :title="t('commentPageDesigner.properties.alignCenter')"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="10" x2="6" y2="10"></line>
                          <line x1="21" y1="6" x2="3" y2="6"></line>
                          <line x1="21" y1="14" x2="3" y2="14"></line>
                          <line x1="18" y1="18" x2="6" y2="18"></line>
                        </svg>
                      </button>
                      <button
                          @click="selectedElement.align = 'right'"
                          :class="{ active: selectedElement.align === 'right' }"
                          :title="t('commentPageDesigner.properties.alignRight')"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="21" y1="10" x2="7" y2="10"></line>
                          <line x1="21" y1="6" x2="3" y2="6"></line>
                          <line x1="21" y1="14" x2="3" y2="14"></line>
                          <line x1="21" y1="18" x2="7" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="property-group">
                    <label>
                      <input type="checkbox" v-model="selectedElement.bold">
                      {{ t('commentPageDesigner.properties.bold') }}
                    </label>
                    <label>
                      <input type="checkbox" v-model="selectedElement.italic">
                      {{ t('commentPageDesigner.properties.italic') }}
                    </label>
                  </div>
                </template>

                <!-- Image Properties -->
                <template v-if="selectedElement.type === 'image'">
                  <div class="property-group">
                    <label for="img-width">{{ t('commentPageDesigner.properties.width', { width: selectedElement.width }) }}</label>
                    <input
                        id="img-width"
                        type="range"
                        v-model.number="selectedElement.width"
                        min="50"
                        max="500"
                        step="10"
                    >
                  </div>

                  <div class="property-group">
                    <label for="img-opacity">{{ t('commentPageDesigner.properties.opacity', { opacity: Math.round(selectedElement.opacity * 100) }) }}</label>
                    <input
                        id="img-opacity"
                        type="range"
                        v-model.number="selectedElement.opacity"
                        min="0.1"
                        max="1"
                        step="0.1"
                    >
                  </div>
                </template>

                <!-- Position -->
                <div class="property-group">
                  <label>{{ t('commentPageDesigner.properties.position') }}</label>
                  <div class="position-inputs">
                    <div>
                      <span>X:</span>
                      <input
                          type="number"
                          v-model.number="selectedElement.x"
                          min="0"
                          :max="pageWidth"
                          step="1"
                      > px
                    </div>
                    <div>
                      <span>Y:</span>
                      <input
                          type="number"
                          v-model.number="selectedElement.y"
                          min="0"
                          :max="pageHeight"
                          step="1"
                      > px
                    </div>
                  </div>
                </div>

                <!-- Z-Index (Layer) -->
                <div class="property-group">
                  <label>{{ t('commentPageDesigner.properties.layer') }}</label>
                  <div class="layer-buttons">
                    <button @click="moveToFront" :title="t('commentPageDesigner.properties.toFrontTooltip')">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                      {{ t('commentPageDesigner.properties.toFrontButton') }}
                    </button>
                    <button @click="moveToBack" :title="t('commentPageDesigner.properties.toBackTooltip')">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                      {{ t('commentPageDesigner.properties.toBackButton') }}
                    </button>
                  </div>
                </div>

                <!-- Delete Button -->
                <button class="delete-element-btn" @click="deleteSelectedElement">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  {{ t('commentPageDesigner.properties.deleteElement') }}
                </button>
              </div>

              <!-- Info when no element selected -->
              <div class="no-selection" v-else-if="currentElements.length > 0">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <p>{{ t('commentPageDesigner.properties.noSelection') }}</p>
              </div>
            </div>

            <!-- Canvas Area -->
            <div class="canvas-area">
              <!-- Zoom Controls -->
              <div class="zoom-controls">
                <button @click="zoomOut" :disabled="zoomLevel <= 0.5" :title="t('commentPageDesigner.zoom.zoomOut')">−</button>
                <span>{{ Math.round(zoomLevel * 100) }}%</span>
                <button @click="zoomIn" :disabled="zoomLevel >= 2" :title="t('commentPageDesigner.zoom.zoomIn')">+</button>
                <button @click="resetZoom" :title="t('commentPageDesigner.zoom.reset')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                    <path d="M3 21v-5h5"></path>
                  </svg>
                </button>
              </div>

              <div class="canvas-wrapper">
                <div
                    class="canvas"
                    ref="canvasRef"
                    :style="{
                    width: pageWidth + 'px',
                    height: pageHeight + 'px',
                    transform: `scale(${zoomLevel})`
                  }"
                    @mousedown="handleCanvasClick"
                >
                  <div class="canvas-grid"></div>

                  <!-- Render elements for current page -->
                  <div
                      v-for="element in currentElements"
                      :key="element.id"
                      :class="['canvas-element', { selected: selectedElement?.id === element.id }]"
                      :style="{
                      position: 'absolute',
                      left: element.x + 'px',
                      top: element.y + 'px',
                      zIndex: element.zIndex,
                      cursor: 'move'
                    }"
                      @mousedown.stop="selectElement(element, $event)"
                  >
                    <!-- Text Element -->
                    <div
                        v-if="element.type === 'text'"
                        class="element-text"
                        :style="{
                        fontSize: element.fontSize + 'px',
                        color: element.color,
                        textAlign: element.align,
                        fontWeight: element.bold ? 'bold' : 'normal',
                        fontStyle: element.italic ? 'italic' : 'normal'
                      }"
                    >
                      <div class="text-content">{{ element.content || t('commentPageDesigner.properties.textPlaceholder') }}</div>
                    </div>

                    <!-- Image Element -->
                    <div
                        v-if="element.type === 'image'"
                        class="element-image"
                        :style="{
                        width: element.width + 'px',
                        opacity: element.opacity
                      }"
                    >
                      <img :src="element.src" alt="Uploaded image">
                    </div>

                    <!-- Resize Handle for selected element -->
                    <div
                        v-if="selectedElement?.id === element.id && element.type === 'image'"
                        class="resize-handle"
                        @mousedown.stop="startResize($event)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <div class="footer-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>{{ t('commentPageDesigner.footer.info', { current: currentPageIndex + 1, total: pages.length, count: getTotalElementCount() }) }}</span>
            </div>
            <div class="footer-actions">
              <button class="btn-secondary" @click="handleClose">{{ t('commentPageDesigner.footer.cancel') }}</button>
              <button
                  class="btn-primary"
                  @click="handleSave"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {{ t('commentPageDesigner.footer.save', { count: getTotalElementCount(), elements: getTotalElementCount() === 1 ? t('commentPageDesigner.element.singular') : t('commentPageDesigner.element.plural') }) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

// Props - FIXED to use v-model
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialElements: {
    type: Array,
    default: () => []
  }
});

// Emits - FIXED to use v-model and @save
const emit = defineEmits(['update:modelValue', 'save']);

// Canvas dimensions (A4 aspect ratio)
const pageWidth = 794;
const pageHeight = 1123;

// Multi-Page State
const pages = ref([
  {
    id: generateId(),
    elements: []
  }
]);
const currentPageIndex = ref(0);

// Load initial elements when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.initialElements && props.initialElements.length > 0) {
    // Load initial elements into first page
    pages.value[0].elements = JSON.parse(JSON.stringify(props.initialElements));
  }
});

// Computed: Get current page elements
const currentElements = computed(() => pages.value[currentPageIndex.value].elements);

// Element management
const selectedElement = ref(null);
const canvasRef = ref(null);
const imageInput = ref(null);
const zoomLevel = ref(1);

// Dragging state
let isDragging = false;
let isResizing = false;
let dragStartX = 0;
let dragStartY = 0;
let elementStartX = 0;
let elementStartY = 0;
let resizeStartWidth = 0;

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get total element count across all pages
function getTotalElementCount() {
  return pages.value.reduce((total, page) => total + page.elements.length, 0);
}

// Page Management Functions
function addNewPage() {
  const newPage = {
    id: generateId(),
    elements: []
  };
  pages.value.push(newPage);
  currentPageIndex.value = pages.value.length - 1;
  selectedElement.value = null;
}

function deletePage() {
  if (pages.value.length === 1) {
    alert('Du kannst die letzte Seite nicht löschen!');
    return;
  }
  
  if (confirm(`Möchtest du Seite ${currentPageIndex.value + 1} wirklich löschen?`)) {
    pages.value.splice(currentPageIndex.value, 1);
    
    if (currentPageIndex.value >= pages.value.length) {
      currentPageIndex.value = pages.value.length - 1;
    }
    
    selectedElement.value = null;
  }
}

function previousPage() {
  if (currentPageIndex.value > 0) {
    currentPageIndex.value--;
    selectedElement.value = null;
  }
}

function nextPage() {
  if (currentPageIndex.value < pages.value.length - 1) {
    currentPageIndex.value++;
    selectedElement.value = null;
  }
}

function goToPage(index) {
  currentPageIndex.value = index;
  selectedElement.value = null;
}

// Element Functions
function addTextElement() {
  const newElement = {
    id: generateId(),
    type: 'text',
    content: 'Neuer Text',
    x: Math.random() * (pageWidth - 200),
    y: Math.random() * (pageHeight - 100),
    fontSize: 24,
    color: '#000000',
    align: 'left',
    bold: false,
    italic: false,
    zIndex: currentElements.value.length
  };
  
  currentElements.value.push(newElement);
  selectedElement.value = newElement;
}

function triggerImageUpload() {
  imageInput.value?.click();
}

function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const newElement = {
      id: generateId(),
      type: 'image',
      src: e.target.result,
      x: Math.random() * (pageWidth - 300),
      y: Math.random() * (pageHeight - 300),
      width: 200,
      opacity: 1,
      zIndex: currentElements.value.length
    };
    
    currentElements.value.push(newElement);
    selectedElement.value = newElement;
  };
  reader.readAsDataURL(file);
  
  event.target.value = '';
}

function clearCurrentPage() {
  if (confirm(`Möchtest du alle Elemente von Seite ${currentPageIndex.value + 1} wirklich löschen?`)) {
    currentElements.value.length = 0;
    selectedElement.value = null;
  }
}

function selectElement(element, event) {
  selectedElement.value = element;
  isDragging = true;
  dragStartX = event.clientX / zoomLevel.value;
  dragStartY = event.clientY / zoomLevel.value;
  elementStartX = element.x;
  elementStartY = element.y;
}

function handleCanvasClick(event) {
  if (event.target === canvasRef.value || event.target.classList.contains('canvas-grid')) {
    selectedElement.value = null;
  }
}

function deleteSelectedElement() {
  if (!selectedElement.value) return;
  
  const index = currentElements.value.findIndex(el => el.id === selectedElement.value.id);
  if (index !== -1) {
    currentElements.value.splice(index, 1);
    selectedElement.value = null;
  }
}

function moveToFront() {
  if (!selectedElement.value) return;
  const maxZ = Math.max(...currentElements.value.map(el => el.zIndex), 0);
  selectedElement.value.zIndex = maxZ + 1;
}

function moveToBack() {
  if (!selectedElement.value) return;
  const minZ = Math.min(...currentElements.value.map(el => el.zIndex), 0);
  selectedElement.value.zIndex = minZ - 1;
}

function startResize(event) {
  if (!selectedElement.value) return;
  isResizing = true;
  dragStartX = event.clientX / zoomLevel.value;
  resizeStartWidth = selectedElement.value.width;
  event.stopPropagation();
}

function handleMouseMove(event) {
  if (isDragging && selectedElement.value && !isResizing) {
    const deltaX = (event.clientX / zoomLevel.value) - dragStartX;
    const deltaY = (event.clientY / zoomLevel.value) - dragStartY;
    
    selectedElement.value.x = Math.max(0, Math.min(pageWidth - 50, elementStartX + deltaX));
    selectedElement.value.y = Math.max(0, Math.min(pageHeight - 50, elementStartY + deltaY));
  } else if (isResizing && selectedElement.value) {
    const deltaX = (event.clientX / zoomLevel.value) - dragStartX;
    selectedElement.value.width = Math.max(50, Math.min(500, resizeStartWidth + deltaX));
  }
}

function handleMouseUp() {
  isDragging = false;
  isResizing = false;
}

// Zoom controls
function zoomIn() {
  if (zoomLevel.value < 2) {
    zoomLevel.value = Math.min(2, zoomLevel.value + 0.1);
  }
}

function zoomOut() {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value = Math.max(0.5, zoomLevel.value - 0.1);
  }
}

function resetZoom() {
  zoomLevel.value = 1;
}

// Close handler - FIXED for v-model
function handleClose() {
  emit('update:modelValue', false);
}

function handleSave() {
  const allElements = pages.value.flatMap((page, pageIndex) => {
    return page.elements.map(element => ({
      ...element,
      page: pageIndex + 1
    }))
  })

  console.log('💾 Speichere Elemente:', allElements.length, 'von', pages.value.length, 'Seiten')
  console.log('📄 Verteilung:', pages.value.map((page, index) =>
      `Seite ${index + 1}: ${page.elements.length} Element(e)`
  ).join(', '))

  emit('save', allElements)
  emit('update:modelValue', false)
}
// Keyboard shortcuts
function handleKeyDown(event) {
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedElement.value) {
    event.preventDefault();
    deleteSelectedElement();
  }
  
  if (event.ctrlKey && event.key === 'ArrowLeft') {
    event.preventDefault();
    previousPage();
  }
  if (event.ctrlKey && event.key === 'ArrowRight') {
    event.preventDefault();
    nextPage();
  }
  
  if (event.ctrlKey && event.key === 'n') {
    event.preventDefault();
    addNewPage();
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
/* Base Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.designer-modal {
  width: 95vw;
  height: 90vh;
  max-width: 1800px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.page-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* Main Body */
.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 320px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

/* Page Section */
.page-section {
  background: white;
  border: 2px solid #667eea;
  border-radius: 12px;
  padding: 16px;
}

.page-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #667eea;
  margin-bottom: 12px;
}

.current-page-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  margin-bottom: 12px;
}

.page-number {
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.element-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.page-navigation {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-thumbnails {
  flex: 1;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 2px;
}

.page-thumb {
  min-width: 32px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.page-thumb:hover {
  border-color: #667eea;
  color: #667eea;
}

.page-thumb.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  font-weight: 600;
}

.page-actions {
  display: flex;
  gap: 8px;
}

.page-actions .tool-btn {
  flex: 1;
}

/* Tool Section */
.tool-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tool-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.tool-btn {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tool-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #667eea;
  color: #667eea;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.tool-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.tool-btn.danger {
  background: #fee;
  border-color: #fca;
  color: #c33;
}

.tool-btn.danger:hover:not(:disabled) {
  background: #fcc;
  border-color: #f99;
}

/* Properties Section */
.properties-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.properties-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.property-group {
  margin-bottom: 16px;
}

.property-group:last-child {
  margin-bottom: 0;
}

.property-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 6px;
}

.property-value {
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
}

.property-group textarea,
.property-group input[type="number"] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.property-group textarea:focus,
.property-group input[type="number"]:focus {
  outline: none;
  border-color: #667eea;
}

.property-group input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
}

.property-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.property-group input[type="color"] {
  width: 100%;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
}

.align-buttons,
.layer-buttons {
  display: flex;
  gap: 6px;
}

.align-buttons button,
.layer-buttons button {
  flex: 1;
  padding: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
}

.align-buttons button:hover,
.layer-buttons button:hover {
  background: #f9fafb;
  border-color: #667eea;
}

.align-buttons button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.property-group label input[type="checkbox"] {
  margin-right: 6px;
}

.delete-element-btn {
  width: 100%;
  padding: 10px 16px;
  background: #fee;
  border: 1px solid #fca;
  color: #c33;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}

.delete-element-btn:hover {
  background: #fcc;
  border-color: #f99;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
}

.no-selection svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-selection p {
  margin: 0;
  font-size: 13px;
}

.position-inputs {
  display: flex;
  gap: 12px;
}

.position-inputs > div {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.position-inputs input {
  width: 70px;
}

/* Canvas Area */
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.zoom-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.zoom-controls button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #667eea;
}

.zoom-controls button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.zoom-controls span {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  min-width: 50px;
  text-align: center;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: 
    linear-gradient(90deg, #e5e7eb 1px, transparent 1px),
    linear-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: -1px -1px;
}

.canvas {
  background: white;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  position: relative;
  transform-origin: center;
  transition: transform 0.2s ease;
}

.canvas-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}

/* Canvas Elements */
.canvas-element {
  transition: box-shadow 0.2s;
  user-select: none;
}

.canvas-element.selected {
  box-shadow: 0 0 0 2px #667eea;
  border-radius: 4px;
}

.canvas-element.selected::before {
  content: '';
  position: absolute;
  inset: -8px;
  border: 1px dashed #667eea;
  border-radius: 4px;
  pointer-events: none;
}

.element-text {
  padding: 8px;
  min-width: 50px;
  min-height: 30px;
}

.element-image {
  border-radius: 4px;
  overflow: hidden;
}

.element-image img {
  display: block;
  width: 100%;
  height: auto;
}

.text-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

.resize-handle {
  position: absolute;
  right: -8px;
  bottom: -8px;
  width: 20px;
  height: 20px;
  background: #667eea;
  border: 2px solid white;
  border-radius: 50%;
  cursor: nwse-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.resize-handle svg {
  color: white;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.footer-info svg {
  color: #9ca3af;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary {
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .designer-modal,
.modal-leave-active .designer-modal {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .designer-modal,
.modal-leave-to .designer-modal {
  transform: scale(0.95);
}

/* Responsive */
@media (max-width: 1200px) {
  .sidebar {
    width: 280px;
  }

  .designer-modal {
    width: 98vw;
    height: 95vh;
  }
}

@media (max-width: 768px) {
  .modal-body {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .canvas-wrapper {
    padding: 20px;
  }
  
  .page-thumbnails {
    max-width: 150px;
  }
}
</style>
