<template>
  <Teleport to="#modal-portal">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ getModalTitle() }}</h2>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>

          <div class="modal-body">
            <!-- PDF Export Settings -->
            <template v-if="mode === 'pdf-all' || mode === 'pdf-selected'">
              <!-- Orientation -->
              <div class="setting-group">
                <label>{{ t('exportModal.pdf.orientation.label') }}:</label>
                <select v-model="doc.orientation">
                  <option value="portrait">{{ t('exportModal.pdf.orientation.portrait') }}</option>
                  <option value="landscape">
                    {{ t('exportModal.pdf.orientation.landscape') }}
                  </option>
                </select>
              </div>

              <!-- Seitenformat -->
              <div class="setting-group">
                <label for="pdfPageFormat">{{ t('exportModal.pdf.pageFormat.label') }}:</label>
                <select id="pdfPageFormat" v-model="doc.pageFormat">
                  <option v-for="f in PAGE_FORMATS" :key="f" :value="f">
                    {{ t(`exportModal.pdf.pageFormat.${f}`) }}
                  </option>
                </select>
                <div v-if="doc.pageFormat === 'custom'" class="size-row">
                  <label class="size-field">
                    <span>{{ t('exportModal.pdf.pageFormat.width') }}</span>
                    <input
                      v-model.number="doc.customWidth"
                      type="number"
                      :min="CUSTOM_PAGE_MIN_MM"
                      :max="CUSTOM_PAGE_MAX_MM"
                      step="1"
                    />
                  </label>
                  <span class="size-times">×</span>
                  <label class="size-field">
                    <span>{{ t('exportModal.pdf.pageFormat.height') }}</span>
                    <input
                      v-model.number="doc.customHeight"
                      type="number"
                      :min="CUSTOM_PAGE_MIN_MM"
                      :max="CUSTOM_PAGE_MAX_MM"
                      step="1"
                    />
                  </label>
                  <span class="size-unit">mm</span>
                </div>
                <p v-if="doc.pageFormat !== 'a4'" class="setting-hint setting-hint-flush">
                  {{ t('exportModal.pdf.pageFormat.designerHint') }}
                </p>
              </div>

              <div class="setting-group">
                <SliderRow
                  v-model="doc.margin"
                  :label="t('exportModal.pdf.margin')"
                  :min="0"
                  :max="PAGE_MARGIN_MAX_MM"
                  :default="10"
                  unit="mm"
                />
              </div>

              <!-- Bilder pro Seite -->
              <div class="setting-group">
                <label for="pdfImagesPerPage">{{ t('exportModal.pdf.layout.perPage') }}:</label>
                <select id="pdfImagesPerPage" v-model.number="doc.imagesPerPage">
                  <option v-for="n in IMAGES_PER_PAGE" :key="n" :value="n">
                    {{ t('exportModal.pdf.layout.perPageOption', { count: n }, n) }}
                  </option>
                </select>
              </div>

              <div class="setting-group">
                <label for="pdfImageFit">{{ t('exportModal.pdf.layout.fit') }}:</label>
                <select id="pdfImageFit" v-model="doc.imageFit">
                  <option value="contain">{{ t('exportModal.pdf.layout.contain') }}</option>
                  <option value="cover">{{ t('exportModal.pdf.layout.cover') }}</option>
                </select>
              </div>

              <!-- Kopf-/Fußzeile -->
              <div class="setting-group">
                <label for="pdfHeader">{{ t('exportModal.pdf.headerFooter.header') }}:</label>
                <input
                  id="pdfHeader"
                  v-model="doc.header"
                  type="text"
                  maxlength="120"
                  :placeholder="t('exportModal.pdf.headerFooter.headerPlaceholder')"
                />
              </div>
              <div class="setting-group">
                <label for="pdfFooter">{{ t('exportModal.pdf.headerFooter.footer') }}:</label>
                <input
                  id="pdfFooter"
                  v-model="doc.footer"
                  type="text"
                  maxlength="120"
                  :placeholder="t('exportModal.pdf.headerFooter.footerPlaceholder')"
                />
                <p class="setting-hint setting-hint-flush">
                  {{ t('exportModal.pdf.headerFooter.placeholders') }}
                </p>
              </div>
              <div class="setting-group">
                <label class="checkbox-label">
                  <input v-model="doc.pageNumbers" type="checkbox" />
                  {{ t('exportModal.pdf.headerFooter.pageNumbers') }}
                </label>
              </div>
              <div class="setting-group">
                <label class="checkbox-label">
                  <input v-model="doc.bookmarks" type="checkbox" />
                  {{ t('exportModal.pdf.bookmarks.label') }}
                </label>
                <p class="setting-hint">{{ t('exportModal.pdf.bookmarks.description') }}</p>
              </div>

              <!-- Wasserzeichen (gleiche Bedienelemente wie bei den Bildern) -->
              <div class="setting-group watermark-group">
                <label class="group-title">{{ t('exportModal.pdf.watermark.title') }}</label>
                <BatchWatermarkControls
                  :watermark="doc.watermark"
                  hide-logo
                  @update:watermark="doc.watermark = $event"
                />
                <div v-if="doc.watermark.enabled" class="watermark-logo">
                  <span class="watermark-logo-label">
                    {{ t('exportModal.pdf.watermark.logo') }}
                  </span>
                  <div class="watermark-logo-row">
                    <img
                      v-if="doc.watermarkLogo"
                      :src="doc.watermarkLogo"
                      alt=""
                      class="watermark-logo-preview"
                    />
                    <button type="button" class="logo-btn" @click="logoInput?.click()">
                      {{
                        doc.watermarkLogo
                          ? t('exportModal.pdf.watermark.replaceLogo')
                          : t('exportModal.pdf.watermark.chooseLogo')
                      }}
                    </button>
                    <button
                      v-if="doc.watermarkLogo"
                      type="button"
                      class="logo-btn logo-btn--danger"
                      @click="doc.watermarkLogo = ''"
                    >
                      {{ t('exportModal.pdf.watermark.removeLogo') }}
                    </button>
                    <input
                      ref="logoInput"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      hidden
                      @change="onLogoSelected"
                    />
                  </div>
                  <p class="setting-hint setting-hint-flush">
                    {{ t('exportModal.pdf.watermark.hint') }}
                  </p>
                </div>
              </div>

              <!-- Passwortschutz -->
              <div class="setting-group password-group">
                <label class="checkbox-label">
                  <input v-model="doc.protectPdf" type="checkbox" />
                  {{ t('exportModal.pdf.password.enable') }}
                </label>
                <template v-if="doc.protectPdf">
                  <div class="password-row">
                    <input
                      id="pdfPassword"
                      v-model="doc.password"
                      :type="showPassword ? 'text' : 'password'"
                      :maxlength="PDF_PASSWORD_MAX_LENGTH"
                      autocomplete="new-password"
                      :aria-invalid="passwordInvalid"
                      aria-describedby="pdfPasswordHint"
                      :placeholder="t('exportModal.pdf.password.placeholder')"
                    />
                    <label class="checkbox-label password-show">
                      <input v-model="showPassword" type="checkbox" />
                      {{ t('exportModal.pdf.password.show') }}
                    </label>
                  </div>
                  <p
                    id="pdfPasswordHint"
                    :class="[
                      'setting-hint',
                      'setting-hint-flush',
                      { 'hint-error': passwordInvalid },
                    ]"
                  >
                    {{
                      passwordInvalid
                        ? t('exportModal.pdf.password.invalid', { max: PDF_PASSWORD_MAX_LENGTH })
                        : t('exportModal.pdf.password.hint')
                    }}
                  </p>
                  <label class="checkbox-label">
                    <input v-model="doc.allowPrinting" type="checkbox" />
                    {{ t('exportModal.pdf.password.allowPrinting') }}
                  </label>
                </template>
              </div>

              <!-- Author -->
              <div class="setting-group">
                <label>{{ t('exportModal.pdf.author') }}:</label>
                <input
                  v-model="doc.author"
                  type="text"
                  :placeholder="t('exportModal.pdf.authorPlaceholder')"
                />
              </div>

              <!-- ✨ NEU: Eigene Startseite gestalten -->
              <div class="setting-group">
                <label class="checkbox-label">
                  <input v-model="doc.includeCustomFrontPage" type="checkbox" />
                  {{ t('exportModal.pdf.frontPage.label') }}
                </label>
                <p class="setting-hint">{{ t('exportModal.pdf.frontPage.description') }}</p>
              </div>

              <!-- ✨ NEU: Startseite Designer Button -->
              <div v-if="doc.includeCustomFrontPage" class="designer-section front-page-section">
                <button type="button" class="designer-btn" @click="showFrontPageDesigner = true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                  </svg>
                  {{ t('exportModal.pdf.frontPage.designButton') }}
                  <span v-if="doc.frontPageElements.length > 0" class="badge">
                    {{ doc.frontPageElements.length }}
                  </span>
                </button>

                <!-- Element-Vorschau für Startseite -->
                <div v-if="doc.frontPageElements.length > 0" class="elements-preview">
                  <div class="preview-header">
                    <span>
                      {{ doc.frontPageElements.length }}
                      {{ t('exportModal.pdf.frontPage.elementsAdded') }}
                    </span>
                    <button type="button" class="clear-btn" @click="clearFrontPageElements">
                      {{ t('exportModal.pdf.frontPage.clearButton') }}
                    </button>
                  </div>
                  <ul class="element-list">
                    <li v-for="element in doc.frontPageElements.slice(0, 3)" :key="element.id">
                      <svg
                        v-if="element.type === 'text'"
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polyline points="4 7 4 4 20 4 20 7"></polyline>
                        <line x1="9" y1="20" x2="15" y2="20"></line>
                        <line x1="12" y1="4" x2="12" y2="20"></line>
                      </svg>
                      <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span>
                        {{ elementLabel(element) }}
                      </span>
                    </li>
                    <li v-if="doc.frontPageElements.length > 3" class="more-indicator">
                      {{
                        t('exportModal.moreElements', {
                          count: doc.frontPageElements.length - 3,
                        })
                      }}
                    </li>
                  </ul>
                </div>
              </div>

              <!-- ✨ Kommentarseite hinzufügen -->
              <div class="setting-group">
                <label class="checkbox-label">
                  <input v-model="doc.includeCommentPages" type="checkbox" />
                  {{ t('exportModal.pdf.commentPage.label') }}
                </label>
              </div>

              <!-- ✨ Kommentarseite Designer Button -->
              <div v-if="doc.includeCommentPages" class="designer-section comment-page-section">
                <button type="button" class="designer-btn" @click="showCommentPageDesigner = true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {{ t('exportModal.pdf.commentPage.designButton') }}
                  <span v-if="doc.commentPageElements.length > 0" class="badge">
                    {{ doc.commentPageElements.length }}
                  </span>
                </button>

                <!-- Element-Vorschau für Kommentarseite -->
                <div v-if="doc.commentPageElements.length > 0" class="elements-preview">
                  <div class="preview-header">
                    <span>
                      {{ doc.commentPageElements.length }}
                      {{ t('exportModal.pdf.commentPage.elementsAdded') }}
                    </span>
                    <button type="button" class="clear-btn" @click="clearCommentPageElements">
                      {{ t('exportModal.pdf.commentPage.clearButton') }}
                    </button>
                  </div>
                  <ul class="element-list">
                    <li v-for="element in doc.commentPageElements.slice(0, 3)" :key="element.id">
                      <svg
                        v-if="element.type === 'text'"
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polyline points="4 7 4 4 20 4 20 7"></polyline>
                        <line x1="9" y1="20" x2="15" y2="20"></line>
                        <line x1="12" y1="4" x2="12" y2="20"></line>
                      </svg>
                      <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span>
                        {{ elementLabel(element) }}
                      </span>
                    </li>
                    <li v-if="doc.commentPageElements.length > 3" class="more-indicator">
                      {{
                        t('exportModal.moreElements', {
                          count: doc.commentPageElements.length - 3,
                        })
                      }}
                    </li>
                  </ul>
                </div>
              </div>
            </template>

            <!-- ZIP Export Settings -->
            <template v-if="mode === 'zip'">
              <div class="setting-group">
                <label>{{ t('exportModal.zip.fileName') }}:</label>
                <input
                  v-model="settings.zipName"
                  type="text"
                  :placeholder="t('exportModal.zip.fileNamePlaceholder')"
                />
              </div>

              <div class="setting-group">
                <label>{{ t('exportModal.format.title') }}:</label>
                <select v-model="settings.format">
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>

              <div class="setting-group">
                <SliderRow
                  v-model="settings.quality"
                  :label="t('exportModal.format.quality.label')"
                  :min="1"
                  :max="100"
                  :default="92"
                  unit="%"
                />
              </div>

              <div v-if="settings.format === 'png'" class="setting-group png-bg-setting">
                <label class="checkbox-label">
                  <input v-model="settings.pngTransparent" type="checkbox" />
                  {{ t('exportModal.format.pngTransparent') }}
                </label>
                <p class="setting-hint">{{ t('exportModal.format.pngTransparentHint') }}</p>
                <div v-if="!settings.pngTransparent" class="bg-color-picker">
                  <label>{{ t('exportModal.format.pngBgColor') }}:</label>
                  <div class="color-input-row">
                    <input v-model="settings.pngBackgroundColor" type="color" />
                    <span class="color-hex">{{ settings.pngBackgroundColor }}</span>
                  </div>
                </div>
              </div>

              <div class="setting-group">
                <ExportTargetSize
                  v-model:enabled="settings.targetSizeEnabled"
                  v-model:kb="settings.targetSizeKb"
                  v-model:downscale="settings.targetSizeDownscale"
                  :active="isOpen"
                  :images="rasterImages"
                  :format="settings.format"
                  :quality="settings.quality"
                  :background-color="rasterBackground"
                  :keep-exif="settings.keepExif"
                />
              </div>

              <div class="setting-group">
                <label class="checkbox-label">
                  <input v-model="settings.keepExif" type="checkbox" />
                  {{ t('exportModal.exif.keep') }}
                </label>
                <p class="setting-hint">{{ t('exportModal.exif.hint') }}</p>
              </div>
            </template>

            <!-- SVG Export Settings -->
            <template v-if="mode === 'svg'">
              <div class="setting-group">
                <label>{{ t('exportModal.zip.fileName') }}:</label>
                <input
                  v-model="settings.zipName"
                  type="text"
                  :placeholder="t('exportModal.zip.fileNamePlaceholder')"
                />
              </div>

              <div class="setting-group">
                <label>{{ t('exportModal.svg.colormode') || 'Farbmodus' }}:</label>
                <select v-model="settings.svgColormode">
                  <option value="color">
                    {{ t('exportModal.svg.colormodeColor') || 'Farbe' }}
                  </option>
                  <option value="binary">
                    {{ t('exportModal.svg.colormodeBinary') || 'Schwarz-Weiß' }}
                  </option>
                </select>
              </div>

              <div class="setting-group">
                <label>{{ t('exportModal.svg.quality') || 'Qualität' }}:</label>
                <select v-model="settings.svgQuality">
                  <option value="standard">
                    {{ t('exportModal.svg.qualityStandard') || 'Standard (Originalauflösung)' }}
                  </option>
                  <option value="high">
                    {{ t('exportModal.svg.qualityHigh') || 'Hoch (schärfer)' }}
                  </option>
                  <option value="ultra">
                    {{ t('exportModal.svg.qualityUltra') || 'Ultra (maximale Schärfe)' }}
                  </option>
                </select>
                <p class="setting-hint">
                  {{ t('exportModal.svg.qualityHint') }}
                </p>
              </div>

              <div class="setting-group">
                <SliderRow
                  v-model="settings.svgFilterSpeckle"
                  :label="t('exportModal.svg.detail')"
                  :min="1"
                  :max="32"
                  :default="4"
                />
                <p class="setting-hint">
                  {{ t('exportModal.svg.detailHint') }}
                </p>
              </div>

              <div class="svg-info-box">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
                <span>
                  {{ t('exportModal.svg.info') }}
                </span>
              </div>
            </template>

            <!-- SAVE Settings -->
            <template v-if="mode === 'save'">
              <div class="setting-group">
                <label>{{ t('exportModal.format.title') }}:</label>
                <select v-model="settings.format">
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>

              <div class="setting-group">
                <SliderRow
                  v-model="settings.quality"
                  :label="t('exportModal.format.quality.label')"
                  :min="1"
                  :max="100"
                  :default="92"
                  unit="%"
                />
              </div>

              <div v-if="settings.format === 'png'" class="setting-group png-bg-setting">
                <label class="checkbox-label">
                  <input v-model="settings.pngTransparent" type="checkbox" />
                  {{ t('exportModal.format.pngTransparent') }}
                </label>
                <p class="setting-hint">{{ t('exportModal.format.pngTransparentHint') }}</p>
                <div v-if="!settings.pngTransparent" class="bg-color-picker">
                  <label>{{ t('exportModal.format.pngBgColor') }}:</label>
                  <div class="color-input-row">
                    <input v-model="settings.pngBackgroundColor" type="color" />
                    <span class="color-hex">{{ settings.pngBackgroundColor }}</span>
                  </div>
                </div>
              </div>

              <div class="setting-group">
                <ExportTargetSize
                  v-model:enabled="settings.targetSizeEnabled"
                  v-model:kb="settings.targetSizeKb"
                  v-model:downscale="settings.targetSizeDownscale"
                  :active="isOpen"
                  :images="rasterImages"
                  :format="settings.format"
                  :quality="settings.quality"
                  :background-color="rasterBackground"
                  :keep-exif="settings.keepExif"
                />
              </div>

              <div class="setting-group">
                <label class="checkbox-label">
                  <input v-model="settings.keepExif" type="checkbox" />
                  {{ t('exportModal.exif.keep') }}
                </label>
                <p class="setting-hint">{{ t('exportModal.exif.hint') }}</p>
              </div>
            </template>

            <!-- Info Text -->
            <div
              class="info-box"
              :class="{ 'info-box-selected': hasSelection && (mode === 'zip' || mode === 'svg') }"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span v-if="hasSelection && (mode === 'zip' || mode === 'svg')">
                {{ imageCount }}
                {{
                  imageCount === 1
                    ? t('exportModal.info.selectedImage')
                    : t('exportModal.info.selectedImages')
                }}
              </span>
              <span v-else>
                {{ imageCount }}
                {{ imageCount === 1 ? t('exportModal.info.image') : t('exportModal.info.images') }}
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="$emit('close')">
              {{ t('exportModal.buttons.cancel') }}
            </button>
            <button
              v-if="isPdfMode"
              class="btn-secondary"
              :title="t('exportModal.buttons.printTitle')"
              @click="handleConfirm('print')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path
                  d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                ></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              {{ t('exportModal.buttons.print') }}
            </button>
            <button class="btn-primary" :disabled="confirmBlocked" @click="handleConfirm()">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {{ getButtonText() }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Ein Designer für Startseite (cover) und Kommentarseiten (comment) -->
    <PdfPageDesigner
      v-model="showFrontPageDesigner"
      mode="cover"
      :initial-elements="doc.frontPageElements"
      :orientation="doc.orientation || 'portrait'"
      @save="handleFrontPageDesignerSave"
    />

    <PdfPageDesigner
      v-model="showCommentPageDesigner"
      mode="comment"
      :initial-elements="doc.commentPageElements"
      :orientation="doc.orientation || 'portrait'"
      @save="handleCommentPageDesignerSave"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PdfPageDesigner from './pdf-designer/PdfPageDesigner.vue'
import SliderRow from './SliderRow.vue'
import BatchWatermarkControls from './batch-edit/BatchWatermarkControls.vue'
import ExportTargetSize from './export/ExportTargetSize.vue'
import { useImageStore } from '@/stores/imageStore'
import { useConfirm } from '@/composables/useConfirm'
import { usePdfDocumentStore } from '@/stores/pdfDocument'
import { useRecipeStore } from '@/stores/recipes'
import { stripRichText } from '@/lib/designer/rich-text'
import {
  CUSTOM_PAGE_MAX_MM,
  CUSTOM_PAGE_MIN_MM,
  PAGE_MARGIN_MAX_MM,
  PDF_PASSWORD_MAX_LENGTH,
  type ImagesPerPage,
  type PdfElement,
  type PdfPageFormat,
} from '@/lib/features/export-pdf'

const PAGE_FORMATS: PdfPageFormat[] = ['a4', 'a5', 'a3', 'letter', 'square', 'custom']
const IMAGES_PER_PAGE: ImagesPerPage[] = [1, 2, 4, 6, 9]

const { t } = useI18n()
const dialog = useConfirm()

/** Kurzbeschreibung eines Designer-Elements für die Listen im Exportdialog */
function elementLabel(element: PdfElement): string {
  if (element.background) return t('commentPageDesigner.background.title')
  switch (element.type) {
    case 'text':
      return stripRichText(element.content ?? '').substring(0, 25)
    case 'image':
      return t('commentPageDesigner.properties.typeImage')
    case 'shape':
      return t(`commentPageDesigner.properties.shape.${element.shape ?? 'rect'}`)
    default: {
      const never: never = element.type
      return never
    }
  }
}

interface Props {
  isOpen: boolean
  mode: 'pdf-all' | 'pdf-selected' | 'zip' | 'svg' | 'save' | null
  imageCount: number
  hasSelection?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  confirm: [settings: any]
}>()

const showFrontPageDesigner = ref(false)
const showCommentPageDesigner = ref(false)

// PDF-Dokument (Layout, Start-/Kommentarseiten, Wasserzeichen, Passwort) liegt im Store
const pdfDocument = usePdfDocumentStore()
const doc = pdfDocument.settings

// Einstellungen für ZIP, Einzelbild und SVG
const settings = reactive({
  // ZIP/Save Settings
  zipName: 'bilder-export',
  format: 'png',
  quality: 92,
  pngTransparent: true,
  pngBackgroundColor: '#ffffff',
  // Maximale Dateigröße pro Bild (nur JPG/WebP)
  targetSizeEnabled: false,
  targetSizeKb: 500,
  targetSizeDownscale: false,
  keepExif: false,

  // SVG Settings
  svgColormode: 'color' as 'color' | 'binary',
  svgFilterSpeckle: 4,
  svgQuality: 'high' as 'standard' | 'high' | 'ultra',
})

// Bilder, die der Rasterexport erfasst (wie in AppPage.handleExportConfirm)
const imageStore = useImageStore()
const rasterImages = computed(() => {
  if (props.mode === 'zip') {
    return imageStore.hasSelection ? imageStore.selectedImages : imageStore.images
  }
  if (props.mode === 'save') return imageStore.selectedImages
  return []
})
const rasterBackground = computed(() =>
  settings.format === 'png' && !settings.pngTransparent ? settings.pngBackgroundColor : undefined
)

// Angewendetes Rezept belegt Format, Qualität, PNG-Hintergrund und ZIP-Namen vor
const recipeStore = useRecipeStore()
watch(
  () => recipeStore.applyCount,
  () => {
    const recipe = recipeStore.activeRecipe
    if (recipe) Object.assign(settings, recipe.export)
  }
)

// Logo für das PDF-Wasserzeichen als Daten-URL laden
const logoInput = ref<HTMLInputElement | null>(null)
function onLogoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') doc.watermarkLogo = reader.result
  }
  reader.readAsDataURL(file)
}

