// fontManager.js

/**
 * Manages custom font loading, caching, and availability
 */
export class FontManager {
    constructor() {
        this.loadedFonts = new Set();
        this.loadingPromises = new Map();
        this.fontFamilies = [];
        this.isInitialized = false;
    }

    /**
     * Initialize and load all custom fonts
     */
    async initialize(customFonts) {
        if (this.isInitialized) return;

        const styleSheet = document.createElement('style');
        styleSheet.type = 'text/css';
        let fontFaceRules = '';

        // Font-Loading Promises sammeln
        const fontLoadPromises = [];

        customFonts.forEach(font => {
            const displayName = font.name;
            this.fontFamilies.push(displayName);

            // CSS @font-face regel erstellen
            fontFaceRules += `
                @font-face {
                    font-family: '${displayName}';
                    src: url('/fonts/${font.file}') format('woff2');
                    font-weight: normal;
                    font-style: normal;
                    font-display: swap;
                }
            `;

            // Font-Loading Promise hinzufügen
            if ('FontFace' in window) {
                const fontFace = new FontFace(displayName, `url('/fonts/${font.file}')`);
                const loadPromise = fontFace.load().then(loadedFont => {
                    document.fonts.add(loadedFont);
                    this.loadedFonts.add(displayName);
                    return loadedFont;
                }).catch(err => {
                    console.warn(`Failed to load font ${displayName}:`, err);
                });
                
                fontLoadPromises.push(loadPromise);
                this.loadingPromises.set(displayName, loadPromise);
            }
        });

        // CSS zum DOM hinzufügen
        styleSheet.textContent = fontFaceRules;
        document.head.appendChild(styleSheet);

        // Warten bis alle Fonts geladen sind
        try {
            await Promise.all(fontLoadPromises);
            console.log(`${customFonts.length} custom fonts loaded and ready.`);
        } catch (err) {
            console.warn('Some fonts failed to load:', err);
        }

        this.isInitialized = true;
    }

    /**
     * Check if a specific font is loaded and ready
     */
    async isFontReady(fontFamily) {
        if (this.loadedFonts.has(fontFamily)) {
            return true;
        }

        // Falls Font noch lädt, warten
        if (this.loadingPromises.has(fontFamily)) {
            try {
                await this.loadingPromises.get(fontFamily);
                return true;
            } catch {
                return false;
            }
        }

        // Fallback: Browser-native Font-Check
        return document.fonts.check(`16px "${fontFamily}"`);
    }

    /**
     * Wait for a font to be loaded with timeout
     */
    async waitForFont(fontFamily, timeout = 3000) {
        if (await this.isFontReady(fontFamily)) {
            return true;
        }

        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkFont = () => {
                if (Date.now() - startTime > timeout) {
                    resolve(false);
                    return;
                }
                
                if (document.fonts.check(`16px "${fontFamily}"`)) {
                    resolve(true);
                } else {
                    setTimeout(checkFont, 50);
                }
            };
            
            checkFont();
        });
    }

    /**
     * Get all available font families
     */
    getAvailableFonts() {
        return [...this.fontFamilies];
    }

    /**
     * Populate a select element with available fonts
     */
    populateFontSelect(selectElement) {
        selectElement.innerHTML = '';
        
        this.fontFamilies.forEach(fontFamily => {
            const option = document.createElement('option');
            option.value = fontFamily;
            option.textContent = fontFamily;
            selectElement.appendChild(option);
        });
    }
}