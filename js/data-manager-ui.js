/**
 * ChatGalaxy 数据管理器 UI 控制器
 * 处理数据管理页面的所有交互逻辑
 * @version 2.0.0
 * @updated 2026-01-06
 */

// ========== 本地日志包装器 ==========
// 防止 Log 未定义时出错（IIFE 在 log-wrapper.js 加载前执行）
if (!window.Log) {
    window.Log = {
        info: (tag, ...msg) => console.log(`[INFO] [${tag}]`, ...msg),
        warn: (tag, ...msg) => console.warn(`[WARN] [${tag}]`, ...msg),
        error: (tag, ...msg) => console.error(`[ERROR] [${tag}]`, ...msg),
        debug: (tag, ...msg) => console.log(`[DEBUG] [${tag}]`, ...msg)
    };
}
var Log = window.Log;

// ========== 全局变量 ==========

let selectedFile = null;
let selectedTags = [];
let selectedColor = '#3498db';
let currentDatasets = [];
let importPanelCollapsed = false;
let isLoadingDemo = false; // 防止重复加载演示数据

// ========== 演示数据集 ==========

/**
 * 加载演示数据集
 */
async function loadDemoDataset() {
    // 防止重复点击
    if (isLoadingDemo) {
        showToast('warn', '⏳ 正在加载演示数据，请稍候...');
        return;
    }

    isLoadingDemo = true;
    let createdDatasetId = null; // 跟踪已创建的数据集ID，用于失败时清理

    try {
        showToast('info', '正在生成演示数据集...');

        // 生成演示聊天数据
        const demoMessages = [];

        // 扩大发送者范围
        const demoSenders = [
            { id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' },
            { id: 'charlie', name: 'Charlie' }, { id: 'david', name: 'David' },
            { id: 'emma', name: 'Emma' }, { id: 'frank', name: 'Frank' },
            { id: 'grace', name: 'Grace' }, { id: 'henry', name: 'Henry' },
            { id: 'iris', name: 'Iris' }, { id: 'jack', name: 'Jack' },
            { id: 'kate', name: 'Kate' }, { id: 'leo', name: 'Leo' },
            { id: 'maya', name: 'Maya' }, { id: 'noah', name: 'Noah' },
            { id: 'olivia', name: 'Olivia' }, { id: 'peter', name: 'Peter' },
            { id: 'quinn', name: 'Quinn' }, { id: 'ryan', name: 'Ryan' },
            { id: 'sophia', name: 'Sophia' }, { id: 'thomas', name: 'Thomas' }
        ];

        // 扩大主题范围
        const demoTopics = [
            '人工智能', '机器学习', '深度学习', '神经网络', '自然语言处理',
            '计算机视觉', '强化学习', '数据科学', 'Python', 'JavaScript',
            '算法', '大数据', '云计算', '区块链', '前端开发',
            'React', 'Vue', 'Angular', 'Node.js', 'TypeScript',
            '数据库', 'MySQL', 'MongoDB', 'Redis', 'Git',
            'Docker', 'Kubernetes', '微服务', 'DevOps', 'CI/CD',
            'TensorFlow', 'PyTorch', 'OpenCV', 'Pandas', 'NumPy',
            'Web开发', '移动开发', 'iOS', 'Android', 'Flutter',
            '产品设计', 'UI/UX', '项目管理', '敏捷开发', 'Scrum',
            'LeetCode', '系统设计', '架构设计', '性能优化', '安全测试'
        ];

        const demoSentences = [
            '你好！今天天气真好',
            '你觉得这个想法怎么样？',
            '我同意你的看法',
            '这个问题很有趣',
            '让我想想...',
            '确实如此',
            '太棒了！',
            '我也这么认为',
            '有什么新进展吗？',
            '这真是个好消息',
            '我刚开始学这个，能帮我吗？',
            '推荐一些学习资源吧',
            '这个框架怎么样？',
            '遇到了一个bug，求助',
            '分享一下我的经验',
            '有没有人了解这个技术？',
            '我刚完成了一个项目',
            '遇到了性能问题，怎么办？',
            '这个设计模式怎么用？',
            '如何优化这段代码？'
        ];

        const now = Math.floor(Date.now() / 1000);  // 转换为秒级时间戳
        const daySec = 24 * 60 * 60;  // 一天的秒数
        const timeSpan = window.ChatGalaxyConfig.DEMO_TIME_SPAN_DAYS * daySec;  // 时间跨度

        // 生成演示消息
        for (let i = 0; i < window.ChatGalaxyConfig.DEMO_MESSAGE_COUNT; i++) {
            const sender = demoSenders[Math.floor(Math.random() * demoSenders.length)];
            const topicCount = Math.floor(Math.random() * 3) + 1;  // 每条消息1-3个关键词
            const topics = [];
            for (let j = 0; j < topicCount; j++) {
                const topic = demoTopics[Math.floor(Math.random() * demoTopics.length)];
                if (!topics.includes(topic)) {
                    topics.push(topic);
                }
            }

            const sentence = demoSentences[Math.floor(Math.random() * demoSentences.length)];
            const timestamp = now - Math.floor(Math.random() * timeSpan);  // 时间跨度内

            demoMessages.push({
                id: `demo_msg_${Date.now()}_${i}`, // 添加时间戳确保消息ID唯一
                senderId: sender.id,
                senderName: sender.name,
                timestamp: timestamp,  // 秒级时间戳
                text: `${sentence} ${topics.join('、')}相关的讨论。`,
                sentiment: Math.floor(Math.random() * 4), // 0-3: 情感
                keywords: topics
            });
        }

        // 按时间排序
        demoMessages.sort((a, b) => a.timestamp - b.timestamp);

        // 创建演示数据集（添加时间戳确保唯一性）
        const timestamp = new Date().toLocaleString('zh-CN');
        const dataset = await window.DataImportV3.createEmptyDataset({
            name: `演示数据集 ${timestamp}`,
            description: `这是一个包含${window.ChatGalaxyConfig.DEMO_MESSAGE_COUNT}条模拟聊天的演示数据集，时间跨度${window.ChatGalaxyConfig.DEMO_TIME_SPAN_DAYS}天`,
            tags: ['演示', '示例'],
            color: '#667eea'
        });

        createdDatasetId = dataset.id; // 记录ID，用于失败时清理

        // 保存消息
        await window.DatasetManagerV3.saveMessages(dataset.id, demoMessages);

        // 更新数据集统计（使用标准方法确保缓存同步）
        await window.DatasetManagerV3.updateDatasetStatistics(
            dataset.id,
            demoMessages.length,
            demoSenders.length
        );

        showToast('success', `✅ 演示数据集 "${dataset.name}" 创建成功！共${demoMessages.length}条消息，${demoSenders.length}位参与者`);
        await loadDatasetList();

    } catch (error) {
        console.error('Load demo dataset failed:', error);

        // 如果创建了数据集但后续步骤失败，清理空数据集
        if (createdDatasetId) {
            try {
                console.warn('[Demo] Cleaning up failed dataset:', createdDatasetId);
                await window.DatasetManagerV3.deleteDataset(createdDatasetId);
                console.log('[Demo] Cleanup successful');
            } catch (cleanupError) {
                console.error('[Demo] Cleanup failed:', cleanupError);
            }
        }

        showToast('error', '加载演示数据失败: ' + error.message);
    } finally {
        isLoadingDemo = false; // 重置加载状态
    }
}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', async () => {
    Log.info('Init', 'DataManager UI initializing...');

    // 初始化上传区域
    initUploadZone();

    // 🔧 设置事件委托：在父容器上监听所有按钮点击
    const datasetList = document.getElementById('dataset-list');
    if (datasetList) {
        datasetList.addEventListener('click', (e) => {
            const btn = e.target.closest('.dataset-action-btn');
            if (!btn) return;

            // 阻止按钮的默认行为（防止表单提交等干扰）
            e.preventDefault();
            e.stopPropagation();

            const datasetId = btn.getAttribute('data-id');

            if (btn.classList.contains('btn-switch')) {
                switchToDataset(datasetId);
            } else if (btn.classList.contains('btn-edit')) {
                editDataset(datasetId);
            } else if (btn.classList.contains('btn-export')) {
                exportDataset(datasetId);
            } else if (btn.classList.contains('btn-delete')) {
                deleteDataset(datasetId);
            }
        });
    }

    // 加载数据集列表
    await loadDatasetList();

    // 初始化黑名单设置
    initializeBlacklistSettings();

    Log.info('Init', 'DataManager UI initialized');
});

