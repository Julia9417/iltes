// Writing Page JavaScript
console.log('✍️ Writing page JS loaded');

// 全局变量
let editingQuestionId = null;
let editingNoteId = null;

// HTML 转义函数
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期函数（格式：27th April, 2021）
function formatDate(date) {
    const day = date.getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    // 添加序数后缀
    let daySuffix = 'th';
    if (day === 1 || day === 21 || day === 31) daySuffix = 'st';
    else if (day === 2 || day === 22) daySuffix = 'nd';
    else if (day === 3 || day === 23) daySuffix = 'rd';
    
    return `${day}${daySuffix} ${month}, ${year}`;
}

// ==================== 题目管理功能 ====================

// 初始化添加题目功能
function initAddQuestion() {
    console.log('📝 Initializing add question functionality...');
    
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const addQuestionModal = document.getElementById('addQuestionModal');
    const closeQuestionModal = document.getElementById('closeQuestionModal');
    const questionForm = document.getElementById('questionForm');
    const questionModalTitle = document.getElementById('questionModalTitle');
    
    if (!addQuestionBtn || !addQuestionModal || !questionForm) {
        console.error('❌ Required elements not found for add question functionality');
        return;
    }
    
    // 打开添加题目模态框
    addQuestionBtn.addEventListener('click', function() {
        console.log('➕ Add question button clicked');
        editingQuestionId = null;
        if (questionModalTitle) {
            questionModalTitle.textContent = 'Add New Question';
        }
        questionForm.reset();
        addQuestionModal.style.display = 'block';
    });
    
    // 关闭模态框
    if (closeQuestionModal) {
        closeQuestionModal.addEventListener('click', function() {
            addQuestionModal.style.display = 'none';
            questionForm.reset();
            editingQuestionId = null;
        });
    }
    
    // 点击模态框外部关闭
    addQuestionModal.addEventListener('click', function(e) {
        if (e.target === addQuestionModal) {
            addQuestionModal.style.display = 'none';
            questionForm.reset();
            editingQuestionId = null;
        }
    });
    
    // ESC 键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && addQuestionModal.style.display === 'block') {
            addQuestionModal.style.display = 'none';
            questionForm.reset();
            editingQuestionId = null;
        }
    });
    
    // 表单提交
    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveQuestion();
    });
    
    console.log('✅ Add question functionality initialized');
}

// 保存题目
function saveQuestion() {
    console.log('💾 Saving question...');
    
    const chapterInput = document.getElementById('questionChapter');
    const testInput = document.getElementById('questionTest');
    const partInput = document.getElementById('questionTask');
    const questionInput = document.getElementById('questionText');
    const answerInput = document.getElementById('questionAnswer');
    const addQuestionModal = document.getElementById('addQuestionModal');
    const questionForm = document.getElementById('questionForm');
    
    if (!questionInput) {
        console.error('❌ Question input not found');
        return;
    }
    
    const chapter = chapterInput?.value.trim() || '';
    const test = testInput?.value.trim() || '';
    const task = partInput?.value.trim() || '';
    const question = questionInput.value.trim();
    const answer = answerInput?.value.trim() || '';
    
    if (!question) {
        alert('Please enter a question.');
        questionInput.focus();
        return;
    }
    
    let questions = JSON.parse(localStorage.getItem('writingQuestions') || '[]');
    
    if (editingQuestionId) {
        // 编辑现有题目
        const index = questions.findIndex(q => q.id === editingQuestionId);
        if (index !== -1) {
            questions[index] = {
                ...questions[index],
                chapter: chapter,
                test: test,
                task: task,
                question: question,
                answer: answer,
                date: new Date().toISOString()
            };
            console.log('✅ Question updated:', questions[index]);
        }
    } else {
        // 添加新题目
        const newQuestion = {
            id: Date.now().toString(),
            chapter: chapter,
            test: test,
            task: task,
            question: question,
            answer: answer,
            date: new Date().toISOString()
        };
        questions.push(newQuestion);
        console.log('✅ New question added:', newQuestion);
    }
    
    localStorage.setItem('writingQuestions', JSON.stringify(questions));
    
    // 关闭模态框
    addQuestionModal.style.display = 'none';
    questionForm.reset();
    editingQuestionId = null;
    
    // 重新加载并显示题目
    loadAndDisplayQuestions();
}

// 编辑题目
function editQuestion(questionId) {
    console.log('✏️ Editing question:', questionId);
    
    const questions = JSON.parse(localStorage.getItem('writingQuestions') || '[]');
    const question = questions.find(q => q.id === questionId);
    
    if (!question) {
        console.error('❌ Question not found:', questionId);
        return;
    }
    
    editingQuestionId = questionId;
    
    const addQuestionModal = document.getElementById('addQuestionModal');
    const questionModalTitle = document.getElementById('questionModalTitle');
    const chapterInput = document.getElementById('questionChapter');
    const testInput = document.getElementById('questionTest');
    const partInput = document.getElementById('questionTask');
    const questionInput = document.getElementById('questionText');
    const answerInput = document.getElementById('questionAnswer');
    
    if (questionModalTitle) {
        questionModalTitle.textContent = 'Edit Question';
    }
    
    if (chapterInput) chapterInput.value = question.chapter || '';
    if (testInput) testInput.value = question.test || '';
    if (partInput) partInput.value = question.task || '';
    if (questionInput) questionInput.value = question.question || '';
    if (answerInput) answerInput.value = question.answer || '';
    
    if (addQuestionModal) {
        addQuestionModal.style.display = 'block';
    }
}

// 删除题目
function deleteQuestion(questionId) {
    console.log('🗑️ Deleting question:', questionId);
    
    let questions = JSON.parse(localStorage.getItem('writingQuestions') || '[]');
    questions = questions.filter(q => q.id !== questionId);
    localStorage.setItem('writingQuestions', JSON.stringify(questions));
    loadAndDisplayQuestions();
}

// 加载并显示题目
function loadAndDisplayQuestions() {
    console.log('🔵 Loading questions...');
    const questionsGrid = document.getElementById('questionsGrid');
    if (!questionsGrid) {
        console.error('❌ Questions grid container not found');
        return;
    }

    const questions = JSON.parse(localStorage.getItem('writingQuestions') || '[]');
    console.log(`Loaded ${questions.length} questions from localStorage`);

    // 清空现有内容
    questionsGrid.innerHTML = '';

    if (questions.length === 0) {
        questionsGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><p>No questions yet. Click "Add Question" to get started.</p></div>';
        return;
    }

    questions.forEach(question => {
        const questionCard = createQuestionCard(question);
        questionsGrid.appendChild(questionCard);
    });

    initQuestionCardToggles();
    initDragAndDrop();
    updateLinkedContent(); // 更新关联内容显示
    console.log('✅ Questions loaded and displayed');
}

