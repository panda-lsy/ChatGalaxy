/**
 * ChatGalaxy 数据集分享模块 v1.0
 * 提供数据集分享码生成、验证、导入功能
 *
 * @requires js/data/data-manager.js
 * @requires js/utils/logger.js
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

// ========== 数据集分享管理器 ==========

class DataShareManager {
    constructor() {
        // 存储名称
        this.STORE_NAME = 'dataset_shares';

        // 缓存分享记录
        this.shareCache = new Map();

        Log.info('DataShareManager', 'Module initialized');
    }

    // ========== 分享码生成 ==========

    /**
     * 生成随机字符串
     * @param {number} length - 长度
     * @returns {string} - 随机字符串
     */
    generateRandomString(length) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 生成校验码
     * @param {string} shareCode - 分享码
     * @returns {string} - 校验码（2 位）
     */
    generateChecksum(shareCode) {
        let sum = 0;
        for (let i = 0; i < shareCode.length; i++) {
            sum += shareCode.charCodeAt(i);
        }
        return (sum % 100).toString().padStart(2, '0');
    }

    /**
     * 生成完整的分享码（带校验）
     * 格式：XXXX-XXXX-XX（如：ABC1-23XY-12）
     * @returns {string} - 完整分享码
     */
    generateFullShareCode() {
        // 生成第一段（4个字符）
        const part1 = this.generateRandomString(4);

        // 生成第二段（4个字符）
        const part2 = this.generateRandomString(4);

        // 计算校验码（基于前两段）
        const code = part1 + part2;
        const checksum = this.generateChecksum(code);

        // 返回格式：XXXX-XXXX-XX
        return `${part1}-${part2}-${checksum}`;
    }

    /**
     * 验证分享码格式
     * @param {string} fullCode - 完整分享码
     * @returns {boolean} - 是否有效
     */
    validateShareCodeFormat(fullCode) {
        // 格式：XXXX-XXXX-XX
        const pattern = /^[A-Z0-9]{4,6}-[A-Z0-9]{4}-\d{2}$/;
        if (!pattern.test(fullCode)) {
            return false;
        }

        // 验证校验码
        const parts = fullCode.split('-');
        const code = parts.slice(0, -1).join('');
        const checksum = parts[parts.length - 1];

        const expectedChecksum = this.generateChecksum(code);
        return checksum === expectedChecksum;
    }

    // ========== 分享记录管理 ==========

    /**
     * 创建分享记录
     * @param {Object} options - 分享选项
     * @param {string} options.datasetId - 数据集 ID
     * @param {string} options.permission - 权限类型（'view' | 'edit'）
     * @param {number} options.expiresIn - 过期时间（天数，0 = 永久）
     * @param {string} options.password - 访问密码（可选）
     * @param {number} options.maxAccess - 最大访问次数（0 = 无限制）
     * @returns {Promise<Object>} - 分享记录
     */
    async createShare(options) {
        try {
            const {
                datasetId,
                permission = 'view',
                expiresIn = 30,
                password = null,
                maxAccess = 0
            } = options;

            // 验证数据集是否存在
            const dataset = await window.DatasetManagerV3.getDataset(datasetId);
            if (!dataset) {
                throw new Error(`数据集不存在: ${datasetId}`);
            }

            // 🔧 获取消息快照（用于跨环境分享）
            const dbHelper = await window.DatasetManagerV3.initDatabase();
            let messages = await dbHelper.getByIndex(
                window.ChatGalaxyConfig.MESSAGES_STORE,
                'datasetId',
                datasetId
            );

            // 🔧 如果索引查询失败，尝试降级方案：getAll + 过滤
            if (!messages || messages.length === 0) {
                const allMessages = await dbHelper.getAll(window.ChatGalaxyConfig.MESSAGES_STORE);
                messages = allMessages.filter(msg => msg.datasetId === datasetId);
            }

            // 使用数据集记录的 messageCount 作为最终验证
            const expectedCount = dataset.messageCount || 0;
            if ((!messages || messages.length === 0) && expectedCount > 0) {
                throw new Error(`无法获取消息数据。预期 ${expectedCount} 条，但查询返回 0 条。请尝试刷新页面后重试。`);
            }

            if (!messages || messages.length === 0) {
                throw new Error(`数据集没有消息: ${datasetId}`);
            }

            // 生成分享码
            const shareCode = this.generateFullShareCode();

            // 计算过期时间
            let expiresAt = null;
            if (expiresIn > 0) {
                expiresAt = Date.now() + (expiresIn * 24 * 60 * 60 * 1000);
            }

            // 创建分享记录（包含消息快照）
            const shareRecord = {
                id: this.generateId(),
                shareCode: shareCode,
                datasetId: datasetId,
                datasetName: dataset.name,
                datasetDescription: dataset.description,
                messageCount: dataset.messageCount || messages.length, // 使用实际消息数量
                participantCount: dataset.participantCount || 0,
                permission: permission, // 'view' | 'edit'
                password: password ? this.hashPassword(password) : null,
                messagesSnapshot: messages, // 🔧 保存消息快照
                tags: dataset.tags || [],
                color: dataset.color || '#3498db',
                createdAt: Date.now(),
                expiresAt: expiresAt,
                maxAccess: maxAccess,
                accessCount: 0,
                lastAccessedAt: null,
                createdBy: 'local'
            };

            // 保存到 IndexedDB
            await dbHelper.add(this.STORE_NAME, shareRecord);

            // 更新缓存
            this.shareCache.set(shareCode, shareRecord);

            return {
                success: true,
                shareCode: shareCode,
                record: shareRecord
            };

        } catch (error) {
            Log.error('DataShareManager', 'Failed to create share:', error);
            throw error;
        }
    }

    /**
     * 获取分享记录
     * @param {string} shareCode - 分享码
     * @returns {Promise<Object|null>} - 分享记录或 null
     */
    async getShare(shareCode) {
        try {
            // 检查缓存
            if (this.shareCache.has(shareCode)) {
                return this.shareCache.get(shareCode);
            }

            // 从 IndexedDB 查询
            const dbHelper = await window.DatasetManagerV3.initDatabase();
            const shares = await dbHelper.getAll(this.STORE_NAME);

            const shareRecord = shares.find(s => s.shareCode === shareCode);

            if (shareRecord) {
                // 更新缓存
                this.shareCache.set(shareCode, shareRecord);
            }

            return shareRecord || null;

        } catch (error) {
            Log.error('DataShareManager', 'Failed to get share:', error);
            return null;
        }
    }

    /**
     * 验证分享码并检查权限
     * @param {string} shareCode - 分享码
     * @param {string} password - 密码（如果有）
     * @returns {Promise<Object>} - 验证结果
     */
    async validateShare(shareCode, password = null) {
        try {
            // 验证格式
            if (!this.validateShareCodeFormat(shareCode)) {
                return {
                    valid: false,
                    error: '分享码格式无效'
                };
            }

            // 获取分享记录
            const shareRecord = await this.getShare(shareCode);

            if (!shareRecord) {
                return {
                    valid: false,
                    error: '分享码不存在或已失效'
                };
            }

            // 检查过期时间
            if (shareRecord.expiresAt && Date.now() > shareRecord.expiresAt) {
                return {
                    valid: false,
                    error: '分享码已过期'
                };
            }

            // 检查访问次数
            if (shareRecord.maxAccess > 0 && shareRecord.accessCount >= shareRecord.maxAccess) {
                return {
                    valid: false,
                    error: '分享码访问次数已达上限'
                };
            }

            // 验证密码
            if (shareRecord.password) {
                if (!password) {
                    return {
                        valid: false,
                        error: '需要输入访问密码',
                        requiresPassword: true
                    };
                }

                const hashedPassword = this.hashPassword(password);
                if (hashedPassword !== shareRecord.password) {
                    return {
                        valid: false,
                        error: '密码错误'
                    };
                }
            }

            return {
                valid: true,
                record: shareRecord
            };

        } catch (error) {
            Log.error('DataShareManager', 'Failed to validate share:', error);
            return {
                valid: false,
                error: '验证失败: ' + error.message
            };
        }
    }

    /**
     * 通过分享码访问数据集
     * @param {string} shareCode - 分享码
     * @param {string} password - 密码（可选）
     * @returns {Promise<Object>} - 访问结果
     */
    async accessSharedDataset(shareCode, password = null) {
        try {
            // 验证分享码
            const validation = await this.validateShare(shareCode, password);

            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            const shareRecord = validation.record;

            // 🔧 优先使用消息快照（用于跨环境分享）
            let messages = null;
            if (shareRecord.messagesSnapshot && shareRecord.messagesSnapshot.length > 0) {
                messages = shareRecord.messagesSnapshot;
            } else {
                // 如果没有快照，尝试从数据库获取（同环境分享）
                const dataset = await window.DatasetManagerV3.getDataset(shareRecord.datasetId);

                if (!dataset) {
                    return {
                        success: false,
                        error: '数据集不存在'
                    };
                }

                // 获取消息
                const dbHelper = await window.DatasetManagerV3.initDatabase();
                messages = await dbHelper.getByIndex(
                    window.ChatGalaxyConfig.MESSAGES_STORE,
                    'datasetId',
                    shareRecord.datasetId
                );
            }

            if (!messages || messages.length === 0) {
                return {
                    success: false,
                    error: '没有找到消息数据'
                };
            }

            // 更新访问统计
            await this.updateAccessStats(shareCode);

            // 构建虚拟数据集对象（用于返回）
            const dataset = {
                id: shareRecord.datasetId,
                name: shareRecord.datasetName,
                description: shareRecord.datasetDescription,
                messageCount: shareRecord.messageCount,
                participantCount: shareRecord.participantCount,
                tags: shareRecord.tags || [],
                color: shareRecord.color || '#3498db'
            };

            return {
                success: true,
                dataset: dataset,
                messages: messages,
                permission: shareRecord.permission,
                shareRecord: shareRecord
            };

        } catch (error) {
            Log.error('DataShareManager', 'Failed to access shared dataset:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 导入分享的数据集
     * @param {string} shareCode - 分享码
     * @param {string} password - 密码（可选）
     * @param {Object} options - 导入选项
     * @returns {Promise<Object>} - 导入结果
     */
    async importSharedDataset(shareCode, password = null, options = {}) {
        try {
            const {
                name = null,
                description = null,
                tags = [],
                color = null
            } = options;

            // 访问分享的数据集
            const accessResult = await this.accessSharedDataset(shareCode, password);

            if (!accessResult.success) {
                return accessResult;
            }

            const { dataset, messages } = accessResult;

            // 计算参与者数量
            const participants = new Set();
            messages.forEach(msg => {
                if (msg.senderName) {
                    participants.add(msg.senderName);
                } else if (msg.sender?.name) {
                    participants.add(msg.sender.name);
                }
            });
            const participantCount = participants.size;

            // 创建新数据集（根据分享权限设置 readonly）
            const newDataset = await window.DatasetManagerV3.createDataset({
                name: name || `${dataset.name} (导入)`,
                description: description || dataset.description,
                tags: tags.length > 0 ? tags : dataset.tags,
                color: color || dataset.color,
                messageCount: messages.length,
                participantCount: participantCount,
                readonly: accessResult.permission === 'view' // 🔧 仅查看权限的数据集设为只读
            });

            // 🔧 修复：为每条消息生成新的 id，避免与原数据集的消息 id 冲突
            const newMessages = messages.map(msg => ({
                ...msg,
                id: this.generateId() // 生成新的消息 id
            }));

            // 批量添加消息
            await window.DatasetManagerV3.addMessages(newDataset.id, newMessages);

            return {
                success: true,
                dataset: newDataset,
                messageCount: newMessages.length,
                participantCount: participantCount
            };

        } catch (error) {
            Log.error('DataShareManager', 'Failed to import shared dataset:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 更新访问统计
     * @param {string} shareCode - 分享码
     */
    async updateAccessStats(shareCode) {
        try {
            const shareRecord = await this.getShare(shareCode);

            if (!shareRecord) {
                return;
            }

            // 更新访问统计
            shareRecord.accessCount += 1;
            shareRecord.lastAccessedAt = Date.now();

            // 保存到 IndexedDB
            const dbHelper = await window.DatasetManagerV3.initDatabase();
            await dbHelper.update(this.STORE_NAME, shareRecord);

            // 更新缓存
            this.shareCache.set(shareCode, shareRecord);

        } catch (error) {
            Log.error('DataShareManager', 'Failed to update access stats:', error);
        }
    }

    /**
     * 删除分享
     * @param {string} shareCode - 分享码
     * @returns {Promise<boolean>} - 是否成功
     */
    async deleteShare(shareCode) {
        try {
            const shareRecord = await this.getShare(shareCode);

            if (!shareRecord) {
                return false;
            }

            // 从 IndexedDB 删除
            const dbHelper = await window.DatasetManagerV3.initDatabase();
            await dbHelper.delete(this.STORE_NAME, shareRecord.id);

            // 从缓存删除
            this.shareCache.delete(shareCode);

            Log.info('DataShareManager', `Deleted share: ${shareCode}`);

            return true;

        } catch (error) {
            Log.error('DataShareManager', 'Failed to delete share:', error);
            return false;
        }
    }

    /**
     * 获取数据集的所有分享
     * @param {string} datasetId - 数据集 ID
     * @returns {Promise<Array>} - 分享记录列表
     */
    async getDatasetShares(datasetId) {
        try {
            const dbHelper = await window.DatasetManagerV3.initDatabase();
            const shares = await dbHelper.getAll(this.STORE_NAME);

            return shares.filter(s => s.datasetId === datasetId);

        } catch (error) {
            Log.error('DataShareManager', 'Failed to get dataset shares:', error);
            return [];
        }
    }

    /**
     * 获取所有分享记录
     * @returns {Promise<Array>} - 分享记录列表
     */
    async getAllShares() {
        try {
            const dbHelper = await window.DatasetManagerV3.initDatabase();
            return await dbHelper.getAll(this.STORE_NAME);

        } catch (error) {
            Log.error('DataShareManager', 'Failed to get all shares:', error);
            return [];
        }
    }

    // ========== 工具函数 ==========

    /**
     * 生成唯一 ID
     * @returns {string} - ID
     */
    generateId() {
        return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 哈希密码（简单实现，生产环境应使用更强的哈希）
     * @param {string} password - 密码
     * @returns {string} - 哈希后的密码
     */
    hashPassword(password) {
        // 简单哈希（仅用于演示，生产环境应使用 bcrypt 等）
        let hash = 0;
        const str = password + 'chatsalaxy_salt';
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * 清理过期分享
     * @returns {Promise<number>} - 清理数量
     */
    async cleanupExpiredShares() {
        try {
            const dbHelper = await window.DatasetManagerV3.initDatabase();
            const shares = await dbHelper.getAll(this.STORE_NAME);

            const now = Date.now();
            const expiredShares = shares.filter(s => s.expiresAt && s.expiresAt < now);

            for (const share of expiredShares) {
                await dbHelper.delete(this.STORE_NAME, share.id);
                this.shareCache.delete(share.shareCode);
            }

            Log.info('DataShareManager', `Cleaned up ${expiredShares.length} expired shares`);

            return expiredShares.length;

        } catch (error) {
            Log.error('DataShareManager', 'Failed to cleanup expired shares:', error);
            return 0;
        }
    }
}

// ========== 创建全局实例 ==========

window.DataShareManager = new DataShareManager();

// ========== 导出 ==========

window.ChatGalaxy.DataShareManager = DataShareManager;

Log.info('DataShareManager', 'v1.0 loaded');
