/**
 * ChatGalaxy 消息表格组件 v2.1
 * 声明式渲染 + 修复的复选框逻辑
 *
 * @requires js/data/data-batch-operations.js
 * @version 2.1.0
 * @updated 2026-01-07
 */

// ========== 本地日志包装器 ==========
if (!window.Log) {
    window.Log = {
        info: (tag, ...msg) => console.log(`[INFO] [${tag}]`, ...msg),
        warn: (tag, ...msg) => console.warn(`[WARN] [${tag}]`, ...msg),
        error: (tag, ...msg) => console.error(`[ERROR] [${tag}]`, ...msg),
        debug: (tag, ...msg) => console.log(`[DEBUG] [${tag}]`, ...msg)
    };
}

// ========== 确保命名空间存在 ==========
window.ChatGalaxy = window.ChatGalaxy || {};
window.ChatGalaxy.UI = window.ChatGalaxy.UI || {};

// ========== 消息表格组件 ==========

class MessageTable extends HTMLElement {
    constructor() {
        super();

        // 🔧 核心状态
        this.state = {
            messages: [],
            filteredMessages: [],
            selectedIds: new Set(),
            currentPage: 1,
            pageSize: 50,
            sortColumn: 'timestamp',
            sortDirection: 'desc',
            filterSentiment: 'all',
            searchQuery: ''
        };

        this.batchOperations = null;
        Log.info('MessageTable', 'Component created (v2.1)');
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
        this.listenToEvents();
        Log.info('MessageTable', 'Component mounted');
    }

    disconnectedCallback() {
        this.removeEventListeners();
        Log.info('MessageTable', 'Component unmounted');
    }

    // ========== 状态管理 ==========

    setState(updates) {
        Object.assign(this.state, updates);
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.state.messages];

        // 情感筛选
        if (this.state.filterSentiment !== 'all') {
            const sentiment = parseInt(this.state.filterSentiment);
            filtered = filtered.filter(m => m.sentiment === sentiment);
        }

