/**
 * Automated Wood Timber Surface Knot and Decay Defect Sorting System
 * Frontend Client Application
 *
 * Connects to FastAPI backend via fetch()
 * Visualizes predictions and probability distributions with Chart.js
 */

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

/**
 * Single configurable API Base URL.
 * Automatically adapts if loaded directly from FastAPI (port 8000) or
 * another local dev server (port 3000, 5500, file://, etc.).
 */
const API_BASE_URL = window.location.origin.includes(':8000')
  ? window.location.origin
  : 'http://127.0.0.1:8000';

// Defect metadata mapping for color accents & descriptions
const DEFECT_INFO = {
  sound_knot: {
    displayName: 'Sound Knot',
    color: '#2e7d32',
    hoverColor: '#1b5e20'
  },
  dead_knot: {
    displayName: 'Dead Knot',
    color: '#d97706',
    hoverColor: '#b45309'
  },
  crack: {
    displayName: 'Crack',
    color: '#dc2626',
    hoverColor: '#b91c1c'
  },
  pin_hole: {
    displayName: 'Pin Hole',
    color: '#0284c7',
    hoverColor: '#0369a1'
  },
  rot_decay: {
    displayName: 'Rot / Decay',
    color: '#7c2d12',
    hoverColor: '#581c87'
  }
};

// ============================================================================
// 2. APPLICATION STATE
// ============================================================================
const state = {
  isBackendConnected: false,
  selectedFile: null,
  isPredicting: false,
  chartInstance: null,
};

// ============================================================================
// 3. DOM ELEMENT REFERENCES
// ============================================================================
const elements = {
  // Status Bar
  backendStatusBadge: document.getElementById('backendStatusBadge'),
  statusPulse: document.getElementById('statusPulse'),
  statusText: document.getElementById('statusText'),
  btnRefreshStatus: document.getElementById('btnRefreshStatus'),
  offlineBanner: document.getElementById('offlineBanner'),
  btnBannerRetry: document.getElementById('btnBannerRetry'),
  apiBaseUrlDisplay: document.getElementById('apiBaseUrlDisplay'),
  specModel: document.getElementById('specModel'),
  specDevice: document.getElementById('specDevice'),

  // Upload & Dropzone
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  dropzoneEmpty: document.getElementById('dropzoneEmpty'),
  dropzonePreview: document.getElementById('dropzonePreview'),
  previewImage: document.getElementById('previewImage'),
  previewFilename: document.getElementById('previewFilename'),
  previewFilesize: document.getElementById('previewFilesize'),
  previewDimensions: document.getElementById('previewDimensions'),
  scanOverlay: document.getElementById('scanOverlay'),
  uploadActions: document.getElementById('uploadActions'),
  btnBrowse: document.getElementById('btnBrowse'),
  btnResetImage: document.getElementById('btnResetImage'),
  btnPredict: document.getElementById('btnPredict'),
  sampleCards: document.querySelectorAll('.sample-card'),

  // Results & States
  inferenceTimer: document.getElementById('inferenceTimer'),
  inferenceTimeValue: document.getElementById('inferenceTimeValue'),
  stateStandby: document.getElementById('stateStandby'),
  stateLoading: document.getElementById('stateLoading'),
  stateActive: document.getElementById('stateActive'),
  stateError: document.getElementById('stateError'),
  errorMessage: document.getElementById('errorMessage'),
  btnErrorRetry: document.getElementById('btnErrorRetry'),

  // Result Card Details
  resultHighlightCard: document.getElementById('resultHighlightCard'),
  resultDefectName: document.getElementById('resultDefectName'),
  resultConfidenceVal: document.getElementById('resultConfidenceVal'),
  confidenceMeterFill: document.getElementById('confidenceMeterFill'),
  confidenceLabelGrade: document.getElementById('confidenceLabelGrade'),
  resultSeverity: document.getElementById('resultSeverity'),
  resultRecommendation: document.getElementById('resultRecommendation'),
  resultDescription: document.getElementById('resultDescription'),
  btnTestAnother: document.getElementById('btnTestAnother'),
  chartCanvas: document.getElementById('defectProbabilityChart')
};

// ============================================================================
// 4. BACKEND HEALTH CHECK & CONNECTIVITY
// ============================================================================

/**
 * Checks backend health status at GET /health.
 * Updates UI status indicators and specs.
 */