// ✨ NEU: Front Page Designer Save Handler
function handleFrontPageDesignerSave(elements: PdfElement[]) {
  pdfDocument.setFrontPageElements(elements)
  console.log('✅ Startseiten-Elemente gespeichert:', elements.length)
}

// Startseiten-Layout passt nach einem Orientierungswechsel nicht mehr: Zurücksetzen anbieten
// (wie bisher im FrontPageDesigner)
watch(
  () => doc.orientation,
  async () => {
    if (doc.frontPageElements.length === 0) return
    const reset = await dialog.confirm({
      message: t('frontPageDesigner.confirmOrientationReset'),
      confirmLabel: t('dialog.reset'),
      cancelLabel: t('dialog.keep'),
    })
    if (reset) pdfDocument.clearFrontPage()
  }
)

// ✨ NEU: Clear Front Page Elements
async function clearFrontPageElements() {
  const ok = await dialog.confirm({
    message: t('exportModal.pdf.frontPage.confirmClear'),
    confirmLabel: t('dialog.delete'),
    danger: true,
  })
  if (ok) pdfDocument.clearFrontPage()
}

// Comment Page Designer Save Handler
function handleCommentPageDesignerSave(elements: PdfElement[]) {
  pdfDocument.setCommentPageElements(elements)
  console.log('✅ Kommentarseiten-Elemente gespeichert:', elements.length)
}

