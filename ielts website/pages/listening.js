// Listening Page JavaScript
console.log('🎧 Listening page JS loaded');

// HTML 转义函数
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// IndexedDB 音频存储管理器
class AudioStorageManager {
    constructor() {
        this.dbName = 'IELTSListeningAudioDB';
        this.dbVersion = 1;
        this.storeName = 'audioFiles';
        this.db = null;
    }

    // 初始化数据库
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    objectStore.createIndex('noteId', 'noteId', { unique: false });
                }
            };
        });
    }

    // 保存音频数据
    async saveAudio(noteId, audioData) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const audioRecord = {
                id: `${noteId}_audio`,
                noteId: noteId,
                audioData: audioData,
                timestamp: Date.now()
            };
            
            const request = store.put(audioRecord);
            request.onsuccess = () => resolve(audioRecord.id);
            request.onerror = () => reject(request.error);
        });
    }

    // 获取音频数据
    async getAudio(noteId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(`${noteId}_audio`);
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.audioData : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 删除音频数据
    async deleteAudio(noteId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(`${noteId}_audio`);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 检查音频是否在IndexedDB中
    async hasAudio(noteId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(`${noteId}_audio`);
            
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// 创建全局音频存储管理器实例
const audioStorage = new AudioStorageManager();

// 自动迁移现有音频到IndexedDB
async function migrateAudioToIndexedDB() {
    try {
        const notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
        let migratedCount = 0;
        
        for (const note of notes) {
            if (note.audioData && typeof note.audioData === 'string' && note.audioData.length > 0) {
                // 检查是否已经在IndexedDB中
                const hasAudio = await audioStorage.hasAudio(note.id);
                if (!hasAudio) {
                    // 迁移到IndexedDB
                    await audioStorage.saveAudio(note.id, note.audioData);
                    // 从localStorage中移除音频数据，只保留标记
                    note.audioData = 'INDEXEDDB'; // 标记为已迁移
                    migratedCount++;
                }
            }
        }
        
        if (migratedCount > 0) {
            // 保存更新后的笔记（不包含音频数据）
            localStorage.setItem('listeningNotes', JSON.stringify(notes));
            console.log(`✅ 成功迁移 ${migratedCount} 个音频文件到IndexedDB`);
            return migratedCount;
        }
        return 0;
    } catch (error) {
        console.error('迁移音频失败:', error);
        return 0;
    }
}

// 加载笔记时，从IndexedDB恢复音频数据
async function loadAudioFromIndexedDB(note) {
    if (note.audioData === 'INDEXEDDB' || (!note.audioData && note.id)) {
        try {
            const audioData = await audioStorage.getAudio(note.id);
            if (audioData) {
                note.audioData = audioData;
            }
        } catch (error) {
            console.error('从IndexedDB加载音频失败:', error);
        }
    }
    return note;
}

// 全局变量：跟踪正在编辑的笔记ID
let editingNoteId = null;
// 全局变量：跟踪图片是否被删除（用于编辑模式）
let imageDeleted = false;
// 临时保存已选择的图片数据（base64），以防文件输入在预览后被替换掉
let pendingImageData = null;

// 删除图片函数（全局函数，可在多个地方使用）
function removeImage() {
    const imageInput = document.getElementById('noteImage');
    const imagePreview = document.getElementById('imagePreview');
    const imageUploadContainer = document.getElementById('imageUploadContainer');
    if (imageInput) {
        imageInput.value = ''; // 清空文件输入
    }
    if (imagePreview) {
        // 恢复为初始状态，显示上传按钮在中间
        imagePreview.innerHTML = `
            <div class="custom-file-upload">
                <input type="file" id="noteImage" name="image" class="file-input-hidden" accept="image/*">
                <label for="noteImage" class="image-upload-plus">
                    <span class="plus-icon">+</span>
                </label>
            </div>
            <div class="no-image-placeholder" style="display: none;">No Image Selected</div>
        `;
        // 重新绑定文件输入事件
        const newImageInput = document.getElementById('noteImage');
        if (newImageInput && imageUploadContainer) {
            newImageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    imageDeleted = false;
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        // 保存临时图片数据
                        pendingImageData = e.target.result;
                        imagePreview.innerHTML = `
                            <div class="image-preview-wrapper">
                                <img src="${e.target.result}" alt="Preview">
                                <button type="button" class="btn-remove-image" id="removeImageBtn" title="Remove image">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `;
                        const removeImageBtn = document.getElementById('removeImageBtn');
                        if (removeImageBtn) {
                            removeImageBtn.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                removeImage();
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }
    imageDeleted = true; // 标记图片已删除
    pendingImageData = null; // 清除临时图片数据（如果有）
}

// 搜索功能
function initSearch() {
    console.log('🔍 初始化搜索功能...');
    
    const searchInput = document.getElementById('noteSearch');
    const clearBtn = document.getElementById('clearSearch');
    const noteCount = document.getElementById('noteCount');
    const noteCards = document.querySelectorAll('.note-card');
    
    if (!searchInput) {
        console.log('❌ 未找到搜索输入框');
        return;
    }
    
    console.log(`找到 ${noteCards.length} 个笔记卡片`);
    
    // 更新笔记计数
    function updateNoteCount(count) {
        if (noteCount) {
            noteCount.textContent = `${count} ${count === 1 ? 'note' : 'notes'} found`;
        }
    }
    
    // 搜索功能
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log(`搜索: "${searchTerm}"`);
        
        let visibleCount = 0;
        const noResults = document.getElementById('noResults');
        
        noteCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const tags = card.getAttribute('data-tags') || '';
            const title = card.querySelector('h3').textContent.toLowerCase();
            const questionType = card.getAttribute('data-type') || '';
            
            // 检查是否匹配
            const matches = text.includes(searchTerm) || 
                           tags.includes(searchTerm) || 
                           title.includes(searchTerm) ||
                           questionType.includes(searchTerm);
            
            if (searchTerm === '' || matches) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // 显示/隐藏无结果提示
        if (noResults) {
            if (visibleCount === 0 && searchTerm !== '') {
                noResults.style.display = 'block';
            } else {
                noResults.style.display = 'none';
            }
        }
        
        console.log(`显示 ${visibleCount} 个笔记`);
        updateNoteCount(visibleCount);
    }
    
  // 卡片点击显示详情模态框
function initCardToggles() {
    console.log('[CARD] ========== initCardToggles called ==========');
    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const modalClose = document.getElementById('modalClose');
    const editNoteBtn = document.getElementById('editNoteBtn');
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    
    console.log('[CARD] Elements found - modal:', !!modal, 'modalBody:', !!modalBody, 'editNoteBtn:', !!editNoteBtn);
    
    if (!modal || !modalBody) {
        console.log('❌ 未找到模态框元素');
        return;
    }
    
    // 为每个卡片添加点击事件
    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // 如果点击的是删除按钮，不触发卡片点击
            if (e.target.closest('.btn-delete-note')) {
                return;
            }
            
            const details = this.querySelector('.card-details');
            const noteId = this.getAttribute('data-note-id');
            
            if (details) {
                // 获取卡片标题
                const cardTitle = this.querySelector('.card-title h3')?.textContent || 'Note Details';
                
                // 设置模态框标题
                modalTitle.textContent = cardTitle;
                
                // 复制详情内容到模态框
                modalBody.innerHTML = details.querySelector('.details-content').innerHTML;
                
                // 显示编辑和删除按钮，并设置笔记ID
                if (editNoteBtn) {
                    editNoteBtn.style.display = 'inline-flex';
                    editNoteBtn.setAttribute('data-note-id', noteId);
                }
                if (deleteNoteBtn) {
                    deleteNoteBtn.style.display = 'inline-flex';
                    deleteNoteBtn.setAttribute('data-note-id', noteId);
                }
                
                // 显示模态框
                modal.style.display = 'block';
            }
        });
    });
    
    // 编辑按钮事件
    if (editNoteBtn) {
        editNoteBtn.addEventListener('click', function(e) {
            console.log('[EDIT] Edit button clicked');
            e.stopPropagation();
            const noteId = this.getAttribute('data-note-id');
            console.log('[EDIT] Note ID:', noteId);
            if (noteId) {
                console.log('[EDIT] Calling editNote function');
                editNote(noteId);
                // 关闭详情模态框
                modal.style.display = 'none';
            } else {
                console.warn('[EDIT] No note ID found');
            }
        });
    } else {
        console.warn('[EDIT] editNoteBtn not found');
    }
    
    // 删除按钮事件
    if (deleteNoteBtn) {
        deleteNoteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const noteId = this.getAttribute('data-note-id');
            
            if (confirm('Are you sure you want to delete this note?')) {
                deleteNote(noteId);
                modal.style.display = 'none';
            }
        });
    }
    
    // 关闭按钮点击事件
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            modal.style.display = 'none';
            // 隐藏编辑和删除按钮
            if (editNoteBtn) editNoteBtn.style.display = 'none';
            if (deleteNoteBtn) deleteNoteBtn.style.display = 'none';
        });
    }
    
    // 点击模态框背景关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            // 隐藏编辑和删除按钮
            if (editNoteBtn) editNoteBtn.style.display = 'none';
            if (deleteNoteBtn) deleteNoteBtn.style.display = 'none';
        }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            // 隐藏编辑和删除按钮
            if (editNoteBtn) editNoteBtn.style.display = 'none';
            if (deleteNoteBtn) deleteNoteBtn.style.display = 'none';
        }
    });
}
    
    // 事件监听
    searchInput.addEventListener('input', performSearch);
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            performSearch();
            searchInput.focus();
            console.log('🗑️ 搜索已清除');
        });
    }
    
    // 初始计数
    updateNoteCount(noteCards.length);
    initCardToggles();
    console.log('✅ 搜索和卡片功能初始化完成');
}

// 富文本编辑器全局变量（Content 和 Key Points 共用）
let richTextInitialized = false;
let docClickHandlerAdded = false;
let savedSelectionRange = null;
let savedSelectionEditor = null;
let activeEditor = null;
let sharedPaletteCreated = false;
const sharedColorList = ['#000000','#e11d48','#f59e0b','#10b981','#2563eb','#7c3aed'];

