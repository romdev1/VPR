// Глобальные переменные для отслеживания прогресса
let completedTasks = 0;
let correctAnswers = 0;
let mathProgress = 0;
let literatureProgress = 0;
let literature2Progress = 0;
let literature3Progress = 0;
// Последовательное прохождение: до какого задания (включительно) открыт доступ
let lastUnlockedLiteratureTask = 1;
// Для задания 3: оба ответа должны быть верными
let literature2Correct = false;
let literature3Correct = false;
// Для задания 9: четыре подпункта (А, Б, В, Г)
let literatureECorrect = false;
let literatureFCorrect = false;
let literatureGCorrect = false;
let literatureHCorrect = false;
// Ответы в заданиях на соответствие по номерам заданий (2 и 5)
let matchingAnswersByTask = { 2: {}, 5: {} };
// Время начала прохождения (в миллисекундах от эпохи)
let startTimeMs = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Устанавливаем активную навигацию
    setupNavigation();
    
    // Загружаем сохраненный прогресс
    loadProgress();
    
    // Обновляем статистику
    updateProgressStats();
    
    // Применяем последовательное отображение заданий (скрываем все кроме первого)
    applySequentialTasks();

    // Внешняя подгрузка отключена по требованию
    
    // Если секция литературного чтения уже видна, перемешиваем задания
    setTimeout(() => {
        const literatureSection = document.getElementById('literature-tasks');
        if (literatureSection && literatureSection.style.display !== 'none') {
            shuffleMatchingGame();
            shuffleAnswerOptions(literatureSection);
        }
    }, 500);
});

// Настройка навигации
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            showSection(targetId);
            
            // Обновляем активную ссылку
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// === Внешние задания (tasks.json) ===
async function fetchExternalTasks(url) {
    try {
        // Если открыто по file://, fetch может быть заблокирован — сразу показываем импорт
        if (window.location.protocol === 'file:') {
            showImportUi();
        }
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;
        localStorage.setItem('teacher-tasks', JSON.stringify(list));
        renderExternalTasks(list);
    } catch (e) {
        console.warn('Не удалось загрузить внешние задания:', e);
        showImportUi();
    }
}

