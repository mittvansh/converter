// DOM Elements
var dropZone = document.getElementById('dropZone');
var fullDropOverlay = document.getElementById('fullDropOverlay');
var selectFileBtn = document.getElementById('selectFileBtn');
var changeFileBtn = document.getElementById('changeFileBtn');
var fileInfo = document.getElementById('fileInfo');
var fileName = document.getElementById('fileName');
var fileSize = document.getElementById('fileSize');
var conversionSection = document.getElementById('conversionSection');
var outputFormat = document.getElementById('outputFormat');
var outputSection = document.getElementById('outputSection');
var outputPath = document.getElementById('outputPath');
var changeDirBtn = document.getElementById('changeDirBtn');
var convertSection = document.getElementById('convertSection');
var convertBtn = document.getElementById('convertBtn');
var progressSection = document.getElementById('progressSection');
var progressBar = document.getElementById('progressBar');
var progressText = document.getElementById('progressText');
var resultSection = document.getElementById('resultSection');
var successMessage = document.getElementById('successMessage');
var openFolderBtn = document.getElementById('openFolderBtn');
var resetBtn = document.getElementById('resetBtn');
var errorSection = document.getElementById('errorSection');
var errorMessage = document.getElementById('errorMessage');
var retryBtn = document.getElementById('retryBtn');

// Multi-file elements
var multiFileSection = document.getElementById('multiFileSection');
var multiFileCount = document.getElementById('multiFileCount');
var fileList = document.getElementById('fileList');
var addMoreFilesBtn = document.getElementById('addMoreFilesBtn');
var clearFilesBtn = document.getElementById('clearFilesBtn');

// Multi-format elements
var multiFormatSection = document.getElementById('multiFormatSection');
var imageFormatGroup = document.getElementById('imageFormatGroup');
var videoFormatGroup = document.getElementById('videoFormatGroup');
var audioFormatGroup = document.getElementById('audioFormatGroup');
var documentFormatGroup = document.getElementById('documentFormatGroup');
var imageOutputFormat = document.getElementById('imageOutputFormat');
var videoOutputFormat = document.getElementById('videoOutputFormat');
var audioOutputFormat = document.getElementById('audioOutputFormat');
var documentOutputFormat = document.getElementById('documentOutputFormat');

// State
var currentFiles = []; // Array of {path, name, size, type, extension}
var outputDirectory = null;
var lastConvertedPath = null;
var isMultiMode = false;

// Storage key for remembering output directory
var OUTPUT_DIR_KEY = 'converter_output_directory';

// Load saved output directory on startup
(function loadSavedDirectory() {
  var savedDir = localStorage.getItem(OUTPUT_DIR_KEY);
  if (savedDir) {
    outputDirectory = savedDir;
    outputPath.textContent = savedDir;
  }
})();

var supportedFormats = {
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'ico', 'avif'],
  document: ['pdf', 'docx', 'txt', 'rtf'],
  ebook: ['epub'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff'],
  video: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v', '3gp'],
  archive: ['zip', 'tar', '7z', 'rar']
};

function getFileType(extension) {
  var ext = extension.toLowerCase();
  var types = Object.keys(supportedFormats);
  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    if (supportedFormats[type].indexOf(ext) !== -1) {
      return type;
    }
  }
  return 'unknown';
}

