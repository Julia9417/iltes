// IndexedDB 数据管理模块
console.log('📦 IndexedDB Manager loaded');

class DBManager {
    constructor() {
        this.dbName = 'IELTSNotesDB';
        this.dbVersion = 2; // 更新版本号以匹配现有数据库
        this.db = null;
        this.initPromise = null;
    }

    // 初始化数据库
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            // 使用更高的版本号打开数据库，如果数据库已存在且版本更高，会自动使用现有版本
            // 如果数据库不存在，会触发 onupgradeneeded
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB 打开失败:', request.error);
                // 如果版本错误，尝试删除旧数据库并重新创建
                if (request.error && request.error.name === 'VersionError') {
                    console.log('🔄 检测到版本冲突，尝试重新创建数据库...');
                    this.recreateDatabase().then(resolve).catch(reject);
                    return;
                }
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                const actualVersion = this.db.version;
                console.log(`✅ IndexedDB 初始化成功 (版本: ${actualVersion})`);
                // 更新内部版本号以匹配实际版本
                this.dbVersion = actualVersion;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;
                console.log(`🔄 数据库升级: ${oldVersion} -> ${newVersion}`);

                // 创建笔记存储对象
                if (!db.objectStoreNames.contains('notes')) {
                    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
                    notesStore.createIndex('category', 'category', { unique: false });
                    notesStore.createIndex('chapter', 'chapter', { unique: false });
                    notesStore.createIndex('date', 'date', { unique: false });
                }

                // 创建精听记录存储对象
                if (!db.objectStoreNames.contains('practiceRecords')) {
                    const practiceStore = db.createObjectStore('practiceRecords', { keyPath: 'id', autoIncrement: true });
                    practiceStore.createIndex('date', 'date', { unique: false });
                }

                // 创建备份存储对象
                if (!db.objectStoreNames.contains('backups')) {
                    const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
                    backupStore.createIndex('date', 'date', { unique: false });
                }