function renderExternalTasks(tasks) {
    const container = document.getElementById('tasks-container');
    const section = document.getElementById('literature-tasks');
    if (!container || !section) return;
    container.innerHTML = '';
    if (!tasks.length) {
        section.style.display = 'block';
        container.innerHTML = '<div class="muted">Задания пока не загружены.</div>';
        return;
    }
    section.style.display = 'block';
    tasks.forEach((task, idx) => {
        if (task.type === 'mcq') {
            const correct = (task.options || []).find(o => o.correct);
            const correctText = correct ? String(correct.text || '').trim() : '';
            const subjectId = `ext-mcq-${idx}`;
            const html = `
                <div class="task-card">
                    <h4>Задание 1 (внешнее): Выбор ответа</h4>
                    <p>${escapeHtml(task.question || '')}</p>
                    <div class="answer-options">
                        ${(task.options || []).map(o => `
                            <button class="option-btn" onclick="checkAnswer(this, ${JSON.stringify(correctText)}, '${subjectId}')">${escapeHtml(o.text || '')}</button>
                        `).join('')}
                    </div>
                    <div class="result" id="${subjectId}-result"></div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
        } else if (task.type === 'reading') {
            const correct = (task.options || []).find(o => o.correct);
            const correctText = correct ? String(correct.text || '').trim() : '';
            const subjectId = `ext-reading-${idx}`;
            const html = `
                <div class="task-card">
                    <h4>Задание 3 (внешнее): Понимание прочитанного</h4>
                    <div class="text-passage">
                        <p><strong>${escapeHtml(task.title || '')}</strong></p>
                        <p><em>${escapeHtml(task.text || '')}</em></p>
                    </div>
                    <p><strong>Вопрос:</strong> ${escapeHtml(task.question || '')}</p>
                    <div class="answer-options">
                        ${(task.options || []).map(o => `
                            <button class="option-btn" onclick="checkAnswer(this, ${JSON.stringify(correctText)}, '${subjectId}')">${escapeHtml(o.text || '')}</button>
                        `).join('')}
                    </div>
                    <div class="result" id="${subjectId}-result"></div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
        } else if (task.type === 'match') {
            // Для простоты пока отображаем подсказку
            const count = (task.pairs || []).length;
            const html = `
                <div class="task-card">
                    <h4>Задание 2 (внешнее): Соответствие</h4>
                    <p class="muted">Пока не интерактивно из внешнего файла. Парами: ${count}.</p>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
        }
    });
}

// Резервный импорт из файла
function showImportUi() {
    const bar = document.getElementById('tasks-import');
    const btn = document.getElementById('btn-import-json');
    const input = document.getElementById('file-input-json');
    if (!bar || !btn || !input) return;
    bar.style.display = 'flex';
    btn.onclick = () => input.click();
    input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!Array.isArray(data)) {
                alert('Неверный формат файла: ожидается массив JSON.');
                return;
            }
            localStorage.setItem('teacher-tasks', JSON.stringify(data));
            renderExternalTasks(data);
        } catch (err) {
            alert('Не удалось прочитать tasks.json');
            console.error(err);
        }
    };
}

// Показать секцию
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Показать только задания с номером <= lastUnlockedLiteratureTask
function applySequentialTasks() {
    const section = document.getElementById('literature-tasks');
    if (!section) return;
    const cards = section.querySelectorAll('.task-card[data-task-index]');
    cards.forEach(card => {
        const index = parseInt(card.getAttribute('data-task-index'), 10);
        if (index <= lastUnlockedLiteratureTask) {
            card.style.display = '';
            card.classList.remove('task-locked');
        } else {
            card.style.display = 'none';
            card.classList.add('task-locked');
        }
    });
    // Обновляем счётчик «Задание N из 9»
    const counterEl = document.getElementById('literature-task-counter');
    if (counterEl) counterEl.textContent = 'Задание ' + lastUnlockedLiteratureTask + ' из 9';
}

// Разблокировать следующее задание после правильного решения текущего
function unlockNextLiteratureTask(taskIndex) {
    const num = parseInt(taskIndex, 10);
    if (num >= 1 && num <= 9 && num > lastUnlockedLiteratureTask) {
        lastUnlockedLiteratureTask = num;
        saveProgress();
        applySequentialTasks();
        const section = document.getElementById('literature-tasks');
        if (section) {
            const nextCard = section.querySelector('.task-card[data-task-index="' + num + '"]');
            if (nextCard) {
                nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }
}

// Показать категорию заданий
function showTaskCategory(category) {
    // Скрываем все секции заданий
    const taskSections = document.querySelectorAll('.task-section');
    taskSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Показываем выбранную категорию
    const targetSection = document.getElementById(category + '-tasks');
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Если это литературное чтение, применяем последовательность и перемешиваем
        if (category === 'literature') {
            applySequentialTasks();
            requestAnimationFrame(() => {
                setTimeout(() => {
                    shuffleMatchingGame();
                    requestAnimationFrame(() => {
                        shuffleAnswerOptions(targetSection);
                    });
                }, 300);
            });
        }
    }
}

// Перемешивание вариантов ответов в заданиях с выбором ответа
function shuffleAnswerOptions(container) {
    if (!container) return;
    
    // Ищем все контейнеры с вариантами ответов, включая вложенные в question-block
    // Используем более широкий поиск, чтобы найти все варианты ответов
    const answerOptions = container.querySelectorAll('.answer-options');
    
    answerOptions.forEach((optionsContainer) => {
        // Получаем все кнопки-варианты ответов
        const buttons = Array.from(optionsContainer.querySelectorAll('.option-btn'));
        if (buttons.length < 2) return; // Нечего перемешивать
        
        // Сохраняем данные кнопок (текст и onclick)
        const buttonsData = buttons.map(btn => {
            const onclick = btn.getAttribute('onclick');
            return {
                text: btn.textContent.trim(),
                onclick: onclick,
                classes: btn.className
            };
        });
        
        // Перемешиваем массив данных
        const shuffled = shuffleArray(buttonsData);
        
        // Очищаем контейнер и добавляем кнопки в новом порядке
        optionsContainer.innerHTML = '';
        shuffled.forEach(data => {
            const btn = document.createElement('button');
            btn.className = data.classes;
            btn.textContent = data.text;
            if (data.onclick) {
                btn.setAttribute('onclick', data.onclick);
            }
            optionsContainer.appendChild(btn);
        });
    });
}

// Проверка ответа
function checkAnswer(button, correctAnswer, subject) {
    // Стартуем таймер при первом действии
    ensureStartTime();
    const userAnswer = button.textContent.trim();
    const isCorrect = userAnswer === correctAnswer;
    
    // Отключаем все кнопки в этой группе
    const options = button.parentElement.querySelectorAll('.option-btn');
    options.forEach(opt => {
        opt.disabled = true;
        if (opt.textContent.trim() === correctAnswer) {
            opt.classList.add('correct');
        } else if (opt === button && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });
    
    // Показываем результат
    const resultDiv = document.getElementById(subject + '-result');
    if (resultDiv) {
        if (isCorrect) {
            resultDiv.innerHTML = '✅ Правильно! Отличная работа!';
            resultDiv.className = 'result correct';
            correctAnswers++;
        } else {
            // Находим правильный ответ на русском языке
            const correctOption = Array.from(options).find(opt => opt.textContent.trim() === correctAnswer);
            const correctAnswerText = correctOption ? correctOption.textContent.trim() : correctAnswer;
            
            resultDiv.innerHTML = `❌ Неправильно. Правильный ответ: ${correctAnswerText}<br><button class="retry-btn" onclick="retryTask('${subject}')">🔄 Повторить</button>`;
            resultDiv.className = 'result incorrect';
        }
    }
    
    // Обновляем прогресс
    completedTasks++;
    if (isCorrect) {
        if (subject === 'math') {
            mathProgress += 50; // 50% за правильный ответ
        } else if (subject === 'literature') {
            literatureProgress += 50;
        } else if (subject === 'literature2') {
            literature2Progress += 50;
        } else if (subject === 'literature3') {
            literature3Progress += 50;
        } else if (
            subject === 'literatureA' ||
            subject === 'literatureB' ||
            subject === 'literatureC' ||
            subject === 'literatureD' ||
            subject === 'literatureE' ||
            subject === 'literatureF' ||
            subject === 'literatureG' ||
            subject === 'literatureH'
        ) {
            // Дополнительные задания по литературе учитываем в общем прогрессе
            literatureProgress += 25;
        }
    }
    
    // Сохраняем прогресс
    saveProgress();
    
    // Обновляем статистику
    updateProgressStats();
    
    // Последовательное прохождение: разблокировать следующее задание при правильном ответе
    if (isCorrect) {
        if (subject === 'literature') {
            unlockNextLiteratureTask(2);  // решили задание 1 — открываем задание 2
        } else if (subject === 'literatureA') {
            unlockNextLiteratureTask(5);  // решили задание 4 — открываем задание 5
        } else if (subject === 'literatureB') {
            unlockNextLiteratureTask(7);  // решили задание 6 — открываем задание 7
        } else if (subject === 'literatureC') {
            unlockNextLiteratureTask(8);  // решили задание 7 — открываем задание 8
        } else if (subject === 'literatureD') {
            unlockNextLiteratureTask(9);  // решили задание 8 — открываем задание 9
        } else if (subject === 'literatureE') {
            literatureECorrect = true;
        } else if (subject === 'literatureF') {
            literatureFCorrect = true;
        } else if (subject === 'literatureG') {
            literatureGCorrect = true;
        } else if (subject === 'literatureH') {
            literatureHCorrect = true;
        } else if (subject === 'literature2') {
            literature2Correct = true;
            if (literature3Correct) unlockNextLiteratureTask(4);  // оба ответа в задании 3 — открываем 4
        } else if (subject === 'literature3') {
            literature3Correct = true;
            if (literature2Correct) unlockNextLiteratureTask(4);
        }

        // Если все подпункты задания 9 решены верно — показываем экран поздравления
        if (literatureECorrect && literatureFCorrect && literatureGCorrect && literatureHCorrect) {
            showCongratulationsScreen();
        }
    }
    
    // Показываем анимацию
    showSuccessAnimation(button, isCorrect);
}

// Анимация успеха/неудачи
function showSuccessAnimation(button, isCorrect) {
    button.style.transform = 'scale(1.1)';
    button.style.transition = 'transform 0.2s ease';
    
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 200);
    
    // Добавляем эффект частиц для правильного ответа
    if (isCorrect) {
        createParticleEffect(button);
    }
}

// Эффект частиц для правильного ответа
function createParticleEffect(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.background = '#48bb78';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        
        document.body.appendChild(particle);
        
        // Анимация частицы
        const angle = (i / 6) * Math.PI * 2;
        const distance = 50;
        const endX = centerX + Math.cos(angle) * distance;
        const endY = centerY + Math.sin(angle) * distance;
        
        particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(0)`, opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        }).onfinish = () => {
            document.body.removeChild(particle);
        };
    }
}