// 富文本编辑器初始化函数（全局函数，可在 editNote 中调用）
function initRichTextEditors() {
    console.log('[RTE] ========== initRichTextEditors called ==========');
    
    // 修复：缺少了 contentToolbar 的定义
    const noteContent = document.getElementById('noteContent');
    console.log('[RTE] noteContent element found:', !!noteContent);
    if (!noteContent) {
        console.warn('[RTE] #noteContent not found, skipping init');
        return;
    }
    
    // 注意：不在这里返回，因为每次打开模态框都需要重新绑定事件（特别是动态添加的关键点）

    // Content 编辑器工具栏
    const contentToolbar = noteContent.closest('.form-group')?.querySelector('.editor-toolbar');
    if (contentToolbar && !contentToolbar._richBound) {
        contentToolbar.addEventListener('click', function (e) {
            // 排除颜色按钮，让它单独处理
            if (e.target.closest('.color-toggle')) {
                return; // 让颜色按钮的事件处理
            }
            if (e.target.closest('.editor-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.editor-btn');
                const command = btn.getAttribute('data-command');
                const editor = document.getElementById('noteContent');
                console.debug('[RTE] content toolbar click, command=', command, 'editor=', !!editor);
                if (editor) {
                    editor.focus();
                    document.execCommand(command, false, null);
                }
            }
        });
        contentToolbar._richBound = true;
        console.debug('[RTE] content toolbar bound');
    } else if (!contentToolbar) {
        console.warn('[RTE] content toolbar not found for #noteContent');
    }

    // 修复：缺少关键点编辑器的处理
    if (!docClickHandlerAdded) {
        document.addEventListener('click', function(e) {
            if (e.target.closest('.key-point-toolbar .editor-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.editor-btn');
                const command = btn.getAttribute('data-command');
                const editor = btn.closest('.key-point-item').querySelector('.key-point-editor');
                console.debug('[RTE] key point toolbar click, command=', command, 'editor=', !!editor);

                if (editor) {
                    editor.focus();
                    document.execCommand(command, false, null);
                }
            }
        });
        docClickHandlerAdded = true;
        console.debug('[RTE] keyPointsDocClickHandler bound');
    }

    // 1. 为 content 编辑器的颜色按钮添加事件
    const contentColorToggle = contentToolbar?.querySelector('.color-toggle');
    if (contentColorToggle) {
        // 移除旧的事件监听器（如果存在）
        if (contentColorToggle._bound && contentColorToggle._clickHandler) {
            contentColorToggle.removeEventListener('click', contentColorToggle._clickHandler);
        }
        
        // 创建新的事件处理函数
        const clickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.debug('[RTE] content color toggle clicked');
            
            const editor = document.getElementById('noteContent');
            if (editor) {
                // 保存当前选择
                if (window.getSelection && window.getSelection().rangeCount > 0) {
                    savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
                    savedSelectionEditor = editor;
                    console.debug('[RTE] saved selection for content editor');
                }
                activeEditor = editor;
                editor.focus();
                showSharedPalette(this); // 传递按钮本身
            } else {
                console.error('[RTE] noteContent editor not found!');
            }
        };
        
        contentColorToggle.addEventListener('click', clickHandler);
        contentColorToggle._clickHandler = clickHandler; // 保存引用以便后续移除
        contentColorToggle._bound = true;
        console.debug('[RTE] content color toggle bound');
    }

    // 2. 为 key-points 编辑器的颜色按钮添加事件（事件委托）
    if (!document._keyPointColorToggleBound) {
        document.addEventListener('click', function(e) {
            // 查找关键点工具栏中的 .color-toggle 按钮
            const colorToggle = e.target.closest('.key-point-toolbar .color-toggle');
            if (!colorToggle) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            console.debug('[RTE] key point color toggle clicked');
            
            const editor = colorToggle.closest('.key-point-item')?.querySelector('.key-point-editor');
            if (editor) {
                // 保存当前选择
                if (window.getSelection && window.getSelection().rangeCount > 0) {
                    savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
                    savedSelectionEditor = editor;
                    console.debug('[RTE] saved selection for key point editor');
                }
                activeEditor = editor;
                editor.focus();
                showSharedPalette(colorToggle);
            }
        });
        document._keyPointColorToggleBound = true;
        console.debug('[RTE] key point color toggles bound');
    }

    // 3. 创建共享颜色调色板（如果不存在）
    function createSharedPaletteIfNeeded() {
        if (sharedPaletteCreated) return;
        console.debug('[RTE] creating shared palette');
        
        const palette = document.createElement('div');
        palette.className = 'shared-color-palette';
        palette.setAttribute('aria-hidden', 'true');
        // 使用内联样式确保优先级，使用 !important 覆盖CSS
        palette.style.cssText = `
            display: none !important;
            position: fixed !important;
            z-index: 10000 !important;
            background: white !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
            padding: 8px !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
            flex-wrap: wrap !important;
            gap: 4px !important;
            width: 200px !important;
        `;
        
        palette.innerHTML = sharedColorList.map(c => 
            `<button type="button" class="color-swatch" data-color="${c}" 
                    style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid #fff; 
                           box-shadow: 0 0 0 1px #ddd; cursor: pointer; background:${c}" 
                    title="${c}"></button>`
        ).join('');
        
        document.body.appendChild(palette);

        // 颜色样本点击事件
        palette.addEventListener('click', function (e) {
            const swatch = e.target.closest('.color-swatch');
            if (!swatch) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const color = swatch.getAttribute('data-color');
            console.debug('[RTE] Selected color:', color);
            
            // 恢复选择并应用颜色
            if (activeEditor) {
                try {
                    activeEditor.focus();
                    
                    // 恢复之前保存的选择
                    if (savedSelectionRange && savedSelectionEditor === activeEditor) {
                        try {
                            const sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(savedSelectionRange);
                            console.debug('[RTE] restored saved selection');
                        } catch (rangeErr) {
                            console.warn('[RTE] Could not restore selection, will apply to next typed text:', rangeErr);
                            // 如果恢复失败，execCommand 会应用到之后输入的文字
                        }
                    } else {
                        // 没有保存的选择，检查当前是否有选择
                        const sel = window.getSelection();
                        if (sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) {
                            console.debug('[RTE] No selection, color will apply to next typed text');
                            // execCommand 在没有选择时会应用到之后输入的文字
                        }
                    }
                    
                    document.execCommand('foreColor', false, color);
                    console.debug('[RTE] applied color:', color);
                } catch (err) {
                    console.error('[RTE] Error applying color:', err);
                }
            }
            
            hideSharedPalette();
        });

        sharedPaletteCreated = true;
        console.debug('[RTE] shared palette created');
    }

    function showSharedPalette(buttonElement) {
        createSharedPaletteIfNeeded();
        const palette = document.querySelector('.shared-color-palette');
        if (!palette) {
            console.error('[RTE] Palette not found after creation!');
            return;
        }
        
        // 先显示调色板以计算尺寸（使用 !important 确保显示）
        palette.style.setProperty('display', 'flex', 'important');
        const rect = buttonElement.getBoundingClientRect();
        
        // 使用 fixed 定位，相对于视口
        let top = rect.bottom + 5;
        let left = rect.left;
        
        // 防止超出屏幕右边界
        const paletteWidth = palette.offsetWidth || 200;
        if (left + paletteWidth > window.innerWidth) {
            left = window.innerWidth - paletteWidth - 5;
        }
        
        // 防止超出屏幕下边界
        const paletteHeight = palette.offsetHeight || 50;
        if (top + paletteHeight > window.innerHeight) {
            top = rect.top - paletteHeight - 5;
        }
        
        // 防止超出屏幕左边界
        if (left < 5) {
            left = 5;
        }
        
        // 防止超出屏幕上边界
        if (top < 5) {
            top = 5;
        }
        
        palette.style.top = `${top}px`;
        palette.style.left = `${left}px`;
        palette.setAttribute('aria-hidden', 'false');
        
        console.debug('[RTE] palette shown at', top, left);
    }

    function hideSharedPalette() {
        const palette = document.querySelector('.shared-color-palette');
        if (palette) {
            palette.setAttribute('aria-hidden', 'true');
            palette.style.setProperty('display', 'none', 'important');
            console.debug('[RTE] palette hidden');
        }
    }

    // 4. 点击其他地方关闭调色板
    if (!document._paletteCloseBound) {
        document.addEventListener('click', function(e) {
            // 使用 setTimeout 确保按钮的点击事件先执行
            setTimeout(function() {
                const palette = document.querySelector('.shared-color-palette');
                if (!palette || palette.style.display === 'none') return;
                
                // 如果点击的不是调色板内部，也不是颜色按钮，则关闭
                if (!e.target.closest('.shared-color-palette') && !e.target.closest('.color-toggle')) {
                    hideSharedPalette();
                }
            }, 0);
        });
        document._paletteCloseBound = true;
        console.debug('[RTE] palette close handler bound');
    }

    // 5. ESC键关闭调色板
    if (!document._paletteEscBound) {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideSharedPalette();
            }
        });
        document._paletteEscBound = true;
    }

    // 修复：添加选择保存功能
    console.log('[RTE] Setting up paste handler for noteContent, _selectionBound:', noteContent?._selectionBound);
    
    // 如果已经绑定过，先移除旧的事件监听器
    if (noteContent && noteContent._pasteHandler) {
        console.log('[RTE] Removing old paste handler');
        noteContent.removeEventListener('paste', noteContent._pasteHandler);
        noteContent._pasteHandler = null;
    }
    
    if (noteContent && !noteContent._selectionBound) {
        console.log('[RTE] Binding paste event to noteContent');
        noteContent.addEventListener('mouseup', function() {
            if (window.getSelection && window.getSelection().rangeCount > 0) {
                savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
                savedSelectionEditor = noteContent;
                console.debug('[RTE] saved selection for content editor');
            }
        });
        
        noteContent.addEventListener('keyup', function() {
            if (window.getSelection && window.getSelection().rangeCount > 0) {
                savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
                savedSelectionEditor = noteContent;
            }
        });
        
        // 粘贴时去除格式，只保留纯文本
        const pasteHandler = function(e) {
            console.log('[PASTE] ========== Content editor paste event triggered ==========');
            e.preventDefault();
            e.stopPropagation();
            
            // 获取剪贴板中的纯文本
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            console.log('[PASTE] Clipboard text:', text);
            
            if (!text) {
                console.warn('[PASTE] No text in clipboard');
                return;
            }
            
            // 获取当前选择
            const selection = window.getSelection();
            console.log('[PASTE] Selection rangeCount:', selection.rangeCount);
            
            if (!selection.rangeCount) {
                // 如果没有选择，创建范围到编辑器末尾
                const range = document.createRange();
                range.selectNodeContents(noteContent);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                console.log('[PASTE] Created range at end of editor');
            }
            
            const range = selection.getRangeAt(0);
            console.log('[PASTE] Range start:', range.startContainer, 'offset:', range.startOffset);
            console.log('[PASTE] Range end:', range.endContainer, 'offset:', range.endOffset);
            
            // 删除选择的内容
            const deletedContent = range.cloneContents();
            console.log('[PASTE] Deleted content:', deletedContent.textContent);
            range.deleteContents();
            
            // 先清除当前格式
            document.execCommand('removeFormat', false, null);
            console.log('[PASTE] Removed format');
            
            // 使用 insertText 命令插入纯文本（会自动去除格式）
            // 如果浏览器不支持，则手动插入文本节点
            if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
                console.log('[PASTE] Using insertText command');
                // 先设置光标位置
                selection.removeAllRanges();
                selection.addRange(range);
                // 使用 insertText 命令插入纯文本
                const success = document.execCommand('insertText', false, text);
                console.log('[PASTE] insertText command result:', success);
            } else {
                console.log('[PASTE] Using fallback: manual text node insertion');
                // 降级方案：手动插入文本节点
                const textNode = document.createTextNode(text);
                range.insertNode(textNode);
                console.log('[PASTE] Inserted text node:', textNode.textContent);
                
                // 移动光标到插入文本的末尾
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // 检查插入后的内容
            console.log('[PASTE] Editor HTML after insert:', noteContent.innerHTML);
            console.log('[PASTE] Editor textContent:', noteContent.textContent);
            
            // 再次确保清除格式
            setTimeout(function() {
                console.log('[PASTE] Checking for format elements...');
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    // 如果插入的文本被包装在格式化元素中，提取纯文本
                    let container = range.commonAncestorContainer;
                    console.log('[PASTE] Common ancestor container:', container, 'nodeType:', container.nodeType);
                    
                    if (container.nodeType === Node.TEXT_NODE) {
                        container = container.parentNode;
                        console.log('[PASTE] Parent container:', container, 'tagName:', container.tagName);
                    }
                    
                    // 如果容器是格式化元素（如 strong, em, span 等），提取文本
                    if (container && container !== noteContent && 
                        (container.tagName === 'STRONG' || container.tagName === 'EM' || 
                         container.tagName === 'U' || container.tagName === 'SPAN' ||
                         container.tagName === 'B' || container.tagName === 'I')) {
                        console.log('[PASTE] Found format element:', container.tagName, 'extracting text');
                        const textContent = container.textContent;
                        const textNode = document.createTextNode(textContent);
                        container.parentNode.replaceChild(textNode, container);
                        // 恢复光标位置
                        range.setStart(textNode, textNode.textContent.length);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        console.log('[PASTE] Replaced format element with text node');
                    }
                }
                
                // 最终检查：清理所有格式化元素
                const formatElements = noteContent.querySelectorAll('strong, em, u, span, b, i, font');
                console.log('[PASTE] Found format elements:', formatElements.length);
                if (formatElements.length > 0) {
                    formatElements.forEach(function(el) {
                        console.log('[PASTE] Replacing format element:', el.tagName, 'with text:', el.textContent);
                        const textNode = document.createTextNode(el.textContent);
                        el.parentNode.replaceChild(textNode, el);
                    });
                    console.log('[PASTE] Final HTML after cleanup:', noteContent.innerHTML);
                }
            }, 10);
        };
        
        noteContent.addEventListener('paste', pasteHandler);
        console.log('[RTE] Paste event listener added to noteContent');
        noteContent._pasteHandler = pasteHandler; // 保存引用以便调试
        
        noteContent._selectionBound = true;
        console.log('[RTE] noteContent event binding complete');
    } else {
        if (!noteContent) {
            console.warn('[RTE] noteContent not found, cannot bind paste event');
        } else {
            console.warn('[RTE] noteContent already bound, skipping paste event binding');
        }
    }
    
    // 关键点编辑器的选择保存和粘贴处理
    console.log('[RTE] Setting up paste handler for key point editors, _keypointSelectionBound:', document._keypointSelectionBound);
    if (!document._keypointSelectionBound) {
        document.addEventListener('mouseup', function (e) {
            const editor = e.target.closest('.key-point-editor');
            if (editor && window.getSelection && window.getSelection().rangeCount > 0) {
                savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
                savedSelectionEditor = editor;
                console.debug('[RTE] saved selection for key point editor');
            }
        });
        
        // 关键点编辑器的粘贴处理（事件委托）
        const keyPointPasteHandler = function (e) {
            const editor = e.target.closest('.key-point-editor');
            if (!editor) return;
            
            console.log('[PASTE] ========== Key point editor paste event triggered ==========');
            e.preventDefault();
            e.stopPropagation();
            
            // 获取剪贴板中的纯文本
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            console.log('[PASTE] Key point clipboard text:', text);
            
            if (!text) {
                console.warn('[PASTE] Key point: No text in clipboard');
                return;
            }
            
            // 获取当前选择
            const selection = window.getSelection();
            console.log('[PASTE] Key point selection rangeCount:', selection.rangeCount);
            
            if (!selection.rangeCount) {
                // 如果没有选择，创建范围到编辑器末尾
                const range = document.createRange();
                range.selectNodeContents(editor);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                console.log('[PASTE] Key point: Created range at end of editor');
            }
            
            const range = selection.getRangeAt(0);
            console.log('[PASTE] Key point range start:', range.startContainer, 'offset:', range.startOffset);
            
            // 删除选择的内容
            range.deleteContents();
            console.log('[PASTE] Key point: Deleted selected content');
            
            // 先清除当前格式
            document.execCommand('removeFormat', false, null);
            console.log('[PASTE] Key point: Removed format');
            
            // 使用 insertText 命令插入纯文本（会自动去除格式）
            // 如果浏览器不支持，则手动插入文本节点
            if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
                console.log('[PASTE] Key point: Using insertText command');
                // 先设置光标位置
                selection.removeAllRanges();
                selection.addRange(range);
                // 使用 insertText 命令插入纯文本
                const success = document.execCommand('insertText', false, text);
                console.log('[PASTE] Key point: insertText command result:', success);
            } else {
                console.log('[PASTE] Key point: Using fallback: manual text node insertion');
                // 降级方案：手动插入文本节点
                const textNode = document.createTextNode(text);
                range.insertNode(textNode);
                console.log('[PASTE] Key point: Inserted text node:', textNode.textContent);
                
                // 移动光标到插入文本的末尾
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // 检查插入后的内容
            console.log('[PASTE] Key point editor HTML after insert:', editor.innerHTML);
            console.log('[PASTE] Key point editor textContent:', editor.textContent);
            
            // 再次确保清除格式
            setTimeout(function() {
                console.log('[PASTE] Key point: Checking for format elements...');
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    // 如果插入的文本被包装在格式化元素中，提取纯文本
                    let container = range.commonAncestorContainer;
                    console.log('[PASTE] Key point: Common ancestor container:', container, 'nodeType:', container.nodeType);
                    
                    if (container.nodeType === Node.TEXT_NODE) {
                        container = container.parentNode;
                        console.log('[PASTE] Key point: Parent container:', container, 'tagName:', container.tagName);
                    }
                    
                    // 如果容器是格式化元素（如 strong, em, span 等），提取文本
                    if (container && container !== editor && 
                        (container.tagName === 'STRONG' || container.tagName === 'EM' || 
                         container.tagName === 'U' || container.tagName === 'SPAN' ||
                         container.tagName === 'B' || container.tagName === 'I')) {
                        console.log('[PASTE] Key point: Found format element:', container.tagName, 'extracting text');
                        const textContent = container.textContent;
                        const textNode = document.createTextNode(textContent);
                        container.parentNode.replaceChild(textNode, container);
                        // 恢复光标位置
                        range.setStart(textNode, textNode.textContent.length);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        console.log('[PASTE] Key point: Replaced format element with text node');
                    }
                }
                
                // 最终检查：清理所有格式化元素
                const formatElements = editor.querySelectorAll('strong, em, u, span, b, i, font');
                console.log('[PASTE] Key point: Found format elements:', formatElements.length);
                if (formatElements.length > 0) {
                    formatElements.forEach(function(el) {
                        console.log('[PASTE] Key point: Replacing format element:', el.tagName, 'with text:', el.textContent);
                        const textNode = document.createTextNode(el.textContent);
                        el.parentNode.replaceChild(textNode, el);
                    });
                    console.log('[PASTE] Key point: Final HTML after cleanup:', editor.innerHTML);
                }
            }, 10);
        };
        
        document.addEventListener('paste', keyPointPasteHandler, true); // 使用捕获阶段确保事件被处理
        document._keyPointPasteHandler = keyPointPasteHandler; // 保存引用以便调试
        console.log('[RTE] Key point paste event listener added to document');
        
        document._keypointSelectionBound = true;
        console.log('[RTE] Key point event binding complete');
    } else {
        console.warn('[RTE] Key point events already bound, skipping');
    }

    richTextInitialized = true;
    console.debug('[RTE] richTextInitialized set to true');
}

