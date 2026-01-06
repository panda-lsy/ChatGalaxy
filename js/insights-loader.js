/**
 * ChatGalaxy 洞察数据加载器
 * 从IndexedDB加载数据集并生成洞察报告
 * @version 2.0.0
 * @updated 2026-01-06
 */

const DB_NAME = 'ChatGalaxyDB';
const DB_VERSION = 1;
const DATASETS_STORE = 'datasets';
const MESSAGES_STORE = 'messages';

// 打开数据库
async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(DATASETS_STORE)) {
                db.createObjectStore(DATASETS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
                const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
                store.createIndex('datasetId', 'datasetId', { unique: false });
            }
        };
    });
}

// 获取消息
async function getMessages(db, datasetId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(MESSAGES_STORE);
        const index = store.index('datasetId');
        const request = index.getAll(datasetId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 获取数据集（包含图数据）
async function getDataset(db, datasetId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DATASETS_STORE], 'readonly');
        const store = transaction.objectStore(DATASETS_STORE);
        const request = store.get(datasetId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 构建图数据（从关键词统计）
function buildGraphFromKeywords(keywordCounts, messages) {
    const MAX_NODES = 500;
    const MIN_LINK_WEIGHT = 2;

    // 选择热门关键词作为节点
    const sortedKeywords = Array.from(keywordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_NODES);

    const nodes = sortedKeywords.map(([keyword, count], index) => ({
        id: index.toString(),
        name: keyword,
        count: count,
        val: Math.max(5, Math.min(20, Math.log(count + 1) * 3))
    }));

    // 构建共现关系
    const linkCounts = new Map();
    const keywordToIndex = new Map(nodes.map((n, i) => [n.name, i]));

    messages.forEach(msg => {
        if (msg.keywords && Array.isArray(msg.keywords) && msg.keywords.length >= 2) {
            const validKeywords = msg.keywords
                .filter(kw => kw && kw.trim() && keywordToIndex.has(kw.trim()))
                .map(kw => kw.trim())
                .slice(0, 10);

            for (let i = 0; i < validKeywords.length; i++) {
                for (let j = i + 1; j < validKeywords.length; j++) {
                    const idx1 = keywordToIndex.get(validKeywords[i]);
                    const idx2 = keywordToIndex.get(validKeywords[j]);
                    const linkKey = `${idx1}-${idx2}`;
                    linkCounts.set(linkKey, (linkCounts.get(linkKey) || 0) + 1);
                }
            }
        }
    });

    // 生成边
    const links = [];
    linkCounts.forEach((count, linkKey) => {
        if (count >= MIN_LINK_WEIGHT) {
            const [source, target] = linkKey.split('-').map(Number);
            links.push({ source, target, value: count, count });
        }
    });

    links.sort((a, b) => b.value - a.value);
    const maxLinks = Math.min(links.length, nodes.length * 3);

    return { nodes, links: links.slice(0, maxLinks) };
}

// 加载数据
async function loadInsightsData() {
    const loadingDiv = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const updateLoading = (text) => { if (loadingText) loadingText.textContent = text; };

    const currentDatasetId = localStorage.getItem('chatgalaxy_currentDataset');
    updateLoading('正在加载数据...');

    if (!currentDatasetId) {
        // 未选择数据集，显示友好提示
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📊</div>
                    <div style="font-size: 24px; margin-bottom: 20px;">未选择数据集</div>
                    <div style="font-size: 16px; opacity: 0.8; margin-bottom: 30px;">
                        请先在数据管理器中选择或导入数据集
                    </div>
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <a href="data-manager.html" style="padding: 15px 30px; font-size: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 50px; cursor: pointer; text-decoration: none; display: inline-block;">
                            📁 前往数据管理器
                        </a>
                        <a href="index.html" style="padding: 15px 30px; font-size: 18px; background: rgba(255,255,255,0.2); color: white; border: 2px solid white; border-radius: 50px; cursor: pointer; text-decoration: none; display: inline-block;">
                            🌌 返回3D星系
                        </a>
                    </div>
                </div>
            `;
        }
        window.USE_INDEXEDDB_INSIGHTS = false;
        return;
    }

    // 直接从 IndexedDB 加载数据
    loadDataFromIndexedDB();

    async function loadDataFromIndexedDB() {
        try {
            updateLoading('正在打开数据库...');
            const db = await openDatabase();

            updateLoading('正在读取数据集信息...');
            const dataset = await getDataset(db, currentDatasetId);

            updateLoading('正在读取消息...');
            const messages = await getMessages(db, currentDatasetId);

            if (!messages || messages.length === 0) {
                // 数据集为空，显示友好提示
                if (loadingDiv) {
                    loadingDiv.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <div style="font-size: 64px; margin-bottom: 20px;">📭</div>
                            <div style="font-size: 24px; margin-bottom: 20px;">数据集为空</div>
                            <div style="font-size: 16px; opacity: 0.8; margin-bottom: 30px;">
                                当前选择的数据集中没有消息数据
                            </div>
                            <div style="display: flex; gap: 15px; justify-content: center;">
                                <a href="data-manager.html" style="padding: 15px 30px; font-size: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 50px; cursor: pointer; text-decoration: none; display: inline-block;">
                                    📁 前往数据管理器
                                </a>
                                <a href="index.html" style="padding: 15px 30px; font-size: 18px; background: rgba(255,255,255,0.2); color: white; border: 2px solid white; border-radius: 50px; cursor: pointer; text-decoration: none; display: inline-block;">
                                    🌌 返回3D星系
                                </a>
                            </div>
                        </div>
                    `;
                }
                db.close();
                window.USE_INDEXEDDB_INSIGHTS = false;
                return;
            }

            updateLoading('正在处理数据...');
            await new Promise(resolve => setTimeout(resolve, 50)); // 让 UI 有机会更新

            // 使用分批处理避免阻塞 UI
            const batchSize = 5000;
            const totalMessages = messages.length;
            let processed = 0;

            const senders = new Map();
            const sentimentMap = { 0: 0, 1: 0, 2: 0, 3: 0 };
            const keywordCounts = new Map();
            let senderIndex = 0;

            function processBatch(startIndex) {
                const endIndex = Math.min(startIndex + batchSize, totalMessages);

                for (let i = startIndex; i < endIndex; i++) {
                    const msg = messages[i];
                    if (!senders.has(msg.senderId)) {
                        senders.set(msg.senderId, {
                            id: msg.senderId,
                            name: msg.senderName || 'Unknown',
                            count: 0,
                            index: senderIndex++
                        });
                    }
                    senders.get(msg.senderId).count++;
                    sentimentMap[msg.sentiment] = (sentimentMap[msg.sentiment] || 0) + 1;

                    if (msg.keywords && Array.isArray(msg.keywords)) {
                        msg.keywords.forEach(kw => {
                            if (kw) keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
                        });
                    }
                }

                processed = endIndex;
                const progress = Math.round((processed / totalMessages) * 100);
                updateLoading(`正在处理数据... ${progress}%`);

                if (processed < totalMessages) {
                    // 继续处理下一批
                    requestAnimationFrame(() => processBatch(processed));
                } else {
                    // 处理完成
                    finishProcessing();
                }
            }

            function finishProcessing() {
                const senderList = Array.from(senders.values()).sort((a, b) => a.index - b.index);
                const ranking = Array.from(keywordCounts.entries())
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 50);

                // 从数据集对象中获取图数据（如果存在）
                let datasetGraph = (dataset && dataset.graph) ? dataset.graph : null;

                // 如果没有图数据，生成一个简单的图
                if (!datasetGraph || !datasetGraph.nodes || datasetGraph.nodes.length === 0) {
                    updateLoading('正在生成网络图...');
                    datasetGraph = buildGraphFromKeywords(keywordCounts, messages);
                }

                const chatData = {
                    meta: {
                        senders: senderList.map(s => ({ id: s.id, name: s.name, count: s.count })),
                        sentiment_map: sentimentMap,
                        layout: {},
                        ranking: ranking
                    },
                    messages: messages.map(msg => [
                        msg.id,
                        senders.get(msg.senderId).index,
                        msg.timestamp,
                        msg.text,
                        msg.sentiment,
                        msg.keywords || []
                    ]),
                    graph: datasetGraph || { nodes: [], links: [] }
                };

                updateLoading('正在生成洞察报告...');
                setTimeout(() => {
                    window.INSIGHTS_DATA = generateInsights(chatData);
                    window.USE_INDEXEDDB_INSIGHTS = true;
                    updateLoading('正在初始化界面...');
                    document.dispatchEvent(new CustomEvent('insightsDataLoaded'));
                    db.close();
                }, 50);
            }

            // 开始分批处理
            processBatch(0);

        } catch (error) {
            // 加载失败，显示友好提示
            if (loadingDiv) {
                loadingDiv.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                        <div style="font-size: 24px; margin-bottom: 20px;">加载失败</div>
                        <div style="font-size: 16px; opacity: 0.8; margin-bottom: 10px;">
                            ${error.message}
                        </div>
                        <div style="font-size: 14px; opacity: 0.6; margin-bottom: 30px;">
                            请检查数据是否完整或尝试重新导入
                        </div>
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            <a href="data-manager.html" style="padding: 15px 30px; font-size: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 50px; cursor: pointer; text-decoration: none; display: inline-block;">
                                📁 前往数据管理器
                            </a>
                            <a href="index.html" style="padding: 15px 30px; font-size: 18px; background: rgba(255,255,255,0.2); color: white; border: 2px solid white; border-radius: 50px; cursor: pointer; text-decoration: none; display: inline-block;">
                                🌌 返回3D星系
                            </a>
                        </div>
                    </div>
                `;
            }
            window.USE_INDEXEDDB_INSIGHTS = false;
        }
    }
}

// 等待DOM加载后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadInsightsData);
} else {
    loadInsightsData();
}

/**
 * 生成洞察报告
 */
function generateInsights(chatData) {
    const messages = chatData.messages;
    const senders = chatData.meta.senders || [];
    const sentimentMap = chatData.meta.sentiment_map || { 0: 0, 1: 0, 2: 0, 3: 0 };
    const ranking = chatData.meta.ranking || [];

    // 1. 基础统计
    const timestamps = messages.map(m => m[2]);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const startDate = new Date(minTime * 1000).toISOString().split('T')[0];
    const endDate = new Date(maxTime * 1000).toISOString().split('T')[0];

    let dialogTurns = 0;
    for (let i = 1; i < messages.length; i++) {
        if (messages[i][1] !== messages[i-1][1]) dialogTurns++;
    }

    const basicStats = {
        total_messages: messages.length,
        date_range: { start: startDate, end: endDate },
        unique_senders: senders.length,
        top_senders: senders.sort((a, b) => b.count - a.count).slice(0, 10)
            .map(s => ({ name: s.name, count: s.count })),
        dialog_turns: dialogTurns
    };

    // 2. 时间分析
    const hourly = {};
    const daily = { '周一': 0, '周二': 0, '周三': 0, '周四': 0, '周五': 0, '周六': 0, '周日': 0 };
    const monthly = {};
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (let i = 0; i < 24; i++) hourly[i] = 0;

    messages.forEach(msg => {
        const date = new Date(msg[2] * 1000);
        hourly[date.getHours()]++;
        daily[weekdayNames[date.getDay()]]++;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthly[key] = (monthly[key] || 0) + 1;
    });

    const timeAnalysis = {
        hourly, daily, monthly,
        peak_hour: Object.entries(hourly).sort((a, b) => b[1] - a[1])[0]?.[0] || 0,
        peak_day: Object.entries(daily).sort((a, b) => b[1] - a[1])[0]?.[0] || 0,
        weekday_names: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    };

    // 3. 情感分析
    const total = messages.length || 1;
    const overall = {
        happy: ((sentimentMap[1] || 0) / total * 100).toFixed(1),
        neutral: ((sentimentMap[0] || 0) / total * 100).toFixed(1),
        question: ((sentimentMap[2] || 0) / total * 100).toFixed(1),
        sad: ((sentimentMap[3] || 0) / total * 100).toFixed(1)
    };

    // 生成6个采样点的每日趋势
    const dailyTrend = [];
    for (let i = 0; i < 6; i++) {
        const start = Math.floor(i * messages.length / 6);
        const end = Math.floor((i + 1) * messages.length / 6);
        const sample = messages.slice(start, end);
        const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
        sample.forEach(m => counts[m[4]]++);

        const st = sample.length || 1;
        dailyTrend.push({
            date: new Date(sample[0][2] * 1000).toISOString().split('T')[0],
            happy: (counts[1] / st * 100).toFixed(1),
            neutral: (counts[0] / st * 100).toFixed(1),
            question: (counts[2] / st * 100).toFixed(1),
            sad: (counts[3] / st * 100).toFixed(1)
        });
    }

    // 4. 关键词
    const keywords = ranking.slice(0, 20).map(item => ({
        word: item.name,
        count: item.count,
        category: '关键词'
    }));

    // 5. 话题
    const topics = [
        {
            topic: '热门话题',
            relevance: 0.89,
            keywords: ranking.slice(0, 5).map(k => k.name)
        },
        {
            topic: '活跃讨论',
            relevance: 0.75,
            keywords: ranking.slice(5, 10).map(k => k.name)
        }
    ];

    // 6. 活动模式 - 计算最活跃的一天
    const dailyMessageCounts = {};
    messages.forEach(msg => {
        const date = new Date(msg[2] * 1000).toISOString().split('T')[0];
        dailyMessageCounts[date] = (dailyMessageCounts[date] || 0) + 1;
    });

    const mostActiveDay = Object.entries(dailyMessageCounts)
        .sort((a, b) => b[1] - a[1])[0] || [startDate, 0];

    const days = Math.max(1, Math.floor((maxTime - minTime) / (24 * 60 * 60)) + 1);
    const activityPatterns = {
        most_active_hour: timeAnalysis.peak_hour,
        most_active_day: timeAnalysis.weekday_names[timeAnalysis.peak_day] || '周一',
        average_messages_per_day: Math.round(messages.length / days),
        longest_conversation: {
            date: mostActiveDay[0],
            message_count: mostActiveDay[1]
        },
        busiest_month: Object.keys(monthly).sort((a, b) => monthly[b] - monthly[a])[0] || new Date().toISOString().slice(0, 7)
    };

    // 7. 网络统计
    const graph = chatData.graph || { nodes: [], links: [] };
    const totalNodes = graph.nodes.length;
    const totalEdges = graph.links.length;

    // 计算平均连接数
    let avgConnections = 0;
    let mostConnectedNode = { node: 'N/A', connections: 0 };

    if (graph.nodes && graph.nodes.length > 0 && graph.links && graph.links.length > 0) {
        // 统计每个节点的连接数
        const nodeConnections = new Map();
        graph.links.forEach(link => {
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            const target = typeof link.target === 'object' ? link.target.id : link.target;

            nodeConnections.set(source, (nodeConnections.get(source) || 0) + 1);
            nodeConnections.set(target, (nodeConnections.get(target) || 0) + 1);
        });

        // 计算平均值
        const totalConnections = Array.from(nodeConnections.values()).reduce((sum, count) => sum + count, 0);
        avgConnections = (totalConnections / graph.nodes.length).toFixed(1);

        // 找出连接最多的节点
        let maxConnections = 0;
        nodeConnections.forEach((connections, nodeId) => {
            if (connections > maxConnections) {
                maxConnections = connections;
                const node = graph.nodes.find(n => n.id === nodeId);
                mostConnectedNode = {
                    node: node ? node.name || nodeId : nodeId,
                    connections: connections
                };
            }
        });
    }

    const networkStats = {
        total_nodes: totalNodes,
        total_edges: totalEdges,
        avg_connections: parseFloat(avgConnections),
        most_connected: mostConnectedNode,
        clusters: Math.ceil(totalNodes / 10), // 简单估算：每10个节点为一个社群
        modularity: 0 // 暂不支持，需要复杂的社区检测算法
    };

    return {
        generated_at: new Date().toISOString(),
        data_version: '3.0.0',
        basic_stats: basicStats,
        time_analysis: timeAnalysis,
        sentiment: { overall, daily_trend: dailyTrend },
        keywords: keywords,
        topics: topics,
        activity_patterns: activityPatterns,
        network_stats: networkStats
    };
}