// Обновление статистики прогресса
function updateProgressStats() {
    const completedElement = document.getElementById('completed-tasks');
    const correctElement = document.getElementById('correct-answers');
    const accuracyElement = document.getElementById('accuracy');
    
    if (completedElement) {
        completedElement.textContent = completedTasks;
    }
    
    if (correctElement) {
        correctElement.textContent = correctAnswers;
    }
    
    if (accuracyElement) {
        const accuracy = completedTasks > 0 ? Math.round((correctAnswers / completedTasks) * 100) : 0;
        accuracyElement.textContent = accuracy + '%';
    }
    
    // Обновляем прогресс по предметам
    updateSubjectProgress('math', mathProgress);
    updateSubjectProgress('literature', literatureProgress);
}

// Обновление прогресса по предмету
function updateSubjectProgress(subject, progress) {
    const progressBar = document.getElementById(subject + '-progress');
    const percentage = document.getElementById(subject + '-percentage');
    
    if (progressBar) {
        progressBar.style.width = Math.min(progress, 100) + '%';
    }
    
    if (percentage) {
        percentage.textContent = Math.min(progress, 100) + '%';
    }
}

// Сохранение прогресса в localStorage
function saveProgress() {
    const progress = {
        completedTasks,
        correctAnswers,
        mathProgress,
        literatureProgress,
        literature2Progress,
        literature3Progress,
        lastUnlockedLiteratureTask,
        startTimeMs
    };
    
    localStorage.setItem('vpr-progress', JSON.stringify(progress));
}

