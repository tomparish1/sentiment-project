const textInput = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const loadExampleBtn = document.getElementById('loadExampleBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsDiv = document.getElementById('results');
const errorDiv = document.getElementById('error');
const serverStatus = document.getElementById('serverStatus');

// File upload elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');

const sentimentValue = document.getElementById('sentimentValue');
const confidenceBar = document.getElementById('confidenceBar');
const confidenceValue = document.getElementById('confidenceValue');
const indicatorsList = document.getElementById('indicatorsList');
const explanationText = document.getElementById('explanationText');
const rawJson = document.getElementById('rawJson');
const errorMessage = document.getElementById('errorMessage');

// Emotion analysis elements
const toggleEmotions = document.getElementById('toggleEmotions');
const emotionOptions = document.getElementById('emotionOptions');
const emotionResults = document.getElementById('emotionResults');
const emotionBars = document.getElementById('emotionBars');

// Document metadata elements
const documentMetadata = document.getElementById('documentMetadata');
const docTitle = document.getElementById('docTitle');
const docSourceFile = document.getElementById('docSourceFile');
const docAuthorsSection = document.getElementById('docAuthorsSection');
const docAuthors = document.getElementById('docAuthors');
const docAnalysisDate = document.getElementById('docAnalysisDate');
const statWords = document.getElementById('statWords');
const statSentences = document.getElementById('statSentences');
const statParagraphs = document.getElementById('statParagraphs');
const statChars = document.getElementById('statChars');
const statReadTime = document.getElementById('statReadTime');
const formalityBar = document.getElementById('formalityBar');
const formalityValue = document.getElementById('formalityValue');
const dialogicBadge = document.getElementById('dialogicBadge');
const genreMarkersSection = document.getElementById('genreMarkersSection');
const genreMarkers = document.getElementById('genreMarkers');
const speakersSection = document.getElementById('speakersSection');
const speakersList = document.getElementById('speakersList');

const exampleTexts = [
    "I absolutely loved the new restaurant! The service was impeccable and the food was divine.",
    "This product is terrible. I wasted my money and I'm extremely disappointed.",
    "The weather today is cloudy. I went to the store and bought some groceries.",
    "I'm feeling really anxious about the presentation tomorrow, but also excited to share my ideas.",
    "The customer service representative was helpful and patient, which made my frustrating situation much more bearable."
];

let currentExampleIndex = 0;

// Check server status on load
checkServerStatus();
setInterval(checkServerStatus, 30000); // Check every 30 seconds

analyzeBtn.addEventListener('click', analyzeSentiment);
clearBtn.addEventListener('click', clearResults);
loadExampleBtn.addEventListener('click', loadExample);
toggleEmotions.addEventListener('click', () => {
    emotionOptions.classList.toggle('hidden');
    toggleEmotions.textContent = emotionOptions.classList.contains('hidden') ? 'Show All' : 'Hide';
});

// File upload event listeners
fileInput.addEventListener('change', handleFileSelect);
uploadBtn.addEventListener('click', analyzeFile);

textInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        analyzeSentiment();
    }
});

async function checkServerStatus() {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            updateServerStatus(true);
        } else {
            updateServerStatus(false);
        }
    } catch (error) {
        updateServerStatus(false);
    }
}

function updateServerStatus(isOnline) {
    if (isOnline) {
        serverStatus.innerHTML = `
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-semibold text-green-700">Server Online</span>
        `;
        serverStatus.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-300';
    } else {
        serverStatus.innerHTML = `
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            <span class="text-xs font-semibold text-red-700">Server Offline</span>
        `;
        serverStatus.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-300';
    }
}

function loadExample() {
    textInput.value = exampleTexts[currentExampleIndex];
    currentExampleIndex = (currentExampleIndex + 1) % exampleTexts.length;
    clearResults();
}

function clearResults() {
    textInput.value = '';
    fileInput.value = '';
    fileName.textContent = '';
    uploadBtn.classList.add('hidden');
    resultsDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    textInput.focus();
}

