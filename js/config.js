/**
 * ChatGalaxy 全局配置文件
 * 集中管理所有常量和配置参数
 * @version 1.0.0
 * @updated 2026-01-06
 */

// ========== 全局命名空间 ==========

window.ChatGalaxyConfig = {};

// ========== 数据导入配置 ==========

/**
 * 批量保存大小
 * 每批保存的消息数量，避免一次性保存过多导致内存溢出
 */
window.ChatGalaxyConfig.IMPORT_BATCH_SIZE = 100;

/**
 * 快速模式最大消息数
 * 超过此数量建议使用精确模式（边缘函数）
 */
window.ChatGalaxyConfig.MAX_MESSAGES_FAST = 10000;

/**
 * 最大文件大小（字节）
 * 限制上传文件大小，避免浏览器崩溃
 */
window.ChatGalaxyConfig.MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

// ========== 图数据生成配置 ==========

/**
 * 基础最大节点数
 * 图数据的最大节点数量，避免渲染性能问题
 */
window.ChatGalaxyConfig.BASE_MAX_NODES = 400;

/**
 * 绝对最大节点数
 * 即使数据量很大，也不会超过此值
 */
window.ChatGalaxyConfig.ABSOLUTE_MAX_NODES = 1000;

/**
 * 基础最小出现次数
 * 关键词至少出现的次数才能成为节点
 */
window.ChatGalaxyConfig.BASE_MIN_OCCURRENCE = 3;

/**
 * 基础最小连接权重
 * 两个关键词至少共现的次数才能建立连接
 */
window.ChatGalaxyConfig.BASE_MIN_LINK_WEIGHT = 1;

/**
 * 图数据计算的基准消息数
 * 用于动态调整节点和边的阈值
 */
window.ChatGalaxyConfig.GRAPH_BASE_MESSAGE_COUNT = 5000;

/**
 * 节点数量计算指数
 * 用于根据消息量动态调整最大节点数
 */
window.ChatGalaxyConfig.NODE_EXPONENT = 0.25;

/**
 * 最小出现次数计算系数
 * 用于根据消息量动态调整最小出现次数
 */
window.ChatGalaxyConfig.MIN_OCCURRENCE_COEFFICIENT = 0.8;

/**
 * 最小连接权重计算系数
 * 用于根据消息量动态调整最小连接权重
 */
window.ChatGalaxyConfig.MIN_LINK_WEIGHT_COEFFICIENT = 0.4;

// ========== 关键词配置 ==========

/**
 * 关键词排名数量
 * 显示排名前N的关键词
 */
window.ChatGalaxyConfig.KEYWORD_RANKING_COUNT = 50;

/**
 * 停用词过滤
 * 是否启用停用词过滤
 */
window.ChatGalaxyConfig.ENABLE_STOP_WORDS = true;

// ========== 黑名单配置 ==========

/**
 * 是否启用黑名单过滤
 * true: 启用黑名单功能（过滤中括号内容）
 * false: 禁用黑名单功能
 */
window.ChatGalaxyConfig.ENABLE_BLACKLIST = true;

/**
 * 黑名单消息处理策略
 * 'skip': 跳过包含黑标记的消息
 * 'mark': 标记但保留消息
 * 'filter_only': 仅过滤关键词，不过滤消息（默认）
 */
window.ChatGalaxyConfig.BLACKLIST_STRATEGY = 'filter_only';

// ========== 演示数据配置 ==========

/**
 * 演示数据消息数量
 * 生成演示数据时的消息数量
 */
window.ChatGalaxyConfig.DEMO_MESSAGE_COUNT = 10000;

/**
 * 演示数据参与者数量
 * 生成演示数据时的参与者数量
 */
window.ChatGalaxyConfig.DEMO_PARTICIPANT_COUNT = 20;

/**
 * 演示数据关键词数量
 * 生成演示数据时的关键词池大小
 */
window.ChatGalaxyConfig.DEMO_KEYWORD_POOL_SIZE = 100;

/**
 * 演示数据时间跨度（天）
 * 生成演示数据时的时间跨度
 */
