/**
 * Phase 3.1 集成验证脚本
 * 验证边缘函数集成的代码正确性
 *
 * 使用方法：
 * 1. 在浏览器中打开 data-manager.html
 * 2. 打开控制台（F12）
 * 3. 复制粘贴此脚本并运行
 */

(function() {
    'use strict';

    const results = [];
    let totalTests = 0;
    let passedTests = 0;

    // ========== 测试工具函数 ==========

    function assert(condition, testName, message) {
        totalTests++;
        const passed = !!condition;
        if (passed) passedTests++;

        results.push({
            name: testName,
            passed: passed,
            message: message || (passed ? '✅ 通过' : '❌ 失败'),
            details: passed ? null : condition
        });

        console.log(`${passed ? '✅' : '❌'} ${testName}${message ? ': ' + message : ''}`);
    }

    function logSection(title) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  ${title}`);
        console.log(`${'='.repeat(60)}`);
    }

    function assertExists(value, name) {
        return assert(value !== undefined && value !== null, name, '已定义');
    }

    function assertHasProperty(obj, prop, name) {
        return assert(obj && prop in obj, name, `具有属性 ${prop}`);
    }

    function assertHasMethod(obj, method, name) {
        return assert(obj && typeof obj[method] === 'function', name, `具有方法 ${method}()`);
    }

    // ========== 测试套件 ==========

    function runTests() {
        console.clear();
        console.log('%c🧪 Phase 3.1 集成验证测试', 'font-size: 20px; font-weight: bold; color: #667eea;');
        console.log('%c开始时间: ' + new Date().toLocaleString(), 'color: #888;');

        try {
            testGlobalObjects();
            testEdgeFunctionConfig();
            testDataImportModule();
            testUIIntegration();
            testEventHandlers();

            printSummary();

        } catch (error) {
            console.error('❌ 测试执行出错:', error);
        }
    }

    // ========== 1. 全局对象测试 ==========

    function testGlobalObjects() {
        logSection('测试 1: 全局对象');

        assertExists(window.ChatGalaxy, 'ChatGalaxy 命名空间');

        // 检查 DatasetManagerV3
        assertExists(window.DatasetManagerV3, 'DatasetManagerV3');
        if (window.DatasetManagerV3) {
            assertHasMethod(window.DatasetManagerV3, 'createDataset', 'createDataset');
            assertHasMethod(window.DatasetManagerV3, 'addMessages', 'addMessages');
        }

        // 检查 DataImportV3
        assertExists(window.DataImportV3, 'DataImportV3');
        if (window.DataImportV3) {
            assertHasMethod(window.DataImportV3, 'importJSON', 'importJSON');
        }

        // 检查 TextProcessor
        assertExists(window.TextProcessor, 'TextProcessor');
    }

    // ========== 2. EdgeFunctionConfig 测试 ==========

    function testEdgeFunctionConfig() {
        logSection('测试 2: EdgeFunctionConfig 类');

        assertExists(window.EdgeFunctionConfig, 'EdgeFunctionConfig');

        if (!window.EdgeFunctionConfig) {
            console.warn('⚠️ EdgeFunctionConfig 未找到，跳过测试');
            return;
        }

        const config = window.EdgeFunctionConfig;

        // 测试属性
        assertHasProperty(config, 'functionUrls', 'functionUrls');

        // 测试方法
        assertHasMethod(config, 'getUrl', 'getUrl');
        assertHasMethod(config, 'setUrl', 'setUrl');
        assertHasMethod(config, 'clearUrls', 'clearUrls');
        assertHasMethod(config, 'isAvailable', 'isAvailable');
        assertHasMethod(config, 'invoke', 'invoke');
        assertHasMethod(config, 'testConnection', 'testConnection');

        // 测试 URL 管理
        const testUrl = 'https://test-function.example.com/process';
        config.setUrl('processChat', testUrl);

        assert(
            config.getUrl('processChat') === testUrl,
            'setUrl/getUrl',
            'URL 设置和读取正确'
        );

        assert(
            config.isAvailable('processChat'),
            'isAvailable',
            '配置后返回 true'
        );

        // 测试清除
        config.clearUrls();
        assert(
            !config.isAvailable('processChat'),
            'clearUrls',
            '清除后返回 false'
        );

        // 恢复原有配置（如果有）
        const stored = localStorage.getItem('edgeFunctionUrls');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.processChat) {
                    config.setUrl('processChat', parsed.processChat);
                    console.log('✅ 已恢复原有配置');
                }
            } catch (e) {
                // 忽略解析错误
            }
        }
    }

    // ========== 3. DataImport 模块测试 ==========

    function testDataImportModule() {
        logSection('测试 3: DataImport 模块集成');

        if (!window.DataImportV3) {
            console.warn('⚠️ DataImportV3 未找到，跳过测试');
            return;
        }

        // 检查 processWithEdgeFunction 是否存在（需要检查源代码）
        const scriptElements = document.querySelectorAll('script[src]');
        let dataImportLoaded = false;

        scriptElements.forEach(script => {
            if (script.src.includes('data-import.js')) {
                dataImportLoaded = true;
            }
        });

        assert(
            dataImportLoaded,
            'data-import.js',
            '已加载'
        );

        // 注意：processWithEdgeFunction 是模块内部函数，无法直接测试
        // 但我们可以验证 importJSON 是否支持 mode 参数
        assertHasMethod(window.DataImportV3, 'importJSON', 'importJSON');
    }

    // ========== 4. UI 集成测试 ==========

    function testUIIntegration() {
        logSection('测试 4: UI 组件集成');

        // 检查 DOM 元素
        const modeInputs = document.querySelectorAll('input[name="processingMode"]');
        assert(
            modeInputs.length === 2,
            '处理模式选择器',
            `找到 ${modeInputs.length} 个选项`
        );

        const fastMode = document.querySelector('input[name="processingMode"][value="fast"]');
        const preciseMode = document.querySelector('input[name="processingMode"][value="precise"]');

        assert(
            fastMode && preciseMode,
            '模式选项',
            '快速和精确模式选项都存在'
        );

        assert(
            fastMode.checked,
            '默认模式',
            '快速模式默认选中'
        );

        // 检查状态徽章
        const statusBadge = document.getElementById('edgeFunctionStatus');
        assertExists(statusBadge, '边缘函数状态徽章');

        // 检查边缘函数配置管理器引用
        const scriptElements = document.querySelectorAll('script[src]');
        let edgeFunctionConfigLoaded = false;

        scriptElements.forEach(script => {
            if (script.src.includes('edge-function-config.js')) {
                edgeFunctionConfigLoaded = true;
            }
        });

        assert(
            edgeFunctionConfigLoaded,
            'edge-function-config.js',
            '已加载'
        );
    }

    // ========== 5. 事件处理测试 ==========

    function testEventHandlers() {
        logSection('测试 5: 事件处理');

        // 模拟模式切换
        const fastMode = document.querySelector('input[name="processingMode"][value="fast"]');
        const preciseMode = document.querySelector('input[name="processingMode"][value="precise"]');

        if (fastMode && preciseMode) {
            // 切换到精确模式
            preciseMode.click();
            assert(
                preciseMode.checked,
                '精确模式选择',
                '点击后选中'
            );

            // 切换回快速模式
            fastMode.click();
            assert(
                fastMode.checked,
                '快速模式选择',
                '点击后选中'
            );
        }

        // 测试 EdgeFunctionConfig 可用性检查
        if (window.EdgeFunctionConfig) {
            const isAvailable = window.EdgeFunctionConfig.isAvailable('processChat');
            console.log(`ℹ️ 边缘函数可用性: ${isAvailable ? '✅ 已配置' : '❌ 未配置'}`);

            if (isAvailable && document.getElementById('edgeFunctionStatus')) {
                const badge = document.getElementById('edgeFunctionStatus');
                assert(
                    badge.style.display !== 'none',
                    '状态徽章显示',
                    '已配置时徽章可见'
                );
            }
        }
    }

    // ========== 6. 打印总结 ==========

    function printSummary() {
        console.log(`\n${'='.repeat(60)}`);
        console.log('%c  测试总结', 'font-size: 16px; font-weight: bold;');
        console.log(`${'='.repeat(60)}`);

        const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
        const statusEmoji = passRate === '100.0' ? '🎉' : passRate >= '80.0' ? '✅' : '⚠️';

        console.log(`总计: ${totalTests} 个测试`);
        console.log(`通过: ${passedTests} 个`);
        console.log(`失败: ${totalTests - passedTests} 个`);
        console.log(`通过率: ${passRate}% ${statusEmoji}`);

        if (passedTests < totalTests) {
            console.log('\n❌ 失败的测试:');
            results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}: ${r.details || r.message}`);
            });
        }

        console.log(`\n${'='.repeat(60)}`);

        // 返回测试结果
        return {
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            passRate: parseFloat(passRate),
            results: results
        };
    }

    // ========== 运行测试 ==========

    // 延迟执行，确保所有脚本已加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runTests, 500);
        });
    } else {
        setTimeout(runTests, 500);
    }

    // 导出全局测试函数
    window.verifyPhase3Integration = runTests;

})();