// Загрузка прогресса из localStorage
function loadProgress() {
    const savedProgress = localStorage.getItem('vpr-progress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        completedTasks = progress.completedTasks || 0;
        correctAnswers = progress.correctAnswers || 0;
        mathProgress = progress.mathProgress || 0;
        literatureProgress = progress.literatureProgress || 0;
        literature2Progress = progress.literature2Progress || 0;
        literature3Progress = progress.literature3Progress || 0;
        lastUnlockedLiteratureTask = Math.max(1, parseInt(progress.lastUnlockedLiteratureTask, 10) || 1);
        startTimeMs = typeof progress.startTimeMs === 'number' ? progress.startTimeMs : null;
    }
}

// Повторение задания
function retryTask(subject) {
    // Сбрасываем результат
    const resultDiv = document.getElementById(subject + '-result');
    if (resultDiv) {
        resultDiv.innerHTML = '';
        resultDiv.className = 'result';
        
        // Находим родительский блок вопроса (question-block) или родительский контейнер с кнопками
        const questionBlock = resultDiv.closest('.question-block');
        const parentContainer = questionBlock || resultDiv.parentElement;
        
        // Ищем все кнопки в этом же блоке вопроса или в родительском контейнере
        const optionButtons = parentContainer ? parentContainer.querySelectorAll('.option-btn') : [];
        
        // Если не нашли в ближайшем родителе, ищем в секции заданий
        if (optionButtons.length === 0) {
            const taskSection = document.getElementById(subject + '-tasks');
            if (taskSection) {
                taskSection.querySelectorAll('.option-btn').forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('correct', 'incorrect');
                });
            }
        } else {
            // Включаем все кнопки и убираем классы
            optionButtons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('correct', 'incorrect');
            });
        }
    } else {
        // Если результат не найден, ищем по секции (старый способ для совместимости)
        const taskSection = document.getElementById(subject + '-tasks');
        if (taskSection) {
            const optionButtons = taskSection.querySelectorAll('.option-btn');
            optionButtons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('correct', 'incorrect');
            });
        }
    }
}

// Зафиксировать время начала прохождения (при первом действии в заданиях)
function ensureStartTime() {
    if (startTimeMs === null) {
        startTimeMs = Date.now();
        saveProgress();
    }
}

// Повторная попытка в задании на соответствие (задания 2 и 5)
function retryMatchingTask(taskIndex) {
    const section = document.getElementById('literature-tasks');
    if (!section) return;
    const taskCard = section.querySelector('.task-card[data-task-index="' + taskIndex + '"]');
    if (!taskCard) return;
    const gameContainer = taskCard.querySelector('.matching-game');
    if (!gameContainer) return;

    // Очищаем ответы для этого задания
    matchingAnswersByTask[taskIndex] = {};
    if (taskIndex === 2) matchingAnswers = {};

    // Убираем подсветку правильных/неправильных
    gameContainer.querySelectorAll('.image-item, .writer-option').forEach(el => {
        el.classList.remove('correct', 'incorrect');
    });

    // Очищаем блок результата
    const resultDiv = taskIndex === 2 ? document.getElementById('matching-result') : document.getElementById('matching-result-2');
    if (resultDiv) {
        resultDiv.innerHTML = '';
        resultDiv.className = 'matching-result';
    }

    // Включаем кнопку «Проверить»
    const checkBtn = taskCard.querySelector('.check-matching-btn');
    if (checkBtn) checkBtn.disabled = false;

    // Обновляем линии для этого задания
    renderConnections(false, taskIndex);
}

// Сброс прогресса (для тестирования)
function resetProgress() {
    completedTasks = 0;
    correctAnswers = 0;
    mathProgress = 0;
    literatureProgress = 0;
    literature2Progress = 0;
    literature3Progress = 0;
    lastUnlockedLiteratureTask = 1;
    literature2Correct = false;
    literature3Correct = false;
    matchingAnswersByTask = { 2: {}, 5: {} };
    matchingAnswers = {};
    startTimeMs = null;
    
    // Очищаем localStorage
    localStorage.removeItem('vpr-progress');
    
    // Сбрасываем все результаты
    const resultDivs = document.querySelectorAll('.result');
    resultDivs.forEach(div => {
        div.innerHTML = '';
        div.className = 'result';
    });
    
    // Включаем все кнопки
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
    });
    // Сбрасываем задания на соответствие
    const matchResult1 = document.getElementById('matching-result');
    const matchResult2 = document.getElementById('matching-result-2');
    if (matchResult1) { matchResult1.innerHTML = ''; matchResult1.className = 'matching-result'; }
    if (matchResult2) { matchResult2.innerHTML = ''; matchResult2.className = 'matching-result'; }
    document.querySelectorAll('.check-matching-btn').forEach(btn => { btn.disabled = false; });
    document.querySelectorAll('.image-item, .writer-option').forEach(el => el.classList.remove('correct', 'incorrect', 'selected'));
    
    // Очищаем линии соединений в обоих заданиях
    const literatureSection = document.getElementById('literature-tasks');
    if (literatureSection) {
        [2, 5].forEach(taskIndex => {
            const taskCard = literatureSection.querySelector('.task-card[data-task-index="' + taskIndex + '"]');
            if (taskCard) {
                const matchingGame = taskCard.querySelector('.matching-game');
                if (matchingGame) {
                    const svg = matchingGame.querySelector('svg.connection-layer, #connections-svg');
                    if (svg) {
                        // Очищаем все пути (линии)
                        while (svg.firstChild) {
                            svg.removeChild(svg.firstChild);
                        }
                    }
                }
            }
        });
    }
    
    // Обновляем статистику
    updateProgressStats();
    hideCongratulations();
    applySequentialTasks();
}