// Clear Comment Page Elements
async function clearCommentPageElements() {
  const ok = await dialog.confirm({
    message: t('exportModal.pdf.commentPage.confirmClear'),
    confirmLabel: t('dialog.delete'),
    danger: true,
  })
  if (ok) pdfDocument.clearCommentPages()
}

function getModalTitle() {
  switch (props.mode) {
    case 'pdf-all':
      return t('exportModal.title.pdfAll')
    case 'pdf-selected':
      return t('exportModal.title.pdfSelected')
    case 'zip':
      return t('exportModal.title.zip')
    case 'svg':
      return t('exportModal.title.svg') || 'Als SVG exportieren'
    case 'save':
      return t('exportModal.title.save')
    default:
      return t('exportModal.title.export')
  }
}

function getButtonText() {
  return t('exportModal.buttons.export')
}

const showPassword = ref(false)
const isPdfMode = computed(() => props.mode === 'pdf-all' || props.mode === 'pdf-selected')
/** Passwort gewünscht, aber leer oder ungültig */
const passwordInvalid = computed(() => pdfDocument.passwordInvalid)
const confirmBlocked = computed(() => isPdfMode.value && passwordInvalid.value)

/**
 * download: Datei speichern (Standard); print: PDF direkt auf diesem Gerät drucken.
 * Beim Drucken entfällt der Passwortschutz, daher sperrt ein ungültiges Passwort nur den Export.
 */