async function checkBackendConnection() {
  updateStatusUI('checking', 'Connecting to API...');
  
  if (elements.apiBaseUrlDisplay) {
    elements.apiBaseUrlDisplay.textContent = API_BASE_URL;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      state.isBackendConnected = true;
      updateStatusUI('online', 'Backend Online');
      
      // Update hardware specs if available
      if (data.device && elements.specDevice) {
        elements.specDevice.textContent = `PyTorch (${data.device.toUpperCase()})`;
      }
      if (data.architecture && elements.specModel) {
        elements.specModel.textContent = data.architecture.replace('_', '-');
      }

      if (elements.offlineBanner) {
        elements.offlineBanner.style.display = 'none';
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    state.isBackendConnected = false;
    updateStatusUI('offline', 'Backend Offline');
    if (elements.offlineBanner) {
      elements.offlineBanner.style.display = 'flex';
    }
    console.warn('Backend connection failed:', error.message);
  }
}

/**
 * Update the status badge style and label.
 */
function updateStatusUI(status, text) {
  const badge = elements.backendStatusBadge;
  badge.classList.remove('online', 'offline', 'checking');
  badge.classList.add(status);
  elements.statusText.textContent = text;
}

// ============================================================================
// 5. IMAGE UPLOAD & PREVIEW HANDLING
// ============================================================================

/**
 * Format bytes to readable string (KB / MB).
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Handle a selected or dropped file.
 */
function handleFileSelection(file) {
  return new Promise((resolve) => {
    if (!file) return resolve();

    // Validate that it is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP).');
      return resolve();
    }

    state.selectedFile = file;

    // Read image for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      elements.previewImage.src = e.target.result;
      elements.previewFilename.textContent = file.name;
      elements.previewFilesize.textContent = formatBytes(file.size);

      // Get natural dimensions
      const img = new Image();
      img.onload = () => {
        elements.previewDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      };
      img.src = e.target.result;

      // Show preview and upload actions
      elements.dropzoneEmpty.style.display = 'none';
      elements.dropzonePreview.style.display = 'flex';
      elements.uploadActions.style.display = 'flex';

      // Reset results to standby only if an inference is not currently running
      if (!state.isPredicting) {
        showState('standby');
      }
      resolve();
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Reset upload zone back to empty.
 */
function resetImageUpload() {
  state.selectedFile = null;
  elements.fileInput.value = '';
  elements.previewImage.src = '';
  elements.dropzonePreview.style.display = 'none';
  elements.uploadActions.style.display = 'none';
  elements.dropzoneEmpty.style.display = 'flex';
  
  // Clear active sample highlights
  document.querySelectorAll('.sample-card').forEach(card => card.classList.remove('active'));

  showState('standby');
}

/**
 * Load one of the bundled quick-test samples.
 */
async function loadSampleImage(sampleFileName, cardElement) {
  // Highlight active card
  document.querySelectorAll('.sample-card').forEach(c => c.classList.remove('active'));
  if (cardElement) {
    cardElement.classList.add('active');
  }

  try {
    const samplePath = `samples/${sampleFileName}`;
    const response = await fetch(samplePath);
    if (!response.ok) {
      throw new Error(`Failed to load ${sampleFileName}`);
    }
    const blob = await response.blob();
    const file = new File([blob], sampleFileName, { type: blob.type || 'image/jpeg' });
    await handleFileSelection(file);
  } catch (err) {
    console.error('Error loading sample image:', err);
    alert('Could not load sample image: ' + err.message);
  }
}

// ============================================================================
// 6. PREDICTION & INFERENCE WORKFLOW
// ============================================================================

/**
 * Sends image to backend /predict endpoint.
 */
async function predictDefect() {
  if (!state.selectedFile) {
    alert('Please upload or select a timber surface image first.');
    return;
  }

  if (state.isPredicting) return;

  state.isPredicting = true;
  setPredictButtonLoading(true);
  showState('loading');

  // Activate laser scan visual animation
  if (elements.scanOverlay) {
    elements.scanOverlay.style.display = 'block';
  }

  try {
    const formData = new FormData();
    formData.append('file', state.selectedFile);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let errorDetail = `Server returned HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.detail) errorDetail = errJson.detail;
      } catch (e) {
        // use default errorDetail
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    renderPredictionResults(data);
    showState('active');

  } catch (error) {
    console.error('Prediction failed:', error);
    elements.errorMessage.textContent = error.message || 'Error occurred while contacting the classifier.';
    showState('error');
  } finally {
    state.isPredicting = false;
    setPredictButtonLoading(false);
    if (elements.scanOverlay) {
      elements.scanOverlay.style.display = 'none';
    }
  }
}

/**
 * Display prediction results in result card and chart.
 */
function renderPredictionResults(data) {
  const pred = data.prediction;

  // Display Defect Name and Color
  elements.resultDefectName.textContent = pred.display_name;
  
  // Set border accent color to defect specific tone
  const defectColor = pred.color || '#2e7d32';
  elements.resultHighlightCard.style.borderLeftColor = defectColor;

  // Confidence values
  const confidencePct = pred.confidence_percentage;
  elements.resultConfidenceVal.textContent = `${confidencePct.toFixed(1)}%`;
  elements.resultConfidenceVal.style.color = defectColor;
  elements.confidenceMeterFill.style.width = `${Math.min(100, Math.max(0, confidencePct))}%`;
  elements.confidenceMeterFill.style.background = `linear-gradient(90deg, #15803d, ${defectColor})`;

  // Confidence grade label
  if (confidencePct >= 80) {
    elements.confidenceLabelGrade.textContent = 'High Confidence';
    elements.confidenceLabelGrade.style.color = '#15803d';
  } else if (confidencePct >= 50) {
    elements.confidenceLabelGrade.textContent = 'Moderate Confidence';
    elements.confidenceLabelGrade.style.color = '#d97706';
  } else {
    elements.confidenceLabelGrade.textContent = 'Low Confidence (Uncertain)';
    elements.confidenceLabelGrade.style.color = '#dc2626';
  }

  // Defect Severity & Recommendations
  elements.resultSeverity.textContent = pred.severity;
  elements.resultRecommendation.textContent = pred.industrial_recommendation;
  elements.resultDescription.textContent = pred.description;

  // Inference duration
  if (data.inference_time_ms !== undefined) {
    elements.inferenceTimer.style.display = 'inline-flex';
    elements.inferenceTimeValue.textContent = `${data.inference_time_ms} ms (${data.device || 'CPU'})`;
  }

  // Render or Update Chart.js horizontal bar chart
  renderProbabilityChart(data.probabilities_breakdown, pred.class_key);
}

/**
 * Render or refresh the horizontal probability distribution chart.
 */
function renderProbabilityChart(breakdown, predictedKey) {
  if (!elements.chartCanvas) return;

  const labels = breakdown.map(item => item.display_name);
  const probabilities = breakdown.map(item => item.confidence_percentage);
  
  // Colors per defect class
  const backgroundColors = breakdown.map(item => {
    return item.key === predictedKey ? item.color : '#e2d9cc';
  });
  
  const borderColors = breakdown.map(item => {
    return item.color;
  });

  // Destroy previous chart instance if exists
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  const ctx = elements.chartCanvas.getContext('2d');
  state.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Confidence (%)',
        data: probabilities,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6,
        barThickness: 20
      }]
    },
    options: {
      indexAxis: 'y', // Horizontal bar chart
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.parsed.x.toFixed(2)}% Confidence`;
            }
          },
          backgroundColor: '#24160e',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
          padding: 10,
          cornerRadius: 6
        }
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: {
            callback: value => `${value}%`,
            font: { family: 'Plus Jakarta Sans', size: 11 },
            color: '#8c776b'
          },
          grid: {
            color: '#f0e8db'
          }
        },
        y: {
          ticks: {
            font: { family: 'Outfit', size: 12, weight: '600' },
            color: '#24160e'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

/**
 * Toggle UI states in results column (standby, loading, active, error).
 */
function showState(targetState) {
  elements.stateStandby.style.display = targetState === 'standby' ? 'flex' : 'none';
  elements.stateLoading.style.display = targetState === 'loading' ? 'flex' : 'none';
  elements.stateActive.style.display = targetState === 'active' ? 'flex' : 'none';
  elements.stateError.style.display = targetState === 'error' ? 'flex' : 'none';
}

/**
 * Toggle button loading state.
 */
function setPredictButtonLoading(isLoading) {
  elements.btnPredict.disabled = isLoading;
  const textSpan = elements.btnPredict.querySelector('span');
  if (textSpan) {
    textSpan.textContent = isLoading ? 'Classifying Defect...' : 'Predict Defect';
  }
}

// ============================================================================
// 7. EVENT LISTENERS & INITIALIZATION
// ============================================================================

function setupEventListeners() {
  // Backend Connection Refresh
  elements.btnRefreshStatus.addEventListener('click', checkBackendConnection);
  elements.backendStatusBadge.addEventListener('click', checkBackendConnection);
  if (elements.btnBannerRetry) {
    elements.btnBannerRetry.addEventListener('click', checkBackendConnection);
  }

  // Browse File Triggers
  elements.btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.fileInput.click();
  });

  elements.dropZone.addEventListener('click', (e) => {
    // Only trigger if clicking on dropzone directly when empty
    if (elements.dropzoneEmpty.style.display !== 'none') {
      elements.fileInput.click();
    }
  });

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  });

  // Drag and Drop Events
  ['dragenter', 'dragover'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropZone.classList.remove('dragover');
    });
  });

  elements.dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  // Reset / Remove Image
  elements.btnResetImage.addEventListener('click', resetImageUpload);
  elements.btnTestAnother.addEventListener('click', resetImageUpload);
  elements.btnErrorRetry.addEventListener('click', predictDefect);

  // Predict Defect Action
  elements.btnPredict.addEventListener('click', predictDefect);

  // Quick Test Sample Selector (Delegated for all 5 sample buttons)
  const sampleGrid = document.querySelector('.sample-grid');
  if (sampleGrid) {
    sampleGrid.addEventListener('click', async (e) => {
      const card = e.target.closest('.sample-card');
      if (!card) return;
      const sampleFile = card.getAttribute('data-sample');
      if (sampleFile) {
        await loadSampleImage(sampleFile, card);
        // Automatically run prediction on sample selection for instantaneous feedback
        predictDefect();
      }
    });
  }

  // Keyboard accessibility
  elements.dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      elements.fileInput.click();
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkBackendConnection();

  // Poll connection every 20 seconds to keep live indicator accurate
  setInterval(() => {
    checkBackendConnection();
  }, 20000);
});
