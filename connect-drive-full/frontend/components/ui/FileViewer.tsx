import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { 
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  InformationCircleIcon,
  EyeIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

interface FileItem {
  id: string;
  filename: string;
  size: number;
  mime: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string;
}

interface FileViewerProps {
  file: FileItem;
}

export default function FileViewer({ file }: FileViewerProps) {
  const router = useRouter();
  const [showControls, setShowControls] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const resetTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const handleMouseMove = () => resetTimeout();
    const handleKeyPress = () => resetTimeout();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    
    // Initial timeout
    resetTimeout();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          router.push('/files');
          break;
        case 'ArrowLeft':
          // TODO: Navigate to previous file
          break;
        case 'ArrowRight':
          // TODO: Navigate to next file
          break;
        case 'i':
        case 'I':
          setShowMetadata(!showMetadata);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router, showMetadata]);

  // Get download URL
  const getDownloadUrl = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${apiUrl}/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDownloadUrl(response.data.downloadUrl);
    } catch (err) {
      console.error('Failed to get download URL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (file && canPreview(file)) {
      getDownloadUrl();
    }
  }, [file]);

  const canPreview = (file: FileItem): boolean => {
    const type = file.mime.toLowerCase();
    return (
      type.startsWith('image/') ||
      type.startsWith('video/') ||
      type.startsWith('audio/') ||
      type === 'application/pdf' ||
      type.startsWith('text/') ||
      type === 'application/json'
    );
  };

  const getFileIcon = (file: FileItem) => {
    const type = file.mime.toLowerCase();
    const extension = file.filename.split('.').pop()?.toLowerCase();

    if (type.startsWith('image/')) {
      return <PhotoIcon className="w-8 h-8 text-purple-500" />;
    }
    if (type.startsWith('video/')) {
      return <VideoCameraIcon className="w-8 h-8 text-pink-500" />;
    }
    if (type.startsWith('audio/')) {
      return <MusicalNoteIcon className="w-8 h-8 text-indigo-500" />;
    }
    if (type.includes('pdf')) {
      return <DocumentIcon className="w-8 h-8 text-red-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'php'].includes(extension || '')) {
      return <CodeBracketIcon className="w-8 h-8 text-green-600" />;
    }
    if (type.startsWith('text/')) {
      return <DocumentTextIcon className="w-8 h-8 text-gray-500" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return <ArchiveBoxIcon className="w-8 h-8 text-yellow-500" />;
    }
    return <DocumentIcon className="w-8 h-8 text-gray-400" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${apiUrl}/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.open(response.data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const renderPreview = () => {
    if (!downloadUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {loading ? (
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                getFileIcon(file)
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{file.filename}</h3>
            <p className="text-gray-600 mb-4">
              {loading ? 'Loading preview...' : 'Preview not available'}
            </p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      );
    }

    const type = file.mime.toLowerCase();

    if (type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img
            src={downloadUrl}
            alt={file.filename}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            style={{ maxHeight: 'calc(100vh - 8rem)' }}
          />
        </div>
      );
    }

    if (type.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <video
            src={downloadUrl}
            controls
            className="max-w-full max-h-full rounded-lg shadow-lg"
            style={{ maxHeight: 'calc(100vh - 8rem)' }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (type.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <MusicalNoteIcon className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{file.filename}</h3>
            <audio
              src={downloadUrl}
              controls
              className="w-full max-w-md mx-auto"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      );
    }

    if (type === 'application/pdf') {
      return (
        <div className="h-full">
          <iframe
            src={downloadUrl}
            className="w-full h-full border-0"
            title={file.filename}
          />
        </div>
      );
    }

    if (type.startsWith('text/') || type === 'application/json') {
      return (
        <div className="h-full p-6 overflow-auto">
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            <iframe
              src={downloadUrl}
              className="w-full h-full border-0 bg-white rounded"
              title={file.filename}
              style={{ minHeight: '500px' }}
            />
          </div>
        </div>
      );
    }

    return renderPreview();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Floating Header Controls */}
      <div 
        className={`absolute top-0 left-0 right-0 z-10 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
        }`}
      >
        <div className="bg-black/80 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/files')}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors group"
                title="Back to files (Esc)"
              >
                <XMarkIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  {getFileIcon(file)}
                </div>
                <div>
                  <h1 className="text-white font-semibold text-lg truncate max-w-md" title={file.filename}>
                    {file.filename}
                  </h1>
                  <p className="text-gray-300 text-sm">
                    {formatFileSize(file.size)} • {formatDate(file.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-2">
              {/* Navigation Controls */}
              <div className="flex items-center space-x-1 mr-4">
                <button
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                  title="Previous file (←)"
                  disabled
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <button
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                  title="Next file (→)"
                  disabled
                >
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Action Controls */}
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className={`p-2 rounded-lg transition-colors ${
                  showMetadata 
                    ? 'bg-blue-600 text-white' 
                    : 'text-white hover:bg-white/10'
                }`}
                title="File info (I)"
              >
                <InformationCircleIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleDownload}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Download file"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              
              <button
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Share file"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* File Preview */}
        <div className="flex-1 bg-gray-100">
          {renderPreview()}
        </div>

        {/* Metadata Sidebar */}
        <div 
          className={`bg-white border-l border-gray-200 transition-all duration-300 ${
            showMetadata ? 'w-80' : 'w-0 overflow-hidden'
          }`}
        >
          {showMetadata && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">File Details</h2>
                <button
                  onClick={() => setShowMetadata(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* File Preview Thumbnail */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    {getFileIcon(file)}
                  </div>
                  <h3 className="font-medium text-gray-900 break-words">{file.filename}</h3>
                </div>

                {/* File Properties */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Size</label>
                    <p className="mt-1 text-gray-900">{formatFileSize(file.size)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Type</label>
                    <p className="mt-1 text-gray-900">{file.mime}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Created</label>
                    <p className="mt-1 text-gray-900">{formatDate(file.createdAt)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Modified</label>
                    <p className="mt-1 text-gray-900">{formatDate(file.updatedAt)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">File ID</label>
                    <p className="mt-1 text-gray-900 font-mono text-sm break-all">{file.id}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  
                  <button className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <ShareIcon className="w-4 h-4 mr-2" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Controls (for mobile) */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-10 md:hidden transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
        }`}
      >
        <div className="bg-black/80 backdrop-blur-sm border-t border-gray-800 px-6 py-4">
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-3 rounded-full transition-colors ${
                showMetadata 
                  ? 'bg-blue-600 text-white' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <InformationCircleIcon className="w-6 h-6" />
            </button>
            
            <button
              onClick={handleDownload}
              className="p-3 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowDownTrayIcon className="w-6 h-6" />
            </button>
            
            <button className="p-3 text-white hover:bg-white/10 rounded-full transition-colors">
              <ShareIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}