// ========== 面板切换 ==========

function toggleImportPanel() {
    const content = document.getElementById('import-panel-content');
    const header = document.querySelector('.section-header');
    const icon = document.getElementById('import-panel-icon');

    importPanelCollapsed = !importPanelCollapsed;

    if (importPanelCollapsed) {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
    } else {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
    }
}

// ========== 上传区域初始化 ==========

function initUploadZone() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    if (!uploadZone || !fileInput) return;

    // 点击上传
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    // 拖拽事件
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/json') {
            handleFileSelect(file);
        } else {
            showAlert('error', '请选择JSON文件');
        }
    });
}

// ========== 文件处理 ==========

async function handleFileSelect(file) {
    selectedFile = file;

    // 显示文件信息
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');

    fileName.textContent = `${file.name} (${window.DataImportV3.formatFileSize(file.size)})`;
    fileInfo.style.display = 'block';

    // 🔧 清除旧的验证警告（修复：新文件导入时警告不消失的问题）
    const warningContainer = document.getElementById('validation-warnings');
    const warningList = document.getElementById('validation-warning-list');
    if (warningList) {
        warningList.innerHTML = '';
    }
    if (warningContainer) {
        warningContainer.style.display = 'none';
    }

    // 验证文件
    try {
        const data = await window.DataImportV3.readJSONFile(file);
        const validation = window.DataImportV3.validateJSON(data);

        if (validation.warnings.length > 0) {
            showValidationWarnings(validation.warnings);
        }

        if (!validation.valid) {
            showToast('error', 'JSON格式错误: ' + validation.errors.join(', '));
            return;
        }

        // 填充表单
        const nameInput = document.getElementById('dataset-name');
        if (!nameInput.value) {
            nameInput.value = file.name.replace('.json', '');
        }

        // 显示表单
        document.getElementById('dataset-form').style.display = 'block';
        document.getElementById('import-btn').disabled = false;

        showToast('success', `✅ 文件解析成功！共 ${data.messages?.length || 0} 条消息`);

    } catch (error) {
        showToast('error', '文件读取失败: ' + error.message);
    }
}