function handleConfirm(output: 'download' | 'print' = 'download') {
  const print = output === 'print' && isPdfMode.value
  if (!print && confirmBlocked.value) return
  // Passwort nicht ins Log schreiben
  console.log('🚀 Export bestätigt mit Settings:', {
    ...settings,
    ...doc,
    password: '***',
    output,
  })
  // Für „Als Rezept speichern“ merken (nur Raster-Export nutzt Format/Qualität)
  if (props.mode === 'zip' || props.mode === 'save') recipeStore.rememberExport(settings)
  // PDF-Export liest den Store; die Felder bleiben im Payload für bestehende Aufrufer
  emit('confirm', {
    ...settings,
    ...doc,
    password: isPdfMode.value && !print && doc.protectPdf ? doc.password : '',
    output: print ? 'print' : 'download',
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--ds-shadow-overlay);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--panel);
  color: var(--text);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}

.setting-group {
  margin-bottom: var(--space-4);
}

.setting-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: 500;
  color: var(--text);
}

.setting-hint {
  margin: var(--space-2) 0 0 26px;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.4;
}

.setting-hint.hint-error {
  color: var(--red);
}

.password-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.password-row input {
  flex: 1;
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--panel);
  color: var(--text);
  font-size: 0.95rem;
}

.password-row input:focus {
  outline: none;
  border-color: var(--accent);
}

