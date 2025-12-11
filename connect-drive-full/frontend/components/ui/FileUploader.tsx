import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

interface FileUploadProps {
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  id: string;
}

export default function FileUploader({
  onUploadComplete,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  acceptedTypes,
  className = ''
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    if (file.size > maxSize) {
      return { isValid: false, error: `File too large. Max size: ${formatFileSize(maxSize)}` };
    }

    if (acceptedTypes && acceptedTypes.length > 0) {
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      const isTypeAccepted = acceptedTypes.some(type => 
        fileType.match(type.replace('*', '.*')) || 
        type === fileExtension
      );

      if (!isTypeAccepted) {
        return { isValid: false, error: `File type not supported. Accepted: ${acceptedTypes.join(', ')}` };
      }
    }

    return { isValid: true };
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Check file limit
    if (uploadingFiles.length + fileArray.length > maxFiles) {
      alert(`Cannot upload more than ${maxFiles} files at once`);
      return;
    }

    // Validate and start uploads
    fileArray.forEach(file => {
      const validation = validateFile(file);
      if (validation.isValid) {
        startUpload(file);
      } else {
        alert(`${file.name}: ${validation.error}`);
      }
    });
  }, [uploadingFiles.length, maxFiles, maxSize, acceptedTypes]);

  const startUpload = async (file: File) => {
    const uploadId = generateId();
    const uploadingFile: UploadingFile = {
      file,
      progress: 0,
      status: 'uploading',
      id: uploadId
    };

    setUploadingFiles(prev => [...prev, uploadingFile]);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Please login first');
      }

      // Step 1: Initialize upload
      const initResponse = await axios.post(`${apiUrl}/files/init`, {
        filename: file.name,
        contentType: file.type,
        folderId: null // Root folder for now
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { uploadUrl, key } = initResponse.data;
      
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, progress: 10 } : f)
      );

      // Step 2: Upload to MinIO
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 80) + 10; // 10-90%
            setUploadingFiles(prev => 
              prev.map(f => f.id === uploadId ? { ...f, progress } : f)
            );
          }
        }
      });

      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, progress: 95 } : f)
      );

      // Step 3: Confirm upload
      await axios.post(`${apiUrl}/files/confirm`, {
        filename: file.name,
        size: file.size,
        mime: file.type,
        key: key,
        folderId: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Mark as successful
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, status: 'success', progress: 100 } : f)
      );

      if (onUploadComplete) {
        onUploadComplete();
      }

      // Remove from list after delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      }, 3000);

    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, status: 'error', error: errorMessage } : f)
      );
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Zone */}
      <div
        className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept={acceptedTypes?.join(',')}
        />
        
        <div className="upload-zone-content">
          <div className="upload-zone-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <h3 className="upload-zone-title">
            Drop files here or click to browse
          </h3>
          
          <p className="upload-zone-subtitle">
            Upload up to {maxFiles} files, max {formatFileSize(maxSize)} each
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400 mt-4">
            {acceptedTypes && acceptedTypes.length > 0 ? (
              acceptedTypes.map(type => (
                <span key={type} className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                  {type.replace('*', '').replace('.', '').toUpperCase()}
                </span>
              ))
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                All file types
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Uploading Files ({uploadingFiles.length})
          </h4>
          
          {uploadingFiles.map((uploadingFile) => (
            <div key={uploadingFile.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-slide-in-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {uploadingFile.status === 'uploading' && (
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {uploadingFile.status === 'success' && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                    )}
                    {uploadingFile.status === 'error' && (
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadingFile.file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-600">
                    {uploadingFile.progress}%
                  </span>
                  
                  <button
                    onClick={() => removeFile(uploadingFile.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="progress-modern">
                <div 
                  className={`progress-fill-modern ${
                    uploadingFile.status === 'error' ? 'bg-red-500' : 
                    uploadingFile.status === 'success' ? 'bg-green-500' : ''
                  }`}
                  style={{ width: `${uploadingFile.progress}%` }}
                />
              </div>
              
              {/* Error Message */}
              {uploadingFile.status === 'error' && uploadingFile.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {uploadingFile.error}
                  </p>
                </div>
              )}

              {/* Success Message */}
              {uploadingFile.status === 'success' && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Upload completed successfully!
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}