function initAddNote() {
    const addNoteBtn = document.getElementById('addNoteBtn');
    const addNoteModal = document.getElementById('addNoteModal');
    const addNoteModalClose = document.getElementById('addNoteModalClose');
    const cancelBtn = document.getElementById('cancelAddNote');
    const addNoteForm = document.getElementById('addNoteForm');
    const addKeyPointBtn = document.getElementById('addKeyPointBtn');
    const keyPointsContainer = document.getElementById('keyPointsContainer');
    const questionTypeSelect = document.getElementById('noteQuestionType');
    const imageUploadContainer = document.getElementById('imageUploadContainer');
    const imagePreview = document.getElementById('imagePreview');

    if (!addNoteBtn || !addNoteModal) {
        console.log('❌ 未找到添加笔记相关元素');
        return;
    }

    // Debug probe: capture clicks in add-note area to see if clicks are reaching the document
    (function probeAddNoteClicks() {
        let handled = false;
        function probeHandler(e) {
            const target = e.target;
            console.debug('[RTE] probe click target:', target, 'closest btn?', !!target.closest('#addNoteBtn, .btn-add-note'));
            if (target.closest('#addNoteBtn') || target.closest('.btn-add-note') || target.closest('.add-note-section')) {
                console.debug('[RTE] probe detected click inside add-note area:', target);
                handled = true;
                document.removeEventListener('click', probeHandler, true);
            }
        }
        document.addEventListener('click', probeHandler, true); // capture phase
        // remove after timeout to avoid noise
        setTimeout(function() {
            if (!handled) {
                document.removeEventListener('click', probeHandler, true);
                console.debug('[RTE] probe timeout, removed');
            }
        }, 10000);
    })();

    // Document-level click handler for key points toolbar (bound once)
    function keyPointsDocClickHandler(e) {
        if (e.target.closest('.key-point-toolbar .editor-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.editor-btn');
            const command = btn.getAttribute('data-command');
            const editor = btn.closest('.key-point-item').querySelector('.key-point-editor');
            console.debug('[RTE] key point toolbar click, command=', command, 'editor=', !!editor);

            if (editor) {
                editor.focus();
                document.execCommand(command, false, null);
            }
        }

        // Key Points 颜色选择器
        if (e.target.closest('.key-point-toolbar .color-picker')) {
            const colorPicker = e.target.closest('.color-picker');
            const editor = colorPicker.closest('.key-point-item').querySelector('.key-point-editor');
            console.debug('[RTE] key point color change, value=', colorPicker.value, 'editor=', !!editor);
            if (editor) {
                editor.focus();
                document.execCommand('foreColor', false, colorPicker.value);
            }
        }
    }

    // 2. 图片上传预览
    if (imageUploadContainer && imagePreview) {
        const imageInput = document.getElementById('noteImage');
        if (imageInput) {
            imageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    imageDeleted = false; // 重置删除标记
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        // 保存临时图片数据，避免预览替换掉文件输入导致后续无法读取
                        pendingImageData = e.target.result;
                        imagePreview.innerHTML = `
                            <div class="image-preview-wrapper">
                                <img src="${e.target.result}" alt="Preview">
                                <button type="button" class="btn-remove-image" id="removeImageBtn" title="Remove image">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `;
                        // 添加删除按钮事件
                        const removeImageBtn = document.getElementById('removeImageBtn');
                        if (removeImageBtn) {
                            removeImageBtn.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                removeImage();
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    // 如果没有选择图片或不是图片文件，保持按钮在中间
                    imageDeleted = false;
                }
            });
        }
    }
   
    // 音频文件选择和显示
const audioInput = document.getElementById('noteAudio');
const audioFileInfo = document.getElementById('audioFileInfo');
const audioFileName = document.getElementById('audioFileName');
const audioFileSize = document.getElementById('audioFileSize');
const removeAudioBtn = document.getElementById('removeAudioBtn');

