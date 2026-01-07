/**
 * ChatGalaxy 左侧边栏（消息侧边栏）
 * 显示关键词排名和聊天消息
 * @version 1.0.0
 * @updated 2026-01-07
 * @author 深山有密林团队
 */

import { SidebarBase } from './sidebar-base.js';

/**
 * 左侧边栏类
 * @class
 * @extends SidebarBase
 */
export class MessageSidebar extends SidebarBase {
    /**
     * 构造函数
     */
    constructor() {
        super({
            id: 'message-sidebar',
            position: 'left',
            width: 320,
            collapsible: true
        });

        // 状态
        this.currentTab = 'keywords'; // 'keywords' | 'messages'
        this.keywords = [];
        this.messages = [];
        this.filteredMessages = [];

        // UI 元素
        this.tabsElement = null;
        this.keywordsListElement = null;
        this.messagesListElement = null;
        this.searchInput = null;

        // 初始化
        this._initUI();
    }

    /**
     * 初始化 UI
     * @private
     */
    _initUI() {
        // 查找关键元素
        this.tabsElement = document.getElementById('message-sidebar-tabs');
        this.keywordsListElement = document.getElementById('keyword-ranking-list');
        this.messagesListElement = document.getElementById('chat-list-content');
        this.searchInput = document.getElementById('search-input');

        // 初始化标签页
        this._initTabs();

        // 初始化搜索功能
        this._initSearch();

        console.log('✅ [MessageSidebar] UI initialized');
    }