function getAvailableFormats(fileType, currentExtension) {
  if (!fileType) return [];

  var options = [];
  var ext = currentExtension.toLowerCase();

  if (fileType === 'image') {
    options = supportedFormats.image.slice();
  } else if (fileType === 'video') {
    options = supportedFormats.video.concat(supportedFormats.audio);
  } else if (fileType === 'audio') {
    options = supportedFormats.audio.slice();
  } else if (fileType === 'ebook') {
    options = ['pdf', 'txt', 'docx'];
  } else if (fileType === 'document') {
    if (ext === 'pdf') {
      options = ['txt', 'docx'];
    } else if (ext === 'docx') {
      options = ['pdf', 'txt'];
    } else if (ext === 'txt') {
      options = ['pdf', 'docx'];
    } else if (ext === 'rtf') {
      options = ['txt', 'pdf'];
    } else {
      options = supportedFormats.document.slice();
    }
  } else if (fileType === 'archive') {
    options = ['extract'];
  } else {
    options = supportedFormats.video.concat(supportedFormats.audio).concat(supportedFormats.image);
  }

  // Filter out current extension and dedupe
  var unique = [];
  for (var i = 0; i < options.length; i++) {
    if (options[i] !== ext && unique.indexOf(options[i]) === -1) {
      unique.push(options[i]);
    }
  }
  return unique.sort();
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  var k = 1024;
  var sizes = ['Bytes', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Handle multiple files
function handleFiles(filePaths, forceReplace) {
  if (!filePaths || filePaths.length === 0) return;

  // Check if we're in a state where we should start fresh
  var shouldStartFresh = forceReplace ||
    resultSection.style.display !== 'none' ||
    errorSection.style.display !== 'none' ||
    progressSection.style.display !== 'none';

  if (shouldStartFresh) {
    // Reset UI for fresh start
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    progressSection.style.display = 'none';
    currentFiles = [];
    isMultiMode = false;
  }

  // Get existing file paths to avoid duplicates
  var existingPaths = currentFiles.map(function (f) { return f.path; });

  // Filter out paths we already have
  var newPaths = filePaths.filter(function (p) {
    return existingPaths.indexOf(p) === -1;
  });

  if (newPaths.length === 0) {
    // All files already added
    return;
  }

  var promises = newPaths.map(function (filePath) {
    return window.electron.getFileInfo(filePath).then(function (info) {
      var extension = info.name.split('.').pop().toLowerCase();
      var fileType = getFileType(extension);
      return {
        path: info.path,
        name: info.name,
        size: info.size,
        type: fileType,
        extension: extension
      };
    });
  });

  Promise.all(promises).then(function (newFiles) {
    // Filter out unsupported files
    var validNewFiles = newFiles.filter(function (f) { return f.type !== 'unknown'; });

    if (validNewFiles.length === 0 && currentFiles.length === 0) {
      showError('No supported files found');
      return;
    }

    // Add new files to existing files
    currentFiles = currentFiles.concat(validNewFiles);

    // Determine display mode based on total file count
    if (currentFiles.length === 0) {
      showError('No supported files found');
      return;
    } else if (currentFiles.length === 1) {
      // Single file mode
      showSingleFileUI(currentFiles[0]);
    } else {
      // Multi file mode
      isMultiMode = true;
      showMultiFileUI();
    }
  }).catch(function (error) {
    showError('Failed to load files: ' + error.message);
  });
}

// Show single file UI
function showSingleFileUI(file) {
  isMultiMode = false;

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);

  dropZone.style.display = 'none';
  fileInfo.style.display = 'flex';
  multiFileSection.style.display = 'none';
  multiFormatSection.style.display = 'none';

  var availableFormats = getAvailableFormats(file.type, file.extension);

  outputFormat.innerHTML = '';

  if (file.type !== 'archive') {
    var defaultOpt = document.createElement('option');
    defaultOpt.value = "";
    defaultOpt.textContent = "Select format...";
    outputFormat.appendChild(defaultOpt);
  }

  if (file.type === 'video') {
    var videoFormats = [];
    var audioFormats = [];

    for (var i = 0; i < availableFormats.length; i++) {
      var fmt = availableFormats[i];
      if (supportedFormats.video.indexOf(fmt) !== -1) {
        videoFormats.push(fmt);
      } else if (supportedFormats.audio.indexOf(fmt) !== -1) {
        audioFormats.push(fmt);
      }
    }

    if (videoFormats.length > 0) {
      var videoGroup = document.createElement('optgroup');
      videoGroup.label = 'Video Formats';
      for (var j = 0; j < videoFormats.length; j++) {
        var opt = document.createElement('option');
        opt.value = videoFormats[j];
        opt.textContent = videoFormats[j].toUpperCase();
        videoGroup.appendChild(opt);
      }
      outputFormat.appendChild(videoGroup);
    }

    if (audioFormats.length > 0) {
      var audioGroup = document.createElement('optgroup');
      audioGroup.label = 'Extract Audio';
      for (var k = 0; k < audioFormats.length; k++) {
        var opt2 = document.createElement('option');
        opt2.value = audioFormats[k];
        opt2.textContent = audioFormats[k].toUpperCase();
        audioGroup.appendChild(opt2);
      }
      outputFormat.appendChild(audioGroup);
    }
  } else if (file.type === 'archive') {
    var opt = document.createElement('option');
    opt.value = 'extract';
    opt.textContent = 'Extract Content';
    opt.selected = true;
    outputFormat.appendChild(opt);
  } else {
    for (var m = 0; m < availableFormats.length; m++) {
      var option = document.createElement('option');
      option.value = availableFormats[m];
      option.textContent = availableFormats[m].toUpperCase();
      outputFormat.appendChild(option);
    }
  }

  if (availableFormats.length > 0) {
    conversionSection.style.display = 'block';
    outputSection.style.display = 'block';
    convertSection.style.display = 'block';

    if (file.type === 'archive') {
      convertBtn.textContent = 'Extract Archive';
    } else {
      convertBtn.textContent = 'Convert File';
    }
  } else {
    showError('This file type is not supported for conversion');
  }
}



// Show multi-file UI
function showMultiFileUI() {
  dropZone.style.display = 'none';
  fileInfo.style.display = 'none';
  multiFileSection.style.display = 'block';
  conversionSection.style.display = 'none';

  // Update file count
  multiFileCount.textContent = currentFiles.length + ' file' + (currentFiles.length !== 1 ? 's' : '') + ' selected';

  // Render file list
  fileList.innerHTML = '';
  currentFiles.forEach(function (file, index) {
    var item = document.createElement('div');
    item.className = 'file-list-item';
    item.innerHTML =
      '<div class="file-list-info">' +
      '<span class="file-list-icon">' + getFileTypeIcon(file.type) + '</span>' +
      '<div class="file-list-text">' +
      '<span class="file-list-name">' + file.name + '</span>' +
      '<span class="file-list-meta">' + file.type.toUpperCase() + ' • ' + formatFileSize(file.size) + '</span>' +
      '</div>' +
      '</div>' +
      '<button class="file-list-remove" data-index="' + index + '">×</button>';
    fileList.appendChild(item);
  });

  // Add remove handlers
  fileList.querySelectorAll('.file-list-remove').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(this.getAttribute('data-index'));
      currentFiles.splice(idx, 1);
      if (currentFiles.length === 0) {
        resetUI();
      } else if (currentFiles.length === 1) {
        // Switch to single mode
        showSingleFileUI(currentFiles[0]);
      } else {
        showMultiFileUI();
      }
    });
  });

  // Analyze file types and show appropriate format selectors
  var types = {};
  currentFiles.forEach(function (f) {
    types[f.type] = true;
  });

  var typeCount = Object.keys(types).length;

  // Hide all format groups first
  imageFormatGroup.style.display = 'none';
  videoFormatGroup.style.display = 'none';
  audioFormatGroup.style.display = 'none';
  documentFormatGroup.style.display = 'none';

  if (typeCount === 1) {
    // All same type - use single format selector
    var singleType = Object.keys(types)[0];
    setupFormatSelector(outputFormat, singleType);
    conversionSection.style.display = 'block';
    multiFormatSection.style.display = 'none';
  } else {
    // Mixed types - show multiple format selectors
    conversionSection.style.display = 'none';
    multiFormatSection.style.display = 'block';

    if (types.image) {
      imageFormatGroup.style.display = 'block';
      setupFormatSelector(imageOutputFormat, 'image');
    }
    if (types.video) {
      videoFormatGroup.style.display = 'block';
      setupFormatSelector(videoOutputFormat, 'video');
    }
    if (types.audio) {
      audioFormatGroup.style.display = 'block';
      setupFormatSelector(audioOutputFormat, 'audio');
    }
    if (types.document || types.ebook) {
      documentFormatGroup.style.display = 'block';
      setupFormatSelector(documentOutputFormat, 'document');
    }
  }

  outputSection.style.display = 'block';
  convertSection.style.display = 'block';
  convertBtn.textContent = 'Convert ' + currentFiles.length + ' Files';
}