// 创建题目卡片
function createQuestionCard(question) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.setAttribute('data-question-id', question.id);
    card.setAttribute('data-chapter', question.chapter || '');
    card.setAttribute('data-test', question.test || '');
    card.setAttribute('data-task', question.task || '');

    const date = new Date(question.date);
    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    // 只显示问题标题（截取前100个字符）
    let questionTitle = question.question || 'No question';
    if (questionTitle.length > 100) {
        questionTitle = questionTitle.substring(0, 100) + '...';
    }

    // 构建标签
    const tags = [];
    if (question.chapter) tags.push(question.chapter);
    if (question.test) tags.push(question.test);
    if (question.task) tags.push(question.task);

    const tagsHTML = tags.length > 0 
        ? `<div class="question-card-tags">${tags.map(tag => `<span class="question-card-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
        : '';

    // 获取关联的笔记数量
    const linkedNotesCount = question.linkedNotes ? question.linkedNotes.length : 0;
    const linkedNotesBadge = linkedNotesCount > 0 
        ? `<span class="question-card-link-badge" title="${linkedNotesCount} linked note(s)"><i class="fas fa-link"></i> ${linkedNotesCount}</span>`
        : '';

    card.innerHTML = `
        <div class="question-card-header">
            <div class="question-card-title">${escapeHtml(questionTitle)}${linkedNotesBadge}</div>
            <div class="question-card-menu">
                <button class="question-card-menu-btn" title="More options">
                    <i class="far fa-circle"></i>
                </button>
                <div class="question-card-menu-dropdown">
                    <button class="question-card-menu-item edit" data-action="edit" data-question-id="${question.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="question-card-menu-item delete" data-action="delete" data-question-id="${question.id}" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="question-card-details">
            <div class="question-card-info">
                ${question.chapter ? `<div class="question-card-info-item"><span class="question-card-info-label">Chapter:</span>${escapeHtml(question.chapter)}</div>` : ''}
                ${question.test ? `<div class="question-card-info-item"><span class="question-card-info-label">Test:</span>${escapeHtml(question.test)}</div>` : ''}
                ${question.answer ? `<div class="question-card-info-item"><span class="question-card-info-label">Answer:</span>${escapeHtml(question.answer)}</div>` : ''}
            </div>
            ${linkedNotesCount > 0 ? `
            <div class="question-card-linked-section">
                <div class="question-card-linked-header">
                    <i class="fas fa-link"></i> <span>Linked Notes (${linkedNotesCount})</span>
                </div>
                <div class="question-card-linked-list" id="linked-notes-${question.id}">
                    <!-- 关联的笔记列表将在这里动态生成 -->
                </div>
            </div>
            ` : ''}
            <div class="question-card-meta">
                ${tagsHTML}
                <div class="question-card-date">${dateStr}</div>
            </div>
        </div>
    `;
    
    // 设置拖拽属性
    card.draggable = true;
    card.setAttribute('data-drag-type', 'question');
    
    // 添加点击事件来展开/折叠
    card.addEventListener('click', function(e) {
        // 如果点击的是菜单按钮或下拉菜单，不触发展开/折叠
        if (e.target.closest('.question-card-menu')) {
            return;
        }
        // 如果点击的是卡片本身，切换展开状态
        if (e.target === card || card.contains(e.target)) {
            card.classList.toggle('expanded');
        }
    });

    // 菜单按钮点击事件
    const menuBtn = card.querySelector('.question-card-menu-btn');
    const menuDropdown = card.querySelector('.question-card-menu-dropdown');
    
    if (menuBtn && menuDropdown) {
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止触发卡片点击事件
            menuDropdown.classList.toggle('show');
        });

        // 菜单项点击事件
        const editBtn = menuDropdown.querySelector('[data-action="edit"]');
        const deleteBtn = menuDropdown.querySelector('[data-action="delete"]');

        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const questionId = this.getAttribute('data-question-id');
                editQuestion(questionId);
                menuDropdown.classList.remove('show');
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const questionId = this.getAttribute('data-question-id');
                if (confirm('Are you sure you want to delete this question?')) {
                    deleteQuestion(questionId);
                }
                menuDropdown.classList.remove('show');
            });
        }
    }
    
    return card;
}

// 初始化题目卡片点击事件（保留模态框功能用于编辑和删除）
function initQuestionCardToggles() {
    // 点击外部关闭所有菜单（只绑定一次）
    if (!window.questionMenuClickHandler) {
        window.questionMenuClickHandler = function(e) {
            if (!e.target.closest('.question-card-menu')) {
                document.querySelectorAll('.question-card-menu-dropdown').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        };
        document.addEventListener('click', window.questionMenuClickHandler);
    }
    const modal = document.getElementById('questionDetailsModal');
    const modalBody = document.getElementById('questionDetailsContent');
    const modalTitle = document.getElementById('questionDetailsTitle');
    const modalClose = document.getElementById('closeQuestionDetailsModal');
    const editQuestionBtn = document.getElementById('editQuestionBtn');
    const deleteQuestionBtn = document.getElementById('deleteQuestionBtn');
    
    // 编辑和删除按钮的事件处理（保留模态框功能）
    if (editQuestionBtn) {
        editQuestionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const questionId = this.getAttribute('data-question-id');
            if (questionId) {
                editQuestion(questionId);
                modal.style.display = 'none';
            }
        });
    }
    
    if (deleteQuestionBtn) {
        deleteQuestionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const questionId = this.getAttribute('data-question-id');
            
            if (confirm('Are you sure you want to delete this question?')) {
                deleteQuestion(questionId);
                modal.style.display = 'none';
            }
        });
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            modal.style.display = 'none';
            if (editQuestionBtn) editQuestionBtn.style.display = 'none';
            if (deleteQuestionBtn) deleteQuestionBtn.style.display = 'none';
        });
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                if (editQuestionBtn) editQuestionBtn.style.display = 'none';
                if (deleteQuestionBtn) deleteQuestionBtn.style.display = 'none';
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            modal.style.display = 'none';
            if (editQuestionBtn) editQuestionBtn.style.display = 'none';
            if (deleteQuestionBtn) deleteQuestionBtn.style.display = 'none';
        }
    });
}

// ==================== 笔记管理功能 ====================

// 初始化添加笔记功能
function initAddNote() {
    console.log('📝 Initializing add note functionality...');
    
    const addNoteBtn = document.getElementById('addNoteBtn');
    const addNoteModal = document.getElementById('addNoteModal');
    const closeNoteModal = document.getElementById('closeNoteModal');
    const noteForm = document.getElementById('noteForm');
    const noteModalTitle = document.getElementById('noteModalTitle');
    
    if (!addNoteBtn || !addNoteModal || !noteForm) {
        console.error('❌ Required elements not found for add note functionality');
        return;
    }
    
    // 打开添加笔记模态框（根据当前视图类型显示不同内容）
    addNoteBtn.addEventListener('click', function() {
        console.log('➕ Add button clicked, current view:', currentView);
        editingNoteId = null;
        noteForm.reset();
        
        // 隐藏所有表单部分
        document.getElementById('addPrimaryCategorySection').style.display = 'none';
        document.getElementById('addSecondaryCategorySection').style.display = 'none';
        document.getElementById('addNoteSection').style.display = 'none';
        
        // 根据当前视图类型显示相应的表单
        if (currentView.type === 'root') {
            // 根目录：添加一级分类
            if (noteModalTitle) noteModalTitle.textContent = 'Add Primary Category';
            document.getElementById('addPrimaryCategorySection').style.display = 'block';
            document.getElementById('submitButtonText').textContent = 'Add Category';
            // 重置颜色选择器为默认值
            const colorInput = document.getElementById('primaryCategoryColor');
            if (colorInput) {
                colorInput.value = '#8B5CF6';
            }
            
            // 添加一级分类选择监听器，动态更新二级分类输入方式
            const primaryCategoryNameSelect = document.getElementById('primaryCategoryName');
            if (primaryCategoryNameSelect) {
                primaryCategoryNameSelect.addEventListener('change', function() {
                    // 这个监听器会在用户选择Task 1或Task 2时触发
                    // 但此时还在根目录，所以不需要更新二级分类输入
                });
            }
        } else if (currentView.type === 'primary') {
            // 一级分类视图：添加二级分类
            if (noteModalTitle) noteModalTitle.textContent = 'Add Secondary Category';
            document.getElementById('addSecondaryCategorySection').style.display = 'block';
            document.getElementById('submitButtonText').textContent = 'Add Category';
            
            // 根据一级分类（Task 1或Task 2）显示不同的二级分类输入方式
            const primaryCategoryName = document.getElementById('primaryCategoryName');
            const secondaryCategoryInputContainer = document.getElementById('secondaryCategoryInputContainer');
            
            if (primaryCategoryName && secondaryCategoryInputContainer) {
                // 获取当前一级分类
                const currentPrimaryCategory = currentView.primaryCategory || '';
                
                if (currentPrimaryCategory === 'Task 1') {
                    // Task 1: 显示图表类型选择
                    secondaryCategoryInputContainer.innerHTML = `
                        <select id="secondaryCategoryName" name="secondaryCategoryName" class="form-control" required>
                            <option value="">Select Chart Type</option>
                            <option value="Line Chart">Line Chart</option>
                            <option value="Bar Chart">Bar Chart</option>
                            <option value="Pie Chart">Pie Chart</option>
                            <option value="Table">Table</option>
                            <option value="Process">Process</option>
                            <option value="Map">Map</option>
                            <option value="Mixed Charts">Mixed Charts</option>
                        </select>
                    `;
                } else if (currentPrimaryCategory === 'Task 2') {
                    // Task 2: 显示文本输入（话题）
                    secondaryCategoryInputContainer.innerHTML = `
                        <input type="text" id="secondaryCategoryName" name="secondaryCategoryName" class="form-control" 
                               placeholder="Enter topic name (e.g., Education, Environment)" required>
                    `;
                } else {
                    // 默认：文本输入
                    secondaryCategoryInputContainer.innerHTML = `
                        <input type="text" id="secondaryCategoryName" name="secondaryCategoryName" class="form-control" 
                               placeholder="Enter secondary category name" required>
                    `;
                }
            }
        } else if (currentView.type === 'secondary') {
            // 二级分类视图：添加笔记
            if (noteModalTitle) noteModalTitle.textContent = 'Add Note';
            document.getElementById('addNoteSection').style.display = 'block';
            document.getElementById('submitButtonText').textContent = 'Save Note';
            
            // 根据一级分类（Task 1或Task 2）显示不同的笔记字段
            const task1NoteFields = document.getElementById('task1NoteFields');
            const task2NoteFields = document.getElementById('task2NoteFields');
            const currentPrimaryCategory = currentView.primaryCategory || '';
            
            if (currentPrimaryCategory === 'Task 1') {
                if (task1NoteFields) task1NoteFields.style.display = 'block';
                if (task2NoteFields) task2NoteFields.style.display = 'none';
            } else if (currentPrimaryCategory === 'Task 2') {
                if (task1NoteFields) task1NoteFields.style.display = 'none';
                if (task2NoteFields) task2NoteFields.style.display = 'block';
            } else {
                // 默认隐藏所有字段
                if (task1NoteFields) task1NoteFields.style.display = 'none';
                if (task2NoteFields) task2NoteFields.style.display = 'none';
            }
        }
        
        addNoteModal.style.display = 'block';
    });
    
    // 关闭模态框
    if (closeNoteModal) {
        closeNoteModal.addEventListener('click', function() {
            addNoteModal.style.display = 'none';
            noteForm.reset();
            editingNoteId = null;
        });
    }
    
    // 点击模态框外部关闭
    addNoteModal.addEventListener('click', function(e) {
        if (e.target === addNoteModal) {
            addNoteModal.style.display = 'none';
            noteForm.reset();
            editingNoteId = null;
        }
    });
    
    // ESC 键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && addNoteModal.style.display === 'block') {
            addNoteModal.style.display = 'none';
            noteForm.reset();
            editingNoteId = null;
        }
    });
    
    // 表单提交
    noteForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveNote();
    });
    
    console.log('✅ Add note functionality initialized');
}