window.ChatGalaxyConfig.DEMO_TIME_SPAN_DAYS = 730; // 2年

// ========== 日志配置 ==========

/**
 * 日志级别
 * 0: DEBUG (开发调试)
 * 1: INFO (生产环境默认)
 * 2: WARN (仅警告)
 * 3: ERROR (仅错误)
 * 4: SILENT (静默模式)
 */
window.ChatGalaxyConfig.LOG_LEVEL = (function() {
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) return 0; // DEBUG
    if (urlParams.has('silent')) return 4; // SILENT

    // 根据环境判断
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:'
        ? 0  // DEBUG - 本地开发
        : 1; // INFO - 生产环境
})();

/**
 * 是否启用性能监控
 */
window.ChatGalaxyConfig.ENABLE_PERFORMANCE_MONITORING = window.ChatGalaxyConfig.LOG_LEVEL === 0;

// ========== UI 配置 ==========

/**
 * Toast 提示显示时长（毫秒）
 */
window.ChatGalaxyConfig.TOAST_DISPLAY_DURATION = 3000;

/**
 * 默认动画时长（毫秒）
 */
window.ChatGalaxyConfig.DEFAULT_ANIMATION_DURATION = 300;

/**
 * 数据集刷新间隔（毫秒）
 * 自动刷新数据集列表的间隔
 */
window.ChatGalaxyConfig.DATASET_REFRESH_INTERVAL = 60000; // 1分钟

// ========== 数据库配置 ==========

/**
 * IndexedDB 数据库名称
 */
window.ChatGalaxyConfig.DB_NAME = 'ChatGalaxyDB';

/**
 * IndexedDB 数据库版本
 * v1: 初始版本（datasets, messages）
 * v2: 添加 dataset_shares store（数据分享功能）
 */
window.ChatGalaxyConfig.DB_VERSION = 2;

/**
 * 数据集存储名称
 */
window.ChatGalaxyConfig.DATASETS_STORE = 'datasets';

/**
 * 消息存储名称
 */
window.ChatGalaxyConfig.MESSAGES_STORE = 'messages';

// ========== 本地存储键名 ==========

/**
 * 当前数据集ID的LocalStorage键名
 */
window.ChatGalaxyConfig.CURRENT_DATASET_KEY = 'chatgalaxy_currentDataset';

/**
 * 数据集列表缓存的LocalStorage键名
 */
window.ChatGalaxyConfig.DATASETS_CACHE_KEY = 'chatgalaxy_datasets';

/**
 * 用户设置的LocalStorage键名
 */
window.ChatGalaxyConfig.USER_SETTINGS_KEY = 'chatgalaxy_settings';

// ========== 默认值 ==========

/**
 * 默认数据集颜色
 */
window.ChatGalaxyConfig.DEFAULT_DATASET_COLOR = '#3498db';

/**
 * 默认数据集标签
 */
window.ChatGalaxyConfig.DEFAULT_DATASET_TAGS = [];

/**
 * 默认情感分类
 * 0: 负面, 1: 中性, 2: 正面, 3: 疑问
 */
window.ChatGalaxyConfig.DEFAULT_SENTIMENT = 1;

// ========== 性能优化配置 ==========

/**
 * 数据加载超时时间（毫秒）
 */
window.ChatGalaxyConfig.DATA_LOAD_TIMEOUT = 30000; // 30秒

/**
 * 模块加载超时时间（毫秒）
 */
window.ChatGalaxyConfig.MODULE_LOAD_TIMEOUT = 5000; // 5秒

/**
 * Web Worker 超时时间（毫秒）
 */
window.ChatGalaxyConfig.WORKER_TIMEOUT = 60000; // 60秒

// 🔧 使用 console.log 而不是 Logger，避免循环依赖
// (logger.js 依赖 config.js 的 LOG_LEVEL，而 config.js 已在 logger.js 之前加载)
console.log('⚙️ ChatGalaxy Config loaded (LOG_LEVEL:', window.ChatGalaxyConfig.LOG_LEVEL, ')');