.password-row input[aria-invalid='true'] {
  border-color: var(--red);
}

.password-show {
  flex: 0 0 auto;
  white-space: nowrap;
}

.password-group > .checkbox-label + .checkbox-label,
.password-group .setting-hint + .checkbox-label {
  margin-top: var(--space-2);
}

.setting-hint-flush {
  margin-left: 0;
}

.group-title {
  font-weight: 600;
}

.watermark-logo {
  margin-top: var(--space-3);
}

.watermark-logo-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.watermark-logo-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.watermark-logo-preview {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--panel);
}

.logo-btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--panel);
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
}

.logo-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.logo-btn--danger {
  color: var(--red);
}

.size-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.size-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: 0;
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--muted);
}

.size-field input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--panel);
  color: var(--text);
  font-size: 0.95rem;
}

.size-field input:focus {
  outline: none;
  border-color: var(--accent);
}

.size-times,
.size-unit {
  padding-bottom: var(--space-2);
  color: var(--muted);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.setting-group input[type='text'],
.setting-group select {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--panel);
  color: var(--text);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.setting-group input[type='text']:focus,
.setting-group select:focus {
  outline: none;
  border-color: var(--accent);
}

.designer-section {
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--panel);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.front-page-section {
  border-left: 3px solid var(--accent);
}

.comment-page-section {
  border-left: 3px solid var(--green);
}

.designer-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  position: relative;
}

