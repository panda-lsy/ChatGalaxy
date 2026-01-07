/**
 * ChatGalaxy 导入分享模态框组件 v1.0
 * 提供通过分享码导入数据集的功能 UI
 *
 * @requires js/data-share.js
 * @requires js/data/data-manager.js
 * @version 1.0.0
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
var Log = window.Log;

// ========== 确保命名空间存在 ==========
window.ChatGalaxy = window.ChatGalaxy || {};
window.ChatGalaxy.UI = window.ChatGalaxy.UI || {};

// ========== 导入分享模态框组件 ==========

class ImportShareModal extends HTMLElement {
    /**
     * 构造函数
     */
    constructor() {
        super();

        this.isProcessing = false;
        this.validatedShare = null;

        Log.info('ImportShareModal', 'Component created');
    }

    /**
     * 自定义元素生命周期：连接到DOM
     */
    connectedCallback() {
        this.render();
        this.attachEventListeners();
        this.listenToEvents();

        Log.info('ImportShareModal', 'Component mounted');
    }

    /**
     * 自定义元素生命周期：从DOM断开
     */
    disconnectedCallback() {
        this.removeEventListeners();
        Log.info('ImportShareModal', 'Component unmounted');
    }

    // ========== 渲染方法 ==========

    /**
     * 渲染组件UI
     */
    render() {
        this.className = 'import-share-modal';
        this.style.display = 'none'; // 默认隐藏

        this.innerHTML = `
            <div class="import-share-modal__overlay" id="overlay">
                <div class="import-share-modal__dialog">
                    <!-- 头部 -->
                    <div class="import-share-modal__header">
                        <h2 class="import-share-modal__title">
                            <i class="ri-download-cloud-line"></i>
                            导入分享数据集
                        </h2>
                        <button class="import-share-modal__close" id="closeBtn">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>

                    <!-- 内容 -->
                    <div class="import-share-modal__body">
                        <!-- 步骤1：输入分享码 -->
                        <div id="inputShareStep" class="import-share-modal__step">
                            <div class="import-share-modal__section">
                                <h3 class="import-share-modal__section-title">
                                    <i class="ri-key-line"></i>
                                    输入分享码
                                </h3>

                                <p style="color: var(--text-secondary, rgba(184, 193, 236, 0.7)); margin-bottom: 16px;">
                                    请输入好友分享的数据集分享码，格式如：ABCD-1234-56
                                </p>

                                <!-- 分享码输入 -->
                                <div class="import-share-modal__field">
                                    <label class="import-share-modal__label" for="shareCode">
                                        分享码 <span class="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="shareCode"
                                        class="import-share-modal__input"
                                        placeholder="ABCD-1234-56"
                                        maxlength="13"
                                        style="text-transform: uppercase;"
                                    />
                                    <p class="hint" style="font-size: 12px; color: var(--text-secondary, rgba(184, 193, 236, 0.5));">
                                        请输入完整的 13 位分享码（包含连字符）
                                    </p>
                                </div>

                                <!-- 密码输入（初始隐藏） -->
                                <div class="import-share-modal__field" id="passwordField" style="display: none;">
                                    <label class="import-share-modal__label" for="password">
                                        访问密码 <span class="required">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        class="import-share-modal__input"
                                        placeholder="请输入访问密码"
                                    />
                                </div>
                            </div>

                            <!-- 验证按钮 -->
                            <div class="import-share-modal__actions">
                                <button type="button" id="verifyShareBtn" class="import-share-modal__btn import-share-modal__btn--primary">
                                    <i class="ri-check-line"></i>
                                    验证分享码
                                </button>
                            </div>
                        </div>

                        <!-- 步骤2：显示数据集信息 -->
                        <div id="showDatasetStep" class="import-share-modal__step" style="display: none;">
                            <div class="import-share-modal__section">
                                <h3 class="import-share-modal__section-title">
                                    <i class="ri-database-2-line"></i>
                                    数据集信息
                                </h3>

                                <p style="color: var(--text-secondary, rgba(184, 193, 236, 0.7)); margin-bottom: 16px;">
                                    以下是通过分享码访问的数据集信息，请确认后导入。
                                </p>

                                <!-- 数据集信息卡片 -->
                                <div class="dataset-info-card">
                                    <div class="dataset-info-row">
                                        <i class="ri-folder-line"></i>
                                        <span class="label">名称:</span>
                                        <strong id="datasetName">-</strong>
                                    </div>
                                    <div class="dataset-info-row">
                                        <i class="ri-file-text-line"></i>
                                        <span class="label">描述:</span>
                                        <span id="datasetDescription">-</span>
                                    </div>
                                    <div class="dataset-info-row">
                                        <i class="ri-message-3-line"></i>
                                        <span class="label">消息数量:</span>
                                        <strong id="messageCount">0</strong>
                                    </div>
                                    <div class="dataset-info-row">
                                        <i class="ri-eye-line"></i>
                                        <span class="label">权限:</span>
                                        <strong id="sharePermission">-</strong>
                                    </div>
                                    <div class="dataset-info-row">
                                        <i class="ri-time-line"></i>
                                        <span class="label">创建时间:</span>
                                        <span id="createdAt">-</span>
                                    </div>
                                </div>

                                <!-- 导入选项 -->
                                <div class="import-share-modal__field" style="margin-top: 20px;">
                                    <label class="import-share-modal__label">导入选项</label>

                                    <div class="import-share-modal__field">
                                        <label class="import-share-modal__label" for="newDatasetName">
                                            新数据集名称 <span class="hint">（可选）</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="newDatasetName"
                                            class="import-share-modal__input"
                                            placeholder="留空使用原名称"
                                        />
                                    </div>

                                    <div class="import-share-modal__field">
                                        <label class="import-share-modal__label" for="newDatasetDescription">
                                            数据集描述 <span class="hint">（可选）</span>
                                        </label>
                                        <textarea
                                            id="newDatasetDescription"
                                            class="import-share-modal__textarea"
                                            rows="2"
                                            placeholder="留空使用原描述"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- 导入按钮 -->
                            <div class="import-share-modal__actions">
                                <button type="button" id="backToInputBtn" class="import-share-modal__btn import-share-modal__btn--secondary">
                                    <i class="ri-arrow-left-line"></i>
                                    返回
                                </button>
                                <button type="button" id="importShareBtn" class="import-share-modal__btn import-share-modal__btn--primary">
                                    <i class="ri-download-line"></i>
                                    导入数据集
                                </button>
                            </div>
                        </div>
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

        // 分享码输入格式化
        this.querySelector('#shareCode').addEventListener('input', (e) => {
            this.formatShareCode(e.target);
        });

        // 验证分享码按钮
        this.querySelector('#verifyShareBtn').addEventListener('click', () => {
            this.handleVerifyShare();
        });

        // 返回按钮
        this.querySelector('#backToInputBtn').addEventListener('click', () => {
            this.showInputStep();
        });

        // 导入按钮
        this.querySelector('#importShareBtn').addEventListener('click', () => {
            this.handleImportShare();
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
        // 监听导入分享事件
        document.addEventListener('importShare', () => {
            this.open();
        });
    }

    // ========== 操作方法 ==========

    /**
     * 打开导入分享模态框
     */
    open() {
        Log.info('ImportShareModal', 'Opening import share modal');

        // 显示输入步骤
        this.showInputStep();

        // 显示模态框
        this.style.display = 'block';
        document.body.style.overflow = 'hidden'; // 防止背景滚动

        // 聚焦分享码输入框
        setTimeout(() => {
            this.querySelector('#shareCode').focus();
        }, 100);
    }

    /**
     * 关闭导入分享模态框
     */
    close() {
        this.style.display = 'none';
        document.body.style.overflow = ''; // 恢复背景滚动
        this.validatedShare = null;

        Log.info('ImportShareModal', 'Import share modal closed');
    }

    /**
     * 显示输入步骤
     */
    showInputStep() {
        this.querySelector('#inputShareStep').style.display = 'block';
        this.querySelector('#showDatasetStep').style.display = 'none';

        // 重置表单
        this.querySelector('#shareCode').value = '';
        this.querySelector('#password').value = '';
        this.querySelector('#passwordField').style.display = 'none';

        this.validatedShare = null;
    }

    /**
     * 显示数据集步骤
     * @param {Object} validation - 验证结果
     */
    showDatasetStep(validation, messageCountText = '加载中...') {
        this.querySelector('#inputShareStep').style.display = 'none';
        this.querySelector('#showDatasetStep').style.display = 'block';

        const shareRecord = validation.record;

        // 显示数据集信息
        this.querySelector('#datasetName').textContent = shareRecord.datasetName;
        this.querySelector('#datasetDescription').textContent = shareRecord.datasetDescription || '无描述';

        // 格式化创建时间
        const createdDate = new Date(shareRecord.createdAt);
        const dateStr = createdDate.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        this.querySelector('#createdAt').textContent = dateStr;

        // 显示权限
        const permissionMap = {
            'view': '仅查看',
            'edit': '可编辑'
        };
        this.querySelector('#sharePermission').textContent = permissionMap[shareRecord.permission];

        // 显示消息数量（从参数传入）
        this.querySelector('#messageCount').textContent = messageCountText;
    }

    /**
     * 格式化分享码输入
     * @param {HTMLInputElement} input - 输入框元素
     */
    formatShareCode(input) {
        let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

        // 自动添加连字符
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4);
        }
        if (value.length > 9) {
            value = value.slice(0, 9) + '-' + value.slice(9);
        }

        input.value = value;
    }

    /**
     * 验证分享码
     */
    async handleVerifyShare() {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.setLoading(true);

            // 获取分享码和密码
            const shareCode = this.querySelector('#shareCode').value.trim().toUpperCase();
            const password = this.querySelector('#password').value;

            if (!shareCode) {
                throw new Error('请输入分享码');
            }

            // 验证分享码
            const validation = await window.DataShareManager.validateShare(shareCode, password);

            if (!validation.valid) {
                // 如果需要密码，显示密码输入框
                if (validation.requiresPassword) {
                    this.querySelector('#passwordField').style.display = 'block';
                    this.querySelector('#password').focus();
                    throw new Error('该分享码需要输入访问密码');
                }
                throw new Error(validation.error);
            }

            Log.info('ImportShareModal', 'Share validated:', validation);

            // 尝试获取实际消息数量
            const accessResult = await window.DataShareManager.accessSharedDataset(shareCode, password);
            Log.info('ImportShareModal', 'Access result:', accessResult);

            // 准备显示的消息数量和参与者数量
            let displayMessageCount = '加载中...';

            if (accessResult.success) {
                // 成功获取消息
                const messageCount = accessResult.messages?.length || 0;
                const participantCount = accessResult.dataset.participantCount || 0;
                displayMessageCount = `${messageCount.toLocaleString()} 条 / ${participantCount} 人`;
                Log.info('ImportShareModal', `Loaded ${messageCount} messages, ${participantCount} participants`);
            } else {
                // 如果获取消息失败，使用分享记录中的消息数量
                const shareRecord = validation.record;
                const count = shareRecord.messageCount || 0;
                const participants = shareRecord.participantCount || 0;
                displayMessageCount = `${count.toLocaleString()} 条 / ${participants} 人`;
                Log.warn('ImportShareModal', 'Failed to access messages, using cached count:', accessResult.error);
            }

            // 保存验证结果
            this.validatedShare = {
                shareCode: shareCode,
                password: password,
                validation: validation
            };

            // 显示数据集信息（传递消息数量）
            this.showDatasetStep(validation, displayMessageCount);

            this.showNotification('分享码验证成功', 'success');

        } catch (error) {
            Log.error('ImportShareModal', 'Failed to verify share:', error);
            this.showNotification('验证失败: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.setLoading(false);
        }
    }

    /**
     * 导入分享
     */
    async handleImportShare() {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.setLoading(true);

            if (!this.validatedShare) {
                throw new Error('请先验证分享码');
            }

            // 获取导入选项
            const newName = this.querySelector('#newDatasetName').value.trim();
            const newDescription = this.querySelector('#newDatasetDescription').value.trim();

            // 导入数据集
            const result = await window.DataShareManager.importSharedDataset(
                this.validatedShare.shareCode,
                this.validatedShare.password,
                {
                    name: newName || null,
                    description: newDescription || null
                }
            );

            if (result.success) {
                Log.info('ImportShareModal', 'Share imported:', result);

                this.showNotification(`数据集 "${result.dataset.name}" 导入成功！`, 'success');

                // 触发数据集更新事件
                document.dispatchEvent(new CustomEvent('datasetUpdated', {
                    detail: { datasetId: result.dataset.id }
                }));

                // 关闭模态框
                this.close();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            Log.error('ImportShareModal', 'Failed to import share:', error);
            this.showNotification('导入失败: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.setLoading(false);
        }
    }

    // ========== UI更新 ==========

    /**
     * 设置加载状态
     * @param {boolean} loading - 是否加载中
     */
    setLoading(loading) {
        const verifyBtn = this.querySelector('#verifyShareBtn');
        const importBtn = this.querySelector('#importShareBtn');

        if (loading) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> 验证中...';

            importBtn.disabled = true;
            importBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> 导入中...';
        } else {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="ri-check-line"></i> 验证分享码';

            importBtn.disabled = false;
            importBtn.innerHTML = '<i class="ri-download-line"></i> 导入数据集';
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

if (!customElements.get('import-share-modal')) {
    customElements.define('import-share-modal', ImportShareModal);
    Log.info('ImportShareModal', 'Custom element registered');
}

// ========== 导出 ==========

window.ChatGalaxy.UI.ImportShareModal = ImportShareModal;

Log.info('ImportShareModal', 'v1.0 loaded');
