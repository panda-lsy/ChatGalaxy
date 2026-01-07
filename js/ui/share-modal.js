/**
 * ChatGalaxy 分享模态框组件 v1.0
 * 提供数据集分享功能 UI
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

// ========== 分享模态框组件 ==========

class ShareModal extends HTMLElement {
    /**
     * 构造函数
     */
    constructor() {
        super();

        this.currentDataset = null;
        this.currentShareCode = null;
        this.isProcessing = false;

        Log.info('ShareModal', 'Component created');
    }

    /**
     * 自定义元素生命周期：连接到DOM
     */
    connectedCallback() {
        this.render();
        this.attachEventListeners();
        this.listenToEvents();

        Log.info('ShareModal', 'Component mounted');
    }

    /**
     * 自定义元素生命周期：从DOM断开
     */
    disconnectedCallback() {
        this.removeEventListeners();
        Log.info('ShareModal', 'Component unmounted');
    }

    // ========== 渲染方法 ==========

    /**
     * 渲染组件UI
     */
    render() {
        this.className = 'share-modal';
        this.style.display = 'none'; // 默认隐藏

        this.innerHTML = `
            <div class="share-modal__overlay" id="overlay">
                <div class="share-modal__dialog">
                    <!-- 头部 -->
                    <div class="share-modal__header">
                        <h2 class="share-modal__title">
                            <i class="ri-share-line"></i>
                            分享数据集
                        </h2>
                        <button class="share-modal__close" id="closeBtn">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>

                    <!-- 内容 -->
                    <div class="share-modal__body">
                        <!-- 步骤1：创建分享 -->
                        <div id="createShareStep" class="share-modal__step">
                            <div class="share-modal__section">
                                <h3 class="share-modal__section-title">
                                    <i class="ri-settings-3-line"></i>
                                    分享设置
                                </h3>

                                <!-- 权限 -->
                                <div class="share-modal__field">
                                    <label class="share-modal__label">访问权限</label>
                                    <div class="share-modal__permission-options">
                                        <label class="share-modal__permission-option">
                                            <input type="radio" name="permission" value="view" checked>
                                            <div class="permission-card">
                                                <i class="ri-eye-line"></i>
                                                <span>仅查看</span>
                                            </div>
                                        </label>
                                        <label class="share-modal__permission-option">
                                            <input type="radio" name="permission" value="edit">
                                            <div class="permission-card">
                                                <i class="ri-edit-line"></i>
                                                <span>可编辑</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <!-- 有效期 -->
                                <div class="share-modal__field">
                                    <label class="share-modal__label" for="expiresIn">
                                        有效期
                                    </label>
                                    <select id="expiresIn" class="share-modal__select">
                                        <option value="7">7 天</option>
                                        <option value="30" selected>30 天</option>
                                        <option value="90">90 天</option>
                                        <option value="0">永久有效</option>
                                    </select>
                                </div>

                                <!-- 访问密码 -->
                                <div class="share-modal__field">
                                    <label class="share-modal__label" for="password">
                                        访问密码 <span class="hint">（可选）</span>
                                    </label>
                                    <div class="share-modal__password-wrapper">
                                        <input
                                            type="password"
                                            id="password"
                                            class="share-modal__input"
                                            placeholder="留空则无需密码"
                                        />
                                        <button
                                            type="button"
                                            id="generatePasswordBtn"
                                            class="share-modal__icon-btn"
                                            title="生成随机密码"
                                        >
                                            <i class="ri-magic-line"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- 访问限制 -->
                                <div class="share-modal__field">
                                    <label class="share-modal__label" for="maxAccess">
                                        最大访问次数 <span class="hint">（0 = 无限制）</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="maxAccess"
                                        class="share-modal__input"
                                        min="0"
                                        value="0"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <!-- 创建按钮 -->
                            <div class="share-modal__actions">
                                <button type="button" id="createShareBtn" class="share-modal__btn share-modal__btn--primary">
                                    <i class="ri-link"></i>
                                    生成分享链接
                                </button>
                            </div>
                        </div>

                        <!-- 步骤2：显示分享码 -->
                        <div id="showShareStep" class="share-modal__step" style="display: none;">
                            <div class="share-modal__section">
                                <h3 class="share-modal__section-title">
                                    <i class="ri-checkbox-circle-line"></i>
                                    分享成功！
                                </h3>

                                <p style="color: var(--text-secondary, rgba(184, 193, 236, 0.7)); margin-bottom: 16px;">
                                    您的数据集已成功分享，复制下方的分享码发送给好友即可。
                                </p>

                                <!-- 分享码显示 -->
                                <div class="share-modal__share-code-display">
                                    <div class="share-code-box">
                                        <code id="shareCodeDisplay" class="share-code">XXXX-XXXX-XX</code>
                                    </div>
                                    <button type="button" id="copyShareCodeBtn" class="share-modal__btn share-modal__btn--secondary">
                                        <i class="ri-file-copy-line"></i>
                                        复制分享码
                                    </button>
                                </div>

                                <!-- 分享信息 -->
                                <div class="share-info-list">
                                    <div class="share-info-item">
                                        <i class="ri-eye-line"></i>
                                        <span>权限: <strong id="sharePermission">仅查看</strong></span>
                                    </div>
                                    <div class="share-info-item">
                                        <i class="ri-time-line"></i>
                                        <span>有效期: <strong id="shareExpires">30 天</strong></span>
                                    </div>
                                    <div class="share-info-item">
                                        <i class="ri-lock-line" id="sharePasswordIcon" style="display: none;"></i>
                                        <span id="sharePasswordText"></span>
                                    </div>
                                </div>

                                <!-- 二维码占位 -->
                                <div class="qr-code-placeholder" style="text-align: center; margin-top: 20px;">
                                    <div style="
                                        width: 150px;
                                        height: 150px;
                                        margin: 0 auto;
                                        background: rgba(255,255,255,0.05);
                                        border-radius: 8px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        color: var(--text-secondary, rgba(184, 193, 236, 0.5));
                                    ">
                                        <i class="ri-qr-code-line" style="font-size: 64px;"></i>
                                    </div>
                                    <p style="color: var(--text-secondary, rgba(184, 193, 236, 0.5)); font-size: 12px; margin-top: 8px;">
                                        二维码功能（即将推出）
                                    </p>
                                </div>
                            </div>

                            <!-- 操作按钮 -->
                            <div class="share-modal__actions">
                                <button type="button" id="backToCreateBtn" class="share-modal__btn share-modal__btn--secondary">
                                    <i class="ri-add-line"></i>
                                    创建新分享
                                </button>
                                <button type="button" id="closeShareBtn" class="share-modal__btn share-modal__btn--primary">
                                    <i class="ri-check-line"></i>
                                    完成
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

        // 生成密码按钮
        this.querySelector('#generatePasswordBtn').addEventListener('click', () => {
            this.generatePassword();
        });

        // 创建分享按钮
        this.querySelector('#createShareBtn').addEventListener('click', () => {
            this.handleCreateShare();
        });

        // 复制分享码按钮
        this.querySelector('#copyShareCodeBtn').addEventListener('click', () => {
            this.copyShareCode();
        });

        // 返回创建按钮
        this.querySelector('#backToCreateBtn').addEventListener('click', () => {
            this.showCreateStep();
        });

        // 完成按钮
        this.querySelector('#closeShareBtn').addEventListener('click', () => {
            this.close();
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
        // 监听分享数据集事件
        document.addEventListener('shareDataset', async (e) => {
            const datasetId = e.detail.datasetId;
            await this.open(datasetId);
        });
    }

    // ========== 操作方法 ==========

    /**
     * 打开分享模态框
     * @param {string} datasetId - 数据集 ID
     */
    async open(datasetId) {
        try {
            Log.info('ShareModal', `Opening share modal for dataset: ${datasetId}`);

            // 加载数据集
            const dataset = await window.DatasetManagerV3.getDataset(datasetId);

            if (!dataset) {
                throw new Error(`数据集不存在: ${datasetId}`);
            }

            this.currentDataset = dataset;

            // 显示创建步骤
            this.showCreateStep();

            // 显示模态框
            this.style.display = 'block';
            document.body.style.overflow = 'hidden'; // 防止背景滚动

        } catch (error) {
            Log.error('ShareModal', 'Failed to open share modal:', error);
            this.showNotification('打开分享失败: ' + error.message, 'error');
        }
    }

    /**
     * 关闭分享模态框
     */
    close() {
        this.style.display = 'none';
        document.body.style.overflow = ''; // 恢复背景滚动
        this.currentDataset = null;
        this.currentShareCode = null;

        Log.info('ShareModal', 'Share modal closed');
    }

    /**
     * 显示创建步骤
     */
    showCreateStep() {
        this.querySelector('#createShareStep').style.display = 'block';
        this.querySelector('#showShareStep').style.display = 'none';

        // 重置表单
        this.querySelector('#expiresIn').value = '30';
        this.querySelector('#password').value = '';
        this.querySelector('#maxAccess').value = '0';
        this.querySelector('input[name="permission"][value="view"]').checked = true;
    }

    /**
     * 显示分享码步骤
     * @param {Object} shareResult - 分享结果
     */
    showShareStep(shareResult) {
        this.querySelector('#createShareStep').style.display = 'none';
        this.querySelector('#showShareStep').style.display = 'block';

        // 显示分享码
        this.querySelector('#shareCodeDisplay').textContent = shareResult.shareCode;
        this.currentShareCode = shareResult.shareCode;

        // 显示分享信息
        const permissionMap = {
            'view': '仅查看',
            'edit': '可编辑'
        };
        this.querySelector('#sharePermission').textContent = permissionMap[shareResult.record.permission];

        // 计算剩余天数
        const expiresAt = shareResult.record.expiresAt;
        let expiresText = '';
        if (!expiresAt) {
            expiresText = '永久有效';
        } else {
            const remainingMs = expiresAt - Date.now();
            const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
            if (remainingDays <= 0) {
                expiresText = '已过期';
            } else {
                expiresText = `${remainingDays} 天后过期`;
            }
        }
        this.querySelector('#shareExpires').textContent = expiresText;

        // 显示密码信息
        if (shareResult.record.password) {
            this.querySelector('#sharePasswordIcon').style.display = 'inline';
            this.querySelector('#sharePasswordText').textContent = '需要密码访问';
        } else {
            this.querySelector('#sharePasswordIcon').style.display = 'none';
            this.querySelector('#sharePasswordText').textContent = '无需密码';
        }
    }

    /**
     * 生成随机密码
     */
    generatePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let password = '';
        for (let i = 0; i < 6; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // 设置密码到输入框
        const passwordInput = this.querySelector('#password');
        passwordInput.value = password;

        // 临时显示密码（3秒后自动隐藏）
        passwordInput.type = 'text';
        setTimeout(() => {
            passwordInput.type = 'password';
        }, 3000);

        // 在通知中显示密码
        this.showNotification(`密码已生成: ${password}`, 'success');

        // 自动复制密码到剪贴板
        navigator.clipboard.writeText(password).then(() => {
            Log.info('ShareModal', 'Password copied to clipboard');
        }).catch(err => {
            Log.warn('ShareModal', 'Failed to copy password:', err);
        });
    }

    /**
     * 处理创建分享
     */
    async handleCreateShare() {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.setLoading(true);

            // 获取表单数据
            const permission = this.querySelector('input[name="permission"]:checked').value;
            const expiresIn = parseInt(this.querySelector('#expiresIn').value);
            const password = this.querySelector('#password').value || null;
            const maxAccess = parseInt(this.querySelector('#maxAccess').value) || 0;

            // 创建分享
            const result = await window.DataShareManager.createShare({
                datasetId: this.currentDataset.id,
                permission: permission,
                expiresIn: expiresIn,
                password: password,
                maxAccess: maxAccess
            });

            if (result.success) {
                Log.info('ShareModal', 'Share created:', result);

                // 显示分享码
                this.showShareStep(result);

                this.showNotification('分享创建成功', 'success');
            } else {
                throw new Error('创建分享失败');
            }

        } catch (error) {
            Log.error('ShareModal', 'Failed to create share:', error);
            this.showNotification('创建分享失败: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.setLoading(false);
        }
    }

    /**
     * 复制分享码到剪贴板
     */
    async copyShareCode() {
        try {
            const shareCode = this.currentShareCode;

            if (!shareCode) {
                throw new Error('没有可复制的分享码');
            }

            await navigator.clipboard.writeText(shareCode);

            this.showNotification('分享码已复制到剪贴板', 'success');

        } catch (error) {
            Log.error('ShareModal', 'Failed to copy share code:', error);
            this.showNotification('复制失败: ' + error.message, 'error');
        }
    }

    // ========== UI更新 ==========

    /**
     * 设置加载状态
     * @param {boolean} loading - 是否加载中
     */
    setLoading(loading) {
        const createBtn = this.querySelector('#createShareBtn');

        if (loading) {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> 创建中...';
        } else {
            createBtn.disabled = false;
            createBtn.innerHTML = '<i class="ri-link"></i> 生成分享链接';
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

if (!customElements.get('share-modal')) {
    customElements.define('share-modal', ShareModal);
    Log.info('ShareModal', 'Custom element registered');
}

// ========== 导出 ==========

window.ChatGalaxy.UI.ShareModal = ShareModal;

Log.info('ShareModal', 'v1.0 loaded');
