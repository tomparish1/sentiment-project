// Writer's Portal JavaScript

// ========== Tab Navigation ==========
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // Update button styles
        tabButtons.forEach(b => {
            b.classList.remove('active', 'text-blue-600', 'border-b-2', 'border-blue-600');
            b.classList.add('text-slate-500');
        });
        btn.classList.add('active', 'text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.remove('text-slate-500');

        // Show/hide content
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');

        // Load tab-specific data
        if (tabId === 'skills') loadSkills();
        if (tabId === 'exemplars') loadExemplars();
    });
});

// ========== Server Status ==========
async function checkServerStatus() {
    try {
        const response = await fetch('/api/health');
        updateServerStatus(response.ok);
    } catch {
        updateServerStatus(false);
    }
}

function updateServerStatus(isOnline) {
    const status = document.getElementById('serverStatus');
    if (isOnline) {
        status.innerHTML = `
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-semibold text-green-700">Online</span>
        `;
        status.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-300';
    } else {
        status.innerHTML = `
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            <span class="text-xs font-semibold text-red-700">Offline</span>
        `;
        status.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-300';
    }
}

checkServerStatus();
setInterval(checkServerStatus, 30000);

// ========== Content Analysis ==========
const analysisText = document.getElementById('analysisText');
const analysisFile = document.getElementById('analysisFile');
const analysisFileName = document.getElementById('analysisFileName');
const agentType = document.getElementById('agentType');
const forceRhetoric = document.getElementById('forceRhetoric');
const includeQuotes = document.getElementById('includeQuotes');
const runAnalysisBtn = document.getElementById('runAnalysis');

analysisFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    analysisFileName.textContent = file ? file.name : '';
});

runAnalysisBtn.addEventListener('click', runAnalysis);

async function runAnalysis() {
    const text = analysisText.value.trim();
    const file = analysisFile.files[0];

    if (!text && !file) {
        showAnalysisError('Please enter text or select a file to analyze.');
        return;
    }

    hideAnalysisError();
    hideAnalysisResults();
    showWorkflowProgress();

    const agent = agentType.value;
    const endpoint = file
        ? `/api/agents/${agent}/execute/file`
        : `/api/agents/${agent}/execute`;

    try {
        let response;
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('forceRhetoric', forceRhetoric.checked.toString());
            formData.append('includeQuotes', includeQuotes.checked.toString());

            response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
        } else {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    forceRhetoric: forceRhetoric.checked,
                    includeQuotes: includeQuotes.checked
                })
            });
        }

        const result = await response.json();

        if (result.success) {
            displayWorkflowSteps(result.metadata);
            displayAnalysisResults(result.data, agent);
        } else {
            showAnalysisError(result.error?.message || 'Analysis failed');
        }
    } catch (error) {
        showAnalysisError(error.message);
    }
}

function showWorkflowProgress() {
    document.getElementById('workflowProgress').classList.remove('hidden');
    document.getElementById('workflowSteps').innerHTML = `
        <div class="flex items-center gap-2 text-slate-500">
            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Running analysis...</span>
        </div>
    `;
}

function displayWorkflowSteps(metadata) {
    const stepsDiv = document.getElementById('workflowSteps');
    stepsDiv.innerHTML = `
        <div class="flex items-center justify-between text-sm">
            <span class="text-slate-600">Execution ID: <span class="font-mono">${metadata.executionId}</span></span>
            <span class="text-slate-600">Time: ${metadata.executionTimeMs}ms</span>
        </div>
        <div class="flex items-center gap-2 text-green-600">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Completed ${metadata.stepsCompleted}/${metadata.totalSteps} steps</span>
        </div>
    `;
}