// 保存笔记（根据当前视图类型保存不同内容）
function saveNote() {
    console.log('💾 Saving, current view:', currentView);
    
    const addNoteModal = document.getElementById('addNoteModal');
    const noteForm = document.getElementById('noteForm');
    
    let notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    
    if (currentView.type === 'root') {
        // 根目录：添加一级分类（通过创建一个空的二级分类来实现）
        const primaryCategoryNameInput = document.getElementById('primaryCategoryName');
        const primaryCategoryName = primaryCategoryNameInput?.value.trim() || '';
        const primaryCategoryColorInput = document.getElementById('primaryCategoryColor');
        const primaryCategoryColor = primaryCategoryColorInput?.value || '#8B5CF6';
        
        if (!primaryCategoryName) {
            alert('Please enter a primary category name.');
            primaryCategoryNameInput?.focus();
            return;
        }
        
        // 保存分类颜色
        setCategoryColor('primary', primaryCategoryName, primaryCategoryColor);
        
        // 创建一个占位笔记来建立一级分类结构
        // 使用一个特殊的二级分类名称来标记这是占位符
        const placeholderNote = {
            id: Date.now().toString(),
            primaryCategory: primaryCategoryName,
            secondaryCategory: '__PLACEHOLDER__', // 特殊标记，用于占位符
            topicTitle: '',
            descriptionFacts: '',
            feelingsOpinions: '',
            reasonsEffects: '',
            comparison: '',
            activitiesStories: '',
            date: new Date().toISOString(),
            isPlaceholder: true // 标记为占位符，可以在显示时隐藏
        };
        notes.push(placeholderNote);
        console.log('✅ Primary category created:', primaryCategoryName, 'with color:', primaryCategoryColor);
        
    } else if (currentView.type === 'primary') {
        // 一级分类视图：添加二级分类（通过创建一个空的笔记来实现）
        const secondaryCategoryNameInput = document.getElementById('secondaryCategoryName');
        const secondaryCategoryName = secondaryCategoryNameInput?.value.trim() || '';
        
        if (!secondaryCategoryName) {
            alert('Please enter a secondary category name.');
            secondaryCategoryNameInput?.focus();
            return;
        }
        
        // 创建一个占位笔记来建立二级分类结构
        const placeholderNote = {
            id: Date.now().toString(),
            primaryCategory: currentView.primaryCategory,
            secondaryCategory: secondaryCategoryName,
            topicTitle: '',
            descriptionFacts: '',
            feelingsOpinions: '',
            reasonsEffects: '',
            comparison: '',
            activitiesStories: '',
            date: new Date().toISOString(),
            isPlaceholder: true
        };
        notes.push(placeholderNote);
        console.log('✅ Secondary category created:', secondaryCategoryName);
        
    } else if (currentView.type === 'secondary') {
        // 二级分类视图：添加完整笔记
        const currentPrimaryCategory = currentView.primaryCategory || '';
        
        if (currentPrimaryCategory === 'Task 1') {
            // Task 1 笔记字段
            const task1QuestionDescriptionInput = document.getElementById('task1QuestionDescription');
            const task1ChartDataInput = document.getElementById('task1ChartData');
            const task1SampleEssayInput = document.getElementById('task1SampleEssay');
            const task1KeyExpressionsInput = document.getElementById('task1KeyExpressions');
            
            if (!task1QuestionDescriptionInput) {
                console.error('❌ Task 1 question description input not found');
                return;
            }
            
            const questionDescription = task1QuestionDescriptionInput.value.trim();
            const chartData = task1ChartDataInput?.value.trim() || '';
            const sampleEssay = task1SampleEssayInput?.value.trim() || '';
            const keyExpressions = task1KeyExpressionsInput?.value.trim() || '';
            
            if (!questionDescription) {
                alert('Please enter a question description.');
                task1QuestionDescriptionInput.focus();
                return;
            }
            
            if (editingNoteId) {
                // 编辑现有笔记
                const index = notes.findIndex(n => n.id === editingNoteId);
                if (index !== -1) {
                    notes[index] = {
                        ...notes[index],
                        questionDescription: questionDescription,
                        chartData: chartData,
                        sampleEssay: sampleEssay,
                        keyExpressions: keyExpressions,
                        date: new Date().toISOString()
                    };
                    console.log('✅ Task 1 note updated:', notes[index]);
                }
            } else {
                // 添加新笔记
                const newNote = {
                    id: Date.now().toString(),
                    primaryCategory: currentView.primaryCategory,
                    secondaryCategory: currentView.secondaryCategory,
                    questionDescription: questionDescription,
                    chartData: chartData,
                    sampleEssay: sampleEssay,
                    keyExpressions: keyExpressions,
                    date: new Date().toISOString()
                };
                notes.push(newNote);
                console.log('✅ New Task 1 note added:', newNote);
            }
        } else if (currentPrimaryCategory === 'Task 2') {
            // Task 2 笔记字段
            const task2QuestionInput = document.getElementById('task2Question');
            const task2OpinionsInput = document.getElementById('task2Opinions');
            const task2ArgumentsInput = document.getElementById('task2Arguments');
            const task2SampleEssayInput = document.getElementById('task2SampleEssay');
            const task2VocabularyInput = document.getElementById('task2Vocabulary');
            
            if (!task2QuestionInput) {
                console.error('❌ Task 2 question input not found');
                return;
            }
            
            const question = task2QuestionInput.value.trim();
            const opinions = task2OpinionsInput?.value.trim() || '';
            const arguments = task2ArgumentsInput?.value.trim() || '';
            const sampleEssay = task2SampleEssayInput?.value.trim() || '';
            const vocabulary = task2VocabularyInput?.value.trim() || '';
            
            if (!question) {
                alert('Please enter a question.');
                task2QuestionInput.focus();
                return;
            }
            
            if (editingNoteId) {
                // 编辑现有笔记
                const index = notes.findIndex(n => n.id === editingNoteId);
                if (index !== -1) {
                    notes[index] = {
                        ...notes[index],
                        question: question,
                        opinions: opinions,
                        arguments: arguments,
                        sampleEssay: sampleEssay,
                        vocabulary: vocabulary,
                        date: new Date().toISOString()
                    };
                    console.log('✅ Task 2 note updated:', notes[index]);
                }
            } else {
                // 添加新笔记
                const newNote = {
                    id: Date.now().toString(),
                    primaryCategory: currentView.primaryCategory,
                    secondaryCategory: currentView.secondaryCategory,
                    question: question,
                    opinions: opinions,
                    arguments: arguments,
                    sampleEssay: sampleEssay,
                    vocabulary: vocabulary,
                    date: new Date().toISOString()
                };
                notes.push(newNote);
                console.log('✅ New Task 2 note added:', newNote);
            }
        } else {
            // 默认：使用旧的字段结构（兼容性）
            const topicTitleInput = document.getElementById('topicTitle');
            if (topicTitleInput) {
                const topicTitle = topicTitleInput.value.trim();
                if (!topicTitle) {
                    alert('Please enter a topic title.');
                    topicTitleInput.focus();
                    return;
                }
                // ... 旧的保存逻辑
            }
        }
    }
    
    localStorage.setItem('writingNotes', JSON.stringify(notes));
    
    // 关闭模态框
    addNoteModal.style.display = 'none';
    noteForm.reset();
    editingNoteId = null;
    
    // 重新加载并显示笔记（保持当前视图状态）
    loadAndDisplayNotes(currentView.type, currentView.primaryCategory, currentView.secondaryCategory);
}

