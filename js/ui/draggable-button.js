/**
 * ChatGalaxy 可拖动按钮功能
 * 支持触摸拖动，自动贴边
 * @version 1.0.0
 * @updated 2026-01-08
 * @author 深山有密林团队
 */

/**
 * 初始化可拖动按钮
 * @param {string} selector - 按钮选择器
 * @param {Object} options - 配置选项
 * @param {string} options.snapEdge - 贴边方向 ('left' | 'right' | 'nearest')
 * @param {number} options.snapThreshold - 贴边阈值（像素）
 * @param {number} options.edgePadding - 边缘内边距（像素）
 */
function initDraggableButton(selector, options = {}) {
    const {
        snapEdge = 'right',
        snapThreshold = 50,
        edgePadding = 20
    } = options;

    const button = document.querySelector(selector);
    if (!button) {
        console.warn(`⚠️ [DraggableButton] Button not found: ${selector}`);
        return;
    }

    // 状态
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    let maxX = 0;
    let maxY = 0;

    // 🔧 设置按钮初始样式（确保可以被拖动）
    button.style.position = 'fixed';
    button.style.transition = 'transform 0.2s ease';
    button.style.cursor = 'move';
    button.style.userSelect = 'none';
    button.style.touchAction = 'none';

    /**
     * 开始拖动
     */
    function startDrag(clientX, clientY) {
        isDragging = true;

        startX = clientX;
        startY = clientY;

        // 获取当前按钮位置
        const rect = button.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        // 计算最大范围
        maxX = window.innerWidth - rect.width;
        maxY = window.innerHeight - rect.height;

        // 移除过渡动画，避免拖动延迟
        button.style.transition = 'none';

        console.log(`🎯 [DraggableButton] Start dragging from (${initialX}, ${initialY})`);
    }

    /**
     * 拖动中
     */
    function onDrag(clientX, clientY) {
        if (!isDragging) return;

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        let newX = initialX + deltaX;
        let newY = initialY + deltaY;

        // 限制在屏幕范围内
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        button.style.left = `${newX}px`;
        button.style.top = `${newY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
    }

    /**
     * 结束拖动
     */
    function endDrag() {
        if (!isDragging) return;

        isDragging = false;

        // 恢复过渡动画
        button.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

        // 获取当前位置
        const rect = button.getBoundingClientRect();
        let newX = rect.left;
        let newY = rect.top;

        // 贴边逻辑
        if (snapEdge === 'right' || (snapEdge === 'nearest' && newX > window.innerWidth / 2)) {
            // 贴到右边
            newX = window.innerWidth - rect.width - edgePadding;
            button.style.right = `${edgePadding}px`;
            button.style.left = 'auto';
        } else if (snapEdge === 'left' || (snapEdge === 'nearest' && newX <= window.innerWidth / 2)) {
            // 贴到左边
            newX = edgePadding;
            button.style.left = `${edgePadding}px`;
            button.style.right = 'auto';
        }

        // 保存位置到 LocalStorage
        savePosition(newX, newY);

        console.log(`📌 [DraggableButton] Snapped to (${newX}, ${newY})`);
    }

    /**
     * 保存位置到 LocalStorage
     */
    function savePosition(x, y) {
        try {
            localStorage.setItem('draggable-button-position', JSON.stringify({ x, y }));
        } catch (error) {
            console.error('❌ [DraggableButton] Failed to save position:', error);
        }
    }

    /**
     * 从 LocalStorage 加载位置
     */
    function loadPosition() {
        try {
            const saved = localStorage.getItem('draggable-button-position');
            if (saved) {
                const { x, y } = JSON.parse(saved);

                // 确保位置在当前屏幕范围内
                const rect = button.getBoundingClientRect();
                const validX = Math.max(0, Math.min(x, window.innerWidth - rect.width));
                const validY = Math.max(0, Math.min(y, window.innerHeight - rect.height));

                button.style.left = `${validX}px`;
                button.style.top = `${validY}px`;
                button.style.right = 'auto';
                button.style.bottom = 'auto';

                console.log(`📍 [DraggableButton] Loaded position: (${validX}, ${validY})`);
            }
        } catch (error) {
            console.error('❌ [DraggableButton] Failed to load position:', error);
        }
    }

    // ========== 事件监听 ==========

    // 触摸事件
    button.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
    }, { passive: true });

    button.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault(); // 防止页面滚动
        const touch = e.touches[0];
        onDrag(touch.clientX, touch.clientY);
    }, { passive: false });

    button.addEventListener('touchend', endDrag);
    button.addEventListener('touchcancel', endDrag);

    // 鼠标事件（桌面端测试用）
    button.addEventListener('mousedown', (e) => {
        startDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        onDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) endDrag();
    });

    // 初始化时加载保存的位置
    loadPosition();

    console.log(`✅ [DraggableButton] Initialized: ${selector}`);
}

// 导出到全局
window.initDraggableButton = initDraggableButton;
