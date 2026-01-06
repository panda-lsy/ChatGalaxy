/**
 * ChatGalaxy 消息编辑器模态框组件 v1.0
 * 提供单条消息的编辑功能
 *
 * @requires js/data-manager.js
 * @requires js/processors/text-processor.js
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

// ========== 编辑器模态框组件 ==========

class EditorModal extends HTMLElement {
    /**
     * 构造函数
     */
    constructor() {
        super();

        this.currentMessage = null;
        this.isProcessing = false;

        Log.info('EditorModal', 'Component created');
    }

    /**
     * 自定义元素生命周期：连接到DOM
     */
    connectedCallback() {
        this.render();
        this.attachEventListeners();
        this.listenToEvents();

        Log.info('EditorModal', 'Component mounted');
    }

    /**
     * 自定义元素生命周期：从DOM断开
     */
    disconnectedCallback() {
        this.removeEventListeners();
        Log.info('EditorModal', 'Component unmounted');
    }

    // ========== 渲染方法 ==========

    /**
     * 渲染组件UI
     */
    render() {
        this.className = 'editor-modal';
        this.style.display = 'none'; // 默认隐藏

        this.innerHTML = `
            <div class="editor-modal__overlay" id="overlay">
                <div class="editor-modal__dialog">
                    <!-- 头部 -->
                    <div class="editor-modal__header">
                        <h2 class="editor-modal__title">
                            <i class="ri-edit-2-line"></i>
                            编辑消息
                        </h2>
                        <button class="editor-modal__close" id="closeBtn">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>

                    <!-- 内容 -->
                    <div class="editor-modal__body">
                        <form id="editForm" class="editor-modal__form">
                            <!-- 消息ID（只读） -->
                            <div class="editor-modal__field">
                                <label class="editor-modal__label">消息ID</label>
                                <input
                                    type="text"
                                    id="messageId"
                                    class="editor-modal__input"
                                    readonly
                                    disabled
                                />
                            </div>

                            <!-- 发送者 -->
                            <div class="editor-modal__field">
                                <label class="editor-modal__label" for="senderName">
                                    发送者 <span class="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="senderName"
                                    class="editor-modal__input"
                                    placeholder="请输入发送者名称"
                                    required
                                />
                            </div>

                            <!-- 消息内容 -->
                            <div class="editor-modal__field">
                                <label class="editor-modal__label" for="messageText">
                                    消息内容 <span class="required">*</span>
                                </label>
                                <textarea
                                    id="messageText"
                                    class="editor-modal__textarea"
                                    rows="5"
                                    placeholder="请输入消息内容"
                                    required
                                ></textarea>
                            </div>

                            <!-- 时间戳 -->
                            <div class="editor-modal__field">
                                <label class="editor-modal__label" for="timestamp">
                                    时间 <span class="required">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    id="timestamp"
                                    class="editor-modal__input"
                                    required
                                />
                            </div>

                            <!-- 情感值 -->
                            <div class="editor-modal__field">
                                <label class="editor-modal__label" for="sentiment">
                                    情感值
                                </label>
                                <select id="sentiment" class="editor-modal__select">
                                    <option value="0">😞 消极</option>
                                    <option value="1">😐 中性</option>
                                    <option value="2">😊 积极</option>
                                    <option value="3">❓ 疑问</option>
                                </select>
                            </div>

                            <!-- 关键词 -->
                            <div class="editor-modal__field">
                                <label class="editor-modal__label" for="keywords">
                                    关键词 <span class="hint">（自动提取）</span>
                                </label>
                                <div class="editor-modal__keywords-wrapper">
                                    <input
                                        type="text"
                                        id="keywords"
                                        class="editor-modal__input"
                                        placeholder="自动提取，可手动编辑"
                                    />
                                    <button
                                        type="button"
                                        id="reextractBtn"
                                        class="editor-modal__btn editor-modal__btn--secondary"
                                    >
                                        <i class="ri-magic-line"></i>
                                        重新提取
                                    </button>
                                </div>
                            </div>

                            <!-- 数据集信息（只读） -->
                            <div class="editor-modal__field">
                                <label class="editor-modal__label">数据集ID</label>
                                <input
                                    type="text"
                                    id="datasetId"
                                    class="editor-modal__input"
                                    readonly
                                    disabled
                                />
                            </div>
                        </form>
                    </div>

                    <!-- 底部按钮 -->
                    <div class="editor-modal__footer">
                        <button
                            type="button"
                            id="cancelBtn"
                            class="editor-modal__btn editor-modal__btn--secondary"
                        >
                            <i class="ri-close-line"></i>
                            取消
                        </button>
                        <button
                            type="button"
                            id="saveBtn"
                            class="editor-modal__btn editor-modal__btn--primary"
                        >
                            <i class="ri-save-line"></i>
                            保存更改
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== 事件处理 ==========

    /**
     * 附加事件监听器
     */
    attachEventListeners() {
        // 关闭按钮
        this.querySelector('#closeBtn').addEventListener('click', () => {
            this.close();
        });

        // 取消按钮
        this.querySelector('#cancelBtn').addEventListener('click', () => {
            this.close();
        });

        // 保存按钮
        this.querySelector('#saveBtn').addEventListener('click', () => {
            this.handleSave();
        });

        // 重新提取关键词
        this.querySelector('#reextractBtn').addEventListener('click', () => {
            this.handleReextractKeywords();
        });

        // 点击遮罩层关闭
        this.querySelector('#overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.close();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.style.display !== 'none') {
                this.close();
            }
        });
    }

    /**
     * 移除事件监听器
     */
    removeEventListeners() {
        // 事件监听器会随着元素移除自动清理
    }

    /**
     * 监听自定义事件
     */
    listenToEvents() {
        // 监听编辑消息事件
        document.addEventListener('editMessage', async (e) => {
            const messageId = e.detail.messageId;
            await this.open(messageId);
        });
    }

    // ========== 操作方法 ==========

    /**
     * 打开编辑器
     * @param {string} messageId - 消息ID
     */
    async open(messageId) {
        try {
            Log.info('EditorModal', `Opening editor for message: ${messageId}`);

            // 加载消息数据
            const message = await window.DatasetManagerV3.getMessage(messageId);

            if (!message) {
                throw new Error(`消息不存在: ${messageId}`);
            }

            this.currentMessage = message;

            // 填充表单
            this.populateForm(message);

            // 显示模态框
            this.style.display = 'block';
            document.body.style.overflow = 'hidden'; // 防止背景滚动

            // 聚焦第一个输入框
            setTimeout(() => {
                this.querySelector('#senderName').focus();
            }, 100);

        } catch (error) {
            Log.error('EditorModal', 'Failed to open editor:', error);
            this.showNotification('打开编辑器失败: ' + error.message, 'error');
        }
    }

    /**
     * 关闭编辑器
     */
    close() {
        this.style.display = 'none';
        document.body.style.overflow = ''; // 恢复背景滚动
        this.currentMessage = null;

        Log.info('EditorModal', 'Editor closed');
    }

    /**
     * 填充表单
     * @param {Object} message - 消息对象
     */
    populateForm(message) {
        // 消息ID
        this.querySelector('#messageId').value = message.id || '';

        // 发送者
        this.querySelector('#senderName').value = message.senderName || '';

        // 消息内容
        this.querySelector('#messageText').value = message.text || '';

        // 时间戳（智能判断格式，转换为datetime-local格式）
        let timestampMs;
        if (message.timestamp < 10000000000) {
            // 秒级时间戳，转换为毫秒
            timestampMs = message.timestamp * 1000;
        } else {
            // 已经是毫秒级时间戳
            timestampMs = message.timestamp;
        }

        const timestamp = new Date(timestampMs);
        const year = timestamp.getFullYear();
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getDate()).padStart(2, '0');
        const hours = String(timestamp.getHours()).padStart(2, '0');
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        this.querySelector('#timestamp').value = `${year}-${month}-${day}T${hours}:${minutes}`;

        // 情感值
        this.querySelector('#sentiment').value = message.sentiment || 1;

        // 关键词
        const keywords = (message.keywords || []).join(', ');
        this.querySelector('#keywords').value = keywords;

        // 数据集ID
        this.querySelector('#datasetId').value = message.datasetId || '';
    }

    /**
     * 获取表单数据
     * @returns {Object} - 表单数据
     */
    getFormData() {
        const timestampInput = this.querySelector('#timestamp').value;
        const parsedTimestamp = new Date(timestampInput).getTime(); // 返回毫秒级时间戳

        const keywordsStr = this.querySelector('#keywords').value;
        const keywords = keywordsStr
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        return {
            id: this.querySelector('#messageId').value,
            senderName: this.querySelector('#senderName').value,
            text: this.querySelector('#messageText').value,
            timestamp: parsedTimestamp, // 保持毫秒级时间戳
            sentiment: parseInt(this.querySelector('#sentiment').value),
            keywords: keywords,
            datasetId: this.querySelector('#datasetId').value
        };
    }

    /**
     * 处理保存
     */
    async handleSave() {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.setLoading(true);

            // 验证表单
            const formData = this.getFormData();

            if (!formData.senderName || !formData.text) {
                throw new Error('请填写必填字段');
            }

            Log.info('EditorModal', 'Saving message:', formData);

            // 更新消息
            await window.DatasetManagerV3.updateMessage(formData.id, formData);

            // 触发消息编辑完成事件
            document.dispatchEvent(new CustomEvent('messageEdited', {
                detail: { messageId: formData.id }
            }));

            // 触发数据集更新事件
            document.dispatchEvent(new CustomEvent('datasetUpdated', {
                detail: { datasetId: formData.datasetId }
            }));

            this.showNotification('消息保存成功', 'success');
            this.close();

        } catch (error) {
            Log.error('EditorModal', 'Failed to save message:', error);
            this.showNotification('保存失败: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.setLoading(false);
        }
    }

    /**
     * 重新提取关键词
     */
    async handleReextractKeywords() {
        try {
            const text = this.querySelector('#messageText').value;

            if (!text) {
                this.showNotification('请先输入消息内容', 'warning');
                return;
            }

            // 使用TextProcessor提取关键词
            if (window.TextProcessor && typeof window.TextProcessor.extractKeywords === 'function') {
                const keywords = await window.TextProcessor.extractKeywords(text, 5);
                const keywordsStr = keywords.map(k => k.word).join(', ');

                this.querySelector('#keywords').value = keywordsStr;

                this.showNotification('关键词已重新提取', 'success');
            } else {
                this.showNotification('TextProcessor 不可用', 'error');
            }

        } catch (error) {
            Log.error('EditorModal', 'Failed to reextract keywords:', error);
            this.showNotification('提取失败: ' + error.message, 'error');
        }
    }

    // ========== UI更新 ==========

    /**
     * 设置加载状态
     * @param {boolean} loading - 是否加载中
     */
    setLoading(loading) {
        const saveBtn = this.querySelector('#saveBtn');

        if (loading) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> 保存中...';
        } else {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ri-save-line"></i> 保存更改';
        }
    }

    /**
     * 显示通知
     * @param {string} message - 消息内容
     * @param {string} type - 类型
     */
    showNotification(message, type = 'info') {
        const event = new CustomEvent('showNotification', {
            detail: { message, type }
        });

        document.dispatchEvent(event);
    }

    // ========== 公共API ==========

    /**
     * 是否已打开
     * @returns {boolean}
     */
    isOpen() {
        return this.style.display !== 'none';
    }
}

// ========== 注册自定义元素 ==========

if (!customElements.get('editor-modal')) {
    customElements.define('editor-modal', EditorModal);
    Log.info('EditorModal', 'Custom element registered');
}

// ========== 导出 ==========

window.ChatGalaxy.UI.EditorModal = EditorModal;

Log.info('EditorModal', 'v1.0 loaded');
