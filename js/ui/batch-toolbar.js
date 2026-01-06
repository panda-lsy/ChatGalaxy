/**
 * ChatGalaxy 批量操作工具栏组件 v1.0
 * 提供批量操作按钮和状态显示
 *
 * @requires js/data/data-batch-operations.js
 * @version 1.0.0
 * @updated 2026-01-06
 */

// ========== 本地日志包装器 ==========
// 防止 Log 未定义时出错
if (!window.Log) {
    window.Log = {
        info: (tag, ...msg) => console.log(`[INFO] [${tag}]`, ...msg),
        warn: (tag, ...msg) => console.warn(`[WARN] [${tag}]`, ...msg),
        error: (tag, ...msg) => console.error(`[ERROR] [${tag}]`, ...msg),
        debug: (tag, ...msg) => console.log(`[DEBUG] [${tag}]`, ...msg)
    };
}
var Log = window.Log;

// ========== 确保命名空间存在 ==========
window.ChatGalaxy = window.ChatGalaxy || {};
window.ChatGalaxy.UI = window.ChatGalaxy.UI || {};

// ========== 批量工具栏组件 ==========

class BatchToolbar extends HTMLElement {
    /**
     * 构造函数
     */
    constructor() {
        super();

        this.batchOperations = null; // DataBatchOperations 实例
        this.selectedCount = 0;
        this.isAllSelected = false;

        Log.info('BatchToolbar', 'Component created');
    }

    /**
     * 自定义元素生命周期：连接到DOM
     */
    connectedCallback() {
        this.render();
        this.attachEventListeners();
        this.listenToEvents();

        Log.info('BatchToolbar', 'Component mounted');
    }

    /**
     * 自定义元素生命周期：从DOM断开
     */
    disconnectedCallback() {
        this.removeEventListeners();
        Log.info('BatchToolbar', 'Component unmounted');
    }

    // ========== 渲染方法 ==========

    /**
     * 渲染组件UI
     */
    render() {
        this.className = 'batch-toolbar';

        this.innerHTML = `
            <div class="batch-toolbar__container">
                <!-- 左侧：选择信息 -->
                <div class="batch-toolbar__info">
                    <span class="batch-toolbar__count">
                        已选择 <strong id="selectedCount">0</strong> 条消息
                    </span>
                </div>

                <!-- 右侧：操作按钮 -->
                <div class="batch-toolbar__actions">
                    <!-- 全选/取消全选 -->
                    <button
                        id="selectAllBtn"
                        class="batch-toolbar__btn batch-toolbar__btn--select"
                        title="全选/取消全选"
                    >
                        <i class="ri-checkbox-line"></i>
                        <span>全选</span>
                    </button>

                    <!-- 批量删除 -->
                    <button
                        id="batchDeleteBtn"
                        class="batch-toolbar__btn batch-toolbar__btn--delete"
                        title="删除选中的消息"
                        disabled
                    >
                        <i class="ri-delete-bin-line"></i>
                        <span>删除</span>
                    </button>

                    <!-- 批量更新情感值 -->
                    <div class="batch-toolbar__dropdown">
                        <button
                            id="batchUpdateSentimentBtn"
                            class="batch-toolbar__btn batch-toolbar__btn--update"
                            title="批量更新情感值"
                            disabled
                        >
                            <i class="ri-emotion-line"></i>
                            <span>更新情感</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </button>
                        <div class="batch-toolbar__dropdown-menu">
                            <button data-sentiment="0" class="sentiment-option">
                                <i class="ri-emotion-unhappy-line"></i> 消极
                            </button>
                            <button data-sentiment="1" class="sentiment-option">
                                <i class="ri-emotion-normal-line"></i> 中性
                            </button>
                            <button data-sentiment="2" class="sentiment-option">
                                <i class="ri-emotion-happy-line"></i> 积极
                            </button>
                            <button data-sentiment="3" class="sentiment-option">
                                <i class="ri-question-line"></i> 疑问
                            </button>
                        </div>
                    </div>

                    <!-- 批量导出 -->
                    <div class="batch-toolbar__dropdown">
                        <button
                            id="batchExportBtn"
                            class="batch-toolbar__btn batch-toolbar__btn--export"
                            title="批量导出"
                            disabled
                        >
                            <i class="ri-download-line"></i>
                            <span>导出</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </button>
                        <div class="batch-toolbar__dropdown-menu">
                            <button data-format="json" class="export-option">
                                <i class="ri-file-code-line"></i> 导出为 JSON
                            </button>
                            <button data-format="csv" class="export-option">
                                <i class="ri-file-table-line"></i> 导出为 CSV
                            </button>
                        </div>
                    </div>

                    <!-- 清除选择 -->
                    <button
                        id="clearSelectionBtn"
                        class="batch-toolbar__btn batch-toolbar__btn--clear"
                        title="清除选择"
                        disabled
                    >
                        <i class="ri-close-line"></i>
                        <span>清除</span>
                    </button>
                </div>
            </div>
        `;
    }

