var sharp = require('sharp');
var ffmpeg = require('fluent-ffmpeg');
var ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var mammoth = require('mammoth');
var fs = require('fs');
var path = require('path');
var os = require('os');
var pdfParseImport = require('pdf-parse');
// pdf-parse exports an object with PDFParse as the main function
var pdfParseLib = pdfParseImport.PDFParse || pdfParseImport;
var docxLib = require('docx');
var Document = docxLib.Document;
var Packer = docxLib.Packer;
var Paragraph = docxLib.Paragraph;
var TextRun = docxLib.TextRun;
var archiver = require('archiver');
var AdmZip = require('adm-zip');
var PDFDocumentWriter = require('pdfkit');
var EPub = require('epub2').default;

ffmpeg.setFfmpegPath(ffmpegPath);

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'converter-'));
}

function cleanupTempDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function convertFile(file, targetFormat, outputDir) {
  var inputPath = file.path || file.name;
  var extension = path.extname(inputPath);
  var baseName = path.basename(inputPath, extension);
  var outDir = outputDir || path.dirname(inputPath);
  var outputFilePath = path.join(outDir, baseName + '.' + targetFormat);

  var inputExtension = extension.toLowerCase().replace('.', '');
  var targetExt = targetFormat.toLowerCase();

  if (inputExtension === targetExt) {
    throw new Error('Source and target formats are the same');
  }

  var inputType = getFileType(inputExtension);
  var targetType = getFileType(targetExt);

  // Video to Audio extraction
  if (inputType === 'video' && targetType === 'audio') {
    return extractAudioFromVideo(inputPath, outputFilePath, targetExt);
  }

  // Same-category conversions
  if (inputType === 'image') {
    return convertImage(inputPath, outputFilePath, targetExt);
  }
  if (inputType === 'video') {
    return convertVideo(inputPath, outputFilePath, targetExt);
  }
  if (inputType === 'audio') {
    return convertAudio(inputPath, outputFilePath, targetExt);
  }
  if (inputType === 'document' || inputType === 'ebook') {
    return convertDocument(inputPath, outputFilePath, inputExtension, targetExt);
  }
  if (inputType === 'archive') {
    return convertArchive(inputPath, outputFilePath, targetExt);
  }

  // Fallback
  return convertVideo(inputPath, outputFilePath, targetExt);
}

function getFileType(ext) {
  var imageFormats = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'ico', 'svg', 'avif'];
  var documentFormats = ['pdf', 'docx', 'txt', 'rtf', 'odt'];
  var ebookFormats = ['epub'];
  var audioFormats = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff'];
  var videoFormats = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v', '3gp'];
  var archiveFormats = ['zip', 'tar', 'gz', '7z', 'rar'];

  if (imageFormats.indexOf(ext) !== -1) return 'image';
  if (documentFormats.indexOf(ext) !== -1) return 'document';
  if (ebookFormats.indexOf(ext) !== -1) return 'ebook';
  if (audioFormats.indexOf(ext) !== -1) return 'audio';
  if (videoFormats.indexOf(ext) !== -1) return 'video';
  if (archiveFormats.indexOf(ext) !== -1) return 'archive';
  return 'unknown';
}

async function convertImage(inputPath, outputPath, targetFormat) {
  var sharpInstance = sharp(inputPath);

  if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
    sharpInstance = sharpInstance.jpeg({ quality: 90 });
  } else if (targetFormat === 'png') {
    sharpInstance = sharpInstance.png({ compressionLevel: 6 });
  } else if (targetFormat === 'webp') {
    sharpInstance = sharpInstance.webp({ quality: 85 });
  } else if (targetFormat === 'avif') {
    sharpInstance = sharpInstance.avif({ quality: 80 });
  } else {
    sharpInstance = sharpInstance.toFormat(targetFormat);
  }

  await sharpInstance.toFile(outputPath);
  return outputPath;
}

