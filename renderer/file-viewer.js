window.YamiFileViewer = (() => {
  let container = null;
  let tabBarEl = null;
  let contentEl = null;
  let openFiles = new Map(); // path -> { tab, content, isDirty, textarea, justSavedUntil }
  let activeFilePath = null;
  let initialized = false;
  let watchedFiles = new Set();
  let fsChangeDebounceTimer = new Map(); // path -> timer ID
  let justSavedUntil = new Map(); // path -> timestamp (until this time, ignore fs changes)

  function init(containerEl) {
    if (initialized) return;
    initialized = true;

    container = containerEl;
    if (!container) {
      console.warn('YamiFileViewer: container element not provided');
      return;
    }

    buildContent();
    attachListeners();
  }

  function buildContent() {
    container.innerHTML = '';

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'yami-file-viewer';

    tabBarEl = document.createElement('div');
    tabBarEl.className = 'file-viewer-tab-bar';

    contentEl = document.createElement('div');
    contentEl.className = 'file-viewer-content';

    wrapperEl.appendChild(tabBarEl);
    wrapperEl.appendChild(contentEl);
    container.appendChild(wrapperEl);
  }

  function attachListeners() {
    if (window.yamiterm?.claudePanel?.onFileTouched) {
      window.yamiterm.claudePanel.onFileTouched(async (event) => {
        const { id, filePath, action } = event;
        if (window.YamiTabs && typeof window.YamiTabs.getActiveId === 'function') {
          const activeId = window.YamiTabs.getActiveId();
          if (id !== undefined && activeId !== undefined && id !== activeId) {
            return;
          }
        }
        if (action === 'edit' || action === 'write') {
          await openFile(filePath);
        }
      });
    } else {
      console.warn('YamiFileViewer: window.yamiterm.claudePanel.onFileTouched not available');
    }

    if (window.yamiterm?.claudePanel?.onFsChanged) {
      window.yamiterm.claudePanel.onFsChanged(({ path }) => {
        if (openFiles.has(path)) {
          // Check if file was just saved by us; if so, ignore this change
          const savedUntil = justSavedUntil.get(path);
          if (savedUntil && Date.now() < savedUntil) {
            return; // Still within grace period, ignore
          }

          const fileData = openFiles.get(path);
          if (fileData.isDirty) {
            // The user has unsaved edits: never overwrite them with the on-disk content.
            // Show the banner only when this file is on screen; showExternalChangeNotification()
            // already guards on activeFilePath.
            showExternalChangeNotification(path);
            fileData.externalChangePending = true;
            return;
          }

          // Debounce file reload to prevent UI flicker on high-frequency changes
          if (fsChangeDebounceTimer.has(path)) {
            clearTimeout(fsChangeDebounceTimer.get(path));
          }
          const timerId = setTimeout(() => {
            reloadFile(path);
            fsChangeDebounceTimer.delete(path);
          }, 300); // 300ms debounce delay
          fsChangeDebounceTimer.set(path, timerId);
        }
      });
    } else {
      console.warn('YamiFileViewer: window.yamiterm.claudePanel.onFsChanged not available');
    }
  }

  function openFile(filePath) {
    if (openFiles.has(filePath)) {
      // Already open, just activate
      activeFilePath = filePath;
      renderTabs();
      showContent(filePath);
      return;
    }

    try {
      if (!window.yamiterm?.claudePanel?.readFile) {
        console.error('YamiFileViewer: window.yamiterm.claudePanel.readFile is not available');
        return;
      }

      window.yamiterm.claudePanel.readFile(filePath).then((result) => {
        if (!result) {
          console.warn('YamiFileViewer: failed to read file', filePath);
          return;
        }

        const { content, truncated } = result;

        const tabEl = document.createElement('div');
        tabEl.className = 'file-viewer-tab';
        tabEl.dataset.path = filePath;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-viewer-tab-name';
        const fileName = filePath.split('/').pop();
        nameSpan.textContent = fileName;
        tabEl.appendChild(nameSpan);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'file-viewer-tab-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeFile(filePath);
        });
        tabEl.appendChild(closeBtn);

        tabEl.addEventListener('click', () => {
          activeFilePath = filePath;
          renderTabs();
          showContent(filePath);
        });

        openFiles.set(filePath, {
          tab: tabEl,
          content,
          isDirty: false,
          truncated,
          isSaving: false,
          externalChangePending: false,
        });

        // Start watching for changes
        if (window.yamiterm?.claudePanel?.watchFile) {
          window.yamiterm.claudePanel.watchFile(filePath)
            .then(() => {
              watchedFiles.add(filePath);
            })
            .catch((err) => {
              console.error('YamiFileViewer: failed to watch file', filePath, err);
            });
        }

        activeFilePath = filePath;
        renderTabs();
        showContent(filePath);
      }).catch((err) => {
        console.error('YamiFileViewer: failed to open file', filePath, err);
      });
    } catch (err) {
      console.error('YamiFileViewer: failed to open file', filePath, err);
    }
  }

  function closeFile(filePath) {
    if (!openFiles.has(filePath)) return;

    const fileData = openFiles.get(filePath);

    // If file is dirty, show confirmation modal
    if (fileData.isDirty) {
      showCloseConfirmModal(filePath);
      return;
    }

    // File is not dirty, proceed with close
    performCloseFile(filePath);
  }

  function performCloseFile(filePath) {
    if (!openFiles.has(filePath)) return;

    openFiles.delete(filePath);

    // Clean up timers
    if (fsChangeDebounceTimer.has(filePath)) {
      clearTimeout(fsChangeDebounceTimer.get(filePath));
      fsChangeDebounceTimer.delete(filePath);
    }
    if (justSavedUntil.has(filePath)) {
      justSavedUntil.delete(filePath);
    }

    // Stop watching
    if (watchedFiles.has(filePath)) {
      if (window.yamiterm?.claudePanel?.unwatchFile) {
        window.yamiterm.claudePanel.unwatchFile(filePath)
          .catch((err) => {
            console.error('YamiFileViewer: failed to unwatch file', filePath, err);
          });
      }
      watchedFiles.delete(filePath);
    }

    if (activeFilePath === filePath) {
      // Switch to another file or clear
      const remainingPaths = Array.from(openFiles.keys());
      if (remainingPaths.length > 0) {
        activeFilePath = remainingPaths[0];
      } else {
        activeFilePath = null;
        contentEl.innerHTML = '';
      }
    }

    renderTabs();
    if (activeFilePath) {
      showContent(activeFilePath);
    }
  }

  async function reloadFile(filePath) {
    if (!openFiles.has(filePath)) return;

    try {
      if (!window.yamiterm?.claudePanel?.readFile) {
        console.error('YamiFileViewer: window.yamiterm.claudePanel.readFile is not available');
        return;
      }

      const result = await window.yamiterm.claudePanel.readFile(filePath);
      if (!result) return;

      const fileData = openFiles.get(filePath);
      if (!fileData) return;
      fileData.content = result.content;
      fileData.truncated = result.truncated;
      fileData.isDirty = false;

      if (activeFilePath === filePath) {
        showContent(filePath);
      }
    } catch (err) {
      console.error('YamiFileViewer: failed to reload file', filePath, err);
    }
  }

  function renderTabs() {
    if (!tabBarEl) return;
    tabBarEl.innerHTML = '';

    openFiles.forEach((fileData, filePath) => {
      const tabEl = fileData.tab;
      let classes = 'file-viewer-tab';
      if (filePath === activeFilePath) {
        classes += ' active';
      }
      if (fileData.isDirty) {
        classes += ' dirty';
      }
      tabEl.className = classes;
      tabBarEl.appendChild(tabEl);
    });
  }

  function showContent(filePath) {
    if (!contentEl || !openFiles.has(filePath)) return;

    const fileData = openFiles.get(filePath);
    contentEl.innerHTML = '';

    // If external change was pending while tab was inactive, show banner now
    if (fileData.externalChangePending) {
      showExternalChangeNotification(filePath);
      fileData.externalChangePending = false;
    }

    // Create editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-container';

    // Create syntax highlight layer (background)
    const highlightLayer = document.createElement('div');
    highlightLayer.className = 'editor-highlight-layer';

    // Generate highlighted HTML if YamiSyntaxHighlight is available. The
    // textarea itself is transparent (color: transparent), so this layer is
    // what actually renders the visible text — it must never be left empty.
    const preEl = document.createElement('pre');
    preEl.className = 'editor-highlight-pre';
    if (window.YamiSyntaxHighlight && typeof window.YamiSyntaxHighlight.highlight === 'function') {
      preEl.innerHTML = window.YamiSyntaxHighlight.highlight(fileData.content, filePath);
    } else {
      preEl.textContent = fileData.content;
    }
    highlightLayer.appendChild(preEl);

    // Create textarea for editing
    const textarea = document.createElement('textarea');
    textarea.className = 'editor-textarea';
    textarea.value = fileData.content;
    textarea.spellcheck = 'false';
    // Truncated files only hold a partial read; saving would silently
    // discard the remainder of the file, so editing is disabled.
    if (fileData.truncated) {
      textarea.readOnly = true;
    }

    // Store textarea reference in fileData
    fileData.textarea = textarea;

    // Input event: mark as dirty
    textarea.addEventListener('input', () => {
      if (!fileData.isDirty) {
        fileData.isDirty = true;
        renderTabs();
      }
    });

    // Keydown event: detect Cmd/Ctrl+S for save
    textarea.addEventListener('keydown', (e) => {
      const isMac = window.yamiterm?.platform === 'darwin';
      const key = e.key.toLowerCase();
      const isSaveShortcut = (isMac && e.metaKey && key === 's') ||
                             (!isMac && e.ctrlKey && key === 's');
      if (isSaveShortcut) {
        e.preventDefault();
        saveFile(filePath);
      }
    });

    // Sync scroll between textarea and highlight layer
    textarea.addEventListener('scroll', () => {
      highlightLayer.scrollLeft = textarea.scrollLeft;
      highlightLayer.scrollTop = textarea.scrollTop;
    });

    // Build editor DOM
    editorContainer.appendChild(highlightLayer);
    editorContainer.appendChild(textarea);
    contentEl.appendChild(editorContainer);

    // Add truncation note if applicable
    if (fileData.truncated) {
      const noteEl = document.createElement('div');
      noteEl.className = 'file-viewer-truncated-note';
      noteEl.textContent = '(File truncated - too large to display completely. Read-only to prevent data loss on save.)';
      contentEl.appendChild(noteEl);
    }
  }

  async function saveFile(filePath) {
    if (!openFiles.has(filePath)) return;

    const fileData = openFiles.get(filePath);

    // Never save a truncated file: the textarea only holds a partial read,
    // so writing it back would permanently discard the rest of the file.
    if (fileData.truncated) {
      console.warn('YamiFileViewer: refusing to save truncated file', filePath);
      return;
    }

    const content = fileData.textarea?.value ?? fileData.content;

    if (!window.yamiterm?.claudePanel?.writeFile) {
      console.error('YamiFileViewer: window.yamiterm.claudePanel.writeFile is not available');
      return;
    }

    // Prevent duplicate save requests (Cmd+S rapid fire, etc.)
    if (fileData.isSaving) {
      return;
    }

    try {
      fileData.isSaving = true;
      await window.yamiterm.claudePanel.writeFile(filePath, content);

      // Mark as saved and update content
      fileData.content = content;
      fileData.isDirty = false;

      // Set grace period for self-written changes
      justSavedUntil.set(filePath, Date.now() + 1000);

      renderTabs();
    } catch (err) {
      console.error('YamiFileViewer: failed to save file', filePath, err);
      showSaveErrorNotification(filePath, err);
    } finally {
      fileData.isSaving = false;
    }
  }

  function showSaveErrorNotification(filePath, err) {
    if (!contentEl || activeFilePath !== filePath) return;

    let banner = contentEl.querySelector('.save-error-banner');
    if (banner) banner.remove();

    banner = document.createElement('div');
    banner.className = 'external-change-banner save-error-banner';

    const message = document.createElement('span');
    message.className = 'external-change-banner-message';
    message.textContent = `Failed to save: ${err && err.message ? err.message : 'unknown error'}`;
    banner.appendChild(message);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'external-change-banner-btn';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => banner.remove());
    banner.appendChild(dismissBtn);

    contentEl.insertBefore(banner, contentEl.firstChild);
  }

  function showExternalChangeNotification(filePath) {
    if (!contentEl) return;
    if (activeFilePath !== filePath) return; // Only show banner for the active file

    // Check if banner already exists
    let banner = contentEl.querySelector('.external-change-banner');
    if (banner) return; // Banner already shown

    const fileData = openFiles.get(filePath);
    if (!fileData) return;

    // Create banner element
    banner = document.createElement('div');
    banner.className = 'external-change-banner';

    const message = document.createElement('span');
    message.textContent = 'This file was modified externally. ';
    banner.appendChild(message);

    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'external-change-reload-btn';
    reloadBtn.textContent = 'Reload';
    reloadBtn.addEventListener('click', async () => {
      await reloadFile(filePath);
      banner.remove();
    });
    banner.appendChild(reloadBtn);

    // Insert banner at the top of contentEl
    contentEl.insertBefore(banner, contentEl.firstChild);
  }

  function showCloseConfirmModal(filePath) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'close-confirm-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'close-confirm-modal';

    const title = document.createElement('h3');
    title.textContent = 'Unsaved Changes';
    title.className = 'close-confirm-modal-title';
    modal.appendChild(title);

    const message = document.createElement('p');
    message.textContent = 'This file has unsaved changes. What do you want to do?';
    message.className = 'close-confirm-modal-message';
    modal.appendChild(message);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'close-confirm-modal-buttons';

    // "Cancel" button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'close-confirm-modal-btn close-confirm-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });
    buttonsContainer.appendChild(cancelBtn);

    // "Close without saving" button
    const discardBtn = document.createElement('button');
    discardBtn.className = 'close-confirm-modal-btn close-confirm-discard-btn';
    discardBtn.textContent = 'Close without saving';
    discardBtn.addEventListener('click', () => {
      overlay.remove();
      performCloseFile(filePath);
    });
    buttonsContainer.appendChild(discardBtn);

    // "Save and close" button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'close-confirm-modal-btn close-confirm-save-btn';
    saveBtn.textContent = 'Save and close';
    saveBtn.addEventListener('click', async () => {
      overlay.remove();
      await saveFile(filePath);
      performCloseFile(filePath);
    });
    buttonsContainer.appendChild(saveBtn);

    modal.appendChild(buttonsContainer);
    overlay.appendChild(modal);

    // Close modal if clicking outside (on overlay background)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Insert into page
    document.body.appendChild(overlay);
  }

  return {
    init,
    openFile,
  };
})();
