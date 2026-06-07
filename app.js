// ==========================================================================
// Application State & Defaults
// ==========================================================================

let state = {
    tasks: [],
    categories: [],
    activeFilter: 'all', // 'all', 'today', 'overdue' or 'category-<id>'
    priorityFilter: 'all', // 'all', 'high', 'medium', 'low'
    sortBy: 'date-desc', // 'date-desc', 'date-asc', 'priority-desc', 'alphabetical'
    searchQuery: '',
    currentTheme: 'dark',
    temporarySubtasks: [] // Holds subtasks when adding/editing in modal
};

const COLOR_PRESETS = [
    { name: 'Vila Violeta', value: 'hsl(262, 83%, 65%)' },
    { name: 'Verde Esmeralda', value: 'hsl(142, 70%, 50%)' },
    { name: 'Laranja Solar', value: 'hsl(38, 95%, 60%)' },
    { name: 'Azul Celeste', value: 'hsl(200, 95%, 50%)' },
    { name: 'Rosa Vibrante', value: 'hsl(330, 85%, 60%)' },
    { name: 'Indigo Profundo', value: 'hsl(230, 75%, 60%)' }
];

const DEFAULT_CATEGORIES = [
    { id: 'cat-work', name: 'Trabalho', color: 'hsl(262, 83%, 65%)' },
    { id: 'cat-personal', name: 'Pessoal', color: 'hsl(142, 70%, 50%)' },
    { id: 'cat-shopping', name: 'Compras', color: 'hsl(38, 95%, 60%)' },
    { id: 'cat-studies', name: 'Estudos', color: 'hsl(200, 95%, 50%)' }
];

const DEFAULT_TASKS = [
    {
        id: 'task-1',
        title: 'Organizar ambiente de desenvolvimento do app',
        notes: 'Verificar se todas as dependências estão rodando de forma correta no browser.',
        dueDate: new Date().toISOString().split('T')[0], // Today
        priority: 'high',
        categoryId: 'cat-work',
        completed: false,
        subtasks: [
            { id: 'sub-1-1', title: 'Criar index.html estruturado', completed: true },
            { id: 'sub-1-2', title: 'Desenvolver folhas de estilo premium', completed: true },
            { id: 'sub-1-3', title: 'Testar reatividade com javascript', completed: false }
        ],
        createdAt: Date.now() - 3600000
    },
    {
        id: 'task-2',
        title: 'Fazer compras no supermercado',
        notes: 'Comprar frutas, café e leite de aveia.',
        dueDate: '',
        priority: 'low',
        categoryId: 'cat-shopping',
        completed: false,
        subtasks: [],
        createdAt: Date.now() - 7200000
    },
    {
        id: 'task-3',
        title: 'Ler 20 páginas do livro atual',
        notes: 'Meta diária de desenvolvimento pessoal.',
        dueDate: '',
        priority: 'medium',
        categoryId: 'cat-personal',
        completed: true,
        subtasks: [],
        createdAt: Date.now() - 10800000
    }
];

// ==========================================================================
// Initialization & LocalStorage
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initUI();
    render();
});

function loadState() {
    const savedTasks = localStorage.getItem('taskflow_tasks');
    const savedCategories = localStorage.getItem('taskflow_categories');
    const savedTheme = localStorage.getItem('taskflow_theme');

    state.tasks = savedTasks ? JSON.parse(savedTasks) : DEFAULT_TASKS;
    state.categories = savedCategories ? JSON.parse(savedCategories) : DEFAULT_CATEGORIES;
    state.currentTheme = savedTheme || 'dark';

    // Apply Theme
    document.documentElement.setAttribute('data-theme', state.currentTheme);
}