if (audioInput && audioFileInfo) {
    const audioFilePlaceholder = document.getElementById('audioFilePlaceholder');
    
    // 当选择音频文件时
    audioInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            // 显示文件信息
            audioFileName.textContent = file.name;
            
            // 格式化文件大小
            const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            audioFileSize.textContent = `${fileSizeInMB} MB`;
            
            // 显示文件信息，隐藏占位符
            audioFileInfo.style.display = 'flex';
            if (audioFilePlaceholder) {
                audioFilePlaceholder.style.display = 'none';
            }
        } else {
            // 如果不是音频文件
            alert('Please select a valid audio file (MP3, WAV, OGG, etc.)');
            audioInput.value = '';
            // 隐藏文件信息，显示占位符
            audioFileInfo.style.display = 'none';
            if (audioFilePlaceholder) {
                audioFilePlaceholder.style.display = 'block';
            }
        }
    });

    // 删除音频文件按钮
    if (removeAudioBtn) {
        removeAudioBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 清空文件输入
            audioInput.value = '';
            
            // 隐藏文件信息，显示占位符
            audioFileInfo.style.display = 'none';
            if (audioFilePlaceholder) {
                audioFilePlaceholder.style.display = 'block';
            }
        });
    }
}

    // 3. 根据问题类型显示/隐藏图片上传
    if (questionTypeSelect) {
        questionTypeSelect.addEventListener('change', function() {
            const isMapQuestion = this.value === 'map';
            imageUploadContainer.style.display = isMapQuestion ? 'block' : 'none';
            
            // 如果是地图题，设置为必需
            const imageInput = document.getElementById('noteImage');
            if (imageInput) {
                if (isMapQuestion) {
                    imageInput.required = true;
                } else {
                    imageInput.required = false;
                    imageInput.value = ''; // 清空选择
                    // 显示占位符而不是清空
                    if (imagePreview) {
                        imagePreview.innerHTML = `
                            <div class="custom-file-upload">
                                <input type="file" id="noteImage" name="image" class="file-input-hidden" accept="image/*">
                                <label for="noteImage" class="image-upload-plus">
                                    <span class="plus-icon">+</span>
                                </label>
                            </div>
                            <div class="no-image-placeholder" style="display: none;">No Image Selected</div>
                        `;
                        // 重新绑定文件输入事件
                        const newImageInput = document.getElementById('noteImage');
                        if (newImageInput && imageUploadContainer) {
                            newImageInput.addEventListener('change', function(e) {
                                const file = e.target.files[0];
                                if (file && file.type.startsWith('image/')) {
                                    imageDeleted = false;
                                    const reader = new FileReader();
                                    reader.onload = function(e) {
                                        // 保存临时图片数据
                                        pendingImageData = e.target.result;
                                        imagePreview.innerHTML = `
                                            <div class="image-preview-wrapper">
                                                <img src="${e.target.result}" alt="Preview">
                                                <button type="button" class="btn-remove-image" id="removeImageBtn" title="Remove image">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        `;
                                        const removeImageBtn = document.getElementById('removeImageBtn');
                                        if (removeImageBtn) {
                                            removeImageBtn.addEventListener('click', function(e) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                removeImage();
                                            });
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                }
                            });
                        }
                    }
                }
            }
        });
    }

    // 4. 打开添加笔记模态框
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', function() {
            editingNoteId = null; // 重置编辑模式
            imageDeleted = false; // 重置图片删除标记
            openAddNoteModal();
        });
    } else {
        console.error('❌ addNoteBtn not found!');
    }
    
    // 打开添加/编辑笔记模态框的通用函数
    function openAddNoteModal(noteData = null) {
        console.debug('[RTE] openAddNoteModal called, noteData:', !!noteData);
        if (!addNoteModal) {
            console.error('[RTE] addNoteModal not found!');
            return;
        }
        addNoteModal.style.display = 'block';
        
        // Wait a tick to ensure content is rendered before initializing RTE
        setTimeout(function() {
            try {
                initRichTextEditors(); // 初始化编辑器
            } catch (error) {
                console.error('[RTE] Error in initRichTextEditors:', error);
            }
        }, 100); // 延迟确保DOM完全渲染
        
        const modalTitle = addNoteModal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = noteData ? 'Edit Note' : 'Add New Note';
        }
        
        if (noteData) {
            // 编辑模式：填充数据
            editingNoteId = noteData.id;
            fillFormWithNoteData(noteData);
        } else {
            // 添加模式：重置表单
            addNoteForm.reset();
            resetFormToDefault();
        }
    }
    
    // 重置表单到默认状态
    function resetFormToDefault() {
        // 重置精听复选框
        const enableIntensiveListeningCheckbox = document.getElementById('enableIntensiveListening');
        if (enableIntensiveListeningCheckbox) {
            enableIntensiveListeningCheckbox.checked = false;
        }
        // 重置关键点
        keyPointsContainer.innerHTML = `
    <div class="key-point-item">
        <div class="key-point-wrapper">
            <div class="key-point-toolbar editor-toolbar">
                <button type="button" class="editor-btn" data-command="bold" title="Bold">
                    <i class="fas fa-bold"></i>
                </button>
                <button type="button" class="editor-btn" data-command="italic" title="Italic">
                    <i class="fas fa-italic"></i>
                </button>
                <button type="button" class="editor-btn" data-command="underline" title="Underline">
                    <i class="fas fa-underline"></i>
                </button>
                <button type="button" class="color-toggle" title="Text Color" aria-haspopup="true" aria-expanded="false">A</button>
                <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Bullet List">
                    <i class="fas fa-list-ul"></i>
                </button>
                <button type="button" class="editor-btn" data-command="insertOrderedList" title="Numbered List">
                    <i class="fas fa-list-ol"></i>
                </button>
                <button type="button" class="btn-action btn-remove remove-point-btn" style="display: none;" title="Delete key point">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="key-point-editor" contenteditable="true" 
                 placeholder="Enter key point 1..."></div>
        </div>
    </div>
`;
        
        // 重置图片预览（恢复按钮在中间）
        if (imagePreview) {
            imagePreview.innerHTML = `
                <div class="custom-file-upload">
                    <input type="file" id="noteImage" name="image" class="file-input-hidden" accept="image/*">
                    <label for="noteImage" class="image-upload-plus">
                        <span class="plus-icon">+</span>
                    </label>
                </div>
                <div class="no-image-placeholder" style="display: none;">No Image Selected</div>
            `;
        }
        
        // 重置文件输入
        const imageInput = document.getElementById('noteImage');
        const audioInput = document.getElementById('noteAudio');
        if (imageInput) imageInput.value = '';
        if (audioInput) audioInput.value = '';
        
        // 重置音频文件显示
        const audioFileInfo = document.getElementById('audioFileInfo');
        const audioFilePlaceholder = document.getElementById('audioFilePlaceholder');
        if (audioFileInfo) {
            audioFileInfo.style.display = 'none';
        }
        if (audioFilePlaceholder) {
            audioFilePlaceholder.style.display = 'block';
        }

        // 隐藏图片上传容器（除非选择地图题）
        imageUploadContainer.style.display = 'none';
        
        // 重置问题类型选择
        if (questionTypeSelect) {
            questionTypeSelect.value = '';
        }
        
        // 重置内容编辑器
        const contentEditor = document.getElementById('noteContent');
        if (contentEditor) {
            contentEditor.innerHTML = '';
        }
    }
    
    // 用笔记数据填充表单
    function fillFormWithNoteData(note) {
        // 填充基本字段
        document.getElementById('noteChapter').value = note.chapter || '';
        document.getElementById('noteTest').value = note.test || '';
        document.getElementById('notePart').value = note.part || '';
        document.getElementById('noteQuestionType').value = note.questionType || '';
        document.getElementById('noteQuestion').value = note.question || '';
        document.getElementById('noteErrorReason').value = note.errorReason || '';
        document.getElementById('noteTags').value = note.tags || '';
        
        // 填充精听复选框
        const enableIntensiveListeningCheckbox = document.getElementById('enableIntensiveListening');
        if (enableIntensiveListeningCheckbox) {
            enableIntensiveListeningCheckbox.checked = note.enableIntensiveListening === true;
        }
        
        // 填充内容编辑器
        const contentEditor = document.getElementById('noteContent');
        if (contentEditor && note.content) {
            contentEditor.innerHTML = note.content;
        }
        
        // 填充关键点
        if (note.keyPoints && note.keyPoints.length > 0) {
            keyPointsContainer.innerHTML = '';
            note.keyPoints.forEach((point, index) => {
                const keyPointHTML = `
    <div class="key-point-item">
        <div class="key-point-wrapper">
            <div class="key-point-toolbar editor-toolbar">
                <button type="button" class="editor-btn" data-command="bold" title="Bold">
                    <i class="fas fa-bold"></i>
                </button>
                <button type="button" class="editor-btn" data-command="italic" title="Italic">
                    <i class="fas fa-italic"></i>
                </button>
                <button type="button" class="editor-btn" data-command="underline" title="Underline">
                    <i class="fas fa-underline"></i>
                </button>
                <button type="button" class="color-toggle" title="Text Color" aria-haspopup="true" aria-expanded="false">A</button>
                <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Bullet List">
                    <i class="fas fa-list-ul"></i>
                </button>
                <button type="button" class="editor-btn" data-command="insertOrderedList" title="Numbered List">
                    <i class="fas fa-list-ol"></i>
                </button>
                <button type="button" class="btn-action btn-remove remove-point-btn" title="Delete key point">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="key-point-editor" contenteditable="true">${point}</div>
        </div>
    </div>
`;
                keyPointsContainer.insertAdjacentHTML('beforeend', keyPointHTML);
            });
        } else {
            resetFormToDefault();
        }
        
        // 显示图片（如果存在）
        if (note.imageData) {
            if (imagePreview) {
                // 将已存在的图片放到临时缓存，以便保存时继续使用
                pendingImageData = note.imageData;
                imagePreview.innerHTML = `
                    <div class="image-preview-wrapper">
                        <img src="${note.imageData}" alt="Note Image" style="max-width: 100%; border-radius: 8px;">
                        <button type="button" class="btn-remove-image" id="removeImageBtn" title="Remove image">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                // 添加删除按钮事件
                const removeImageBtn = document.getElementById('removeImageBtn');
                if (removeImageBtn) {
                    removeImageBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        removeImage();
                    });
                }
            }
            imageUploadContainer.style.display = 'block';
            imageDeleted = false; // 重置删除标记
        }
        
        // 显示音频文件信息（如果存在）
        if (note.audioData && note.audioData !== 'INDEXEDDB') {
            const audioFileInfo = document.getElementById('audioFileInfo');
            const audioFileName = document.getElementById('audioFileName');
            const audioFilePlaceholder = document.getElementById('audioFilePlaceholder');
            if (audioFileInfo && audioFileName) {
                audioFileName.textContent = 'Audio file (existing)';
                audioFileSize.textContent = 'Audio file';
                // 显示文件信息，隐藏占位符
                audioFileInfo.style.display = 'flex';
                if (audioFilePlaceholder) {
                    audioFilePlaceholder.style.display = 'none';
                }
            }
        }
        
        // 根据问题类型显示/隐藏图片上传
        if (questionTypeSelect && note.questionType === 'map') {
            imageUploadContainer.style.display = 'block';
        }
    }

    // 5. 关闭模态框（修复版）
    function closeAddNoteModal() {
        addNoteModal.style.display = 'none';
        editingNoteId = null; // 重置编辑模式
        imageDeleted = false; // 重置图片删除标记
        pendingImageData = null; // 重置临时图片数据
        addNoteForm.reset();
        
        // 重置图片预览（恢复按钮在中间）
        if (imagePreview) {
            imagePreview.innerHTML = `
                <div class="custom-file-upload">
                    <input type="file" id="noteImage" name="image" class="file-input-hidden" accept="image/*">
                    <label for="noteImage" class="image-upload-plus">
                        <span class="plus-icon">+</span>
                    </label>
                </div>
                <div class="no-image-placeholder" style="display: none;">No Image Selected</div>
            `;
        }
        
        // 重置文件输入
        const imageInput = document.getElementById('noteImage');
        const audioInput = document.getElementById('noteAudio');
        if (imageInput) imageInput.value = '';
        if (audioInput) audioInput.value = '';
        
       // 重置音频文件显示
const audioFileInfo = document.getElementById('audioFileInfo');
const audioFilePlaceholder = document.getElementById('audioFilePlaceholder');
if (audioFileInfo) {
    audioFileInfo.style.display = 'none';
}
if (audioFilePlaceholder) {
    audioFilePlaceholder.style.display = 'block';
}

        // 隐藏图片上传容器
        imageUploadContainer.style.display = 'none';
        
        // 重置问题类型选择
        if (questionTypeSelect) {
            questionTypeSelect.value = '';
        }
    }

        // 6. 关闭按钮和取消按钮事件
    if (addNoteModalClose) {
        addNoteModalClose.addEventListener('click', closeAddNoteModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAddNoteModal);
    }

    // 点击模态框背景关闭
    addNoteModal.addEventListener('click', function(e) {
        if (e.target === addNoteModal) {
            closeAddNoteModal();
        }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && addNoteModal.style.display === 'block') {
            closeAddNoteModal();
        }
    });

    // 7. 添加关键点功能
    if (addKeyPointBtn && keyPointsContainer) {
        addKeyPointBtn.addEventListener('click', function() {
            const pointCount = keyPointsContainer.children.length + 1;
            const pointItem = document.createElement('div');
            pointItem.className = 'key-point-item';
                        pointItem.innerHTML = `
                <div class="key-point-wrapper">
                    <div class="key-point-toolbar editor-toolbar">
                        <button type="button" class="editor-btn" data-command="bold" title="Bold">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button type="button" class="editor-btn" data-command="italic" title="Italic">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button type="button" class="editor-btn" data-command="underline" title="Underline">
                            <i class="fas fa-underline"></i>
                        </button>
                        <button type="button" class="color-toggle" title="Text Color" aria-haspopup="true" aria-expanded="false">A</button>
                        <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Bullet List">
                            <i class="fas fa-list-ul"></i>
                        </button>
                        <button type="button" class="editor-btn" data-command="insertOrderedList" title="Numbered List">
                            <i class="fas fa-list-ol"></i>
                        </button>
                        <button type="button" class="btn-action btn-remove remove-point-btn" title="Delete key point">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div class="key-point-editor" contenteditable="true" 
                         placeholder="Enter key point ${pointCount}..."></div>
                </div>
            `;
            keyPointsContainer.appendChild(pointItem);

            // 显示所有删除按钮keyPointsContainer.innerHTML = `
            keyPointsContainer.querySelectorAll('.remove-point-btn').forEach(btn => {
                btn.style.display = 'inline-flex';
            });
        });

        // 删除关键点（事件委托）
        keyPointsContainer.addEventListener('click', function(e) {
            if (e.target.closest('.remove-point-btn')) {
                const pointItem = e.target.closest('.key-point-item');
                if (pointItem && keyPointsContainer.children.length > 1) {
                    pointItem.remove();
                    // 如果只剩一个，隐藏删除按钮
                    if (keyPointsContainer.children.length === 1) {
                        keyPointsContainer.querySelector('.remove-point-btn').style.display = 'none';
                    }
                }
            }
        });
    }

    // 8. 表单提交处理
    if (addNoteForm) {
        addNoteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            try {
                // 获取表单数据
                const formData = new FormData(addNoteForm);
                const chapter = formData.get('chapter')?.trim() || '';
                const test = formData.get('test') || '';
                const part = formData.get('part') || '';
                const questionType = formData.get('questionType') || '';
                const question = formData.get('question')?.trim() || '';
                const errorReason = formData.get('errorReason')?.trim() || '';
                
                // 从 contenteditable div 获取内容（保存HTML格式）
                const contentEditor = document.getElementById('noteContent');
                let content = '';
                if (contentEditor) {
                    // 先获取textContent检查是否有实际内容
                    const textContent = contentEditor.textContent.trim() || contentEditor.innerText.trim();
                    if (textContent) {
                        // 有内容，保存HTML格式
                        content = contentEditor.innerHTML.trim();
                    } else {
                        // 没有内容，设为空字符串
                        content = '';
                    }
                }
                
                const tags = formData.get('tags')?.trim() || '';
                const audioFile = formData.get('audio');
                const enableIntensiveListeningCheckbox = document.getElementById('enableIntensiveListening');
                const enableIntensiveListening = enableIntensiveListeningCheckbox ? enableIntensiveListeningCheckbox.checked : false;

                // 获取关键点（从 contenteditable divs，保存 HTML 内容）
                const keyPoints = [];
                if (keyPointsContainer) {
                    keyPointsContainer.querySelectorAll('.key-point-editor').forEach(editor => {
                        const pointText = editor.textContent.trim() || editor.innerText.trim();
                        if (pointText) {
                            // 保存 HTML 内容以保留格式
                            const pointHTML = editor.innerHTML.trim();
                            keyPoints.push(pointHTML);
                        }
                    });
                }

                // 验证必填字段（questionType 和 errorReason 不是必填项）
                const missingFields = [];
                if (!chapter) missingFields.push('Chapter');
                if (!test) missingFields.push('Test');
                if (!part) missingFields.push('Part');
                
                // 验证内容：检查是否有实际文本内容（去除HTML标签后）
                const contentText = content.replace(/<[^>]*>/g, '').trim();
                if (!contentText) {
                    missingFields.push('Content');
                }

                if (missingFields.length > 0) {
                    alert('Please fill in all required fields:\n' + missingFields.join(', '));
                    return;
                }

            // 处理图片文件
            const imageInput = document.getElementById('noteImage');
            let imageData = null;
            
            // 处理图片和音频文件的函数
            function processFiles() {
                // 先处理图片
                if (imageDeleted) {
                    // 如果图片被删除，设置为null
                    imageData = null;
                    processAudio();
                } else if (imageInput && imageInput.files && imageInput.files[0]) {
                    // 如果有新上传的图片（文件输入尚在）
                    const imageReader = new FileReader();
                    imageReader.onload = function(e) {
                        imageData = e.target.result;
                        processAudio();
                    };
                    imageReader.onerror = function() {
                        alert('Error reading image file. Please try again.');
                    };
                    imageReader.readAsDataURL(imageInput.files[0]);
                } else if (pendingImageData) {
                    // 如果文件输入被替换（预览替换掉输入），使用临时缓存的base64
                    imageData = pendingImageData;
                    processAudio();
                } else {
                    // 没有新图片，也没有删除标记，继续处理音频
                    processAudio();
                }
            }

            function processAudio() {
                // 处理音频文件
                let audioData = null;
                if (audioFile && audioFile.size > 0) {
                    const audioReader = new FileReader();
                    audioReader.onload = function(e) {
                        audioData = e.target.result;
                        saveNoteToStorage(imageData, audioData);
                    };
                    audioReader.onerror = function() {
                        alert('Error reading audio file. Please try again.');
                    };
                    audioReader.readAsDataURL(audioFile);
                } else {
                    saveNoteToStorage(imageData, null);
                }
            }

            async function saveNoteToStorage(imageData, audioData) {
                try {
                    // 从localStorage获取现有笔记
                    let notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
                    
                    let noteId = editingNoteId;
                    let noteToSave = null;
                    
                    if (editingNoteId) {
                        // 编辑模式：更新现有笔记
                        const noteIndex = notes.findIndex(n => n.id === editingNoteId);
                        if (noteIndex !== -1) {
                            const existingNote = notes[noteIndex];
                            
                            // 处理音频数据：如果有新音频，存储到IndexedDB
                            let finalAudioData = null;
                            if (audioData) {
                                // 新上传的音频，存储到IndexedDB
                                await audioStorage.saveAudio(editingNoteId, audioData);
                                finalAudioData = 'INDEXEDDB'; // 标记为存储在IndexedDB
                            } else if (existingNote.audioData && existingNote.audioData !== 'INDEXEDDB') {
                                // 保留原有音频（如果还在localStorage中），迁移到IndexedDB
                                await audioStorage.saveAudio(editingNoteId, existingNote.audioData);
                                finalAudioData = 'INDEXEDDB';
                            } else {
                                // 已经在IndexedDB中或没有音频
                                finalAudioData = existingNote.audioData || null;
                            }
                            
                            notes[noteIndex] = {
                                id: editingNoteId,
                                chapter: chapter,
                                test: test,
                                part: part,
                                questionType: questionType,
                                question: question,
                                errorReason: errorReason,
                                content: content,
                                keyPoints: keyPoints,
                                tags: tags,
                                audioData: finalAudioData,
                                imageData: imageDeleted ? null : (imageData || existingNote.imageData),
                                enableIntensiveListening: enableIntensiveListening,
                                date: existingNote.date
                            };
                            noteToSave = notes[noteIndex];
                        }
                    } else {
                        // 添加模式：创建新笔记
                        noteId = 'note_' + Date.now();
                        
                        // 处理音频数据：存储到IndexedDB
                        let finalAudioData = null;
                        if (audioData) {
                            await audioStorage.saveAudio(noteId, audioData);
                            finalAudioData = 'INDEXEDDB'; // 标记为存储在IndexedDB
                        }
                        
                        const note = {
                            id: noteId,
                            chapter: chapter,
                            test: test,
                            part: part,
                            questionType: questionType,
                            question: question,
                            errorReason: errorReason,
                            content: content,
                            keyPoints: keyPoints,
                            tags: tags,
                            audioData: finalAudioData,
                            imageData: imageData,
                            enableIntensiveListening: enableIntensiveListening,
                            date: new Date().toISOString()
                        };
                        notes.unshift(note);
                        noteToSave = note;
                    }
                    
                    // 保存笔记到localStorage（不包含音频数据，音频在IndexedDB中）
                    try {
                        localStorage.setItem('listeningNotes', JSON.stringify(notes));
                        updateStorageInfo();
                        
                        // 刷新显示（等待完成后再关闭模态框）
                        loadAndDisplayNotes().then(() => {
                            // 重置编辑状态
                            editingNoteId = null;
                            imageDeleted = false;
                            pendingImageData = null;
                            closeAddNoteModal();
                        }).catch(error => {
                            console.error('刷新显示失败:', error);
                            // 即使失败也要重置状态
                            editingNoteId = null;
                            imageDeleted = false;
                            pendingImageData = null;
                            closeAddNoteModal();
                        });
                    } catch (e) {
                        if (e.name === 'QuotaExceededError') {
                            // 如果还是满了，尝试清理一些数据
                            const shouldClean = confirm(
                                '存储空间仍然不足！\n\n' +
                                '系统已自动将音频文件存储到IndexedDB（容量更大）。\n' +
                                '但文本数据仍然需要localStorage空间。\n\n' +
                                '是否清理一些旧笔记的文本数据？'
                            );
                            if (shouldClean) {
                                clearStorageSpace();
                            } else {
                                alert('保存失败：存储空间不足。请先清理一些数据。');
                            }
                        } else {
                            throw e;
                        }
                    }
                } catch (error) {
                    console.error('保存笔记失败:', error);
                    alert('保存失败：' + error.message);
                }
            }

            // 开始处理文件
            processFiles();
            } catch (error) {
                console.error('Error saving note:', error);
                alert('An error occurred while saving the note. Please try again.\nError: ' + error.message);
            }
        });
    } else {
        console.error('addNoteForm not found!');
    }
}

