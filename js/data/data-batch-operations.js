/**
 * ChatGalaxy 批量操作管理器 v1.0
 * 提供消息的批量选择、删除、更新和导出功能
 *
 * @requires js/data/dataset-manager-v3.js
 * @version 1.0.0
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

// ========== 确保命名空间存在 ==========
window.ChatGalaxy = window.ChatGalaxy || {};
window.ChatGalaxy.Data = window.ChatGalaxy.Data || {};

// ========== 批量操作管理器类 ==========

class DataBatchOperations {
    /**
     * 构造函数
     * @param {string} datasetId - 数据集ID
     */
    constructor(datasetId) {
        this.datasetId = datasetId;
        this.selectedMessages = new Set(); // 存储选中的消息ID
        this.allMessages = []; // 缓存当前数据集的所有消息
        this.isAllSelected = false; // 是否全选状态

        Log.info('BatchOperations', `Initialized for dataset: ${datasetId}`);
    }

    // ========== 选择管理 ==========

    /**
     * 全选/取消全选
     * @param {boolean} selected - 是否选中
     */
    async selectAll(selected) {
        try {
            // 加载所有消息
            if (this.allMessages.length === 0) {
                await this.loadMessages();
            }

            if (selected) {
                // 全选
                this.allMessages.forEach(msg => {
                    this.selectedMessages.add(msg.id);
                });
                this.isAllSelected = true;
                Log.info('BatchOperations', `Selected all: ${this.selectedMessages.size} messages`);
            } else {
                // 取消全选
                this.selectedMessages.clear();
                this.isAllSelected = false;
                Log.info('BatchOperations', 'Cleared all selections');
            }

            this.updateUI();

        } catch (error) {
            Log.error('BatchOperations', 'Failed to select all:', error);
        }
    }

    /**
     * 切换单条消息的选中状态
     * @param {string} messageId - 消息ID
     */
    toggleSelection(messageId) {
        if (this.selectedMessages.has(messageId)) {
            this.selectedMessages.delete(messageId);
            Log.debug('BatchOperations', `Deselected: ${messageId}`);
        } else {
            this.selectedMessages.add(messageId);
            Log.debug('BatchOperations', `Selected: ${messageId}`);
        }

        // 检查是否全选
        this.checkAllSelected();
        this.updateUI();
    }

    /**
     * 清除所有选择
     */
    clearSelection() {
        this.selectedMessages.clear();
        this.isAllSelected = false;
        this.updateUI();
        Log.info('BatchOperations', 'Selection cleared');
    }

    /**
     * 检查是否全选
     */
    checkAllSelected() {
        if (this.allMessages.length === 0) {
            this.isAllSelected = false;
            return;
        }

        this.isAllSelected = this.selectedMessages.size === this.allMessages.length;
    }

    /**
     * 获取选中消息的数量
     * @returns {number}
     */
    getSelectedCount() {
        return this.selectedMessages.size;
    }

    /**
     * 获取选中消息的ID列表
     * @returns {string[]}
     */
    getSelectedIds() {
        return Array.from(this.selectedMessages);
    }

    // ========== 批量操作 ==========

    /**
     * 批量删除消息
     * @returns {Promise<boolean>} - 是否成功
     */
    async batchDelete() {
        const count = this.getSelectedCount();

        if (count === 0) {
            Log.warn('BatchOperations', 'No messages selected for deletion');
            this.showNotification('请先选择要删除的消息', 'warning');
            return false;
        }

        // 二次确认
        const confirmed = await this.confirmDelete(count);
        if (!confirmed) {
            Log.info('BatchOperations', 'Delete operation cancelled by user');
            return false;
        }

        try {
            Log.info('BatchOperations', `Deleting ${count} messages...`);

            // 使用 DatasetManager 的批量删除
            const messageIds = this.getSelectedIds();

            // 分批删除（每次删除100条）
            const batchSize = 100;
            let deletedCount = 0;

            for (let i = 0; i < messageIds.length; i += batchSize) {
                const batch = messageIds.slice(i, Math.min(i + batchSize, messageIds.length));

                for (const messageId of batch) {
                    await window.DatasetManagerV3.deleteMessage(messageId);
                    deletedCount++;
                }

                // 更新进度
                if (i % (batchSize * 5) === 0 || i + batchSize >= messageIds.length) {
                    this.showNotification(`正在删除: ${deletedCount}/${count}`, 'info');
                }
            }

            // 清除选择
            this.clearSelection();

            // 重新加载消息
            await this.loadMessages();

            // 更新数据集统计
            await this.updateDatasetStats();

            this.showNotification(`成功删除 ${deletedCount} 条消息`, 'success');
            Log.info('BatchOperations', `Successfully deleted ${deletedCount} messages`);

            return true;

        } catch (error) {
            Log.error('BatchOperations', 'Batch delete failed:', error);
            this.showNotification('批量删除失败: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * 批量更新消息的情感值
     * @param {number} newSentiment - 新的情感值 (0=消极, 1=中性, 2=积极, 3=疑问)
     * @returns {Promise<boolean>} - 是否成功
     */
    async batchUpdateSentiment(newSentiment) {
        const count = this.getSelectedCount();

        if (count === 0) {
            Log.warn('BatchOperations', 'No messages selected for sentiment update');
            this.showNotification('请先选择要更新的消息', 'warning');
            return false;
        }

        try {
            Log.info('BatchOperations', `Updating sentiment to ${newSentiment} for ${count} messages...`);

            const messageIds = this.getSelectedIds();

            // 获取消息详情
            const messages = await Promise.all(
                messageIds.map(id => window.DatasetManagerV3.getMessage(id))
            );

            // 批量更新
            let updatedCount = 0;
            for (const message of messages) {
                if (message) {
                    message.sentiment = newSentiment;
                    await window.DatasetManagerV3.updateMessage(message.id, message);
                    updatedCount++;
                }
            }

            this.clearSelection();
            await this.loadMessages();

            this.showNotification(`成功更新 ${updatedCount} 条消息的情感值`, 'success');
            Log.info('BatchOperations', `Successfully updated sentiment for ${updatedCount} messages`);

            return true;

        } catch (error) {
            Log.error('BatchOperations', 'Batch sentiment update failed:', error);
            this.showNotification('批量更新失败: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * 批量导出消息
     * @param {string} format - 导出格式 ('json' | 'csv')
     * @returns {Promise<boolean>} - 是否成功
     */
    async batchExport(format = 'json') {
        const count = this.getSelectedCount();

        if (count === 0) {
            Log.warn('BatchOperations', 'No messages selected for export');
            this.showNotification('请先选择要导出的消息', 'warning');
            return false;
        }

        try {
            Log.info('BatchOperations', `Exporting ${count} messages as ${format}...`);

            const messageIds = this.getSelectedIds();

            // 获取消息详情
            const messages = await Promise.all(
                messageIds.map(id => window.DatasetManagerV3.getMessage(id))
            );

            // 过滤掉未找到的消息
            const validMessages = messages.filter(m => m !== null);

            if (format === 'json') {
                // 导出为JSON
                const exportData = {
                    datasetId: this.datasetId,
                    exportDate: new Date().toISOString(),
                    messageCount: validMessages.length,
                    messages: validMessages
                };

                const filename = `chatgalaxy_export_${Date.now()}.json`;
                this.downloadJSON(exportData, filename);

            } else if (format === 'csv') {
                // 导出为CSV
                const csv = this.convertToCSV(validMessages);
                const filename = `chatgalaxy_export_${Date.now()}.csv`;
                this.downloadCSV(csv, filename);
            }

            this.showNotification(`成功导出 ${validMessages.length} 条消息`, 'success');
            Log.info('BatchOperations', `Successfully exported ${validMessages.length} messages`);

            return true;

        } catch (error) {
            Log.error('BatchOperations', 'Batch export failed:', error);
            this.showNotification('批量导出失败: ' + error.message, 'error');
            return false;
        }
    }

    // ========== 辅助方法 ==========

    /**
     * 加载数据集的所有消息
     */
    async loadMessages() {
        try {
            const dataset = await window.DatasetManagerV3.getDataset(this.datasetId);

            if (!dataset) {
                throw new Error(`Dataset not found: ${this.datasetId}`);
            }

            // 从IndexedDB加载消息
            const messages = await window.DatasetManagerV3.getMessagesByDataset(this.datasetId);
            this.allMessages = messages || [];

            Log.info('BatchOperations', `Loaded ${this.allMessages.length} messages`);

        } catch (error) {
            Log.error('BatchOperations', 'Failed to load messages:', error);
            this.allMessages = [];
        }
    }

    /**
     * 更新数据集统计信息
     */
    async updateDatasetStats() {
        try {
            const dataset = await window.DatasetManagerV3.getDataset(this.datasetId);

            if (dataset) {
                // 更新消息数量
                dataset.messageCount = this.allMessages.length;

                // 更新参与者数量（重新计算）
                const participants = new Set();
                this.allMessages.forEach(msg => {
                    if (msg.senderId) {
                        participants.add(msg.senderId);
                    }
                });
                dataset.participantCount = participants.size;

                await window.DatasetManagerV3.updateDataset(dataset.id, dataset);

                Log.info('BatchOperations', `Updated dataset stats: ${dataset.messageCount} messages, ${dataset.participantCount} participants`);
            }

        } catch (error) {
            Log.error('BatchOperations', 'Failed to update dataset stats:', error);
        }
    }

    /**
     * 更新UI（触发自定义事件）
     */
    updateUI() {
        const event = new CustomEvent('batchSelectionChanged', {
            detail: {
                selectedCount: this.getSelectedCount(),
                isAllSelected: this.isAllSelected,
                selectedIds: this.getSelectedIds()
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * 确认删除对话框
     * @param {number} count - 删除数量
     * @returns {Promise<boolean>} - 是否确认
     */
    confirmDelete(count) {
        return new Promise((resolve) => {
            const message = `确定要删除选中的 ${count} 条消息吗？\n\n此操作不可恢复！`;

            // 使用原生confirm（后续可替换为自定义模态框）
            const confirmed = window.confirm(message);
            resolve(confirmed);
        });
    }

    /**
     * 显示通知
     * @param {string} message - 消息内容
     * @param {string} type - 类型 ('info' | 'success' | 'warning' | 'error')
     */
    showNotification(message, type = 'info') {
        // 触发自定义事件，让UI层处理通知显示
        const event = new CustomEvent('showNotification', {
            detail: { message, type }
        });

        document.dispatchEvent(event);

        // 降级方案：使用console
        Log.info('BatchOperations', `[${type.toUpperCase()}] ${message}`);
    }

    /**
     * 下载JSON文件
     * @param {Object} data - 数据对象
     * @param {string} filename - 文件名
     */
    downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        Log.info('BatchOperations', `Downloaded: ${filename}`);
    }

    /**
     * 下载CSV文件
     * @param {string} csv - CSV字符串
     * @param {string} filename - 文件名
     */
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        Log.info('BatchOperations', `Downloaded: ${filename}`);
    }

    /**
     * 转换为CSV格式
     * @param {Array} messages - 消息数组
     * @returns {string} - CSV字符串
     */
    convertToCSV(messages) {
        // CSV表头
        const headers = [
            'ID',
            '发送者',
            '时间',
            '内容',
            '情感',
            '关键词'
        ];

        // 情感值映射
        const sentimentMap = {
            0: '消极',
            1: '中性',
            2: '积极',
            3: '疑问'
        };

        // 转换每条消息
        const rows = messages.map(msg => {
            const timestamp = new Date(msg.timestamp * 1000).toLocaleString('zh-CN');
            const keywords = msg.keywords ? msg.keywords.join(', ') : '';
            const sentiment = sentimentMap[msg.sentiment] || '未知';

            return [
                msg.id,
                msg.senderName,
                timestamp,
                `"${msg.text.replace(/"/g, '""')}"`, // 处理CSV中的引号
                sentiment,
                `"${keywords}"`
            ].join(',');
        });

        // 组合CSV
        return [headers.join(','), ...rows].join('\n');
    }

    // ========== 清理资源 ==========

    /**
     * 销毁实例，清理资源
     */
    destroy() {
        this.selectedMessages.clear();
        this.allMessages = [];
        this.isAllSelected = false;

        Log.info('BatchOperations', 'Destroyed');
    }
}

// ========== 导出 ==========

window.ChatGalaxy.Data.DataBatchOperations = DataBatchOperations;

Log.info('BatchOperations', 'v1.0 loaded');