function saveState() {
    localStorage.setItem('taskflow_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('taskflow_categories', JSON.stringify(state.categories));
    localStorage.setItem('taskflow_theme', state.currentTheme);
}

// ==========================================================================
// UI Initial Setup (Event Listeners & Elements bindings)
// ==========================================================================

let selectedCategoryColor = COLOR_PRESETS[0].value;

function initUI() {
    // Icons
    lucide.createIcons();

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    updateThemeButtonLabel();
    themeBtn.addEventListener('click', () => {
        state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.currentTheme);
        updateThemeButtonLabel();
        saveState();
    });

    // Modals bindings
    const taskModal = document.getElementById('task-modal');
    const categoryModal = document.getElementById('category-modal');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCloseCategoryModal = document.getElementById('btn-close-category-modal');
    const btnCancelTask = document.getElementById('btn-cancel-task');
    const btnCancelCategory = document.getElementById('btn-cancel-category');
    const btnAddCategory = document.getElementById('btn-add-category');

    btnOpenModal.addEventListener('click', () => openTaskModal());
    btnCloseModal.addEventListener('click', () => closeModals());
    btnCancelTask.addEventListener('click', () => closeModals());
    btnCancelCategory.addEventListener('click', () => closeModals());
    btnCloseCategoryModal.addEventListener('click', () => closeModals());

    btnAddCategory.addEventListener('click', () => {
        openCategoryModal();
    });

    // Forms handles
    document.getElementById('task-form').addEventListener('submit', handleTaskFormSubmit);
    document.getElementById('category-form').addEventListener('submit', handleCategoryFormSubmit);

    // Subtask Creator inside Modal
    document.getElementById('btn-add-subtask-item').addEventListener('click', addSubtaskToPreviewList);
    document.getElementById('new-subtask-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSubtaskToPreviewList();
        }
    });

    // Color Pickers Setup inside Category Modal
    setupColorPicker();

    // Quick Filters Event Listeners (Sidebar)
    document.querySelectorAll('.nav-item[data-filter]').forEach(item => {
        item.addEventListener('click', (e) => {
            const element = e.currentTarget;
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            element.classList.add('active');
            state.activeFilter = element.getAttribute('data-filter');
            render();
        });
    });

    // Toolbar Filters & Search Event Listeners
    document.getElementById('filter-priority').addEventListener('change', (e) => {
        state.priorityFilter = e.target.value;
        render();
    });

    document.getElementById('sort-by').addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        render();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        render();
    });

    // Collapsible Completed Tasks Section Trigger
    document.getElementById('btn-toggle-completed').addEventListener('click', () => {
        const completedList = document.getElementById('completed-tasks-list');
        const chevron = document.getElementById('completed-chevron');
        
        completedList.classList.toggle('completed-expanded');
        completedList.classList.toggle('completed-collapsed');

        if (completedList.classList.contains('completed-expanded')) {
            chevron.style.transform = 'rotate(180deg)';
        } else {
            chevron.style.transform = 'rotate(0deg)';
        }
    });
}

function updateThemeButtonLabel() {
    const themeBtn = document.getElementById('theme-toggle');
    const textNode = themeBtn.querySelector('span');
    textNode.textContent = state.currentTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
}

// ==========================================================================
// Category Color Picker Generator
// ==========================================================================

function setupColorPicker() {
    const grid = document.getElementById('color-picker-grid');
    grid.innerHTML = '';
    
    COLOR_PRESETS.forEach((preset, index) => {
        const div = document.createElement('div');
        div.className = `color-option ${index === 0 ? 'selected' : ''}`;
        div.style.backgroundColor = preset.value;
        div.setAttribute('data-color', preset.value);
        div.addEventListener('click', (e) => {
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            selectedCategoryColor = preset.value;
        });
        grid.appendChild(div);
    });
    selectedCategoryColor = COLOR_PRESETS[0].value;
}

// ==========================================================================
// Modal Operations
// ==========================================================================

function openTaskModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const modalTitle = document.getElementById('modal-title');
    
    // Reset Form
    form.reset();
    document.getElementById('task-id').value = '';
    state.temporarySubtasks = [];
    renderSubtasksPreviewList();

    // Populate category dropdown
    const selectCat = document.getElementById('task-category');
    selectCat.innerHTML = '';
    state.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        selectCat.appendChild(opt);
    });

    if (taskId) {
        // Edit Mode
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            modalTitle.textContent = 'Editar Tarefa';
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-notes').value = task.notes;
            document.getElementById('task-date').value = task.dueDate;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-category').value = task.categoryId;
            state.temporarySubtasks = [...task.subtasks];
            renderSubtasksPreviewList();
        }
    } else {
        // Add Mode
        modalTitle.textContent = 'Nova Tarefa';
        // Auto-select active category if one is filtered in the sidebar
        if (state.activeFilter.startsWith('category-')) {
            const catId = state.activeFilter.replace('category-', '');
            document.getElementById('task-category').value = catId;
        }
    }

    modal.classList.add('open');
}

