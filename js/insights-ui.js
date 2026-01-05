/**
 * 洞察报告交互逻辑
 * ChatGalaxy - 深山有密林团队
 */

// 全局数据（避免重复声明）
if (typeof insightsData === 'undefined') {
    window.insightsData = null;
}

// 颜色配置
const COLORS = {
    primary: '#667eea',
    secondary: '#764ba2',
    positive: '#a8edea',
    neutral: '#d299c2',
    negative: '#fbc2eb',
    gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
};

// 数字计数动画
function animateNumber(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用easeOutQuart缓动函数
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (target - start) * easeOut);

        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target.toLocaleString();
        }
    }

    requestAnimationFrame(update);
}

// 加载数据
async function loadData() {
    try {
        // 尝试加载insights.js（添加时间戳避免缓存）
        const script = document.createElement('script');
        script.src = 'js/insights.js?v=' + Date.now();
        script.onload = () => {
            if (typeof insightsData !== 'undefined') {
                initializeReport(insightsData);
            } else {
                showError('无法加载洞察数据');
            }
        };
        script.onerror = () => {
            showError('数据文件不存在，请先运行 generate_insights.py');
        };
        document.head.appendChild(script);

    } catch (error) {
        console.error('加载数据失败:', error);
        showError('加载数据失败: ' + error.message);
    }
}

// 显示错误
function showError(message) {
    document.getElementById('loading').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
            <div style="font-size: 24px; margin-bottom: 20px;">${message}</div>
            <div style="font-size: 16px; opacity: 0.8;">
                请确保已运行: python generate_insights.py
            </div>
        </div>
    `;
}

// 初始化报告
function initializeReport(data) {
    // 数据已通过 insights.js 加载，无需重新赋值

    // 隐藏加载动画
    document.getElementById('loading').style.display = 'none';

    // 显示封面
    document.getElementById('cover').style.display = 'flex';

    // 初始化封面数据
    initCover(data);

    console.log('✅ 洞察报告初始化完成');
}

// 初始化封面
function initCover(data) {
    const stats = data.basic_stats;

    // 计算聊天天数
    const days = calculateDays(stats.date_range.start, stats.date_range.end);

    // 动画显示数字
    setTimeout(() => {
        animateNumber(document.getElementById('stat-msgs'), stats.total_messages);
    }, 200);

    setTimeout(() => {
        animateNumber(document.getElementById('stat-senders'), stats.unique_senders);
    }, 400);

    setTimeout(() => {
        animateNumber(document.getElementById('stat-days'), days);
    }, 600);
}

// 计算天数
function calculateDays(start, end) {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays || 1;
}

// 开始探索
function startExploring() {
    // 隐藏封面
    document.getElementById('cover').style.display = 'none';

    // 显示内容
    const content = document.getElementById('content');
    content.style.display = 'block';

    // 初始化各个部分
    initSentiment();
    initTimeAnalysis();
    initKeywords();
    initSpecialMoments();
    initTags();

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 监听滚动，显示卡片
    initScrollObserver();
}

// 初始化情感分析
function initSentiment() {
    const sentiment = insightsData.sentiment;

    // 更新百分比
    document.getElementById('sentiment-positive').textContent =
        sentiment.overall.positive + '%';
    document.getElementById('sentiment-neutral').textContent =
        sentiment.overall.neutral + '%';
    document.getElementById('sentiment-negative').textContent =
        sentiment.overall.negative + '%';

    // 情感趋势图
    const trendData = sentiment.daily_trend;
    if (Object.keys(trendData).length > 0) {
        const ctx = document.getElementById('sentimentTrendChart').getContext('2d');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(trendData),
                datasets: [{
                    label: '情感指数',
                    data: Object.values(trendData),
                    borderColor: COLORS.primary,
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: '情感趋势（每日平均）',
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 1,
                        ticks: {
                            callback: value => (value * 100).toFixed(0) + '%'
                        }
                    },
                    x: {
                        ticks: {
                            maxTicksLimit: 10
                        }
                    }
                }
            }
        });
    }
}

// 初始化时间分析
function initTimeAnalysis() {
    const time = insightsData.time_analysis;

    // 24小时活跃度
    const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
    const hourlyData = time.hourly;

    new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(hourlyData).map(h => `${h}:00`),
            datasets: [{
                label: '消息数量',
                data: Object.values(hourlyData),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // 星期活跃度
    const weekdayCtx = document.getElementById('weekdayChart').getContext('2d');
    const weekdayData = time.daily;
    const weekdayNames = time.weekday_names;

    new Chart(weekdayCtx, {
        type: 'bar',
        data: {
            labels: weekdayNames,
            datasets: [{
                label: '消息数量',
                data: Object.values(weekdayData),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 99, 255, 0.8)',
                ],
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 初始化关键词
function initKeywords() {
    const keywords = insightsData.keywords.slice(0, 10); // Top 10
    const container = document.getElementById('keywords-grid');

    container.innerHTML = keywords.map((kw, index) => `
        <div class="keyword-item" style="animation-delay: ${index * 0.1}s">
            <span class="keyword-word">${kw.word}</span>
            <span class="keyword-count">${kw.count}次</span>
        </div>
    `).join('');
}

// 初始化特殊时刻
function initSpecialMoments() {
    const moments = insightsData.special_moments;

    // 最活跃日
    const mostActiveDay = moments.most_active_day;
    if (mostActiveDay.date) {
        document.getElementById('most-active-day').innerHTML = `
            <strong>${mostActiveDay.date}</strong><br>
            共发送 <span style="font-size: 32px; color: #667eea;">
                ${mostActiveDay.count.toLocaleString()}
            </span> 条消息
        `;
    }

    // 最长消息
    const longestMsg = moments.longest_message;
    document.getElementById('longest-message').innerHTML = `
        "${longestMsg.content}"<br>
        <span style="font-size: 14px; opacity: 0.6; margin-top: 10px; display: block;">
            长度: ${longestMsg.length} 个字符
        </span>
    `;
}

// 初始化标签
function initTags() {
    const tags = insightsData.tags;
    const container = document.getElementById('tags-grid');

    container.innerHTML = tags.map(tag => `
        <div class="tag-card">
            <div class="tag-icon">${tag.icon}</div>
            <div class="tag-name">${tag.name}</div>
            <div class="tag-desc">${tag.desc}</div>
        </div>
    `).join('');
}

// 滚动观察器
function initScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // 观察所有卡片
    document.querySelectorAll('.card').forEach(card => {
        observer.observe(card);
    });
}

// 页面加载时执行
window.addEventListener('load', () => {
    console.log('🌟 ChatGalaxy 洞察报告');
    console.log('🌲 深山有密林团队');

    // 加载数据
    loadData();
});
