# File Converter

A sleek, minimal desktop application for converting files locally on your computer. Supports multiple file formats and runs completely offline.

## Features

- **Image Conversions**: PNG, JPG, JPEG, WebP, GIF, BMP, TIFF, ICO
- **Video Conversions**: MP4, WebM, AVI, MOV, MKV, FLV, WMV
- **Audio Conversions**: MP3, WAV, OGG, FLAC, AAC, M4A
- **Document Conversions**: PDF, DOCX, TXT (with some limitations)
- **Archive Conversions**: ZIP, TAR (limited support)
- **100% Offline**: All conversions happen locally on your device
- **Cross-Platform**: Windows, macOS, and Linux support
- **Modern UI**: Clean, sleek interface with drag-and-drop support

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Install dependencies (if you haven't already):
```bash
npm install
```

## Running the Application

### Quick Start Options

**Windows (Easiest):**
- Double-click `start.bat` to launch the application
- The script will automatically install dependencies if needed
- If that doesn't work, try running `node launcher.js`

**Command Line:**
```bash
npm start
```

**PowerShell Script:**
```powershell
.\start.ps1
```
Note: You may need to run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` first.

**macOS/Linux:**
```bash
npm start
```

## Building for Distribution

### Build for all platforms:
```bash
npm run build
```

### Build for specific platform:

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

The built applications will be in the `dist` folder.

## Usage

1. Launch the application
2. Drag and drop a file onto the drop zone, or click "Select File"
3. Choose your desired output format from the dropdown
4. Optionally select a different output directory
5. Click "Convert" to start the conversion
6. Once complete, click "Open Folder" to locate your converted file

## Conversion Support

### Supported Conversions

**Images:** All image formats can be converted to any other image format

**Video/Audio:** FFmpeg-based conversion supports most common formats
- Videos can be converted to other video formats
- Audio can be extracted from videos or converted between audio formats

**Documents:**
- TXT → PDF
- DOCX → PDF
- PDF → DOCX (basic text extraction)

**Archives:**
- ZIP → TAR
- Single files can be zipped

### Limitations

Some advanced conversions (like complex DOCX ↔ PDF with formatting) are limited. This is a lightweight converter focused on common use cases.

## Technical Details

- **Framework**: Electron
- **Image Processing**: Sharp
- **Video/Audio**: FFmpeg via fluent-ffmpeg
- **PDF**: pdf-lib, pdfkit
- **Office**: mammoth (DOCX)
- **Archives**: archiver, adm-zip

## Privacy & Security

This application runs entirely locally on your computer. No files are uploaded to any external servers. All conversions happen in-place on your machine.

## License

ISC