function setupFormatSelector(selectEl, fileType) {
  selectEl.innerHTML = '';

  var defaultOpt = document.createElement('option');
  defaultOpt.value = "";
  defaultOpt.textContent = "Select format...";
  selectEl.appendChild(defaultOpt);

  var formats;
  if (fileType === 'image') {
    formats = supportedFormats.image;
  } else if (fileType === 'video') {
    formats = supportedFormats.video.concat(supportedFormats.audio);
  } else if (fileType === 'audio') {
    formats = supportedFormats.audio;
  } else if (fileType === 'document' || fileType === 'ebook') {
    formats = ['pdf', 'txt', 'docx'];
  } else {
    formats = [];
  }

  if (fileType === 'video') {
    var videoFormats = [];
    var audioFormats = [];

    for (var i = 0; i < formats.length; i++) {
      var fmt = formats[i];
      if (supportedFormats.video.indexOf(fmt) !== -1) {
        videoFormats.push(fmt);
      } else if (supportedFormats.audio.indexOf(fmt) !== -1) {
        audioFormats.push(fmt);
      }
    }

    if (videoFormats.length > 0) {
      var videoGroup = document.createElement('optgroup');
      videoGroup.label = 'Video Formats';
      videoFormats.forEach(function (f) {
        var opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f.toUpperCase();
        videoGroup.appendChild(opt);
      });
      selectEl.appendChild(videoGroup);
    }

    if (audioFormats.length > 0) {
      var audioGroup = document.createElement('optgroup');
      audioGroup.label = 'Extract Audio';
      audioFormats.forEach(function (f) {
        var opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f.toUpperCase();
        audioGroup.appendChild(opt);
      });
      selectEl.appendChild(audioGroup);
    }
  } else {
    formats.forEach(function (f) {
      var opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f.toUpperCase();
      selectEl.appendChild(opt);
    });
  }
}

