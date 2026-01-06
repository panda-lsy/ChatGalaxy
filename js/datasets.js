/**
 * ChatGalaxy 数据集管理 v2.0
 * 支持多个聊天记录数据集的切换和管理
 * 集成 insights.js 和 data.js
 * @version 2.0.0
 * @updated 2025-01-06
 */

// 数据集配置列表
const datasets = [
    {
        id: 'default',
        name: '海师电竞沙盒群',
        file: 'js/data.js',
        insightsFile: 'js/insights.js',
        description: '292,765条消息，108人，宝可梦主题群聊',
        createdAt: '2024-08-13',
        messageCount: 292765,
        participantCount: 108,
        isActive: true,
        tags: ['宝可梦', '游戏', '服务器', '日常'],
        color: '#3498db'
    }
];

// 当前活跃的数据集ID
let currentDatasetId = localStorage.getItem('chatgalaxy_dataset') || 'default';

/**
 * 获取当前活跃的数据集
 * @returns {Object} 数据集对象
 */
function getCurrentDataset() {
    return datasets.find(ds => ds.id === currentDatasetId) || datasets[0];
}

/**
 * 切换到指定数据集
 * @param {string} datasetId - 数据集ID
 * @returns {boolean} 是否成功切换
 */
function switchDataset(datasetId) {
    const dataset = datasets.find(ds => ds.id === datasetId);
    if (!dataset) {
        console.error('Dataset not found:', datasetId);
        return false;
    }

    // 保存到localStorage
    localStorage.setItem('chatgalaxy_dataset', datasetId);
    currentDatasetId = datasetId;

    console.log('Switched to dataset:', dataset.name);
    return true;
}

/**
 * 获取所有数据集列表
 * @returns {Array} 数据集数组
 */
function getAllDatasets() {
    return datasets;
}

/**
 * 添加新数据集
 * @param {Object} datasetInfo - 数据集信息
 * @returns {boolean} 是否成功添加
 */
function addDataset(datasetInfo) {
    const newId = 'dataset_' + Date.now();
    const newDataset = {
        id: newId,
        name: datasetInfo.name || '未命名数据集',
        file: datasetInfo.file,
        description: datasetInfo.description || '',
        createdAt: new Date().toISOString().split('T')[0],
        messageCount: datasetInfo.messageCount || 0,
        participantCount: datasetInfo.participantCount || 0,
        isActive: false
    };

    datasets.push(newDataset);
    return newId;
}

/**
 * 检测可用的数据集文件
 * @returns {Promise<Array>} 可用数据集列表
 */
async function detectAvailableDatasets() {
    const availableDatasets = [];

    // 检查默认数据集
    try {
        const response = await fetch('js/data.js');
        if (response.ok) {
            availableDatasets.push({
                file: 'js/data.js',
                name: '默认数据集',
                exists: true
            });
        }
    } catch (e) {
        // 文件不存在
    }

    // 检查其他数据集（data_*.js）
    const possibleFiles = [
        'js/data_group1.js',
        'js/data_group2.js',
        'js/data_haishi.js'
    ];

    for (const file of possibleFiles) {
        try {
            const response = await fetch(file);
            if (response.ok) {
                availableDatasets.push({
                    file: file,
                    name: file.replace('js/data_', '').replace('.js', ''),
                    exists: true
                });
            }
        } catch (e) {
            // 文件不存在
        }
    }

    return availableDatasets;
}

/**
 * 获取数据集统计信息
 * @param {string} datasetId - 数据集ID
 * @returns {Object} 统计信息
 */
function getDatasetStats(datasetId) {
    const dataset = datasets.find(ds => ds.id === datasetId);
    if (!dataset) {
        return null;
    }

    // 尝试从 INSIGHTS_DATA 获取详细统计
    let insightsStats = null;
    if (window.INSIGHTS_DATA) {
        insightsStats = {
            topSenders: window.INSIGHTS_DATA.basic_stats.top_senders,
            peakHour: window.INSIGHTS_DATA.time_analysis.peak_hour,
            sentiment: window.INSIGHTS_DATA.sentiment.overall
        };
    }

    return {
        name: dataset.name,
        messageCount: dataset.messageCount,
        participantCount: dataset.participantCount,
        createdAt: dataset.createdAt,
        tags: dataset.tags,
        insights: insightsStats
    };
}

