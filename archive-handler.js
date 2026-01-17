const { spawn } = require('child_process');
const sevenBin = require('7zip-bin');
const path = require('path');
const fs = require('fs');

// Get path to the 7za binary
const pathTo7zip = sevenBin.path7za;

class ArchiveHandler {
    constructor() {
        this.binPath = pathTo7zip;
    }

    /**
     * Extracts archive to output path using direct child_process.spawn.
     * Always extracts into a subdirectory named after the archive to prevent clutter.
     * @param {string} inputPath 
     * @param {string} baseOutputDir 
     * @param {string} password 
     */
    async extract(inputPath, baseOutputDir, password) {
        const fileNameNoExt = path.basename(inputPath, path.extname(inputPath));
        const finalOutputPath = path.join(baseOutputDir, fileNameNoExt);

        // Ensure output directory exists
        if (!fs.existsSync(finalOutputPath)) {
            fs.mkdirSync(finalOutputPath, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            // Build 7zip command arguments
            // Command: 7za x <archive> -o<output_dir> -y -p<password>
            const args = [
                'x',                       // Extract with full paths
                inputPath,                 // Archive file path
                `-o${finalOutputPath}`,    // Output directory (no space after -o)
                '-y',                      // Assume Yes on all queries (prevents hangs)
                '-bso0',                   // Suppress standard output stream
                '-bsp0',                   // Suppress progress output
                // CRITICAL: Always pass -p to prevent interactive password prompt
                // If password is empty/null, 7zip will fail with "wrong password" for encrypted files
                // which is what we want (fast failure) instead of hanging waiting for stdin input
                `-p${password || ''}`,
            ];

            // Spawn the 7zip process
            const proc = spawn(this.binPath, args, {
                windowsHide: true, // Hide console window on Windows
                stdio: ['ignore', 'pipe', 'pipe'] // stdin ignored, capture stdout/stderr
            });

            let stdoutData = '';
            let stderrData = '';

            proc.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            proc.on('error', (err) => {
                // Failed to spawn the process itself
                reject(new Error(`Failed to start 7zip: ${err.message}`));
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    // Success
                    resolve(finalOutputPath);
                } else {
                    // Combine stdout and stderr for error analysis
                    const allOutput = (stdoutData + ' ' + stderrData).toLowerCase();

                    // Check for password-related errors
                    if (allOutput.includes('wrong password') ||
                        allOutput.includes('enter password') ||
                        allOutput.includes('encrypted') ||
                        allOutput.includes('can not open encrypted') ||
                        allOutput.includes('cannot open encrypted') ||
                        allOutput.includes('break signaled') ||
                        allOutput.includes('data error')) {
                        reject(new Error('PASSWORD_REQUIRED'));
                    } else if (stderrData.trim()) {
                        reject(new Error(`Extraction failed: ${stderrData.trim()}`));
                    } else if (stdoutData.trim()) {
                        reject(new Error(`Extraction failed: ${stdoutData.trim()}`));
                    } else {
                        reject(new Error(`Extraction failed with exit code ${code}`));
                    }
                }
            });
        });
    }
}

module.exports = new ArchiveHandler();