function showValidationWarnings(warnings) {
    const container = document.getElementById('validation-warnings');
    const list = document.getElementById('validation-warning-list');

    // 🔧 改进警告显示：区分警告和提示
    const hasLargeFileWarning = warnings.some(w => w.includes('超过快速模式限制'));

    if (hasLargeFileWarning) {
        // 大文件警告：改为友好的提示信息
        const largeFileWarning = warnings.find(w => w.includes('超过快速模式限制'));
        const otherWarnings = warnings.filter(w => !w.includes('超过快速模式限制'));

        let html = '';

        // 大文件提示（绿色，表示可以继续）
        if (largeFileWarning) {
            html += `<li class="warning-info">💡 ${largeFileWarning.replace('建议使用精确模式', '您仍可以继续导入，系统会自动使用分批处理')}</li>`;
        }

        // 其他警告（黄色）
        otherWarnings.forEach(w => {
            html += `<li class="warning-caution">⚠️ ${w}</li>`;
        });

        list.innerHTML = html;
    } else {
        // 普通警告
        list.innerHTML = warnings.map(w => `<li>⚠️ ${w}</li>`).join('');
    }

    container.style.display = 'block';
}

// ========== 标签和颜色选择 ==========

function toggleTag(element) {
    element.classList.toggle('selected');

    const tag = element.textContent;
    if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
    } else {
        selectedTags.push(tag);
    }
}