async function convertAudio(inputPath, outputPath, targetFormat) {
  return new Promise(function (resolve, reject) {
    var cmd = ffmpeg(inputPath);

    if (targetFormat === 'mp3') {
      cmd = cmd.audioCodec('libmp3lame').audioBitrate('192k');
    } else if (targetFormat === 'wav') {
      cmd = cmd.audioCodec('pcm_s16le');
    } else if (targetFormat === 'ogg') {
      cmd = cmd.audioCodec('libvorbis').audioBitrate('192k');
    } else if (targetFormat === 'flac') {
      cmd = cmd.audioCodec('flac');
    } else if (targetFormat === 'aac' || targetFormat === 'm4a') {
      cmd = cmd.audioCodec('aac').audioBitrate('192k');
    } else if (targetFormat === 'wma') {
      cmd = cmd.audioCodec('wmav2').audioBitrate('192k');
    } else if (targetFormat === 'aiff') {
      cmd = cmd.audioCodec('pcm_s16be');
    }

    cmd.output(outputPath)
      .on('end', function () { resolve(outputPath); })
      .on('error', function (err) { reject(new Error('Audio conversion failed: ' + err.message)); })
      .run();
  });
}

async function extractAudioFromVideo(inputPath, outputPath, targetFormat) {
  return new Promise(function (resolve, reject) {
    var cmd = ffmpeg(inputPath).noVideo();

    if (targetFormat === 'mp3') {
      cmd = cmd.audioCodec('libmp3lame').audioBitrate('192k');
    } else if (targetFormat === 'wav') {
      cmd = cmd.audioCodec('pcm_s16le');
    } else if (targetFormat === 'ogg') {
      cmd = cmd.audioCodec('libvorbis').audioBitrate('192k');
    } else if (targetFormat === 'flac') {
      cmd = cmd.audioCodec('flac');
    } else if (targetFormat === 'aac' || targetFormat === 'm4a') {
      cmd = cmd.audioCodec('aac').audioBitrate('192k');
    } else if (targetFormat === 'wma') {
      cmd = cmd.audioCodec('wmav2').audioBitrate('192k');
    } else if (targetFormat === 'aiff') {
      cmd = cmd.audioCodec('pcm_s16be');
    }

    cmd.output(outputPath)
      .on('end', function () { resolve(outputPath); })
      .on('error', function (err) { reject(new Error('Video to audio failed: ' + err.message)); })
      .run();
  });
}

async function convertVideo(inputPath, outputPath, targetFormat) {
  return new Promise(function (resolve, reject) {
    ffmpeg(inputPath)
      .output(outputPath)
      .on('end', function () { resolve(outputPath); })
      .on('error', function (err) { reject(new Error('Video conversion failed: ' + err.message)); })
      .run();
  });
}

async function convertDocument(inputPath, outputPath, inputExt, targetExt) {
  // EPUB conversions
  if (inputExt === 'epub') {
    if (targetExt === 'pdf') {
      return epubToPdf(inputPath, outputPath);
    }
    if (targetExt === 'txt') {
      return epubToTxt(inputPath, outputPath);
    }
    if (targetExt === 'docx') {
      return epubToDocx(inputPath, outputPath);
    }
  }

  // PDF conversions
  if (inputExt === 'pdf' && targetExt === 'txt') {
    return pdfToTxt(inputPath, outputPath);
  }
  if (inputExt === 'pdf' && targetExt === 'docx') {
    return pdfToDocx(inputPath, outputPath);
  }

  // TXT conversions
  if (inputExt === 'txt' && targetExt === 'pdf') {
    return txtToPdf(inputPath, outputPath);
  }
  if (inputExt === 'txt' && targetExt === 'docx') {
    return txtToDocx(inputPath, outputPath);
  }

  // DOCX conversions
  if (inputExt === 'docx' && targetExt === 'pdf') {
    return docxToPdf(inputPath, outputPath);
  }
  if (inputExt === 'docx' && targetExt === 'txt') {
    return docxToTxt(inputPath, outputPath);
  }

  // RTF conversions
  if (inputExt === 'rtf' && targetExt === 'txt') {
    return rtfToTxt(inputPath, outputPath);
  }
  if (inputExt === 'rtf' && targetExt === 'pdf') {
    return rtfToPdf(inputPath, outputPath);
  }

  throw new Error('Conversion from ' + inputExt.toUpperCase() + ' to ' + targetExt.toUpperCase() + ' is not supported');
}