async function analyzeSentiment() {
    // If a file is selected, analyze the file instead
    if (fileInput.files && fileInput.files[0]) {
        return analyzeFile();
    }

    const text = textInput.value.trim();

    if (!text) {
        showError('Please enter some text to analyze.');
        return;
    }

    // Get selected emotions
    const selectedEmotions = Array.from(document.querySelectorAll('.emotion-checkbox:checked'))
        .map(checkbox => checkbox.value);

    hideError();
    hideResults();
    showLoading();
    disableButtons();

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                emotions: selectedEmotions.length > 0 ? selectedEmotions : null
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to analyze sentiment');
        }

        const result = await response.json();
        displayResults(result);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
        enableButtons();
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        uploadBtn.classList.remove('hidden');
    } else {
        fileName.textContent = '';
        uploadBtn.classList.add('hidden');
    }
}

async function analyzeFile() {
    const file = fileInput.files[0];
    if (!file) {
        showError('Please select a file first.');
        return;
    }

    // Get selected emotions
    const selectedEmotions = Array.from(document.querySelectorAll('.emotion-checkbox:checked'))
        .map(checkbox => checkbox.value);

    hideError();
    hideResults();
    showLoading();
    disableButtons();

    try {
        const formData = new FormData();
        formData.append('file', file);
        if (selectedEmotions.length > 0) {
            formData.append('emotions', selectedEmotions.join(','));
        }

        const response = await fetch('/api/analyze/file', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to analyze file');
        }

        const result = await response.json();
        displayResults(result);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
        enableButtons();
    }
}

function displayResults(result) {
    const sentiment = result.sentiment.toLowerCase();

    // Update sentiment badge with Tailwind classes
    sentimentValue.textContent = result.sentiment;
    if (sentiment === 'positive') {
        sentimentValue.className = 'inline-block px-4 py-2 rounded-lg font-bold text-sm uppercase bg-green-100 text-green-700 border border-green-300';
    } else if (sentiment === 'negative') {
        sentimentValue.className = 'inline-block px-4 py-2 rounded-lg font-bold text-sm uppercase bg-red-100 text-red-700 border border-red-300';
    } else {
        sentimentValue.className = 'inline-block px-4 py-2 rounded-lg font-bold text-sm uppercase bg-yellow-100 text-yellow-700 border border-yellow-300';
    }

    // Update confidence bar
    const confidencePercent = Math.round(result.confidence * 100);
    confidenceBar.style.width = `${confidencePercent}%`;
    confidenceValue.textContent = `${confidencePercent}%`;

    // Update indicators with Tailwind classes
    indicatorsList.innerHTML = '';
    result.indicators.forEach(indicator => {
        const li = document.createElement('li');
        li.textContent = indicator;
        li.className = 'px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium border border-blue-200';
        indicatorsList.appendChild(li);
    });

    explanationText.textContent = result.explanation;
    rawJson.textContent = JSON.stringify(result, null, 2);

    // Display emotion analysis if present
    if (result.emotions) {
        displayEmotions(result.emotions);
    } else {
        emotionResults.classList.add('hidden');
    }

    // Display document metadata if present
    if (result.document) {
        displayDocumentMetadata(result.document);
    } else {
        documentMetadata.classList.add('hidden');
    }

    showResults();
}

const emotionEmojis = {
    joy: '😊',
    anger: '😠',
    sadness: '😢',
    fear: '😨',
    surprise: '😲',
    disgust: '🤢',
    love: '❤️',
    trust: '🤝',
    anticipation: '🔮',
    confusion: '😕'
};