function displayAnalysisResults(data, agentType) {
    const resultsDiv = document.getElementById('analysisResults');
    resultsDiv.classList.remove('hidden');

    // Synthesis Summary
    if (data.synthesis) {
        document.getElementById('synthesisSummaryText').textContent = data.synthesis.summary;
        const findingsDiv = document.getElementById('keyFindings');
        if (data.synthesis.keyFindings && data.synthesis.keyFindings.length > 0) {
            findingsDiv.innerHTML = `
                <h4 class="font-semibold text-slate-700 mt-3 mb-2">Key Findings:</h4>
                <ul class="list-disc list-inside space-y-1 text-slate-600 text-sm">
                    ${data.synthesis.keyFindings.map(f => `<li>${f}</li>`).join('')}
                </ul>
            `;
        }
    }

    // Document Info
    if (data.document) {
        const statsDiv = document.getElementById('documentStats');
        const stats = data.document.statistics;
        statsDiv.innerHTML = `
            <div class="bg-white/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-amber-700">${stats.wordCount.toLocaleString()}</div>
                <div class="text-xs text-slate-500">Words</div>
            </div>
            <div class="bg-white/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-amber-700">${stats.sentenceCount}</div>
                <div class="text-xs text-slate-500">Sentences</div>
            </div>
            <div class="bg-white/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-amber-700">${stats.paragraphCount}</div>
                <div class="text-xs text-slate-500">Paragraphs</div>
            </div>
            <div class="bg-white/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-amber-700">${stats.estimatedReadingTimeMinutes}</div>
                <div class="text-xs text-slate-500">Min Read</div>
            </div>
        `;
    }

    // Rhetoric Results
    const rhetoricDiv = document.getElementById('rhetoricResults');
    const rhetoric = data.rhetoric || data.overall?.rhetoric;
    if (rhetoric && rhetoric.summary) {
        rhetoricDiv.classList.remove('hidden');
        document.getElementById('rhetoricNarrative').textContent = rhetoric.summary.narrative;

        // Move counts
        const movesDiv = document.getElementById('rhetoricMoves');
        if (rhetoric.summary.moveCounts) {
            const moves = Object.entries(rhetoric.summary.moveCounts).sort((a, b) => b[1] - a[1]);
            movesDiv.innerHTML = moves.map(([move, count]) => `
                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">${move}</span>
                    <div class="flex-1 bg-purple-100 rounded-full h-2">
                        <div class="bg-purple-500 h-2 rounded-full" style="width: ${(count / rhetoric.summary.classifiedSegments) * 100}%"></div>
                    </div>
                    <span class="text-sm text-slate-600">${count}</span>
                </div>
            `).join('');
        }

        // Classified segments
        const segmentsDiv = document.getElementById('classifiedSegments');
        if (rhetoric.segments && rhetoric.segments.length > 0) {
            segmentsDiv.innerHTML = `
                <h4 class="font-semibold text-slate-700 mt-4 mb-2">Detected Moves:</h4>
                ${rhetoric.segments.slice(0, 10).map(seg => `
                    <div class="p-3 bg-white/50 rounded-lg">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-bold rounded">${seg.moveType}</span>
                            <span class="text-xs text-slate-500">${Math.round(seg.confidence * 100)}% confidence</span>
                        </div>
                        <p class="text-sm text-slate-700">"${seg.text.slice(0, 150)}${seg.text.length > 150 ? '...' : ''}"</p>
                    </div>
                `).join('')}
            `;
        }
    } else {
        rhetoricDiv.classList.add('hidden');
    }

    // Speaker Results (for research-analyst)
    const speakerDiv = document.getElementById('speakerResults');
    if (data.speakers && data.speakers.length > 0) {
        speakerDiv.classList.remove('hidden');
        const speakerList = document.getElementById('speakerList');
        speakerList.innerHTML = data.speakers.map(speaker => `
            <div class="p-3 bg-white/50 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-semibold text-slate-700">${speaker.speaker}</span>
                    <span class="text-sm text-slate-500">${speaker.wordCount} words</span>
                </div>
                ${speaker.sentiment ? `
                    <div class="flex items-center gap-2 text-sm">
                        <span class="px-2 py-0.5 ${speaker.sentiment.sentiment === 'positive' ? 'bg-green-100 text-green-700' : speaker.sentiment.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'} rounded">${speaker.sentiment.sentiment}</span>
                        <span class="text-slate-500">(${Math.round(speaker.sentiment.confidence * 100)}%)</span>
                    </div>
                ` : ''}
                ${speaker.notableQuotes && speaker.notableQuotes.length > 0 ? `
                    <div class="mt-2 text-sm text-slate-600 italic">"${speaker.notableQuotes[0].slice(0, 100)}..."</div>
                ` : ''}
            </div>
        `).join('');

        if (data.comparison) {
            document.getElementById('speakerComparison').innerHTML = `
                <p class="text-slate-700">${data.comparison.dynamics}</p>
            `;
        }
    } else {
        speakerDiv.classList.add('hidden');
    }

    // Research Report
    const reportDiv = document.getElementById('researchReport');
    if (data.report) {
        reportDiv.classList.remove('hidden');
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = `
            <h4 class="font-bold text-lg">${data.report.title}</h4>
            <p class="text-slate-700 mt-2"><strong>Executive Summary:</strong> ${data.report.executiveSummary}</p>
            ${data.report.rhetoricalPatterns && data.report.rhetoricalPatterns.length > 0 ? `
                <div class="mt-4">
                    <strong>Rhetorical Patterns:</strong>
                    <ul class="list-disc list-inside mt-1">
                        ${data.report.rhetoricalPatterns.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            ${data.report.conclusions && data.report.conclusions.length > 0 ? `
                <div class="mt-4">
                    <strong>Conclusions:</strong>
                    <ul class="list-disc list-inside mt-1">
                        ${data.report.conclusions.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    } else {
        reportDiv.classList.add('hidden');
    }
}

function hideAnalysisResults() {
    document.getElementById('analysisResults').classList.add('hidden');
    document.getElementById('workflowProgress').classList.add('hidden');
}

function showAnalysisError(message) {
    document.getElementById('analysisError').classList.remove('hidden');
    document.getElementById('analysisErrorMessage').textContent = message;
}

function hideAnalysisError() {
    document.getElementById('analysisError').classList.add('hidden');
}

// ========== Skills Explorer ==========
let currentSkill = null;

async function loadSkills() {
    try {
        const response = await fetch('/api/skills');
        const data = await response.json();
        displaySkills(data.skills);
    } catch (error) {
        console.error('Failed to load skills:', error);
    }
}

function displaySkills(skills) {
    const listDiv = document.getElementById('skillsList');
    const categoryColors = {
        'document': 'bg-amber-100 border-amber-300 text-amber-800',
        'analysis': 'bg-blue-100 border-blue-300 text-blue-800',
        'embedding': 'bg-green-100 border-green-300 text-green-800',
        'storage': 'bg-purple-100 border-purple-300 text-purple-800',
        'text-processing': 'bg-pink-100 border-pink-300 text-pink-800'
    };

    listDiv.innerHTML = skills.map(skill => `
        <div class="skill-card p-4 border rounded-xl cursor-pointer hover:shadow-md transition-shadow ${categoryColors[skill.category] || 'bg-slate-100 border-slate-300'}"
             data-skill="${skill.name}">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-slate-800">${skill.name}</h3>
                <span class="text-xs font-medium px-2 py-0.5 rounded bg-white/50">${skill.category}</span>
            </div>
            <p class="text-sm text-slate-600">${skill.description}</p>
            <div class="text-xs text-slate-500 mt-2">v${skill.version}</div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.skill-card').forEach(card => {
        card.addEventListener('click', () => selectSkill(card.dataset.skill));
    });
}

async function selectSkill(skillName) {
    currentSkill = skillName;
    const invokeDiv = document.getElementById('skillInvoke');
    invokeDiv.classList.remove('hidden');
    document.getElementById('skillInvokeName').textContent = `Invoke: ${skillName}`;
    document.getElementById('skillResult').classList.add('hidden');

    // Simple form for common skills
    const formDiv = document.getElementById('skillInvokeForm');
    if (skillName === 'text-segmenter') {
        formDiv.innerHTML = `
            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Text</label>
                <textarea id="skillInput_text" rows="4" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea>
            </div>
            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Method</label>
                <select id="skillInput_method" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="sentence">Sentence</option>
                    <option value="paragraph">Paragraph</option>
                    <option value="speaker_turn">Speaker Turn</option>
                </select>
            </div>
        `;
    } else if (skillName === 'document-metadata') {
        formDiv.innerHTML = `
            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Text</label>
                <textarea id="skillInput_text" rows="4" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea>
            </div>
            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Filename</label>
                <input id="skillInput_filename" type="text" value="document.txt" class="w-full px-3 py-2 border border-slate-300 rounded-lg">
            </div>
        `;
    } else {
        formDiv.innerHTML = `
            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Input (JSON)</label>
                <textarea id="skillInput_json" rows="6" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm">{}</textarea>
            </div>
        `;
    }
}

document.getElementById('invokeSkillBtn').addEventListener('click', async () => {
    if (!currentSkill) return;

    let input = {};
    if (currentSkill === 'text-segmenter') {
        input = {
            text: document.getElementById('skillInput_text').value,
            method: document.getElementById('skillInput_method').value
        };
    } else if (currentSkill === 'document-metadata') {
        input = {
            text: document.getElementById('skillInput_text').value,
            filename: document.getElementById('skillInput_filename').value
        };
    } else {
        try {
            input = JSON.parse(document.getElementById('skillInput_json').value);
        } catch {
            alert('Invalid JSON input');
            return;
        }
    }

    try {
        const response = await fetch(`/api/skills/${currentSkill}/invoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });
        const result = await response.json();
        document.getElementById('skillResult').classList.remove('hidden');
        document.getElementById('skillResultJson').textContent = JSON.stringify(result, null, 2);
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

// ========== Exemplar Manager ==========
const EXEMPLAR_STORE_PATH = 'data/exemplars/starter.json';

async function loadExemplars() {
    try {
        const response = await fetch('/api/skills/exemplar-store/invoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'load',
                storePath: EXEMPLAR_STORE_PATH
            })
        });
        const result = await response.json();

        if (result.success) {
            displayExemplars(result.data.exemplars);
            loadExemplarStats();
        }
    } catch (error) {
        console.error('Failed to load exemplars:', error);
    }
}

async function loadExemplarStats() {
    try {
        const response = await fetch('/api/skills/exemplar-store/invoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'stats',
                storePath: EXEMPLAR_STORE_PATH
            })
        });
        const result = await response.json();

        if (result.success && result.data.stats) {
            displayExemplarStats(result.data.stats);
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function displayExemplarStats(stats) {
    const statsDiv = document.getElementById('exemplarStats');
    statsDiv.innerHTML = `
        <div class="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div class="text-2xl font-bold text-blue-700">${stats.totalExemplars}</div>
            <div class="text-xs text-slate-500">Total Exemplars</div>
        </div>
        <div class="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <div class="text-2xl font-bold text-purple-700">${Object.keys(stats.moveTypeCounts).length}</div>
            <div class="text-xs text-slate-500">Move Types</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div class="text-2xl font-bold text-green-700">${Object.keys(stats.categoryCounts).length}</div>
            <div class="text-xs text-slate-500">Categories</div>
        </div>
        <div class="bg-amber-50 rounded-lg p-4 text-center border border-amber-200">
            <div class="text-2xl font-bold text-amber-700">${stats.embeddedCount}</div>
            <div class="text-xs text-slate-500">With Embeddings</div>
        </div>
    `;
}

function displayExemplars(exemplars) {
    const listDiv = document.getElementById('exemplarList');
    listDiv.innerHTML = exemplars.map(ex => `
        <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">${ex.moveType}</span>
                    <span class="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded">${ex.moveCategory}</span>
                </div>
                <span class="text-xs text-slate-400 font-mono">${ex.id.slice(0, 8)}</span>
            </div>
            <p class="text-slate-700">"${ex.text}"</p>
            ${ex.notes ? `<p class="text-xs text-slate-500 mt-2 italic">${ex.notes}</p>` : ''}
        </div>
    `).join('');
}

document.getElementById('addExemplarBtn').addEventListener('click', () => {
    document.getElementById('addExemplarForm').classList.remove('hidden');
});

document.getElementById('cancelExemplarBtn').addEventListener('click', () => {
    document.getElementById('addExemplarForm').classList.add('hidden');
});

document.getElementById('saveExemplarBtn').addEventListener('click', async () => {
    const text = document.getElementById('newExemplarText').value.trim();
    const moveType = document.getElementById('newExemplarMoveType').value.trim();
    const category = document.getElementById('newExemplarCategory').value.trim();
    const notes = document.getElementById('newExemplarNotes').value.trim();

    if (!text || !moveType || !category) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const response = await fetch('/api/skills/exemplar-store/invoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'add',
                storePath: EXEMPLAR_STORE_PATH,
                exemplar: {
                    text,
                    moveType,
                    moveCategory: category,
                    notes: notes || undefined
                }
            })
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById('addExemplarForm').classList.add('hidden');
            document.getElementById('newExemplarText').value = '';
            document.getElementById('newExemplarMoveType').value = '';
            document.getElementById('newExemplarCategory').value = '';
            document.getElementById('newExemplarNotes').value = '';
            loadExemplars();
        } else {
            alert('Failed to add exemplar: ' + result.error?.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

// Initial load
loadSkills();