// 编辑笔记
function editNote(noteId) {
    console.log('✏️ Editing note:', noteId);
    
    const notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
        console.error('❌ Note not found:', noteId);
        return;
    }
    
    editingNoteId = noteId;
    
    const addNoteModal = document.getElementById('addNoteModal');
    const noteModalTitle = document.getElementById('noteModalTitle');
    
    if (noteModalTitle) {
        noteModalTitle.textContent = 'Edit Note';
    }
    
    // 显示笔记表单
    document.getElementById('addNoteSection').style.display = 'block';
    
    // 根据Task类型显示不同的字段
    const primaryCategory = note.primaryCategory || '';
    const task1NoteFields = document.getElementById('task1NoteFields');
    const task2NoteFields = document.getElementById('task2NoteFields');
    
    if (primaryCategory === 'Task 1') {
        if (task1NoteFields) task1NoteFields.style.display = 'block';
        if (task2NoteFields) task2NoteFields.style.display = 'none';
        
        // 加载Task 1字段
        const task1QuestionDescriptionInput = document.getElementById('task1QuestionDescription');
        const task1ChartDataInput = document.getElementById('task1ChartData');
        const task1SampleEssayInput = document.getElementById('task1SampleEssay');
        const task1KeyExpressionsInput = document.getElementById('task1KeyExpressions');
        
        if (task1QuestionDescriptionInput) task1QuestionDescriptionInput.value = note.questionDescription || '';
        if (task1ChartDataInput) task1ChartDataInput.value = note.chartData || '';
        if (task1SampleEssayInput) task1SampleEssayInput.value = note.sampleEssay || '';
        if (task1KeyExpressionsInput) task1KeyExpressionsInput.value = note.keyExpressions || '';
    } else if (primaryCategory === 'Task 2') {
        if (task1NoteFields) task1NoteFields.style.display = 'none';
        if (task2NoteFields) task2NoteFields.style.display = 'block';
        
        // 加载Task 2字段
        const task2QuestionInput = document.getElementById('task2Question');
        const task2OpinionsInput = document.getElementById('task2Opinions');
        const task2ArgumentsInput = document.getElementById('task2Arguments');
        const task2SampleEssayInput = document.getElementById('task2SampleEssay');
        const task2VocabularyInput = document.getElementById('task2Vocabulary');
        
        if (task2QuestionInput) task2QuestionInput.value = note.question || '';
        if (task2OpinionsInput) task2OpinionsInput.value = note.opinions || '';
        if (task2ArgumentsInput) task2ArgumentsInput.value = note.arguments || '';
        if (task2SampleEssayInput) task2SampleEssayInput.value = note.sampleEssay || '';
        if (task2VocabularyInput) task2VocabularyInput.value = note.vocabulary || '';
    } else {
        // 兼容旧字段
        if (task1NoteFields) task1NoteFields.style.display = 'none';
        if (task2NoteFields) task2NoteFields.style.display = 'none';
        
        const topicTitleInput = document.getElementById('topicTitle');
        const descriptionFactsInput = document.getElementById('descriptionFacts');
        const feelingsOpinionsInput = document.getElementById('feelingsOpinions');
        const reasonsEffectsInput = document.getElementById('reasonsEffects');
        const comparisonInput = document.getElementById('comparison');
        const activitiesStoriesInput = document.getElementById('activitiesStories');
        
        if (topicTitleInput) topicTitleInput.value = note.topicTitle || '';
        if (descriptionFactsInput) descriptionFactsInput.value = note.descriptionFacts || '';
        if (feelingsOpinionsInput) feelingsOpinionsInput.value = note.feelingsOpinions || '';
        if (reasonsEffectsInput) reasonsEffectsInput.value = note.reasonsEffects || '';
        if (comparisonInput) comparisonInput.value = note.comparison || '';
        if (activitiesStoriesInput) activitiesStoriesInput.value = note.activitiesStories || '';
    }
    
    if (addNoteModal) {
        addNoteModal.style.display = 'block';
    }
}

// 删除笔记
function deleteNote(noteId) {
    console.log('🗑️ Deleting note:', noteId);
    
    let notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    notes = notes.filter(note => note.id !== noteId);
    localStorage.setItem('writingNotes', JSON.stringify(notes));
    // 重新加载并显示笔记（保持当前视图状态）
    loadAndDisplayNotes(currentView.type, currentView.primaryCategory, currentView.secondaryCategory);
}

// 全局变量：当前导航状态
let currentView = {
    type: 'root', // 'root', 'primary', 'secondary'
    primaryCategory: null,
    secondaryCategory: null
};

// 加载并显示笔记（按文件夹结构）
function loadAndDisplayNotes(viewType = 'root', primaryCategory = null, secondaryCategory = null) {
    console.log('🔵 Loading notes...', viewType, primaryCategory, secondaryCategory);
    const notesGrid = document.getElementById('notesGrid');
    const backBtn = document.getElementById('backToParent');
    
    if (!notesGrid) {
        console.error('❌ Notes grid container not found');
        return;
    }

    const notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    console.log(`Loaded ${notes.length} notes from localStorage`);

    // 更新当前视图状态
    currentView = {
        type: viewType,
        primaryCategory: primaryCategory,
        secondaryCategory: secondaryCategory
    };

    // 清空现有内容
    notesGrid.innerHTML = '';

    if (notes.length === 0) {
        notesGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><p>No notes yet. Click "Add Note" to get started.</p></div>';
        if (backBtn) backBtn.style.display = 'none';
        return;
    }

    // 按 primary category 和 secondary category 分组
    const groupedNotes = {};
    notes.forEach(note => {
        const primary = note.primaryCategory || 'Uncategorized';
        const secondary = note.secondaryCategory || 'Uncategorized';
        
        // 跳过特殊的占位符二级分类（但保留一级分类结构）
        if (secondary === '__PLACEHOLDER__') {
            if (!groupedNotes[primary]) {
                groupedNotes[primary] = {};
            }
            return; // 不添加到任何二级分类
        }
        
        if (!groupedNotes[primary]) {
            groupedNotes[primary] = {};
        }
        if (!groupedNotes[primary][secondary]) {
            groupedNotes[primary][secondary] = [];
        }
        groupedNotes[primary][secondary].push(note);
    });

    // 根据视图类型显示不同内容
    if (viewType === 'root') {
        // 显示所有一级分类
        Object.keys(groupedNotes).sort().forEach(primaryCategory => {
            const primaryFolder = createPrimaryFolder(primaryCategory, groupedNotes[primaryCategory]);
            notesGrid.appendChild(primaryFolder);
        });
        if (backBtn) backBtn.style.display = 'none';
    } else if (viewType === 'primary' && primaryCategory) {
        // 显示指定一级分类下的二级分类
        if (groupedNotes[primaryCategory]) {
            Object.keys(groupedNotes[primaryCategory]).sort().forEach(secondaryCategory => {
                const secondaryFolder = createSecondaryFolder(secondaryCategory, groupedNotes[primaryCategory][secondaryCategory]);
                notesGrid.appendChild(secondaryFolder);
            });
        }
        if (backBtn) backBtn.style.display = 'inline-flex';
    } else if (viewType === 'secondary' && primaryCategory && secondaryCategory) {
        // 显示指定二级分类下的笔记（过滤掉占位符笔记）
        if (groupedNotes[primaryCategory] && groupedNotes[primaryCategory][secondaryCategory]) {
            const notesList = groupedNotes[primaryCategory][secondaryCategory];
            notesList.forEach(note => {
                // 只显示有实际内容的笔记（不是占位符）
                if (!note.isPlaceholder && note.topicTitle && note.topicTitle.trim()) {
                    const noteCard = createNoteCard(note);
                    notesGrid.appendChild(noteCard);
                }
            });
        }
        if (backBtn) backBtn.style.display = 'inline-flex';
    }

    initNoteCardToggles();
    initFolderNavigation();
    initFolderActions();
    initDragAndDrop();
    updateLinkedContent(); // 更新关联内容显示
    console.log('✅ Notes loaded and displayed');
}

