import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

interface SharedFile {
  file: {
    id: string;
    filename: string;
    size: number;
    mime: string;
    createdAt: string;
  };
  permission: string;
  creator: {
    displayName: string;
  };
}

export default function SharedFilePage() {
  const router = useRouter();
  const { token } = router.query;
  const [sharedFile, setSharedFile] = useState<SharedFile | null>(null);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (token) {
      loadSharedFile();
    }
  }, [token]);

  const loadSharedFile = async (pwd?: string) => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (pwd) params.append('password', pwd);
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/file-sharing/public/${token}?${params.toString()}`
      );
      
      setSharedFile(response.data);
      setPasswordRequired(false);
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.message === 'Password required') {
        setPasswordRequired(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load shared file');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loadSharedFile(password);
    }
  };

  const handleDownload = async () => {
    if (!sharedFile || sharedFile.permission === 'view') return;
    
    try {
      setDownloading(true);
      const params = new URLSearchParams();
      if (password) params.append('password', password);
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/file-sharing/public/${token}/download?${params.toString()}`
      );
      
      window.open(response.data.downloadUrl, '_blank');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
    return '📄';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Header */}
      <div className="bg-white shadow-soft">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-medium">
              <span className="text-white text-xl font-bold">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                ConnectDrive
              </h1>
              <p className="text-sm text-gray-500">Shared File</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shared file...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : passwordRequired ? (
          <div className="card p-8 text-center animate-fade-in-scale">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Required</h2>
            <p className="text-gray-600 mb-6">This file is password protected. Please enter the password to continue.</p>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="input-field"
                autoFocus
              />
              <button
                type="submit"
                disabled={!password.trim()}
                className="btn-primary w-full"
              >
                Access File
              </button>
            </form>
          </div>
        ) : sharedFile ? (
          <div className="card p-8 animate-fade-in-scale">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">{getFileIcon(sharedFile.file.mime)}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{sharedFile.file.filename}</h1>
              <p className="text-gray-600">Shared by {sharedFile.creator.displayName}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">File Size:</span>
                  <span className="ml-2 font-medium">{formatSize(sharedFile.file.size)}</span>
                </div>
                <div>
                  <span className="text-gray-500">File Type:</span>
                  <span className="ml-2 font-medium">{sharedFile.file.mime.split('/')[1]?.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Shared On:</span>
                  <span className="ml-2 font-medium">{formatDate(sharedFile.file.createdAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Permission:</span>
                  <span className="ml-2 font-medium capitalize">{sharedFile.permission}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              {sharedFile.permission !== 'view' && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="btn-primary flex-1"
                >
                  {downloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download File
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={() => window.open('/', '_blank')}
                className="btn-secondary flex-1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                Get ConnectDrive
              </button>
            </div>

            {sharedFile.permission === 'view' && (
              <div className="mt-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-warning-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-warning-800">
                    This file is shared with view-only permission. Download is not available.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}