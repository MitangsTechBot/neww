import express from 'express';
import multer from 'multer';
import { Octokit } from 'octokit';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

const upload = multer({ storage: multer.memoryStorage() });

// Handle API route
app.post('/api/upload-to-github', upload.single('file'), async (req, res) => {
  try {
    const repoName = req.body.repoName;
    const token = req.body.token;
    const file = req.file;

    if (!file || !repoName || !token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Read and extract ZIP file
    const zip = new JSZip();
    const contents = await zip.loadAsync(file.buffer);

    // Initialize GitHub client
    const octokit = new Octokit({ auth: token });

    // Create repository
    try {
      await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        auto_init: true,
      });
    } catch (error) {
      return res.status(400).json({ 
        error: 'Failed to create repository. It might already exist or token lacks permissions.' 
      });
    }

    // Upload files
    for (const [path, file] of Object.entries(contents.files)) {
      if (!file.dir) {
        const content = await file.async('base64');
        
        try {
          await octokit.rest.repos.createOrUpdateFileContents({
            owner: (await octokit.rest.users.getAuthenticated()).data.login,
            repo: repoName,
            path: path,
            message: `Add ${path}`,
            content: content,
          });
        } catch (error) {
          console.error(`Failed to upload ${path}:`, error);
        }
      }
    }

    res.json({ message: 'Files uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});