function getFileTypeIcon(type) {
  if (type === 'image') {
    return '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  } else if (type === 'video') {
    return '<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
  } else if (type === 'audio') {
    return '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  } else if (type === 'document' || type === 'ebook') {
    return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
  } else if (type === 'archive') {
    return '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}

function showProgress() {
  convertSection.style.display = 'none';
  progressSection.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = 'Processing... 0%';
}

function updateProgress(percent, currentFile, totalFiles) {
  progressBar.style.width = percent + '%';
  if (percent >= 100) {
    progressText.textContent = 'Finalizing...';
  } else if (totalFiles && totalFiles > 1) {
    progressText.textContent = 'Processing file ' + currentFile + ' of ' + totalFiles + '... ' + Math.round(percent) + '%';
  } else {
    progressText.textContent = 'Processing... ' + Math.round(percent) + '%';
  }
}

function showResult(message) {
  progressSection.style.display = 'none';
  resultSection.style.display = 'block';
  successMessage.textContent = message || 'Conversion complete!';
}

function showError(message) {
  convertSection.style.display = 'none';
  progressSection.style.display = 'none';
  errorSection.style.display = 'block';
  errorMessage.textContent = message;
  convertBtn.disabled = false;
}

function resetUI() {
  currentFiles = [];
  lastConvertedPath = null;
  isMultiMode = false;

  dropZone.style.display = 'block';
  fileInfo.style.display = 'none';
  multiFileSection.style.display = 'none';
  conversionSection.style.display = 'none';
  multiFormatSection.style.display = 'none';
  outputSection.style.display = 'none';
  convertSection.style.display = 'none';
  progressSection.style.display = 'none';
  resultSection.style.display = 'none';
  errorSection.style.display = 'none';
  convertBtn.textContent = 'Convert File';

  outputFormat.innerHTML = '<option value="">Select format...</option>';

  // Keep the saved output directory
  if (outputDirectory) {
    outputPath.textContent = outputDirectory;
  } else {
    outputPath.textContent = 'Same as source';
  }

  convertBtn.disabled = false;
}

function resetForNewConversion() {
  // Soft reset - keeps output directory, ready for new files
  currentFiles = [];
  lastConvertedPath = null;
  isMultiMode = false;

  dropZone.style.display = 'block';
  fileInfo.style.display = 'none';
  multiFileSection.style.display = 'none';
  conversionSection.style.display = 'none';
  multiFormatSection.style.display = 'none';
  outputSection.style.display = 'none';
  convertSection.style.display = 'none';
  progressSection.style.display = 'none';
  resultSection.style.display = 'none';
  errorSection.style.display = 'none';
  convertBtn.textContent = 'Convert File';
  convertBtn.disabled = false;
}

// Modal Logic
var passwordModal = document.getElementById('passwordModal');
var archivePasswordInput = document.getElementById('archivePassword');
var submitPasswordBtn = document.getElementById('submitPasswordBtn');
var cancelPasswordBtn = document.getElementById('cancelPasswordBtn');

function showPasswordModal() {
  passwordModal.style.display = 'flex';
  archivePasswordInput.value = '';
  archivePasswordInput.focus();
}

function hidePasswordModal() {
  passwordModal.style.display = 'none';
  archivePasswordInput.value = '';
}

submitPasswordBtn.addEventListener('click', function () {
  var password = archivePasswordInput.value;
  if (!password) return;

  hidePasswordModal();
  startConversion(password);
});

cancelPasswordBtn.addEventListener('click', function () {
  hidePasswordModal();
  convertBtn.disabled = false;
  progressSection.style.display = 'none';
  convertSection.style.display = 'block';
});

// Full-app drag and drop
var dragCounter = 0;

function hideDropOverlay() {
  dragCounter = 0;
  fullDropOverlay.classList.remove('active');
}

function showDropOverlay() {
  fullDropOverlay.classList.add('active');
}

document.body.addEventListener('dragenter', function (e) {
  e.preventDefault();
  e.stopPropagation();
  dragCounter++;
  if (dragCounter === 1) {
    showDropOverlay();
  }
});

document.body.addEventListener('dragleave', function (e) {
  e.preventDefault();
  e.stopPropagation();
  dragCounter--;
  if (dragCounter <= 0) {
    hideDropOverlay();
  }
});

document.body.addEventListener('dragover', function (e) {
  e.preventDefault();
  e.stopPropagation();
});

document.body.addEventListener('drop', function (e) {
  e.preventDefault();
  e.stopPropagation();
  hideDropOverlay();

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    var paths = [];
    for (var i = 0; i < e.dataTransfer.files.length; i++) {
      paths.push(window.electron.getFilePath(e.dataTransfer.files[i]));
    }
    handleFiles(paths);
  }
});

// Also handle events on the overlay itself
fullDropOverlay.addEventListener('dragenter', function (e) {
  e.preventDefault();
  e.stopPropagation();
});

fullDropOverlay.addEventListener('dragover', function (e) {
  e.preventDefault();
  e.stopPropagation();
});

fullDropOverlay.addEventListener('dragleave', function (e) {
  e.preventDefault();
  e.stopPropagation();
  // Don't decrement counter here - let body handle it
});

fullDropOverlay.addEventListener('drop', function (e) {
  e.preventDefault();
  e.stopPropagation();
  hideDropOverlay();

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    var paths = [];
    for (var i = 0; i < e.dataTransfer.files.length; i++) {
      paths.push(window.electron.getFilePath(e.dataTransfer.files[i]));
    }
    handleFiles(paths);
  }
});