function openCategoryModal() {
    const modal = document.getElementById('category-modal');
    document.getElementById('category-form').reset();
    setupColorPicker();
    modal.classList.add('open');
}

function closeModals() {
    document.getElementById('task-modal').classList.remove('open');
    document.getElementById('category-modal').classList.remove('open');
}

// ==========================================================================
// Subtask Addition and Preview Logic (Inside Task Modal)
// ==========================================================================

function addSubtaskToPreviewList() {
    const input = document.getElementById('new-subtask-input');
    const title = input.value.trim();
    if (!title) return;

    const newSub = {
        id: 'sub-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        title: title,
        completed: false
    };

    state.temporarySubtasks.push(newSub);
    input.value = '';
    renderSubtasksPreviewList();
}

function renderSubtasksPreviewList() {
    const list = document.getElementById('subtasks-preview-list');
    list.innerHTML = '';

    state.temporarySubtasks.forEach((sub, index) => {
        const li = document.createElement('li');
        li.className = 'preview-subtask-item';

        const span = document.createElement('span');
        span.textContent = sub.title;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Remover';
        btn.addEventListener('click', () => {
            state.temporarySubtasks.splice(index, 1);
            renderSubtasksPreviewList();
        });

        li.appendChild(span);
        li.appendChild(btn);
        list.appendChild(li);
    });
}

// ==========================================================================
// Form Submission Handlers
// ==========================================================================

function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    const notes = document.getElementById('task-notes').value.trim();
    const dueDate = document.getElementById('task-date').value;
    const priority = document.getElementById('task-priority').value;
    const categoryId = document.getElementById('task-category').value;

    if (!title) return;

    if (id) {
        // Update
        const taskIndex = state.tasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            state.tasks[taskIndex] = {
                ...state.tasks[taskIndex],
                title,
                notes,
                dueDate,
                priority,
                categoryId,
                subtasks: [...state.temporarySubtasks]
            };
        }
    } else {
        // Add
        const newTask = {
            id: 'task-' + Date.now(),
            title,
            notes,
            dueDate,
            priority,
            categoryId,
            completed: false,
            subtasks: [...state.temporarySubtasks],
            createdAt: Date.now()
        };
        state.tasks.push(newTask);
    }

    saveState();
    closeModals();
    render();
}

function handleCategoryFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('category-name').value.trim();
    if (!name) return;

    const newCat = {
        id: 'cat-' + Date.now(),
        name: name,
        color: selectedCategoryColor
    };

    state.categories.push(newCat);
    saveState();
    closeModals();
    render();
}

// ==========================================================================
// Task Card State Handlers (Checkboxes, Subtasks checks, actions)
// ==========================================================================

function toggleTaskComplete(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        
        // Auto-complete or auto-reset all subtasks to align with task main status
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(s => s.completed = task.completed);
        }

        if (task.completed) {
            triggerConfetti();
        }
        
        saveState();
        render();
    }
}

function toggleSubtaskComplete(taskId, subtaskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        const subtask = task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;

            // If all subtasks are complete, let's keep task active but update completion ratio
            // Or if user specifically completes all subtasks, we might not auto-complete the main task.
            // Let's just update states.
            const allDone = task.subtasks.every(s => s.completed);
            if (allDone && !task.completed) {
                // optional: auto-complete main task when all subtasks completed
                task.completed = true;
                triggerConfetti();
            } else if (!allDone && task.completed) {
                // If a subtask was unchecked, uncheck the main task
                task.completed = false;
            }

            saveState();
            render();
        }
    }
}

function deleteTask(taskId) {
    if (confirm('Tem certeza de que deseja excluir esta tarefa?')) {
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        saveState();
        render();
    }
}