.designer-btn:active {
  transform: translateY(0);
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--red);
  color: white;
  border-radius: 9999px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
}

.elements-preview {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  font-size: 0.85rem;
  color: var(--muted);
}

.clear-btn {
  background: none;
  border: none;
  color: var(--red);
  cursor: pointer;
  font-size: 0.85rem;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.clear-btn:hover {
  background: color-mix(in oklab, var(--red) 10%, transparent);
}

.element-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.element-list li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  font-size: 0.85rem;
  color: var(--muted);
}

.element-list li svg {
  flex-shrink: 0;
  color: var(--accent);
}

.more-indicator {
  font-style: italic;
}

.png-bg-setting {
  padding: var(--space-3);
  background: color-mix(in oklab, var(--accent) 5%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 15%, transparent);
  border-radius: var(--radius-md);
}

.bg-color-picker {
  margin-top: var(--space-3);
}

.bg-color-picker label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.color-input-row input[type='color'] {
  width: 36px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 2px;
  background: var(--panel);
}

.color-input-row .color-hex {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--muted);
}

.info-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.9rem;
  margin-top: var(--space-4);
}

.info-box svg {
  flex-shrink: 0;
  color: var(--accent);
}

.info-box-selected {
  background: color-mix(in oklab, var(--green) 10%, transparent);
  border-color: color-mix(in oklab, var(--green) 25%, transparent);
}

.info-box-selected svg {
  color: var(--green);
}

.svg-info-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  background: color-mix(in oklab, var(--orange) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--orange) 25%, transparent);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.85rem;
  margin-top: var(--space-4);
  line-height: 1.4;
}

.svg-info-box svg {
  flex-shrink: 0;
  color: var(--orange);
  margin-top: 2px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5);
  border-top: 1px solid var(--border-color);
}

.btn-secondary,
.btn-primary {
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border: none;
}

.btn-secondary {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg);
}

.btn-primary {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-content {
    max-width: 100%;
    max-height: 95vh;
  }

  .modal-body {
    padding: var(--space-4);
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-content {
    max-height: 100dvh;
    border-radius: 0;
  }

  .modal-body {
    padding: var(--space-3);
  }
}
</style>