// Показать экран «Все задания выполнены»
function showCongratulationsScreen() {
    const overlay = document.getElementById('congratulations-overlay');
    if (overlay) {
        // Обновляем время прохождения
        const timeEl = document.getElementById('total-time');
        if (timeEl && startTimeMs) {
            const totalMs = Date.now() - startTimeMs;
            const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            if (minutes > 0) {
                timeEl.textContent = `${minutes} мин ${seconds.toString().padStart(2, '0')} с`;
            } else {
                timeEl.textContent = `${seconds} с`;
            }
        }
        overlay.style.display = 'flex';
    }
}

// Скрыть экран поздравления
function hideCongratulations() {
    const overlay = document.getElementById('congratulations-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Пройти заново: сброс прогресса и закрытие поздравления
function resetProgressAndCloseCongratulations() {
    resetProgress();
    hideCongratulations();
    applySequentialTasks();
}

// Добавляем кнопку сброса прогресса (для разработки)
document.addEventListener('DOMContentLoaded', function() {
    // Создаем кнопку сброса (скрытую)
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Сбросить прогресс';
    resetButton.style.position = 'fixed';
    resetButton.style.bottom = '20px';
    resetButton.style.right = '20px';
    resetButton.style.background = '#f56565';
    resetButton.style.color = 'white';
    resetButton.style.border = 'none';
    resetButton.style.padding = '0.5rem 1rem';
    resetButton.style.borderRadius = '8px';
    resetButton.style.cursor = 'pointer';
    resetButton.style.zIndex = '1000';
    resetButton.onclick = resetProgress;
    
    // Показываем кнопку только в режиме разработки
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.body.appendChild(resetButton);
    }
});

// Плавная прокрутка для якорных ссылок
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Добавляем эффект печатания для заголовка
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Анимация появления карточек
function animateCards() {
    const cards = document.querySelectorAll('.feature-card, .category-card, .task-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Переменные для задания "Соедини картинки с писателем"
let selectedImage = null;
let selectedWriter = null;
let matchingAnswers = {};

// Функция для случайного перемешивания массива
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Функция для перемешивания элементов задания "Соедини картинки с писателем"
// Перемешивает оба задания (2 и 5) отдельно
function shuffleMatchingGame() {
    console.log('=== НАЧАЛО ПЕРЕМЕШИВАНИЯ ===');
    
    // Сбрасываем предыдущие ответы
    matchingAnswers = {};
    matchingAnswersByTask[2] = {};
    matchingAnswersByTask[5] = {};
    selectedImage = null;
    selectedWriter = null;
    
    // Ищем элементы внутри секции литературного чтения
    const literatureSection = document.getElementById('literature-tasks');
    if (!literatureSection) {
        console.error('ОШИБКА: Не найдена секция литературного чтения');
        return;
    }
    
    // Перемешиваем оба задания отдельно
    [2, 5].forEach(taskIndex => {
        const taskCard = literatureSection.querySelector('.task-card[data-task-index="' + taskIndex + '"]');
        if (!taskCard) return;
        
        const matchingGame = taskCard.querySelector('.matching-game');
        if (!matchingGame) return;
        
        // Перемешиваем изображения в этом задании
        const imagesGrid = matchingGame.querySelector('.images-grid');
        if (imagesGrid) {
            let imageItems = Array.from(imagesGrid.children);
            if (imageItems.length === 0) {
                imageItems = Array.from(imagesGrid.querySelectorAll('.image-item'));
            }
            if (imageItems.length > 0) {
                imageItems.forEach(item => {
                    item.style.borderColor = '';
                    item.style.opacity = '';
                    item.style.transform = '';
                    item.style.transition = '';
                    item.classList.remove('selected', 'correct', 'incorrect');
                });
                
                const shuffledImages = shuffleArray(imageItems);
                while (imagesGrid.firstChild) {
                    imagesGrid.removeChild(imagesGrid.firstChild);
                }
                shuffledImages.forEach(item => {
                    item.style.opacity = '';
                    item.style.transform = '';
                    item.style.transition = '';
                    imagesGrid.appendChild(item);
                });
            }
        }
        
        // Перемешиваем имена писателей в этом задании
        const writersList = matchingGame.querySelector('.writers-list');
        if (writersList) {
            let writerOptions = Array.from(writersList.children);
            if (writerOptions.length === 0) {
                writerOptions = Array.from(writersList.querySelectorAll('.writer-option'));
            }
            if (writerOptions.length > 0) {
                writerOptions.forEach(option => {
                    option.style.borderColor = '';
                    option.style.opacity = '';
                    option.style.transform = '';
                    option.style.transition = '';
                    option.classList.remove('selected', 'correct', 'incorrect');
                });
                
                const shuffledWriters = shuffleArray(writerOptions);
                while (writersList.firstChild) {
                    writersList.removeChild(writersList.firstChild);
                }
                shuffledWriters.forEach(option => {
                    option.style.opacity = '';
                    option.style.transform = '';
                    option.style.transition = '';
                    writersList.appendChild(option);
                });
            }
        }
        
        // Сбрасываем результат для этого задания
        const resultDiv = taskIndex === 2 ? document.getElementById('matching-result') : document.getElementById('matching-result-2');
        if (resultDiv) {
            resultDiv.innerHTML = '';
            resultDiv.className = 'matching-result';
        }
        
        // Включаем кнопку проверки для этого задания
        const checkBtn = taskCard.querySelector('.check-matching-btn');
        if (checkBtn) {
            checkBtn.disabled = false;
        }
    });
    
    // Переустанавливаем обработчики событий
    setupMatchingGameHandlers();
    
    console.log('=== ПЕРЕМЕШИВАНИЕ ЗАВЕРШЕНО ===');
}

// Инициализация задания "Соедини картинки с писателем" (установка обработчиков)
function initMatchingGame() {
    setupMatchingGameHandlers();
    const literatureSection = document.getElementById('literature-tasks');
    if (literatureSection) {
        [2, 5].forEach(taskIndex => {
            const taskCard = literatureSection.querySelector('.task-card[data-task-index="' + taskIndex + '"]');
            if (taskCard) {
                const matchingGame = taskCard.querySelector('.matching-game');
                if (matchingGame) {
                    ensureConnectionLayer(matchingGame);
                }
            }
        });
    }
    renderConnections();
    window.addEventListener('resize', () => renderConnections());
}

// Установка обработчиков событий для задания
function setupMatchingGameHandlers() {
    const literatureSection = document.getElementById('literature-tasks');
    if (!literatureSection) return;
    
    const imageItems = literatureSection.querySelectorAll('.image-item');
    const writerOptions = literatureSection.querySelectorAll('.writer-option');
    
    // Удаляем старые обработчики
    imageItems.forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
    });
    
    writerOptions.forEach(option => {
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
    });
    
    // Добавляем новые обработчики
    const newImageItems = literatureSection.querySelectorAll('.image-item');
    const newWriterOptions = literatureSection.querySelectorAll('.writer-option');
    
    newImageItems.forEach(item => {
        item.addEventListener('click', function() {
            selectImage(this);
        });
    });
    
    newWriterOptions.forEach(option => {
        option.addEventListener('click', function() {
            selectWriter(this);
        });
    });

    // Инициализируем оба задания
    if (literatureSection) {
        [2, 5].forEach(taskIndex => {
            const taskCard = literatureSection.querySelector('.task-card[data-task-index="' + taskIndex + '"]');
            if (taskCard) {
                const matchingGame = taskCard.querySelector('.matching-game');
                if (matchingGame) {
                    ensureConnectionLayer(matchingGame);
                }
            }
        });
    }
    renderConnections();
}

// Выбор картинки
function selectImage(imageElement) {
    const taskCard = imageElement.closest('.task-card[data-task-index]');
    const matchingGame = taskCard ? taskCard.querySelector('.matching-game') : null;
    
    // Убираем выделение с других картинок в этом же задании
    if (matchingGame) {
        matchingGame.querySelectorAll('.image-item').forEach(item => {
            item.classList.remove('selected');
        });
    } else {
        document.querySelectorAll('.image-item').forEach(item => {
            item.classList.remove('selected');
        });
    }
    
    // Выделяем выбранную картинку
    imageElement.classList.add('selected');
    selectedImage = imageElement;
    
    // Если уже выбран писатель, создаем связь
    if (selectedWriter) {
        createConnection();
    }
}

// Выбор писателя
function selectWriter(writerElement) {
    const taskCard = writerElement.closest('.task-card[data-task-index]');
    const matchingGame = taskCard ? taskCard.querySelector('.matching-game') : null;
    
    // Убираем выделение с других писателей в этом же задании
    if (matchingGame) {
        matchingGame.querySelectorAll('.writer-option').forEach(option => {
            option.classList.remove('selected');
        });
    } else {
        document.querySelectorAll('.writer-option').forEach(option => {
            option.classList.remove('selected');
        });
    }
    
    // Выделяем выбранного писателя
    writerElement.classList.add('selected');
    selectedWriter = writerElement;
    
    // Если уже выбрана картинка, создаем связь
    if (selectedImage) {
        createConnection();
    }
}

// Создание связи между картинкой и писателем
function createConnection() {
    if (selectedImage && selectedWriter) {
        const imageWriter = selectedImage.dataset.writer;
        const writerName = selectedWriter.dataset.writer;
        const taskCard = selectedImage.closest('.task-card[data-task-index]');
        const taskIndex = taskCard ? parseInt(taskCard.getAttribute('data-task-index'), 10) : 2;
        
        matchingAnswersByTask[taskIndex] = matchingAnswersByTask[taskIndex] || {};
        matchingAnswersByTask[taskIndex][imageWriter] = writerName;
        if (taskIndex === 2) {
            matchingAnswers[imageWriter] = writerName;
        }
        
        selectedImage.classList.remove('selected');
        selectedWriter.classList.remove('selected');
        selectedImage = null;
        selectedWriter = null;
        
        // Отрисовываем линии только для текущего задания
        renderConnections(true, taskIndex);
    }
}

// Показать визуальную связь
function showConnection(imageWriter, writerName) {
    const imageElement = document.querySelector(`.image-item[data-writer="${imageWriter}"]`);
    const writerElement = document.querySelector(`.writer-option[data-writer="${writerName}"]`);
    
    if (imageElement) {
        imageElement.style.borderColor = '#667eea';
    }
    if (writerElement) {
        writerElement.style.borderColor = '#667eea';
    }
}

// === Соединительные линии (SVG) ===
function ensureConnectionLayer(matchingGame) {
    if (!matchingGame) {
        matchingGame = document.querySelector('#literature-tasks .matching-game');
    }
    if (!matchingGame) return null;
    
    // Ищем существующий SVG (может быть с id="connections-svg" или просто с классом)
    let svg = matchingGame.querySelector('#connections-svg');
    if (!svg) {
        svg = matchingGame.querySelector('svg.connection-layer');
    }
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('connection-layer');
        matchingGame.appendChild(svg);
    }
    // Обновляем размеры SVG под контейнер
    const rect = matchingGame.getBoundingClientRect();
    const width = rect.width || matchingGame.offsetWidth || 800;
    const height = rect.height || matchingGame.offsetHeight || 600;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    // Стили уже заданы в CSS, но убедимся что они применены
    if (!svg.style.position) {
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';
    }
    return svg;
}