    // ========== 事件处理 ==========

    /**
     * 附加事件监听器
     */
    attachEventListeners() {
        // 获取DOM元素
        this.selectAllBtn = this.querySelector('#selectAllBtn');
        this.batchDeleteBtn = this.querySelector('#batchDeleteBtn');
        this.batchUpdateSentimentBtn = this.querySelector('#batchUpdateSentimentBtn');
        this.batchExportBtn = this.querySelector('#batchExportBtn');
        this.clearSelectionBtn = this.querySelector('#clearSelectionBtn');
        this.selectedCountEl = this.querySelector('#selectedCount');

        // 全选按钮
        this.selectAllBtn.addEventListener('click', () => {
            this.toggleSelectAll();
        });

        // 批量删除按钮
        this.batchDeleteBtn.addEventListener('click', () => {
            this.handleBatchDelete();
        });

        // 情感更新选项
        const sentimentOptions = this.querySelectorAll('.sentiment-option');
        sentimentOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const sentiment = parseInt(e.currentTarget.dataset.sentiment);
                this.handleBatchUpdateSentiment(sentiment);
                this.closeAllDropdowns();
            });
        });

        // 导出选项
        const exportOptions = this.querySelectorAll('.export-option');
        exportOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.handleBatchExport(format);
                this.closeAllDropdowns();
            });
        });

        // 清除选择按钮
        this.clearSelectionBtn.addEventListener('click', () => {
            this.handleClearSelection();
        });

        // 下拉菜单切换
        this.batchUpdateSentimentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(this.batchUpdateSentimentBtn);
        });

        this.batchExportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(this.batchExportBtn);
        });

        // 点击外部关闭下拉菜单
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
    }

    /**
     * 移除事件监听器
     */
    removeEventListeners() {
        // 事件监听器会随着元素移除自动清理
        // 这里主要用于清理其他资源
    }

    /**
     * 监听自定义事件
     */
    listenToEvents() {
        // 监听选择变化事件
        document.addEventListener('batchSelectionChanged', (e) => {
            this.selectedCount = e.detail.selectedCount;
            this.isAllSelected = e.detail.isAllSelected;

            this.updateUI();
        });

        // 监听通知事件
        document.addEventListener('showNotification', (e) => {
            this.showNotification(e.detail.message, e.detail.type);
        });
    }

    // ========== UI操作 ==========

    /**
     * 切换全选/取消全选
     */
    async toggleSelectAll() {
        if (!this.batchOperations) {
            this.showNotification('批量操作管理器未初始化', 'error');
            return;
        }

        const newState = !this.isAllSelected;
        await this.batchOperations.selectAll(newState);
    }

    /**
     * 处理批量删除
     */
    async handleBatchDelete() {
        if (!this.batchOperations) {
            this.showNotification('批量操作管理器未初始化', 'error');
            return;
        }

        const confirmed = confirm(`确定要删除选中的 ${this.selectedCount} 条消息吗？\n\n此操作不可恢复！`);
        if (!confirmed) return;

        const success = await this.batchOperations.batchDelete();

        if (success) {
            // 触发数据集更新事件
            document.dispatchEvent(new CustomEvent('datasetUpdated', {
                detail: { datasetId: this.batchOperations.datasetId }
            }));
        }
    }

    /**
     * 处理批量更新情感值
     * @param {number} sentiment - 新的情感值
     */
    async handleBatchUpdateSentiment(sentiment) {
        if (!this.batchOperations) {
            this.showNotification('批量操作管理器未初始化', 'error');
            return;
        }

        const success = await this.batchOperations.batchUpdateSentiment(sentiment);

        if (success) {
            // 触发数据集更新事件
            document.dispatchEvent(new CustomEvent('datasetUpdated', {
                detail: { datasetId: this.batchOperations.datasetId }
            }));
        }
    }

    /**
     * 处理批量导出
     * @param {string} format - 导出格式
     */
    async handleBatchExport(format) {
        if (!this.batchOperations) {
            this.showNotification('批量操作管理器未初始化', 'error');
            return;
        }

        await this.batchOperations.batchExport(format);
    }

    /**
     * 清除选择
     */
    handleClearSelection() {
        if (!this.batchOperations) {
            return;
        }

        this.batchOperations.clearSelection();
    }

    // ========== UI更新 ==========

    /**
     * 更新UI状态
     */
    updateUI() {
        // 更新选中数量
        this.selectedCountEl.textContent = this.selectedCount;

        // 更新全选按钮
        const selectAllIcon = this.selectAllBtn.querySelector('i');
        const selectAllText = this.selectAllBtn.querySelector('span');

        if (this.isAllSelected) {
            selectAllIcon.className = 'ri-checkbox-indeterminate-line';
            selectAllText.textContent = '取消全选';
        } else {
            selectAllIcon.className = 'ri-checkbox-line';
            selectAllText.textContent = '全选';
        }

        // 更新按钮状态
        const hasSelection = this.selectedCount > 0;

        this.batchDeleteBtn.disabled = !hasSelection;
        this.batchUpdateSentimentBtn.disabled = !hasSelection;
        this.batchExportBtn.disabled = !hasSelection;
        this.clearSelectionBtn.disabled = !hasSelection;

        // 更新按钮样式
        if (hasSelection) {
            this.batchDeleteBtn.classList.add('batch-toolbar__btn--active');
            this.batchUpdateSentimentBtn.classList.add('batch-toolbar__btn--active');
            this.batchExportBtn.classList.add('batch-toolbar__btn--active');
        } else {
            this.batchDeleteBtn.classList.remove('batch-toolbar__btn--active');
            this.batchUpdateSentimentBtn.classList.remove('batch-toolbar__btn--active');
            this.batchExportBtn.classList.remove('batch-toolbar__btn--active');
        }
    }

    /**
     * 切换下拉菜单
     * @param {HTMLElement} button - 触发按钮
     */
    toggleDropdown(button) {
        const dropdown = button.nextElementSibling;

        // 关闭其他下拉菜单
        this.querySelectorAll('.batch-toolbar__dropdown-menu').forEach(menu => {
            if (menu !== dropdown) {
                menu.classList.remove('batch-toolbar__dropdown-menu--open');
            }
        });

        // 切换当前下拉菜单
        dropdown.classList.toggle('batch-toolbar__dropdown-menu--open');
    }

    /**
     * 关闭所有下拉菜单
     */
    closeAllDropdowns() {
        this.querySelectorAll('.batch-toolbar__dropdown-menu').forEach(menu => {
            menu.classList.remove('batch-toolbar__dropdown-menu--open');
        });
    }

    /**
     * 显示通知
     * @param {string} message - 消息内容
     * @param {string} type - 类型
     */
    showNotification(message, type = 'info') {
        // TODO: 集成到全局通知系统
        // 降级方案：使用alert（仅用于开发阶段）
        if (type === 'error') {
            console.error(`[BatchToolbar] ${message}`);
        } else {
            console.log(`[BatchToolbar] [${type.toUpperCase()}] ${message}`);
        }
    }

    // ========== 公共API ==========

    /**
     * 设置批量操作管理器
     * @param {DataBatchOperations} batchOperations - 批量操作管理器实例
     */
    setBatchOperations(batchOperations) {
        this.batchOperations = batchOperations;
        Log.info('BatchToolbar', 'BatchOperations manager set');
    }

    /**
     * 获取当前选中数量
     * @returns {number}
     */
    getSelectedCount() {
        return this.selectedCount;
    }

    /**
     * 是否全选
     * @returns {boolean}
     */
    getIsAllSelected() {
        return this.isAllSelected;
    }
}

// ========== 注册自定义元素 ==========

if (!customElements.get('batch-toolbar')) {
    customElements.define('batch-toolbar', BatchToolbar);
    Log.info('BatchToolbar', 'Custom element registered');
}

// ========== 导出 ==========

window.ChatGalaxy.UI.BatchToolbar = BatchToolbar;

Log.info('BatchToolbar', 'v1.0 loaded');