// 编辑笔记函数
function editNote(noteId) {
    console.log('[EDIT] ========== editNote function called ==========');
    console.log('[EDIT] noteId:', noteId);
    
    // 从localStorage获取笔记
    const notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
    console.log('[EDIT] Total notes found:', notes.length);
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
        console.error('[EDIT] Note not found!');
        alert('Note not found!');
        return;
    }
    
    console.log('[EDIT] Note found:', note);
    
    // 打开编辑模态框（需要在 initAddNote 函数外部访问，所以需要确保函数已定义）
    const addNoteModal = document.getElementById('addNoteModal');
    const addNoteForm = document.getElementById('addNoteForm');
    const keyPointsContainer = document.getElementById('keyPointsContainer');
    const questionTypeSelect = document.getElementById('noteQuestionType');
    const imageUploadContainer = document.getElementById('imageUploadContainer');
    const imagePreview = document.getElementById('imagePreview');
    
    if (!addNoteModal || !addNoteForm) {
        alert('Form elements not found!');
        return;
    }
    
    // 设置编辑模式
    editingNoteId = noteId;
    imageDeleted = false; // 重置图片删除标记
    
    // 打开模态框
    console.log('[EDIT] Opening modal');
    addNoteModal.style.display = 'block';
    
    // 更新标题
    const modalTitle = addNoteModal.querySelector('.modal-header h2');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Note';
        console.log('[EDIT] Modal title updated');
    }
    
    // 填充表单数据
    document.getElementById('noteChapter').value = note.chapter || '';
    document.getElementById('noteTest').value = note.test || '';
    document.getElementById('notePart').value = note.part || '';
    document.getElementById('noteQuestionType').value = note.questionType || '';
    document.getElementById('noteQuestion').value = note.question || '';
    document.getElementById('noteErrorReason').value = note.errorReason || '';
    document.getElementById('noteTags').value = note.tags || '';
    
    // 填充精听复选框
    const enableIntensiveListeningCheckbox = document.getElementById('enableIntensiveListening');
    if (enableIntensiveListeningCheckbox) {
        enableIntensiveListeningCheckbox.checked = note.enableIntensiveListening === true;
    }
    
    // 填充内容编辑器
    const contentEditor = document.getElementById('noteContent');
    console.log('[EDIT] contentEditor found:', !!contentEditor);
    if (contentEditor) {
        // 重置绑定标志，确保可以重新绑定事件
        console.log('[EDIT] Resetting _selectionBound flag');
        contentEditor._selectionBound = false;
        if (contentEditor._pasteHandler) {
            console.log('[EDIT] Removing old paste handler');
            contentEditor.removeEventListener('paste', contentEditor._pasteHandler);
            contentEditor._pasteHandler = null;
        }
        contentEditor.innerHTML = note.content || '';
        console.log('[EDIT] Content filled, HTML length:', contentEditor.innerHTML.length);
    }
    
    // 初始化编辑器（在填充内容后）
    // 使用 setTimeout 确保 DOM 更新完成
    setTimeout(function() {
        console.log('[EDIT] Re-initializing rich text editors after filling content');
        if (typeof initRichTextEditors === 'function') {
            initRichTextEditors();
        } else {
            console.error('[EDIT] initRichTextEditors function not found!');
        }
    }, 100);
    
    // 填充关键点
    if (keyPointsContainer) {
        keyPointsContainer.innerHTML = '';
        if (note.keyPoints && note.keyPoints.length > 0) {
            note.keyPoints.forEach((point) => {
                const keyPointHTML = `
    <div class="key-point-item">
        <div class="key-point-wrapper">
            <div class="key-point-toolbar editor-toolbar">
                <button type="button" class="editor-btn" data-command="bold" title="Bold">
                    <i class="fas fa-bold"></i>
                </button>
                <button type="button" class="editor-btn" data-command="italic" title="Italic">
                    <i class="fas fa-italic"></i>
                </button>
                <button type="button" class="editor-btn" data-command="underline" title="Underline">
                    <i class="fas fa-underline"></i>
                </button>
                <button type="button" class="color-toggle" title="Text Color" aria-haspopup="true" aria-expanded="false">A</button>
                <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Bullet List">
                    <i class="fas fa-list-ul"></i>
                </button>
                <button type="button" class="editor-btn" data-command="insertOrderedList" title="Numbered List">
                    <i class="fas fa-list-ol"></i>
                </button>
                <button type="button" class="btn-action btn-remove remove-point-btn" title="Delete key point">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="key-point-editor" contenteditable="true">${point}</div>
        </div>
    </div>
`;
                keyPointsContainer.insertAdjacentHTML('beforeend', keyPointHTML);
            });
        } else {
            // 如果没有关键点，添加一个空的
            keyPointsContainer.innerHTML = `
    <div class="key-point-item">
        <div class="key-point-wrapper">
            <div class="key-point-toolbar editor-toolbar">
                <button type="button" class="editor-btn" data-command="bold" title="Bold">
                    <i class="fas fa-bold"></i>
                </button>
                <button type="button" class="editor-btn" data-command="italic" title="Italic">
                    <i class="fas fa-italic"></i>
                </button>
                <button type="button" class="editor-btn" data-command="underline" title="Underline">
                    <i class="fas fa-underline"></i>
                </button>
                <button type="button" class="color-toggle" title="Text Color" aria-haspopup="true" aria-expanded="false">A</button>
                <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Bullet List">
                    <i class="fas fa-list-ul"></i>
                </button>
                <button type="button" class="editor-btn" data-command="insertOrderedList" title="Numbered List">
                    <i class="fas fa-list-ol"></i>
                </button>
                <button type="button" class="btn-action btn-remove remove-point-btn" style="display: none;" title="Delete key point">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="key-point-editor" contenteditable="true" 
                 placeholder="Enter key point 1..."></div>
        </div>
    </div>
`;
        }
    }
    
    // 显示图片（如果存在）
    if (imagePreview && note.imageData) {
        // 将图像缓存到临时变量，避免在提交时丢失
        pendingImageData = note.imageData;
        imagePreview.innerHTML = `
            <div class="image-preview-wrapper">
                <img src="${note.imageData}" alt="Note Image" style="max-width: 100%; border-radius: 8px;">
                <button type="button" class="btn-remove-image" id="removeImageBtn" title="Remove image">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        // 添加删除按钮事件
        const removeImageBtn = document.getElementById('removeImageBtn');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                removeImage();
            });
        }
        if (imageUploadContainer) {
            imageUploadContainer.style.display = 'block';
        }
        imageDeleted = false; // 重置删除标记
    }
    
    // 显示音频文件信息（如果存在）
    const audioFilePlaceholder = document.getElementById('audioFilePlaceholder');
    if (note.audioData && note.audioData !== 'INDEXEDDB') {
        const audioFileInfo = document.getElementById('audioFileInfo');
        const audioFileName = document.getElementById('audioFileName');
        if (audioFileInfo && audioFileName) {
            audioFileName.textContent = 'Audio file (existing)';
            audioFileInfo.style.display = 'flex';
            if (audioFilePlaceholder) {
                audioFilePlaceholder.style.display = 'none';
            }
        }
    } else if (note.audioData === 'INDEXEDDB') {
        // 从IndexedDB加载音频数据用于显示
        loadAudioFromIndexedDB(note).then(loadedNote => {
            if (loadedNote.audioData) {
                const audioFileInfo = document.getElementById('audioFileInfo');
                const audioFileName = document.getElementById('audioFileName');
                if (audioFileInfo && audioFileName) {
                    audioFileName.textContent = 'Audio file (existing)';
                    audioFileInfo.style.display = 'flex';
                    if (audioFilePlaceholder) {
                        audioFilePlaceholder.style.display = 'none';
                    }
                }
            }
        });
    } else {
        // 没有音频文件，显示占位符
        if (audioFilePlaceholder) {
            audioFilePlaceholder.style.display = 'block';
        }
    }
    
    // 根据问题类型显示/隐藏图片上传
    if (questionTypeSelect && note.questionType === 'map') {
        if (imageUploadContainer) {
            imageUploadContainer.style.display = 'block';
        }
    }
}


// 存储管理功能
function getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }
    return total;
}

function formatStorageSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function updateStorageInfo() {
    const storageInfo = document.getElementById('storageInfo');
    if (storageInfo) {
        try {
            const size = getStorageSize();
            const sizeStr = formatStorageSize(size);
            const maxSize = 5 * 1024 * 1024; // 假设5MB限制
            const percentage = (size / maxSize * 100).toFixed(1);
            
            let color = '#10b981'; // 绿色
            if (percentage > 80) color = '#ef4444'; // 红色
            else if (percentage > 60) color = '#f59e0b'; // 橙色
            
            storageInfo.innerHTML = `<span style="color: ${color};">存储: ${sizeStr} (${percentage}%)</span>`;
        } catch (e) {
            console.error('Error calculating storage:', e);
        }
    }
}

// 导出数据功能
function exportListeningData() {
    try {
        const notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
        const data = {
            notes: notes,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `listening-notes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`成功导出 ${notes.length} 条笔记！\n\n提示：在不同端口打开网页时，可以使用"Import Data"按钮导入此文件。`);
    } catch (e) {
        console.error('Export error:', e);
        alert('导出失败：' + e.message);
    }
}

