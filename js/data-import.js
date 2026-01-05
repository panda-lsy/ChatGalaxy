/**
 * 聊天记录数据导入管理系统
 * ProjectZero - 深山有密林团队
 *
 * 功能：
 * 1. 逐条录入聊天消息
 * 2. JSON格式批量导入
 * 3. 切换和管理多个聊天记录
 * 4. 本地存储（localStorage）
 */

// ========== 状态管理 ==========

let currentMessages = [];  // 当前录入的消息列表
let importedData = null;   // 导入的JSON数据

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initFileUpload();
    loadRecords();
    setDefaultTime();
});

// ========== Tab切换 ==========

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有active状态
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // 添加active状态
            tab.classList.add('active');
            const tabId = `tab-${tab.dataset.tab}`;
            document.getElementById(tabId).classList.add('active');

            // 如果切换到管理页面，刷新记录列表
            if (tab.dataset.tab === 'manage') {
                loadRecords();
            }
        });
    });
}

// ========== 文件上传 ==========

function initFileUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // 点击上传区域
    uploadZone.addEventListener('click', () => fileInput.click());

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
        if (file) handleFile(file);
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const data = JSON.parse(content);
            importedData = data;
            showJSONPreview(data);
            showInfo(`文件 "${file.name}" 读取成功，共 ${getRecordCount(data)} 条记录`, 'info');
        } catch (error) {
            showError('JSON文件格式错误：' + error.message);
        }
    };
    reader.readAsText(file);
}

function getRecordCount(data) {
    if (Array.isArray(data)) {
        return data.length;
    } else if (data.messages && Array.isArray(data.messages)) {
        return data.messages.length;
    }
    return 0;
}

function showJSONPreview(data) {
    const preview = document.getElementById('jsonPreview');
    const content = document.getElementById('jsonContent');
    const recordName = document.getElementById('jsonRecordName');

    // 如果数据包含name字段，自动填充
    if (data.name && !recordName.value) {
        recordName.value = data.name;
    }

    // 提取消息数组
    const messages = Array.isArray(data) ? data : (data.messages || []);

    let html = '';
    messages.forEach((msg, index) => {
        const roleLabel = msg.role === 'user' ? '用户' : '助手';
        const time = msg.time || new Date().toLocaleString('zh-CN');
        html += `
            <div class="message-item" data-role="${msg.role}">
                <div class="message-time">${time}</div>
                <div class="message-content">${escapeHtml(msg.content)}</div>
            </div>
        `;
    });

    content.innerHTML = html || '<p style="color: #999; text-align: center;">暂无数据</p>';
    preview.style.display = 'block';
}

// ========== 逐条录入 ==========

function addMessage() {
    const role = document.getElementById('messageRole').value;
    const content = document.getElementById('messageContent').value.trim();
    const timeInput = document.getElementById('messageTime').value;

    if (!content) {
        showError('请输入消息内容');
        return;
    }

    const message = {
        role: role,
        content: content,
        time: timeInput ? new Date(timeInput).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')
    };

    currentMessages.push(message);
    updateMessagePreview();
    showSuccess('消息已添加');

    // 清空内容，保留时间
    document.getElementById('messageContent').value = '';
}

function updateMessagePreview() {
    const list = document.getElementById('messageList');
    const count = document.getElementById('messageCount');
    count.textContent = currentMessages.length;

    let html = '';
    currentMessages.forEach((msg, index) => {
        const roleLabel = msg.role === 'user' ? '用户' : '助手';
        html += `
            <div class="message-item" data-role="${msg.role}">
                <div class="message-time">${msg.time}</div>
                <div class="message-content">${escapeHtml(msg.content)}</div>
            </div>
        `;
    });

    list.innerHTML = html || '<p style="color: #999; text-align: center;">暂无消息</p>';
    list.scrollTop = list.scrollHeight;
}

function saveRecord() {
    const name = document.getElementById('recordName').value.trim();

    if (!name) {
        showError('请输入记录名称');
        return;
    }

    if (currentMessages.length === 0) {
        showError('请至少添加一条消息');
        return;
    }

    const record = {
        id: Date.now().toString(),
        name: name,
        messages: currentMessages,
        createdAt: new Date().toISOString(),
        messageCount: currentMessages.length
    };

    saveRecordToStorage(record);
    showSuccess(`记录 "${name}" 已保存，共 ${currentMessages.length} 条消息`);

    // 清空表单
    clearForm();
}

function clearForm() {
    document.getElementById('recordName').value = '';
    document.getElementById('messageContent').value = '';
    document.getElementById('messageTime').value = '';
    currentMessages = [];
    updateMessagePreview();
    setDefaultTime();
}

function setDefaultTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('messageTime').value = now.toISOString().slice(0, 16);
}

// ========== JSON导入 ==========

function importJSON() {
    if (!importedData) {
        showError('请先选择JSON文件');
        return;
    }

    const name = document.getElementById('jsonRecordName').value.trim();
    if (!name) {
        showError('请输入记录名称');
        return;
    }

    // 提取消息数组
    const messages = Array.isArray(importedData) ? importedData : (importedData.messages || []);

    if (messages.length === 0) {
        showError('JSON文件中没有有效消息');
        return;
    }

    const record = {
        id: Date.now().toString(),
        name: name,
        messages: messages.map(msg => ({
            role: msg.role || 'user',
            content: msg.content || '',
            time: msg.time || new Date().toLocaleString('zh-CN')
        })),
        createdAt: new Date().toISOString(),
        messageCount: messages.length
    };

    saveRecordToStorage(record);
    showSuccess(`成功导入 "${name}"，共 ${messages.length} 条消息`);

    // 清空
    document.getElementById('jsonRecordName').value = '';
    document.getElementById('jsonPreview').style.display = 'none';
    document.getElementById('fileInput').value = '';
    importedData = null;
}