function getImageAnchor(element, container) {
    const elRect = element.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const padding = 6; // небольшой отступ от границы карточки
    return {
        x: elRect.left - cRect.left + elRect.width / 2,
        y: elRect.bottom - cRect.top - padding
    };
}
function Misha() {
    console.log('Hello! I`m Misha!');
}
function getWriterAnchor(element, container) {
    const elRect = element.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const padding = 6; // небольшой отступ внутрь карточки
    return {
        x: elRect.left - cRect.left + elRect.width / 2,
        y: elRect.top - cRect.top + padding
    };
}

function buildSmoothPath(x1, y1, x2, y2) {
    const midY = (y1 + y2) / 2; // направляем кривую в середину между блоками
    const curve = Math.max(40, Math.min(180, Math.abs(x2 - x1)));
    const c1x = x1;
    const c1y = midY;
    const c2x = x2;
    const c2y = midY;
    return `M ${x1},${y1} C ${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
}

function renderConnections(animateLast = false, taskIndex = null) {
    const literatureSection = document.getElementById('literature-tasks');
    if (!literatureSection) return;
    
    // Если указан taskIndex, рисуем только для этого задания
    const tasksToRender = taskIndex ? [taskIndex] : [2, 5];
    
    tasksToRender.forEach(tIndex => {
        const taskCard = literatureSection.querySelector('.task-card[data-task-index="' + tIndex + '"]');
        if (!taskCard) return;
        
        const matchingGame = taskCard.querySelector('.matching-game');
        if (!matchingGame) return;
        
        const svg = ensureConnectionLayer(matchingGame);
        if (!svg) return;

        // Очистка
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        // Градиент для линий (создаём только если его ещё нет)
        const gradientId = tIndex === 2 ? 'connectionGradient' : 'connectionGradient-' + tIndex;
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.appendChild(defs);
        }
        // Проверяем, есть ли уже градиент с таким ID
        if (!svg.querySelector('#' + gradientId)) {
            const linear = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            linear.setAttribute('id', gradientId);
            linear.setAttribute('x1', '0%');
            linear.setAttribute('y1', '0%');
            linear.setAttribute('x2', '100%');
            linear.setAttribute('y2', '0%');
            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', '#667eea');
            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', '#764ba2');
            linear.appendChild(stop1);
            linear.appendChild(stop2);
            defs.appendChild(linear);
        }

        // Рисуем линии для текущих ответов этого задания
        const answers = tIndex === 2 ? matchingAnswers : (matchingAnswersByTask[tIndex] || {});
        const entries = Object.entries(answers);
        
        if (entries.length === 0) return; // Нет соединений для отрисовки
        
        entries.forEach(([imageWriter, writerName], index) => {
            // Ищем элементы только внутри этого задания
            const imageElement = matchingGame.querySelector(`.image-item[data-writer="${imageWriter}"]`);
            const writerElement = matchingGame.querySelector(`.writer-option[data-writer="${writerName}"]`);
            if (!imageElement || !writerElement) {
                console.log('Не найдены элементы для', imageWriter, writerName, 'в задании', tIndex);
                return;
            }

            const p1 = getImageAnchor(imageElement, matchingGame);
            const p2 = getWriterAnchor(writerElement, matchingGame);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'connection-path');
            path.setAttribute('d', buildSmoothPath(p1.x, p1.y, p2.x, p2.y));
            // Используем общий градиент или создаём уникальный для каждого задания
            const gradientId = tIndex === 2 ? 'connectionGradient' : 'connectionGradient-' + tIndex;
            path.setAttribute('stroke', 'url(#' + gradientId + ')');
            path.setAttribute('stroke-width', '4');
            path.setAttribute('fill', 'none');
            svg.appendChild(path);

            if (animateLast && index === entries.length - 1) {
                requestAnimationFrame(() => {
                    path.classList.add('animate');
                });
            }
        });
    });
}

// Проверка ответов в задании "Соедини картинки с писателем"
// btn — кнопка «Проверить», по ней определяется номер задания (2 или 5)
function checkMatching(btn) {
    // Стартуем таймер при первом действии
    ensureStartTime();
    const taskCard = btn && btn.closest ? btn.closest('.task-card[data-task-index]') : null;
    const taskIndex = taskCard ? parseInt(taskCard.getAttribute('data-task-index'), 10) : 2;
    const gameContainer = taskCard ? taskCard.querySelector('.matching-game') : document.querySelector('#literature-tasks .matching-game');
    
    let correctMap = {};
    let userAnswers = matchingAnswersByTask[taskIndex] || {};
    
    if (taskIndex === 2) {
        correctMap = { 'Пушкин': 'Пушкин', 'Толстой': 'Толстой', 'Чехов': 'Чехов', 'Гоголь': 'Гоголь' };
    } else if (gameContainer) {
        gameContainer.querySelectorAll('.image-item').forEach(item => {
            const w = item.dataset.writer;
            if (w) correctMap[w] = w;
        });
    }
    
    let matchCorrectCount = 0;
    const totalCount = Object.keys(correctMap).length;
    
    Object.keys(correctMap).forEach(imageWriter => {
        const userAnswer = userAnswers[imageWriter];
        const correctAnswer = correctMap[imageWriter];
        const imageElement = gameContainer ? gameContainer.querySelector(`.image-item[data-writer="${imageWriter}"]`) : null;
        const writerElement = gameContainer && userAnswer ? gameContainer.querySelector(`.writer-option[data-writer="${userAnswer}"]`) : null;
        
        if (userAnswer === correctAnswer) {
            matchCorrectCount++;
            if (imageElement) imageElement.classList.add('correct');
            if (writerElement) writerElement.classList.add('correct');
        } else {
            if (imageElement) imageElement.classList.add('incorrect');
            if (writerElement) writerElement.classList.add('incorrect');
        }
    });
    
    const resultDiv = taskIndex === 2 ? document.getElementById('matching-result') : document.getElementById('matching-result-2');
    const checkBtn = taskCard ? taskCard.querySelector('.check-matching-btn') : document.querySelector('.check-matching-btn');
    
    if (matchCorrectCount === totalCount) {
        if (resultDiv) {
            resultDiv.textContent = '🎉 Отлично! Все ответы правильные!';
            resultDiv.className = 'matching-result correct';
        }
        correctAnswers++;
        unlockNextLiteratureTask(taskIndex + 1);  // решили задание 2 или 5 — открываем следующее
    } else {
        if (resultDiv) {
            resultDiv.innerHTML = `❌ Правильно: ${matchCorrectCount} из ${totalCount}. Попробуйте еще раз!<br><button class="retry-btn" onclick="retryMatchingTask(${taskIndex})">🔄 Повторить</button>`;
            resultDiv.className = 'matching-result incorrect';
        }
    }
    
    if (checkBtn) checkBtn.disabled = true;
    
    completedTasks++;
    if (matchCorrectCount === totalCount) literatureProgress += 50;
    
    saveProgress();
    updateProgressStats();
}

// Запускаем анимации при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(animateCards, 500);
    // Инициализируем обработчики при первой загрузке
    setTimeout(() => {
        initMatchingGame();
    }, 1000);
});
