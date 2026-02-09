// Проверяем, является ли устройство телефоном (не планшетом)
function isPhone() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Проверяем на телефоны (не планшеты)
    const isPhone = /android.*mobile|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    
    // Дополнительная проверка по ширине экрана
    // Телефоны обычно имеют ширину до 480px в портретной ориентации
    const isSmallScreen = window.innerWidth <= 480;
    
    return isPhone && isSmallScreen;
}

// "Все равно попробовать" - переходим на главную
function tryAnyway() {
    // Сохраняем в localStorage, чтобы больше не перенаправлять
    localStorage.setItem('ignorePhoneWarning', 'true');
    // Переходим на главную страницу
    window.location.href = 'index.html';
}

// Кнопка "Назад"
function goBack() {
    window.history.back();
}

// Автоматическая проверка при загрузке
// Если пользователь зашел на unsupported.html с компьютера - перекидываем обратно
document.addEventListener('DOMContentLoaded', function() {
    if (!isPhone() && window.location.pathname.includes('unsupported.html')) {
        window.location.href = 'index.html';
    }
});