// 创建一级文件夹
function createPrimaryFolder(primaryCategory, secondaryCategories) {
    const folderCard = document.createElement('div');
    folderCard.className = 'folder-card folder-primary';
    folderCard.setAttribute('data-folder-type', 'primary');
    folderCard.setAttribute('data-folder-name', primaryCategory);

    // 获取文件夹的最新日期
    let latestDate = null;
    Object.values(secondaryCategories).forEach(notes => {
        notes.forEach(note => {
            const noteDate = new Date(note.date);
            if (!latestDate || noteDate > latestDate) {
                latestDate = noteDate;
            }
        });
    });

    const dateStr = latestDate ? formatDate(latestDate) : '';

    // 计算二级分类数量
    const secondaryCount = Object.keys(secondaryCategories).length;

    // 获取分类颜色
    const categoryColor = getCategoryColor('primary', primaryCategory) || '#8B5CF6';
    
    folderCard.innerHTML = `
        <div class="folder-header">
            <div class="folder-dot" style="background: ${categoryColor};"></div>
            <div class="folder-title" style="color: ${categoryColor};">${escapeHtml(primaryCategory)}</div>
        </div>
        <div class="folder-meta">
            <div class="folder-date">${dateStr}</div>
            <div class="folder-actions">
                <button class="folder-btn-edit" title="Edit" data-folder-type="primary" data-folder-name="${escapeHtml(primaryCategory)}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="folder-btn-delete" title="Delete" data-folder-type="primary" data-folder-name="${escapeHtml(primaryCategory)}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;

    return folderCard;
}

// 创建二级文件夹
function createSecondaryFolder(secondaryCategory, notes) {
    const folderCard = document.createElement('div');
    folderCard.className = 'folder-card folder-secondary';
    folderCard.setAttribute('data-folder-type', 'secondary');
    folderCard.setAttribute('data-folder-name', secondaryCategory);

    // 获取文件夹的最新日期
    let latestDate = null;
    notes.forEach(note => {
        const noteDate = new Date(note.date);
        if (!latestDate || noteDate > latestDate) {
            latestDate = noteDate;
        }
    });

    const dateStr = latestDate ? formatDate(latestDate) : '';

    // 计算笔记数量
    const noteCount = notes.length;

    // 获取分类颜色（二级分类使用主分类的颜色）
    const primaryCategoryForColor = currentView.primaryCategory || '';
    const categoryColor = getCategoryColor('primary', primaryCategoryForColor) || '#8B5CF6';
    
    folderCard.innerHTML = `
        <div class="folder-header">
            <div class="folder-dot" style="background: ${categoryColor};"></div>
            <div class="folder-title" style="color: ${categoryColor};">${escapeHtml(secondaryCategory)}</div>
        </div>
        <div class="folder-meta">
            <div class="folder-date">${dateStr}</div>
            <div class="folder-actions">
                <button class="folder-btn-edit" title="Edit" data-folder-type="secondary" data-folder-name="${escapeHtml(secondaryCategory)}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="folder-btn-delete" title="Delete" data-folder-type="secondary" data-folder-name="${escapeHtml(secondaryCategory)}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;

    return folderCard;
}

