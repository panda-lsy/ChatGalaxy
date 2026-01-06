/**
 * 洞察报告交互逻辑 v3.0
 * ChatGalaxy - 深山有密林团队
 * @updated 2026-01-06
 */

// 颜色配置
const COLORS = {
    primary: '#667eea',
    secondary: '#764ba2',
    happy: '#a8edea',
    neutral: '#d299c2',
    question: '#fed6e3',
    sad: '#fbc2eb',
    gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
};

// 数字计数动画
function animateNumber(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (target - start) * easeOut);
        element.textContent = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
        else element.textContent = target.toLocaleString();
    }
    requestAnimationFrame(update);
}

// 初始化报告
function initializeReport() {
    // 确保 Chart.js 已加载
    if (typeof Chart === 'undefined') {
        showError('图表库加载失败<br><small>请刷新页面重试</small>');
        return;
    }

    if (typeof window.INSIGHTS_DATA === 'undefined') {
        document.addEventListener('insightsDataLoaded', initializeReport, { once: true });

        setTimeout(() => {
            if (typeof window.INSIGHTS_DATA === 'undefined') {
                showError('洞察数据加载超时<br><small>请检查控制台了解详情</small>');
            }
        }, 10000);
        return;
    }

    const data = window.INSIGHTS_DATA;

    document.getElementById('loading').style.display = 'none';
    document.getElementById('cover').style.display = 'flex';
    initCover(data);
}