function deleteCategory(categoryId) {
    if (confirm('Tem certeza de que deseja excluir esta categoria? As tarefas associadas continuarão existindo sem categoria.')) {
        state.categories = state.categories.filter(c => c.id !== categoryId);
        
        // Remove categoryId from tasks linked to it
        state.tasks = state.tasks.map(t => {
            if (t.categoryId === categoryId) {
                return { ...t, categoryId: '' };
            }
            return t;
        });

        // Reset active filter if we were viewing the deleted category
        if (state.activeFilter === `category-${categoryId}`) {
            state.activeFilter = 'all';
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.querySelector('[data-filter="all"]').classList.add('active');
        }

        saveState();
        render();
    }
}

// ==========================================================================
// Rendering Engine (DOM construction & updates)
// ==========================================================================

function render() {
    // 1. Render Categories Navigation and Category Select list
    renderCategoriesList();

    // 2. Filter & Sort Tasks
    const filteredTasks = getFilteredAndSortedTasks();

    // Split Pending & Completed
    const pendingTasks = filteredTasks.filter(t => !t.completed);
    const completedTasks = filteredTasks.filter(t => t.completed);

    // 3. Render lists
    renderTasksList(pendingTasks, document.getElementById('pending-tasks-list'));
    renderTasksList(completedTasks, document.getElementById('completed-tasks-list'));

    // Handle Completed Section visibility
    const completedWrapper = document.getElementById('completed-section-wrapper');
    const completedCountSpan = document.getElementById('completed-count');
    completedCountSpan.textContent = completedTasks.length;
    
    if (completedTasks.length > 0) {
        completedWrapper.style.display = 'block';
    } else {
        completedWrapper.style.display = 'none';
    }

    // Handle Empty State
    const emptyState = document.getElementById('empty-state');
    if (filteredTasks.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
    }

    // 4. Update Dashboard statistics and rings
    updateStatistics();

    // 5. Update sidebar counts
    updateBadgeCounts();

    // 6. Refresh Lucide Icons
    lucide.createIcons();
}

function renderCategoriesList() {
    const list = document.getElementById('categories-list');
    list.innerHTML = '';

    state.categories.forEach(cat => {
        const li = document.createElement('li');
        li.className = `nav-item ${state.activeFilter === `category-${cat.id}` ? 'active' : ''}`;
        li.setAttribute('data-filter', `category-${cat.id}`);

        // Category Color Indicator dot
        const dot = document.createElement('span');
        dot.className = 'category-dot';
        dot.style.backgroundColor = cat.color;

        // Label
        const span = document.createElement('span');
        span.textContent = cat.name;

        // Count Badge
        const taskCount = state.tasks.filter(t => t.categoryId === cat.id && !t.completed).length;
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = taskCount;

        // Delete Category button
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-icon delete';
        btnDel.style.width = '20px';
        btnDel.style.height = '20px';
        btnDel.style.marginLeft = '6px';
        btnDel.innerHTML = '<i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>';
        btnDel.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid triggering filter navigation click
            deleteCategory(cat.id);
        });

        li.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            state.activeFilter = `category-${cat.id}`;
            render();
        });

        li.appendChild(dot);
        li.appendChild(span);
        li.appendChild(badge);
        li.appendChild(btnDel);
        list.appendChild(li);
    });
}

function getFilteredAndSortedTasks() {
    let result = [...state.tasks];

    // Filter 1: Sidebar active list filter
    const todayStr = new Date().toISOString().split('T')[0];
    if (state.activeFilter === 'today') {
        result = result.filter(t => t.dueDate === todayStr);
    } else if (state.activeFilter === 'overdue') {
        result = result.filter(t => t.dueDate && t.dueDate < todayStr && !t.completed);
    } else if (state.activeFilter.startsWith('category-')) {
        const catId = state.activeFilter.replace('category-', '');
        result = result.filter(t => t.categoryId === catId);
    }

    // Filter 2: Priority dropdown filter
    if (state.priorityFilter !== 'all') {
        result = result.filter(t => t.priority === state.priorityFilter);
    }

    // Filter 3: Search text query
    if (state.searchQuery) {
        result = result.filter(t => 
            t.title.toLowerCase().includes(state.searchQuery) || 
            (t.notes && t.notes.toLowerCase().includes(state.searchQuery))
        );
    }

    // Sorting
    result.sort((a, b) => {
        if (state.sortBy === 'date-desc') {
            return b.createdAt - a.createdAt;
        } else if (state.sortBy === 'date-asc') {
            return a.createdAt - b.createdAt;
        } else if (state.sortBy === 'alphabetical') {
            return a.title.localeCompare(b.title);
        } else if (state.sortBy === 'priority-desc') {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        }
        return 0;
    });

    return result;
}