// 创建笔记卡片（参照 reading 界面风格）
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.setAttribute('data-note-id', note.id);
    card.setAttribute('data-title', note.topicTitle || '');
    card.setAttribute('data-primary-category', note.primaryCategory || '');
    card.setAttribute('data-secondary-category', note.secondaryCategory || '');

    const date = new Date(note.date);
    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const titleDisplay = note.topicTitle || 'Untitled Note';
    
    // 提取纯文本内容（移除 HTML 标签并解码 HTML 实体）
    let contentPreview = 'No content';
    if (note.descriptionFacts) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.descriptionFacts;
        contentPreview = tempDiv.textContent || tempDiv.innerText || '';
        if (contentPreview.length > 150) {
            contentPreview = contentPreview.substring(0, 150);
        }
    } else if (note.feelingsOpinions) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.feelingsOpinions;
        contentPreview = tempDiv.textContent || tempDiv.innerText || '';
        if (contentPreview.length > 150) {
            contentPreview = contentPreview.substring(0, 150);
        }
    } else if (note.reasonsEffects) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.reasonsEffects;
        contentPreview = tempDiv.textContent || tempDiv.innerText || '';
        if (contentPreview.length > 150) {
            contentPreview = contentPreview.substring(0, 150);
        }
    }

    // 获取关联的问题数量
    const linkedQuestionsCount = note.linkedQuestions ? note.linkedQuestions.length : 0;
    const linkedQuestionsBadge = linkedQuestionsCount > 0 
        ? `<span class="note-card-link-badge" title="${linkedQuestionsCount} linked question(s)"><i class="fas fa-link"></i> ${linkedQuestionsCount}</span>`
        : '';

    // 获取分类颜色
    const primaryCategory = note.primaryCategory || '';
    const categoryColor = getCategoryColor('primary', primaryCategory) || '#8B5CF6';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">
                <div class="note-card-dot" style="background: ${categoryColor};"></div>
                <h3>${escapeHtml(titleDisplay)}${linkedQuestionsBadge}</h3>
            </div>
            <div class="card-date">${dateStr}</div>
        </div>
        <div class="card-content">
            <p class="card-preview">${escapeHtml(contentPreview)}${contentPreview.length >= 150 ? '...' : ''}</p>
        </div>
    `;
    
    // 设置拖拽属性
    card.draggable = true;
    card.setAttribute('data-drag-type', 'note');
    
    return card;
}

// 初始化笔记卡片点击事件
function initNoteCardToggles() {
    const modal = document.getElementById('noteDetailsModal');
    const modalBody = document.getElementById('noteDetailsContent');
    const modalTitle = document.getElementById('noteDetailsTitle');
    const modalClose = document.getElementById('closeNoteDetailsModal');
    const editNoteBtn = document.getElementById('editNoteBtn');
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    
    if (!modal || !modalBody) {
        return;
    }
    
    document.querySelectorAll('[data-note-id]').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.btn-delete-note')) {
                return;
            }
            
            const noteId = this.getAttribute('data-note-id');
            const notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
            const note = notes.find(n => n.id === noteId);
            
            if (!note) {
                console.error('❌ Note not found:', noteId);
                return;
            }
            
            if (modalTitle) {
                modalTitle.textContent = note.topicTitle || 'Note Details';
            }
            
            // 构建详情内容
            let detailsHTML = '';
            
            // 合并前三部分为一行显示：Primary Category - Secondary Category - Topic
            const categoryParts = [];
            if (note.primaryCategory) {
                categoryParts.push(escapeHtml(note.primaryCategory));
            }
            if (note.secondaryCategory) {
                categoryParts.push(escapeHtml(note.secondaryCategory));
            }
            if (note.topicTitle) {
                categoryParts.push(escapeHtml(note.topicTitle));
            }
            
            if (categoryParts.length > 0) {
                detailsHTML += `<div class="detail-section"><h5>Category Path</h5><p style="font-weight: 500; color: var(--primary-purple);">${categoryParts.join(' - ')}</p></div>`;
            }
            
            if (note.descriptionFacts) {
                detailsHTML += `<div class="detail-section"><h5>Description & Facts</h5><div class="content-display" style="white-space: pre-wrap;">${escapeHtml(note.descriptionFacts)}</div></div>`;
            }
            
            if (note.feelingsOpinions) {
                detailsHTML += `<div class="detail-section"><h5>Personal Feelings & Opinions</h5><div class="content-display" style="white-space: pre-wrap;">${escapeHtml(note.feelingsOpinions)}</div></div>`;
            }
            
            if (note.reasonsEffects) {
                detailsHTML += `<div class="detail-section"><h5>Reasons & Effects</h5><div class="content-display" style="white-space: pre-wrap;">${escapeHtml(note.reasonsEffects)}</div></div>`;
            }
            
            if (note.comparison) {
                detailsHTML += `<div class="detail-section"><h5>Comparison & Contrast</h5><div class="content-display" style="white-space: pre-wrap;">${escapeHtml(note.comparison)}</div></div>`;
            }
            
            if (note.activitiesStories) {
                detailsHTML += `<div class="detail-section"><h5>Activities & Stories</h5><div class="content-display" style="white-space: pre-wrap;">${escapeHtml(note.activitiesStories)}</div></div>`;
            }
            
            // 显示关联的问题
            if (note.linkedQuestions && note.linkedQuestions.length > 0) {
                const questions = JSON.parse(localStorage.getItem('writingQuestions') || '[]');
                const linkedQuestionsList = note.linkedQuestions
                    .map(questionId => {
                        const question = questions.find(q => q.id === questionId);
                        return question ? question : null;
                    })
                    .filter(q => q !== null);
                
                if (linkedQuestionsList.length > 0) {
                    detailsHTML += `<div class="detail-section"><h5>Linked Questions (${linkedQuestionsList.length})</h5>`;
                    detailsHTML += `<div class="note-linked-questions-list">`;
                    linkedQuestionsList.forEach(question => {
                        const questionText = question.question || 'No question';
                        detailsHTML += `<div class="note-linked-question-item">
                            <span class="linked-question-text">${escapeHtml(questionText)}</span>
                        </div>`;
                    });
                    detailsHTML += `</div></div>`;
                }
            }
            
            if (!detailsHTML) {
                detailsHTML = '<div class="detail-section"><p style="color: var(--text-muted); font-style: italic;">No content</p></div>';
            }
            
            modalBody.innerHTML = detailsHTML;
            
            if (editNoteBtn) {
                editNoteBtn.style.display = 'inline-flex';
                editNoteBtn.setAttribute('data-note-id', noteId);
            }
            if (deleteNoteBtn) {
                deleteNoteBtn.style.display = 'inline-flex';
                deleteNoteBtn.setAttribute('data-note-id', noteId);
            }
            
            modal.style.display = 'block';
        });
    });
    
    if (editNoteBtn) {
        editNoteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const noteId = this.getAttribute('data-note-id');
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
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            modal.style.display = 'none';
            if (editNoteBtn) editNoteBtn.style.display = 'none';
            if (deleteNoteBtn) deleteNoteBtn.style.display = 'none';
        }
    });
}

// 初始化文件夹操作（编辑和删除）
function initFolderActions() {
    // 编辑按钮事件
    document.querySelectorAll('.folder-btn-edit').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止触发文件夹点击事件
            const folderType = btn.getAttribute('data-folder-type');
            const folderName = btn.getAttribute('data-folder-name');
            editFolder(folderType, folderName);
        });
    });

    // 删除按钮事件
    document.querySelectorAll('.folder-btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止触发文件夹点击事件
            const folderType = btn.getAttribute('data-folder-type');
            const folderName = btn.getAttribute('data-folder-name');
            deleteFolder(folderType, folderName);
        });
    });
}

// 编辑文件夹（重命名分类）
function editFolder(folderType, oldName) {
    const editModal = document.getElementById('editFolderModal');
    const editModalTitle = document.getElementById('editFolderModalTitle');
    const folderNameInput = document.getElementById('folderNameInput');
    const editFolderForm = document.getElementById('editFolderForm');
    const editFolderColorGroup = document.getElementById('editFolderColorGroup');
    const editFolderColorInput = document.getElementById('editFolderColor');
    
    if (!editModal || !folderNameInput || !editFolderForm) {
        console.error('❌ Edit folder modal elements not found');
        return;
    }
    
    // 设置模态框标题
    const categoryType = folderType === 'primary' ? 'Primary Category' : 'Secondary Category';
    if (editModalTitle) {
        editModalTitle.textContent = `Edit ${categoryType}`;
    }
    
    // 设置输入框的值
    folderNameInput.value = oldName;
    folderNameInput.select(); // 选中文本以便快速编辑
    
    // 显示/隐藏颜色选择器（只对主分类显示）
    if (editFolderColorGroup) {
        if (folderType === 'primary') {
            editFolderColorGroup.style.display = 'block';
            // 加载当前分类的颜色
            const currentColor = getCategoryColor('primary', oldName) || '#8B5CF6';
            if (editFolderColorInput) {
                editFolderColorInput.value = currentColor;
            }
        } else {
            editFolderColorGroup.style.display = 'none';
        }
    }
    
    // 存储当前编辑的文件夹信息
    editFolderForm.setAttribute('data-folder-type', folderType);
    editFolderForm.setAttribute('data-folder-name', oldName);
    
    // 显示模态框
    editModal.style.display = 'block';
}

// 删除文件夹（删除该分类下的所有笔记）
function deleteFolder(folderType, folderName) {
    const deleteModal = document.getElementById('deleteFolderModal');
    const deleteModalTitle = document.getElementById('deleteFolderModalTitle');
    const deleteMessage = document.getElementById('deleteFolderMessage');
    const confirmDeleteBtn = document.getElementById('confirmDeleteFolderBtn');
    
    if (!deleteModal || !deleteMessage || !confirmDeleteBtn) {
        console.error('❌ Delete folder modal elements not found');
        return;
    }
    
    // 设置模态框标题和消息
    const categoryType = folderType === 'primary' ? 'Primary Category' : 'Secondary Category';
    if (deleteModalTitle) {
        deleteModalTitle.textContent = `Delete ${categoryType}`;
    }
    
    const message = folderType === 'primary'
        ? `Are you sure you want to delete the primary category "<strong>${escapeHtml(folderName)}</strong>" and all its notes? This action cannot be undone.`
        : `Are you sure you want to delete the secondary category "<strong>${escapeHtml(folderName)}</strong>" and all its notes? This action cannot be undone.`;
    
    deleteMessage.innerHTML = message;
    
    // 存储当前删除的文件夹信息
    confirmDeleteBtn.setAttribute('data-folder-type', folderType);
    confirmDeleteBtn.setAttribute('data-folder-name', folderName);
    
    // 显示模态框
    deleteModal.style.display = 'block';
}

// 执行文件夹重命名
function executeEditFolder(folderType, oldName, newName) {
    if (!newName || newName.trim() === '' || newName.trim() === oldName) {
        return; // 名称未改变或为空
    }
    
    const trimmedName = newName.trim();
    let notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    
    if (folderType === 'primary') {
        // 重命名一级分类
        notes.forEach(note => {
            if (note.primaryCategory === oldName) {
                note.primaryCategory = trimmedName;
            }
        });
        
        // 更新颜色存储（如果名称改变，需要更新颜色的key）
        const colors = JSON.parse(localStorage.getItem('writingCategoryColors') || '{}');
        const oldColorKey = `primary_${oldName}`;
        const newColorKey = `primary_${trimmedName}`;
        if (colors[oldColorKey]) {
            colors[newColorKey] = colors[oldColorKey];
            delete colors[oldColorKey];
            localStorage.setItem('writingCategoryColors', JSON.stringify(colors));
        }
    } else if (folderType === 'secondary') {
        // 重命名二级分类
        const primaryCategory = currentView.primaryCategory;
        notes.forEach(note => {
            if (note.primaryCategory === primaryCategory && note.secondaryCategory === oldName) {
                note.secondaryCategory = trimmedName;
            }
        });
    }
    
    localStorage.setItem('writingNotes', JSON.stringify(notes));
    
    // 重新加载并显示笔记（保持当前视图状态）
    loadAndDisplayNotes(currentView.type, currentView.primaryCategory, currentView.secondaryCategory);
}

// 执行文件夹删除
function executeDeleteFolder(folderType, folderName) {
    let notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    
    if (folderType === 'primary') {
        // 删除一级分类下的所有笔记
        notes = notes.filter(note => note.primaryCategory !== folderName);
    } else if (folderType === 'secondary') {
        // 删除二级分类下的所有笔记
        const primaryCategory = currentView.primaryCategory;
        notes = notes.filter(note => !(note.primaryCategory === primaryCategory && note.secondaryCategory === folderName));
    }
    
    localStorage.setItem('writingNotes', JSON.stringify(notes));
    
    // 重新加载并显示笔记
    if (folderType === 'primary') {
        loadAndDisplayNotes('root', null, null);
    } else {
        loadAndDisplayNotes('primary', currentView.primaryCategory, null);
    }
}

// 初始化文件夹导航功能
function initFolderNavigation() {
    // 一级文件夹点击事件
    document.querySelectorAll('.folder-primary').forEach(folder => {
        folder.addEventListener('click', function(e) {
            // 如果点击的是按钮或其他交互元素，不触发
            if (e.target.closest('button')) {
                return;
            }
            const primaryCategory = folder.getAttribute('data-folder-name');
            loadAndDisplayNotes('primary', primaryCategory, null);
        });
    });

    // 二级文件夹点击事件
    document.querySelectorAll('.folder-secondary').forEach(folder => {
        folder.addEventListener('click', function(e) {
            // 如果点击的是按钮或其他交互元素，不触发
            if (e.target.closest('button')) {
                return;
            }
            const secondaryCategory = folder.getAttribute('data-folder-name');
            // 从当前视图获取 primary category
            const primaryCategory = currentView.primaryCategory;
            loadAndDisplayNotes('secondary', primaryCategory, secondaryCategory);
        });
    });

    // 返回按钮事件
    const backBtn = document.getElementById('backToParent');
    if (backBtn) {
        // 移除旧的事件监听器（如果存在）
        backBtn.replaceWith(backBtn.cloneNode(true));
        const newBackBtn = document.getElementById('backToParent');
        
        newBackBtn.addEventListener('click', function() {
            console.log('🔙 Back button clicked, current view:', currentView);
            if (currentView.type === 'secondary') {
                // 从二级分类（笔记列表）返回到一级分类（二级分类列表）
                console.log('Returning to primary view:', currentView.primaryCategory);
                loadAndDisplayNotes('primary', currentView.primaryCategory, null);
            } else if (currentView.type === 'primary') {
                // 从一级分类返回到根目录
                console.log('Returning to root view');
                loadAndDisplayNotes('root', null, null);
            }
        });
    }
}

// ==================== 搜索功能 ====================

// 搜索功能
function initSearch() {
    console.log('🔍 Initializing search functionality...');
    
    const searchInput = document.getElementById('noteSearch');
    const clearBtn = document.getElementById('clearSearch');
    const noteCount = document.getElementById('noteCount');
    
    if (!searchInput) {
        console.log('❌ Search input not found');
        return;
    }
    
    function updateNoteCount() {
        const questionCards = document.querySelectorAll('[data-question-id]');
        const noteCards = document.querySelectorAll('[data-note-id]');
        const total = questionCards.length + noteCards.length;
        if (noteCount) {
            noteCount.textContent = `${total} items found`;
        }
    }
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log(`Searching: "${searchTerm}"`);
        
        const questionCards = document.querySelectorAll('[data-question-id]');
        const noteCards = document.querySelectorAll('[data-note-id]');
        let visibleCount = 0;
        
        questionCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const chapter = card.getAttribute('data-chapter') || '';
            const test = card.getAttribute('data-test') || '';
            const task = card.getAttribute('data-task') || '';
            
            const matches = text.includes(searchTerm) || 
                           chapter.toLowerCase().includes(searchTerm) ||
                           test.toLowerCase().includes(searchTerm) ||
                           task.toLowerCase().includes(searchTerm);
            
            if (searchTerm === '' || matches) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        noteCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const title = card.getAttribute('data-title') || '';
            const primaryCategory = card.getAttribute('data-primary-category') || '';
            const secondaryCategory = card.getAttribute('data-secondary-category') || '';
            
            const matches = text.includes(searchTerm) || 
                           title.toLowerCase().includes(searchTerm) ||
                           primaryCategory.toLowerCase().includes(searchTerm) ||
                           secondaryCategory.toLowerCase().includes(searchTerm);
            
            if (searchTerm === '' || matches) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        console.log(`Showing ${visibleCount} items`);
        if (noteCount) {
            noteCount.textContent = `${visibleCount} items found`;
        }
    }
    
    searchInput.addEventListener('input', performSearch);
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            performSearch();
            searchInput.focus();
            console.log('🗑️ Search cleared');
        });
    }
    
    // Initial count
    updateNoteCount();
    console.log('✅ Search functionality initialized');
}

// 分类颜色管理函数
function getCategoryColor(type, categoryName) {
    const colors = JSON.parse(localStorage.getItem('writingCategoryColors') || '{}');
    const key = `${type}_${categoryName}`;
    return colors[key] || null;
}

function setCategoryColor(type, categoryName, color) {
    const colors = JSON.parse(localStorage.getItem('writingCategoryColors') || '{}');
    const key = `${type}_${categoryName}`;
    colors[key] = color;
    localStorage.setItem('writingCategoryColors', JSON.stringify(colors));
}

// 初始化颜色选择器（用于添加和编辑分类时的颜色选择）
function initColorPicker() {
    // 预设颜色按钮点击事件（添加分类时）
    document.addEventListener('click', function(e) {
        if (e.target.closest('.color-preset-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.color-preset-btn');
            const color = btn.getAttribute('data-color');
            const colorInput = document.getElementById('primaryCategoryColor');
            if (colorInput) {
                colorInput.value = color;
            }
        }
        // 预设颜色按钮点击事件（编辑分类时）
        if (e.target.closest('.color-preset-btn-edit')) {
            e.preventDefault();
            const btn = e.target.closest('.color-preset-btn-edit');
            const color = btn.getAttribute('data-color');
            const colorInput = document.getElementById('editFolderColor');
            if (colorInput) {
                colorInput.value = color;
            }
        }
    });
}

// 页面加载完成后运行
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ========== Speaking page loaded ==========');
    console.log('🚀 Starting initialization...');
    loadAndDisplayQuestions();
    console.log('🚀 loadAndDisplayQuestions() completed');
    loadAndDisplayNotes('root', null, null);
    console.log('🚀 loadAndDisplayNotes() completed');
    initSearch();
    console.log('🚀 initSearch() completed');
    initColorPicker();
    console.log('🚀 initColorPicker() completed');
    initAddQuestion();
    console.log('🚀 initAddQuestion() completed');
    initAddNote();
    console.log('🚀 initAddNote() completed');
    initFolderModals();
    console.log('🚀 initFolderModals() completed');
    console.log('🚀 ========== All initialization completed ==========');
});

// 初始化文件夹模态框
function initFolderModals() {
    // 编辑文件夹模态框
    const editModal = document.getElementById('editFolderModal');
    const editFolderForm = document.getElementById('editFolderForm');
    const closeEditModal = document.getElementById('closeEditFolderModal');
    
    if (editFolderForm) {
        editFolderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const folderType = editFolderForm.getAttribute('data-folder-type');
            const oldName = editFolderForm.getAttribute('data-folder-name');
            const folderNameInput = document.getElementById('folderNameInput');
            const editFolderColorInput = document.getElementById('editFolderColor');
            const newName = folderNameInput?.value.trim() || '';
            
            // 如果是主分类，保存颜色
            if (folderType === 'primary' && editFolderColorInput) {
                const newColor = editFolderColorInput.value;
                // 如果名称改变了，需要更新颜色的key
                if (newName && newName !== oldName) {
                    // 保存新名称对应的颜色
                    setCategoryColor('primary', newName, newColor);
                    // 删除旧名称对应的颜色
                    const colors = JSON.parse(localStorage.getItem('writingCategoryColors') || '{}');
                    delete colors[`primary_${oldName}`];
                    localStorage.setItem('writingCategoryColors', JSON.stringify(colors));
                } else if (newName) {
                    // 名称没变，直接更新颜色
                    setCategoryColor('primary', oldName, newColor);
                }
            }
            
            if (newName && newName !== oldName) {
                executeEditFolder(folderType, oldName, newName);
            } else if (folderType === 'primary' && editFolderColorInput) {
                // 即使名称没变，如果颜色改变了，也需要重新加载显示
                loadAndDisplayNotes(currentView.type, currentView.primaryCategory, currentView.secondaryCategory);
            }
            
            if (newName) {
                editModal.style.display = 'none';
                editFolderForm.reset();
            }
        });
    }
    
    if (closeEditModal) {
        closeEditModal.addEventListener('click', function() {
            editModal.style.display = 'none';
            editFolderForm?.reset();
        });
    }
    
    // 点击模态框外部关闭
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === editModal) {
                editModal.style.display = 'none';
                editFolderForm?.reset();
            }
        });
    }
    
    // 删除文件夹模态框
    const deleteModal = document.getElementById('deleteFolderModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteFolderBtn');
    const closeDeleteModal = document.getElementById('closeDeleteFolderModal');
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const folderType = confirmDeleteBtn.getAttribute('data-folder-type');
            const folderName = confirmDeleteBtn.getAttribute('data-folder-name');
            
            if (folderType && folderName) {
                executeDeleteFolder(folderType, folderName);
                deleteModal.style.display = 'none';
            }
        });
    }
    
    if (closeDeleteModal) {
        closeDeleteModal.addEventListener('click', function() {
            deleteModal.style.display = 'none';
        });
    }
    
    // 点击模态框外部关闭
    if (deleteModal) {
        deleteModal.addEventListener('click', function(e) {
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
            }
        });
    }
    
    // ESC 键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (editModal && editModal.style.display === 'block') {
                editModal.style.display = 'none';
                editFolderForm?.reset();
            }
            if (deleteModal && deleteModal.style.display === 'block') {
                deleteModal.style.display = 'none';
            }
        }
    });
    
    console.log('✅ Folder modals initialized');
}

// ==================== 拖拽关联功能 ====================

// 全局变量存储当前拖拽的数据
let currentDragData = null;

// 初始化拖拽功能
function initDragAndDrop() {
    // 问题卡片拖拽事件
    document.querySelectorAll('.question-card[data-drag-type="question"]').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    // 笔记卡片拖拽事件
    document.querySelectorAll('.note-card[data-drag-type="note"]').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    // 问题卡片作为放置目标
    document.querySelectorAll('.question-card[data-drag-type="question"]').forEach(card => {
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
    });

    // 笔记卡片作为放置目标
    document.querySelectorAll('.note-card[data-drag-type="note"]').forEach(card => {
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
    });

    console.log('✅ Drag and drop initialized');
}

// 拖拽开始
function handleDragStart(e) {
    const card = e.currentTarget;
    const dragType = card.getAttribute('data-drag-type');
    const id = dragType === 'question' 
        ? card.getAttribute('data-question-id')
        : card.getAttribute('data-note-id');
    
    // 存储拖拽数据到全局变量
    currentDragData = {
        type: dragType,
        id: id
    };
    
    e.dataTransfer.effectAllowed = 'link';
    e.dataTransfer.setData('text/plain', JSON.stringify(currentDragData));
    
    card.classList.add('dragging');
    card.style.opacity = '0.5';
}

// 拖拽结束
function handleDragEnd(e) {
    const card = e.currentTarget;
    card.classList.remove('dragging');
    card.style.opacity = '1';
    
    // 移除所有高亮
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
    
    // 清空拖拽数据
    currentDragData = null;
}

// 拖拽悬停
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
}

// 拖拽进入
function handleDragEnter(e) {
    e.preventDefault();
    const card = e.currentTarget;
    
    // 使用全局变量获取拖拽数据（因为某些浏览器在dragenter中无法获取dataTransfer数据）
    if (!currentDragData) return;
    
    const cardType = card.getAttribute('data-drag-type');
    
    // 只有不同类型才能关联（问题关联笔记，笔记关联问题）
    if (currentDragData.type && currentDragData.type !== cardType) {
        card.classList.add('drag-over');
    }
}

// 拖拽离开
function handleDragLeave(e) {
    const card = e.currentTarget;
    card.classList.remove('drag-over');
}

// 放置
function handleDrop(e) {
    e.preventDefault();
    const targetCard = e.currentTarget;
    targetCard.classList.remove('drag-over');
    
    // 使用全局变量获取拖拽数据
    if (!currentDragData) return;
    
    const targetType = targetCard.getAttribute('data-drag-type');
    const targetId = targetType === 'question'
        ? targetCard.getAttribute('data-question-id')
        : targetCard.getAttribute('data-note-id');
    
    // 只有不同类型才能关联
    if (!currentDragData.type || !currentDragData.id || currentDragData.type === targetType) {
        return;
    }
    
    if (currentDragData.type === 'question' && targetType === 'note') {
        // 问题关联到笔记
        linkQuestionToNote(currentDragData.id, targetId);
    } else if (currentDragData.type === 'note' && targetType === 'question') {
        // 笔记关联到问题
        linkNoteToQuestion(currentDragData.id, targetId);
    }
    
    // 清空拖拽数据
    currentDragData = null;
}

// 将问题关联到笔记
function linkQuestionToNote(questionId, noteId) {
    let questions = JSON.parse(localStorage.getItem('writingQuestions') || '[]');
    let notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    
    const question = questions.find(q => q.id === questionId);
    const note = notes.find(n => n.id === noteId);
    
    if (!question || !note) {
        console.error('Question or note not found');
        return;
    }
    
    // 初始化关联数组
    if (!question.linkedNotes) {
        question.linkedNotes = [];
    }
    if (!note.linkedQuestions) {
        note.linkedQuestions = [];
    }
    
    // 检查是否已关联
    if (question.linkedNotes.includes(noteId)) {
        console.log('Already linked');
        return;
    }
    
    // 添加关联
    question.linkedNotes.push(noteId);
    note.linkedQuestions.push(questionId);
    
    localStorage.setItem('writingQuestions', JSON.stringify(questions));
    localStorage.setItem('writingNotes', JSON.stringify(notes));
    
    // 重新加载显示
    loadAndDisplayQuestions();
    loadAndDisplayNotes(currentView.type, currentView.primaryCategory, currentView.secondaryCategory);
    
    console.log('✅ Question linked to note');
}

// 将笔记关联到问题
function linkNoteToQuestion(noteId, questionId) {
    linkQuestionToNote(questionId, noteId); // 双向关联，调用同一个函数
}

// 更新关联内容显示
function updateLinkedContent() {
    const questions = JSON.parse(localStorage.getItem('writingQuestions') || '[]');
    const notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    
    // 更新问题卡片中的关联笔记列表
    questions.forEach(question => {
        if (question.linkedNotes && question.linkedNotes.length > 0) {
            const linkedList = document.getElementById(`linked-notes-${question.id}`);
            if (linkedList) {
                linkedList.innerHTML = '';
                question.linkedNotes.forEach(noteId => {
                    const note = notes.find(n => n.id === noteId);
                    if (note) {
                        const noteItem = document.createElement('div');
                        noteItem.className = 'question-card-linked-item';
                        noteItem.innerHTML = `
                            <span class="linked-item-title" data-note-id="${noteId}">${escapeHtml(note.topicTitle || 'Untitled')}</span>
                            <button class="linked-item-remove" data-note-id="${noteId}" data-question-id="${question.id}" title="Remove link">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                        linkedList.appendChild(noteItem);
                        
                        // 添加点击跳转事件
                        const titleSpan = noteItem.querySelector('.linked-item-title');
                        if (titleSpan) {
                            titleSpan.addEventListener('click', function(e) {
                                e.stopPropagation();
                                const noteId = this.getAttribute('data-note-id');
                                navigateToNote(noteId);
                            });
                        }
                    }
                });
            }
        }
    });
    
    // 初始化删除关联按钮事件
    document.querySelectorAll('.linked-item-remove').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const questionId = this.getAttribute('data-question-id');
            const noteId = this.getAttribute('data-note-id');
            unlinkQuestionFromNote(questionId, noteId);
        });
    });
}