// 导入数据功能
function importListeningData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            const notes = importedData.notes || importedData;
            
            if (!Array.isArray(notes)) {
                throw new Error('Invalid data format');
            }
            
            if (notes.length === 0) {
                alert('导入的文件中没有数据。');
                return;
            }
            
            const action = confirm(
                `找到 ${notes.length} 条笔记。\n\n` +
                `点击"确定"合并数据（保留现有笔记）\n` +
                `点击"取消"替换所有数据（删除现有笔记）`
            );
            
            const existingNotes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
            
            if (action) {
                // 合并
                const existingIds = new Set(existingNotes.map(n => n.id));
                const newNotes = notes.filter(n => !existingIds.has(n.id));
                const mergedNotes = [...existingNotes, ...newNotes];
                
                try {
                    localStorage.setItem('listeningNotes', JSON.stringify(mergedNotes));
                    alert(`成功合并 ${newNotes.length} 条新笔记！`);
                    loadAndDisplayNotes();
                    updateStorageInfo();
                } catch (e) {
                    if (e.name === 'QuotaExceededError') {
                        alert('存储空间不足！请先清理一些数据或删除旧笔记。');
                    } else {
                        throw e;
                    }
                }
            } else {
                // 替换
                if (confirm('确定要替换所有数据吗？此操作不可撤销！')) {
                    try {
                        try {
        localStorage.setItem('listeningNotes', JSON.stringify(notes));
        updateStorageInfo();
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            const solution = confirm(
                '存储空间超出限制！\n\n' +
                '解决方案：\n' +
                '1. 点击"确定"打开清理工具\n' +
                '2. 点击"取消"导出数据到文件\n\n' +
                '提示：使用"Export Data"导出数据后，可以在任何端口通过"Import Data"导入。'
            );
            if (solution) {
                clearStorageSpace();
            } else {
                exportListeningData();
            }
        } else {
            throw e;
        }
    }
                        alert(`成功导入 ${notes.length} 条笔记！`);
                        loadAndDisplayNotes();
                        updateStorageInfo();
                    } catch (e) {
                        if (e.name === 'QuotaExceededError') {
                            alert('存储空间不足！请先清理一些数据。');
                        } else {
                            throw e;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Import error:', e);
            alert('导入失败：' + e.message);
        }
    };
    reader.readAsText(file);
}

// 清理存储空间
function clearStorageSpace() {
    const notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
    
    if (notes.length === 0) {
        alert('没有笔记可以清理。');
        return;
    }
    
    // 统计音频文件大小
    let totalAudioSize = 0;
    let notesWithAudio = 0;
    notes.forEach(note => {
        if (note.audioData) {
            totalAudioSize += note.audioData.length;
            notesWithAudio++;
        }
    });
    
    const audioSizeStr = formatStorageSize(totalAudioSize);
    
    const action = confirm(
        `存储空间清理工具\n\n` +
        `当前笔记数：${notes.length}\n` +
        `包含音频的笔记：${notesWithAudio}\n` +
        `音频总大小：${audioSizeStr}\n\n` +
        `选项：\n` +
        `1. 删除所有音频（保留笔记文本）\n` +
        `2. 删除旧笔记（保留最近30天的）\n` +
        `3. 取消\n\n` +
        `点击"确定"删除所有音频，点击"取消"查看其他选项。`
    );
    
    if (action) {
        // 删除所有音频
        if (confirm(`确定要删除所有 ${notesWithAudio} 条笔记的音频吗？此操作不可撤销！`)) {
            notes.forEach(note => {
                delete note.audioData;
            });
            try {
                try {
        localStorage.setItem('listeningNotes', JSON.stringify(notes));
        updateStorageInfo();
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            const solution = confirm(
                '存储空间超出限制！\n\n' +
                '解决方案：\n' +
                '1. 点击"确定"打开清理工具\n' +
                '2. 点击"取消"导出数据到文件\n\n' +
                '提示：使用"Export Data"导出数据后，可以在任何端口通过"Import Data"导入。'
            );
            if (solution) {
                clearStorageSpace();
            } else {
                exportListeningData();
            }
        } else {
            throw e;
        }
    }
                alert(`成功删除所有音频！释放了约 ${audioSizeStr} 的存储空间。`);
                loadAndDisplayNotes();
                updateStorageInfo();
            } catch (e) {
                alert('清理失败：' + e.message);
            }
        }
    } else {
        // 删除旧笔记
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const oldNotes = notes.filter(note => {
            const noteDate = new Date(note.createdAt || note.date || 0).getTime();
            return noteDate < thirtyDaysAgo;
        });
        
        if (oldNotes.length === 0) {
            alert('没有超过30天的旧笔记。');
            return;
        }
        
        if (confirm(`找到 ${oldNotes.length} 条超过30天的旧笔记。确定要删除吗？此操作不可撤销！`)) {
            const newNotes = notes.filter(note => {
                const noteDate = new Date(note.createdAt || note.date || 0).getTime();
                return noteDate >= thirtyDaysAgo;
            });
            
            try {
                localStorage.setItem('listeningNotes', JSON.stringify(newNotes));
                alert(`成功删除 ${oldNotes.length} 条旧笔记！`);
                loadAndDisplayNotes();
                updateStorageInfo();
            } catch (e) {
                alert('清理失败：' + e.message);
            }
        }
    }
}

// 页面加载完成后运行
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Listening 页面加载完成');
    
    // 初始化IndexedDB
    try {
        await audioStorage.init();
        console.log('✅ IndexedDB初始化成功');
        
        // 自动迁移现有音频到IndexedDB
        const migratedCount = await migrateAudioToIndexedDB();
        if (migratedCount > 0) {
            console.log(`✅ 自动迁移了 ${migratedCount} 个音频文件到IndexedDB`);
            updateStorageInfo();
        }
    } catch (error) {
        console.error('IndexedDB初始化失败:', error);
        alert('警告：音频存储功能初始化失败，音频文件将存储在localStorage中。\n如果存储空间不足，请清理一些数据。');
    }
    
    await loadAndDisplayNotes(); // 先加载笔记
    initSearch(); // 然后初始化搜索
    initAddNote(); // 初始化添加笔记功能
    
    // 初始化存储管理功能
    updateStorageInfo();
    
    // 导出数据按钮
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportListeningData);
    }
    
    // 导入数据按钮
    const importBtn = document.getElementById('importDataBtn');
    const importInput = document.getElementById('importDataInput');
    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importListeningData(e.target.files[0]);
            }
        });
    }
    
    // 清理存储按钮
    const clearBtn = document.getElementById('clearStorageBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearStorageSpace);
    }
    
    // 定期更新存储信息
    setInterval(updateStorageInfo, 30000); // 每30秒更新一次
});

// 加载并显示笔记（从localStorage）
async function loadAndDisplayNotes() {
    const notesGrid = document.querySelector('.notes-grid');
    if (!notesGrid) {
        console.log('❌ 未找到笔记网格容器');
        return;
    }

    // 从localStorage获取笔记
    let notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
    
    // 从IndexedDB加载音频数据
    for (let i = 0; i < notes.length; i++) {
        notes[i] = await loadAudioFromIndexedDB(notes[i]);
    }
    
    // 按日期排序：最新的在最前面
    notes.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0).getTime();
        const dateB = new Date(b.date || b.createdAt || 0).getTime();
        return dateB - dateA; // 降序：最新的在前
    });
    
    console.log(`从localStorage加载 ${notes.length} 条笔记`);

    // 清空网格，避免重复显示
    notesGrid.innerHTML = '';

    // 渲染笔记（按日期从新到旧）
    notes.forEach(note => {
        const noteCard = createNoteCard(note);
        notesGrid.appendChild(noteCard);
    });

    console.log('✅ 笔记加载完成');
}