// Helper function to parse PDF
async function parsePdf(inputPath) {
  if (typeof pdfParseLib !== 'function') {
    throw new Error('pdf-parse library not loaded correctly. Type: ' + typeof pdfParseLib);
  }
  var dataBuffer = fs.readFileSync(inputPath);
  var data = await pdfParseLib(dataBuffer);
  return data.text;
}

async function pdfToTxt(inputPath, outputPath) {
  try {
    var text = await parsePdf(inputPath);
    fs.writeFileSync(outputPath, text, 'utf8');
    return outputPath;
  } catch (error) {
    throw new Error('PDF to TXT failed: ' + error.message);
  }
}

async function pdfToDocx(inputPath, outputPath) {
  try {
    var text = await parsePdf(inputPath);
    await createDocxFromText(text, outputPath);
    return outputPath;
  } catch (error) {
    throw new Error('PDF to DOCX failed: ' + error.message);
  }
}

async function txtToPdf(inputPath, outputPath) {
  return new Promise(function (resolve, reject) {
    try {
      var text = fs.readFileSync(inputPath, 'utf8');
      var doc = new PDFDocumentWriter();
      var stream = fs.createWriteStream(outputPath);

      stream.on('finish', function () { resolve(outputPath); });
      stream.on('error', function (err) { reject(new Error('Failed to write PDF: ' + err.message)); });

      doc.pipe(stream);

      var sanitized = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

      doc.fontSize(12)
        .font('Helvetica')
        .text(sanitized, 72, 72, {
          width: 468,
          align: 'left',
          lineGap: 4
        });

      doc.end();
    } catch (error) {
      reject(new Error('TXT to PDF failed: ' + error.message));
    }
  });
}

async function txtToDocx(inputPath, outputPath) {
  try {
    var text = fs.readFileSync(inputPath, 'utf8');
    await createDocxFromText(text, outputPath);
    return outputPath;
  } catch (error) {
    throw new Error('TXT to DOCX failed: ' + error.message);
  }
}

async function docxToPdf(inputPath, outputPath) {
  return new Promise(async function (resolve, reject) {
    try {
      var result = await mammoth.extractRawText({ path: inputPath });
      var text = result.value;

      var doc = new PDFDocumentWriter();
      var stream = fs.createWriteStream(outputPath);

      stream.on('finish', function () { resolve(outputPath); });
      stream.on('error', function (err) { reject(new Error('Failed to write PDF: ' + err.message)); });

      doc.pipe(stream);

      var sanitized = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

      doc.fontSize(12)
        .font('Helvetica')
        .text(sanitized, 72, 72, {
          width: 468,
          align: 'left',
          lineGap: 4
        });

      doc.end();
    } catch (error) {
      reject(new Error('DOCX to PDF failed: ' + error.message));
    }
  });
}

async function docxToTxt(inputPath, outputPath) {
  try {
    var result = await mammoth.extractRawText({ path: inputPath });
    fs.writeFileSync(outputPath, result.value, 'utf8');
    return outputPath;
  } catch (error) {
    throw new Error('DOCX to TXT failed: ' + error.message);
  }
}