/**
 * 获取数据集的完整洞察数据
 * @param {string} datasetId - 数据集ID（为未来多数据集支持预留）
 * @returns {Object|null} 洞察数据
 */
function getDatasetInsights(datasetId) {
    if (!window.INSIGHTS_DATA) {
        console.warn('INSIGHTS_DATA not loaded');
        return null;
    }

    // TODO: 未来支持多个数据集时，根据 datasetId 返回对应的 insights
    // 当前版本中，所有数据集共享同一个 INSIGHTS_DATA
    return window.INSIGHTS_DATA;
}

/**
 * 按标签筛选数据集
 * @param {string} tag - 标签
 * @returns {Array} 匹配的数据集数组
 */
function filterDatasetsByTag(tag) {
    return datasets.filter(ds => ds.tags && ds.tags.includes(tag));
}

/**
 * 搜索数据集
 * @param {string} query - 搜索关键词
 * @returns {Array} 匹配的数据集数组
 */
function searchDatasets(query) {
    const lowerQuery = query.toLowerCase();
    return datasets.filter(ds =>
        ds.name.toLowerCase().includes(lowerQuery) ||
        ds.description.toLowerCase().includes(lowerQuery) ||
        (ds.tags && ds.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
}

/**
 * 获取所有使用中的标签
 * @returns {Array} 标签数组
 */
function getAllTags() {
    const tagSet = new Set();
    datasets.forEach(ds => {
        if (ds.tags) {
            ds.tags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet);
}

/**
 * 加载数据集的聊天数据
 * @param {string} datasetId - 数据集ID
 * @returns {Promise<Object>} 聊天数据
 */
async function loadDatasetData(datasetId) {
    const dataset = datasets.find(ds => ds.id === datasetId);
    if (!dataset) {
        throw new Error(`Dataset not found: ${datasetId}`);
    }

    try {
        const response = await fetch(dataset.file);
        if (!response.ok) {
            throw new Error(`Failed to load ${dataset.file}`);
        }

        // 数据已经通过 <script> 标签加载到 window.CHAT_DATA
        if (window.CHAT_DATA) {
            return window.CHAT_DATA;
        } else {
            throw new Error('CHAT_DATA not loaded');
        }
    } catch (error) {
        console.error('Error loading dataset data:', error);
        throw error;
    }
}

/**
 * 获取数据集健康状态
 * @returns {Object} 健康状态报告
 */
function getHealthStatus() {
    const status = {
        chatData: typeof window.CHAT_DATA !== 'undefined',
        insightsData: typeof window.INSIGHTS_DATA !== 'undefined',
        threeJS: typeof window.THREE !== 'undefined',
        d3: typeof window.d3 !== 'undefined',
        forceGraph: typeof window.Graph !== 'undefined'
    };

    const allHealthy = Object.values(status).every(v => v);

    return {
        healthy: allHealthy,
        components: status,
        timestamp: new Date().toISOString()
    };
}

/**
 * 导出当前数据集配置为 JSON
 * @returns {string} JSON 字符串
 */
function exportDatasetConfig() {
    return JSON.stringify({
        datasets: datasets,
        current: currentDatasetId,
        exportedAt: new Date().toISOString()
    }, null, 2);
}

// ========== 全局导出 ==========

// 导出到全局对象（供非模块化环境使用）
window.DatasetManager = {
    datasets,
    getCurrentDataset,
    switchDataset,
    getAllDatasets,
    addDataset,
    detectAvailableDatasets,
    getDatasetStats,
    getDatasetInsights,
    filterDatasetsByTag,
    searchDatasets,
    getAllTags,
    loadDatasetData,
    getHealthStatus,
    exportDatasetConfig
};

// 添加便捷访问器
window.DATASETS = datasets;
window.currentDataset = datasets[0];

console.log('📊 DatasetManager v2.0 initialized');

// 导出模块（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        datasets,
        getCurrentDataset,
        switchDataset,
        getAllDatasets,
        addDataset,
        detectAvailableDatasets,
        getDatasetStats,
        getDatasetInsights,
        filterDatasetsByTag,
        searchDatasets,
        getAllTags,
        loadDatasetData,
        getHealthStatus,
        exportDatasetConfig
    };
}
