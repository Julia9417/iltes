// IELTS Notes - Main JavaScript
console.log('📚 IELTS Notes JS 加载中...');

// 移动端菜单功能
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!hamburger || !navMenu) return;
    
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // 点击链接关闭菜单
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// 更新年份
function updateYear() {
    const yearElement = document.querySelector('.footer-bottom p');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.innerHTML = yearElement.innerHTML.replace('2024', currentYear);
        console.log('✅ 年份已更新为:', currentYear);
    }
}

// 卡片动画
function initCardAnimations() {
    const cards = document.querySelectorAll('.module-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(card);
    });
}

// Vocabulary下拉菜单定位
function initVocabularyDropdown() {
    const dropdown = document.querySelector('.vocabulary-dropdown');
    const submenu = document.querySelector('.vocabulary-submenu');
    
    if (!dropdown || !submenu) return;
    
    // 鼠标悬停时动态计算位置
    dropdown.addEventListener('mouseenter', () => {
        const dropdownRect = dropdown.getBoundingClientRect();
        const submenuRect = submenu.getBoundingClientRect();
        
        // 使用fixed定位，基于视口位置
        submenu.style.position = 'fixed';
        submenu.style.top = (dropdownRect.bottom + 8) + 'px';
        submenu.style.left = dropdownRect.left + 'px';
        submenu.style.right = 'auto';
        
        // 检查右边界，如果超出则右对齐
        setTimeout(() => {
            const updatedRect = submenu.getBoundingClientRect();
            if (updatedRect.right > window.innerWidth - 20) {
                submenu.style.left = 'auto';
                submenu.style.right = (window.innerWidth - dropdownRect.right) + 'px';
            }
        }, 0);
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 页面加载完成，初始化功能...');
    
    initMobileMenu();
    updateYear();
    initCardAnimations();
    initVocabularyDropdown();
    
    console.log('🎉 所有功能初始化完成！');
});

console.log('✅ Script.js 加载完成');

