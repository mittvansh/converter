var dropZone = document.getElementById('dropZone');
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

var currentFilePath = null;
var currentFileName = null;
var currentFileSize = 0;
var outputDirectory = null;
var lastConvertedPath = null;

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
    // EPUB can convert to pdf, txt, docx
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
    // For archives, the "format" is essentially "Extract"
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

function handleFile(filePath) {
  errorSection.style.display = 'none';

  window.electron.getFileInfo(filePath).then(function (info) {
    currentFilePath = info.path;
    currentFileName = info.name;
    currentFileSize = info.size;

    fileName.textContent = info.name;
    fileSize.textContent = formatFileSize(info.size);

    dropZone.style.display = 'none';
    fileInfo.style.display = 'flex';

    var extension = info.name.split('.').pop().toLowerCase();
    var fileType = getFileType(extension);

    var availableFormats = getAvailableFormats(fileType, extension);

    outputFormat.innerHTML = ''; // Clear previous options

    // Default select text
    if (fileType !== 'archive') {
      var defaultOpt = document.createElement('option');
      defaultOpt.value = "";
      defaultOpt.textContent = "Select format...";
      outputFormat.appendChild(defaultOpt);
    }

    if (fileType === 'video') {
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
    } else if (fileType === 'archive') {
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

      if (fileType === 'archive') {
        convertBtn.textContent = 'Extract Archive';
      } else {
        convertBtn.textContent = 'Convert File';
      }
    } else {
      showError('This file type is not supported for conversion');
    }
  }).catch(function (error) {
    showError('Failed to load file: ' + error.message);
  });
}

function showProgress() {
  convertSection.style.display = 'none';
  progressSection.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = 'Processing... 0%';
}

function updateProgress(percent) {
  progressBar.style.width = percent + '%';
  if (percent >= 100) {
    progressText.textContent = 'Finalizing...';
  } else {
    progressText.textContent = 'Processing... ' + Math.round(percent) + '%';
  }
}

function showResult(outputFilePath) {
  lastConvertedPath = outputFilePath;
  progressSection.style.display = 'none';
  resultSection.style.display = 'block';

  var parts = outputFilePath.split(/[/\\]/);
  var fName = parts[parts.length - 1];
  successMessage.textContent = 'Successfully saved to ' + fName;
}

function showError(message) {
  convertSection.style.display = 'none';
  progressSection.style.display = 'none';
  errorSection.style.display = 'block';
  errorMessage.textContent = message;
  convertBtn.disabled = false;
}

function resetUI() {
  currentFilePath = null;
  currentFileName = null;
  currentFileSize = 0;
  outputDirectory = null;
  lastConvertedPath = null;

  dropZone.style.display = 'block';
  fileInfo.style.display = 'none';
  conversionSection.style.display = 'none';
  outputSection.style.display = 'none';
  convertSection.style.display = 'none';
  progressSection.style.display = 'none';
  resultSection.style.display = 'none';
  errorSection.style.display = 'none';
  convertBtn.textContent = 'Convert File';

  outputFormat.innerHTML = '<option value="">Select format...</option>';
  outputPath.textContent = 'Same as source';
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

// Event Listeners
dropZone.addEventListener('click', function () {
  selectFileBtn.click();
});

selectFileBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  window.electron.selectFile().then(function (result) {
    if (!result.canceled && result.filePaths.length > 0) {
      handleFile(result.filePaths[0]);
    }
  });
});

changeFileBtn.addEventListener('click', function () {
  window.electron.selectFile().then(function (result) {
    if (!result.canceled && result.filePaths.length > 0) {
      handleFile(result.filePaths[0]);
    }
  });
});

changeDirBtn.addEventListener('click', function () {
  window.electron.selectOutputDirectory().then(function (result) {
    if (!result.canceled && result.filePaths.length > 0) {
      outputDirectory = result.filePaths[0];
      outputPath.textContent = outputDirectory;
    }
  });
});

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

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    var file = e.dataTransfer.files[0];
    var path = window.electron.getFilePath(file);
    handleFile(path);
  }
});

function startConversion(password) {
  var targetFormat = outputFormat.value;
  if (!targetFormat) {
    showError('Please select a target format');
    return;
  }

  if (!currentFilePath) {
    showError('No file selected');
    return;
  }

  convertBtn.disabled = true;
  showProgress();

  var progress = 0;
  var progressInterval = setInterval(function () {
    if (progress < 50) {
      progress += 4;
    } else if (progress < 80) {
      progress += 2;
    } else if (progress < 95) {
      progress += 0.5;
    }
    updateProgress(Math.min(progress, 95));
  }, 100);

  window.electron.convertFile(currentFilePath, targetFormat, outputDirectory, password)
    .then(function (resultPath) {
      clearInterval(progressInterval);
      updateProgress(100);
      setTimeout(function () { showResult(resultPath); }, 500);
    })
    .catch(function (error) {
      clearInterval(progressInterval);
      if (error.message.includes('PASSWORD_REQUIRED')) {
        showPasswordModal();
      } else {
        showError(error.message);
      }
    });
}

convertBtn.addEventListener('click', function () {
  startConversion(null);
});

openFolderBtn.addEventListener('click', function () {
  if (lastConvertedPath) {
    window.electron.openPath(lastConvertedPath);
  } else if (currentFilePath) {
    window.electron.openPath(currentFilePath);
  }
});

resetBtn.addEventListener('click', resetUI);
retryBtn.addEventListener('click', resetUI);