// Drop zone click handlers
dropZone.addEventListener('click', function () {
  selectFileBtn.click();
});

selectFileBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  window.electron.selectFiles().then(function (result) {
    if (!result.canceled && result.filePaths.length > 0) {
      handleFiles(result.filePaths);
    }
  });
});

changeFileBtn.addEventListener('click', function () {
  window.electron.selectFiles().then(function (result) {
    if (!result.canceled && result.filePaths.length > 0) {
      handleFiles(result.filePaths);
    }
  });
});

addMoreFilesBtn.addEventListener('click', function () {
  window.electron.selectFiles().then(function (result) {
    if (!result.canceled && result.filePaths.length > 0) {
      // Add new files to existing list
      var newPaths = result.filePaths;
      var existingPaths = currentFiles.map(function (f) { return f.path; });

      var uniqueNewPaths = newPaths.filter(function (p) {
        return existingPaths.indexOf(p) === -1;
      });

      if (uniqueNewPaths.length > 0) {
        var allPaths = existingPaths.concat(uniqueNewPaths);
        handleFiles(allPaths);
      }
    }
  });
});

clearFilesBtn.addEventListener('click', function () {
  resetUI();
});

changeDirBtn.addEventListener('click', function () {
  window.electron.selectOutputDirectory().then(function (result) {
    if (!result.canceled && result.filePaths.length > 0) {
      outputDirectory = result.filePaths[0];
      outputPath.textContent = outputDirectory;
      // Save to localStorage
      localStorage.setItem(OUTPUT_DIR_KEY, outputDirectory);
    }
  });
});

