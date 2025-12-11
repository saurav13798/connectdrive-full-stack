import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { validateFile, FILE_VALIDATION_PRESETS } from '../utils/validation';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from './feedback/Toast';

type Props = { 
  apiUrl: string; 
  ownerId: string; 
  onUploadComplete?: () => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSize?: number;
};

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function FileUploader({ 
  apiUrl, 
  ownerId, 
  onUploadComplete,
  maxFiles = 5,
  acceptedTypes,
  maxSize = 100 * 1024 * 1024 // 100MB
}: Props) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleError } = useErrorHandler();
  const { addToast } = useToast();

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate files
    const validationOptions = {
      maxSize,
      allowedTypes: acceptedTypes || FILE_VALIDATION_PRESETS.general.allowedTypes,
      maxFiles
    };

    const validFiles: File[] = [];
    
    fileArray.forEach(file => {
      const validation = validateFile(file, validationOptions);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        addToast(`${file.name}: ${validation.errors.join(', ')}`, 'error');
      }
    });

    if (validFiles.length === 0) return;

    // Check total file limit
    if (uploadingFiles.length + validFiles.length > maxFiles) {
      addToast(`Cannot upload more than ${maxFiles} files at once`, 'error');
      return;
    }

    // Start uploads
    validFiles.forEach(file => {
      startUpload(file);
    });
  }, [uploadingFiles.length, maxFiles, maxSize, acceptedTypes, addToast]);

  const startUpload = async (file: File) => {
    if (!ownerId) {
      addToast('Please login first', 'error');
      return;
    }

    const uploadingFile: UploadingFile = {
      file,
      progress: 0,
      status: 'uploading'
    };

    setUploadingFiles(prev => [...prev, uploadingFile]);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Please login first');
      }

      // Step 1: Get presigned upload URL
      const presignedResponse = await axios.post(`${apiUrl}/files/presigned-upload`, {
        filename: file.name,
        contentType: file.type
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { uploadUrl } = presignedResponse.data;

      // Step 2: Upload file to MinIO using presigned URL
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadingFiles(prev => 
              prev.map(f => 
                f.file === file 
                  ? { ...f, progress }
                  : f
              )
            );
          }
        }
      });

      // Step 3: Confirm upload with backend
      await axios.post(`${apiUrl}/files/confirm-upload`, {
        filename: file.name,
        size: file.size,
        mime: file.type,
        folderId: null // Root folder for now
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Mark as successful
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      );

      addToast(`${file.name} uploaded successfully!`, 'success');
      
      if (onUploadComplete) {
        onUploadComplete();
      }

      // Remove from list after delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.file !== file));
      }, 3000);

    } catch (error) {
      const appError = handleError(error);
      
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'error', error: appError.message }
            : f
        )
      );

      addToast(`Upload failed: ${appError.message}`, 'error');
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`file-upload-zone p-8 text-center ${isDragOver ? 'dragover' : ''}`}
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
        
        <div className="animate-float">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Drop files here or click to browse
        </h3>
        
        <p className="text-gray-500 mb-4">
          Upload up to {maxFiles} files, max {formatFileSize(maxSize)} each
        </p>
        
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
          {acceptedTypes ? (
            acceptedTypes.map(type => (
              <span key={type} className="badge badge-primary">
                {type.split('/')[1]?.toUpperCase() || type}
              </span>
            ))
          ) : (
            <span className="badge badge-primary">All file types</span>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">
            Uploading Files ({uploadingFiles.length})
          </h4>
          
          {uploadingFiles.map((uploadingFile, index) => (
            <div key={index} className="card p-4 animate-slide-in-up">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {uploadingFile.status === 'uploading' && (
                      <div className="loading-spinner"></div>
                    )}
                    {uploadingFile.status === 'success' && (
                      <svg className="icon-md text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                    {uploadingFile.status === 'error' && (
                      <svg className="icon-md text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
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
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {uploadingFile.progress}%
                  </span>
                  
                  <button
                    onClick={() => removeFile(uploadingFile.file)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <svg className="icon-sm" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="progress-container">
                <div 
                  className={`progress-bar ${
                    uploadingFile.status === 'error' ? 'bg-red-500' : 
                    uploadingFile.status === 'success' ? 'bg-green-500' : ''
                  }`}
                  style={{ width: `${uploadingFile.progress}%` }}
                />
              </div>
              
              {/* Error Message */}
              {uploadingFile.status === 'error' && uploadingFile.error && (
                <p className="text-sm text-red-600 mt-2 animate-slide-in-up">
                  {uploadingFile.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