function selectColor(element) {
    document.querySelectorAll('.color-option').forEach(el => {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedColor = element.dataset.color;
}

// ========== 数据集操作 ==========

async function startImport() {
    if (!selectedFile) {
        showToast('error', '请先选择文件');
        return;
    }

    const name = document.getElementById('dataset-name').value.trim();
    if (!name) {
        showToast('error', '请输入数据集名称');
        return;
    }

    const description = document.getElementById('dataset-description').value.trim();

    // 获取处理模式
    const processingModeInput = document.querySelector('input[name="processingMode"]:checked');
    const processingMode = processingModeInput ? processingModeInput.value : 'fast';

    // 显示进度条
    const progressContainer = document.getElementById('import-progress');
    const progressBar = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');

    progressContainer.style.display = 'block';
    document.getElementById('import-btn').disabled = true;

    try {
        // 开始导入
        const { dataset, stats } = await window.DataImportV3.importJSON(selectedFile, {
            name,
            description,
            tags: selectedTags,
            color: selectedColor,
            mode: processingMode,  // 使用选择的处理模式
            onProgress: (current, total) => {
                const percent = Math.floor((current / total) * 100);
                progressBar.style.width = percent + '%';
                progressBar.textContent = percent + '%';
                progressText.textContent = `正在处理: ${current}/${total} 条消息`;
            }
        });

        // 导入成功
        showToast('success', `✅ 导入成功！共 ${stats.totalMessages} 条消息，${stats.totalSenders} 位参与者`);

        // 重置表单并刷新列表
        setTimeout(() => {
            resetImportForm();
            loadDatasetList();
        }, 2000);

    } catch (error) {
        showToast('error', '导入失败: ' + error.message);
        document.getElementById('import-btn').disabled = false;
        progressContainer.style.display = 'none';
    }
}

function resetImportForm() {
    selectedFile = null;
    selectedTags = [];
    selectedColor = '#3498db';

    document.getElementById('file-input').value = '';
    document.getElementById('file-info').style.display = 'none';

    // 🔧 清空并隐藏警告提示（确保完全清除）
    const warningList = document.getElementById('validation-warning-list');
    const warningContainer = document.getElementById('validation-warnings');
    if (warningList) {
        warningList.innerHTML = '';
    }
    if (warningContainer) {
        warningContainer.style.display = 'none';
    }

    document.getElementById('dataset-form').style.display = 'none';
    document.getElementById('dataset-name').value = '';
    document.getElementById('dataset-description').value = '';

    // 重置标签选择
    document.querySelectorAll('.tag-option').forEach(tag => {
        tag.classList.remove('selected');
    });

    // 重置颜色选择
    document.querySelectorAll('.color-option').forEach(color => {
        color.classList.remove('selected');
    });
    document.querySelector('.color-option[data-color="#3498db"]').classList.add('selected');

    // 隐藏进度条
    document.getElementById('import-progress').style.display = 'none';
    document.getElementById('import-btn').disabled = false;
}

async function createNewDataset() {
    const name = prompt('请输入数据集名称:');
    if (!name) return;

    try {
        const dataset = await window.DataImportV3.createEmptyDataset({
            name: name.trim(),
            description: '空数据集',
            tags: [],
            color: '#3498db'
        });

        showToast('success', `✅ 数据集 "${dataset.name}" 创建成功！`);
        await loadDatasetList();

    } catch (error) {
        showToast('error', '创建失败: ' + error.message);
    }
}

async function loadDatasetList() {
    try {
        const datasets = await window.DatasetManagerV3.getAllDatasets();
        currentDatasets = datasets;

        const container = document.getElementById('dataset-list');
        const countElement = document.getElementById('dataset-count');
        const currentId = localStorage.getItem('chatgalaxy_currentDataset');

        // 更新数据集数量
        if (countElement) {
            countElement.textContent = `${datasets.length} 个数据集`;
        }

        if (datasets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-text">暂无数据集</div>
                    <div class="empty-state-hint">
                        <strong>🪄 加载演示数据</strong> 快速体验功能<br>
                        或 <strong>📤 导入数据集</strong> 使用您自己的聊天记录
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = datasets.map(dataset => {
            const isActive = dataset.id === currentId;
            const date = new Date(dataset.createdAt).toLocaleDateString('zh-CN');

            return `
                <div class="dataset-card ${isActive ? 'active' : ''}" style="border-left-color: ${dataset.color};">
                    <div class="dataset-card-header">
                        <div>
                            <div class="dataset-name">${dataset.name}</div>
                            <div class="dataset-date">创建于 ${date}</div>
                        </div>
                        ${isActive ? '<span class="dataset-badge">当前使用中</span>' : ''}
                    </div>

                    <div class="dataset-meta">
                        <div class="dataset-meta-item">
                            <i class="ri-message-3-line"></i>
                            <span>${dataset.messageCount} 条消息</span>
                        </div>
                        <div class="dataset-meta-item">
                            <i class="ri-user-line"></i>
                            <span>${dataset.participantCount} 人</span>
                        </div>
                    </div>

                    ${dataset.tags && dataset.tags.length > 0 ? `
                        <div class="dataset-tags">
                            ${dataset.tags.map(tag => `<span class="dataset-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div class="dataset-actions">
                        <button type="button" class="dataset-action-btn btn-switch" data-id="${dataset.id}">
                            ${isActive ? '✓ 当前使用' : '切换到此数据集'}
                        </button>
                        <button type="button" class="dataset-action-btn btn-edit" data-id="${dataset.id}">
                            <i class="ri-edit-line"></i> 编辑
                        </button>
                        <button type="button" class="dataset-action-btn btn-export" data-id="${dataset.id}">
                            <i class="ri-download-line"></i> 导出
                        </button>
                        <button type="button" class="dataset-action-btn btn-delete danger" data-id="${dataset.id}">
                            <i class="ri-delete-bin-line"></i> 删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Load datasets failed:', error);
        showToast('error', '加载数据集列表失败: ' + error.message);
    }
}

async function refreshDatasetList() {
    showToast('info', '正在刷新...');
    await loadDatasetList();
    showToast('success', '✅ 刷新成功');
}

async function switchToDataset(datasetId) {
    try {
        await window.DatasetManagerV3.switchDataset(datasetId);
        showToast('success', '✅ 已切换数据集！正在跳转到星系...');

        setTimeout(() => {
            window.location.href = 'index.html?refresh=' + Date.now();
        }, 1500);

    } catch (error) {
        showToast('error', '切换失败: ' + error.message);
    }
}

async function deleteDataset(datasetId) {
    const dataset = currentDatasets.find(ds => ds.id === datasetId);
    if (!dataset) {
        console.warn('[Delete] Dataset not found in currentDatasets:', datasetId);
        // 尝试从数据库重新加载
        await loadDatasetList();
        return;
    }

    if (!confirm(`确定要删除数据集 "${dataset.name}" 吗？\n\n此操作将删除所有相关消息，且无法恢复！`)) {
        return;
    }

    try {
        console.log('[Delete] Starting deletion of dataset:', datasetId);
        await window.DatasetManagerV3.deleteDataset(datasetId);
        console.log('[Delete] Deletion successful, refreshing list...');
        showToast('success', `✅ 数据集 "${dataset.name}" 已删除`);

        // 强制刷新列表
        await loadDatasetList();
        console.log('[Delete] List refreshed');

    } catch (error) {
        console.error('[Delete] Deletion failed:', error);
        showToast('error', '删除失败: ' + error.message);
    }
}

async function exportDataset(datasetId) {
    try {
        const data = await window.DataImportV3.exportDataset(datasetId);
        const filename = `${data.name}_${Date.now()}.json`;

        window.DataImportV3.downloadJSON(data, filename);
        showToast('success', '✅ 导出成功');

    } catch (error) {
        showToast('error', '导出失败: ' + error.message);
    }
}

async function editDataset(datasetId) {
    try {
        if (!datasetId) {
            throw new Error('数据集ID为空');
        }

        // 🔧 使用 Session Storage 存储数据集ID，绕过 URL 参数传递
        sessionStorage.setItem('chatgalaxy_editDatasetId', datasetId);

        // 直接跳转（不带参数）
        window.location.href = 'dataset-editor.html';

    } catch (error) {
        showToast('error', '打开编辑器失败: ' + error.message);
    }
}

// ========== Toast 提示 ==========

function showToast(type, message) {
    // 隐藏所有toast
    document.querySelectorAll('.toast').forEach(toast => {
        toast.classList.remove('show');
    });

    // 显示指定toast
    const toast = document.getElementById(`toast-${type}`);
    if (toast) {
        const span = toast.querySelector('span');
        if (span) {
            span.textContent = message;
        }
        toast.classList.add('show');

        // 3秒后自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 保留旧函数名以兼容
function showAlert(type, message) {
    showToast(type, message);
}

// ========== 全局函数（供HTML调用） ==========

window.toggleImportPanel = toggleImportPanel;
window.startImport = startImport;
window.resetImportForm = resetImportForm;
window.createNewDataset = createNewDataset;
window.loadDemoDataset = loadDemoDataset;
window.refreshDatasetList = refreshDatasetList;
window.switchToDataset = switchToDataset;
window.deleteDataset = deleteDataset;
window.exportDataset = exportDataset;
window.toggleTag = toggleTag;
window.selectColor = selectColor;

// ========== 黑名单设置函数 ==========

/**
 * 切换黑名单开关
 */
function toggleBlacklist() {
    const toggle = document.getElementById('blacklist-toggle');
    const status = document.getElementById('blacklist-status');
    const isEnabled = toggle.checked;

    // 更新配置
    window.ChatGalaxyConfig.ENABLE_BLACKLIST = isEnabled;

    // 保存到 localStorage
    localStorage.setItem('chatgalaxy_blacklist_enabled', isEnabled);

    // 更新UI状态
    if (isEnabled) {
        status.innerHTML = '<i class="ri-checkbox-circle-line" style="color: #10b981;"></i><span>黑名单过滤已启用</span>';
        showToast('success', '✅ 黑名单过滤已启用');
    } else {
        status.innerHTML = '<i class="ri-close-circle-line" style="color: #ef4444;"></i><span>黑名单过滤已禁用</span>';
        showToast('info', 'ℹ️ 黑名单过滤已禁用');
    }

    console.log('[Blacklist] 黑名单过滤:', isEnabled ? '启用' : '禁用');
}

/**
 * 更新黑名单策略
 */
function updateBlacklistStrategy() {
    const strategySelect = document.getElementById('blacklist-strategy');
    const strategy = strategySelect.value;

    // 更新配置
    window.ChatGalaxyConfig.BLACKLIST_STRATEGY = strategy;

    // 保存到 localStorage
    localStorage.setItem('chatgalaxy_blacklist_strategy', strategy);

    // 显示提示
    const strategyNames = {
        'filter_only': '仅过滤关键词（推荐）',
        'skip': '跳过整条消息',
        'mark': '标记但保留消息'
    };

    showToast('success', `✅ 策略已更新：${strategyNames[strategy]}`);
    console.log('[Blacklist] 策略已更新:', strategy);
}

/**
 * 初始化黑名单设置
 */
function initializeBlacklistSettings() {
    // 从 localStorage 读取设置
    const enabled = localStorage.getItem('chatgalaxy_blacklist_enabled');
    const strategy = localStorage.getItem('chatgalaxy_blacklist_strategy');

    // 更新配置
    if (enabled !== null) {
        window.ChatGalaxyConfig.ENABLE_BLACKLIST = enabled === 'true';
        document.getElementById('blacklist-toggle').checked = enabled === 'true';
    }

    if (strategy !== null) {
        window.ChatGalaxyConfig.BLACKLIST_STRATEGY = strategy;
        document.getElementById('blacklist-strategy').value = strategy;
    }

    // 更新状态显示
    const status = document.getElementById('blacklist-status');
    if (window.ChatGalaxyConfig.ENABLE_BLACKLIST) {
        status.innerHTML = '<i class="ri-checkbox-circle-line" style="color: #10b981;"></i><span>黑名单过滤已启用</span>';
    } else {
        status.innerHTML = '<i class="ri-close-circle-line" style="color: #ef4444;"></i><span>黑名单过滤已禁用</span>';
    }

    console.log('[Blacklist] 设置已初始化:', {
        enabled: window.ChatGalaxyConfig.ENABLE_BLACKLIST,
        strategy: window.ChatGalaxyConfig.BLACKLIST_STRATEGY
    });
}

// 导出到全局
window.toggleBlacklist = toggleBlacklist;
window.updateBlacklistStrategy = updateBlacklistStrategy;
window.initializeBlacklistSettings = initializeBlacklistSettings;

// ========== 从index.html调用的函数 ==========

/**
 * 在index.html中打开数据管理器
 */
function showDataManager() {
    // 在新窗口打开数据管理器
    window.open('data-manager.html', '_blank');
}

// 导出到全局
window.showDataManager = showDataManager;

console.log('🎨 DataManager UI Controller loaded');
