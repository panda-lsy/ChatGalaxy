/**
 * ChatGalaxy 数据集管理
 * 支持多个聊天记录数据集的切换和管理
 */

// 数据集配置列表
const datasets = [
    {
        id: 'default',
        name: '海师电竞沙盒群',
        file: 'js/data.js',
        description: '23447条消息，93人',
        createdAt: '2024-08-09',
        messageCount: 23447,
        participantCount: 93,
        isActive: true
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

    return {
        name: dataset.name,
        messageCount: dataset.messageCount,
        participantCount: dataset.participantCount,
        createdAt: dataset.createdAt
    };
}

// 导出模块（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        datasets,
        getCurrentDataset,
        switchDataset,
        getAllDatasets,
        addDataset,
        detectAvailableDatasets,
        getDatasetStats
    };
}