// 显示错误
function showError(message) {
    document.getElementById('loading').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
            <div style="font-size: 24px; margin-bottom: 20px;">${message}</div>
            <div style="font-size: 16px; opacity: 0.8;">
                请确保数据管理器中有数据，或 <a href="data-manager.html" style="color: #667eea;">前往数据管理器</a>
            </div>
        </div>
    `;
}

// 初始化封面
function initCover(data) {
    const stats = data.basic_stats;

    // 🔧 修复：计算从第一条消息到今天的天数（而不是数据集的时间跨度）
    const now = new Date();
    const start = new Date(stats.date_range.start);
    const days = Math.max(1, Math.ceil(
        (now - start) / (1000 * 60 * 60 * 24)
    ));

    setTimeout(() => animateNumber(document.getElementById('stat-msgs'), stats.total_messages), 200);
    setTimeout(() => animateNumber(document.getElementById('stat-senders'), stats.unique_senders), 400);
    setTimeout(() => animateNumber(document.getElementById('stat-days'), days), 600);
}

// 开始探索
function startExploring() {
    document.getElementById('cover').style.display = 'none';
    const content = document.getElementById('content');
    content.style.display = 'block';

    initSentiment();
    initTimeAnalysis();
    initKeywords();
    initTopics();
    initActivityPatterns();
    initDatasetInfo();
    initNetworkStats();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    initScrollObserver();
}

// 初始化情感分析
function initSentiment() {
    const sentiment = window.INSIGHTS_DATA.sentiment;
    const overall = sentiment.overall;

    document.getElementById('sentiment-positive').textContent = overall.happy + '%';
    document.getElementById('sentiment-neutral').textContent = overall.neutral + '%';
    document.getElementById('sentiment-negative').textContent = ((parseFloat(overall.sad) + parseFloat(overall.question)).toFixed(1)) + '%';

    const trendData = sentiment.daily_trend;
    if (trendData && trendData.length > 0) {
        new Chart(document.getElementById('sentimentTrendChart'), {
            type: 'line',
            data: {
                labels: trendData.map(d => d.date),
                datasets: [
                    {
                        label: '开心',
                        data: trendData.map(d => d.happy),
                        borderColor: '#a8edea',
                        backgroundColor: 'rgba(168, 237, 234, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: '中性',
                        data: trendData.map(d => d.neutral),
                        borderColor: '#d299c2',
                        backgroundColor: 'rgba(210, 153, 194, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: '疑问',
                        data: trendData.map(d => d.question),
                        borderColor: '#fed6e3',
                        backgroundColor: 'rgba(254, 214, 227, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: '难过',
                        data: trendData.map(d => d.sad),
                        borderColor: '#fbc2eb',
                        backgroundColor: 'rgba(251, 194, 235, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top' },
                    title: { display: true, text: '情感趋势（每日变化）', font: { size: 16 } }
                },
                scales: {
                    y: { min: 0, max: 100, ticks: { callback: value => value.toFixed(0) + '%' } },
                    x: { ticks: { maxTicksLimit: 10 } }
                }
            }
        });
    }
}

// 初始化时间分析
function initTimeAnalysis() {
    const time = window.INSIGHTS_DATA.time_analysis;

    new Chart(document.getElementById('hourlyChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(time.hourly).map(h => `${h}:00`),
            datasets: [{
                label: '消息数量',
                data: Object.values(time.hourly),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    new Chart(document.getElementById('weekdayChart'), {
        type: 'bar',
        data: {
            labels: time.weekday_names,
            datasets: [{
                label: '消息数量',
                data: Object.values(time.daily),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 99, 255, 0.8)'
                ],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// 初始化关键词
function initKeywords() {
    const keywords = window.INSIGHTS_DATA.keywords.slice(0, 20);
    document.getElementById('keywords-grid').innerHTML = keywords.map((kw, index) => `
        <div class="keyword-item" style="animation-delay: ${index * 0.05}s">
            <span class="keyword-word">${kw.word}</span>
            <span class="keyword-count">${kw.count}次</span>
        </div>
    `).join('');
}

// 初始化话题分析
function initTopics() {
    const topics = window.INSIGHTS_DATA.topics;
    const keywordsSection = document.querySelector('.keywords-grid').closest('.card');
    const topicsCard = document.createElement('div');
    topicsCard.className = 'card';
    topicsCard.innerHTML = `
        <div class="card-title">
            <span class="icon">💬</span>
            <span>话题分析</span>
        </div>
        <div class="topics-grid">
            ${topics.map((topic, index) => `
                <div class="topic-item" style="animation-delay: ${index * 0.1}s">
                    <div class="topic-name">${topic.topic}</div>
                    <div class="topic-relevance">相关度: ${(topic.relevance * 100).toFixed(0)}%</div>
                    <div class="topic-keywords">
                        ${topic.keywords.map(kw => `<span class="topic-keyword">${kw}</span>`).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    keywordsSection.after(topicsCard);
}

// 初始化活动模式
function initActivityPatterns() {
    const activity = window.INSIGHTS_DATA.activity_patterns;
    const mostActiveDay = activity.longest_conversation;
    document.getElementById('most-active-day').innerHTML = `
        <strong>${mostActiveDay.date}</strong><br>
        共发送 <span style="font-size: 32px; color: #667eea;">
            ${mostActiveDay.message_count.toLocaleString()}
        </span> 条消息
    `;

    const longestMsgCard = document.getElementById('longest-message').closest('.card');
    if (longestMsgCard) longestMsgCard.remove();
}

// 初始化数据集信息
function initDatasetInfo() {
    const stats = window.INSIGHTS_DATA.basic_stats;
    const days = Math.max(1, Math.ceil(
        (new Date(stats.date_range.end) - new Date(stats.date_range.start)) / (1000 * 60 * 60 * 24)
    ));

    const tagsGrid = document.getElementById('tags-grid');
    if (tagsGrid) {
        tagsGrid.innerHTML = `
            <div class="tag-card">
                <div class="tag-icon">📊</div>
                <div class="tag-name">${stats.total_messages.toLocaleString()} 条消息</div>
                <div class="tag-desc">海量聊天数据</div>
            </div>
            <div class="tag-card">
                <div class="tag-icon">👥</div>
                <div class="tag-name">${stats.unique_senders} 位参与者</div>
                <div class="tag-desc">活跃社群</div>
            </div>
            <div class="tag-card">
                <div class="tag-icon">📅</div>
                <div class="tag-name">${days} 天</div>
                <div class="tag-desc">${stats.date_range.start} 至 ${stats.date_range.end}</div>
            </div>
            <div class="tag-card">
                <div class="tag-icon">💬</div>
                <div class="tag-name">${stats.dialog_turns.toLocaleString()} 次对话</div>
                <div class="tag-desc">互动频繁</div>
            </div>
        `;
    }
}

// 初始化网络统计
function initNetworkStats() {
    const network = window.INSIGHTS_DATA.network_stats;
    const specialMomentsSection = document.querySelector('#most-active-day').closest('.card');
    const networkCard = document.createElement('div');
    networkCard.className = 'card';
    networkCard.innerHTML = `
        <div class="card-title">
            <span class="icon">🌐</span>
            <span>星系网络统计</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px;">
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px;">
                <div style="font-size: 36px; font-weight: bold;">${network.total_nodes}</div>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">总节点数</div>
            </div>
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 12px;">
                <div style="font-size: 36px; font-weight: bold;">${network.total_edges}</div>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">总连接数</div>
            </div>
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; border-radius: 12px;">
                <div style="font-size: 36px; font-weight: bold;">${network.avg_connections}</div>
                <div style="font-size: 14px; opacity: 0.8; margin-top: 5px;">平均连接数</div>
            </div>
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%); color: #333; border-radius: 12px;">
                <div style="font-size: 36px; font-weight: bold;">${network.clusters}</div>
                <div style="font-size: 14px; opacity: 0.8; margin-top: 5px;">社群数量</div>
            </div>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: rgba(102, 126, 234, 0.1); border-radius: 12px;">
            <div style="font-size: 16px; color: #667eea; margin-bottom: 5px;">🌟 最活跃节点</div>
            <div style="font-size: 20px; font-weight: bold;">
                ${network.most_connected.node} (${network.most_connected.connections} 个连接)
            </div>
        </div>
    `;
    specialMomentsSection.after(networkCard);
}

// 滚动观察器
function initScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.card, .topic-item').forEach(card => observer.observe(card));
}