// 取消关联
function unlinkQuestionFromNote(questionId, noteId) {
    let questions = JSON.parse(localStorage.getItem('writingQuestions') || '[]');
    let notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    
    const question = questions.find(q => q.id === questionId);
    const note = notes.find(n => n.id === noteId);
    
    if (question && question.linkedNotes) {
        question.linkedNotes = question.linkedNotes.filter(id => id !== noteId);
    }
    
    if (note && note.linkedQuestions) {
        note.linkedQuestions = note.linkedQuestions.filter(id => id !== questionId);
    }
    
    localStorage.setItem('writingQuestions', JSON.stringify(questions));
    localStorage.setItem('writingNotes', JSON.stringify(notes));
    
    // 重新加载显示
    loadAndDisplayQuestions();
    loadAndDisplayNotes(currentView.type, currentView.primaryCategory, currentView.secondaryCategory);
    
    console.log('✅ Link removed');
}

// 导航到笔记
function navigateToNote(noteId) {
    const notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
        console.error('Note not found:', noteId);
        return;
    }
    
    // 导航到对应的二级分类视图
    const primaryCategory = note.primaryCategory;
    const secondaryCategory = note.secondaryCategory;
    
    if (primaryCategory && secondaryCategory) {
        loadAndDisplayNotes('secondary', primaryCategory, secondaryCategory);
        
        // 滚动到对应的笔记卡片
        setTimeout(() => {
            const noteCard = document.querySelector(`[data-note-id="${noteId}"]`);
            if (noteCard) {
                noteCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 高亮显示
                noteCard.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.3)';
                setTimeout(() => {
                    noteCard.style.boxShadow = '';
                }, 2000);
            }
        }, 100);
    }
}

// 导航到笔记
function navigateToNote(noteId) {
    const notes = JSON.parse(localStorage.getItem('writingNotes') || '[]');
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
        console.error('Note not found:', noteId);
        return;
    }
    
    // 导航到对应的二级分类视图
    const primaryCategory = note.primaryCategory;
    const secondaryCategory = note.secondaryCategory;
    
    if (primaryCategory && secondaryCategory) {
        loadAndDisplayNotes('secondary', primaryCategory, secondaryCategory);
        
        // 滚动到对应的笔记卡片
        setTimeout(() => {
            const noteCard = document.querySelector(`[data-note-id="${noteId}"]`);
            if (noteCard) {
                noteCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 高亮显示
                noteCard.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.3)';
                setTimeout(() => {
                    noteCard.style.boxShadow = '';
                }, 2000);
            }
        }, 100);
    }
}
