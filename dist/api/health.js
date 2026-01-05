"use strict";
// functions/api/health.ts
// 健康检查边缘函数
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
async function handler(event, context) {
    // 阿里云边缘函数标准格式
    const response = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
            success: true,
            status: 'ok',
            message: '边缘函数运行正常',
            timestamp: new Date().toISOString(),
            service: 'chatgalaxy-pages',
            version: '1.0.0'
        })
    };
    return response;
}
// 导出 handler（阿里云云函数标准格式）
exports.default = { handler };