                console.log('✅ IndexedDB 对象存储创建完成');
            };

            request.onblocked = () => {
                console.warn('⚠️ IndexedDB 升级被阻塞，请关闭其他标签页');
            };
        });

        return this.initPromise;
    }

    // 重新创建数据库（用于解决版本冲突）
    async recreateDatabase() {
        return new Promise((resolve, reject) => {
            console.log('🗑️ 删除旧数据库...');
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            
            deleteRequest.onsuccess = () => {
                console.log('✅ 旧数据库已删除，重新创建...');
                // 重置初始化promise，重新初始化
                this.initPromise = null;
                this.init().then(resolve).catch(reject);
            };
            
            deleteRequest.onerror = () => {
                console.error('❌ 删除数据库失败:', deleteRequest.error);
                reject(deleteRequest.error);
            };
            
            deleteRequest.onblocked = () => {
                console.warn('⚠️ 数据库删除被阻塞，请关闭其他标签页');
                // 等待一段时间后重试
                setTimeout(() => {
                    this.recreateDatabase().then(resolve).catch(reject);
                }, 1000);
            };
        });
    }

    // 获取所有笔记
    async getAllNotes() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readonly');
            const store = transaction.objectStore('notes');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                console.error('获取笔记失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 保存笔记（添加或更新）
    async saveNote(note) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readwrite');
            const store = transaction.objectStore('notes');
            const request = store.put(note);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('保存笔记失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 批量保存笔记
    async saveNotes(notes) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readwrite');
            const store = transaction.objectStore('notes');
            let completed = 0;
            let errors = [];

            notes.forEach((note, index) => {
                const request = store.put(note);
                request.onsuccess = () => {
                    completed++;
                    if (completed === notes.length) {
                        if (errors.length > 0) {
                            reject(new Error('部分笔记保存失败'));
                        } else {
                            resolve();
                        }
                    }
                };
                request.onerror = () => {
                    errors.push({ index, error: request.error });
                    completed++;
                    if (completed === notes.length) {
                        if (errors.length > 0) {
                            reject(new Error('部分笔记保存失败'));
                        } else {
                            resolve();
                        }
                    }
                };
            });
        });
    }

    // 删除笔记
    async deleteNote(noteId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readwrite');
            const store = transaction.objectStore('notes');
            const request = store.delete(noteId);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                console.error('删除笔记失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 获取单个笔记
    async getNote(noteId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readonly');
            const store = transaction.objectStore('notes');
            const request = store.get(noteId);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                console.error('获取笔记失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 保存精听记录
    async savePracticeRecord(record) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['practiceRecords'], 'readwrite');
            const store = transaction.objectStore('practiceRecords');
            const request = store.add(record);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('保存精听记录失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 获取最近的精听记录
    async getRecentPracticeRecords(limit = 10) {
        await this.init();
        return new Promise((resolve, reject) => {
            // 检查 store 是否存在
            if (!this.db.objectStoreNames.contains('practiceRecords')) {
                console.log('⚠️ practiceRecords store 不存在，返回空数组');
                resolve([]);
                return;
            }
            
            try {
                const transaction = this.db.transaction(['practiceRecords'], 'readonly');
                const store = transaction.objectStore('practiceRecords');
                
                // 检查索引是否存在
                if (!store.indexNames.contains('date')) {
                    // 如果没有索引，使用 getAll
                    const request = store.getAll();
                    request.onsuccess = () => {
                        const allRecords = request.result || [];
                        // 按日期排序并限制数量
                        const sortedRecords = allRecords
                            .sort((a, b) => {
                                const dateA = new Date(a.date || 0);
                                const dateB = new Date(b.date || 0);
                                return dateB - dateA;
                            })
                            .slice(0, limit);
                        resolve(sortedRecords);
                    };
                    request.onerror = () => {
                        console.warn('获取精听记录失败，返回空数组:', request.error);
                        resolve([]);
                    };
                    return;
                }
                
                const index = store.index('date');
                const request = index.openCursor(null, 'prev'); // 降序

                const records = [];
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor && records.length < limit) {
                        records.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(records);
                    }
                };

                request.onerror = () => {
                    console.warn('获取精听记录失败，返回空数组:', request.error);
                    resolve([]); // 不拒绝，返回空数组
                };
            } catch (e) {
                console.warn('获取精听记录时出错，返回空数组:', e);
                resolve([]); // 不拒绝，返回空数组
            }
        });
    }

    // 获取最近三次精听的笔记ID
    async getRecentPracticeNoteIds(limit = 3) {
        const records = await this.getRecentPracticeRecords(limit);
        const noteIds = new Set();
        records.forEach(record => {
            if (record.noteIds && Array.isArray(record.noteIds)) {
                record.noteIds.forEach(id => noteIds.add(id));
            }
        });
        return Array.from(noteIds);
    }

    // 清空所有数据
    async clearAll() {
        await this.init();
        return new Promise((resolve, reject) => {
            // 只清空存在的 store
            const existingStores = [];
            ['notes', 'practiceRecords', 'backups'].forEach(storeName => {
                if (this.db.objectStoreNames.contains(storeName)) {
                    existingStores.push(storeName);
                }
            });
            
            if (existingStores.length === 0) {
                resolve();
                return;
            }
            
            const transaction = this.db.transaction(existingStores, 'readwrite');
            
            let completed = 0;
            const total = existingStores.length;

            existingStores.forEach(storeName => {
                try {
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    request.onsuccess = () => {
                        completed++;
                        if (completed === total) {
                            resolve();
                        }
                    };
                    request.onerror = () => {
                        console.warn(`清空 ${storeName} 失败:`, request.error);
                        completed++;
                        if (completed === total) {
                            // 即使有错误也继续，因为可能某些 store 不存在
                            resolve();
                        }
                    };
                } catch (e) {
                    console.warn(`访问 ${storeName} 失败:`, e);
                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                }
            });
        });
    }

    // 估算存储使用情况
    async getStorageInfo() {
        await this.init();
        const notes = await this.getAllNotes();
        const notesSize = this.estimateSize(notes);
        
        // IndexedDB 不提供直接的存储大小查询，我们估算
        return {
            notesCount: notes.length,
            estimatedSizeMB: notesSize.mb,
            storageType: 'IndexedDB'
        };
    }

    // 估算数据大小
    estimateSize(data) {
        const dataStr = JSON.stringify(data);
        const sizeInBytes = new Blob([dataStr]).size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        return {
            bytes: sizeInBytes,
            mb: parseFloat(sizeInMB)
        };
    }

    // 数据格式转换函数 - 将旧格式转换为新格式
    normalizeNote(note) {
        const normalized = { ...note };
        
        // 1. 确保有ID
        if (!normalized.id) {
            normalized.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        // 2. 处理日期字段 - 支持多种格式
        if (normalized.date) {
            let dateValue = normalized.date;
            
            // 如果是字符串，尝试解析
            if (typeof dateValue === 'string') {
                // 尝试解析ISO格式
                const parsed = new Date(dateValue);
                if (!isNaN(parsed.getTime())) {
                    normalized.date = parsed.toISOString();
                } else {
                    // 如果解析失败，使用当前时间
                    console.warn(`日期格式无效，使用当前时间: ${dateValue}`);
                    normalized.date = new Date().toISOString();
                }
            } else if (dateValue instanceof Date) {
                // 如果是Date对象，转换为ISO字符串
                normalized.date = dateValue.toISOString();
            } else if (typeof dateValue === 'number') {
                // 如果是时间戳，转换为ISO字符串
                normalized.date = new Date(dateValue).toISOString();
            } else {
                // 其他情况，使用当前时间
                normalized.date = new Date().toISOString();
            }
        } else {
            // 如果没有日期，使用当前时间
            normalized.date = new Date().toISOString();
        }
        
        // 3. section → part 映射（兼容旧格式）
        if (normalized.section && !normalized.part) {
            // 如果存在section字段但没有part字段，将section转换为part
            normalized.part = normalized.section;
        }
        
        // 4. key phrases 和 highlights → key points 合并
        const keyPointsArray = [];
        
        // 处理 key phrases
        if (normalized.keyPhrases) {
            if (Array.isArray(normalized.keyPhrases)) {
                keyPointsArray.push(...normalized.keyPhrases);
            } else if (typeof normalized.keyPhrases === 'string' && normalized.keyPhrases.trim()) {
                keyPointsArray.push(normalized.keyPhrases.trim());
            }
        }
        
        // 处理 highlights
        if (normalized.highlights) {
            if (Array.isArray(normalized.highlights)) {
                keyPointsArray.push(...normalized.highlights);
            } else if (typeof normalized.highlights === 'string' && normalized.highlights.trim()) {
                keyPointsArray.push(normalized.highlights.trim());
            }
        }
        
        // 如果合并后有内容，使用合并后的；否则使用原有的keyPoints
        if (keyPointsArray.length > 0) {
            normalized.keyPoints = keyPointsArray;
        } else if (!normalized.keyPoints || !Array.isArray(normalized.keyPoints)) {
            normalized.keyPoints = [];
        }
        
        // 5. 处理编码问题 - 修复可能的乱码
        // 处理 HTML 实体编码
        const decodeHtmlEntities = (str) => {
            if (!str || typeof str !== 'string') return str;
            const textarea = document.createElement('textarea');
            textarea.innerHTML = str;
            return textarea.value;
        };
        
        // 处理字符串字段的编码
        if (normalized.content && typeof normalized.content === 'string') {
            // 尝试解码 HTML 实体
            try {
                normalized.content = decodeHtmlEntities(normalized.content);
            } catch (e) {
                console.warn('解码 content 失败:', e);
            }
        }
        
        // 处理 keyPoints 数组中的编码
        if (normalized.keyPoints && Array.isArray(normalized.keyPoints)) {
            normalized.keyPoints = normalized.keyPoints.map(point => {
                if (typeof point === 'string') {
                    try {
                        return decodeHtmlEntities(point);
                    } catch (e) {
                        return point;
                    }
                }
                return point;
            });
        }
        
        // 处理其他字符串字段
        const stringFields = ['chapter', 'test', 'part', 'question', 'errorReason', 'tags'];
        stringFields.forEach(field => {
            if (normalized[field] && typeof normalized[field] === 'string') {
                try {
                    normalized[field] = decodeHtmlEntities(normalized[field]);
                } catch (e) {
                    // 忽略解码错误
                }
            }
        });
        
        // 6. 确保必需字段存在
        normalized.chapter = normalized.chapter || '';
        normalized.test = normalized.test || '';
        normalized.part = normalized.part || '';
        normalized.questionType = normalized.questionType || 'other';
        normalized.question = normalized.question || '';
        normalized.errorReason = normalized.errorReason || '';
        normalized.content = normalized.content || '';
        normalized.tags = normalized.tags || '';
        normalized.audioData = normalized.audioData || null;
        normalized.imageData = normalized.imageData || null;
        
        // 4. 处理问题类型映射（兼容旧格式）
        const questionTypeMap = {
            'multiple-choice': 'multiple-choice',
            'single-choice': 'single-choice',
            'single choice': 'single-choice',
            'multiple choice': 'multiple-choice',
            'map': 'map',
            'map-labeling': 'map',
            'map labeling': 'map',
            'matching': 'matching',
            'other': 'other'
        };
        
        if (normalized.questionType && questionTypeMap[normalized.questionType.toLowerCase()]) {
            normalized.questionType = questionTypeMap[normalized.questionType.toLowerCase()];
        }
        
        return normalized;
    }

    // 批量规范化笔记
    normalizeNotes(notes) {
        return notes.map(note => this.normalizeNote(note));
    }

    // 从localStorage迁移数据到IndexedDB
    async migrateFromLocalStorage() {
        try {
            const notes = JSON.parse(localStorage.getItem('listeningNotes') || '[]');
            const recentPractice = JSON.parse(localStorage.getItem('recentPractice') || '[]');

            if (notes.length > 0) {
                // 规范化数据格式
                const normalizedNotes = this.normalizeNotes(notes);
                await this.saveNotes(normalizedNotes);
                console.log(`✅ 已迁移 ${notes.length} 条笔记到 IndexedDB`);
            }

            if (recentPractice.length > 0) {
                for (const record of recentPractice) {
                    await this.savePracticeRecord(record);
                }
                console.log(`✅ 已迁移 ${recentPractice.length} 条精听记录到 IndexedDB`);
            }

            // 标记已迁移
            localStorage.setItem('migratedToIndexedDB', 'true');
            
            return { notes: notes.length, practice: recentPractice.length };
        } catch (e) {
            console.error('迁移失败:', e);
            throw e;
        }
    }

    // 修复现有IndexedDB中的数据格式
    async fixExistingData() {
        try {
            await this.init();
            const notes = await this.getAllNotes();
            
            if (notes.length === 0) {
                console.log('📝 没有需要修复的数据');
                return { fixed: 0, total: 0 };
            }
            
            console.log(`🔧 开始修复 ${notes.length} 条笔记的数据格式...`);
            
            // 规范化所有笔记
            const normalizedNotes = this.normalizeNotes(notes);
            
            // 检查是否有需要修复的笔记
            let fixedCount = 0;
            for (let i = 0; i < notes.length; i++) {
                const original = notes[i];
                const normalized = normalizedNotes[i];
                
                // 检查是否有变化
                if (JSON.stringify(original) !== JSON.stringify(normalized)) {
                    await this.saveNote(normalized);
                    fixedCount++;
                }
            }
            
            console.log(`✅ 数据修复完成: ${fixedCount} 条笔记已更新`);
            return { fixed: fixedCount, total: notes.length };
        } catch (e) {
            console.error('修复数据失败:', e);
            throw e;
        }
    }
}

// 创建全局实例
const dbManager = new DBManager();

// 初始化数据库
dbManager.init().then(async () => {
    // 检查是否需要迁移
    const migrated = localStorage.getItem('migratedToIndexedDB');
    if (!migrated) {
        console.log('🔄 检测到需要从 localStorage 迁移数据...');
        try {
            const result = await dbManager.migrateFromLocalStorage();
            console.log('✅ 数据迁移完成:', result);
        } catch (e) {
            console.error('数据迁移失败:', e);
        }
    }
    
    // 修复现有数据格式（无论是否迁移过）
    console.log('🔧 检查并修复现有数据格式...');
    try {
        const fixResult = await dbManager.fixExistingData();
        if (fixResult.fixed > 0) {
            console.log(`✅ 已修复 ${fixResult.fixed} 条笔记的数据格式`);
            // 如果修复了数据，提示用户刷新
            if (typeof window !== 'undefined' && window.location) {
                // 延迟提示，让用户看到消息
                setTimeout(() => {
                    if (confirm(`已修复 ${fixResult.fixed} 条笔记的数据格式。是否刷新页面以查看更新？`)) {
                        window.location.reload();
                    }
                }, 1000);
            }
        } else {
            console.log('✅ 所有数据格式正确，无需修复');
        }
    } catch (e) {
        console.error('数据修复失败:', e);
    }
}).catch(e => {
    console.error('IndexedDB 初始化失败:', e);
    alert('数据库初始化失败，请刷新页面重试。\n如果问题持续，请检查浏览器是否支持 IndexedDB。');
});

// 导出到全局
if (typeof window !== 'undefined') {
    window.DBManager = DBManager;
    window.dbManager = dbManager;
}