// 创建笔记卡片元素
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.setAttribute('data-chapter', note.chapter);
    card.setAttribute('data-test', note.test);
    card.setAttribute('data-part', note.part);
    card.setAttribute('data-type', note.questionType);
    card.setAttribute('data-tags', note.tags || '');

    // 格式化日期
    const date = new Date(note.date);
    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // 获取问题类型标签
    const typeLabels = {
        'map': 'Map Labeling',
        'map-labeling': 'Map Labeling',
        'single-choice': 'Single Choice',
        'multiple-choice': 'Multiple Choice',
        'note-completion': 'Note Completion',
        'sentence-completion': 'Sentence Completion',
        'form-filling': 'Form Filling',
        'table-completion': 'Table Completion',
        'matching': 'Matching',
        'other': 'Other'
    };

    const typeLabel = typeLabels[note.questionType] || 'Other';
    // 保留连字符，因为CSS类名使用连字符（如 single-choice）
    const typeClass = note.questionType || 'other';

   // 构建关键点HTML（保留格式）
let keyPointsHTML = '';
if (note.keyPoints && note.keyPoints.length > 0) {
    keyPointsHTML = note.keyPoints.map(point => 
        `<li>${point}</li>`
    ).join('');
} else {
    keyPointsHTML = '<li style="color: #95a5a6; font-style: italic;">No key points</li>';
}

// 构建标签HTML（显示为单个标签，不拆分）
let tagsHTML = '';
if (note.tags && note.tags.trim()) {
    const tagText = note.tags.trim();
    tagsHTML = `<span class="note-tag">${escapeHtml(tagText)}</span>`;
}

