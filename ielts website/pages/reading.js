// Reading Page JavaScript
console.log('📖 Reading page JS loaded');

// 全局变量
let editingNoteId = null;
let questionErrorPairCounter = 0;
let contentNotes = {}; // 存储 content 中的 notes: { noteId: { text: '', note: '' } }

// Add Question & Error Reason Pair (Global Function)
window.addQuestionErrorPairItem = function(question = '', errorReason = '') {
    console.log('🔵 addQuestionErrorPairItem 被调用, question:', question, 'errorReason:', errorReason);
    questionErrorPairCounter++;
    const pairId = `question_error_pair_${questionErrorPairCounter}`;
    
    const questionErrorPairsContainer = document.getElementById('questionErrorPairsContainer');
    if (!questionErrorPairsContainer) {
        console.error('❌ questionErrorPairsContainer not found');
        return;
    }
    
    const pairItem = document.createElement('div');
    pairItem.className = 'question-error-pair-item';
    pairItem.dataset.pairId = pairId;
    
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    pairItem.innerHTML = `
        <div class="pair-item-inputs">
            <textarea class="pair-question-input" placeholder="Enter question..." rows="2">${escapeHtml(question)}</textarea>
            <textarea class="pair-error-reason-input" placeholder="Enter error reason..." rows="2">${escapeHtml(errorReason)}</textarea>
        </div>
        <button type="button" class="pair-item-remove" onclick="removeQuestionErrorPairItem('${pairId}')" title="Remove this pair">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;
    
    questionErrorPairsContainer.appendChild(pairItem);
    console.log('✅ Question & Error Reason pair added, pairId:', pairId);
};

// Remove Question & Error Reason Pair
window.removeQuestionErrorPairItem = function(pairId) {
    console.log('🔵 removeQuestionErrorPairItem 被调用, pairId:', pairId);
    const pairItem = document.querySelector(`[data-pair-id="${pairId}"]`);
    if (pairItem) {
        pairItem.remove();
        console.log('✅ Question & Error Reason pair removed');
    } else {
        console.warn('⚠️ Question & Error Reason pair not found for removal');
    }
};

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
    
    function updateNoteCount(count) {
        if (noteCount) {
            noteCount.textContent = `${count} ${count === 1 ? 'note' : 'notes'} found`;
        }
    }
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log(`搜索: "${searchTerm}"`);
        
        let visibleCount = 0;
        const noResults = document.getElementById('noResults');
        
        noteCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const chapter = card.getAttribute('data-chapter') || '';
            const test = card.getAttribute('data-test') || '';
            const passage = card.getAttribute('data-passage') || '';
            const title = card.getAttribute('data-title') || '';
            
            const matches = text.includes(searchTerm) || 
                           chapter.toLowerCase().includes(searchTerm) || 
                           test.toLowerCase().includes(searchTerm) ||
                           passage.toLowerCase().includes(searchTerm) ||
                           title.toLowerCase().includes(searchTerm);
            
            if (searchTerm === '' || matches) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
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
    
    searchInput.addEventListener('input', performSearch);
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            performSearch();
            searchInput.focus();
            console.log('🗑️ 搜索已清除');
        });
    }
    
    updateNoteCount(noteCards.length);
    initCardToggles();
    console.log('✅ 搜索和卡片功能初始化完成');
}

// 卡片点击显示详情
function initCardToggles() {
    console.log('[CARD] ========== initCardToggles called ==========');
    const modal = document.getElementById('noteDetailsModal');
    const modalBody = document.getElementById('noteDetailsContent');
    const modalTitle = document.getElementById('detailsTitle');
    const modalClose = document.getElementById('closeDetailsModal');
    const editNoteBtn = document.getElementById('editNoteBtn');
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    
    console.log('[CARD] Elements found - modal:', !!modal, 'modalBody:', !!modalBody);
    
    if (!modal || !modalBody) {
        console.log('❌ 未找到模态框元素');
        return;
    }
    
    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.btn-delete-note')) {
                return;
            }
            
            const noteId = this.getAttribute('data-note-id');
            const notes = JSON.parse(localStorage.getItem('readingNotes') || '[]');
            const note = notes.find(n => n.id === noteId);
            
            if (!note) {
                console.error('❌ Note not found:', noteId);
                return;
            }
            
            if (modalTitle) {
                modalTitle.textContent = note.title || `${note.chapter}-${note.test}-${note.passage}`;
            }
            
            // 构建详情内容 - 左右布局
            const leftContent = document.getElementById('noteViewLeftContent');
            const rightContent = document.getElementById('noteViewRightContent');
            
            if (!leftContent || !rightContent) {
                console.error('❌ Note view layout containers not found');
                return;
            }
            
            // 左侧内容：只显示文章内容（标题已在模态框 header 显示）
            let leftHTML = '';
            if (note.content) {
                leftHTML += `<div class="detail-section"><h5>Content</h5><div class="content-display" id="viewContentDisplay">${note.content}</div></div>`;
            }
            leftContent.innerHTML = leftHTML;
            
            // 标记已保存的vocabulary单词（在查看模式）
            setTimeout(() => {
                console.log('🔵 查看模式：准备标记vocabulary单词');
                const viewContentDisplay = document.getElementById('viewContentDisplay');
                console.log('🔵 viewContentDisplay元素:', viewContentDisplay);
                console.log('🔵 markAllVocabularyWords类型:', typeof window.markAllVocabularyWords);
                console.log('🔵 initVocabularyTooltips类型:', typeof window.initVocabularyTooltips);
                
                if (viewContentDisplay && typeof window.markAllVocabularyWords === 'function') {
                    console.log('✅ 调用markAllVocabularyWords');
                    window.markAllVocabularyWords(viewContentDisplay);
                    // 确保tooltip被初始化（延迟一点，确保标记已完成）
                    if (typeof window.initVocabularyTooltips === 'function') {
                        setTimeout(() => {
                            console.log('🔵 查看模式：额外调用initVocabularyTooltips');
                            window.initVocabularyTooltips();
                        }, 300);
                    } else {
                        console.error('❌ initVocabularyTooltips不是函数！');
                    }
                } else {
                    console.log('⚠️ viewContentDisplay不存在或markAllVocabularyWords不是函数');
                    if (!viewContentDisplay) {
                        console.error('❌ viewContentDisplay元素未找到');
                    }
                    if (typeof window.markAllVocabularyWords !== 'function') {
                        console.error('❌ markAllVocabularyWords不是函数');
                    }
                }
            }, 150);
            
            // 右侧内容：问题和错误原因
            let rightHTML = '';
            if (note.questionErrorPairs && note.questionErrorPairs.length > 0) {
                rightHTML += `<div class="detail-section"><h5>Questions & Error Reasons</h5>`;
                note.questionErrorPairs.forEach((pair, index) => {
                    rightHTML += `
                        <div class="question-error-pair-item-view">
                            <div class="pair-header">
                                <span class="pair-number">Question ${index + 1}:</span>
                            </div>
                            <div class="pair-content">
                                <div class="pair-question">${escapeHtml(pair.question || '')}</div>
                                <div class="pair-error-reason"><strong>Error Reason:</strong> ${escapeHtml(pair.errorReason || '')}</div>
                            </div>
                        </div>
                    `;
                });
                rightHTML += `</div>`;
            } else {
                rightHTML += `<div class="detail-section"><p style="color: var(--text-muted); font-style: italic;">No questions and error reasons</p></div>`;
            }
            rightContent.innerHTML = rightHTML;
            
            if (editNoteBtn) {
                editNoteBtn.style.display = 'inline-flex';
                editNoteBtn.setAttribute('data-note-id', noteId);
            }
            if (deleteNoteBtn) {
                deleteNoteBtn.style.display = 'inline-flex';
                deleteNoteBtn.setAttribute('data-note-id', noteId);
            }
            
            modal.style.display = 'block';
            
            // Initialize tooltips for view mode (hover only, no edit functionality)
            setTimeout(() => {
                initViewModeTooltips(note);
            }, 100);
        });
    });
    
    if (editNoteBtn) {
        editNoteBtn.addEventListener('click', function(e) {
            console.log('[EDIT] Edit button clicked');
            e.stopPropagation();
            const noteId = this.getAttribute('data-note-id');
            console.log('[EDIT] Note ID:', noteId);
            if (noteId) {
                editNote(noteId);
                modal.style.display = 'none';
            }
        });
    }
    
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
    
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            modal.style.display = 'none';
            if (editNoteBtn) editNoteBtn.style.display = 'none';
            if (deleteNoteBtn) deleteNoteBtn.style.display = 'none';
        });
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                if (editNoteBtn) editNoteBtn.style.display = 'none';
                if (deleteNoteBtn) deleteNoteBtn.style.display = 'none';
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            if (editNoteBtn) editNoteBtn.style.display = 'none';
            if (deleteNoteBtn) deleteNoteBtn.style.display = 'none';
        }
    });
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize tooltips for view mode (hover only, no edit functionality)
function initViewModeTooltips(note) {
    console.log('🔵 initViewModeTooltips called for view mode');
    
    if (!note || !note.contentNotes) {
        console.log('⚠️ No content notes found');
        return;
    }
    
    const leftContent = document.getElementById('noteViewLeftContent');
    if (!leftContent) {
        console.error('❌ noteViewLeftContent not found');
        return;
    }
    
    // Find all content-note-marker elements in the left content area (where article is displayed)
    const noteMarkers = leftContent.querySelectorAll('.content-note-marker');
    console.log('🔵 Found', noteMarkers.length, 'note markers in view mode');
    
    // Create a tooltip element for view mode (without edit button)
    let viewTooltipElement = document.getElementById('viewContentNoteTooltip');
    if (!viewTooltipElement) {
        viewTooltipElement = document.createElement('div');
        viewTooltipElement.id = 'viewContentNoteTooltip';
        viewTooltipElement.className = 'content-note-tooltip';
        viewTooltipElement.style.cssText = `
            position: fixed !important;
            background: #1F2937 !important;
            color: white !important;
            border-radius: 8px !important;
            font-size: 0.875rem !important;
            white-space: normal !important;
            max-width: 400px !important;
            width: max-content !important;
            z-index: 9999 !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            pointer-events: auto !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.5 !important;
            text-align: left !important;
            display: none !important;
            box-sizing: border-box !important;
            visibility: visible !important;
            opacity: 1 !important;
            padding: 0.75rem 1rem !important;
        `;
        document.body.appendChild(viewTooltipElement);
    }
    
    noteMarkers.forEach((marker, index) => {
        const noteId = marker.getAttribute('data-note-id');
        console.log(`🔵 View Marker ${index}: noteId=${noteId}, hasContentNote=${!!note.contentNotes[noteId]}`);
        
        if (noteId && note.contentNotes[noteId]) {
            // Remove title attribute
            marker.removeAttribute('title');
            
            // Clone marker to remove old event listeners
            const newMarker = marker.cloneNode(true);
            marker.parentNode.replaceChild(newMarker, marker);
            
            // Add hover event listeners (view mode: hover only, no click/pin functionality)
            newMarker.addEventListener('mouseenter', function() {
                console.log('🟢 View mode: Mouse enter marker, noteId:', noteId);
                
                const noteText = note.contentNotes[noteId].note || '';
                if (!noteText) return;
                
                // Set tooltip content
                viewTooltipElement.textContent = noteText;
                
                // Position tooltip
                // 使用Range API获取选中文本的实际位置，而不是marker元素的边界框
                // 这样可以更准确地定位tooltip，特别是当marker跨越多行时
                let rect;
                let markerCenter;
                
                // 尝试从marker中创建一个Range来获取文本的实际位置
                try {
                    const range = document.createRange();
                    range.selectNodeContents(newMarker);
                    // 获取Range的边界框（这会更准确地反映文本的实际位置）
                    const rangeRects = range.getClientRects();
                    
                    if (rangeRects.length > 0) {
                        // 如果有多个矩形（跨越多行），使用第一个矩形的位置（文本开始位置）
                        // 这样可以确保tooltip显示在选中文本的开始位置上方
                        if (rangeRects.length === 1) {
                            rect = rangeRects[0];
                            markerCenter = rect.left + rect.width / 2;
                        } else {
                            // 跨越多行：使用第一个矩形的位置（文本开始位置）
                            // 这样tooltip会显示在选中文本的第一行上方
                            rect = rangeRects[0];
                            markerCenter = rect.left + rect.width / 2;
                        }
                    } else {
                        // 如果Range没有返回矩形，回退到marker的getBoundingClientRect
                        rect = newMarker.getBoundingClientRect();
                        markerCenter = rect.left + rect.width / 2;
                    }
                } catch (e) {
                    // 如果Range API失败，回退到marker的getBoundingClientRect
                    rect = newMarker.getBoundingClientRect();
                    markerCenter = rect.left + rect.width / 2;
                }
                
                // 显示tooltip以获取其尺寸
                viewTooltipElement.style.display = 'block';
                viewTooltipElement.style.visibility = 'hidden'; // 先隐藏以计算尺寸
                const tooltipRect = viewTooltipElement.getBoundingClientRect();
                
                // 水平定位策略（按顺序尝试）
                let left;
                const tooltipHalfWidth = tooltipRect.width / 2;
                
                // a. 首选：将tooltip的中心与目标语段的中心水平对齐
                left = markerCenter;
                
                // b. 如果左侧超出屏幕：将tooltip的左边缘对齐到屏幕左边缘 + 10px边距
                if (left - tooltipHalfWidth < 10) {
                    left = 10 + tooltipHalfWidth;
                }
                
                // c. 如果右侧超出屏幕：将tooltip的右边缘对齐到屏幕右边缘 - 10px边距
                if (left + tooltipHalfWidth > window.innerWidth - 10) {
                    left = window.innerWidth - 10 - tooltipHalfWidth;
                }
                
                // 垂直定位
                let top = rect.top - 10;
                
                // 调整垂直位置，如果上方空间不足，显示在下方
                let transformValue;
                if (top - tooltipRect.height < 10) {
                    top = rect.bottom + 10;
                    transformValue = 'translate(-50%, 0)';
                    // 调整箭头方向
                    let arrow = viewTooltipElement.querySelector('.tooltip-arrow');
                    if (arrow) {
                        arrow.style.top = '-8px';
                        arrow.style.bottom = 'auto';
                        arrow.style.borderBottom = '8px solid var(--text-dark)';
                        arrow.style.borderTop = 'none';
                    }
                } else {
                    transformValue = 'translate(-50%, -100%)';
                    // 调整箭头方向
                    let arrow = viewTooltipElement.querySelector('.tooltip-arrow');
                    if (arrow) {
                        arrow.style.top = 'auto';
                        arrow.style.bottom = '-8px';
                        arrow.style.borderTop = '8px solid var(--text-dark)';
                        arrow.style.borderBottom = 'none';
                    }
                }
                
                // 确保使用!important覆盖任何可能的CSS样式
                viewTooltipElement.style.setProperty('left', left + 'px', 'important');
                viewTooltipElement.style.setProperty('top', top + 'px', 'important');
                viewTooltipElement.style.setProperty('transform', transformValue, 'important');
                viewTooltipElement.style.setProperty('visibility', 'visible', 'important');
                viewTooltipElement.style.setProperty('z-index', '9999', 'important');
                viewTooltipElement.style.setProperty('position', 'fixed', 'important');
                
                // Add arrow if not exists
                let arrow = viewTooltipElement.querySelector('.tooltip-arrow');
                if (!arrow) {
                    arrow = document.createElement('div');
                    arrow.className = 'tooltip-arrow';
                    arrow.style.cssText = `
                        position: absolute;
                        bottom: -6px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 6px solid transparent;
                        border-right: 6px solid transparent;
                        border-top: 6px solid #1F2937;
                    `;
                    viewTooltipElement.appendChild(arrow);
                }
                
                console.log('✅ View tooltip displayed');
            });
            
            newMarker.addEventListener('mouseleave', function(e) {
                console.log('🔴 View mode: Mouse leave marker, noteId:', noteId);
                
                // Check if mouse is moving to tooltip
                const relatedTarget = e.relatedTarget;
                if (relatedTarget && (relatedTarget === viewTooltipElement || viewTooltipElement.contains(relatedTarget))) {
                    console.log('✅ Mouse moving to tooltip, keeping it visible');
                    return;
                }
                
                // Use a small delay to allow mouse to reach tooltip
                setTimeout(() => {
                    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
                    if (elementUnderMouse && (elementUnderMouse === viewTooltipElement || viewTooltipElement.contains(elementUnderMouse))) {
                        console.log('✅ Mouse reached tooltip, keeping it visible');
                        return;
                    }
                    // Hide tooltip
                    viewTooltipElement.style.display = 'none';
                }, 150);
            });
            
            console.log('✅ View mode event listeners added for marker', noteId);
        }
    });
    
    // Hide tooltip when mouse leaves tooltip
    if (viewTooltipElement) {
        // Remove old listeners if exist
        if (viewTooltipElement._mouseLeaveHandler) {
            viewTooltipElement.removeEventListener('mouseleave', viewTooltipElement._mouseLeaveHandler);
        }
        
        viewTooltipElement._mouseLeaveHandler = function(e) {
            const relatedTarget = e.relatedTarget;
            if (relatedTarget && relatedTarget.classList.contains('content-note-marker')) {
                return;
            }
            viewTooltipElement.style.display = 'none';
        };
        viewTooltipElement.addEventListener('mouseleave', viewTooltipElement._mouseLeaveHandler);
    }
    
    console.log('✅ View mode tooltips initialized');
}

// Initialize Content Notes Functionality
function initContentNotes() {
    console.log('🔵 ========== initContentNotes 被调用 ==========');
    const contentEditor = document.getElementById('noteContent');
    const addNoteToSelectionBtn = document.getElementById('addNoteToSelection');
    const addContentNoteModal = document.getElementById('addContentNoteModal');
    const closeAddContentNoteModal = document.getElementById('closeAddContentNoteModal');
    const saveContentNoteBtn = document.getElementById('saveContentNoteBtn');
    const noteTextInput = document.getElementById('noteTextInput');
    const selectedTextPreview = document.getElementById('selectedTextPreview');
    
    console.log('🔵 contentEditor:', !!contentEditor, contentEditor);
    console.log('🔵 addNoteToSelectionBtn:', !!addNoteToSelectionBtn, addNoteToSelectionBtn);
    console.log('🔵 addContentNoteModal:', !!addContentNoteModal, addContentNoteModal);
    console.log('🔵 closeAddContentNoteModal:', !!closeAddContentNoteModal);
    console.log('🔵 saveContentNoteBtn:', !!saveContentNoteBtn);
    console.log('🔵 noteTextInput:', !!noteTextInput);
    console.log('🔵 selectedTextPreview:', !!selectedTextPreview);
    
    if (!contentEditor) {
        console.error('❌ contentEditor (noteContent) not found!');
    }
    if (!addNoteToSelectionBtn) {
        console.error('❌ addNoteToSelectionBtn not found!');
    }
    if (!addContentNoteModal) {
        console.error('❌ addContentNoteModal not found!');
    }
    
    if (!contentEditor || !addNoteToSelectionBtn || !addContentNoteModal) {
        console.warn('⚠️ Content notes elements not found, returning');
        // Elements not found, but don't block initAddNote
        return;
    }

    // 添加粘贴事件处理，保留换行和空行，清除其他格式
    if (contentEditor && !contentEditor._pasteHandlerAdded) {
        contentEditor.addEventListener('paste', function(e) {
            e.preventDefault();
            console.log('📋 粘贴事件触发，保留换行和空行，清除其他格式');
            
            // 获取剪贴板中的纯文本（保留换行符）
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            
            if (!text) {
                console.warn('⚠️ 剪贴板中没有文本内容');
                return;
            }
            
            // 获取当前选择范围
            const selection = window.getSelection();
            if (!selection.rangeCount) {
                // 如果没有选择，在末尾插入
                const range = document.createRange();
                range.selectNodeContents(contentEditor);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // 删除选中的内容（如果有）
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            // 将文本按换行符分割，保留所有换行（包括空行）
            const lines = text.split(/\r?\n/);
            const fragment = document.createDocumentFragment();
            
            lines.forEach((line, index) => {
                // 添加文本内容（即使是空字符串也添加，以保留空行）
                fragment.appendChild(document.createTextNode(line));
                
                // 如果不是最后一行，添加br标签保留换行
                if (index < lines.length - 1) {
                    fragment.appendChild(document.createElement('br'));
                }
            });
            
            // 插入所有内容
            range.insertNode(fragment);
            
            // 移动光标到插入内容的末尾
            if (fragment.lastChild) {
                range.setStartAfter(fragment.lastChild);
            } else {
                range.setStartAfter(fragment);
            }
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // 清理可能残留的格式标签（加粗、高亮等），但保留br标签
            setTimeout(() => {
                // 查找所有格式标签
                const formatElements = contentEditor.querySelectorAll('strong, em, u, span[style], b, i, font, mark, highlight, p, div');
                formatElements.forEach(el => {
                    // 如果是p或div标签，保留其内容和br标签，但移除标签本身
                    if (el.tagName === 'P' || el.tagName === 'DIV') {
                        const parent = el.parentNode;
                        const fragment = document.createDocumentFragment();
                        
                        // 遍历所有子节点
                        Array.from(el.childNodes).forEach(child => {
                            if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'BR') {
                                // 保留br标签
                                fragment.appendChild(child.cloneNode(true));
                            } else if (child.nodeType === Node.TEXT_NODE) {
                                // 保留文本节点
                                fragment.appendChild(child.cloneNode(true));
                            } else if (child.nodeType === Node.ELEMENT_NODE) {
                                // 对于其他元素，提取文本内容
                                const text = child.textContent;
                                if (text) {
                                    fragment.appendChild(document.createTextNode(text));
                                }
                            }
                        });
                        
                        parent.insertBefore(fragment, el);
                        parent.removeChild(el);
                    } else {
                        // 其他格式标签（strong, em, u, span, b, i, font, mark, highlight），提取文本内容
                        const parent = el.parentNode;
                        const text = el.textContent;
                        const textNode = document.createTextNode(text);
                        parent.replaceChild(textNode, el);
                    }
                });
                
                // 合并相邻的文本节点（不会影响br标签）
                contentEditor.normalize();
                
                console.log('✅ 格式清理完成，换行和空行已保留');
                
                // 格式清理完成后，自动标记vocabulary单词
                setTimeout(() => {
                    console.log('📋 粘贴完成，准备标记vocabulary单词...');
                    if (typeof window.markAllVocabularyWords === 'function') {
                        window.markAllVocabularyWords(contentEditor);
                    } else {
                        console.error('❌ markAllVocabularyWords不是函数！');
                    }
                }, 50);
            }, 0);
            
            // 确保编辑器获得焦点
            contentEditor.focus();
            
            console.log('✅ 已插入文本，保留换行和空行，清除其他格式');
        });
        
        contentEditor._pasteHandlerAdded = true;
        console.log('✅ 粘贴事件处理器已添加');
    }

    // 初始化颜色选择器功能
    let savedSelectionRange = null;
    let savedSelectionEditor = null;
    let activeEditor = null;
    let sharedPaletteCreated = false;

    // 保存选择范围
    contentEditor.addEventListener('mouseup', function() {
        if (window.getSelection && window.getSelection().rangeCount > 0) {
            savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
            savedSelectionEditor = contentEditor;
        }
    });

    contentEditor.addEventListener('keyup', function() {
        if (window.getSelection && window.getSelection().rangeCount > 0) {
            savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
            savedSelectionEditor = contentEditor;
        }
    });

    // 创建共享调色板（如果还没有创建）
    function createSharedPaletteIfNeeded() {
        if (sharedPaletteCreated) return;
        
        let palette = document.getElementById('sharedColorPalette');
        if (!palette) {
            console.warn('⚠️ 共享调色板元素未找到');
            return;
        }

        // 颜色样本点击事件
        palette.addEventListener('click', function (e) {
            const swatch = e.target.closest('.color-swatch');
            if (!swatch) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const color = swatch.getAttribute('data-color');
            console.log('🎨 选择的颜色:', color);
            
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
                            console.log('✅ 已恢复保存的选择');
                        } catch (rangeErr) {
                            console.warn('⚠️ 无法恢复选择，颜色将应用到之后输入的文字:', rangeErr);
                        }
                    } else {
                        // 没有保存的选择，检查当前是否有选择
                        const sel = window.getSelection();
                        if (sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) {
                            console.log('ℹ️ 没有选择，颜色将应用到之后输入的文字');
                        }
                    }
                    
                    document.execCommand('foreColor', false, color);
                    console.log('✅ 已应用颜色:', color);
                } catch (err) {
                    console.error('❌ 应用颜色时出错:', err);
                }
            }
            
            hideSharedPalette();
        });

        sharedPaletteCreated = true;
        console.log('✅ 共享调色板已创建');
    }

    function showSharedPalette(buttonElement) {
        createSharedPaletteIfNeeded();
        const palette = document.getElementById('sharedColorPalette');
        if (!palette) {
            console.error('❌ 调色板未找到！');
            return;
        }
        
        // 先显示调色板以计算尺寸
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
        
        console.log('✅ 调色板已显示，位置:', top, left);
    }

    function hideSharedPalette() {
        const palette = document.getElementById('sharedColorPalette');
        if (palette) {
            palette.setAttribute('aria-hidden', 'true');
            palette.style.setProperty('display', 'none', 'important');
            console.log('✅ 调色板已隐藏');
        }
    }

    // 颜色切换按钮点击事件
    const contentToolbarForColor = document.getElementById('contentToolbar');
    const colorToggle = contentToolbarForColor?.querySelector('.color-toggle');
    if (colorToggle && !colorToggle._colorToggleBound) {
        const clickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🎨 颜色切换按钮被点击');
            
            const editor = document.getElementById('noteContent');
            if (editor) {
                // 保存当前选择
                if (window.getSelection && window.getSelection().rangeCount > 0) {
                    savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
                    savedSelectionEditor = editor;
                    console.log('✅ 已保存选择范围');
                }
                activeEditor = editor;
                editor.focus();
                showSharedPalette(this);
            } else {
                console.error('❌ noteContent 编辑器未找到！');
            }
        };
        
        colorToggle.addEventListener('click', clickHandler);
        colorToggle._colorToggleBound = true;
        colorToggle._clickHandler = clickHandler;
        console.log('✅ 颜色切换按钮事件已绑定');
    }

    // 点击其他地方关闭调色板
    if (!document._readingPaletteCloseBound) {
        document.addEventListener('click', function(e) {
            setTimeout(function() {
                const palette = document.getElementById('sharedColorPalette');
                if (!palette || palette.style.display === 'none') return;
                
                // 如果点击的不是调色板内部，也不是颜色按钮，则关闭
                if (!e.target.closest('#sharedColorPalette') && !e.target.closest('.color-toggle')) {
                    hideSharedPalette();
                }
            }, 0);
        });
        document._readingPaletteCloseBound = true;
        console.log('✅ 调色板关闭处理器已绑定');
    }

    // 浮动工具栏功能
    const floatingToolbar = document.getElementById('floatingToolbar');
    let floatingToolbarTimeout = null;

    function showFloatingToolbar() {
        if (!floatingToolbar) return;
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
            hideFloatingToolbar();
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // 计算工具栏位置（在选中文本上方）
        let top = rect.top - 45; // 工具栏高度 + 间距
        let left = rect.left + (rect.width / 2) - (floatingToolbar.offsetWidth / 2);
        
        // 防止超出屏幕边界
        if (left < 10) left = 10;
        if (left + floatingToolbar.offsetWidth > window.innerWidth - 10) {
            left = window.innerWidth - floatingToolbar.offsetWidth - 10;
        }
        if (top < 10) {
            // 如果上方空间不足，显示在下方
            top = rect.bottom + 5;
        }
        
        floatingToolbar.style.top = `${top}px`;
        floatingToolbar.style.left = `${left}px`;
        floatingToolbar.style.display = 'flex';
    }

    function hideFloatingToolbar() {
        if (floatingToolbar) {
            floatingToolbar.style.display = 'none';
        }
    }

    // 监听文本选择事件
    if (contentEditor && !contentEditor._floatingToolbarBound) {
        // 鼠标选择
        contentEditor.addEventListener('mouseup', function() {
            clearTimeout(floatingToolbarTimeout);
            floatingToolbarTimeout = setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.toString().trim() !== '') {
                    showFloatingToolbar();
                } else {
                    hideFloatingToolbar();
                }
            }, 100);
        });

        // 键盘选择
        contentEditor.addEventListener('keyup', function(e) {
            // 如果是Shift+方向键选择
            if (e.shiftKey && (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End')) {
                clearTimeout(floatingToolbarTimeout);
                floatingToolbarTimeout = setTimeout(() => {
                    const selection = window.getSelection();
                    if (selection && selection.toString().trim() !== '') {
                        showFloatingToolbar();
                    } else {
                        hideFloatingToolbar();
                    }
                }, 100);
            }
        });

        // 点击其他地方隐藏工具栏
        document.addEventListener('click', function(e) {
            if (!floatingToolbar.contains(e.target) && !contentEditor.contains(e.target)) {
                hideFloatingToolbar();
            }
        });

        // 浮动工具栏按钮事件
        const floatingButtons = floatingToolbar.querySelectorAll('.editor-btn[data-command]');
        floatingButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const command = btn.dataset.command;
                contentEditor.focus();
                
                // 恢复选择
                const selection = window.getSelection();
                if (selection.rangeCount === 0 && savedSelectionRange) {
                    selection.removeAllRanges();
                    selection.addRange(savedSelectionRange);
                }
                
                document.execCommand(command, false, null);
                contentEditor.focus();
            });
        });

        // 浮动工具栏颜色按钮
        const floatingColorToggle = document.getElementById('floatingColorToggle');
        if (floatingColorToggle) {
            floatingColorToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                contentEditor.focus();
                
                // 恢复选择
                if (window.getSelection && window.getSelection().rangeCount > 0) {
                    savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
                    savedSelectionEditor = contentEditor;
                }
                activeEditor = contentEditor;
                showSharedPalette(this);
            });
        }

        contentEditor._floatingToolbarBound = true;
        console.log('✅ 浮动工具栏功能已初始化');
    }
     
    // Check if already initialized - but allow re-initialization if flag is explicitly reset
    if (addNoteToSelectionBtn._contentNoteInitialized) {
        console.log('⚠️ Content notes already initialized, removing old handlers and re-initializing...');
        // Remove old handlers if they exist
        const contentToolbar = document.getElementById('contentToolbar');
        if (contentToolbar && contentToolbar._addNoteHandler) {
            contentToolbar.removeEventListener('click', contentToolbar._addNoteHandler, true);
            contentToolbar._addNoteHandler = null;
        }
        // Reset flag to allow re-initialization
        addNoteToSelectionBtn._contentNoteInitialized = false;
    }
    
    console.log('✅ 所有必需元素都已找到，开始初始化...');
    
    // ========== 添加到生词本功能 ==========
    const VOCABULARY_STORAGE_KEY = 'vocabularyReadingWords';
    
    // 获取选中单词所在的句子（查找单词前后的句号位置）
    function getSentenceContainingWord(range, word) {
        try {
            if (!range || !word) {
                return '';
            }
            
            const editor = document.getElementById('noteContent');
            if (!editor) return '';
            
            // 获取编辑器中的所有纯文本（去除HTML标签）
            const editorText = editor.textContent || editor.innerText || '';
            
            if (!word || !editorText) return '';
            
            // 计算选中单词在编辑器文本中的位置
            let selectedIndex = -1;
            try {
                // 创建一个从编辑器开始到选择开始的Range来计算字符偏移量
                const startRange = document.createRange();
                startRange.setStart(editor, 0);
                startRange.setEnd(range.startContainer, range.startOffset);
                selectedIndex = startRange.toString().length;
            } catch (e) {
                console.error('❌ 计算选择位置失败:', e);
                return '';
            }
            
            const wordStartIndex = selectedIndex;
            
            // 向前查找：找到单词前最近的句号位置
            const textBefore = editorText.substring(0, wordStartIndex);
            const lastPeriodIndex = textBefore.lastIndexOf('.');
            
            // 向后查找：找到单词后最近的句号位置
            const textAfter = editorText.substring(wordStartIndex);
            const nextPeriodIndex = textAfter.indexOf('.');
            
            // 确定句子开始位置
            let sentenceStart = 0;
            if (lastPeriodIndex !== -1) {
                // 找到句号，句子从句号后开始（跳过句号和后面的空格/换行）
                sentenceStart = lastPeriodIndex + 1;
                // 跳过后面的空格和换行
                while (sentenceStart < textBefore.length && 
                       (editorText[sentenceStart] === ' ' || 
                        editorText[sentenceStart] === '\n' || 
                        editorText[sentenceStart] === '\r' || 
                        editorText[sentenceStart] === '\t')) {
                    sentenceStart++;
                }
            }
            // 如果没有找到句号，从文本开始（sentenceStart保持为0）
            
            // 确定句子结束位置
            let sentenceEnd = editorText.length;
            if (nextPeriodIndex !== -1) {
                // 找到句号，句子到句号结束（包括句号）
                sentenceEnd = wordStartIndex + nextPeriodIndex + 1;
            }
            // 如果没有找到句号，到文本结束（sentenceEnd保持为editorText.length）
            
            // 提取完整的句子
            const sentence = editorText.substring(sentenceStart, sentenceEnd).trim();
            
            // 清理句子（移除多余的空白字符，但保留单个空格）
            const cleanedSentence = sentence.replace(/\s+/g, ' ').trim();
            
            console.log('✅ 提取的句子:', cleanedSentence);
            return cleanedSentence;
        } catch (error) {
            console.error('❌ 获取句子失败:', error);
            return '';
        }
    }
    
    // 打开添加到生词本模态框
    function openAddVocabularyModal(word, range) {
        const modal = document.getElementById('addVocabularyModal');
        const wordInput = document.getElementById('vocabWord');
        const definitionInput = document.getElementById('vocabDefinition');
        const exampleInput = document.getElementById('vocabExample');
        
        if (!modal || !wordInput) {
            console.error('❌ 添加到生词本模态框元素未找到');
            return;
        }
        
        // 设置单词（只读）
        wordInput.value = word;
        if (definitionInput) definitionInput.value = '';
        
        // 自动识别并填入例句
        let exampleSentence = '';
        if (range) {
            exampleSentence = getSentenceContainingWord(range, word);
            console.log('📝 提取的例句:', exampleSentence);
        }
        if (exampleInput) {
            exampleInput.value = exampleSentence;
        }
        
        // 显示模态框
        modal.style.display = 'flex';
    }
    
    // 关闭添加到生词本模态框
    function closeAddVocabularyModal() {
        const modal = document.getElementById('addVocabularyModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // 保存单词到生词本
    function saveWordToVocabulary(word, definition, example) {
        try {
            // 加载现有单词
            let words = [];
            const stored = localStorage.getItem(VOCABULARY_STORAGE_KEY);
            if (stored) {
                words = JSON.parse(stored);
            }
            
            // 检查单词是否已存在
            const existingWord = words.find(w => w.word.toLowerCase() === word.toLowerCase());
            if (existingWord) {
                // 如果已存在，更新释义和例句（如果提供了新的）
                if (definition && definition.trim()) {
                    existingWord.definition = definition.trim();
                }
                if (example && example.trim()) {
                    existingWord.example = example.trim();
                }
                existingWord.updatedAt = new Date().toISOString();
            } else {
                // 创建新单词对象
                const newWord = {
                    id: 'vocab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    word: word.trim(),
                    definition: definition ? definition.trim() : '',
                    example: example ? example.trim() : '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                words.push(newWord);
            }
            
            // 保存到localStorage
            localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(words));
            console.log('✅ 单词已保存到生词本:', word);
            
            // 在编辑器中标记已保存的单词
            markWordAsVocabulary(word, definition, example);
            
            return true;
        } catch (error) {
            console.error('❌ 保存单词到生词本失败:', error);
            alert('Failed to save word to vocabulary. Please try again.');
            return false;
        }
    }
    
    // 绑定添加到生词本模态框事件
    const vocabularyForm = document.getElementById('vocabularyForm');
    const closeVocabularyModalBtn = document.getElementById('closeVocabularyModal');
    
    if (vocabularyForm) {
        vocabularyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const word = document.getElementById('vocabWord').value.trim();
            const definition = document.getElementById('vocabDefinition').value.trim();
            const example = document.getElementById('vocabExample').value.trim();
            
            if (!word) {
                alert('Word is required');
                return;
            }
            
            if (saveWordToVocabulary(word, definition, example)) {
                closeAddVocabularyModal();
            }
        });
    }
    
    if (closeVocabularyModalBtn) {
        closeVocabularyModalBtn.addEventListener('click', closeAddVocabularyModal);
    }
    
    // 注意：Cancel按钮已从HTML中移除，不再需要此事件监听器
    
    // 点击模态框外部关闭
    const addVocabularyModal = document.getElementById('addVocabularyModal');
    if (addVocabularyModal) {
        addVocabularyModal.addEventListener('click', function(e) {
            if (e.target === addVocabularyModal) {
                closeAddVocabularyModal();
            }
        });
    }
    
    // 在指定元素中标记已保存的单词
    function markWordAsVocabularyInElement(element, word, definition, example) {
        if (!element) return;
        
        // 查找所有文本节点，找到匹配的单词
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // 跳过已经在vocabulary marker中的文本节点
                    if (node.parentElement && node.parentElement.classList.contains('vocabulary-word-marker')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // 允许在content-note-marker中标记单词（不跳过）
                    // 这样单词tooltip可以显示在笔记tooltip之上
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        // 在文本节点中查找单词（不区分大小写，支持常见词形变化）
        const wordRegex = window.createVocabularyWordRegex ? 
            window.createVocabularyWordRegex(word) : 
            new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        
        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const matches = [...text.matchAll(wordRegex)];
            
            if (matches.length > 0) {
                // 创建文档片段
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                
                matches.forEach(match => {
                    // 添加匹配前的文本
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                    }
                    
                    // 创建vocabulary marker
                    const span = document.createElement('span');
                    span.className = 'vocabulary-word-marker';
                    span.setAttribute('data-vocab-word', word.toLowerCase());
                    span.setAttribute('data-vocab-definition', definition || '');
                    span.setAttribute('data-vocab-example', example || '');
                    // 移除默认的title属性，避免显示浏览器默认的问号tooltip
                    span.removeAttribute('title');
                    // 设置aria-label为空，避免屏幕阅读器显示tooltip
                    span.setAttribute('aria-label', '');
                    span.textContent = match[0];
                    fragment.appendChild(span);
                    
                    lastIndex = match.index + match[0].length;
                });
                
                // 添加剩余的文本
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                }
                
                // 替换文本节点
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        });
    }
    
    // 在编辑器中标记已保存的单词（单个单词）
    function markWordAsVocabulary(word, definition, example) {
        const editor = document.getElementById('noteContent');
        if (typeof window.markWordAsVocabularyInElement === 'function') {
            window.markWordAsVocabularyInElement(editor, word, definition, example);
            
            // 初始化vocabulary tooltips（延迟一点，确保DOM更新完成）
            setTimeout(() => {
                console.log('🔵 markWordAsVocabulary: 准备初始化tooltips');
                if (typeof window.initVocabularyTooltips === 'function') {
                    window.initVocabularyTooltips();
                } else {
                    console.error('❌ initVocabularyTooltips不是函数！');
                }
            }, 50);
        } else {
            console.error('❌ markWordAsVocabularyInElement不是函数！');
        }
    }
    
    // 注意：vocabulary相关全局函数已移到 initContentNotes() 外部（在文件末尾），确保在查看模式下也可访问
    
    // 创建vocabulary tooltip元素（本地函数，仅在initContentNotes内部使用）
    function createVocabularyTooltip() {
        const tooltip = document.createElement('div');
        tooltip.id = 'vocabularyTooltip';
        tooltip.className = 'vocabulary-tooltip';
        document.body.appendChild(tooltip);
        return tooltip;
    }
    
    // 页面加载时初始化已存在的vocabulary markers
    setTimeout(() => {
        if (typeof window.initVocabularyTooltips === 'function') {
            window.initVocabularyTooltips();
        }
    }, 500);
    
    console.log('✅ 添加到生词本功能已初始化');
    
    let currentSelectionRange = null;
    let currentSelectedText = '';
    let currentEditingNoteId = null; // 当前正在编辑的 note ID
    let tooltipElement = null; // 动态创建的 tooltip 元素
    let activeTooltipNoteId = null; // 当前显示的 tooltip 对应的 note ID
    let pinnedTooltipNoteId = null; // 当前固定显示的 tooltip 对应的 note ID（点击后固定）
    
    // Add note to selected text
    console.log('✅ 绑定 Add Note 按钮事件');
    
    // Use event delegation on the toolbar to avoid conflicts
    // Use capture phase to ensure our handler runs first
    const contentToolbar = document.getElementById('contentToolbar');
    if (contentToolbar) {
        // Remove old handler if exists
        if (contentToolbar._addNoteHandler) {
            contentToolbar.removeEventListener('click', contentToolbar._addNoteHandler, true);
        }
        
        contentToolbar._addNoteHandler = function(e) {
            // 首先检查是否是格式化按钮（加粗、斜体、下划线等）
            const formatBtn = e.target.closest('.editor-btn[data-command]');
            if (formatBtn) {
                // 排除颜色按钮和格式化段落按钮，它们有单独的处理
                if (formatBtn.classList.contains('color-toggle') || formatBtn.id === 'formatParagraphsBtn') {
                    return; // 让这些按钮的事件处理
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                const command = formatBtn.getAttribute('data-command');
                const editor = document.getElementById('noteContent');
                
                if (editor && command) {
                    editor.focus();
                    document.execCommand(command, false, null);
                    console.log('✅ 格式化命令执行:', command);
                }
                return;
            }
            
            // 检查是否是"添加到生词本"按钮
            const addVocabBtn = e.target.closest('#addToVocabulary');
            if (addVocabBtn || e.target.id === 'addToVocabulary') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
                    alert('Please select a word first');
                    return;
                }
                
                const selectedText = selection.toString().trim();
                // 只允许单个单词（不包含空格）
                if (selectedText.includes(' ') || selectedText.includes('\n')) {
                    alert('Please select only a single word');
                    return;
                }
                
                // 保存当前选择范围（在点击按钮时，选择可能已经丢失，需要立即保存）
                const range = selection.getRangeAt(0).cloneRange();
                
                // 打开添加到生词本模态框，传递选择范围和单词以便提取句子
                openAddVocabularyModal(selectedText, range);
                return false;
            }
            
            // Check if the clicked element is the Add Note button or its child
            const addNoteBtn = e.target.closest('#addNoteToSelection');
            if (addNoteBtn || e.target.id === 'addNoteToSelection') {
                console.log('🟢 Add Note 按钮被点击 (通过工具栏事件委托)');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
                    alert('Please select some text first');
                    return;
                }
                
                const range = selection.getRangeAt(0);
                const selectedText = selection.toString().trim();
                
                if (!selectedText) {
                    alert('Please select some text to add a note');
                    return;
                }
                
                // Save selection for later use
                currentSelectionRange = range.cloneRange();
                currentSelectedText = selectedText;
                
                // Show selected text in preview
                if (selectedTextPreview) {
                    selectedTextPreview.textContent = selectedText;
                    selectedTextPreview.style.fontStyle = 'normal';
                    selectedTextPreview.style.color = 'var(--text-dark)';
                }
                
                // Clear note input
                if (noteTextInput) {
                    noteTextInput.value = '';
                }
                
                // Reset edit mode
                currentEditingNoteId = null;
                
                // Update modal title
                const modalTitle = addContentNoteModal.querySelector('h3');
                if (modalTitle) {
                    modalTitle.textContent = 'Add Note to Selected Text';
                }
                
                // Show modal
                addContentNoteModal.style.display = 'block';
                console.log('✅ Add Note 模态框已显示');
                return false; // Prevent further propagation
            }
        };
        
        // Use capture phase to ensure our handler runs first
        contentToolbar.addEventListener('click', contentToolbar._addNoteHandler, true);
        console.log('✅ 工具栏事件委托已绑定 (capture phase)');
    } else {
        // Fallback: direct event listener
        addNoteToSelectionBtn.addEventListener('click', function(e) {
            console.log('🟢 Add Note 按钮被点击 (直接事件)');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
                alert('Please select some text first');
                return;
            }
            
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString().trim();
            
            if (!selectedText) {
                alert('Please select some text to add a note');
                return;
            }
            
            // Save selection for later use
            currentSelectionRange = range.cloneRange();
            currentSelectedText = selectedText;
            
            // Show selected text in preview
            if (selectedTextPreview) {
                selectedTextPreview.textContent = selectedText;
                selectedTextPreview.style.fontStyle = 'normal';
                selectedTextPreview.style.color = 'var(--text-dark)';
            }
            
            // Clear note input
            if (noteTextInput) {
                noteTextInput.value = '';
            }
            
            // Reset edit mode
            currentEditingNoteId = null;
            
            // Update modal title
            const modalTitle = addContentNoteModal.querySelector('h3');
            if (modalTitle) {
                modalTitle.textContent = 'Add Note to Selected Text';
            }
            
            // Show modal
            addContentNoteModal.style.display = 'block';
            console.log('✅ Add Note 模态框已显示');
        });
    }
    
    // Helper function to restore tooltip to hover mode when modal closes
    function restoreTooltipToHoverMode() {
        // Restore tooltip z-index
        if (tooltipElement && tooltipElement.style.display === 'block') {
            tooltipElement.style.zIndex = '9999'; // Restore to normal z-index (above other modals)
        }
        // Unpin tooltip and hide it (will show again on hover)
        pinnedTooltipNoteId = null;
        if (tooltipElement) {
            tooltipElement.style.display = 'none';
        }
        activeTooltipNoteId = null;
    }
    
    // Close modal handlers
    if (closeAddContentNoteModal) {
        closeAddContentNoteModal.addEventListener('click', function() {
            addContentNoteModal.style.display = 'none';
            currentSelectionRange = null;
            currentSelectedText = '';
            currentEditingNoteId = null;
            restoreTooltipToHoverMode();
        });
    }
    
    if (addContentNoteModal) {
        addContentNoteModal.addEventListener('click', function(e) {
            if (e.target === addContentNoteModal) {
                addContentNoteModal.style.display = 'none';
                currentSelectionRange = null;
                currentSelectedText = '';
                currentEditingNoteId = null;
                restoreTooltipToHoverMode();
            }
        });
    }
    
    // Save note
    if (saveContentNoteBtn && noteTextInput) {
        saveContentNoteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const noteText = noteTextInput.value.trim();
            if (!noteText) {
                alert('Please enter a note');
                return;
            }
            
            // Edit mode: update existing note
            if (currentEditingNoteId && contentNotes[currentEditingNoteId]) {
                // Update note content
                contentNotes[currentEditingNoteId].note = noteText;
                
                // Update marker's tooltip (if using title attribute)
                const marker = contentEditor.querySelector(`[data-note-id="${currentEditingNoteId}"]`);
                if (marker) {
                    marker.removeAttribute('title'); // Remove title since we use custom tooltip
                }
                
                // Update tooltip content if it's currently showing
                if (tooltipElement && tooltipElement.style.display === 'block' && activeTooltipNoteId === currentEditingNoteId) {
                    const textContent = tooltipElement.querySelector('.tooltip-text');
                    if (textContent) {
                        textContent.textContent = noteText;
                    }
                }
                
                // Close modal
                addContentNoteModal.style.display = 'none';
                
                // Reset edit mode
                const editedNoteId = currentEditingNoteId;
                currentEditingNoteId = null;
                currentSelectionRange = null;
                currentSelectedText = '';
                
                // Restore tooltip to hover mode
                restoreTooltipToHoverMode();
                
                // Re-initialize tooltips to reflect changes
                setTimeout(() => {
                    initTooltips();
                }, 100);
                
                console.log('✅ Note updated:', editedNoteId);
                return;
            }
            
            // Add mode: create new note
            if (!currentSelectionRange) {
                alert('Selection lost. Please select text again.');
                addContentNoteModal.style.display = 'none';
                return;
            }
            
            // Generate unique ID for this note
            const noteId = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Store note data
            contentNotes[noteId] = {
                text: currentSelectedText,
                note: noteText
            };
            
            // Restore selection
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(currentSelectionRange);
            
            // Wrap selected text with note marker
            const span = document.createElement('span');
            span.className = 'content-note-marker';
            span.setAttribute('data-note-id', noteId);
            
            try {
                currentSelectionRange.surroundContents(span);
            } catch (e) {
                // If surroundContents fails, try a different approach
                const contents = currentSelectionRange.extractContents();
                span.appendChild(contents);
                currentSelectionRange.insertNode(span);
            }
            
            // Clear selection
            selection.removeAllRanges();
            
            // Close modal
            addContentNoteModal.style.display = 'none';
            currentSelectionRange = null;
            currentSelectedText = '';
            restoreTooltipToHoverMode();
            
            // Re-initialize tooltips to include new note
            setTimeout(initTooltips, 100);
            
            console.log('✅ Note added to selected text:', noteId);
        });
    }
    
    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && addContentNoteModal.style.display === 'block') {
            addContentNoteModal.style.display = 'none';
            currentSelectionRange = null;
            currentSelectedText = '';
            currentEditingNoteId = null;
            restoreTooltipToHoverMode();
        }
    });
    
    // Create dynamic tooltip element
    function createTooltipElement() {
        if (tooltipElement) {
            return tooltipElement;
        }
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'content-note-tooltip';
        tooltipElement.style.cssText = `
            position: fixed !important;
            background: #1F2937 !important;
            color: white !important;
            border-radius: 8px !important;
            font-size: 0.875rem !important;
            white-space: normal !important;
            max-width: 400px !important;
            z-index: 9999 !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            pointer-events: auto !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.5 !important;
            text-align: left !important;
            display: none !important;
            box-sizing: border-box !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        // Create tooltip content container with flex layout
        const tooltipContent = document.createElement('div');
        tooltipContent.className = 'tooltip-content-wrapper';
        tooltipContent.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
        `;
        
        // Create text content area
        const textContent = document.createElement('div');
        textContent.className = 'tooltip-text';
        textContent.style.cssText = `
            flex: 1;
            min-width: 0;
        `;
        
        // Create edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'tooltip-edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.style.cssText = `
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.875rem;
            transition: background 0.2s ease;
            padding: 0;
        `;
        editBtn.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        editBtn.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        
        tooltipContent.appendChild(textContent);
        tooltipContent.appendChild(editBtn);
        tooltipElement.appendChild(tooltipContent);
        
        document.body.appendChild(tooltipElement);
        
        return tooltipElement;
    }
    
    // Show tooltip for a note marker
    function showTooltip(marker, noteId) {
        console.log('🔵 showTooltip called for noteId:', noteId);
        console.log('🔵 contentNotes[noteId]:', contentNotes[noteId]);
        
        if (!contentNotes[noteId]) {
            console.warn('⚠️ No content note found for noteId:', noteId);
            return;
        }
        
        const tooltip = createTooltipElement();
        const tooltipContentWrapper = tooltip.querySelector('.tooltip-content-wrapper');
        const textContent = tooltip.querySelector('.tooltip-text');
        const editBtn = tooltip.querySelector('.tooltip-edit-btn');
        
        console.log('🔵 tooltip:', tooltip);
        console.log('🔵 textContent:', textContent);
        console.log('🔵 editBtn:', editBtn);
        
        if (!textContent) {
            console.error('❌ tooltip-text element not found!');
            return;
        }
        
        // Set text content
        const noteText = contentNotes[noteId].note || '';
        textContent.textContent = noteText;
        console.log('✅ Tooltip text set:', noteText);
        
        // Position tooltip
        // 使用Range API获取选中文本的实际位置，而不是marker元素的边界框
        // 这样可以更准确地定位tooltip，特别是当marker跨越多行时
        let rect;
        let markerCenter;
        
        // 尝试从marker中创建一个Range来获取文本的实际位置
        try {
            const range = document.createRange();
            range.selectNodeContents(marker);
            // 获取Range的边界框（这会更准确地反映文本的实际位置）
            const rangeRects = range.getClientRects();
            
            if (rangeRects.length > 0) {
                // 如果有多个矩形（跨越多行），使用第一个矩形的位置（文本开始位置）
                // 这样可以确保tooltip显示在选中文本的开始位置上方
                if (rangeRects.length === 1) {
                    rect = rangeRects[0];
                    markerCenter = rect.left + rect.width / 2;
                } else {
                    // 跨越多行：使用第一个矩形的位置（文本开始位置）
                    // 这样tooltip会显示在选中文本的第一行上方
                    rect = rangeRects[0];
                    markerCenter = rect.left + rect.width / 2;
                }
            } else {
                // 如果Range没有返回矩形，回退到marker的getBoundingClientRect
                rect = marker.getBoundingClientRect();
                markerCenter = rect.left + rect.width / 2;
            }
        } catch (e) {
            // 如果Range API失败，回退到marker的getBoundingClientRect
            rect = marker.getBoundingClientRect();
            markerCenter = rect.left + rect.width / 2;
        }
        
        console.log('📍 Marker rect:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
        
        // 先显示tooltip以获取其尺寸（但先隐藏）
        tooltip.style.display = 'block';
        tooltip.style.visibility = 'hidden';
        const tooltipRect = tooltip.getBoundingClientRect();
        console.log('📍 Tooltip rect:', { width: tooltipRect.width, height: tooltipRect.height });
        
        // 水平定位策略（按顺序尝试）
        let left;
        const tooltipHalfWidth = tooltipRect.width / 2;
        
        console.log('📍 定位计算:', { 
            markerCenter, 
            tooltipHalfWidth, 
            screenWidth: window.innerWidth,
            markerLeft: rect.left,
            markerRight: rect.right
        });
        
        // a. 首选：将tooltip的中心与目标语段的中心水平对齐
        left = markerCenter;
        console.log('📍 步骤a - 中心对齐:', left);
        
        // b. 如果左侧超出屏幕：将tooltip的左边缘对齐到屏幕左边缘 + 10px边距
        if (left - tooltipHalfWidth < 10) {
            left = 10 + tooltipHalfWidth;
            console.log('📍 步骤b - 左侧超出，调整到:', left);
        }
        
        // c. 如果右侧超出屏幕：将tooltip的右边缘对齐到屏幕右边缘 - 10px边距
        if (left + tooltipHalfWidth > window.innerWidth - 10) {
            left = window.innerWidth - 10 - tooltipHalfWidth;
            console.log('📍 步骤c - 右侧超出，调整到:', left);
        }
        
        console.log('📍 最终left位置:', left);
        
        // 垂直定位
        let top = rect.top - 10;
        
        // 调整垂直位置，如果上方空间不足，显示在下方
        let transformValue;
        if (top - tooltipRect.height < 10) {
            top = rect.bottom + 10;
            transformValue = 'translate(-50%, 0)';
            // 调整箭头方向
            let arrow = tooltip.querySelector('.tooltip-arrow');
            if (arrow) {
                arrow.style.top = '-8px';
                arrow.style.bottom = 'auto';
                arrow.style.borderBottom = '8px solid var(--text-dark)';
                arrow.style.borderTop = 'none';
            }
        } else {
            transformValue = 'translate(-50%, -100%)';
            // 调整箭头方向
            let arrow = tooltip.querySelector('.tooltip-arrow');
            if (arrow) {
                arrow.style.top = 'auto';
                arrow.style.bottom = '-8px';
                arrow.style.borderTop = '8px solid var(--text-dark)';
                arrow.style.borderBottom = 'none';
            }
        }
        
        // 确保使用!important覆盖任何可能的CSS样式
        tooltip.style.setProperty('left', left + 'px', 'important');
        tooltip.style.setProperty('top', top + 'px', 'important');
        tooltip.style.setProperty('transform', transformValue, 'important');
        tooltip.style.setProperty('visibility', 'visible', 'important');
        tooltip.style.setProperty('opacity', '1', 'important');
        tooltip.style.setProperty('z-index', '9999', 'important');
        tooltip.style.setProperty('position', 'fixed', 'important');
        
        // 验证最终位置（在visibility变为visible后）
        setTimeout(() => {
            const finalRect = tooltip.getBoundingClientRect();
            const finalCenter = finalRect.left + finalRect.width / 2;
            console.log('📍 最终tooltip位置验证:', { 
                left: finalRect.left, 
                top: finalRect.top, 
                center: finalCenter,
                markerCenter: markerCenter,
                diff: Math.abs(finalCenter - markerCenter),
                markerRect: { left: rect.left, right: rect.right, width: rect.width }
            });
        }, 0);
        
        console.log('✅ Tooltip display set to block');
        console.log('✅ Tooltip position:', tooltip.style.left, tooltip.style.top);
        console.log('✅ Tooltip transform:', tooltip.style.transform);
        console.log('✅ Tooltip z-index:', tooltip.style.zIndex);
        console.log('✅ Tooltip in DOM:', document.body.contains(tooltip));
        
        // Cancel any pending hide
        cancelHideTooltip();
        
        // Re-attach event listeners to tooltip (in case it was recreated)
        if (tooltipElement) {
            if (tooltipElement._mouseEnterHandler) {
                tooltipElement.removeEventListener('mouseenter', tooltipElement._mouseEnterHandler);
            }
            if (tooltipElement._mouseLeaveHandler) {
                tooltipElement.removeEventListener('mouseleave', tooltipElement._mouseLeaveHandler);
            }
            
            tooltipElement._mouseEnterHandler = function() {
                console.log('🟢 Mouse enter tooltip');
                cancelHideTooltip();
            };
            
            tooltipElement._mouseLeaveHandler = function(e) {
                console.log('🔴 Mouse leave tooltip');
                // Only hide tooltip if it's not pinned
                if (pinnedTooltipNoteId !== activeTooltipNoteId) {
                    // Check if mouse is moving back to marker
                    const relatedTarget = e.relatedTarget;
                    if (relatedTarget && relatedTarget.classList.contains('content-note-marker')) {
                        // Mouse is moving back to marker, keep tooltip visible
                        console.log('✅ Mouse moving back to marker, keeping tooltip visible');
                        return;
                    }
                    // Hide tooltip if not pinned
                    hideTooltip();
                    activeTooltipNoteId = null;
                }
            };
            
            tooltipElement.addEventListener('mouseenter', tooltipElement._mouseEnterHandler);
            tooltipElement.addEventListener('mouseleave', tooltipElement._mouseLeaveHandler);
        }
        
        console.log('✅ Tooltip positioned at:', tooltip.style.left, tooltip.style.top);
        console.log('✅ Tooltip content:', textContent.textContent);
        
        // Add arrow if not exists
        let arrow = tooltip.querySelector('.tooltip-arrow');
        if (!arrow) {
            arrow = document.createElement('div');
            arrow.className = 'tooltip-arrow';
            arrow.style.cssText = `
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid #1F2937;
            `;
            tooltip.appendChild(arrow);
        }
        
        // Edit button click handler
        if (editBtn) {
            editBtn.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log('🟢 Edit button clicked for noteId:', noteId);
                
                currentEditingNoteId = noteId;
                
                // Populate edit modal
                if (selectedTextPreview) {
                    selectedTextPreview.textContent = contentNotes[noteId].text;
                    selectedTextPreview.style.fontStyle = 'normal';
                    selectedTextPreview.style.color = 'var(--text-dark)';
                }
                if (noteTextInput) {
                    noteTextInput.value = contentNotes[noteId].note;
                }
                
                // Update modal title
                const modalTitle = addContentNoteModal.querySelector('h3');
                if (modalTitle) {
                    modalTitle.textContent = 'Edit Note';
                }
                
                // Show modal
                addContentNoteModal.style.display = 'block';
                
                // Lower tooltip z-index when edit note modal is shown (so it appears below modal)
                if (tooltipElement && tooltipElement.style.display === 'block') {
                    tooltipElement.style.zIndex = '1998'; // Below modal (z-index: 2000)
                }
            };
        }
        
        console.log('✅ Tooltip displayed');
    }
    
    // Hide tooltip
    function hideTooltip() {
        if (tooltipElement) {
            tooltipElement.style.display = 'none';
        }
    }
    
    // Hide tooltip with delay to allow mouse movement to tooltip
    let hideTooltipTimeout = null;
    function hideTooltipDelayed() {
        // Clear any existing timeout
        if (hideTooltipTimeout) {
            clearTimeout(hideTooltipTimeout);
        }
        // Set a delay before hiding
        hideTooltipTimeout = setTimeout(() => {
            // Check if mouse is still over marker or tooltip
            const tooltip = document.querySelector('.content-note-tooltip');
            const marker = document.querySelector('.content-note-marker:hover');
            if (!tooltip || tooltip.style.display === 'none') {
                return;
            }
            // Only hide if mouse is not over tooltip
            if (!tooltip.matches(':hover')) {
                hideTooltip();
            }
        }, 100); // 100ms delay
    }
    
    function cancelHideTooltip() {
        if (hideTooltipTimeout) {
            clearTimeout(hideTooltipTimeout);
            hideTooltipTimeout = null;
        }
    }
    
    // Initialize tooltips for existing notes when content is loaded
    function initTooltips() {
        console.log('🔵 initTooltips called');
        const noteMarkers = contentEditor.querySelectorAll('.content-note-marker');
        console.log('🔵 Found', noteMarkers.length, 'note markers');
        
        noteMarkers.forEach((marker, index) => {
            const noteId = marker.getAttribute('data-note-id');
            console.log(`🔵 Marker ${index}: noteId=${noteId}, hasContentNote=${!!contentNotes[noteId]}`);
            
            if (noteId && contentNotes[noteId]) {
                // Remove title attribute (we'll use custom tooltip)
                marker.removeAttribute('title');
                
                // Clone marker to remove old event listeners
                const newMarker = marker.cloneNode(true);
                marker.parentNode.replaceChild(newMarker, marker);
                
                // Add hover event listeners for normal hover behavior
                newMarker.addEventListener('mouseenter', function() {
                    console.log('🟢 Mouse enter marker, noteId:', noteId);
                    // Only show tooltip on hover if it's not pinned
                    if (pinnedTooltipNoteId !== noteId) {
                        cancelHideTooltip(); // Cancel any pending hide
                        showTooltip(newMarker, noteId);
                        activeTooltipNoteId = noteId;
                    }
                });
                
                newMarker.addEventListener('mouseleave', function(e) {
                    console.log('🔴 Mouse leave marker, noteId:', noteId);
                    // Only hide tooltip if it's not pinned
                    if (pinnedTooltipNoteId !== noteId) {
                        // Check if mouse is moving to tooltip
                        const tooltip = document.querySelector('.content-note-tooltip');
                        if (tooltip) {
                            const relatedTarget = e.relatedTarget;
                            // Check if mouse is moving to tooltip
                            if (relatedTarget && (relatedTarget === tooltip || tooltip.contains(relatedTarget))) {
                                // Mouse is moving to tooltip, keep it visible
                                console.log('✅ Mouse moving to tooltip, keeping it visible');
                                return;
                            }
                            // Use a small delay to allow mouse to reach tooltip
                            setTimeout(() => {
                                // Check if mouse is now over tooltip
                                const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
                                if (elementUnderMouse && (elementUnderMouse === tooltip || tooltip.contains(elementUnderMouse))) {
                                    console.log('✅ Mouse reached tooltip, keeping it visible');
                                    return;
                                }
                                // Mouse didn't reach tooltip, hide it
                                hideTooltip();
                                activeTooltipNoteId = null;
                            }, 150);
                        } else {
                            hideTooltip();
                            activeTooltipNoteId = null;
                        }
                    }
                });
                
                // Add click event listener to pin/unpin tooltip
                newMarker.addEventListener('click', function(e) {
                    e.stopPropagation();
                    console.log('🟢 Click marker, noteId:', noteId);
                    
                    // If this tooltip is already pinned, unpin it
                    if (pinnedTooltipNoteId === noteId) {
                        pinnedTooltipNoteId = null;
                        // Hide tooltip, it will show again on hover
                        hideTooltip();
                        activeTooltipNoteId = null;
                        return;
                    }
                    
                    // Pin this tooltip (unpin any other pinned tooltip)
                    if (pinnedTooltipNoteId && pinnedTooltipNoteId !== noteId) {
                        pinnedTooltipNoteId = null;
                        hideTooltip();
                    }
                    
                    // Show and pin this tooltip
                    showTooltip(newMarker, noteId);
                    activeTooltipNoteId = noteId;
                    pinnedTooltipNoteId = noteId;
                });
                
                console.log('✅ Event listeners added for marker', noteId);
            } else {
                console.warn('⚠️ Marker', noteId, 'has no content note');
            }
        });
        
        // Also hide tooltip when mouse leaves tooltip
        if (tooltipElement) {
            // Remove old listener if exists
            const oldHandler = tooltipElement._mouseLeaveHandler;
            if (oldHandler) {
                tooltipElement.removeEventListener('mouseenter', tooltipElement._mouseEnterHandler);
                tooltipElement.removeEventListener('mouseleave', oldHandler);
            }
            
            // Add new listeners
            tooltipElement._mouseEnterHandler = function() {
                console.log('🟢 Mouse enter tooltip');
                cancelHideTooltip(); // Cancel any pending hide
            };
            
            tooltipElement._mouseLeaveHandler = function(e) {
                console.log('🔴 Mouse leave tooltip');
                // Check if mouse is moving back to marker
                const relatedTarget = e.relatedTarget;
                if (relatedTarget && relatedTarget.classList.contains('content-note-marker')) {
                    // Mouse is moving back to marker, keep tooltip visible
                    console.log('✅ Mouse moving back to marker, keeping tooltip visible');
                    return;
                }
                // Only hide if not in edit mode
                if (!currentEditingNoteId) {
                    hideTooltip();
                    activeTooltipNoteId = null;
                }
            };
            
            tooltipElement.addEventListener('mouseenter', tooltipElement._mouseEnterHandler);
            tooltipElement.addEventListener('mouseleave', tooltipElement._mouseLeaveHandler);
        }
        
        console.log('✅ initTooltips completed');
    }
    
    // Initialize tooltips after content is loaded
    setTimeout(initTooltips, 100);
    
    // Mark as initialized
    addNoteToSelectionBtn._contentNoteInitialized = true;
    console.log('✅ ========== Content notes functionality initialized ==========');
    
    // Test: Try to trigger a click programmatically to verify binding
    console.log('🔵 测试：检查按钮是否可点击...');
    if (addNoteToSelectionBtn) {
        console.log('🔵 按钮样式:', window.getComputedStyle(addNoteToSelectionBtn).display);
        console.log('🔵 按钮可见:', addNoteToSelectionBtn.offsetParent !== null);
        console.log('🔵 按钮 disabled:', addNoteToSelectionBtn.disabled);
        console.log('🔵 按钮 onclick:', addNoteToSelectionBtn.onclick);
    }
    
    // Also add a direct click listener as backup (use capture phase and bubble phase)
    console.log('🔵 添加直接事件监听器作为备用...');
    
    // Capture phase listener
    addNoteToSelectionBtn.addEventListener('click', function(e) {
        console.log('🟢 Add Note 按钮被点击 (直接事件监听器 - capture)');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
            alert('Please select some text first');
            return;
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
            alert('Please select some text to add a note');
            return;
        }
        
        // Save selection for later use
        currentSelectionRange = range.cloneRange();
        currentSelectedText = selectedText;
        
        // Show selected text in preview
        if (selectedTextPreview) {
            selectedTextPreview.textContent = selectedText;
            selectedTextPreview.style.fontStyle = 'normal';
            selectedTextPreview.style.color = 'var(--text-dark)';
        }
        
        // Clear note input
        if (noteTextInput) {
            noteTextInput.value = '';
        }
        
        // Show modal
        addContentNoteModal.style.display = 'block';
        console.log('✅ Add Note 模态框已显示 (直接事件)');
    }, true); // Use capture phase
    
    // Bubble phase listener (as another backup)
    addNoteToSelectionBtn.addEventListener('click', function(e) {
        console.log('🟢 Add Note 按钮被点击 (直接事件监听器 - bubble)');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
            alert('Please select some text first');
            return;
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
            alert('Please select some text to add a note');
            return;
        }
        
        // Save selection for later use
        currentSelectionRange = range.cloneRange();
        currentSelectedText = selectedText;
        
        // Show selected text in preview
        if (selectedTextPreview) {
            selectedTextPreview.textContent = selectedText;
            selectedTextPreview.style.fontStyle = 'normal';
            selectedTextPreview.style.color = 'var(--text-dark)';
        }
        
        // Clear note input
        if (noteTextInput) {
            noteTextInput.value = '';
        }
        
        // Show modal
        addContentNoteModal.style.display = 'block';
        console.log('✅ Add Note 模态框已显示 (直接事件 - bubble)');
    }, false); // Use bubble phase
    
    console.log('✅ 直接事件监听器已添加 (capture + bubble)');
    
    // Test: Add onclick attribute as last resort
    addNoteToSelectionBtn.onclick = function(e) {
        console.log('🟢 Add Note 按钮被点击 (onclick 属性)');
        e = e || window.event;
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
            alert('Please select some text first');
            return false;
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
            alert('Please select some text to add a note');
            return false;
        }
        
        // Save selection for later use
        currentSelectionRange = range.cloneRange();
        currentSelectedText = selectedText;
        
        // Show selected text in preview
        if (selectedTextPreview) {
            selectedTextPreview.textContent = selectedText;
            selectedTextPreview.style.fontStyle = 'normal';
            selectedTextPreview.style.color = 'var(--text-dark)';
        }
        
        // Clear note input
        if (noteTextInput) {
            noteTextInput.value = '';
        }
        
        // Show modal
        addContentNoteModal.style.display = 'block';
        console.log('✅ Add Note 模态框已显示 (onclick)');
        return false;
    };
    console.log('✅ onclick 属性已设置');
}

// ========== Vocabulary 相关全局函数（移到 initContentNotes 外部，确保在查看模式下也可访问）==========
// 生成支持词形变化的正则表达式（辅助函数）
if (!window.createVocabularyWordRegex) {
    window.createVocabularyWordRegex = function(word) {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordLower = word.toLowerCase();
        
        // 构建支持词形变化的正则表达式
        let wordPattern;
        
        // 如果单词以 'e' 结尾（如 poise），支持去掉 e 后加后缀（如 poised, poising）
        if (wordLower.endsWith('e')) {
            const wordWithoutE = escapedWord.slice(0, -1);
            // 支持：原词、去掉e+常见后缀（ed, ing, er, est, ly等）
            wordPattern = `\\b(?:${escapedWord}|${wordWithoutE}(?:d|ed|ing|er|est|ly|s))\\b`;
        }
        // 如果单词以 'y' 结尾（如 study），支持 y 变 i 后加后缀（如 studies, studied, studying）
        else if (wordLower.endsWith('y') && wordLower.length > 1) {
            const wordWithoutY = escapedWord.slice(0, -1);
            // 支持：原词、去掉y+ies/ied/ying
            wordPattern = `\\b(?:${escapedWord}|${wordWithoutY}(?:ies|ied|ying))\\b`;
        }
        // 如果单词以辅音字母+ 'y' 结尾（如 happy），支持 y 变 i 后加后缀
        else if (wordLower.match(/[bcdfghjklmnpqrstvwxz]y$/)) {
            const wordWithoutY = escapedWord.slice(0, -1);
            wordPattern = `\\b(?:${escapedWord}|${wordWithoutY}(?:ies|ied|ier|iest|ying))\\b`;
        }
        // 其他情况：支持原词和常见后缀
        else {
            // 支持：原词、原词+常见后缀（ed, ing, er, est, ly, s, es等）
            wordPattern = `\\b${escapedWord}(?:d|ed|ing|er|est|ly|s|es)?\\b`;
        }
        
        return new RegExp(wordPattern, 'gi');
    };
}

// 标记所有已保存的vocabulary单词（全局函数）
if (!window.markAllVocabularyWords) {
    window.markAllVocabularyWords = function(element) {
        console.log('🔵 markAllVocabularyWords 被调用，element:', element);
        if (!element) {
            console.log('⚠️ markAllVocabularyWords: element为空');
            return;
        }
        
        try {
            // 加载所有已保存的单词
            const VOCABULARY_STORAGE_KEY = 'vocabularyReadingWords';
            const stored = localStorage.getItem(VOCABULARY_STORAGE_KEY);
            console.log('🔵 从localStorage读取vocabulary数据:', stored ? '有数据' : '无数据');
            if (!stored) {
                console.log('⚠️ markAllVocabularyWords: 没有找到vocabulary数据');
                return;
            }
            
            const words = JSON.parse(stored);
            console.log('🔵 解析后的words数量:', words ? words.length : 0);
            if (!Array.isArray(words) || words.length === 0) {
                console.log('⚠️ markAllVocabularyWords: vocabulary数组为空');
                return;
            }
            
            console.log('🔵 markAllVocabularyWords: 找到', words.length, '个单词，开始标记...');
            console.log('🔵 标记前element内容长度:', element.innerHTML.length);
            
            // 对每个单词进行标记
            let markedCount = 0;
            words.forEach(vocabWord => {
                if (vocabWord.word) {
                    const beforeCount = element.querySelectorAll('.vocabulary-word-marker').length;
                    window.markWordAsVocabularyInElement(element, vocabWord.word, vocabWord.definition || '', vocabWord.example || '');
                    const afterCount = element.querySelectorAll('.vocabulary-word-marker').length;
                    if (afterCount > beforeCount) {
                        markedCount++;
                        console.log('✅ 标记了单词:', vocabWord.word, '，当前共有', afterCount, '个标记');
                    }
                }
            });
            
            console.log('✅ markAllVocabularyWords: 总共标记了', markedCount, '个单词');
            console.log('🔵 标记后element内容长度:', element.innerHTML.length);
            console.log('🔵 标记后vocabulary markers数量:', element.querySelectorAll('.vocabulary-word-marker').length);
            
            // 初始化vocabulary tooltips（延迟一点，确保DOM更新完成）
            setTimeout(() => {
                console.log('🔵 markAllVocabularyWords: 准备初始化tooltips');
                if (typeof window.initVocabularyTooltips === 'function') {
                    window.initVocabularyTooltips();
                } else {
                    console.error('❌ initVocabularyTooltips不是函数！');
                }
            }, 50);
        } catch (error) {
            console.error('❌ 标记vocabulary单词失败:', error);
            console.error('错误堆栈:', error.stack);
        }
    };
}

// 在指定元素中标记已保存的单词（全局函数）
if (!window.markWordAsVocabularyInElement) {
    window.markWordAsVocabularyInElement = function(element, word, definition, example) {
        if (!element) return;
        
        // 查找所有文本节点，找到匹配的单词
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // 跳过已经在vocabulary marker中的文本节点
                    if (node.parentElement && node.parentElement.classList.contains('vocabulary-word-marker')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // 允许在content-note-marker中标记单词（不跳过）
                    // 这样单词tooltip可以显示在笔记tooltip之上
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        // 在文本节点中查找单词（不区分大小写，支持常见词形变化）
        const wordRegex = window.createVocabularyWordRegex ? 
            window.createVocabularyWordRegex(word) : 
            new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        
        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const matches = [...text.matchAll(wordRegex)];
            
            if (matches.length > 0) {
                // 创建文档片段
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                
                matches.forEach(match => {
                    // 添加匹配前的文本
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                    }
                    
                    // 创建vocabulary marker
                    const span = document.createElement('span');
                    span.className = 'vocabulary-word-marker';
                    span.setAttribute('data-vocab-word', word.toLowerCase());
                    span.setAttribute('data-vocab-definition', definition || '');
                    span.setAttribute('data-vocab-example', example || '');
                    // 移除默认的title属性，避免显示浏览器默认的问号tooltip
                    span.removeAttribute('title');
                    // 设置aria-label为空，避免屏幕阅读器显示tooltip
                    span.setAttribute('aria-label', '');
                    span.textContent = match[0];
                    fragment.appendChild(span);
                    
                    lastIndex = match.index + match[0].length;
                });
                
                // 添加剩余的文本
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                }
                
                // 替换文本节点
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        });
    };
}

// 初始化vocabulary tooltips（全局函数）
if (!window.initVocabularyTooltips) {
    window.initVocabularyTooltips = function() {
        const vocabularyMarkers = document.querySelectorAll('.vocabulary-word-marker');
        console.log('🔵 initVocabularyTooltips: 找到', vocabularyMarkers.length, '个vocabulary markers');
        
        if (vocabularyMarkers.length === 0) {
            console.log('⚠️ initVocabularyTooltips: 没有找到vocabulary markers');
            return;
        }
        
        // 创建或获取tooltip元素
        let tooltip = document.getElementById('vocabularyTooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'vocabularyTooltip';
            tooltip.className = 'vocabulary-tooltip';
            document.body.appendChild(tooltip);
        }
        
        // 为每个marker绑定事件
        vocabularyMarkers.forEach((marker, index) => {
            console.log(`🔵 处理marker ${index + 1}:`, marker.textContent);
            
            // 确保没有title属性，避免浏览器显示默认tooltip（问号）
            marker.removeAttribute('title');
            
            // 移除旧的事件监听器
            if (marker._vocabMouseEnter) {
                marker.removeEventListener('mouseenter', marker._vocabMouseEnter, true);
                marker.removeEventListener('mouseleave', marker._vocabMouseLeave, true);
                marker.removeEventListener('mouseover', marker._vocabMouseEnter);
                marker.removeEventListener('mouseout', marker._vocabMouseLeave);
            }
            
            marker._vocabMouseEnter = function(e) {
                console.log('🔵 mouseenter事件触发！', marker.textContent);
                
                // 如果单词标记在笔记标记内部，需要确保单词tooltip能够显示
                // 先隐藏笔记tooltip（如果存在）
                const noteTooltip = document.querySelector('.content-note-tooltip');
                if (noteTooltip && noteTooltip.style.display === 'block') {
                    noteTooltip.style.display = 'none';
                    noteTooltip.style.visibility = 'hidden';
                    noteTooltip.style.opacity = '0';
                }
                
                // 阻止默认行为，避免显示浏览器默认的title tooltip
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                const word = marker.getAttribute('data-vocab-word');
                const definition = marker.getAttribute('data-vocab-definition');
                const example = marker.getAttribute('data-vocab-example');
                
                console.log('🔵 鼠标悬停在vocabulary marker上:', { word, hasDefinition: !!definition, hasExample: !!example });
                
                if (!definition && !example) {
                    console.log('⚠️ 没有释义和例句，不显示tooltip');
                    return;
                }
                
                // 确保没有title属性，避免浏览器显示默认tooltip
                marker.removeAttribute('title');
                
                // HTML转义辅助函数
                function escapeHtml(text) {
                    if (!text) return '';
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                // 设置tooltip内容（先不添加箭头，等确定位置后再添加）
                let content = `<div class="vocab-tooltip-word">${escapeHtml(word || '')}</div>`;
                if (definition) {
                    content += `<div class="vocab-tooltip-definition">${escapeHtml(definition).replace(/\n/g, '<br>')}</div>`;
                }
                if (example) {
                    content += `<div class="vocab-tooltip-example">"${escapeHtml(example)}"</div>`;
                }
                tooltip.innerHTML = content;
                
                // 定位tooltip
                const rect = marker.getBoundingClientRect();
                let left = rect.left + rect.width / 2;
                let top = rect.top - 10;
                
                tooltip.style.display = 'block';
                tooltip.style.visibility = 'hidden';
                const tooltipRect = tooltip.getBoundingClientRect();
                
                // 调整水平位置
                if (left - tooltipRect.width / 2 < 10) {
                    left = tooltipRect.width / 2 + 10;
                } else if (left + tooltipRect.width / 2 > window.innerWidth - 10) {
                    left = window.innerWidth - tooltipRect.width / 2 - 10;
                }
                
                // 调整垂直位置并设置箭头方向
                let arrowClass = 'bottom'; // 默认箭头在底部（tooltip在上方）
                if (top - tooltipRect.height < 10) {
                    // tooltip显示在单词下方
                    top = rect.bottom + 10;
                    tooltip.style.transform = 'translate(-50%, 0)';
                    arrowClass = 'top'; // 箭头在顶部（指向单词）
                } else {
                    // tooltip显示在单词上方
                    tooltip.style.transform = 'translate(-50%, -100%)';
                    arrowClass = 'bottom'; // 箭头在底部（指向单词）
                }
                
                // 添加箭头
                const arrow = document.createElement('div');
                arrow.className = `vocabulary-tooltip-arrow ${arrowClass}`;
                tooltip.appendChild(arrow);
                
                tooltip.style.position = 'fixed';
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
                tooltip.style.visibility = 'visible';
                tooltip.style.opacity = '1';
                tooltip.style.zIndex = '10002'; // 提高z-index，确保在笔记tooltip之上（笔记tooltip是9999）
                tooltip.style.pointerEvents = 'none'; // 允许鼠标穿透tooltip，避免影响交互
                
                console.log('✅ Vocabulary tooltip已显示:', { word, left, top, transform: tooltip.style.transform, zIndex: tooltip.style.zIndex });
            };
            
            marker._vocabMouseLeave = function(e) {
                // 阻止默认行为
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                tooltip.style.display = 'none';
                tooltip.style.visibility = 'hidden';
                tooltip.style.opacity = '0';
            };
            
            // 使用捕获阶段确保事件被正确触发
            marker.addEventListener('mouseenter', marker._vocabMouseEnter, true);
            marker.addEventListener('mouseleave', marker._vocabMouseLeave, true);
            // 也添加普通事件监听器作为备用
            marker.addEventListener('mouseover', marker._vocabMouseEnter);
            marker.addEventListener('mouseout', marker._vocabMouseLeave);
            
            // 测试事件绑定
            console.log(`✅ Marker ${index + 1} 事件监听器已绑定:`, marker.textContent);
            console.log(`   - 是否有title:`, marker.hasAttribute('title'));
            console.log(`   - data-vocab-word:`, marker.getAttribute('data-vocab-word'));
        });
        
        console.log('✅ 所有vocabulary tooltips已初始化，共', vocabularyMarkers.length, '个');
        
        // 测试：检查是否有markers在viewContentDisplay中
        const viewContentDisplay = document.getElementById('viewContentDisplay');
        if (viewContentDisplay) {
            const markersInView = viewContentDisplay.querySelectorAll('.vocabulary-word-marker');
            console.log('🔵 viewContentDisplay中的vocabulary markers数量:', markersInView.length);
            if (markersInView.length > 0) {
                console.log('🔵 第一个marker:', markersInView[0]);
                console.log('🔵 第一个marker的title属性:', markersInView[0].getAttribute('title'));
            }
        }
    };
}
// ========== Vocabulary 相关全局函数结束 ==========

// 初始化添加笔记功能
function initAddNote() {
    console.log('🔵 ========== initAddNote() 函数开始执行 ==========');
    
    const addNoteBtn = document.getElementById('addNoteBtn');
    const addNoteModal = document.getElementById('addNoteModal');
    const closeModal = document.getElementById('closeModal');
    const noteForm = document.getElementById('noteForm');
    const addQuestionErrorPairBtn = document.getElementById('addQuestionErrorPairBtn');
    const questionErrorPairsContainer = document.getElementById('questionErrorPairsContainer');
    
    console.log('🔵 addNoteBtn:', !!addNoteBtn, addNoteBtn);
    console.log('🔵 addNoteModal:', !!addNoteModal, addNoteModal);
    console.log('🔵 addQuestionErrorPairBtn:', !!addQuestionErrorPairBtn);
    console.log('🔵 questionErrorPairsContainer:', !!questionErrorPairsContainer);
    
    if (!addNoteBtn) {
        console.error('❌ addNoteBtn 未找到！请检查 HTML 中是否有 id="addNoteBtn" 的按钮');
    }
    if (!addNoteModal) {
        console.error('❌ addNoteModal 未找到！请检查 HTML 中是否有 id="addNoteModal" 的模态框');
    }
    
    if (!addNoteBtn || !addNoteModal) {
        console.error('❌ 未找到添加笔记相关元素，initAddNote() 提前返回');
        return;
    }
    
    console.log('✅ 所有必需元素都已找到');
    
    // Add Question & Error Reason Pair Button
    if (addQuestionErrorPairBtn && questionErrorPairsContainer) {
        console.log('✅ Binding add question pair button event');
        addQuestionErrorPairBtn.addEventListener('click', function(e) {
            console.log('🟢 Add question pair button clicked');
            e.preventDefault();
            e.stopPropagation();
            addQuestionErrorPairItem();
        });
    } else {
        console.warn('⚠️ Add question pair button or container not found');
    }
    
    // 打开添加笔记模态框
    if (addNoteBtn) {
        console.log('✅ 开始绑定添加笔记按钮事件...');
        console.log('✅ addNoteBtn 元素:', addNoteBtn);
        console.log('✅ addNoteBtn 类型:', addNoteBtn.tagName);
        console.log('✅ addNoteBtn ID:', addNoteBtn.id);
        console.log('✅ addNoteBtn 类名:', addNoteBtn.className);
        
        addNoteBtn.addEventListener('click', function(e) {
            console.log('🟢 ========== 添加笔记按钮被点击 ==========');
            console.log('🟢 事件对象:', e);
            console.log('🟢 目标元素:', e.target);
            e.preventDefault();
            e.stopPropagation();
            editingNoteId = null;
            questionErrorPairCounter = 0;
            
            // 清空表单
            if (noteForm) {
                noteForm.reset();
            }
            
            // Clear question & error reason pairs
            if (questionErrorPairsContainer) {
                questionErrorPairsContainer.innerHTML = '';
            }
            
            // 清空内容编辑器
            const contentEditor = document.getElementById('noteContent');
            if (contentEditor) {
                contentEditor.innerHTML = '';
            }
            
            // Clear content notes
            contentNotes = {};
            
            // 更新模态框标题
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Add New Article';
            }
            
            console.log('✅ 准备显示模态框');
            addNoteModal.style.display = 'block';
            console.log('✅ 模态框已显示');
            
            // Initialize content note functionality after modal is shown
            console.log('🔵 准备初始化 content notes 功能...');
            setTimeout(() => {
                console.log('🔵 ========== 开始初始化 content notes 功能 ==========');
                console.log('🔵 检查元素是否存在...');
                const contentEditor = document.getElementById('noteContent');
                const addNoteToSelectionBtn = document.getElementById('addNoteToSelection');
                const contentToolbar = document.getElementById('contentToolbar');
                
                console.log('🔵 noteContent:', !!contentEditor);
                console.log('🔵 addNoteToSelectionBtn:', !!addNoteToSelectionBtn);
                console.log('🔵 contentToolbar:', !!contentToolbar);
                
                if (contentEditor) {
                    console.log('🔵 noteContent 父元素:', contentEditor.parentElement?.tagName);
                    console.log('🔵 noteContent 可见:', contentEditor.offsetParent !== null);
                }
                if (addNoteToSelectionBtn) {
                    console.log('🔵 addNoteToSelectionBtn 父元素:', addNoteToSelectionBtn.parentElement?.tagName);
                    console.log('🔵 addNoteToSelectionBtn 可见:', addNoteToSelectionBtn.offsetParent !== null);
                    console.log('🔵 addNoteToSelectionBtn ID:', addNoteToSelectionBtn.id);
                    console.log('🔵 addNoteToSelectionBtn 类名:', addNoteToSelectionBtn.className);
                }
                if (contentToolbar) {
                    console.log('🔵 contentToolbar 子元素数量:', contentToolbar.children.length);
                    console.log('🔵 contentToolbar 所有按钮:', Array.from(contentToolbar.querySelectorAll('button')).map(b => b.id || b.className));
                }
                
                console.log('🔵 调用 initContentNotes()...');
                try {
                    initContentNotes();
                    console.log('🔵 initContentNotes() 调用完成');
                    
                    // 初始化完成后，如果编辑器已有内容，标记vocabulary单词
                    setTimeout(() => {
                        const contentEditor = document.getElementById('noteContent');
                        if (contentEditor && contentEditor.innerHTML.trim()) {
                            console.log('🔵 编辑器已有内容，准备标记vocabulary单词...');
                            if (typeof window.markAllVocabularyWords === 'function') {
                                window.markAllVocabularyWords(contentEditor);
                            }
                        }
                    }, 100);
                } catch (error) {
                    console.error('❌ initContentNotes() 调用出错:', error);
                    console.error('❌ 错误堆栈:', error.stack);
                }
            }, 300);
        });
        console.log('✅ 添加笔记按钮事件监听器已绑定');
        
        // 测试：直接检查按钮是否可以点击
        console.log('🔵 测试：检查按钮是否可点击...');
        console.log('🔵 按钮 disabled:', addNoteBtn.disabled);
        console.log('🔵 按钮 style.display:', window.getComputedStyle(addNoteBtn).display);
        console.log('🔵 按钮 style.pointerEvents:', window.getComputedStyle(addNoteBtn).pointerEvents);
        console.log('🔵 按钮 offsetParent:', addNoteBtn.offsetParent);
        
        // 添加一个测试点击事件（用于调试）
        addNoteBtn.addEventListener('mousedown', function() {
            console.log('🟡 按钮 mousedown 事件触发');
        });
        addNoteBtn.addEventListener('mouseup', function() {
            console.log('🟡 按钮 mouseup 事件触发');
        });
    } else {
        console.error('❌ addNoteBtn not found!');
    }
    
    console.log('🔵 ========== initAddNote() 函数执行完成 ==========');
    
    // 关闭模态框
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            addNoteModal.style.display = 'none';
            editingNoteId = null;
        });
    }
    
    if (addNoteModal) {
        addNoteModal.addEventListener('click', function(e) {
            if (e.target === addNoteModal) {
                addNoteModal.style.display = 'none';
                editingNoteId = null;
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && addNoteModal.style.display === 'block') {
            addNoteModal.style.display = 'none';
            editingNoteId = null;
        }
    });
    
    // 表单提交
    if (noteForm) {
        noteForm.addEventListener('submit', function(e) {
            console.log('🟢 表单提交');
            e.preventDefault();
            
            try {
                const formData = new FormData(noteForm);
                const chapter = formData.get('chapter')?.trim() || '';
                const test = formData.get('test') || '';
                const passage = formData.get('part') || '';
                const title = formData.get('title')?.trim() || '';
                
                // 获取正文内容
                const contentEditor = document.getElementById('noteContent');
                let content = '';
                if (contentEditor) {
                    const textContent = contentEditor.textContent.trim() || contentEditor.innerText.trim();
                    if (textContent) {
                        content = contentEditor.innerHTML.trim();
                    }
                }
                
                // Extract and save content notes
                const noteMarkers = contentEditor.querySelectorAll('.content-note-marker');
                const savedNotes = {};
                noteMarkers.forEach(marker => {
                    const noteId = marker.getAttribute('data-note-id');
                    if (noteId && contentNotes[noteId]) {
                        savedNotes[noteId] = contentNotes[noteId];
                    }
                });
                
                // Get question & error reason pairs
                const questionErrorPairs = [];
                if (questionErrorPairsContainer) {
                    questionErrorPairsContainer.querySelectorAll('.question-error-pair-item').forEach(item => {
                        const questionInput = item.querySelector('.pair-question-input');
                        const errorReasonInput = item.querySelector('.pair-error-reason-input');
                        const question = questionInput ? questionInput.value.trim() : '';
                        const errorReason = errorReasonInput ? errorReasonInput.value.trim() : '';
                        
                        if (question || errorReason) {
                            questionErrorPairs.push({
                                question: question,
                                errorReason: errorReason
                            });
                        }
                    });
                }
                
                // 验证必填字段
                const missingFields = [];
                if (!chapter) missingFields.push('Chapter');
                if (!test) missingFields.push('Test');
                if (!passage) missingFields.push('Passage');
                
                const contentText = content.replace(/<[^>]*>/g, '').trim();
                if (!contentText) {
                    missingFields.push('Content');
                }
                
                if (missingFields.length > 0) {
                    alert('Please fill in all required fields:\n' + missingFields.join(', '));
                    return;
                }
                
                // 保存笔记
                let notes = JSON.parse(localStorage.getItem('readingNotes') || '[]');
                
                if (editingNoteId) {
                    // 编辑模式
                    const noteIndex = notes.findIndex(n => n.id === editingNoteId);
                    if (noteIndex !== -1) {
                        const existingNote = notes[noteIndex];
                        notes[noteIndex] = {
                            id: editingNoteId,
                            chapter: chapter,
                            test: test,
                            passage: passage,
                            title: title,
                            content: content,
                            contentNotes: savedNotes,
                            questionErrorPairs: questionErrorPairs,
                            date: existingNote.date
                        };
                    }
                } else {
                    // 添加模式
                    const noteId = 'note_' + Date.now();
                    const note = {
                        id: noteId,
                        chapter: chapter,
                        test: test,
                        passage: passage,
                        title: title,
                        content: content,
                        contentNotes: savedNotes,
                        questionErrorPairs: questionErrorPairs,
                        date: new Date().toISOString()
                    };
                    notes.unshift(note);
                }
                
                localStorage.setItem('readingNotes', JSON.stringify(notes));
                
                // 关闭模态框
                addNoteModal.style.display = 'none';
                editingNoteId = null;
                
                // 刷新页面
                location.reload();
            } catch (error) {
                console.error('❌ Error saving note:', error);
                alert('An error occurred while saving the note. Please try again.\nError: ' + error.message);
            }
        });
    } else {
        console.error('❌ noteForm not found!');
    }
    
    // 格式化段落按钮功能：在段落之间添加空行
    const formatParagraphsBtn = document.getElementById('formatParagraphsBtn');
    if (formatParagraphsBtn) {
        formatParagraphsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const contentEditor = document.getElementById('noteContent');
            if (!contentEditor) {
                console.warn('⚠️ 内容编辑器未找到');
                return;
            }
            
            console.log('📝 开始格式化段落...');
            
            // 获取编辑器内容
            let html = contentEditor.innerHTML;
            
            // 如果内容为空，直接返回
            if (!html || html.trim() === '') {
                console.log('⚠️ 编辑器内容为空');
                return;
            }
            
            // 创建一个临时div来处理HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // 清理所有格式标签，只保留文本和br
            const formatElements = tempDiv.querySelectorAll('strong, em, u, span, b, i, font, mark, highlight, p, div');
            formatElements.forEach(el => {
                if (el.tagName === 'P' || el.tagName === 'DIV') {
                    // 对于p和div，保留内容和br，但移除标签本身
                    const parent = el.parentNode;
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    parent.removeChild(el);
                } else {
                    // 其他格式标签，提取文本
                    const parent = el.parentNode;
                    const text = el.textContent;
                    const textNode = document.createTextNode(text);
                    parent.replaceChild(textNode, el);
                }
            });
            
            // 获取处理后的HTML
            html = tempDiv.innerHTML;
            
            // 遍历所有节点，在段落之间添加空行
            const fragment = document.createDocumentFragment();
            const walker = document.createTreeWalker(
                tempDiv,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                null
            );
            
            let node;
            let lastWasBr = false;
            let lastWasText = false;
            
            while (node = walker.nextNode()) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    if (text.length > 0) {
                        // 如果上一个节点是文本且不是br，说明是新段落，添加空行
                        if (lastWasText && !lastWasBr) {
                            fragment.appendChild(document.createElement('br'));
                        }
                        fragment.appendChild(document.createTextNode(node.textContent));
                        lastWasText = true;
                        lastWasBr = false;
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
                    // 如果上一个节点是文本，说明是段落结束，添加空行
                    if (lastWasText) {
                        fragment.appendChild(node.cloneNode(true));
                        fragment.appendChild(document.createElement('br')); // 添加空行
                        lastWasBr = true;
                        lastWasText = false;
                    } else if (!lastWasBr) {
                        // 如果上一个节点不是br，保留这个br
                        fragment.appendChild(node.cloneNode(true));
                        lastWasBr = true;
                    }
                    // 如果上一个节点也是br，跳过（避免连续多个br）
                }
            }
            
            // 更新编辑器内容
            contentEditor.innerHTML = '';
            contentEditor.appendChild(fragment);
            
            // 确保编辑器获得焦点
            contentEditor.focus();
            
            console.log('✅ 段落格式化完成，段落之间已添加空行');
        });
        console.log('✅ 格式化段落按钮事件已绑定');
    }
    
    console.log('✅ 添加笔记功能初始化完成');
}

// 编辑笔记
function editNote(noteId) {
    console.log('[EDIT] ========== editNote function called ==========');
    console.log('[EDIT] noteId:', noteId);
    
    const notes = JSON.parse(localStorage.getItem('readingNotes') || '[]');
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
        console.error('[EDIT] Note not found!');
        alert('Note not found!');
        return;
    }
    
    console.log('[EDIT] Note found:', note);
    
    const addNoteModal = document.getElementById('addNoteModal');
    const noteForm = document.getElementById('noteForm');
    const questionErrorPairsContainer = document.getElementById('questionErrorPairsContainer');
    
    if (!addNoteModal || !noteForm) {
        alert('Form elements not found!');
        return;
    }
    
    editingNoteId = noteId;
    questionErrorPairCounter = 0;
    
    // 打开模态框
    addNoteModal.style.display = 'block';
    
    // 更新标题
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Article';
    }
    
    // 填充表单
    document.getElementById('noteChapter').value = note.chapter || '';
    document.getElementById('noteTest').value = note.test || '';
    document.getElementById('notePart').value = note.passage || '';
    
    const titleInput = document.getElementById('noteTitle');
    if (titleInput) {
        titleInput.value = note.title || '';
    }
    
    // 填充内容编辑器
    const contentEditor = document.getElementById('noteContent');
    if (contentEditor) {
        contentEditor.innerHTML = note.content || '';
        
        // Restore content notes
        if (note.contentNotes) {
            contentNotes = note.contentNotes;
        } else {
            contentNotes = {};
        }
        
        // 标记已保存的vocabulary单词（延迟到initContentNotes之后，确保编辑器已完全初始化）
        // 注意：这个调用会在initContentNotes之后执行，因为initContentNotes的延迟是300ms
        setTimeout(() => {
            console.log('[EDIT] 准备标记vocabulary单词...');
            if (typeof window.markAllVocabularyWords === 'function') {
                window.markAllVocabularyWords(contentEditor);
            } else {
                console.error('[EDIT] ❌ markAllVocabularyWords不是函数！');
            }
        }, 400); // 延迟到initContentNotes之后（300ms + 100ms）
    }
    
    // Fill question & error reason pairs
    if (questionErrorPairsContainer) {
        questionErrorPairsContainer.innerHTML = '';
        if (note.questionErrorPairs && note.questionErrorPairs.length > 0) {
            setTimeout(() => {
                note.questionErrorPairs.forEach(pair => {
                    addQuestionErrorPairItem(pair.question || '', pair.errorReason || '');
                });
            }, 100);
        }
    }
    
    console.log('[EDIT] 准备初始化 content notes 功能...');
    // Re-initialize content notes functionality after loading
    setTimeout(() => {
        console.log('[EDIT] ========== 编辑模式：初始化 content notes 功能 ==========');
        console.log('[EDIT] 检查元素是否存在...');
        const contentEditor = document.getElementById('noteContent');
        const addNoteToSelectionBtn = document.getElementById('addNoteToSelection');
        const contentToolbar = document.getElementById('contentToolbar');
        
        console.log('[EDIT] noteContent:', !!contentEditor);
        console.log('[EDIT] addNoteToSelectionBtn:', !!addNoteToSelectionBtn);
        console.log('[EDIT] contentToolbar:', !!contentToolbar);
        
        if (contentEditor) {
            console.log('[EDIT] noteContent 父元素:', contentEditor.parentElement?.tagName);
            console.log('[EDIT] noteContent 可见:', contentEditor.offsetParent !== null);
        }
        if (addNoteToSelectionBtn) {
            console.log('[EDIT] addNoteToSelectionBtn 父元素:', addNoteToSelectionBtn.parentElement?.tagName);
            console.log('[EDIT] addNoteToSelectionBtn 可见:', addNoteToSelectionBtn.offsetParent !== null);
            console.log('[EDIT] addNoteToSelectionBtn ID:', addNoteToSelectionBtn.id);
            console.log('[EDIT] addNoteToSelectionBtn 类名:', addNoteToSelectionBtn.className);
        }
        if (contentToolbar) {
            console.log('[EDIT] contentToolbar 子元素数量:', contentToolbar.children.length);
            console.log('[EDIT] contentToolbar 所有按钮:', Array.from(contentToolbar.querySelectorAll('button')).map(b => b.id || b.className));
        }
        
        console.log('[EDIT] 调用 initContentNotes()...');
        try {
            // Reset the initialization flag so it can be re-initialized
            if (addNoteToSelectionBtn) {
                addNoteToSelectionBtn._contentNoteInitialized = false;
            }
            initContentNotes();
            console.log('[EDIT] initContentNotes() 调用完成');
        } catch (error) {
            console.error('[EDIT] ❌ initContentNotes() 调用出错:', error);
            console.error('[EDIT] ❌ 错误堆栈:', error.stack);
        }
    }, 300);
    
    console.log('[EDIT] ========== editNote function completed ==========');
}

// 删除笔记
function deleteNote(noteId) {
    let notes = JSON.parse(localStorage.getItem('readingNotes') || '[]');
    notes = notes.filter(note => note.id !== noteId);
    localStorage.setItem('readingNotes', JSON.stringify(notes));
    location.reload();
}

// 加载并显示笔记
function loadAndDisplayNotes() {
    console.log('🔵 加载笔记...');
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) {
        console.error('❌ 未找到笔记网格容器');
        return;
    }

    const notes = JSON.parse(localStorage.getItem('readingNotes') || '[]');
    console.log(`从localStorage加载 ${notes.length} 条笔记`);

    notes.forEach(note => {
        const noteCard = createNoteCard(note);
        notesGrid.appendChild(noteCard);
    });

    console.log('✅ 笔记加载完成');
}

// 创建笔记卡片
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.setAttribute('data-note-id', note.id);
    card.setAttribute('data-chapter', note.chapter || '');
    card.setAttribute('data-test', note.test || '');
    card.setAttribute('data-passage', note.passage || '');
    card.setAttribute('data-title', note.title || '');

    const date = new Date(note.date);
    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const titleDisplay = note.title || `${note.chapter}-${note.test}-${note.passage}`;
    
    // 提取纯文本内容（移除 HTML 标签并解码 HTML 实体）
    let contentPreview = 'No content';
    if (note.content) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        contentPreview = tempDiv.textContent || tempDiv.innerText || '';
        // 限制长度
        if (contentPreview.length > 150) {
            contentPreview = contentPreview.substring(0, 150);
        }
    }
    
    const hasQuestions = note.questionErrorPairs && note.questionErrorPairs.length > 0;

    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">
                <h3>${escapeHtml(titleDisplay)}</h3>
            </div>
            <div class="card-date">${dateStr}</div>
        </div>
        <div class="card-content">
            <p class="card-preview">${escapeHtml(contentPreview)}${note.content && contentPreview.length >= 150 ? '...' : ''}</p>
            <div class="card-meta">
                ${hasQuestions ? `<span><i class="fas fa-question-circle"></i> ${note.questionErrorPairs.length} question(s)</span>` : ''}
            </div>
        </div>
        <div class="card-details" style="display: none;">
            <div class="details-content">
                ${note.title ? `<div class="detail-section"><h5>Title</h5><p>${escapeHtml(note.title)}</p></div>` : ''}
                ${note.content ? `<div class="detail-section"><h5>Content</h5><div class="content-display">${note.content}</div></div>` : ''}
                ${hasQuestions ? `
                    <div class="detail-section">
                        <h5>Questions & Error Reasons</h5>
                        ${note.questionErrorPairs.map((pair, index) => `
                            <div class="question-error-pair-item-view">
                                <div class="pair-header">
                                    <span class="pair-number">Question ${index + 1}:</span>
                                </div>
                                <div class="pair-content">
                                    <div class="pair-question">${escapeHtml(pair.question || '')}</div>
                                    <div class="pair-error-reason"><strong>Error Reason:</strong> ${escapeHtml(pair.errorReason || '')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return card;
}

// 页面加载完成后运行
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ========== Reading 页面加载完成 ==========');
    console.log('🚀 开始初始化功能...');
    loadAndDisplayNotes();
    console.log('🚀 loadAndDisplayNotes() 完成');
    initSearch();
    console.log('🚀 initSearch() 完成');
    console.log('🚀 准备调用 initAddNote()...');
    initAddNote();
    console.log('🚀 initAddNote() 调用完成');
    console.log('🚀 ========== 所有初始化完成 ==========');
});