    /**
     * 初始化标签页
     * @private
     */
    _initTabs() {
        if (!this.tabsElement) return;

        const tabBtns = this.tabsElement.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    /**
     * 初始化搜索功能
     * @private
     */
    _initSearch() {
        if (!this.searchInput) return;

        this.searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            this.handleSearch(searchTerm);
        });
    }

    /**
     * 切换标签页
     * @param {string} tabName - 标签页名称
     */
    switchTab(tabName) {
        if (!['keywords', 'messages'].includes(tabName)) {
            console.warn(`⚠️ [MessageSidebar] Invalid tab: ${tabName}`);
            return;
        }

        this.currentTab = tabName;

        // 更新标签页样式
        if (this.tabsElement) {
            const tabBtns = this.tabsElement.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                if (btn.dataset.tab === tabName) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // 切换内容显示
        if (tabName === 'keywords') {
            this.keywordsListElement?.classList.add('active');
            this.messagesListElement?.classList.remove('active');
        } else {
            this.keywordsListElement?.classList.remove('active');
            this.messagesListElement?.classList.add('active');
        }

        console.log(`🔄 [MessageSidebar] Switched to tab: ${tabName}`);
    }

    /**
     * 加载关键词数据
     * @param {Array} keywords - 关键词数组
     */
    loadKeywords(keywords) {
        this.keywords = keywords || [];

        if (!this.keywordsListElement) {
            console.warn('⚠️ [MessageSidebar] Keywords list element not found');
            return;
        }

        // 清空现有列表
        this.keywordsListElement.innerHTML = '';

        // 渲染关键词列表
        const fragment = document.createDocumentFragment();

        this.keywords.forEach((keyword, index) => {
            const item = this._createKeywordItem(keyword, index + 1);
            fragment.appendChild(item);
        });

        this.keywordsListElement.appendChild(fragment);

        console.log(`✅ [MessageSidebar] Loaded ${this.keywords.length} keywords`);
    }

    /**
     * 创建关键词列表项
     * @private
     * @param {Object} keyword - 关键词对象
     * @param {number} rank - 排名
     * @returns {HTMLElement}
     */
    _createKeywordItem(keyword, rank) {
        const item = document.createElement('div');
        item.className = 'keyword-item';
        item.dataset.keyword = keyword.word;

        // 排名颜色
        let rankColor = '#ccc';
        if (rank === 1) rankColor = '#ffd700';
        else if (rank === 2) rankColor = '#c0c0c0';
        else if (rank === 3) rankColor = '#cd7f32';

        item.innerHTML = `
            <span class="keyword-rank" style="color: ${rankColor}">${rank}</span>
            <span class="keyword-name">${keyword.word}</span>
            <span class="keyword-count">${keyword.count}次</span>
        `;

        // 点击事件
        item.addEventListener('click', () => {
            this.filterByKeyword(keyword.word);
        });

        return item;
    }

    /**
     * 加载消息数据
     * @param {Array} messages - 消息数组
     */
    loadMessages(messages) {
        this.messages = messages || [];
        this.filteredMessages = [...this.messages];

        if (!this.messagesListElement) {
            console.warn('⚠️ [MessageSidebar] Messages list element not found');
            return;
        }

        // 渲染消息列表
        this._renderMessages();

        console.log(`✅ [MessageSidebar] Loaded ${this.messages.length} messages`);
    }

    /**
     * 渲染消息列表
     * @private
     */
    _renderMessages() {
        // 清空现有列表
        this.messagesListElement.innerHTML = '';

        // 渲染消息
        const fragment = document.createDocumentFragment();

        this.filteredMessages.forEach(message => {
            const item = this._createMessageItem(message);
            fragment.appendChild(item);
        });

        this.messagesListElement.appendChild(fragment);
    }

    /**
     * 创建消息列表项
     * @private
     * @param {Object} message - 消息对象
     * @returns {HTMLElement}
     */
    _createMessageItem(message) {
        const item = document.createElement('div');
        item.className = 'message-item';
        item.dataset.messageId = message.id;

        // 头像颜色
        const avatarColor = this._getAvatarColor(message.senderId);

        item.innerHTML = `
            <div class="avatar" style="background: ${avatarColor}">
                ${message.senderName ? message.senderName.charAt(0).toUpperCase() : '?'}
            </div>
            <div class="msg-bubble">
                <div class="msg-header">
                    <span class="sender-name">${message.senderName || '未知'}</span>
                    <span class="msg-time">${this._formatTime(message.timestamp)}</span>
                </div>
                <div class="msg-content">${message.text || ''}</div>
            </div>
        `;

        // 点击事件
        item.addEventListener('click', () => {
            this.onMessageClick(message);
        });

        return item;
    }

    /**
     * 根据关键词过滤消息
     * @param {string} keyword - 关键词
     */
    filterByKeyword(keyword) {
        if (!keyword) {
            this.filteredMessages = [...this.messages];
        } else {
            this.filteredMessages = this.messages.filter(msg => {
                const text = msg.text || '';
                const keywords = msg.keywords || [];
                return text.includes(keyword) || keywords.includes(keyword);
            });
        }

        this._renderMessages();

        // 切换到消息标签页
        this.switchTab('messages');

        console.log(`🔍 [MessageSidebar] Filtered by keyword: ${keyword}, ${this.filteredMessages.length} messages`);
    }

    /**
     * 处理搜索
     * @param {string} searchTerm - 搜索词
     */
    handleSearch(searchTerm) {
        if (!searchTerm) {
            this.filteredMessages = [...this.messages];
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            this.filteredMessages = this.messages.filter(msg => {
                const text = (msg.text || '').toLowerCase();
                const sender = (msg.senderName || '').toLowerCase();
                return text.includes(lowerTerm) || sender.includes(lowerTerm);
            });
        }

        this._renderMessages();

        console.log(`🔍 [MessageSidebar] Search: "${searchTerm}", ${this.filteredMessages.length} messages`);
    }

    /**
     * 获取头像颜色
     * @private
     * @param {string} senderId - 发送者ID
     * @returns {string} 颜色值
     */
    _getAvatarColor(senderId) {
        const colors = [
            '#FF9A8B', '#52C41A', '#177DDC', '#722ED1',
            '#FF6A88', '#73D13D', '#3C9AE8', '#9254DE'
        ];

        // 根据ID生成颜色索引
        const hash = senderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % colors.length;

        return colors[index];
    }

    /**
     * 格式化时间
     * @private
     * @param {number} timestamp - 时间戳
     * @returns {string} 格式化后的时间
     */
    _formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // 小于1分钟
        if (diff < 60000) {
            return '刚刚';
        }

        // 小于1小时
        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分钟前`;
        }

        // 小于24小时
        if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}小时前`;
        }

        // 其他情况
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');

        return `${month}-${day} ${hour}:${minute}`;
    }

    /**
     * 更新内容（重写基类方法）
     * @param {Object} data - 数据对象
     */
    updateContent(data) {
        if (data.keywords) {
            this.loadKeywords(data.keywords);
        }

        if (data.messages) {
            this.loadMessages(data.messages);
        }
    }

    /**
     * 消息点击事件
     * @param {Object} message - 消息对象
     */
    onMessageClick(message) {
        console.log('📩 [MessageSidebar] Message clicked:', message.id);

        // 触发自定义事件
        const event = new CustomEvent('messageSelected', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }

    /**
     * 生命周期钩子：主题变更时
     * @override
     * @param {Object} data - 主题数据
     */
    onThemeChange(data) {
        super.onThemeChange(data);

        // 重新渲染头像颜色
        this._renderMessages();
    }

    /**
     * 生命周期钩子：显示时
     * @override
     */
    onShow() {
        super.onShow();

        // 加载初始数据
        if (window.CHAT_DATA) {
            this.updateContent({
                keywords: window.CHAT_DATA.meta?.ranking || [],
                messages: window.CHAT_DATA.messages || []
            });
        }
    }
}

// 创建全局单例
let messageSidebarInstance = null;

/**
 * 获取消息侧边栏实例
 * @returns {MessageSidebar}
 */
export function getMessageSidebar() {
    if (!messageSidebarInstance) {
        messageSidebarInstance = new MessageSidebar();

        // 注册到侧边栏管理器
        if (window.SidebarManager) {
            window.SidebarManager.register('message-sidebar', messageSidebarInstance);
        }
    }

    return messageSidebarInstance;
}

// 导出到全局
window.MessageSidebar = getMessageSidebar;

// 默认导出
export default getMessageSidebar;
