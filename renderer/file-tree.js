window.YamiFileTree = (() => {
  let container = null;
  let rootPath = null;
  let treeEl = null;
  let expandedDirs = new Set();
  let fileOnTouchedListener = null;
  let onFileSelect = null;
  let initialized = false;

  function init(rootDir, containerEl, onFileSelectCallback) {
    if (initialized) return;
    initialized = true;

    rootPath = rootDir;
    container = containerEl;
    onFileSelect = onFileSelectCallback;

    if (!container) {
      console.warn('YamiFileTree: container element not provided');
      return;
    }

    buildContent();
    attachListeners();
    renderTree();
  }

  function buildContent() {
    container.innerHTML = '';
    treeEl = document.createElement('div');
    treeEl.className = 'yami-file-tree';
    container.appendChild(treeEl);
  }

  function attachListeners() {
    if (window.yamiterm?.claudePanel?.onFileTouched) {
      window.yamiterm.claudePanel.onFileTouched(async (event) => {
        const { id, filePath } = event;
        if (window.YamiTabs && typeof window.YamiTabs.getActiveId === 'function') {
          const activeId = window.YamiTabs.getActiveId();
          if (id !== undefined && activeId !== undefined && id !== activeId) {
            return;
          }
        }
        await highlightFile(filePath);
      });
    } else {
      console.warn('YamiFileTree: window.yamiterm.claudePanel.onFileTouched not available');
    }
  }

  async function renderTree() {
    if (!treeEl || !rootPath) return;
    treeEl.innerHTML = '';

    const rootNode = document.createElement('div');
    rootNode.className = 'tree-node tree-node-root';

    const rootLabel = document.createElement('div');
    rootLabel.className = 'tree-label';
    const rootText = document.createElement('span');
    rootText.textContent = rootPath;
    rootLabel.appendChild(rootText);

    rootNode.appendChild(rootLabel);

    const rootChildren = document.createElement('div');
    rootChildren.className = 'tree-children';
    rootNode.appendChild(rootChildren);

    expandedDirs.add(rootPath);
    await renderChildren(rootPath, rootChildren);

    treeEl.appendChild(rootNode);
  }

  async function renderChildren(dirPath, parentEl) {
    try {
      if (!window.yamiterm?.claudePanel?.listDir) {
        console.error('YamiFileTree: window.yamiterm.claudePanel.listDir is not available');
        return;
      }

      const entries = await window.yamiterm.claudePanel.listDir(dirPath);
      if (!entries || !Array.isArray(entries)) {
        console.warn('YamiFileTree: listDir returned invalid data for', dirPath);
        return;
      }

      entries.forEach(entry => {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'tree-node';
        nodeEl.dataset.path = entry.path;
        nodeEl.dataset.isDir = entry.isDir ? '1' : '0';

        const labelEl = document.createElement('div');
        labelEl.className = 'tree-label';

        if (entry.isDir) {
          const toggleBtn = document.createElement('button');
          toggleBtn.className = 'tree-toggle';
          toggleBtn.textContent = expandedDirs.has(entry.path) ? '▼' : '▶';
          toggleBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleDir(entry.path, nodeEl, toggleBtn);
          });
          labelEl.appendChild(toggleBtn);
        } else {
          const spacer = document.createElement('span');
          spacer.className = 'tree-toggle-spacer';
          labelEl.appendChild(spacer);
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'tree-name';
        nameSpan.textContent = entry.name;
        labelEl.appendChild(nameSpan);

        labelEl.addEventListener('click', () => {
          if (!entry.isDir && onFileSelect) {
            onFileSelect(entry.path);
          }
        });

        nodeEl.appendChild(labelEl);

        if (entry.isDir) {
          const childrenEl = document.createElement('div');
          childrenEl.className = 'tree-children';
          if (expandedDirs.has(entry.path)) {
            childrenEl.style.display = 'block';
            await renderChildren(entry.path, childrenEl);
          } else {
            childrenEl.style.display = 'none';
          }
          nodeEl.appendChild(childrenEl);
        }

        parentEl.appendChild(nodeEl);
      });
    } catch (err) {
      console.error('YamiFileTree: failed to list directory', dirPath, err);
    }
  }

  async function toggleDir(dirPath, nodeEl, toggleBtn) {
    const childrenEl = nodeEl.querySelector('.tree-children');
    if (!childrenEl) return;

    if (expandedDirs.has(dirPath)) {
      expandedDirs.delete(dirPath);
      childrenEl.style.display = 'none';
      toggleBtn.textContent = '▶';
    } else {
      expandedDirs.add(dirPath);
      childrenEl.innerHTML = '';
      await renderChildren(dirPath, childrenEl);
      childrenEl.style.display = 'block';
      toggleBtn.textContent = '▼';
    }
  }

  async function highlightFile(filePath) {
    // Remove previous highlight
    document.querySelectorAll('.tree-node').forEach(node => {
      node.classList.remove('highlighted');
    });

    // Add highlight to matching file
    const matchingNode = document.querySelector(`[data-path="${CSS.escape(filePath)}"]`);
    if (matchingNode) {
      matchingNode.classList.add('highlighted');

      // Collect parent directories that need to be expanded
      const nodesToExpand = [];
      let parent = matchingNode.closest('.tree-node');
      while (parent && parent !== treeEl) {
        const parentPath = parent.dataset.path;
        if (parentPath && !expandedDirs.has(parentPath)) {
          const toggleBtn = parent.querySelector('.tree-toggle');
          if (toggleBtn && parent.dataset.isDir === '1') {
            nodesToExpand.push({ nodeEl: parent, toggleBtn, dirPath: parentPath });
          }
        }
        parent = parent.parentElement?.closest('.tree-node');
      }

      // Expand parent directories sequentially to ensure DOM is ready
      for (const item of nodesToExpand) {
        await toggleDir(item.dirPath, item.nodeEl, item.toggleBtn);
      }

      matchingNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  return {
    init,
  };
})();
