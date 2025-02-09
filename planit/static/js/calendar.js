$(document).ready(function() {
    // Convert all DOM selectors to jQuery
    const $currentDateEl = $('#currentDate');
    const $noteEditor = $('#noteEditor');
    const $notesList = $('#notesList');
    const $prevDayBtn = $('#prevDay');
    const $nextDayBtn = $('#nextDay');
    const $exportBtn = $('#exportNotes');
    const $toolbarBtns = $('.toolbar-btn');
    const $colorBtn = $('#colorBtn');
    const $colorPicker = $('#textColor');
    const $viewSelect = $('#viewSelect');
    const $loadingOverlay = $('<div>').addClass('loading-overlay').hide();
    const $editorLoadingSpinner = $('<div>').addClass('editor-spinner').hide();
    
    // State management
    let currentDate = new Date();
    const today = new Date();
    setStartOfDay(today);
    setStartOfDay(currentDate);
    
    // Initialize notes
    let notes = {};
    initializeNotes();

    // Basic event handlers
    $noteEditor.on('keydown', async function(e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) return;
            e.preventDefault();
            await saveNote();
        }
    });

    $prevDayBtn.on('click', () => navigateWeek(-1));
    $nextDayBtn.on('click', () => navigateWeek(1));

    // Text formatting handlers
    $toolbarBtns.on('mousedown', function(e) {
        e.preventDefault();
        const command = $(this).data('command');
        
        $noteEditor.focus();
        const selection = window.getSelection();
        
        if (selection.rangeCount === 0 && !$(this).hasClass('color-btn')) {
            return;
        }
        
        if (command) {
            document.execCommand(command, false, null);
            if (commands.includes(command)) {
                const isActive = document.queryCommandState(command);
                $(this).toggleClass('active', isActive);
            }
        }
    });

    // Color picker handlers
    $colorBtn.on('click', function(e) {
        e.preventDefault();
        $colorPicker.trigger('click');
    });

    $colorPicker.on('change', function() {
        const color = $(this).val();
        $noteEditor.focus();
        
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            const range = document.createRange();
            range.setStart($noteEditor[0], 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        document.execCommand('foreColor', false, color);
        $colorBtn.css('color', color);
    });

    // Loading state management
    function showLoading() {
        $loadingOverlay.fadeIn();
    }

    function hideLoading() {
        $loadingOverlay.fadeOut();
    }

    function showEditorLoading() {
        $editorLoadingSpinner.fadeIn();
        $noteEditor.css('opacity', '0.5').prop('contenteditable', false);
    }

    function hideEditorLoading() {
        $editorLoadingSpinner.fadeOut();
        $noteEditor.css('opacity', '1').prop('contenteditable', true);
    }

    // Initialize loading elements
    $loadingOverlay.html(`
        <div class="spinner-border text-light" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `).appendTo('.calendar-container');

    $editorLoadingSpinner.html(`
        <div class="spinner-border spinner-border-sm text-light" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `).appendTo($noteEditor.parent());
    
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
    const initialView = $viewSelect.val() || 'daily'; // Default to daily if not set
    const navLink = $('.nav-link');
    
    // Set initial nav link text
    switch(initialView) {
        case 'daily':
            navLink.text('Today');
            break;
        case 'weekly':
            navLink.text('This Week');
            break;
        case 'monthly':
            navLink.text('This Month');
            break;
    }
    
    // Show correct initial view
    $('#dailyView').css('display', initialView === 'daily' ? 'block' : 'none');
    $('#weeklyView').css('display', initialView === 'weekly' ? 'block' : 'none');
    $('#monthlyView').css('display', initialView === 'monthly' ? 'block' : 'none');
    
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

    // Event handlers using jQuery
    $noteEditor.on('keydown', async function(e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                return; // Allow Shift+Enter for new line
            }
            e.preventDefault();
            await saveNote();
        }
    });

    $prevDayBtn.on('click', () => navigateWeek(-1));
    $nextDayBtn.on('click', () => navigateWeek(1));

    // Define commands array at the top with other variables
    const commands = ['bold', 'italic', 'underline'];

    // Text formatting handlers
    $toolbarBtns.on('mousedown', function(e) {
            e.preventDefault();
        const command = $(this).data('command');
            
            // Focus editor first
        $noteEditor.focus();
            
            // Get current selection
            const selection = window.getSelection();
            
            // If no text is selected and it's not a color command, return
        if (selection.rangeCount === 0 && !$(this).hasClass('color-btn')) {
                return;
            }
            
            // Execute command
            if (command) {
                document.execCommand(command, false, null);
                
                // Update button state
                if (commands.includes(command)) {
                    const isActive = document.queryCommandState(command);
                $(this).toggleClass('active', isActive);
                }
            }
    });

    // Color picker handler
    $colorBtn.on('click', function(e) {
        e.preventDefault();
        $colorPicker.click();
    });

    $colorPicker.on('change', function(e) {
        const color = this.value;
        
        // Focus editor
        $noteEditor.focus();
        
        // Get current selection
        const selection = window.getSelection();
        
        // If no text is selected, apply to cursor position
        if (selection.rangeCount === 0) {
            const range = document.createRange();
            range.setStart($noteEditor, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        // Execute color command
        document.execCommand('foreColor', false, color);
        $colorBtn.css('color', color);
    });

    // Update toolbar state when selection changes
    $noteEditor.on('keyup', updateToolbarState);
    $noteEditor.on('mouseup', updateToolbarState);
    $noteEditor.on('focus', updateToolbarState);

    function updateToolbarState(container) {
        const commands = ['bold', 'italic', 'underline'];
        const toolbar = container instanceof Element ? 
            container : 
            document.querySelector('.editor-toolbar');

        if (!toolbar) return;

        commands.forEach(command => {
            const btn = toolbar.querySelector(`[data-command="${command}"]`);
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
    $noteEditor.css('padding-top', '48px');  // Give space for toolbar

    $exportBtn.on('click', exportNotes);
    
    // Update navigation state when changing dates
    function updateNavigationState() {
        $nextDayBtn.prop('disabled', currentDate >= today);
    }

    // Add keyboard navigation
    $(document).on('keydown', (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.isContentEditable) {
            return;
        }
        
        if (e.key === 'ArrowLeft') {
            $prevDayBtn.click();
        } else if (e.key === 'ArrowRight' && !$nextDayBtn.prop('disabled')) {
            $nextDayBtn.click();
        }
    });

    // Update the Today link handler
    $('#todayLink').on('click', (e) => {
        e.preventDefault();
        const view = $viewSelect.val();
        
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
        const $noteItem = $(`.note-item[data-id="${taskId}"]`);
        const $toggleBtn = $noteItem.find('.toggle-btn');
        const $toggleIcon = $toggleBtn.find('i');
        const isCurrentlyCompleted = $noteItem.hasClass('completed');
        
        // Add loading state
        $toggleBtn.prop('disabled', true);
        $toggleIcon.removeClass('fa-circle fa-check-circle').addClass('fa-spinner fa-spin');
        
        try {
            const response = await fetch(`/users/api/task/${taskId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ completed: !isCurrentlyCompleted })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    // Update UI
                    $noteItem.toggleClass('completed', !isCurrentlyCompleted);
                    $toggleIcon
                        .removeClass('fa-spinner fa-spin')
                        .addClass(!isCurrentlyCompleted ? 'fa-check-circle' : 'fa-circle');
                    
                    // Update in notes object
                    if (notes[dateKey]) {
                        const noteIndex = notes[dateKey].findIndex(n => n.id === taskId);
                        if (noteIndex !== -1) {
                            notes[dateKey][noteIndex].completed = !isCurrentlyCompleted;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling note:', error);
            // Revert to original state on error
            $toggleIcon
                .removeClass('fa-spinner fa-spin')
                .addClass(isCurrentlyCompleted ? 'fa-check-circle' : 'fa-circle');
        } finally {
            // Re-enable button
            $toggleBtn.prop('disabled', false);
        }
    };

    window.deleteNote = async function(dateKey, taskId) {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const response = await fetch(`/users/api/task/${taskId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                }
            });
            
            if (response.ok) {
                // Update UI based on view type
                if ($viewSelect.val() === 'monthly') {
                    loadSidebarNotes(dateKey);
            renderMonthlyView();
                } else if ($viewSelect.val() === 'weekly') {
            renderWeeklyView();
        } else {
            loadNotes();
        }
            }
        } catch (error) {
            console.error('Error deleting note:', error);
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
        const weekContainer = $('.week-container');
        weekContainer.html('');
        
        const weekDates = getWeekDates(currentDate);
        
        weekDates.forEach(date => {
            const dateKey = getDateKey(date);
            const dayNotes = notes[dateKey] || [];
            
            const daySection = $('<div>').addClass('day-section');
            
            // Updated HTML structure to match daily view styling
            daySection.html(`
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
                    ${dayNotes.map(note => getNoteItemTemplate(note, dateKey)).join('')}
                            </div>
            `);
            
            weekContainer.append(daySection);

            // Add click handler for + button
            const addBtn = daySection.find('.add-note-btn');
            const noteInput = daySection.find('.note-input');
            const editor = daySection.find('.note-editor');
            const toolbarBtns = daySection.find('.toolbar-btn');
            const colorBtn = daySection.find('.color-btn');
            const colorPicker = daySection.find('.text-color');

            addBtn.on('click', () => {
                noteInput.css('display', noteInput.css('display') === 'none' ? 'block' : 'none');
                if (noteInput.css('display') === 'block') {
                    editor.focus();
                }
            });

            // Add event listeners for the editor
            initializeWeeklyEditor(editor, dateKey);

            // Add formatting functionality
            toolbarBtns.on('mousedown', function(e) {
                    e.preventDefault();
                const command = $(this).data('command');
                    if (command) {
                        editor.focus();
                        document.execCommand(command, false, null);
                        updateToolbarState(daySection);
                    }
            });

            // Color picker functionality
            colorBtn.on('click', function(e) {
                e.preventDefault();
                colorPicker.click();
            });

            colorPicker.on('change', function(e) {
                editor.focus();
                document.execCommand('foreColor', false, this.value);
                colorBtn.css('color', this.value);
            });

            // Update toolbar state when selection changes
            editor.on('keyup', () => updateToolbarState(daySection));
            editor.on('mouseup', () => updateToolbarState(daySection));
            editor.on('focus', () => updateToolbarState(daySection));
        });

        // Update formatting handlers for weekly view
        const weeklyEditors = $('.week-container .note-editor');
        weeklyEditors.each(function() {
            const toolbarBtns = $(this).parent().find('.toolbar-btn');
            const colorBtn = $(this).parent().find('.color-btn');
            const colorPicker = $(this).parent().find('.text-color');

            toolbarBtns.on('mousedown', function(e) {
                    e.preventDefault();
                const command = $(this).data('command');
                    
                    // Focus editor first
                $(this).focus();
                    
                    // Get current selection
                    const selection = window.getSelection();
                    
                    // If no text is selected and it's not a color command, return
                if (selection.rangeCount === 0 && !$(this).hasClass('color-btn')) {
                        return;
                    }
                    
                    // Execute command
                    if (command) {
                        document.execCommand(command, false, null);
                    }
            });

            if (colorBtn && colorPicker) {
                colorBtn.on('click', function(e) {
                    e.preventDefault();
                    colorPicker.click();
                });

                colorPicker.on('change', function(e) {
                    $(this).focus();
                    const selection = window.getSelection();
                    
                    // If no text is selected, apply to cursor position
                    if (selection.rangeCount === 0) {
                        const range = document.createRange();
                        range.setStart($(this), 0);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    
                    document.execCommand('foreColor', false, this.value);
                    colorBtn.css('color', this.value);
                });
            }
        });
    }

    // Update the initializeEditor function to be the single source of Enter key handling
    function initializeEditor(editor, dateKey) {
        const $editor = $(editor); // Ensure we have a jQuery object
        
        // Remove existing event listeners by cloning with jQuery
        const $newEditor = $editor.clone(false); // false means don't clone events
        $editor.replaceWith($newEditor);
        
        // Enter key handler
        $newEditor.on('keydown', async function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await saveNote($newEditor, dateKey);
            }
        });

        // Update toolbar state handlers
        $newEditor.on('keyup', () => updateToolbarState($newEditor.closest('.note-input')));
        $newEditor.on('mouseup', () => updateToolbarState($newEditor.closest('.note-input')));
        $newEditor.on('focus', () => updateToolbarState($newEditor.closest('.note-input')));

        return $newEditor;
    }

    // Update where we initialize editors to use the returned editor
    // In daily view initialization
    const dailyEditor = initializeEditor($noteEditor, null);

    // Update weekly view editor initialization
    function initializeWeeklyEditor(editor, dateKey) {
        return initializeEditor(editor, dateKey);
    }

    // Update sidebar editor initialization
    function initializeSidebarEditor(editor, dateKey) {
        return initializeEditor(editor, dateKey);
    }

    function renderMonthlyView() {
        const monthContainer = $('.days-grid');
        monthContainer.html('');
        
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
            
            const dayCell = $('<div>').addClass(`day-cell${isToday ? ' today' : ''}${isOtherMonth ? ' other-month' : ''}`);
            dayCell.data('date', dateKey);
            
            dayCell.html(`
                <div class="day-number">${date.getDate()}</div>
                <div class="note-count">${dayNotes.length} notes</div>
            `);
            
            dayCell.on('click', () => openSidebar(date));
            monthContainer.append(dayCell);
        }
        
        // Update month header
        const monthHeader = $('.month-header h2');
        monthHeader.text(currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
    }

    function openSidebar(date) {
        const sidebar = $('.day-sidebar');
        const selectedDateEl = $('#selectedDate');
                const dateKey = getDateKey(date);
        
        // Update selected date display
        selectedDateEl.text(date.toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
        }));
        
        // Load notes for selected date
        loadSidebarNotes(dateKey);
        
        // Show sidebar
        sidebar.addClass('open');
        
        // Update selected state
        $('.day-cell').removeClass('selected');
        $(`.day-cell[data-date="${dateKey}"]`).addClass('selected');
    }

    function loadSidebarNotes(dateKey) {
        const notesContainer = $('.day-sidebar .day-notes');
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

        // Add notes list using the same template
        const notesHtml = dayNotes.map(note => getNoteItemTemplate(note, dateKey)).join('');
        notesContainer.html(editorHtml + notesHtml);

        // Add event listeners for the new editor
        const editor = notesContainer.find('.note-editor');
        const toolbarBtns = notesContainer.find('.toolbar-btn');
        const colorBtn = notesContainer.find('.color-btn');
        const colorPicker = notesContainer.find('.text-color');

        // Handle Enter key to save note
        initializeSidebarEditor(editor, dateKey);

        // Add formatting functionality
        toolbarBtns.on('mousedown', function(e) {
            e.preventDefault();
            const command = $(this).data('command');
            if (command) {
                editor.focus();
                document.execCommand(command, false, null);
            }
        });

        // Color picker functionality
        colorBtn.on('click', function(e) {
            e.preventDefault();
            colorPicker.click();
        });

        colorPicker.on('change', function(e) {
            editor.focus();
            document.execCommand('foreColor', false, this.value);
            colorBtn.css('color', this.value);
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
    $('.close-sidebar').on('click', () => {
        $('.day-sidebar').removeClass('open');
        $('.day-cell').removeClass('selected');
    });

    // Update the date display function
    function updateDateDisplay() {
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        $currentDateEl.text(currentDate.toLocaleDateString(undefined, options));
    }

    // Update the note item template function to use jQuery event delegation instead of onclick
    function getNoteItemTemplate(note, dateKey) {
        // First encode the content for HTML display
        const displayContent = note.content;
        
        // Then escape the content for data attributes
        const escapedContent = note.content
            .replace(/&/g, '&amp;')
            .replace(/'/g, '\\\'')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/`/g, '&#96;')
            .replace(/\$/g, '&#36;')
            .replace(/\r?\n/g, '\\n');

        return `
            <div class="note-item ${note.completed ? 'completed' : ''}" data-id="${note.id}">
                <div class="note-content">${displayContent}</div>
                <div class="note-actions">
                    <button class="edit-btn" data-date="${dateKey}" data-id="${note.id}" data-content="${escapedContent}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="toggle-btn" data-date="${dateKey}" data-id="${note.id}">
                        <i class="fas ${note.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <button class="delete-btn" data-date="${dateKey}" data-id="${note.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Fix the event delegation for note actions - move outside document.ready
    $(document).on('click', '.edit-btn', function(e) {
        e.preventDefault();
        const $btn = $(this);
        const dateKey = $btn.data('date');
        const taskId = $btn.data('id');
        const content = $btn.data('content');
        editNote(dateKey, taskId, content);
    });

    $(document).on('click', '.toggle-btn', function(e) {
        e.preventDefault();
        const $btn = $(this);
        const dateKey = $btn.data('date');
        const taskId = $btn.data('id');
        toggleNote(dateKey, taskId);
    });

    $(document).on('click', '.delete-btn', function(e) {
        e.preventDefault();
        const $btn = $(this);
        const dateKey = $btn.data('date');
        const taskId = $btn.data('id');
        deleteNote(dateKey, taskId);
    });

    // Update the editNote function
    async function editNote(dateKey, taskId, content) {
        console.log('Edit Note Called:', { dateKey, taskId, content });
        
        let $editor;
        const viewType = $('#viewSelect').val();
        
        if (viewType === 'monthly') {
            $editor = $('.day-sidebar .note-editor');
        } else if (viewType === 'weekly') {
            $editor = $(`[data-date="${dateKey}"] .note-editor`);
        } else {
            $editor = $('#noteEditor');
        }
        
        if ($editor.length) {
            // Show editor if hidden
            const $noteInput = $editor.closest('.note-input');
            $noteInput.show();

            // Decode the escaped content back to HTML
            const decodedContent = content
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#96;/g, '`')
                .replace(/&#36;/g, '$')
                .replace(/\\n/g, '\n');

            $editor
                .html(decodedContent)
                .data('editingTaskId', taskId)
                .focus();
            
            // Scroll editor into view
            $editor[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Update view change handler to pass view type
    $viewSelect.on('change', async function() {
        const view = this.value;
        
        showLoading();
        
        try {
            // Hide all views first
            $('#dailyView').css('display', 'none');
            $('#weeklyView').css('display', 'none');
            $('#monthlyView').css('display', 'none');
            
            // Show selected view and load data if needed
            if (view === 'monthly') {
                $('#monthlyView').css('display', 'block');
                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                
                if (!hasDataForRange(monthStart, monthEnd, 'monthly')) {
                    await fetchTasks(getDateKey(monthStart), getDateKey(monthEnd), 'monthly');
                }
                renderMonthlyView();
            } else if (view === 'weekly') {
                $('#weeklyView').css('display', 'block');
                const weekStart = new Date(currentDate);
                weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                if (!hasDataForRange(weekStart, weekEnd, 'weekly')) {
                    await fetchTasks(getDateKey(weekStart), getDateKey(weekEnd), 'weekly');
                }
                renderWeeklyView();
            } else {
                $('#dailyView').css('display', 'block');
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
        const view = $viewSelect.val();
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

    async function updateTask(taskId, content) {
        console.log(content);
        try {
            const response = await fetch(`/users/api/task/${taskId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    return data.task;
                }
            }
            throw new Error('Failed to update task');
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

    async function saveNote(editorParam, dateKeyParam) {
        const $editor = $(editorParam || '#noteEditor');
        const content = $editor.html().trim();
                if (!content) return;

                showEditorLoading();
                try {
            const dateKey = dateKeyParam || getDateKey(currentDate);
            const taskId = $editor.data('editingTaskId');
            let task;
                    
            if (taskId) {
                // Update existing task
                task = await updateTask(taskId, content);
                    if (task) {
                    // Immediately update the note in the list
                    const $noteItem = $(`.note-item[data-id="${taskId}"]`);
                    if ($noteItem.length) {
                        $noteItem.find('.note-content').html(task.content);
                    }
                    // Also update in notes object
                    if (notes[dateKey]) {
                        const noteIndex = notes[dateKey].findIndex(n => n.id === taskId);
                        if (noteIndex !== -1) {
                            notes[dateKey][noteIndex] = task;
                        }
                    }
                }
            } else {
                // Create new task
                task = await createTask(content, dateKey);
                if (task) {
                    // Add to beginning of notes array
                    if (!notes[dateKey]) {
                        notes[dateKey] = [];
                    }
                    notes[dateKey].unshift(task);
                    // Prepend to list
                    const $notesList = viewType === 'monthly' ? 
                        $('.day-sidebar .day-notes') : 
                        viewType === 'weekly' ? 
                        $(`[data-date="${dateKey}"] .notes-list`) :
                        $('#notesList');
                    $notesList.prepend(getNoteItemTemplate(task, dateKey));
                }
            }

            if (task) {
                $editor.html('').data('editingTaskId', null);
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
        
        $notesList.html(dayNotes.map(note => getNoteItemTemplate(note, dateKey)).join(''));
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
}); 