function renderTasksList(tasks, container) {
    container.innerHTML = '';

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.completed ? 'completed' : ''}`;
        card.setAttribute('data-id', task.id);

        // Main info block
        const mainRow = document.createElement('div');
        mainRow.className = 'task-main-row';

        // Checkbox wrapper
        const checkLabel = document.createElement('label');
        checkLabel.className = 'checkbox-container';
        const checkInput = document.createElement('input');
        checkInput.type = 'checkbox';
        checkInput.checked = task.completed;
        checkInput.addEventListener('change', () => toggleTaskComplete(task.id));
        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';

        checkLabel.appendChild(checkInput);
        checkLabel.appendChild(checkmark);
        mainRow.appendChild(checkLabel);

        // Description / title details
        const details = document.createElement('div');
        details.className = 'task-details';

        const title = document.createElement('h3');
        title.className = 'task-title';
        title.textContent = task.title;
        details.appendChild(title);

        if (task.notes) {
            const desc = document.createElement('p');
            desc.className = 'task-description';
            desc.textContent = task.notes;
            details.appendChild(desc);
        }

        // Meta Badges list
        const meta = document.createElement('div');
        meta.className = 'task-meta';

        // 1. Category Badge
        const cat = state.categories.find(c => c.id === task.categoryId);
        if (cat) {
            const catBadge = document.createElement('span');
            catBadge.className = 'meta-badge badge-category';
            catBadge.innerHTML = `<span style="background-color: ${cat.color}; width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 4px;"></span> ${cat.name}`;
            meta.appendChild(catBadge);
        }

        // 2. Priority Badge
        const priorityBadge = document.createElement('span');
        priorityBadge.className = `meta-badge badge-priority-${task.priority}`;
        const pLabel = { high: 'Alta', medium: 'Média', low: 'Baixa' }[task.priority] || 'Média';
        priorityBadge.textContent = pLabel;
        meta.appendChild(priorityBadge);

        // 3. Due Date Badge
        if (task.dueDate) {
            const dateBadge = document.createElement('span');
            dateBadge.className = 'meta-badge badge-due-date';
            
            // Format date to local standard DD/MM
            const parts = task.dueDate.split('-');
            const formattedDate = `${parts[2]}/${parts[1]}`;
            dateBadge.innerHTML = `<i data-lucide="calendar" style="width: 12px; height: 12px; display: inline-block;"></i> ${formattedDate}`;
            
            // Alert highlights
            const todayStr = new Date().toISOString().split('T')[0];
            if (task.dueDate === todayStr) {
                dateBadge.classList.add('today');
                dateBadge.innerHTML = `<i data-lucide="clock" style="width: 12px; height: 12px; display: inline-block;"></i> Hoje`;
            } else if (task.dueDate < todayStr && !task.completed) {
                dateBadge.classList.add('overdue');
                dateBadge.innerHTML = `<i data-lucide="alert-triangle" style="width: 12px; height: 12px; display: inline-block;"></i> Atrasada`;
            }
            meta.appendChild(dateBadge);
        }

        details.appendChild(meta);
        mainRow.appendChild(details);

        // Action Buttons Row
        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-icon';
        btnEdit.innerHTML = '<i data-lucide="edit-3"></i>';
        btnEdit.addEventListener('click', () => openTaskModal(task.id));

        const btnDel = document.createElement('button');
        btnDel.className = 'btn-icon delete';
        btnDel.innerHTML = '<i data-lucide="trash-2"></i>';
        btnDel.addEventListener('click', () => deleteTask(task.id));

        actions.appendChild(btnEdit);
        actions.appendChild(btnDel);
        mainRow.appendChild(actions);

        card.appendChild(mainRow);

        // Subtasks render inside Task card (if subtasks exists)
        if (task.subtasks && task.subtasks.length > 0) {
            const subwrapper = document.createElement('div');
            subwrapper.className = 'task-subtasks-wrapper';

            // Calc progress ratios
            const completedCount = task.subtasks.filter(s => s.completed).length;
            const totalCount = task.subtasks.length;
            const subRatio = Math.round((completedCount / totalCount) * 100);

            // Mini progress bar
            const barContainer = document.createElement('div');
            barContainer.className = 'subtask-progress-bar-container';

            const barBg = document.createElement('div');
            barBg.className = 'subtask-bar-bg';
            const barFill = document.createElement('div');
            barFill.className = 'subtask-bar-fill';
            barFill.style.width = `${subRatio}%`;
            barBg.appendChild(barFill);

            const ratioText = document.createElement('span');
            ratioText.textContent = `${completedCount}/${totalCount}`;

            barContainer.appendChild(barBg);
            barContainer.appendChild(ratioText);
            subwrapper.appendChild(barContainer);

            // Subtasks checklists
            const sublist = document.createElement('ul');
            sublist.className = 'task-subtasks-list';

            task.subtasks.forEach(sub => {
                const subitem = document.createElement('li');
                subitem.className = `subtask-item ${sub.completed ? 'completed' : ''}`;

                const subcheck = document.createElement('input');
                subcheck.type = 'checkbox';
                subcheck.checked = sub.completed;
                subcheck.addEventListener('change', () => toggleSubtaskComplete(task.id, sub.id));

                const subtext = document.createElement('span');
                subtext.textContent = sub.title;

                subitem.appendChild(subcheck);
                subitem.appendChild(subtext);
                sublist.appendChild(subitem);
            });

            subwrapper.appendChild(sublist);
            card.appendChild(subwrapper);
        }

        container.appendChild(card);
    });
}

// ==========================================================================
// Dashboard Stats Panel calculations
// ==========================================================================

function updateStatistics() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const pending = total - completed;

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Update numbers
    document.getElementById('total-tasks-count').textContent = total;
    document.getElementById('pending-tasks-count').textContent = pending;
    document.getElementById('progress-percentage').textContent = `${percentage}%`;

    // Update SVG Circular progress
    const circle = document.querySelector('.progress-ring__circle');
    if (circle) {
        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius; // ~201
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }
}

function updateBadgeCounts() {
    const total = state.tasks.filter(t => !t.completed).length;
    document.getElementById('badge-all').textContent = total;

    // Today tasks count
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = state.tasks.filter(t => t.dueDate === todayStr && !t.completed).length;
    document.getElementById('badge-today').textContent = todayCount;

    // Overdue tasks count
    const overdueCount = state.tasks.filter(t => t.dueDate && t.dueDate < todayStr && !t.completed).length;
    document.getElementById('badge-overdue').textContent = overdueCount;

    // Set title according to view filter
    const titleHeader = document.getElementById('current-view-title');
    if (state.activeFilter === 'all') {
        titleHeader.textContent = 'Todas as Tarefas';
    } else if (state.activeFilter === 'today') {
        titleHeader.textContent = 'Tarefas para Hoje';
    } else if (state.activeFilter === 'overdue') {
        titleHeader.textContent = 'Tarefas Atrasadas';
    } else if (state.activeFilter.startsWith('category-')) {
        const catId = state.activeFilter.replace('category-', '');
        const cat = state.categories.find(c => c.id === catId);
        titleHeader.textContent = cat ? `Categoria: ${cat.name}` : 'Tarefas';
    }
}

// ==========================================================================
// Effects & Celebrations (Canvas Confetti API wrapper)
// ==========================================================================

function triggerConfetti() {
    try {
        confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
        });
    } catch (e) {
        console.warn('Canvas Confetti library is not loaded yet.');
    }
}
