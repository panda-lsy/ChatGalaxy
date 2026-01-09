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

                // 🔧 检查是否是Demo数据集，显示指示器
                const datasetList = await window.DatasetManagerV3.getAllDatasets();
                const currentDataset = datasetList.find(d => d.id === currentDatasetId);
                if (currentDataset && currentDataset.tags && currentDataset.tags.includes('演示')) {
                    const demoIndicator = document.getElementById('demo-indicator');
                    if (demoIndicator) {
                        demoIndicator.classList.remove('hidden');
                    }
                }

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

            // 🔧 修复：将 data.js 的秒级时间戳转换为毫秒级（统一标准）
            if (window.CHAT_DATA && window.CHAT_DATA.messages) {
                console.log('🔄 Converting timestamps from seconds to milliseconds...');
                const conversionCount = window.CHAT_DATA.messages.length;

                // 转换消息数组中的时间戳（索引2是timestamp）
                window.CHAT_DATA.messages.forEach(msgArr => {
                    if (Array.isArray(msgArr) && msgArr.length > 2) {
                        // data.js格式: [id, sender_id, timestamp, text, sentiment, keywords]
                        // timestamp是秒级，需要乘以1000转为毫秒
                        msgArr[2] = msgArr[2] * 1000;
                    }
                });

                // 转换图节点中的 first_seen（如果有）
                if (window.CHAT_DATA.graph && window.CHAT_DATA.graph.nodes) {
                    window.CHAT_DATA.graph.nodes.forEach(node => {
                        if (node.first_seen) {
                            node.first_seen = node.first_seen * 1000;
                        }
                    });
                }

                // 转换图连接中的 first_seen（如果有）
                if (window.CHAT_DATA.graph && window.CHAT_DATA.graph.links) {
                    window.CHAT_DATA.graph.links.forEach(link => {
                        if (link.first_seen) {
                            link.first_seen = link.first_seen * 1000;
                        }
                    });
                }

                console.log(`✅ Converted ${conversionCount} message timestamps to milliseconds`);
            }

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

            // 🔧 数据加载失败，显示 Demo 提示
            showDemoFallbackPrompt();
        }
    }
})();

/**
 * 🔧 显示 Demo 降级提示
 */
function showDemoFallbackPrompt() {
    console.log('⚠️ 数据加载失败，准备运行 Demo 模式');

    // 创建提示界面
    const prompt = document.createElement('div');
    prompt.id = 'demo-fallback-prompt';
    prompt.innerHTML = `
        <div class="demo-fallback-content">
            <div class="demo-fallback-icon">
                <i class="ri-emotion-sad-line"></i>
            </div>
            <h2 class="demo-fallback-title">数据加载失败</h2>
            <p class="demo-fallback-message">
                无法加载您的聊天数据，将在 <span class="countdown">5</span> 秒后自动运行演示模式
            </p>
            <button id="run-demo-now" class="demo-fallback-button">
                <i class="ri-play-circle-line"></i>
                立即运行 Demo
            </button>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        #demo-fallback-prompt {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .demo-fallback-content {
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.3);
            max-width: 500px;
            animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .demo-fallback-icon {
            font-size: 64px;
            margin-bottom: 20px;
            animation: bounce 1s ease-in-out infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .demo-fallback-title {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 16px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .demo-fallback-message {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 30px;
            line-height: 1.6;
        }

        .demo-fallback-message .countdown {
            font-size: 24px;
            font-weight: bold;
            color: #ffffff;
            padding: 0 4px;
        }

        .demo-fallback-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 32px;
            font-size: 16px;
            font-weight: 600;
            color: var(--primary-color);
            background: #ffffff;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .demo-fallback-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }

        .demo-fallback-button:active {
            transform: translateY(0);
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(prompt);

    // 倒计时
    let countdown = 5;
    const countdownElement = prompt.querySelector('.countdown');

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            runDemoNow();
        }
    }, 1000);

    // 立即运行按钮
    const runNowBtn = document.getElementById('run-demo-now');
    if (runNowBtn) {
        runNowBtn.addEventListener('click', () => {
            clearInterval(countdownInterval);
            runDemoNow();
        });
    }

    console.log('✅ Demo 降级提示已显示');
}

/**
 * 🔧 立即运行 Demo
 */
function runDemoNow() {
    console.log('🎬 准备运行 Demo...');

    // 设置自动生成 Demo 标记
    sessionStorage.setItem('chatgalaxy_auto_generate_demo', 'true');

    // 移除提示界面
    const prompt = document.getElementById('demo-fallback-prompt');
    if (prompt) {
        prompt.remove();
    }

    // 跳转到数据管理页面生成演示数据
    setTimeout(() => {
        console.log('🔄 跳转到数据管理页面生成 Demo...');
        window.location.href = 'data-manager.html';
    }, 500);
}

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
