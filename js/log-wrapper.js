/**
 * ChatGalaxy 安全日志包装器
 * 避免Logger未初始化导致的错误
 * @version 1.0.0
 * @updated 2026-01-06
 */

(function() {
    'use strict';

    // 创建全局日志包装器（如果不存在）
    if (!window.Log) {
        window.Log = {
            info: function(tag, ...messages) {
                if (window.Logger && typeof window.Logger.info === 'function') {
                    window.Logger.info(tag, ...messages);
                } else {
                    console.log(`[INFO] [${tag}]`, ...messages);
                }
            },
            warn: function(tag, ...messages) {
                if (window.Logger && typeof window.Logger.warn === 'function') {
                    window.Logger.warn(tag, ...messages);
                } else {
                    console.warn(`[WARN] [${tag}]`, ...messages);
                }
            },
            error: function(tag, ...messages) {
                if (window.Logger && typeof window.Logger.error === 'function') {
                    window.Logger.error(tag, ...messages);
                } else {
                    console.error(`[ERROR] [${tag}]`, ...messages);
                }
            },
            debug: function(tag, ...messages) {
                if (window.Logger && typeof window.Logger.debug === 'function') {
                    window.Logger.debug(tag, ...messages);
                } else {
                    console.log(`[DEBUG] [${tag}]`, ...messages);
                }
            }
        };
    }
})();
