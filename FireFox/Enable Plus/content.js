/**
 * Enable Plus - Production Logic
 * Targets: Attributes, CSS restrictions, and JS event blockers.
 */

const forceEnable = () => {
    // 1. Core Attribute Unlocker
    const selectors = '[disabled], [readonly], [aria-disabled="true"], [aria-readonly="true"], [tabindex="-1"], [contenteditable="false"]';
    const elements = document.querySelectorAll(selectors);
    
    elements.forEach(el => {
        // Remove standard and ARIA locking attributes
        el.removeAttribute('disabled');
        el.removeAttribute('readonly');
        el.removeAttribute('aria-disabled');
        el.removeAttribute('aria-readonly');
        
        // Reset properties directly
        el.disabled = false;
        el.readOnly = false;

        // Restore focusability and editability[cite: 1]
        if (el.getAttribute('tabindex') === '-1') el.setAttribute('tabindex', '0');
        if (el.getAttribute('contenteditable') === 'false') el.setAttribute('contenteditable', 'true');

        // Style Cleanup: Re-enable interaction[cite: 1]
        el.classList.remove('disabled', 'is-disabled', 'readonly', 'is-readonly', 'locked');
        el.style.pointerEvents = 'auto'; 
        el.style.userSelect = 'auto';    
    });

    // 2. Global Selection Reinforcement
    // Injects a high-priority style to override any 'user-select: none' CSS rules.
    if (!document.getElementById('enable-plus-global-css')) {
        const style = document.createElement('style');
        style.id = 'enable-plus-global-css';
        style.innerHTML = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                cursor: auto !important;
            }
            input, textarea, [contenteditable="true"] {
                cursor: text !important;
            }
        `;
        document.head.appendChild(style);
    }
};

/**
 * Global Event Nullifier
 * Intercepts events that prevent copying or right-clicking.
 */
const killBlockers = () => {
    const events = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu'];
    events.forEach(evt => {
        document.addEventListener(evt, (e) => e.stopPropagation(), true);
    });
};

// Initial Execution
forceEnable();
killBlockers();

// 3. Dynamic Page Monitoring[cite: 1]
// Watches for elements added via AJAX or attribute changes by scripts.
const observer = new MutationObserver(() => forceEnable());
observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'readonly', 'aria-disabled', 'aria-readonly', 'tabindex', 'contenteditable', 'style', 'class']
});