document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const currentDateEl = document.getElementById('currentDate');
    const noteEditor = document.getElementById('noteEditor');
    const notesList = document.getElementById('notesList');
    const prevDayBtn = document.getElementById('prevDay');
    const nextDayBtn = document.getElementById('nextDay');
    const exportBtn = document.getElementById('exportNotes');
    const toolbarBtns = document.querySelectorAll('.toolbar-btn');
    const colorBtn = document.getElementById('colorBtn');
    const colorPicker = document.getElementById('textColor');
    
    // State
    let currentDate = new Date();
    const today = new Date();
    setStartOfDay(today);
    setStartOfDay(currentDate);
    
    // Get date key in YYYY-MM-DD format with timezone handling
    function getDateKey(date) {
        // Get local date parts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Set time to start of day in local timezone
    function setStartOfDay(date) {
        date.setHours(0, 0, 0, 0);
        return date;
    }

    let notes = {};
    
    // Initialize notes from window.initialData
    function initializeNotes() {
        if (window.initialData) {
            // Initialize notes object
            notes = {};
            
            // Add today's tasks
            Object.assign(notes, window.initialData.today);
            
            // Add week tasks
            Object.assign(notes, window.initialData.week);
            
            // Add month tasks
            Object.assign(notes, window.initialData.month);
            
            // Set current date if provided
            if (window.initialData.currentDate) {
                currentDate = new Date(window.initialData.currentDate);
                setStartOfDay(currentDate);
            }
        }
    }
    
    // Force dark mode by default if no theme is set
    if (!localStorage.getItem('theme')) {
        localStorage.setItem('theme', 'dark');
        document.body.classList.remove('light-mode');
    }
    
    // Set initial view and text right after initialization
    const viewSelect = document.getElementById('viewSelect');
    const initialView = viewSelect.value || 'daily'; // Default to daily if not set
    const navLink = document.querySelector('.nav-link');
    
    // Set initial nav link text
    switch(initialView) {
        case 'daily':
            navLink.textContent = 'Today';
            break;
        case 'weekly':
            navLink.textContent = 'This Week';
            break;
        case 'monthly':
            navLink.textContent = 'This Month';
            break;
    }
    
    // Show correct initial view
    document.getElementById('dailyView').style.display = initialView === 'daily' ? 'block' : 'none';
    document.getElementById('weeklyView').style.display = initialView === 'weekly' ? 'block' : 'none';
    document.getElementById('monthlyView').style.display = initialView === 'monthly' ? 'block' : 'none';
    
    // Initialize
    initializeNotes();
    if (initialView === 'monthly') {
        renderMonthlyView();
    } else if (initialView === 'weekly') {
        renderWeeklyView();
    } else {
        updateDateDisplay();
        loadNotes();
    }
    updateNavigationState();

    // Event Listeners
    noteEditor.addEventListener('keydown', async function(e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Allow default behavior for Shift+Enter (new line)
                return;
            }
            // Prevent default Enter behavior
            e.preventDefault();
            await saveNote();
        }
    });

    prevDayBtn.addEventListener('click', () => navigateWeek(-1));
    nextDayBtn.addEventListener('click', () => navigateWeek(1));

    // Define commands array at the top with other variables
    const commands = ['bold', 'italic', 'underline'];

    // Text formatting handlers
    toolbarBtns.forEach(btn => {
        btn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            const command = this.dataset.command;
            
            // Focus editor first
            noteEditor.focus();
            
            // Get current selection
            const selection = window.getSelection();
            
            // If no text is selected and it's not a color command, return
            if (selection.rangeCount === 0 && !this.classList.contains('color-btn')) {
                return;
            }
            
            // Execute command
            if (command) {
                document.execCommand(command, false, null);
                
                // Update button state
                if (commands.includes(command)) {
                    const isActive = document.queryCommandState(command);
                    this.classList.toggle('active', isActive);
                }
            }
        });
    });

    // Color picker handler
    colorBtn.addEventListener('click', function(e) {
        e.preventDefault();
        colorPicker.click();
    });

    colorPicker.addEventListener('change', function(e) {
        const color = this.value;
        
        // Focus editor
        noteEditor.focus();
        
        // Get current selection
        const selection = window.getSelection();
        
        // If no text is selected, apply to cursor position
        if (selection.rangeCount === 0) {
            const range = document.createRange();
            range.setStart(noteEditor, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        // Execute color command
        document.execCommand('foreColor', false, color);
        colorBtn.style.color = color;
    });

    // Update toolbar state when selection changes
    noteEditor.addEventListener('keyup', updateToolbarState);
    noteEditor.addEventListener('mouseup', updateToolbarState);
    noteEditor.addEventListener('focus', updateToolbarState);

    function updateToolbarState() {
        const commands = ['bold', 'italic', 'underline'];
        commands.forEach(command => {
            const btn = document.querySelector(`[data-command="${command}"]`);
            if (btn) {
                const isActive = document.queryCommandState(command);
                btn.classList.toggle('active', isActive);
            }
        });
    }

    // Move toolbar inside noteEditor
    const editorToolbar = document.querySelector('.editor-toolbar');
    const noteInput = document.querySelector('.note-input');
    
    // Style updates for toolbar inside editor
    editorToolbar.style.position = 'sticky';
    editorToolbar.style.top = '0';
    editorToolbar.style.backgroundColor = 'var(--input-bg-dark)';
    editorToolbar.style.padding = '8px';
    editorToolbar.style.borderBottom = '1px solid var(--border-dark)';
    editorToolbar.style.borderTopLeftRadius = '8px';
    editorToolbar.style.borderTopRightRadius = '8px';
    
    // Update noteEditor padding
    noteEditor.style.paddingTop = '48px';  // Give space for toolbar

    exportBtn.addEventListener('click', exportNotes);
    
    // Add loading overlay elements
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.style.display = 'none';
    loadingOverlay.innerHTML = `
        <div class="spinner-border text-light" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    document.querySelector('.calendar-container').appendChild(loadingOverlay);

    // Add loading indicator for note editor
    const editorLoadingSpinner = document.createElement('div');
    editorLoadingSpinner.className = 'editor-spinner';
    editorLoadingSpinner.style.display = 'none';
    editorLoadingSpinner.innerHTML = `
        <div class="spinner-border spinner-border-sm text-light" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    noteEditor.parentElement.appendChild(editorLoadingSpinner);

    // Loading state management
    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    function showEditorLoading() {
        editorLoadingSpinner.style.display = 'flex';
        noteEditor.style.opacity = '0.5';
        noteEditor.setAttribute('contenteditable', 'false');
    }

    function hideEditorLoading() {
        editorLoadingSpinner.style.display = 'none';
        noteEditor.style.opacity = '1';
        noteEditor.setAttribute('contenteditable', 'true');
    }

    // Update CSRF token function
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    // Update API functions with loading states
    async function fetchTasks(startDate, endDate, viewType = 'daily') {
        showLoading();
        try {
            const response = await fetch(`/users/api/tasks/?start_date=${startDate}&end_date=${endDate}&view_type=${viewType}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                Object.assign(notes, data.tasks);
                return data.tasks;
            }
            throw new Error(data.message || 'Failed to fetch tasks');
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return {};
        } finally {
            hideLoading();
        }
    }

    async function createTask(content, dateKey) {
        showEditorLoading();
        try {
            const response = await fetch('/users/api/task/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ content, dateKey })
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                if (!notes[dateKey]) {
                    notes[dateKey] = [];
                }
                notes[dateKey].unshift(data.task);
                return data.task;
            }
            throw new Error(data.message || 'Failed to create task');
        } catch (error) {
            console.error('Error creating task:', error);
            return null;
        } finally {
            hideEditorLoading();
        }
    }

    async function updateTask(taskId, completed) {
        try {
            const response = await fetch(`/users/api/task/${taskId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ completed })
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                // Update local notes
                const dateKey = data.task.dateKey;
                const taskIndex = notes[dateKey].findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    notes[dateKey][taskIndex] = data.task;
                }
                return data.task;
            }
            throw new Error(data.message || 'Failed to update task');
        } catch (error) {
            console.error('Error updating task:', error);
            return null;
        }
    }

    async function deleteTask(taskId, dateKey) {
        try {
            const response = await fetch(`/users/api/task/${taskId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                }
            });
            
            if (response.ok) {
                // Update local notes
                notes[dateKey] = notes[dateKey].filter(t => t.id !== taskId);
                if (notes[dateKey].length === 0) {
                    delete notes[dateKey];
                }
                return true;
            }
            throw new Error('Failed to delete task');
        } catch (error) {
            console.error('Error deleting task:', error);
            return false;
        }
    }

    async function saveNote() {
        const content = noteEditor.innerHTML.trim();
        if (!content) return;
        
        showEditorLoading();
        try {
            const dateKey = getDateKey(currentDate);
            const task = await createTask(content, dateKey);
            
            if (task) {
                noteEditor.innerHTML = '';
                loadNotes();
            }
        } catch (error) {
            console.error('Error saving note:', error);
        } finally {
            hideEditorLoading();
        }
    }

    function loadNotes() {
        const dateKey = getDateKey(currentDate);
        const dayNotes = notes[dateKey] || [];
        
        // Sort notes by timestamp in descending order
        dayNotes.sort((a, b) => b.timestamp - a.timestamp);
        
        notesList.innerHTML = '';
        
        dayNotes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = `note-item ${note.completed ? 'completed' : ''}`;
            noteElement.dataset.id = note.id;
            
            noteElement.innerHTML = `
                <div class="note-content">${note.content}</div>
                <div class="note-actions">
                    <button class="toggle-btn" onclick="toggleNote('${dateKey}', ${note.id})">
                        <i class="far ${note.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteNote('${dateKey}', ${note.id})">
                        <i class="far fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            notesList.appendChild(noteElement);
        });
    }

    function exportNotes() {
        const allNotes = [];
        Object.entries(notes).forEach(([date, dayNotes]) => {
            dayNotes.forEach(note => {
                allNotes.push(`[${date} ${new Date(note.timestamp).toLocaleTimeString()}]\n${stripHtml(note.content)}\n\n`);
            });
        });

        const blob = new Blob([allNotes.join('---\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-notes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    // Update navigation state when changing dates
    function updateNavigationState() {
        nextDayBtn.disabled = currentDate >= today;
    }

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.isContentEditable) {
            return;
        }
        
        if (e.key === 'ArrowLeft') {
            prevDayBtn.click();
        } else if (e.key === 'ArrowRight' && !nextDayBtn.disabled) {
            nextDayBtn.click();
        }
    });

    // Update the Today link handler
    document.getElementById('todayLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        const view = viewSelect.value;
        
        currentDate = new Date();
        setStartOfDay(currentDate);
        
        if (view === 'monthly') {
            renderMonthlyView();
        } else if (view === 'weekly') {
            renderWeeklyView();
        } else {
            updateDateDisplay();
            loadNotes();
        }
        updateNavigationState();
    });

    // Update toggle and delete handlers
    window.toggleNote = async function(dateKey, taskId) {
        const noteIndex = notes[dateKey].findIndex(n => n.id === taskId);
        if (noteIndex !== -1) {
            const currentNote = notes[dateKey][noteIndex];
            const updatedTask = await updateTask(taskId, !currentNote.completed);
            if (updatedTask) {
                loadNotes();
            }
        }
    };

    window.deleteNote = async function(dateKey, taskId) {
        const success = await deleteTask(taskId, dateKey);
        if (success) {
            loadNotes();
        }
    };

    // Weekly view functions
    function getWeekDates(date) {
        const week = [];
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay()); // Start from Sunday
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            week.push(day);
        }
        return week;
    }

    function formatDayTitle(date) {
        const today = new Date();
        setStartOfDay(today);
        setStartOfDay(date);
        
        const options = { weekday: 'long', day: 'numeric', month: 'short' };
        let dateStr = date.toLocaleDateString(undefined, options);
        
        if (date.getTime() === today.getTime()) {
            dateStr += ' (Today)';
        }
        return dateStr;
    }

    function renderWeeklyView() {
        const weekContainer = document.querySelector('.week-container');
        weekContainer.innerHTML = '';
        
        const weekDates = getWeekDates(currentDate);
        
        weekDates.forEach(date => {
            const dateKey = getDateKey(date);
            const dayNotes = notes[dateKey] || [];
            
            const daySection = document.createElement('div');
            daySection.className = 'day-section';
            
            // Updated HTML structure to match daily view styling
            daySection.innerHTML = `
                <div class="day-header">
                    <div class="day-title">
                        ${formatDayTitle(date)}
                    </div>
                    <button class="add-note-btn" data-date="${dateKey}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="note-input" style="display: none;">
                    <div class="editor-toolbar">
                        <button class="toolbar-btn" data-command="bold" title="Bold">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button class="toolbar-btn" data-command="italic" title="Italic">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button class="toolbar-btn" data-command="underline" title="Underline">
                            <i class="fas fa-underline"></i>
                        </button>
                        <div class="color-picker">
                            <input type="color" class="text-color" id="textColor-${dateKey}">
                            <button class="toolbar-btn color-btn" title="Text Color">
                                <i class="fas fa-palette"></i>
                            </button>
                        </div>
                    </div>
                    <div class="note-editor" contenteditable="true" placeholder="Add new note..." data-date="${dateKey}"></div>
                </div>
                <div class="day-notes">
                    ${dayNotes.map(note => `
                        <div class="note-item ${note.completed ? 'completed' : ''}" data-id="${note.id}">
                            <div class="note-content">${note.content}</div>
                            <div class="note-actions">
                                <button class="toggle-btn" onclick="toggleNote('${dateKey}', ${note.id})">
                                    <i class="fas ${note.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                                </button>
                                <button class="delete-btn" onclick="deleteNote('${dateKey}', ${note.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            weekContainer.appendChild(daySection);

            // Add click handler for + button
            const addBtn = daySection.querySelector('.add-note-btn');
            const noteInput = daySection.querySelector('.note-input');
            const editor = daySection.querySelector('.note-editor');
            const toolbarBtns = daySection.querySelectorAll('.toolbar-btn');
            const colorBtn = daySection.querySelector('.color-btn');
            const colorPicker = daySection.querySelector('.text-color');

            addBtn.addEventListener('click', () => {
                noteInput.style.display = noteInput.style.display === 'none' ? 'block' : 'none';
                if (noteInput.style.display === 'block') {
                    editor.focus();
                }
            });

            // Add event listeners for the editor
            editor.addEventListener('keydown', async function(e) {
                if (e.key === 'Enter') {
                    if (e.shiftKey) {
                        return;
                    }
                    e.preventDefault();
                    const content = this.innerHTML.trim();
                    if (!content) return;

                    showEditorLoading();
                    try {
                        const dateKey = this.dataset.date;
                        const task = await createTask(content, dateKey);
                        
                        if (task) {
                            this.innerHTML = '';
                            noteInput.style.display = 'none';
                            renderWeeklyView();
                        }
                    } catch (error) {
                        console.error('Error saving note:', error);
                    } finally {
                        hideEditorLoading();
                    }
                }
            });

            // Add formatting functionality
            toolbarBtns.forEach(btn => {
                btn.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    const command = this.dataset.command;
                    if (command) {
                        editor.focus();
                        document.execCommand(command, false, null);
                        updateToolbarState(daySection);
                    }
                });
            });

            // Color picker functionality
            colorBtn.addEventListener('click', function(e) {
                e.preventDefault();
                colorPicker.click();
            });

            colorPicker.addEventListener('change', function(e) {
                editor.focus();
                document.execCommand('foreColor', false, this.value);
                colorBtn.style.color = this.value;
            });

            // Update toolbar state when selection changes
            editor.addEventListener('keyup', () => updateToolbarState(daySection));
            editor.addEventListener('mouseup', () => updateToolbarState(daySection));
            editor.addEventListener('focus', () => updateToolbarState(daySection));
        });

        // Update formatting handlers for weekly view
        const weeklyEditors = document.querySelectorAll('.week-container .note-editor');
        weeklyEditors.forEach(editor => {
            const toolbarBtns = editor.parentElement.querySelectorAll('.toolbar-btn');
            const colorBtn = editor.parentElement.querySelector('.color-btn');
            const colorPicker = editor.parentElement.querySelector('.text-color');

            toolbarBtns.forEach(btn => {
                btn.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    const command = this.dataset.command;
                    
                    // Focus editor first
                    editor.focus();
                    
                    // Get current selection
                    const selection = window.getSelection();
                    
                    // If no text is selected and it's not a color command, return
                    if (selection.rangeCount === 0 && !this.classList.contains('color-btn')) {
                        return;
                    }
                    
                    // Execute command
                    if (command) {
                        document.execCommand(command, false, null);
                    }
                });
            });

            if (colorBtn && colorPicker) {
                colorBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    colorPicker.click();
                });

                colorPicker.addEventListener('change', function(e) {
                    editor.focus();
                    const selection = window.getSelection();
                    
                    // If no text is selected, apply to cursor position
                    if (selection.rangeCount === 0) {
                        const range = document.createRange();
                        range.setStart(editor, 0);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    
                    document.execCommand('foreColor', false, this.value);
                    colorBtn.style.color = this.value;
                });
            }
        });
    }

    // Helper function to update toolbar state
    function updateToolbarState(container) {
        const commands = ['bold', 'italic', 'underline'];
        commands.forEach(command => {
            const btn = container.querySelector(`[data-command="${command}"]`);
            if (btn) {
                const isActive = document.queryCommandState(command);
                btn.classList.toggle('active', isActive);
            }
        });
    }

    // Update the hasDataForRange function
    function hasDataForRange(startDate, endDate, viewType) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // For weekly view, check if data exists in week object
        if (viewType === 'weekly' && window.initialData.week) {
            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dateKey = getDateKey(date);
                // Check both notes object and initial week data
                if (!(dateKey in notes) && !(dateKey in window.initialData.week)) {
                    return false;
                }
            }
            return true;
        }
        
        // For monthly view, check if data exists in month object
        if (viewType === 'monthly' && window.initialData.month) {
            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dateKey = getDateKey(date);
                // Check both notes object and initial month data
                if (!(dateKey in notes) && !(dateKey in window.initialData.month)) {
                    return false;
                }
            }
            return true;
        }
        
        // For daily view or fallback
        const dateKey = getDateKey(start);
        return (dateKey in notes) || (dateKey in window.initialData.today);
    }

    // Update view change handler to pass view type
    viewSelect.addEventListener('change', async function() {
        const view = this.value;
        
        showLoading();
        
        try {
            // Hide all views first
            document.getElementById('dailyView').style.display = 'none';
            document.getElementById('weeklyView').style.display = 'none';
            document.getElementById('monthlyView').style.display = 'none';
            
            // Show selected view and load data if needed
            if (view === 'monthly') {
                document.getElementById('monthlyView').style.display = 'block';
                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                
                if (!hasDataForRange(monthStart, monthEnd, 'monthly')) {
                    await fetchTasks(getDateKey(monthStart), getDateKey(monthEnd), 'monthly');
                }
                renderMonthlyView();
            } else if (view === 'weekly') {
                document.getElementById('weeklyView').style.display = 'block';
                const weekStart = new Date(currentDate);
                weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                if (!hasDataForRange(weekStart, weekEnd, 'weekly')) {
                    await fetchTasks(getDateKey(weekStart), getDateKey(weekEnd), 'weekly');
                }
                renderWeeklyView();
            } else {
                document.getElementById('dailyView').style.display = 'block';
                const dateKey = getDateKey(currentDate);
                
                if (!hasDataForRange(currentDate, currentDate, 'daily')) {
                    await fetchTasks(dateKey, dateKey, 'daily');
                }
                updateDateDisplay();
                loadNotes();
            }
        } catch (error) {
            console.error('Error switching view:', error);
        } finally {
            hideLoading();
        }
    });

    // Update navigation function to check for existing data
    async function navigateWeek(direction) {
        const view = viewSelect.value;
        const newDate = new Date(currentDate);
        
        if (view === 'weekly') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else if (view === 'monthly') {
            newDate.setMonth(newDate.getMonth() + direction);
        } else {
            newDate.setDate(newDate.getDate() + direction);
        }
        
        if (direction < 0 || newDate <= today) {
            currentDate = newDate;
            
            showLoading();
            try {
                if (view === 'weekly') {
                    const weekStart = new Date(currentDate);
                    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    
                    if (!hasDataForRange(weekStart, weekEnd, 'weekly')) {
                        await fetchTasks(getDateKey(weekStart), getDateKey(weekEnd), 'weekly');
                    }
                    renderWeeklyView();
                } else if (view === 'monthly') {
                    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                    
                    if (!hasDataForRange(monthStart, monthEnd, 'monthly')) {
                        await fetchTasks(getDateKey(monthStart), getDateKey(monthEnd), 'monthly');
                    }
                    renderMonthlyView();
                } else {
                    const dateKey = getDateKey(currentDate);
                    
                    if (!hasDataForRange(currentDate, currentDate, 'daily')) {
                        await fetchTasks(dateKey, dateKey, 'daily');
                    }
                    updateDateDisplay();
                    loadNotes();
                }
                updateNavigationState();
            } finally {
                hideLoading();
            }
        }
    }

    function renderMonthlyView() {
        const monthContainer = document.querySelector('.days-grid');
        monthContainer.innerHTML = '';
        
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Get the first day to display (might be from previous month)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Start from Monday
        
        // Create 6 weeks of days
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dateKey = getDateKey(date);
            const dayNotes = notes[dateKey] || [];
            
            const isToday = date.toDateString() === today.toDateString();
            const isOtherMonth = date.getMonth() !== currentDate.getMonth();
            
            const dayCell = document.createElement('div');
            dayCell.className = `day-cell${isToday ? ' today' : ''}${isOtherMonth ? ' other-month' : ''}`;
            dayCell.dataset.date = dateKey;
            
            dayCell.innerHTML = `
                <div class="day-number">${date.getDate()}</div>
                <div class="note-count">${dayNotes.length} notes</div>
            `;
            
            dayCell.addEventListener('click', () => openSidebar(date));
            monthContainer.appendChild(dayCell);
        }
        
        // Update month header
        const monthHeader = document.querySelector('.month-header h2');
        monthHeader.textContent = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }

    function openSidebar(date) {
        const sidebar = document.querySelector('.day-sidebar');
        const selectedDateEl = document.getElementById('selectedDate');
        const dateKey = getDateKey(date);
        
        // Update selected date display
        selectedDateEl.textContent = date.toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Load notes for selected date
        loadSidebarNotes(dateKey);
        
        // Show sidebar
        sidebar.classList.add('open');
        
        // Update selected state
        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.classList.remove('selected');
            if (cell.dataset.date === dateKey) {
                cell.classList.add('selected');
            }
        });
    }

    function loadSidebarNotes(dateKey) {
        const notesContainer = document.querySelector('.day-sidebar .day-notes');
        const dayNotes = notes[dateKey] || [];
        
        // Add note editor at the top
        const editorHtml = `
            <div class="note-input">
                <div class="editor-toolbar">
                    <button class="toolbar-btn" data-command="bold" title="Bold">
                        <i class="fas fa-bold"></i>
                    </button>
                    <button class="toolbar-btn" data-command="italic" title="Italic">
                        <i class="fas fa-italic"></i>
                    </button>
                    <button class="toolbar-btn" data-command="underline" title="Underline">
                        <i class="fas fa-underline"></i>
                    </button>
                    <div class="color-picker">
                        <input type="color" class="text-color">
                        <button class="toolbar-btn color-btn" title="Text Color">
                            <i class="fas fa-palette"></i>
                        </button>
                    </div>
                </div>
                <div class="note-editor" contenteditable="true" placeholder="Add new note..." data-date="${dateKey}"></div>
            </div>
        `;

        // Add notes list below editor
        const notesHtml = dayNotes.map(note => `
            <div class="note-item ${note.completed ? 'completed' : ''}" data-id="${note.id}">
                <div class="note-content">${note.content}</div>
                <div class="note-actions">
                    <button class="toggle-btn" onclick="toggleSidebarNote('${dateKey}', ${note.id})">
                        <i class="fas ${note.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteSidebarNote('${dateKey}', ${note.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        notesContainer.innerHTML = editorHtml + notesHtml;

        // Add event listeners for the new editor
        const editor = notesContainer.querySelector('.note-editor');
        const toolbarBtns = notesContainer.querySelectorAll('.toolbar-btn');
        const colorBtn = notesContainer.querySelector('.color-btn');
        const colorPicker = notesContainer.querySelector('.text-color');

        // Handle Enter key to save note
        editor.addEventListener('keydown', async function(e) {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    return;
                }
                e.preventDefault();
                const content = this.innerHTML.trim();
                if (!content) return;

                showEditorLoading();
                try {
                    const task = await createTask(content, dateKey);
                    
                    if (task) {
                        this.innerHTML = '';
                        loadSidebarNotes(dateKey);
                        renderMonthlyView();
                    }
                } catch (error) {
                    console.error('Error saving note:', error);
                } finally {
                    hideEditorLoading();
                }
            }
        });

        // Add formatting functionality
        toolbarBtns.forEach(btn => {
            btn.addEventListener('mousedown', function(e) {
                e.preventDefault();
                const command = this.dataset.command;
                if (command) {
                    editor.focus();
                    document.execCommand(command, false, null);
                }
            });
        });

        // Color picker functionality
        colorBtn.addEventListener('click', function(e) {
            e.preventDefault();
            colorPicker.click();
        });

        colorPicker.addEventListener('change', function(e) {
            editor.focus();
            document.execCommand('foreColor', false, this.value);
            colorBtn.style.color = this.value;
        });
    }

    // Add these functions for sidebar note actions
    window.toggleSidebarNote = function(dateKey, noteId) {
        const noteIndex = notes[dateKey].findIndex(n => n.id === noteId);
        if (noteIndex !== -1) {
            notes[dateKey][noteIndex].completed = !notes[dateKey][noteIndex].completed;
            localStorage.setItem('notes', JSON.stringify(notes));
            loadSidebarNotes(dateKey);
            renderMonthlyView(); // Update the calendar view
        }
    };

    window.deleteSidebarNote = function(dateKey, noteId) {
        notes[dateKey] = notes[dateKey].filter(n => n.id !== noteId);
        if (notes[dateKey].length === 0) {
            delete notes[dateKey];
        }
        localStorage.setItem('notes', JSON.stringify(notes));
        loadSidebarNotes(dateKey);
        renderMonthlyView(); // Update the calendar view
    };

    // Add close sidebar handler
    document.querySelector('.close-sidebar').addEventListener('click', () => {
        document.querySelector('.day-sidebar').classList.remove('open');
        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.classList.remove('selected');
        });
    });

    // Update the date display function
    function updateDateDisplay() {
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        currentDateEl.textContent = currentDate.toLocaleDateString(undefined, options);
    }
}); 