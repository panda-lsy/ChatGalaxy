/**
 * ChatGalaxy 数据加载器
 * 优先从IndexedDB加载数据集，如果没有则使用本地data.js
 * @version 1.0.1
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

(async function() {
    Log.info('Init', 'Data Loader initializing...');

    try {
        // 等待数据管理器加载完成
        await waitForModule('DatasetManagerV3');

        // 获取当前选中的数据集ID
        const currentDatasetId = localStorage.getItem('chatgalaxy_currentDataset');

        if (currentDatasetId) {
            console.log('📊 Loading dataset from IndexedDB:', currentDatasetId);

            try {
                // 从IndexedDB加载数据
                const chatData = await window.DatasetManagerV3.loadDatasetData(currentDatasetId);

                // 更严格的数据验证
                if (chatData &&
                    chatData.meta &&
                    chatData.messages &&
                    Array.isArray(chatData.messages) &&
                    chatData.messages.length > 0) {

                    Log.info('Data', 'Dataset loaded from IndexedDB:', {
                        messageCount: chatData.messages.length,
                        senderCount: chatData.meta.senders ? chatData.meta.senders.length : 0
                    });

                    // 使用IndexedDB数据，跳过data.js
                    window.CHAT_DATA = chatData;
                    window.USE_INDEXEDDB_DATA = true;

                    // 触发数据加载完成事件
                    document.dispatchEvent(new CustomEvent('chatDataLoaded'));
                    console.log('✅ IndexedDB data loaded successfully, skipping data.js');
                    return;
                } else {
                    console.warn('⚠️ Invalid data structure from IndexedDB');
                }
            } catch (error) {
                console.error('❌ Failed to load dataset from IndexedDB:', error);
                console.error('Error details:', error.message, error.stack);
            }
        }

        // 如果没有IndexedDB数据或加载失败，动态加载data.js
        Log.info('Data', 'No IndexedDB data, loading local data.js dynamically');
        window.USE_INDEXEDDB_DATA = false;

        try {
            // 动态加载data.js和insights.js
            console.time('data.js加载时间');
            await loadScript('js/data.js');
            await loadScript('js/insights.js');
            console.timeEnd('data.js加载时间');
            console.log('✅ Local data.js loaded');
        } catch (error) {
            console.error('❌ Failed to load local data.js:', error);
        }

    } catch (error) {
        console.error('❌ Data loader error:', error);
        console.error('Error stack:', error.stack);
        // 降级使用data.js
        window.USE_INDEXEDDB_DATA = false;
        try {
            await loadScript('js/data.js');
            await loadScript('js/insights.js');
        } catch (e) {
            console.error('❌ Failed to load fallback data:', e);
        }
    }
})();

/**
 * 动态加载脚本
 * @param {string} src - 脚本路径
 * @returns {Promise<void>}
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // 检查是否已经加载过
        if (document.querySelector(`script[src="${src}"]`)) {
            console.log(`⚡ ${src} already loaded, skipping`);
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`✅ ${src} loaded successfully`);
            resolve();
        };
        script.onerror = () => {
            reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
    });
}

/**
 * 等待模块加载完成
 */
function waitForModule(moduleName, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkInterval = setInterval(() => {
            if (window[moduleName]) {
                clearInterval(checkInterval);
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error(`Timeout waiting for ${moduleName}`));
            }
        }, 100);
    });
}

console.log('🔄 Data Loader script loaded');