// ========== 本地存储 ==========

function saveRecordToStorage(record) {
    const records = getRecordsFromStorage();
    records.push(record);
    localStorage.setItem('chatRecords', JSON.stringify(records));
}

function getRecordsFromStorage() {
    const data = localStorage.getItem('chatRecords');
    return data ? JSON.parse(data) : [];
}

function loadRecords() {
    const records = getRecordsFromStorage();
    const list = document.getElementById('recordList');

    if (records.length === 0) {
        list.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无保存的记录</p>';
        return;
    }

    let html = '';
    records.forEach(record => {
        const date = new Date(record.createdAt).toLocaleString('zh-CN');
        html += `
            <div class="message-item" style="border-left: 4px solid #667eea;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                        <h3 style="font-size: 16px; color: #333; margin-bottom: 5px;">${escapeHtml(record.name)}</h3>
                        <p style="font-size: 12px; color: #999;">创建时间：${date}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                            ${record.messageCount} 条消息
                        </span>
                    </div>
                </div>
                <div class="btn-group" style="margin-top: 10px;">
                    <button class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;" onclick="switchToRecord('${record.id}')">🔄 切换到此记录</button>
                    <button class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;" onclick="exportRecord('${record.id}')">📤 导出</button>
                    <button class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px; background: #f8d7da; color: #721c24;" onclick="deleteRecord('${record.id}')">🗑️ 删除</button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

function switchToRecord(recordId) {
    const records = getRecordsFromStorage();
    const record = records.find(r => r.id === recordId);

    if (!record) {
        showError('记录不存在');
        return;
    }

    // 将记录保存到全局变量供其他页面使用
    localStorage.setItem('currentRecord', JSON.stringify(record));

    showSuccess(`已切换到记录 "${record.name}"，可以前往3D星系查看`);
    setTimeout(() => {
        if (confirm('是否立即前往3D星系查看？')) {
            window.location.href = 'index.html';
        }
    }, 500);
}

function deleteRecord(recordId) {
    if (!confirm('确定要删除这条记录吗？此操作不可恢复。')) {
        return;
    }

    const records = getRecordsFromStorage();
    const filtered = records.filter(r => r.id !== recordId);
    localStorage.setItem('chatRecords', JSON.stringify(filtered));

    showSuccess('记录已删除');
    loadRecords();
}

function deleteAllRecords() {
    if (!confirm('确定要清空所有记录吗？此操作不可恢复！')) {
        return;
    }

    if (!confirm('再次确认：真的要删除所有聊天记录吗？')) {
        return;
    }

    localStorage.removeItem('chatRecords');
    showSuccess('所有记录已清空');
    loadRecords();
}

function exportRecord(recordId) {
    const records = getRecordsFromStorage();
    const record = records.find(r => r.id === recordId);

    if (!record) {
        showError('记录不存在');
        return;
    }

    const dataStr = JSON.stringify(record, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${record.name}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showSuccess('记录已导出');
}

function exportAllRecords() {
    const records = getRecordsFromStorage();

    if (records.length === 0) {
        showError('没有可导出的记录');
        return;
    }

    const dataStr = JSON.stringify(records, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all_chat_records_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showSuccess(`已导出 ${records.length} 条记录`);
}

// ========== 提示信息 ==========

function showSuccess(message) {
    showAlert('alert-success', message);
}

function showError(message) {
    showAlert('alert-error', message);
}

function showInfo(message, type = 'info') {
    showAlert('alert-info', message);
}

function showAlert(id, message) {
    // 隐藏所有alert
    document.querySelectorAll('.alert').forEach(alert => {
        alert.classList.remove('show');
    });

    // 显示指定alert
    const alert = document.getElementById(id);
    alert.textContent = message;
    alert.classList.add('show');

    // 3秒后自动隐藏
    setTimeout(() => {
        alert.classList.remove('show');
    }, 3000);
}

// ========== 工具函数 ==========

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 数据转换（用于3D可视化）==========

/**
 * 将聊天记录转换为3D图数据格式
 * @param {Object} record - 聊天记录对象
 * @returns {Object} - {nodes: [], links: []}
 */
function convertToGraphData(record) {
    const messages = record.messages || [];
    const nodes = [];
    const links = [];
    const keywordMap = new Map();

    // 提取关键词（简化版，实际应该使用jieba）
    messages.forEach(msg => {
        if (msg.role === 'user') {
            const words = msg.content.split(/[\s,，.。!！?？]+/).filter(w => w.length > 1);
            words.forEach(word => {
                const count = keywordMap.get(word) || 0;
                keywordMap.set(word, count + 1);
            });
        }
    });

    // 创建节点
    let nodeId = 0;
    keywordMap.forEach((count, keyword) => {
        if (count > 1) {  // 只保留出现超过1次的关键词
            nodes.push({
                id: keyword,
                val: count,
                firstSeen: record.createdAt || new Date().toISOString()
            });
            nodeId++;
        }
    });

    // 创建简单连接（相邻关键词）
    for (let i = 0; i < Math.min(nodes.length - 1, 50); i++) {
        if (Math.random() > 0.5) {
            links.push({
                source: nodes[i].id,
                target: nodes[i + 1].id
            });
        }
    }

    return { nodes, links };
}

// ========== 全局API ==========

window.DataImport = {
    // 获取当前选中的记录
    getCurrentRecord: () => {
        const data = localStorage.getItem('currentRecord');
        return data ? JSON.parse(data) : null;
    },

    // 转换为图数据
    convertToGraphData,

    // 获取所有记录
    getAllRecords: getRecordsFromStorage,

    // 保存记录
    saveRecord: saveRecordToStorage
};