const emotionColors = {
    joy: { bg: 'bg-yellow-100', bar: 'bg-yellow-500', text: 'text-yellow-700' },
    anger: { bg: 'bg-red-100', bar: 'bg-red-500', text: 'text-red-700' },
    sadness: { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-700' },
    fear: { bg: 'bg-purple-100', bar: 'bg-purple-500', text: 'text-purple-700' },
    surprise: { bg: 'bg-orange-100', bar: 'bg-orange-500', text: 'text-orange-700' },
    disgust: { bg: 'bg-green-100', bar: 'bg-green-500', text: 'text-green-700' },
    love: { bg: 'bg-pink-100', bar: 'bg-pink-500', text: 'text-pink-700' },
    trust: { bg: 'bg-teal-100', bar: 'bg-teal-500', text: 'text-teal-700' },
    anticipation: { bg: 'bg-indigo-100', bar: 'bg-indigo-500', text: 'text-indigo-700' },
    confusion: { bg: 'bg-gray-100', bar: 'bg-gray-500', text: 'text-gray-700' }
};

function displayEmotions(emotions) {
    emotionBars.innerHTML = '';

    // Sort emotions by intensity
    const sortedEmotions = Object.entries(emotions).sort((a, b) => b[1] - a[1]);

    sortedEmotions.forEach(([emotion, intensity]) => {
        const percent = Math.round(intensity * 100);
        const colors = emotionColors[emotion] || emotionColors.confusion;
        const emoji = emotionEmojis[emotion] || '🎭';

        const emotionBar = document.createElement('div');
        emotionBar.className = 'space-y-1';
        emotionBar.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium ${colors.text}">
                    ${emoji} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                </span>
                <span class="text-sm font-bold ${colors.text}">${percent}%</span>
            </div>
            <div class="w-full ${colors.bg} rounded-full h-3 overflow-hidden">
                <div class="${colors.bar} h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
            </div>
        `;
        emotionBars.appendChild(emotionBar);
    });

    emotionResults.classList.remove('hidden');
}

function displayDocumentMetadata(doc) {
    // Header info
    docTitle.textContent = doc.header.title;
    docSourceFile.textContent = doc.header.sourceFile;
    docAnalysisDate.textContent = doc.header.analysisDate;

    // Authors/Speakers
    if (doc.header.authors && doc.header.authors.length > 0) {
        docAuthors.textContent = doc.header.authors.join(', ');
        docAuthorsSection.classList.remove('hidden');
    } else {
        docAuthorsSection.classList.add('hidden');
    }

    // Statistics
    statWords.textContent = doc.statistics.wordCount.toLocaleString();
    statSentences.textContent = doc.statistics.sentenceCount.toLocaleString();
    statParagraphs.textContent = doc.statistics.paragraphCount.toLocaleString();
    statChars.textContent = doc.statistics.characterCount.toLocaleString();
    statReadTime.textContent = doc.statistics.estimatedReadingTimeMinutes;

    // Characteristics
    const formalityPercent = Math.round(doc.characteristics.formalityScore * 100);
    formalityBar.style.width = `${formalityPercent}%`;
    formalityValue.textContent = formalityPercent >= 70 ? 'Formal' : formalityPercent >= 40 ? 'Neutral' : 'Informal';

    // Dialogic badge
    if (doc.characteristics.isDialogic) {
        dialogicBadge.classList.remove('hidden');
    } else {
        dialogicBadge.classList.add('hidden');
    }

    // Genre markers
    if (doc.characteristics.genreMarkers && doc.characteristics.genreMarkers.length > 0) {
        genreMarkers.innerHTML = '';
        doc.characteristics.genreMarkers.forEach(marker => {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded';
            badge.textContent = `${marker.genre} (${Math.round(marker.score * 100)}%)`;
            genreMarkers.appendChild(badge);
        });
        genreMarkersSection.classList.remove('hidden');
    } else {
        genreMarkersSection.classList.add('hidden');
    }

    // Speakers list
    if (doc.characteristics.speakers && doc.characteristics.speakers.length > 0) {
        speakersList.innerHTML = '';
        doc.characteristics.speakers.forEach(speaker => {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded';
            badge.textContent = speaker;
            speakersList.appendChild(badge);
        });
        speakersSection.classList.remove('hidden');
    } else {
        speakersSection.classList.add('hidden');
    }

    documentMetadata.classList.remove('hidden');
}

function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function showResults() {
    resultsDiv.classList.remove('hidden');
}

function hideResults() {
    resultsDiv.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    errorDiv.classList.add('hidden');
}

function disableButtons() {
    analyzeBtn.disabled = true;
    clearBtn.disabled = true;
    loadExampleBtn.disabled = true;
    uploadBtn.disabled = true;
    analyzeBtn.classList.add('opacity-50', 'cursor-not-allowed');
    clearBtn.classList.add('opacity-50', 'cursor-not-allowed');
    loadExampleBtn.classList.add('opacity-50', 'cursor-not-allowed');
    uploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

function enableButtons() {
    analyzeBtn.disabled = false;
    clearBtn.disabled = false;
    loadExampleBtn.disabled = false;
    uploadBtn.disabled = false;
    analyzeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    clearBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    loadExampleBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}