// 高亮显示辅助函数
function cleanWordForHighlight(word) {
    return word.toLowerCase().replace(/[.,!?;:'"()\[\]{}]/g, '').trim();
}

function findBestMatchForHighlight(userWords, correctWords) {
    const matches = [];
    const usedUserIndices = new Set();
    const usedCorrectIndices = new Set();

    // 第一遍：精确匹配
    for (let i = 0; i < correctWords.length; i++) {
        if (usedCorrectIndices.has(i)) continue;
        
        const correctWordClean = cleanWordForHighlight(correctWords[i]);
        
        for (let j = 0; j < userWords.length; j++) {
            if (usedUserIndices.has(j)) continue;
            
            const userWordClean = cleanWordForHighlight(userWords[j]);
            
            if (correctWordClean === userWordClean) {
                matches.push({ userIndex: j, correctIndex: i });
                usedUserIndices.add(j);
                usedCorrectIndices.add(i);
                break;
            }
        }
    }

    // 第二遍：模糊匹配（允许位置偏移）
    for (let i = 0; i < correctWords.length; i++) {
        if (usedCorrectIndices.has(i)) continue;
        
        const correctWordClean = cleanWordForHighlight(correctWords[i]);
        
        // 在当前位置前后3个位置内查找
        for (let offset = -3; offset <= 3; offset++) {
            const j = i + offset;
            if (j < 0 || j >= userWords.length || usedUserIndices.has(j)) continue;
            
            const userWordClean = cleanWordForHighlight(userWords[j]);
            
            if (correctWordClean === userWordClean) {
                matches.push({ userIndex: j, correctIndex: i });
                usedUserIndices.add(j);
                usedCorrectIndices.add(i);
                break;
            }
        }
    }

    return matches.sort((a, b) => a.correctIndex - b.correctIndex);
}

function highlightDifferencesForRecord(userAnswer, correctAnswer) {
    const userWords = userAnswer.split(/\s+/).filter(w => w.trim());
    const correctWords = correctAnswer.split(/\s+/).filter(w => w.trim());

    // 使用动态规划进行最佳匹配
    const matches = findBestMatchForHighlight(userWords, correctWords);
    
    let result = '';
    let userIndex = 0;
    let correctIndex = 0;

    while (correctIndex < correctWords.length || userIndex < userWords.length) {
        const match = matches.find(m => m.correctIndex === correctIndex);
        
        if (match && match.userIndex === userIndex) {
            // 匹配成功
            result += `<span style="padding: 0.1rem 0.2rem; border-radius: 3px; background: rgba(16, 185, 129, 0.2); color: var(--btn-green); font-weight: 600;">${correctWords[correctIndex]}</span> `;
            userIndex++;
            correctIndex++;
        } else if (match && match.userIndex > userIndex) {
            // 中间有错误单词
            while (userIndex < match.userIndex) {
                result += `<span style="padding: 0.1rem 0.2rem; border-radius: 3px; background: rgba(239, 68, 68, 0.2); color: var(--btn-red); text-decoration: line-through;">${userWords[userIndex]}</span> `;
                userIndex++;
            }
            result += `<span style="padding: 0.1rem 0.2rem; border-radius: 3px; background: rgba(16, 185, 129, 0.2); color: var(--btn-green); font-weight: 600;">${correctWords[correctIndex]}</span> `;
            userIndex++;
            correctIndex++;
        } else if (correctIndex < correctWords.length) {
            // 漏听
            result += `<span style="padding: 0.1rem 0.2rem; border-radius: 3px; background: rgba(245, 158, 11, 0.2); color: var(--btn-orange); font-weight: 600;">${correctWords[correctIndex]}</span> `;
            correctIndex++;
        } else {
            // 用户答案多余的单词
            result += `<span style="padding: 0.1rem 0.2rem; border-radius: 3px; background: rgba(239, 68, 68, 0.2); color: var(--btn-red); text-decoration: line-through;">${userWords[userIndex]}</span> `;
            userIndex++;
        }
    }

    return result.trim();
}

// 获取最近一次与该笔记相关的精听记录
function getLatestListeningRecord(noteId) {
    try {
        const records = JSON.parse(localStorage.getItem('listeningRecords') || '[]');
        if (records.length === 0) return null;
        
        // 获取笔记内容，用于匹配
        const notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
        const note = notes.find(n => n.id === noteId);
        if (!note || !note.content) return null;
        
        // 从笔记内容中提取纯文本
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const noteText = (tempDiv.textContent || tempDiv.innerText || '').toLowerCase();
        
        // 查找包含该笔记句子的精听记录
        // 优先通过 noteId 匹配，如果没有 noteId，则通过句子内容匹配
        for (const record of records) {
            if (record.results && Array.isArray(record.results)) {
                // 首先尝试通过 noteId 匹配
                const hasNoteId = record.results.some(result => result.noteId === noteId);
                if (hasNoteId) {
                    return record;
                }
                
                // 如果没有 noteId，则通过句子内容匹配
                const hasNoteContent = record.results.some(result => {
                    if (!result.sentence) return false;
                    const sentenceText = result.sentence.toLowerCase();
                    // 检查句子是否在笔记内容中
                    return noteText.includes(sentenceText) || sentenceText.includes(noteText.substring(0, 50));
                });
                
                if (hasNoteContent) {
                    return record;
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting listening record:', error);
        return null;
    }
}

// 生成精听记录HTML
function generateListeningRecordHTML(noteId) {
    const record = getLatestListeningRecord(noteId);
    
    if (!record) {
        return '<div class="detail-section" style="border-top: 1px solid var(--border-light); padding-top: 1.5rem; margin-top: 1.5rem;"><h5><i class="fas fa-headphones" style="color: var(--primary-purple);"></i> Listening Practice Record</h5><p style="color: var(--text-muted); font-style: italic;">No practice record yet</p></div>';
    }
    
    // 格式化日期
    const date = new Date(record.date);
    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // 筛选出与该笔记相关的句子（通过 noteId 匹配）
    const noteResults = record.results ? record.results.filter(r => r.noteId === noteId) : [];
    
    if (noteResults.length === 0) {
        return '<div class="detail-section" style="border-top: 1px solid var(--border-light); padding-top: 1.5rem; margin-top: 1.5rem;"><h5><i class="fas fa-headphones" style="color: var(--primary-purple);"></i> Listening Practice Record</h5><p style="color: var(--text-muted); font-style: italic;">No practice record for this note</p></div>';
    }
    
    // 生成句子列表HTML
    let sentencesHTML = '';
    noteResults.forEach((result, index) => {
        const highlightedText = highlightDifferencesForRecord(
            result.userAnswer || '', 
            result.sentence || ''
        );
        
        sentencesHTML += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--background-light); border-radius: 8px; border: 1px solid var(--border-light);">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: var(--primary-purple); color: white; border-radius: 50%; font-size: 0.85rem; font-weight: 600;">${index + 1}</span>
                    <span style="color: var(--text-medium); font-size: 0.9rem; font-weight: 500;">Sentence ${index + 1}</span>
                </div>
                <div style="line-height: 1.8; color: var(--text-dark);">
                    ${highlightedText}
                </div>
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light); font-size: 0.85rem;">
                    <div style="color: var(--text-medium); margin-bottom: 0.25rem;">Your answer:</div>
                    <div style="color: var(--text-dark); font-style: italic;">${result.userAnswer || '(empty)'}</div>
                </div>
            </div>
        `;
    });
    
    return `
        <div class="detail-section" style="border-top: 1px solid var(--border-light); padding-top: 1.5rem; margin-top: 1.5rem;">
            <h5><i class="fas fa-headphones" style="color: var(--primary-purple);"></i> Listening Practice Record</h5>
            <div style="margin-top: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <div style="color: var(--text-medium); font-size: 0.9rem; font-weight: 500;">Practice Sentences:</div>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">${dateStr}</span>
                </div>
                <div style="margin-top: 1rem;">
                    ${sentencesHTML}
                </div>
            </div>
        </div>
    `;
}

card.innerHTML = `
    <div class="card-header">
        <div class="card-title">
            <h3>${note.chapter}-${note.test}-${note.part}</h3>
            <span class="card-badge ${typeClass}">${typeLabel}</span>
        </div>
        <div class="card-date">${dateStr}</div>
    </div>
    <div class="card-content">
        <p class="card-preview">${note.content ? note.content.replace(/<[^>]*>/g, '').substring(0, 150) : 'No content'}${note.content && note.content.replace(/<[^>]*>/g, '').length > 150 ? '...' : ''}</p>
        <div class="card-meta">
            ${note.errorReason && note.errorReason.trim() ? `<span><i class="fas fa-exclamation-circle"></i></span>` : ''}
            ${note.keyPoints && note.keyPoints.length > 0 ? `<span><i class="fas fa-key"></i> ${note.keyPoints.length} key points</span>` : ''}
        </div>
        ${tagsHTML ? `<div class="card-tags">${tagsHTML}</div>` : ''}
    </div>
    <div class="card-details">
        <div class="details-content">
            ${note.imageData ? `<div class="detail-section">
                <h5><i class="fas fa-image"></i> Map Image</h5>
                <div class="image-container">
                    <img src="${note.imageData}" alt="Map" style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem;">
                </div>
            </div>` : ''}

            ${note.question ? `<div class="detail-section">
                <h5><i class="fas fa-question-circle"></i> Question</h5>
                <p style="white-space: pre-line;">${note.question}</p>
            </div>` : ''}
            
            ${note.audioData ? `<div class="detail-section">
                <h5><i class="fas fa-volume-up"></i> Audio</h5>
                <audio controls style="width: 100%; margin-top: 0.5rem;">
                    <source src="${note.audioData}" type="audio/mpeg">
                    <source src="${note.audioData}" type="audio/wav">
                    <source src="${note.audioData}" type="audio/ogg">
                    Your browser does not support the audio element.
                </audio>
            </div>` : ''}
            
            ${note.content ? `<div class="detail-section">
                <h5><i class="fas fa-align-left"></i> Content</h5>
                <div class="content-display">${note.content}</div>
            </div>` : ''}
            
            ${note.keyPoints && note.keyPoints.length > 0 ? `<div class="detail-section">
                <h5><i class="fas fa-key"></i> Key Points</h5>
                <ul class="key-points-list">
                    ${keyPointsHTML}
                </ul>
            </div>` : ''}
            
            ${note.errorReason && note.errorReason.trim() ? `<div class="detail-section">
                <h5><i class="fas fa-exclamation-triangle"></i> Error Reason</h5>
                <p>${note.errorReason}</p>
            </div>` : ''}
            

            ${tagsHTML ? `<div class="detail-section">
                <h5><i class="fas fa-tags"></i> Tags</h5>
                <div class="note-tags-container">${tagsHTML}</div>
            </div>` : ''}
            
            ${generateListeningRecordHTML(note.id)}
        </div>
    </div>
`;
    // 添加笔记ID属性，用于编辑和删除
    card.setAttribute('data-note-id', note.id);
    
    // 为卡片绑定点击事件（用于显示详情）
    attachCardClickEvent(card);
    
    return card;
}

// 为卡片绑定点击事件的函数
function attachCardClickEvent(card) {
    // 获取模态框元素（使用与 initNoteDetailsModal 相同的ID）
    const modal = document.getElementById('detailsModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const editNoteBtn = document.getElementById('editNoteBtn');
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    
    if (!modal || !modalBody) {
        console.warn('详情模态框元素未找到，无法绑定点击事件');
        return;
    }
    
    // 绑定点击事件
    card.addEventListener('click', function(e) {
        // 如果点击的是删除按钮，不触发卡片点击
        if (e.target.closest('.btn-delete-note')) {
            return;
        }
        
        const details = this.querySelector('.card-details');
        const noteId = this.getAttribute('data-note-id');
        
        if (details) {
            // 获取卡片标题
            const cardTitle = this.querySelector('.card-title h3')?.textContent || 'Note Details';
            
            // 设置模态框标题
            if (modalTitle) {
                modalTitle.textContent = cardTitle;
            }
            
            // 复制详情内容到模态框
            const detailsContent = details.querySelector('.details-content');
            if (detailsContent) {
                modalBody.innerHTML = detailsContent.innerHTML;
            }
            
            // 显示编辑和删除按钮，并设置笔记ID
            if (editNoteBtn) {
                editNoteBtn.style.display = 'inline-flex';
                editNoteBtn.setAttribute('data-note-id', noteId);
            }
            if (deleteNoteBtn) {
                deleteNoteBtn.style.display = 'inline-flex';
                deleteNoteBtn.setAttribute('data-note-id', noteId);
            }
            
            // 显示模态框
            modal.style.display = 'block';
        }
    });
}
// 删除笔记功能
function deleteNote(noteId) {
    // 从 localStorage 获取笔记
    let notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
    
    // 过滤掉要删除的笔记
    notes = notes.filter(note => note.id !== noteId);
    
    // 保存回 localStorage
    try {
        localStorage.setItem('listeningNotes', JSON.stringify(notes));
        updateStorageInfo();
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            const solution = confirm(
                '存储空间超出限制！\n\n' +
                '解决方案：\n' +
                '1. 点击"确定"打开清理工具\n' +
                '2. 点击"取消"导出数据到文件\n\n' +
                '提示：使用"Export Data"导出数据后，可以在任何端口通过"Import Data"导入。'
            );
            if (solution) {
                clearStorageSpace();
            } else {
                exportListeningData();
            }
        } else {
            throw e;
        }
    }
    
    // 刷新页面显示
    location.reload();
}

// ==================== 精听功能 ====================

// 显示精听选项模态框
function showListeningOptions() {
    const modal = document.getElementById('listeningOptionsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 关闭精听选项模态框
function closeListeningOptions() {
    const modal = document.getElementById('listeningOptionsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 开始随机精听训练
async function startRandomListening() {
    // 获取所有听力笔记（有音频和内容的，且已勾选纳入精听）
    const notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
    const listeningNotes = notes.filter(note => 
        note.audioData && 
        note.content && 
        note.content.trim() &&
        (note.enableIntensiveListening === true)
    );

    if (listeningNotes.length === 0) {
        alert('No listening notes available with "Enable Intensive Listening" enabled. Please enable this option for notes you want to practice.');
        return;
    }

    // 从所有笔记中提取句子，并加载音频数据
    const allSentences = [];
    for (const note of listeningNotes) {
        // 加载音频数据（如果存储在IndexedDB中）
        let audioData = note.audioData;
        if (audioData === 'INDEXEDDB') {
            try {
                audioData = await audioStorage.getAudio(note.id);
                if (!audioData) {
                    console.warn(`Audio not found in IndexedDB for note ${note.id}`);
                    continue; // 跳过没有音频的笔记
                }
            } catch (error) {
                console.error(`Error loading audio for note ${note.id}:`, error);
                continue; // 跳过加载失败的笔记
            }
        }
        
        if (!audioData) {
            continue; // 跳过没有音频数据的笔记
        }
        
        const content = note.content;
        // 移除HTML标签
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        // 按句子分割
        const sentences = textContent
            .split(/[。！？\n\r]+/)
            .map(s => s.trim())
            .filter(s => s.length > 5); // 只保留长度大于5的句子
        
        sentences.forEach(sentence => {
            allSentences.push({
                sentence: sentence,
                noteId: note.id,
                audioData: audioData // 使用加载的实际音频数据
            });
        });
    }

    if (allSentences.length === 0) {
        alert('No sentences found. Please ensure notes contain complete sentences and have audio files.');
        return;
    }

    // 随机选择15句（如果句子总数少于15，则全部选择）
    const selectedCount = Math.min(15, allSentences.length);
    const selectedSentences = [];
    const usedIndices = new Set();
    
    while (selectedSentences.length < selectedCount) {
        const randomIndex = Math.floor(Math.random() * allSentences.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            selectedSentences.push(allSentences[randomIndex]);
        }
    }

    // 保存到sessionStorage并跳转到精听页面
    sessionStorage.setItem('listeningSentences', JSON.stringify(selectedSentences));
    // 跳转到精听练习页面（需要创建或使用现有的精听页面）
    window.location.href = '../pages/listening-practice.html';
}

// 开始筛选精听（显示弹窗）
async function startFilteredListening() {
    // 获取当前筛选后的笔记
    const notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
    
    // 获取当前搜索关键词
    const searchInput = document.getElementById('noteSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    // 筛选笔记（根据搜索关键词和精听选项）
    let filteredNotes = notes.filter(note => 
        note.enableIntensiveListening === true
    );
    if (searchTerm) {
        filteredNotes = filteredNotes.filter(note => {
            const text = (note.content || '').toLowerCase();
            const tags = (note.tags || '').toLowerCase();
            const chapter = (note.chapter || '').toLowerCase();
            const test = (note.test || '').toLowerCase();
            const part = (note.part || '').toLowerCase();
            return text.includes(searchTerm) || 
                   tags.includes(searchTerm) || 
                   chapter.includes(searchTerm) || 
                   test.includes(searchTerm) || 
                   part.includes(searchTerm);
        });
    }
    
    const listeningNotes = filteredNotes.filter(note => 
        note.audioData && 
        note.content && 
        note.content.trim() &&
        note.enableIntensiveListening === true
    );

    if (listeningNotes.length === 0) {
        alert('No listening notes available under current filter with "Enable Intensive Listening" enabled. Please enable this option for notes you want to practice.');
        return;
    }

    // 从筛选后的笔记中提取句子，并加载音频数据
    const allSentences = [];
    for (const note of listeningNotes) {
        // 加载音频数据（如果存储在IndexedDB中）
        let audioData = note.audioData;
        if (audioData === 'INDEXEDDB') {
            try {
                audioData = await audioStorage.getAudio(note.id);
                if (!audioData) {
                    console.warn(`Audio not found in IndexedDB for note ${note.id}`);
                    continue; // 跳过没有音频的笔记
                }
            } catch (error) {
                console.error(`Error loading audio for note ${note.id}:`, error);
                continue; // 跳过加载失败的笔记
            }
        }
        
        if (!audioData) {
            continue; // 跳过没有音频数据的笔记
        }
        
        const content = note.content;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        const sentences = textContent
            .split(/[。！？\n\r]+/)
            .map(s => s.trim())
            .filter(s => s.length > 5);
        
        sentences.forEach(sentence => {
            allSentences.push({
                sentence: sentence,
                noteId: note.id,
                audioData: audioData // 使用加载的实际音频数据
            });
        });
    }

    if (allSentences.length === 0) {
        alert('No sentences found in filtered notes. Please ensure notes contain complete sentences and have audio files.');
        return;
    }

    // 显示弹窗，显示笔记数和句子数
    const modal = document.getElementById('filteredNotesConfirmModal');
    const notesCountEl = document.getElementById('filteredNotesCount');
    const sentencesCountEl = document.getElementById('availableSentencesCount');
    
    if (modal && notesCountEl && sentencesCountEl) {
        notesCountEl.textContent = listeningNotes.length;
        sentencesCountEl.textContent = allSentences.length;
        modal.style.display = 'flex';
        
        // 保存所有句子到临时变量，供后续使用
        window.filteredListeningSentences = allSentences;
    }
}

// 从筛选条件下的句子中随机选择15条进行精听
function startRandom15FilteredListening() {
    if (!window.filteredListeningSentences || window.filteredListeningSentences.length === 0) {
        alert('No sentences available');
        return;
    }

    const allSentences = window.filteredListeningSentences;
    const selectedCount = Math.min(15, allSentences.length);
    const selectedSentences = [];
    const usedIndices = new Set();
    
    while (selectedSentences.length < selectedCount) {
        const randomIndex = Math.floor(Math.random() * allSentences.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            selectedSentences.push(allSentences[randomIndex]);
        }
    }

    // 关闭弹窗
    const modal = document.getElementById('filteredNotesConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }

    // 保存到sessionStorage并跳转到精听页面
    sessionStorage.setItem('listeningSentences', JSON.stringify(selectedSentences));
    window.location.href = '../pages/listening-practice.html';
}

// 精听筛选条件下的所有句子
function startAllFilteredListening() {
    if (!window.filteredListeningSentences || window.filteredListeningSentences.length === 0) {
        alert('No sentences available');
        return;
    }

    // 关闭弹窗
    const modal = document.getElementById('filteredNotesConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }

    // 保存所有句子到sessionStorage并跳转到精听页面
    sessionStorage.setItem('listeningSentences', JSON.stringify(window.filteredListeningSentences));
    window.location.href = '../pages/listening-practice.html';
}

// 关闭筛选精听确认弹窗
function closeFilteredNotesConfirmModal() {
    const modal = document.getElementById('filteredNotesConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
    window.filteredListeningSentences = null;
}

// 初始化精听功能事件监听器
function initListeningPractice() {
    // 精听按钮
    const startListeningBtn = document.getElementById('startListeningBtn');
    if (startListeningBtn) {
        startListeningBtn.addEventListener('click', () => {
            showListeningOptions();
        });
    }

    // 随机精听按钮
    const randomListeningBtn = document.getElementById('randomListeningBtn');
    if (randomListeningBtn) {
        randomListeningBtn.addEventListener('click', () => {
            closeListeningOptions();
            startRandomListening();
        });
    }

    // 筛选精听按钮
    const filteredListeningBtn = document.getElementById('filteredListeningBtn');
    if (filteredListeningBtn) {
        filteredListeningBtn.addEventListener('click', () => {
            closeListeningOptions();
            startFilteredListening();
        });
    }

    // 关闭精听选项模态框
    const closeListeningOptionsModal = document.getElementById('closeListeningOptionsModal');
    if (closeListeningOptionsModal) {
        closeListeningOptionsModal.addEventListener('click', () => {
            closeListeningOptions();
        });
    }

    // 筛选精听确认弹窗相关事件
    const random15FilteredBtn = document.getElementById('random15FilteredBtn');
    if (random15FilteredBtn) {
        random15FilteredBtn.addEventListener('click', () => {
            startRandom15FilteredListening();
        });
    }

    const allFilteredBtn = document.getElementById('allFilteredBtn');
    if (allFilteredBtn) {
        allFilteredBtn.addEventListener('click', () => {
            startAllFilteredListening();
        });
    }

    const closeFilteredNotesConfirmModalBtn = document.getElementById('closeFilteredNotesConfirmModal');
    if (closeFilteredNotesConfirmModalBtn) {
        closeFilteredNotesConfirmModalBtn.addEventListener('click', () => {
            closeFilteredNotesConfirmModal();
        });
    }

    const cancelFilteredListeningBtn = document.getElementById('cancelFilteredListeningBtn');
    if (cancelFilteredListeningBtn) {
        cancelFilteredListeningBtn.addEventListener('click', () => {
            closeFilteredNotesConfirmModal();
        });
    }

    // 点击模态框外部关闭
    const listeningOptionsModal = document.getElementById('listeningOptionsModal');
    if (listeningOptionsModal) {
        listeningOptionsModal.addEventListener('click', (e) => {
            if (e.target.id === 'listeningOptionsModal') {
                closeListeningOptions();
            }
        });
    }

    const filteredNotesConfirmModal = document.getElementById('filteredNotesConfirmModal');
    if (filteredNotesConfirmModal) {
        filteredNotesConfirmModal.addEventListener('click', (e) => {
            if (e.target.id === 'filteredNotesConfirmModal') {
                closeFilteredNotesConfirmModal();
            }
        });
    }
}

// 页面加载完成后初始化精听功能
document.addEventListener('DOMContentLoaded', () => {
    initListeningPractice();
});