import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Github, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [githubToken, setGithubToken] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!repoName || !githubToken) {
      toast.error('Please fill in all fields');
      return;
    }

    const file = acceptedFiles[0];
    if (!file.name.endsWith('.zip')) {
      toast.error('Please upload a ZIP file');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('repoName', repoName);
    formData.append('token', githubToken);

    try {
      const response = await fetch('/api/upload-to-github', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Files uploaded successfully!');
        setRepoName('');
        setGithubToken('');
      } else {
        throw new Error(data.error || 'Failed to upload files');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  }, [repoName, githubToken]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Github className="w-8 h-8" />
          <h1 className="text-3xl font-bold">GitHub ZIP Uploader</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl mb-6">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Repository Name</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                placeholder="my-awesome-repo"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">GitHub Token</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                placeholder="ghp_xxxxxxxxxxxx"
              />
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p>Drop the ZIP file here...</p>
            ) : (
              <div>
                <p className="mb-2">Drag & drop a ZIP file here, or click to select</p>
                <p className="text-sm text-gray-400">Only .zip files are accepted</p>
              </div>
            )}
          </div>
        </div>

        {isUploading && (
          <div className="flex items-center justify-center gap-3 text-blue-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p>Uploading and processing files...</p>
          </div>
        )}
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;