/**
 * ChatGalaxy 数据集管理器 v3.0
 * 支持用户创建、删除、重命名、切换数据集
 * 存储：LocalStorage + IndexedDB
 * @version 3.0.0
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

// ========== 数据结构定义 ==========
/**
 * @typedef {Object} Dataset
 * @property {string} id - 唯一ID
 * @property {string} name - 数据集名称
 * @property {string} [description] - 描述
 * @property {string} createdAt - 创建时间（ISO格式）
 * @property {string} updatedAt - 更新时间（ISO格式）
 * @property {number} messageCount - 消息数量
 * @property {number} participantCount - 参与者数量
 * @property {string[]} tags - 标签
 * @property {string} color - 主题颜色
 * @property {boolean} isLocal - true=本地处理，false=云端处理
 * @property {'fast' | 'precise'} processMode - 处理模式
 */

// ========== IndexedDB 封装 ==========
class IndexedDBHelper {
    constructor(dbName, version) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建数据集存储
                if (!db.objectStoreNames.contains(window.ChatGalaxyConfig.DATASETS_STORE)) {
                    const datasetStore = db.createObjectStore(window.ChatGalaxyConfig.DATASETS_STORE, { keyPath: 'id' });
                    datasetStore.createIndex('name', 'name', { unique: false });
                    datasetStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // 创建消息存储
                if (!db.objectStoreNames.contains(window.ChatGalaxyConfig.MESSAGES_STORE)) {
                    const messageStore = db.createObjectStore(window.ChatGalaxyConfig.MESSAGES_STORE, { keyPath: 'id' });
                    messageStore.createIndex('datasetId', 'datasetId', { unique: false });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // 创建分享记录存储
                if (!db.objectStoreNames.contains('dataset_shares')) {
                    const shareStore = db.createObjectStore('dataset_shares', { keyPath: 'id' });
                    shareStore.createIndex('shareCode', 'shareCode', { unique: true });
                    shareStore.createIndex('datasetId', 'datasetId', { unique: false });
                    shareStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        // update 和 put 功能相同，都是插入或替换
        return this.put(storeName, data);
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// ========== 全局变量 ==========
let dbHelper = null;

/**
 * 初始化数据库
 */
async function initDatabase() {
    if (!dbHelper) {
        dbHelper = new IndexedDBHelper(window.ChatGalaxyConfig.DB_NAME, window.ChatGalaxyConfig.DB_VERSION);
        await dbHelper.init();
        Log.info('DB', 'IndexedDB initialized');
    }
    return dbHelper;
}

/**
 * 生成唯一ID（增加随机性和时间精度）
 */
function generateId() {
    // 使用 performance.now() 提供更高精度的时间戳（微秒级）
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15); // 更长的随机字符串
    return `dataset_${timestamp}_${random}`;
}

/**
 * 获取所有数据集
 * @returns {Promise<Dataset[]>}
 */
async function getAllDatasets() {
    await initDatabase();
    const datasets = await dbHelper.getAll(window.ChatGalaxyConfig.DATASETS_STORE);
    return datasets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * 获取单个数据集
 * @param {string} id - 数据集ID
 * @returns {Promise<Dataset|null>}
 */
async function getDataset(id) {
    await initDatabase();
    const datasets = await dbHelper.getAll(window.ChatGalaxyConfig.DATASETS_STORE);
    return datasets.find(ds => ds.id === id) || null;
}

/**
 * 创建新数据集
 * @param {Object} datasetInfo - 数据集信息
 * @returns {Promise<Dataset>}
 */
async function createDataset(datasetInfo) {
    await initDatabase();

    const now = new Date().toISOString();
    const dataset = {
        id: generateId(),
        name: datasetInfo.name || '未命名数据集',
        description: datasetInfo.description || '',
        createdAt: now,
        updatedAt: now,
        messageCount: datasetInfo.messageCount || 0,
        participantCount: datasetInfo.participantCount || 0,
        tags: datasetInfo.tags || [],
        color: datasetInfo.color || '#3498db',
        isLocal: true,
        processMode: 'fast',
        readonly: datasetInfo.readonly || false // 🔧 新增：只读标志（用于分享权限控制）
    };

    await dbHelper.add(window.ChatGalaxyConfig.DATASETS_STORE, dataset);
    Log.info('DB', 'Dataset created:', dataset.id);

    // 更新LocalStorage缓存
    await cacheDatasetList();

    return dataset;
}

/**
 * 批量保存消息到IndexedDB
 * @param {string} datasetId - 数据集ID
 * @param {Array} messages - 消息数组
 * @param {Function} onProgress - 进度回调 (current, total) => void
 * @returns {Promise<void>}
 */
async function saveMessages(datasetId, messages, onProgress) {
    const dbHelper = await initDatabase();
    const IMPORT_BATCH_SIZE = window.ChatGalaxyConfig.IMPORT_BATCH_SIZE;
    const MESSAGES_STORE = window.ChatGalaxyConfig.MESSAGES_STORE;

    const total = messages.length;
    const batches = Math.ceil(total / IMPORT_BATCH_SIZE);

    for (let i = 0; i < batches; i++) {
        const start = i * IMPORT_BATCH_SIZE;
        const end = Math.min(start + IMPORT_BATCH_SIZE, total);
        const batch = messages.slice(start, end);

        // 为每条消息设置datasetId
        batch.forEach(msg => {
            msg.datasetId = datasetId;
        });

        // 🔧 修复：使用 put() 而不是 add()，允许覆盖已存在的消息
        // 这样可以支持重新导入相同的文件
        for (const msg of batch) {
            await dbHelper.put(MESSAGES_STORE, msg);
        }

        // 报告进度
        if (onProgress) {
            onProgress(end, total);
        }
    }
}

/**
 * 批量添加消息（saveMessages 的别名）
 * @param {string} datasetId - 数据集ID
 * @param {Array} messages - 消息数组
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<void>}
 */
async function addMessages(datasetId, messages, onProgress) {
    // addMessages 是 saveMessages 的别名，提供一致的 API
    return saveMessages(datasetId, messages, onProgress);
}

/**
 * 删除数据集
 * @param {string} id - 数据集ID
 * @returns {Promise<void>}
 */
async function deleteDataset(id) {
    await initDatabase();

    // 删除数据集
    await dbHelper.delete(window.ChatGalaxyConfig.DATASETS_STORE, id);

    // 删除相关消息
    const messages = await dbHelper.getByIndex(window.ChatGalaxyConfig.MESSAGES_STORE, 'datasetId', id);
    for (const msg of messages) {
        await dbHelper.delete(window.ChatGalaxyConfig.MESSAGES_STORE, msg.id);
    }

    // Dataset deleted

    // 更新LocalStorage缓存
    await cacheDatasetList();

    // 如果删除的是当前数据集，切换到默认数据集
    const currentId = localStorage.getItem(window.ChatGalaxyConfig.CURRENT_DATASET_KEY);
    if (currentId === id) {
        const datasets = await getAllDatasets();
        if (datasets.length > 0) {
            await switchDataset(datasets[0].id);
        } else {
            localStorage.removeItem('chatgalaxy_currentDataset');
        }
    }
}

/**
 * 重命名数据集
 * @param {string} id - 数据集ID
 * @param {string} newName - 新名称
 * @returns {Promise<void>}
 */
async function renameDataset(id, newName) {
    await initDatabase();

    const dataset = await getDataset(id);
    if (!dataset) {
        throw new Error(`Dataset not found: ${id}`);
    }

    dataset.name = newName;
    dataset.updatedAt = new Date().toISOString();

    await dbHelper.put(window.ChatGalaxyConfig.DATASETS_STORE, dataset);
    // Dataset renamed

    // 更新LocalStorage缓存
    await cacheDatasetList();
}

/**
 * 切换当前数据集
 * @param {string} id - 数据集ID
 * @returns {Promise<void>}
 */
async function switchDataset(id) {
    await initDatabase();

    const dataset = await getDataset(id);
    if (!dataset) {
        throw new Error(`Dataset not found: ${id}`);
    }

    localStorage.setItem(window.ChatGalaxyConfig.CURRENT_DATASET_KEY, id);
    Log.info('DB', 'Switched to dataset:', id);

    // 触发数据加载
    await loadDatasetData(id);
}

/**
 * 缓存数据集列表到LocalStorage（快速访问）
 * @returns {Promise<void>}
 */
async function cacheDatasetList() {
    const datasets = await getAllDatasets();
    localStorage.setItem(window.ChatGalaxyConfig.DATASETS_CACHE_KEY, JSON.stringify(datasets));
}

/**
 * 从缓存获取数据集列表（快速访问）
 * @returns {Dataset[]}
 */
function getCachedDatasets() {
    const cached = localStorage.getItem(window.ChatGalaxyConfig.DATASETS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
}

/**
 * 收集发送者信息
 * @param {Array} messages - 消息数组
 * @returns {Object} { senders: Map, senderList: Array }
 */
function collectSenders(messages) {
    const senders = new Map();  // key: senderId, value: {id, name, count, index}
    let senderIndex = 0;

    messages.forEach((msg) => {
        if (!senders.has(msg.senderId)) {
            senders.set(msg.senderId, {
                id: msg.senderId,
                name: msg.senderName || 'Unknown',
                count: 0,
                index: senderIndex
            });
            senderIndex++;
        }
        senders.get(msg.senderId).count++;
    });

    // 按索引排序
    const senderList = Array.from(senders.values());
    senderList.sort((a, b) => a.index - b.index);

    return { senders, senderList };
}

/**
 * 统计情感和关键词
 * @param {Array} messages - 消息数组
 * @returns {Object} { sentimentMap, keywordCounts, keywordOccurrences }
 */
function collectSentimentAndKeywords(messages) {
    const sentimentMap = { 0: 0, 1: 0, 2: 0, 3: 0 };
    const keywordCounts = new Map();
    const keywordOccurrences = new Map();

    messages.forEach((msg, idx) => {
        // 统计情感
        sentimentMap[msg.sentiment] = (sentimentMap[msg.sentiment] || 0) + 1;

        // 统计关键词
        if (msg.keywords && Array.isArray(msg.keywords)) {
            msg.keywords.forEach(kw => {
                if (kw) {
                    keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
                    if (!keywordOccurrences.has(kw)) {
                        keywordOccurrences.set(kw, []);
                    }
                    keywordOccurrences.get(kw).push(idx);
                }
            });
        }
    });

    return { sentimentMap, keywordCounts, keywordOccurrences };
}

/**
 * 构建关键词排名
 * @param {Map} keywordCounts - 关键词计数
 * @returns {Array} 排名前N的关键词
 */
function buildKeywordRanking(keywordCounts) {
    return Array.from(keywordCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, window.ChatGalaxyConfig.KEYWORD_RANKING_COUNT);
}

/**
 * 构建图数据（关键词共现网络）
 * @param {Array} messages - 消息数组
 * @param {Map} keywordOccurrences - 关键词出现位置
 * @returns {Object} { nodes, links }
 */
function buildGraphData(messages, keywordOccurrences) {
    const totalMsgs = messages.length;

    // 动态配置（使用统一配置）
    const ratio = Math.max(1.0, totalMsgs / window.ChatGalaxyConfig.GRAPH_BASE_MESSAGE_COUNT);
    const MAX_NODES = Math.min(
        Math.floor(window.ChatGalaxyConfig.BASE_MAX_NODES * Math.pow(ratio, window.ChatGalaxyConfig.NODE_EXPONENT)),
        window.ChatGalaxyConfig.ABSOLUTE_MAX_NODES
    );
    const MIN_OCCURRENCE = Math.max(
        window.ChatGalaxyConfig.BASE_MIN_OCCURRENCE,
        Math.floor(Math.log(totalMsgs) * window.ChatGalaxyConfig.MIN_OCCURRENCE_COEFFICIENT)
    );
    const MIN_LINK_WEIGHT = Math.max(
        window.ChatGalaxyConfig.BASE_MIN_LINK_WEIGHT,
        Math.floor(Math.log(totalMsgs) * window.ChatGalaxyConfig.MIN_LINK_WEIGHT_COEFFICIENT)
    );

    Log.debug('Graph', `Building: ${totalMsgs} msgs -> MaxNodes:${MAX_NODES}, MinFreq:${MIN_OCCURRENCE}, MinLink:${MIN_LINK_WEIGHT}`);

    // 排序并筛选关键词
    const sortedKeywords = Array.from(keywordOccurrences.entries())
        .sort((a, b) => b[1].length - a[1].length);

    const filteredKeywords = sortedKeywords.filter(([, indices]) => indices.length >= MIN_OCCURRENCE);
    const topKeywords = filteredKeywords.slice(0, MAX_NODES);
    const validKeywordsSet = new Set(topKeywords.map(([kw]) => kw));

    // 生成节点
    const nodes = topKeywords.map(([kw, indices]) => {
        const timestamps = indices.map(idx => messages[idx].timestamp);
        const firstSeen = Math.min(...timestamps);

        return {
            id: kw,
            name: kw,
            value: indices.length,
            category: 'Keyword',
            first_seen: firstSeen
        };
    });

    // 生成连接
    const validKeywords = Array.from(validKeywordsSet);
    const links = [];

    for (let i = 0; i < validKeywords.length; i++) {
        for (let j = i + 1; j < validKeywords.length; j++) {
            const kw1 = validKeywords[i];
            const kw2 = validKeywords[j];

            const msgs1 = new Set(keywordOccurrences.get(kw1));
            const msgs2 = new Set(keywordOccurrences.get(kw2));

            // 计算交集
            const intersection = [...msgs1].filter(idx => msgs2.has(idx));
            const weight = intersection.length;

            if (weight >= MIN_LINK_WEIGHT) {
                const timestamps = intersection.map(idx => messages[idx].timestamp);
                const firstSeen = Math.min(...timestamps);

                links.push({
                    source: kw1,
                    target: kw2,
                    value: weight,
                    first_seen: firstSeen
                });
            }
        }
    }

    Log.debug('Graph', `Built: ${nodes.length} nodes, ${links.length} links`);

    return { nodes, links };
}

/**
 * 更新数据集统计信息
 * @param {string} datasetId - 数据集ID
 * @param {number} messageCount - 消息数量
 * @param {number} participantCount - 参与者数量
 * @returns {Promise<void>}
 */
async function updateDatasetStatistics(datasetId, messageCount, participantCount) {
    const dbHelper = await initDatabase();
    const dataset = await getDataset(datasetId);

    dataset.messageCount = messageCount;
    dataset.participantCount = participantCount;
    dataset.updatedAt = new Date().toISOString();

    await dbHelper.put(window.ChatGalaxyConfig.DATASETS_STORE, dataset);

    // 更新LocalStorage缓存以保持同步
    await cacheDatasetList();
}

/**
 * 构建CHAT_DATA数据结构
 * @param {Array} messages - 原始消息数组
 * @param {Map} senders - 发送者Map
 * @param {Array} senderList - 发送者列表
 * @param {Object} sentimentMap - 情感统计
 * @param {Array} keywordRanking - 关键词排名
 * @param {Array} nodes - 图节点
 * @param {Array} links - 图连接
 * @returns {Object} CHAT_DATA结构
 */
function buildChatDataStructure(messages, senders, senderList, sentimentMap, keywordRanking, nodes, links) {
    // 🔧 确保消息按时间戳排序（升序）
    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);

    return {
        meta: {
            senders: senderList.map(s => ({ id: s.id, name: s.name, count: s.count })),
            sentiment_map: sentimentMap,
            layout: {},
            ranking: keywordRanking
        },
        messages: sortedMessages.map(msg => [
            msg.id,
            senders.get(msg.senderId).index,
            msg.timestamp,
            msg.text,
            msg.sentiment,
            msg.keywords || []
        ]),
        graph: {
            nodes: nodes,
            links: links
        }
    };
}

/**
 * 获取数据集的所有消息
 * @param {string} datasetId - 数据集ID
 * @returns {Promise<Array>} 消息数组
 */
async function getMessagesByDataset(datasetId) {
    const dbHelper = await initDatabase();
    const messages = await dbHelper.getByIndex(window.ChatGalaxyConfig.MESSAGES_STORE, 'datasetId', datasetId);
    return messages || [];
}

/**
 * 获取单条消息
 * @param {string} messageId - 消息ID
 * @returns {Promise<Object|null>} 消息对象，如果不存在则返回 null
 */
async function getMessage(messageId) {
    const dbHelper = await initDatabase();

    try {
        // IndexedDB 没有直接通过主键获取单个对象的方法，需要获取所有然后过滤
        // 但这效率很低。更好的方法是先获取 datasetId，然后查询

        // 方法：获取所有存储的数据集，找到消息所在的dataset
        const datasets = await dbHelper.getAll(window.ChatGalaxyConfig.DATASETS_STORE);

        // 尝试从每个数据集中查找消息（效率较低但保证准确性）
        for (const dataset of datasets) {
            const messages = await dbHelper.getByIndex(window.ChatGalaxyConfig.MESSAGES_STORE, 'datasetId', dataset.id);
            const message = messages.find(m => m.id === messageId);
            if (message) {
                return message;
            }
        }

        return null;
    } catch (error) {
        Log.error('DB', `Failed to get message ${messageId}:`, error);
        return null;
    }
}

/**
 * 更新单条消息
 * @param {string} messageId - 消息ID
 * @param {Object} updatedMessage - 更新后的消息对象
 * @returns {Promise<void>}
 */
async function updateMessage(messageId, updatedMessage) {
    const dbHelper = await initDatabase();

    try {
        await dbHelper.put(window.ChatGalaxyConfig.MESSAGES_STORE, updatedMessage);
        Log.debug('DB', `Message updated: ${messageId}`);
    } catch (error) {
        Log.error('DB', `Failed to update message ${messageId}:`, error);
        throw error;
    }
}

/**
 * 加载数据集数据（重构版）
 * @param {string} datasetId - 数据集ID
 * @returns {Promise<Object>}
 */
async function loadDatasetData(datasetId) {
    const dbHelper = await initDatabase();
    const messages = await dbHelper.getByIndex(window.ChatGalaxyConfig.MESSAGES_STORE, 'datasetId', datasetId);

    // 空数据集处理
    if (!messages || messages.length === 0) {
        window.CHAT_DATA = {
            meta: {
                senders: [],
                sentiment_map: {},
                layout: {},
                ranking: []
            },
            messages: [],
            graph: { nodes: [], links: [] }
        };
        return window.CHAT_DATA;
    }

    // 分步骤处理数据
    const { senders, senderList } = collectSenders(messages);
    const { sentimentMap, keywordCounts, keywordOccurrences } = collectSentimentAndKeywords(messages);
    const keywordRanking = buildKeywordRanking(keywordCounts);
    const { nodes, links } = buildGraphData(messages, keywordOccurrences);

    // 更新数据集统计
    await updateDatasetStatistics(datasetId, messages.length, senderList.length);

    // 构建最终数据结构
    window.CHAT_DATA = buildChatDataStructure(
        messages,
        senders,
        senderList,
        sentimentMap,
        keywordRanking,
        nodes,
        links
    );

    Log.debug('Data', 'Dataset loaded:', datasetId);
    return window.CHAT_DATA;
}

// ========== 全局导出 ==========
window.DatasetManagerV3 = {
    initDatabase,
    getAllDatasets,
    getDataset,
    createDataset,
    deleteDataset,
    renameDataset,
    switchDataset,
    loadDatasetData,
    getMessagesByDataset,
    getMessage, // 🔧 新增：获取单条消息
    updateMessage, // 🔧 新增：更新单条消息
    saveMessages,
    addMessages, // 🔧 新增：批量添加消息（saveMessages 的别名）
    updateDatasetStatistics,
    cacheDatasetList,
    getCachedDatasets
};

Log.info('Init', 'DatasetManager v3.0 initialized');