        // 搜索筛选
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(m =>
                m.text.toLowerCase().includes(query) ||
                (m.senderName || '').toLowerCase().includes(query)
            );
        }

        // 排序
        filtered.sort((a, b) => {
            let aVal = a[this.state.sortColumn];
            let bVal = b[this.state.sortColumn];

            if (this.state.sortColumn === 'keywords') {
                aVal = (a.keywords || []).join(', ');
                bVal = (b.keywords || []).join(', ');
            }

            if (aVal < bVal) return this.state.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.state.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.state.filteredMessages = filtered;

        // 调整当前页
        const maxPage = Math.max(1, Math.ceil(filtered.length / this.state.pageSize));
        if (this.state.currentPage > maxPage) {
            this.state.currentPage = maxPage;
        }

        this.renderTable();
    }

    // ========== 渲染方法 ==========

    render() {
        this.className = 'message-table-container';

        this.innerHTML = `
            <div class="message-table__wrapper">
                <!-- 工具栏 -->
                <div class="message-table__header">
                    <div class="message-table__filters">
                        <select id="sentimentFilter" class="message-table__filter">
                            <option value="all">全部情感</option>
                            <option value="0">😞 消极</option>
                            <option value="1">😐 中性</option>
                            <option value="2">😊 积极</option>
                            <option value="3">❓ 疑问</option>
                        </select>
                        <input type="text" id="searchInput" class="message-table__search" placeholder="搜索消息内容..." />
                    </div>
                    <div class="message-table__stats">
                        <span id="messageCount">0 条消息</span>
                        <span id="selectedCount" style="display: none;">已选 <strong>0</strong> 条</span>
                    </div>
                </div>

                <!-- 表格 -->
                <div class="message-table__table-wrapper">
                    <table class="message-table">
                        <thead>
                            <tr>
                                <th>选择</th>
                                <th data-sort="senderName">发送者 ↕</th>
                                <th data-sort="timestamp">时间 ↕</th>
                                <th data-sort="text">内容 ↕</th>
                                <th data-sort="sentiment">情感 ↕</th>
                                <th data-sort="keywords">关键词 ↕</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody"></tbody>
                    </table>
                </div>

                <!-- 分页 -->
                <div class="message-table__pagination">
                    <button id="prevPageBtn" class="message-table__page-btn" title="上一页">
                        <i class="ri-arrow-left-s-line"></i>
                    </button>
                    <span id="pageInfo">第 1 / 1 页</span>
                    <button id="nextPageBtn" class="message-table__page-btn" title="下一页">
                        <i class="ri-arrow-right-s-line"></i>
                    </button>
                </div>
            </div>
        `;

        this.renderTable();
    }

    renderTable() {
        const tableBody = this.querySelector('#tableBody');
        const filtered = this.state.filteredMessages;

        // 空状态
        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr class="message-table__empty-row">
                    <td colspan="7">
                        <div class="message-table__empty-state">
                            <i class="ri-inbox-line"></i>
                            <p>暂无消息数据</p>
                        </div>
                    </td>
                </tr>
            `;
            this.updateStats();
            this.updatePagination();
            return;
        }

        // 分页
        const startIndex = (this.state.currentPage - 1) * this.state.pageSize;
        const endIndex = Math.min(startIndex + this.state.pageSize, filtered.length);
        const pageMessages = filtered.slice(startIndex, endIndex);

        // 情感映射
        const sentimentMap = {
            0: { label: '消极', icon: 'ri-emotion-unhappy-line', class: 'sentiment--negative' },
            1: { label: '中性', icon: 'ri-emotion-normal-line', class: 'sentiment--neutral' },
            2: { label: '积极', icon: 'ri-emotion-happy-line', class: 'sentiment--positive' },
            3: { label: '疑问', icon: 'ri-question-line', class: 'sentiment--question' }
        };

        // 渲染行
        tableBody.innerHTML = pageMessages.map(msg => {
            const isSelected = this.state.selectedIds.has(msg.id);
            const sentiment = sentimentMap[msg.sentiment] || sentimentMap[1];

            // 格式化时间（智能判断时间戳格式）
            let timestampMs;
            if (msg.timestamp < 10000000000) {
                // 秒级时间戳，转换为毫秒
                timestampMs = msg.timestamp * 1000;
            } else {
                // 已经是毫秒级时间戳
                timestampMs = msg.timestamp;
            }

            const date = new Date(timestampMs);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const timestamp = `${year}/${month}/${day} ${hours}:${minutes}`;

            const keywords = (msg.keywords || []).slice(0, 3).join(', ');

            return `
                <tr class="message-table__row ${isSelected ? 'message-table__row--selected' : ''}" data-id="${msg.id}">
                    <td style="text-align: center;">
                        ${isSelected
                            ? '<i class="ri-checkbox-circle-fill" style="color: #667eea; font-size: 18px;"></i>'
                            : '<i class="ri-checkbox-blank-circle-line" style="color: #a0a4b8; font-size: 18px;"></i>'}
                    </td>
                    <td>${this.escapeHtml(msg.senderName)}</td>
                    <td>${timestamp}</td>
                    <td><div class="message-table__content">${this.escapeHtml(msg.text)}</div></td>
                    <td><span class="message-table__sentiment ${sentiment.class}"><i class="${sentiment.icon}"></i> ${sentiment.label}</span></td>
                    <td>${keywords ? this.escapeHtml(keywords) : '-'}</td>
                    <td>
                        <button class="message-table__action-btn" data-action="edit" data-id="${msg.id}" title="编辑">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="message-table__action-btn message-table__action-btn--delete" data-action="delete" data-id="${msg.id}" title="删除">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateStats();
        this.updatePagination();
    }

    updateStats() {
        const messageCount = this.querySelector('#messageCount');
        const selectedCount = this.querySelector('#selectedCount');

        messageCount.textContent = `${this.state.filteredMessages.length} 条消息`;

        if (this.state.selectedIds.size > 0) {
            selectedCount.style.display = 'inline';
            selectedCount.querySelector('strong').textContent = this.state.selectedIds.size;
        } else {
            selectedCount.style.display = 'none';
        }
    }

    updatePagination() {
        const filtered = this.state.filteredMessages;
        const totalPages = Math.max(1, Math.ceil(filtered.length / this.state.pageSize));

        this.querySelector('#pageInfo').textContent = `第 ${this.state.currentPage} / ${totalPages} 页`;
        this.querySelector('#prevPageBtn').disabled = this.state.currentPage === 1;
        this.querySelector('#nextPageBtn').disabled = this.state.currentPage === totalPages;
    }

    // ========== 事件处理 ==========

    attachEventListeners() {
        // 情感筛选
        this.querySelector('#sentimentFilter').addEventListener('change', (e) => {
            this.setState({ filterSentiment: e.target.value });
        });

        // 搜索输入
        this.querySelector('#searchInput').addEventListener('input', (e) => {
            this.setState({ searchQuery: e.target.value });
        });

        // 列头排序
        this.querySelectorAll('thead th[data-sort]').forEach(th => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                const direction = (this.state.sortColumn === column && this.state.sortDirection === 'asc') ? 'desc' : 'asc';
                this.setState({ sortColumn: column, sortDirection: direction });
            });
        });

        // 分页按钮
        this.querySelector('#prevPageBtn').addEventListener('click', () => {
            if (this.state.currentPage > 1) {
                this.setState({ currentPage: this.state.currentPage - 1 });
            }
        });

        this.querySelector('#nextPageBtn').addEventListener('click', () => {
            const totalPages = Math.ceil(this.state.filteredMessages.length / this.state.pageSize);
            if (this.state.currentPage < totalPages) {
                this.setState({ currentPage: this.state.currentPage + 1 });
            }
        });

        // 表格行点击（事件委托）
        this.querySelector('#tableBody').addEventListener('click', (e) => {
            // 排除按钮点击
            if (e.target.closest('button')) {
                e.preventDefault();
                e.stopPropagation();

                const button = e.target.closest('button[data-action]');
                const action = button.dataset.action;
                const messageId = button.dataset.id;

                if (action === 'edit') {
                    this.editMessage(messageId);
                } else if (action === 'delete') {
                    this.deleteMessage(messageId);
                }
                return;
            }

            // 行点击 - 切换选中状态
            const row = e.target.closest('.message-table__row');
            if (row) {
                const messageId = row.dataset.id;
                this.toggleSelection(messageId);
            }
        });
    }

    removeEventListeners() {
        // 事件监听器会随元素自动移除
    }

    // ========== 数据操作 ==========

    setMessages(messages) {
        // 🔧 添加类型检查和容错处理
        if (!messages) {
            Log.warn('MessageTable', 'setMessages received null/undefined');
            return;
        }

        // 如果不是数组，尝试转换为数组
        const messagesArray = Array.isArray(messages) ? messages : [messages];

        this.setState({ messages: [...messagesArray] });
        Log.info('MessageTable', `Loaded ${messagesArray.length} messages`);
    }

    setBatchOperations(batchOperations) {
        this.batchOperations = batchOperations;
        Log.info('MessageTable', 'BatchOperations linked');
    }

    async loadMessages(datasetId) {
        try {
            const dbHelper = await window.DatasetManagerV3.initDatabase();
            const messages = await dbHelper.getByIndex(
                window.ChatGalaxyConfig.MESSAGES_STORE,
                'datasetId',
                datasetId
            );

            this.setMessages(messages);
            this.state.selectedIds.clear();
            this.state.currentPage = 1;

            Log.info('MessageTable', `Loaded ${messages.length} messages for dataset ${datasetId}`);
        } catch (error) {
            Log.error('MessageTable', 'Failed to load messages:', error);
            throw error;
        }
    }

    toggleSelection(messageId) {
        const wasSelected = this.state.selectedIds.has(messageId);

        if (wasSelected) {
            this.state.selectedIds.delete(messageId);
            if (this.batchOperations) {
                this.batchOperations.selectedMessages.delete(messageId);
                this.batchOperations.updateUI();
            }
        } else {
            this.state.selectedIds.add(messageId);
            if (this.batchOperations) {
                this.batchOperations.selectedMessages.add(messageId);
                this.batchOperations.updateUI();
            }
        }

        this.renderTable();
    }

    editMessage(messageId) {
        Log.info('MessageTable', `Edit message: ${messageId}`);
        this.dispatchEvent(new CustomEvent('editMessage', {
            detail: { messageId },
            bubbles: true
        }));
    }

    deleteMessage(messageId) {
        Log.info('MessageTable', `Delete message: ${messageId}`);
        this.dispatchEvent(new CustomEvent('deleteMessage', {
            detail: { messageId },
            bubbles: true
        }));
    }

    // ========== 事件监听 ==========

    listenToEvents() {
        this.handleBatchSelectionChanged = (e) => {
            const { selectedIds } = e.detail;
            if (selectedIds) {
                this.state.selectedIds = new Set(selectedIds);
                this.renderTable();
            }
        };

        this.handleDatasetUpdated = async (e) => {
            const { datasetId } = e.detail;

            // 🔧 如果只传了 datasetId，重新加载消息
            if (datasetId) {
                await this.loadMessages(datasetId);
            } else if (e.detail.messages) {
                // 如果直接传了 messages，使用它
                this.setMessages(e.detail.messages);
            }
        };

        document.addEventListener('batchSelectionChanged', this.handleBatchSelectionChanged);
        document.addEventListener('datasetUpdated', this.handleDatasetUpdated);
    }

    // ========== 工具函数 ==========

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========== 注册自定义元素 ==========

if (!customElements.get('message-table')) {
    customElements.define('message-table', MessageTable);
    Log.info('MessageTable', 'Component registered');
}
