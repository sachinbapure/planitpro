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
    
    // Load notes from localStorage with proper date handling
    function initializeNotes() {
        try {
            const savedNotes = localStorage.getItem('notes');
            if (savedNotes) {
                notes = JSON.parse(savedNotes);
            }
        } catch (e) {
            console.error('Error loading notes:', e);
            notes = {};
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
    noteEditor.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveNote();
        }
    });

    prevDayBtn.addEventListener('click', () => navigateWeek(-1));
    nextDayBtn.addEventListener('click', () => navigateWeek(1));

    // Define commands array at the top with other variables
    const commands = ['bold', 'italic', 'underline'];

    // Text formatting handlers
    toolbarBtns.forEach(btn => {
        $(btn).on('mousedown', function(e) {
            e.preventDefault();
            const command = $(this).data('command');
            
            // Save current selection
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            // Focus editor and restore selection
            noteEditor.focus();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Execute command
            document.execCommand(command, false, null);
            
            // Update button state
            if (commands.includes(command)) {
                const isActive = document.queryCommandState(command);
                $(this).toggleClass('active', isActive);
            }
        });
    });

    // Color picker handler
    $(colorBtn).on('click', function(e) {
        e.preventDefault();
        $(colorPicker).trigger('click');
    });

    $(colorPicker).on('change', function(e) {
        const color = $(this).val();
        
        // Save current selection
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // Focus editor and restore selection
        noteEditor.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Execute color command
        document.execCommand('foreColor', false, color);
        $(colorBtn).css('color', color);
    });

    // Update formatting buttons when text is selected
    $(noteEditor).on('mouseup keyup', function() {
        commands.forEach(command => {
            const isActive = document.queryCommandState(command);
            $(`.toolbar-btn[data-command="${command}"]`).toggleClass('active', isActive);
        });
    });

    // Keep selection when clicking buttons
    $('.editor-toolbar').on('mousedown', function(e) {
        e.preventDefault();
    });

    // Add focus handler for noteEditor
    noteEditor.addEventListener('focus', () => {
        updateFormatButtons();
    });

    // Add input handler for noteEditor
    noteEditor.addEventListener('input', () => {
        updateFormatButtons();
    });

    // Function to update format button states
    function updateFormatButtons() {
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
    
    // Functions
    function updateDateDisplay() {
        const options = { 
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        };
        const dateString = currentDate.toLocaleDateString('en-US', options);
        currentDateEl.textContent = dateString;
    }
    
    function saveNote() {
        const content = noteEditor.innerHTML.trim();
        if (!content) return;
        
        const dateKey = getDateKey(currentDate);
        if (!notes[dateKey]) {
            notes[dateKey] = [];
        }
        
        const newNote = {
            id: Date.now(),
            content: content,
            timestamp: Date.now(),
            completed: false,
            dateKey: dateKey // Store the actual dateKey with the note
        };
        
        notes[dateKey].push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        
        noteEditor.innerHTML = '';
        loadNotes();
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
    window.toggleNote = function(dateKey, noteId) {
        const noteIndex = notes[dateKey].findIndex(n => n.id === parseInt(noteId));
        if (noteIndex !== -1) {
            notes[dateKey][noteIndex].completed = !notes[dateKey][noteIndex].completed;
            localStorage.setItem('notes', JSON.stringify(notes));
            loadNotes();
        }
    };

    window.deleteNote = function(dateKey, noteId) {
        const noteIndex = notes[dateKey].findIndex(n => n.id === parseInt(noteId));
        if (noteIndex !== -1) {
            notes[dateKey].splice(noteIndex, 1);
            if (notes[dateKey].length === 0) {
                delete notes[dateKey];
            }
            localStorage.setItem('notes', JSON.stringify(notes));
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
            editor.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const content = this.innerHTML.trim();
                    if (!content) return;

                    if (!notes[dateKey]) {
                        notes[dateKey] = [];
                    }

                    const newNote = {
                        id: Date.now(),
                        content: content,
                        timestamp: Date.now(),
                        completed: false,
                        dateKey: dateKey
                    };

                    notes[dateKey].unshift(newNote);
                    localStorage.setItem('notes', JSON.stringify(notes));
                    
                    this.innerHTML = '';
                    noteInput.style.display = 'none';
                    renderWeeklyView();
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

    // Update view handling
    viewSelect.addEventListener('change', function() {
        const view = this.value;
        
        document.getElementById('dailyView').style.display = view === 'daily' ? 'block' : 'none';
        document.getElementById('weeklyView').style.display = view === 'weekly' ? 'block' : 'none';
        document.getElementById('monthlyView').style.display = view === 'monthly' ? 'block' : 'none';
        
        if (view === 'monthly') {
            renderMonthlyView();
        } else if (view === 'weekly') {
            renderWeeklyView();
        } else {
            updateDateDisplay();
            loadNotes();
        }
    });

    // Update navigation for both views
    function navigateWeek(direction) {
        console.log('Current date before:', currentDate.toDateString());
        console.log('Direction:', direction);
        
        const view = viewSelect.value;
        const newDate = new Date(currentDate); // Create a new date object
        
        if (view === 'weekly') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else {
            newDate.setDate(newDate.getDate() + direction);
        }
        
        console.log('New date after:', newDate.toDateString());
        
        // Only update if moving backward or if next date is not beyond today
        if (direction < 0 || newDate <= today) {
            currentDate = newDate;
            if (view === 'weekly') {
                renderWeeklyView();
            } else {
                updateDateDisplay();
                loadNotes();
            }
            updateNavigationState();
        }
        
        console.log('Final current date:', currentDate.toDateString());
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
        editor.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const content = this.innerHTML.trim();
                if (!content) return;

                if (!notes[dateKey]) {
                    notes[dateKey] = [];
                }

                const newNote = {
                    id: Date.now(),
                    content: content,
                    timestamp: Date.now(),
                    completed: false,
                    dateKey: dateKey
                };

                notes[dateKey].unshift(newNote);
                localStorage.setItem('notes', JSON.stringify(notes));
                
                this.innerHTML = '';
                loadSidebarNotes(dateKey);
                renderMonthlyView(); // Update the calendar view
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

    // Update the text formatting handlers
    function initializeTextEditor() {
        const editor = document.getElementById('noteEditor');
        const toolbarBtns = document.querySelectorAll('.toolbar-btn');
        const colorBtn = document.getElementById('colorBtn');
        const colorPicker = document.getElementById('textColor');

        // Set initial focus
        editor.focus();

        // Format buttons (Bold, Italic, Underline)
        toolbarBtns.forEach(btn => {
            if (btn.dataset.command) {
                btn.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Prevent losing focus
                    const command = btn.dataset.command;
                    
                    // Save selection
                    const selection = window.getSelection();
                    const range = selection.getRangeAt(0);
                    
                    // Execute command
                    document.execCommand(command, false, null);
                    
                    // Restore selection
                    editor.focus();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    // Update button state
                    updateToolbarState();
                });
            }
        });

        // Color picker
        colorBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            colorPicker.click();
            
            colorPicker.addEventListener('change', function() {
                // Restore selection
                editor.focus();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Apply color
                document.execCommand('foreColor', false, this.value);
                colorBtn.style.color = this.value;
                colorBtn.classList.add('active');
            }, { once: true }); // Remove listener after use
        });

        // Update toolbar state when selection changes
        ['keyup', 'mouseup', 'focus'].forEach(event => {
            editor.addEventListener(event, updateToolbarState);
        });

        function updateToolbarState() {
            toolbarBtns.forEach(btn => {
                const command = btn.dataset.command;
                if (command) {
                    const isActive = document.queryCommandState(command);
                    btn.classList.toggle('active', isActive);
                }
            });
        }
    }

    // Call this function when the document is ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeTextEditor();
        // ... rest of your existing code
    });
}); 