async function rtfToTxt(inputPath, outputPath) {
  try {
    var rtfContent = fs.readFileSync(inputPath, 'utf8');
    var text = rtfContent
      .replace(/\\[a-z]+(-?\d+)?[ ]?/g, '')
      .replace(/[{}]/g, '')
      .replace(/\\'[0-9a-f]{2}/gi, '')
      .trim();
    fs.writeFileSync(outputPath, text, 'utf8');
    return outputPath;
  } catch (error) {
    throw new Error('RTF to TXT failed: ' + error.message);
  }
}

async function rtfToPdf(inputPath, outputPath) {
  try {
    var tempPath = inputPath + '.temp.txt';
    await rtfToTxt(inputPath, tempPath);
    var result = await txtToPdf(tempPath, outputPath);
    fs.unlinkSync(tempPath);
    return result;
  } catch (error) {
    throw new Error('RTF to PDF failed: ' + error.message);
  }
}

// EPUB functions
async function parseEpub(inputPath) {
  return new Promise(function (resolve, reject) {
    var epub = new EPub(inputPath);

    epub.on('error', function (err) {
      reject(new Error('EPUB parse error: ' + err.message));
    });

    epub.on('end', function () {
      var chapters = [];
      var flow = epub.flow;
      var pending = flow.length;

      if (pending === 0) {
        resolve('');
        return;
      }

      flow.forEach(function (chapter, index) {
        epub.getChapter(chapter.id, function (err, text) {
          if (err) {
            chapters[index] = '';
          } else {
            // Strip HTML tags
            var plainText = text
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\s+/g, ' ')
              .trim();
            chapters[index] = plainText;
          }

          pending--;
          if (pending === 0) {
            resolve(chapters.join('\n\n'));
          }
        });
      });
    });

    epub.parse();
  });
}

async function epubToTxt(inputPath, outputPath) {
  try {
    var text = await parseEpub(inputPath);
    fs.writeFileSync(outputPath, text, 'utf8');
    return outputPath;
  } catch (error) {
    throw new Error('EPUB to TXT failed: ' + error.message);
  }
}

async function epubToPdf(inputPath, outputPath) {
  return new Promise(async function (resolve, reject) {
    try {
      var text = await parseEpub(inputPath);

      var doc = new PDFDocumentWriter();
      var stream = fs.createWriteStream(outputPath);

      stream.on('finish', function () { resolve(outputPath); });
      stream.on('error', function (err) { reject(new Error('Failed to write PDF: ' + err.message)); });

      doc.pipe(stream);

      var sanitized = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

      doc.fontSize(12)
        .font('Helvetica')
        .text(sanitized, 72, 72, {
          width: 468,
          align: 'left',
          lineGap: 4
        });

      doc.end();
    } catch (error) {
      reject(new Error('EPUB to PDF failed: ' + error.message));
    }
  });
}

async function epubToDocx(inputPath, outputPath) {
  try {
    var text = await parseEpub(inputPath);
    await createDocxFromText(text, outputPath);
    return outputPath;
  } catch (error) {
    throw new Error('EPUB to DOCX failed: ' + error.message);
  }
}

async function createDocxFromText(textContent, outputPath) {
  var paragraphs = textContent.split(/\n+/).filter(function (p) { return p.trim(); });

  var children = paragraphs.map(function (paraText) {
    return new Paragraph({
      children: [
        new TextRun({
          text: paraText.trim(),
          size: 24
        })
      ],
      spacing: {
        after: 200
      }
    });
  });

  var doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  var buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

async function convertArchive(inputPath, outputPath, targetFormat) {
  var inputExtension = path.extname(inputPath).toLowerCase().replace('.', '');
  var tempDir = createTempDir();

  try {
    if (inputExtension === 'zip') {
      var zip = new AdmZip(inputPath);
      zip.extractAllTo(tempDir, true);
    } else {
      throw new Error('Archive format ' + inputExtension + ' is not supported');
    }

    if (targetFormat === 'tar') {
      await dirToTar(tempDir, outputPath);
    } else if (targetFormat === 'zip') {
      await dirToZip(tempDir, outputPath);
    } else {
      throw new Error('Target archive format ' + targetFormat + ' is not supported');
    }

    return outputPath;
  } finally {
    cleanupTempDir(tempDir);
  }
}

async function dirToTar(sourceDir, outputPath) {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(outputPath);
    var archive = archiver('tar', { gzip: false });

    output.on('close', function () { resolve(outputPath); });
    archive.on('error', function (err) { reject(err); });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function dirToZip(sourceDir, outputPath) {
  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(outputPath);
    var archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', function () { resolve(outputPath); });
    archive.on('error', function (err) { reject(err); });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

module.exports = {
  convertFile: convertFile
};