// Legacy drop zone events (for visual feedback when hovering over the component)
dropZone.addEventListener('dragover', function (e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', function (e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', function (e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
  // Let body handler process the drop
});

function startConversion(password) {
  // Determine formats for each file type
  var formatMapping = {};

  if (multiFormatSection.style.display !== 'none') {
    // Multi-format mode
    if (imageFormatGroup.style.display !== 'none') {
      formatMapping.image = imageOutputFormat.value;
    }
    if (videoFormatGroup.style.display !== 'none') {
      formatMapping.video = videoOutputFormat.value;
    }
    if (audioFormatGroup.style.display !== 'none') {
      formatMapping.audio = audioOutputFormat.value;
    }
    if (documentFormatGroup.style.display !== 'none') {
      formatMapping.document = documentOutputFormat.value;
      formatMapping.ebook = documentOutputFormat.value;
    }
  } else {
    // Single format mode
    var singleFormat = outputFormat.value;
    formatMapping.image = singleFormat;
    formatMapping.video = singleFormat;
    formatMapping.audio = singleFormat;
    formatMapping.document = singleFormat;
    formatMapping.ebook = singleFormat;
    formatMapping.archive = singleFormat;
  }

  // Validate that all required formats are selected
  var missingFormats = [];
  var types = {};
  currentFiles.forEach(function (f) { types[f.type] = true; });

  for (var type in types) {
    if (type !== 'archive' && (!formatMapping[type] || formatMapping[type] === '')) {
      missingFormats.push(type);
    }
  }

  if (missingFormats.length > 0) {
    showError('Please select a target format for: ' + missingFormats.join(', '));
    return;
  }

  if (currentFiles.length === 0) {
    showError('No files selected');
    return;
  }

  convertBtn.disabled = true;
  showProgress();

  // Convert files sequentially
  var totalFiles = currentFiles.length;
  var completedFiles = 0;
  var successCount = 0;
  var failedFiles = [];

  function convertNext(index) {
    if (index >= currentFiles.length) {
      // All done
      updateProgress(100);
      setTimeout(function () {
        if (failedFiles.length === 0) {
          showResult('Successfully converted ' + successCount + ' file' + (successCount !== 1 ? 's' : ''));
        } else {
          showResult('Converted ' + successCount + ' file(s). Failed: ' + failedFiles.join(', '));
        }
      }, 500);
      return;
    }

    var file = currentFiles[index];
    var targetFormat = formatMapping[file.type] || 'extract';

    // Skip if same format
    if (file.extension === targetFormat) {
      completedFiles++;
      convertNext(index + 1);
      return;
    }

    var baseProgress = (index / totalFiles) * 100;
    var fileProgressWeight = 100 / totalFiles;

    // Simulated progress for this file
    var fileProgress = 0;
    var progressInterval = setInterval(function () {
      if (fileProgress < 50) {
        fileProgress += 4;
      } else if (fileProgress < 80) {
        fileProgress += 2;
      } else if (fileProgress < 95) {
        fileProgress += 0.5;
      }
      var totalProgress = baseProgress + (fileProgress / 100) * fileProgressWeight;
      updateProgress(Math.min(totalProgress, 95), index + 1, totalFiles);
    }, 100);

    window.electron.convertFile(file.path, targetFormat, outputDirectory, password)
      .then(function (resultPath) {
        clearInterval(progressInterval);
        lastConvertedPath = resultPath;
        successCount++;
        completedFiles++;
        convertNext(index + 1);
      })
      .catch(function (error) {
        clearInterval(progressInterval);
        if (error.message.includes('PASSWORD_REQUIRED')) {
          showPasswordModal();
        } else {
          failedFiles.push(file.name);
          completedFiles++;
          convertNext(index + 1);
        }
      });
  }

  convertNext(0);
}

convertBtn.addEventListener('click', function () {
  startConversion(null);
});

openFolderBtn.addEventListener('click', function () {
  if (lastConvertedPath) {
    window.electron.openPath(lastConvertedPath);
  } else if (outputDirectory) {
    window.electron.openPath(outputDirectory);
  } else if (currentFiles.length > 0) {
    window.electron.openPath(currentFiles[0].path);
  }
});

resetBtn.addEventListener('click', resetForNewConversion);
retryBtn.addEventListener('click', resetUI);