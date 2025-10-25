// FAQ Modal Functionality
// Füge diesen Code am Ende deiner main.js hinzu oder als separates Modul

(() => {
  'use strict';

  // FAQ Modal Elements
  const els = {
    openFaqModal: document.getElementById('openFaqModal'),
    faqModal: document.getElementById('faqModal'),
    closeFaqModal: document.getElementById('closeFaqModal'),
    closeFaqModalFooter: document.getElementById('closeFaqModalFooter'),
    faqSearch: document.getElementById('faqSearch'),
    clearFaqSearch: document.getElementById('clearFaqSearch'),
    faqList: document.getElementById('faqList'),
    noFaqResults: document.getElementById('noFaqResults'),
    categoryBtns: document.querySelectorAll('.faq-category-btn'),
    faqItems: document.querySelectorAll('.faq-item')
  };

  let currentCategory = 'all';
  let currentSearchTerm = '';

  // Initialize FAQ Modal
  function initFaqModal() {
    // Event Listeners
    if (els.openFaqModal) {
      els.openFaqModal.addEventListener('click', openModal);
    }

    if (els.closeFaqModal) {
      els.closeFaqModal.addEventListener('click', closeModal);
    }

    if (els.closeFaqModalFooter) {
      els.closeFaqModalFooter.addEventListener('click', closeModal);
    }

    if (els.faqSearch) {
      els.faqSearch.addEventListener('input', handleSearch);
      els.faqSearch.addEventListener('keydown', handleSearchKeydown);
    }

    if (els.clearFaqSearch) {
      els.clearFaqSearch.addEventListener('click', clearSearch);
    }

    // Category buttons
    els.categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => handleCategoryChange(e.target.dataset.category));
    });

    // Close modal on outside click
    if (els.faqModal) {
      els.faqModal.addEventListener('click', (e) => {
        if (e.target === els.faqModal) {
          closeModal();
        }
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', handleGlobalKeydown);

    // Trap focus in modal
    if (els.faqModal) {
      els.faqModal.addEventListener('keydown', trapFocus);
    }
  }

  // Open modal
  function openModal() {
    if (!els.faqModal) return;
    
    els.faqModal.classList.remove('hidden');
    els.faqModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus search input
    setTimeout(() => {
      if (els.faqSearch) {
        els.faqSearch.focus();
      }
    }, 300);

    // Analytics
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'faq_opened', { event_category: 'user_engagement' });
      }
      if (typeof window.plausible === 'function') {
        window.plausible('FAQ Opened');
      }
    } catch (e) {
      console.debug('[analytics] FAQ modal opened');
    }
  }

  // Close modal
  function closeModal() {
    if (!els.faqModal) return;
    
    els.faqModal.classList.add('hidden');
    els.faqModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Return focus to trigger button
    if (els.openFaqModal) {
      els.openFaqModal.focus();
    }
  }

  // Handle search
  function handleSearch(e) {
    currentSearchTerm = e.target.value.toLowerCase().trim();
    filterFAQs();
    
    // Show/hide clear button
    if (els.clearFaqSearch) {
      els.clearFaqSearch.style.opacity = currentSearchTerm ? '1' : '0';
    }
  }

  // Handle search keydown
  function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
      clearSearch();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Focus first visible FAQ item
      const firstVisible = els.faqList?.querySelector('.faq-item:not(.hidden) summary');
      if (firstVisible) {
        firstVisible.focus();
      }
    }
  }

  // Clear search
  function clearSearch() {
    if (els.faqSearch) {
      els.faqSearch.value = '';
      currentSearchTerm = '';
      filterFAQs();
      els.faqSearch.focus();
    }
  }

  // Handle category change
  function handleCategoryChange(category) {
    currentCategory = category;
    
    // Update active button
    els.categoryBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    filterFAQs();
  }

  // Filter FAQs based on search and category
  function filterFAQs() {
    if (!els.faqItems || !els.noFaqResults) return;
    
    let visibleCount = 0;
    
    els.faqItems.forEach(item => {
      const category = item.dataset.category;
      const text = item.textContent.toLowerCase();
      
      const matchesCategory = currentCategory === 'all' || category === currentCategory;
      const matchesSearch = !currentSearchTerm || text.includes(currentSearchTerm);
      
      const shouldShow = matchesCategory && matchesSearch;
      
      if (shouldShow) {
        item.classList.remove('hidden');
        visibleCount++;
        
        // Highlight search terms
        if (currentSearchTerm) {
          highlightSearchTerm(item, currentSearchTerm);
        } else {
          removeHighlights(item);
        }
      } else {
        item.classList.add('hidden');
      }
    });
    
    // Show/hide no results message
    if (visibleCount === 0) {
      els.noFaqResults.classList.remove('hidden');
      els.faqList.style.display = 'none';
    } else {
      els.noFaqResults.classList.add('hidden');
      els.faqList.style.display = 'block';
    }
  }

  // Highlight search terms
  function highlightSearchTerm(item, searchTerm) {
    if (!searchTerm) return;
    
    const summary = item.querySelector('summary');
    const content = item.querySelector('p');
    
    if (summary) {
      highlightText(summary, searchTerm);
    }
    if (content) {
      highlightText(content, searchTerm);
    }
  }

  // Remove highlights
  function removeHighlights(item) {
    const highlights = item.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });
  }

  // Highlight text helper
  function highlightText(element, searchTerm) {
    // First remove existing highlights
    removeHighlights(element);
    
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
      
      if (regex.test(text)) {
        const highlightedHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
        const wrapper = document.createElement('span');
        wrapper.innerHTML = highlightedHTML;
        textNode.parentNode.replaceChild(wrapper, textNode);
      }
    });
  }

  // Escape regex characters
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Global keyboard shortcuts
  function handleGlobalKeydown(e) {
    // Open FAQ with F1 or Ctrl+?
    if (e.key === 'F1' || (e.ctrlKey && e.key === '?')) {
      e.preventDefault();
      if (!els.faqModal?.classList.contains('active')) {
        openModal();
      }
    }
    
    // Close modal with Escape
    if (e.key === 'Escape' && els.faqModal?.classList.contains('active')) {
      closeModal();
    }
  }

  // Trap focus within modal
  function trapFocus(e) {
    if (!els.faqModal?.classList.contains('active')) return;
    
    const focusableElements = els.faqModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  // Add search highlight styles
  function addSearchStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .search-highlight {
        background: linear-gradient(135deg, 
          color-mix(in oklab, var(--yellow) 40%, transparent),
          color-mix(in oklab, var(--yellow) 60%, transparent));
        color: var(--text);
        padding: 2px 4px;
        border-radius: 4px;
        font-weight: 600;
        animation: highlightPulse 2s ease-in-out;
      }
      
      @keyframes highlightPulse {
        0%, 100% { 
          background: linear-gradient(135deg, 
            color-mix(in oklab, var(--yellow) 40%, transparent),
            color-mix(in oklab, var(--yellow) 60%, transparent));
        }
        50% { 
          background: linear-gradient(135deg, 
            color-mix(in oklab, var(--yellow) 60%, transparent),
            color-mix(in oklab, var(--yellow) 80%, transparent));
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFaqModal();
      addSearchStyles();
    });
  } else {
    initFaqModal();
    addSearchStyles();
  }

  // Expose for testing/debugging
  window.faqModal = {
    open: openModal,
    close: closeModal,
    search: (term) => {
      if (els.faqSearch) {
        els.faqSearch.value = term;
        handleSearch({ target: { value: term } });
      }
    },
    setCategory: handleCategoryChange
  };

})();