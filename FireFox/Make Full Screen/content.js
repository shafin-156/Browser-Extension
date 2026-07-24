// content.js (modified: X button visible only on hover)
(function() {
  if (window.fullScreenPickerActive) return;
  window.fullScreenPickerActive = true;

  let highlightedElement = null;
  const overlayId = "fs-extension-overlay-8372";
  const highlightClass = "fs-extension-highlight";
  const cursorUrl = browser.runtime.getURL("cursor.png");
  const cursorStyle = `url('${cursorUrl}') 16 16, auto`;

  // Fullscreen overlay management variables
  let fsExtensionTarget = null;
  let fsOverlayElement = null;
  let fsTimerInterval = null;
  let fsDragActive = false;
  let fsDragStartX = 0, fsDragStartY = 0;
  let fsDragStartLeft = 0, fsDragStartTop = 0;

  if (!document.getElementById("fs-extension-styles")) {
    const style = document.createElement("style");
    style.id = "fs-extension-styles";
    style.textContent = `
      .${highlightClass} { 
        outline: 8px groove #00ff00 !important; 
        outline-offset: -3px;
        cursor: ${cursorStyle} !important; 
      }
      #${overlayId} {
        position: fixed;
        z-index: 2147483647;
        padding: 20px;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        background: rgba(20, 20, 20, 0.8);
        backdrop-filter: blur(5px);
        border: 3px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      }
      .fs-desc {
        color: rgba(255, 255, 255, 0.5);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 800;
      }
      .fs-btn-container { display: flex; gap: 12px; }
      
      #${overlayId} button {
        position: relative;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: transparent;
        color: #fff;
        overflow: hidden;
        transition: color 0.3s ease;
        z-index: 1;
      }

      /* Hover Fill Effect */
      #${overlayId} button::before {
        content: '';
        position: absolute;
        top: 0; left: 0; width: 0; height: 100%;
        transition: width 0.3s ease;
        z-index: -1;
      }
      #${overlayId} button:hover::before { width: 100%; }

      /* Specific Button Colors */
      .fs-btn-confirm { border-color: #00f2ff !important; color: #00f2ff; }
      .fs-btn-confirm::before { background: #00f2ff; }
      .fs-btn-confirm:hover { color: #000 !important; }

      .fs-btn-cancel { border-color: #ff4d4d !important; color: #ff4d4d; }
      .fs-btn-cancel::before { background: #ff4d4d; }
      .fs-btn-cancel:hover { color: #fff !important; }

      /* Styles for the draggable time/date watermark overlay */
      .fs-time-overlay {
        position: fixed;
        bottom: 10px;
        right: 12px;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(1px);
        border-radius: 8px;
        padding: 5px 10px;
        font-family: 'Segoe UI', system-ui, monospace;
        z-index: 2147483647;
        cursor: grab;
        user-select: none;
        border: 2px solid rgba(0, 0, 0, 0.1);
        box-shadow: none;
        transition: opacity 0.2s;
        min-width: 80px;
        text-align: center;
      }
      .fs-time-overlay:active {
        cursor: grabbing;
      }
      .fs-time-overlay:hover {
        background: rgba(255, 255, 255, 0.85);
        border-color: rgba(0, 0, 0, 0.2);
      }
      .fs-time-clock {
        font-size: 20px;
        font-weight: bold;
        color: #000000;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.5px;
        line-height: 1.2;
        margin: 0;
        padding: 0;
      }
      .fs-time-date {
        font-size: 14.2px;
        font-weight: bold;
        color: #000000;
        letter-spacing: 0.3px;
        line-height: 1.2;
        margin: 0;
        padding: 0;
      }
      .fs-close-btn {
        position: absolute;
        top: -8px;
        right: -8px;
		padding: 2px;
        width: 18px;
        height: 18px;
        background: #D10000;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        cursor: pointer;
        border: 1px solid white;
        transition: transform 0.2s, background 0.2s, opacity 0.2s;
        z-index: 10;
        line-height: 1;
        opacity: 0;
      }
      .fs-time-overlay:hover .fs-close-btn {
        opacity: 1;
      }
      .fs-close-btn:hover {
        transform: scale(1.2);
      }
    `;
    document.head.appendChild(style);
  }

  function onMouseOver(e) {
    e.stopPropagation();
    if (highlightedElement) {
      highlightedElement.classList.remove(highlightClass);
    }
    highlightedElement = e.target;
    highlightedElement.classList.add(highlightClass);
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (highlightedElement) {
      highlightedElement.classList.remove(highlightClass);
    }
    highlightedElement = e.target;
    highlightedElement.classList.add(highlightClass);
    stopSelection(e.clientX, e.clientY);
  }

  function startSelection() {
    document.body.style.cursor = cursorStyle;
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("click", onClick, { capture: true, once: true });
    document.addEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      cleanup();
    }
  }

  // ----- Fullscreen overlay functions -----
  function cleanupFullscreenOverlay() {
    if (fsTimerInterval) {
      clearInterval(fsTimerInterval);
      fsTimerInterval = null;
    }
    if (fsOverlayElement && fsOverlayElement.remove) {
      fsOverlayElement.remove();
      fsOverlayElement = null;
    }
    // Remove drag listeners if any
    document.removeEventListener('mousemove', onFsDragMove);
    document.removeEventListener('mouseup', onFsDragEnd);
    fsDragActive = false;
  }

  function updateDateTimeDisplay(timeElement, dateElement) {
    const now = new Date();
    // 24-hour format forced with hour12: false
    timeElement.textContent = now.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
    // Date format: DD-MM-YYYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    dateElement.textContent = `${day}-${month}-${year}`;
  }

  function onFsDragMove(e) {
    if (!fsDragActive || !fsOverlayElement) return;
    e.preventDefault();
    let newLeft = fsDragStartLeft + (e.clientX - fsDragStartX);
    let newTop = fsDragStartTop + (e.clientY - fsDragStartY);
    // Boundary constraints
    const maxX = window.innerWidth - fsOverlayElement.offsetWidth - 10;
    const maxY = window.innerHeight - fsOverlayElement.offsetHeight - 10;
    newLeft = Math.min(Math.max(newLeft, 10), maxX);
    newTop = Math.min(Math.max(newTop, 10), maxY);
    fsOverlayElement.style.left = `${newLeft}px`;
    fsOverlayElement.style.top = `${newTop}px`;
    fsOverlayElement.style.right = 'auto';
    fsOverlayElement.style.bottom = 'auto';
  }

  function onFsDragEnd(e) {
    if (!fsDragActive) return;
    fsDragActive = false;
    document.removeEventListener('mousemove', onFsDragMove);
    document.removeEventListener('mouseup', onFsDragEnd);
  }

  function initDragHandlers(overlay) {
    overlay.addEventListener('mousedown', (e) => {
      // Don't start drag if clicking on the close button
      if (e.target.classList && e.target.classList.contains('fs-close-btn')) return;
      e.preventDefault();
      fsDragActive = true;
      fsDragStartX = e.clientX;
      fsDragStartY = e.clientY;
      // Get current position (left/top or convert from right/bottom)
      let currentLeft = parseInt(overlay.style.left, 10);
      let currentTop = parseInt(overlay.style.top, 10);
      if (isNaN(currentLeft)) {
        // If position was set via right/bottom, compute left/top from getBoundingClientRect
        const rect = overlay.getBoundingClientRect();
        currentLeft = rect.left;
        currentTop = rect.top;
        overlay.style.left = `${currentLeft}px`;
        overlay.style.top = `${currentTop}px`;
        overlay.style.right = 'auto';
        overlay.style.bottom = 'auto';
      }
      fsDragStartLeft = currentLeft;
      fsDragStartTop = currentTop;
      document.addEventListener('mousemove', onFsDragMove);
      document.addEventListener('mouseup', onFsDragEnd);
    });
  }

  function createFullscreenOverlay(targetElement) {
    // Remove any existing overlay first
    cleanupFullscreenOverlay();
    
    const overlay = document.createElement('div');
    overlay.className = 'fs-time-overlay';
    
    // Time first line, Date second line
    const timeLine = document.createElement('div');
    timeLine.className = 'fs-time-clock';
    const dateLine = document.createElement('div');
    dateLine.className = 'fs-time-date';
    
    overlay.appendChild(timeLine);
    overlay.appendChild(dateLine);
    
    // Close button: only removes the time/date overlay, does NOT exit fullscreen
    const closeBtn = document.createElement('div');
    closeBtn.className = 'fs-close-btn';
    closeBtn.textContent = '✖';
    closeBtn.title = 'Close';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      // Remove only the overlay, keep fullscreen active
      cleanupFullscreenOverlay();
    };
    overlay.appendChild(closeBtn);
    
    // Initial position (bottom-right)
    overlay.style.position = 'fixed';
    overlay.style.bottom = '20px';
    overlay.style.right = '20px';
    overlay.style.left = 'auto';
    overlay.style.top = 'auto';
    
    // Append to the fullscreen element (or body fallback)
    if (targetElement && targetElement.nodeType === 1) {
      targetElement.appendChild(overlay);
    } else {
      document.body.appendChild(overlay);
    }
    
    // Initialize time display and update every second
    updateDateTimeDisplay(timeLine, dateLine);
    fsTimerInterval = setInterval(() => updateDateTimeDisplay(timeLine, dateLine), 1000);
    
    // Make draggable
    initDragHandlers(overlay);
    
    // Store reference
    fsOverlayElement = overlay;
    return overlay;
  }

  // Listen for fullscreen changes to show/hide custom overlay
  function setupFullscreenMonitor() {
    document.addEventListener('fullscreenchange', () => {
      const fullscreenElem = document.fullscreenElement;
      if (fullscreenElem && fsExtensionTarget && fullscreenElem === fsExtensionTarget) {
        // Entered fullscreen on our target element: create overlay
        if (!fsOverlayElement) {
          createFullscreenOverlay(fsExtensionTarget);
        }
      } else if (!fullscreenElem && fsExtensionTarget) {
        // Exited fullscreen, clean up resources
        cleanupFullscreenOverlay();
        fsExtensionTarget = null;
      }
    });
  }
  
  // Call once to start monitoring fullscreen
  setupFullscreenMonitor();

  function stopSelection(x, y) {
    document.body.style.cursor = "default";
    document.removeEventListener("mouseover", onMouseOver);
    document.removeEventListener("keydown", onKeyDown);
    
    const ui = document.createElement("div");
    ui.id = overlayId;
    
    function reposition() {
      const maxY = window.innerHeight - ui.offsetHeight - 20;
      const maxX = window.innerWidth - ui.offsetWidth - 20;
      ui.style.top = `${Math.min(Math.max(y + 20, 20), maxY)}px`;
      ui.style.left = `${Math.min(Math.max(x + 20, 20), maxX)}px`;
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition);

    const desc = document.createElement("p");
    desc.className = "fs-desc";
    desc.textContent = "Select Action";

    const container = document.createElement("div");
    container.className = "fs-btn-container";

    const btnFull = document.createElement("button");
    btnFull.className = "fs-btn-confirm";
    btnFull.textContent = "Full Screen";
    btnFull.onclick = () => {
      if (highlightedElement) {
        // Store target element before requesting fullscreen
        fsExtensionTarget = highlightedElement;
        // Request fullscreen on the selected element
        highlightedElement.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request failed:", err);
          fsExtensionTarget = null;
          cleanupFullscreenOverlay();
        });
      }
      // Cleanup the selection UI (highlight, overlay, etc.)
      cleanup();
    };

    const btnCancel = document.createElement("button");
    btnCancel.className = "fs-btn-cancel";
    btnCancel.textContent = "Cancel";
    btnCancel.onclick = () => cleanup();

    container.appendChild(btnFull);
    container.appendChild(btnCancel);
    ui.appendChild(desc);
    ui.appendChild(container);
    document.body.appendChild(ui);

    ui._cleanupResize = () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition);
    };
  }

  function cleanup() {
    document.body.style.cursor = "default";
    document.removeEventListener("mouseover", onMouseOver);
    document.removeEventListener("keydown", onKeyDown);
    if (highlightedElement) {
      highlightedElement.classList.remove(highlightClass);
    }
    const ui = document.getElementById(overlayId);
    if (ui) {
      if (ui._cleanupResize) ui._cleanupResize();
      ui.remove();
    }
    window.fullScreenPickerActive = false;
  }

  startSelection();
})();