import React, { useState, useRef, useCallback } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import FilePreview from './FilePreview';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

interface EnhancedUploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  onFileProgress?: (fileId: string, progress: number) => void;
  onFileComplete?: (fileId: string) => void;
  onFileError?: (fileId: string, error: string) => void;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

export default function EnhancedUploadZone({
  onUpload,
  onFileProgress,
  onFileComplete,
  onFileError,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  maxFiles = 50,
  acceptedTypes = [],
  disabled = false
}: EnhancedUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllers = useRef<Map<string, AbortController>>(new Map());

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`;
    }
    
    if (acceptedTypes.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.slice(1);
        }
        return mimeType.startsWith(type);
      });
      
      if (!isAccepted) {
        return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
      }
    }
    
    return null;
  };

  const handleFiles = useCallback((files: FileList) => {
    if (disabled || isUploading) return;

    const fileArray = Array.from(files);
    
    if (fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newUploadFiles: UploadFile[] = [];
    const validFiles: File[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      const uploadFile: UploadFile = {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined
      };
      
      newUploadFiles.push(uploadFile);
      if (!error) {
        validFiles.push(file);
      }
    });

    setUploadFiles(prev => [...prev, ...newUploadFiles]);

    if (validFiles.length > 0) {
      startUpload(validFiles, newUploadFiles.filter(f => !f.error));
    }
  }, [disabled, isUploading, maxFiles, maxFileSize, acceptedTypes]);

  const startUpload = async (files: File[], uploadFileItems: UploadFile[]) => {
    setIsUploading(true);

    try {
      // Simulate upload progress for each file
      const uploadPromises = uploadFileItems.map(async (uploadFile) => {
        const controller = new AbortController();
        uploadControllers.current.set(uploadFile.id, controller);

        try {
          // Update status to uploading
          setUploadFiles(prev => 
            prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
          );

          // Simulate progress updates
          for (let progress = 0; progress <= 100; progress += 10) {
            if (controller.signal.aborted) {
              throw new Error('Upload cancelled');
            }

            await new Promise(resolve => setTimeout(resolve, 200));
            
            setUploadFiles(prev => 
              prev.map(f => f.id === uploadFile.id ? { ...f, progress } : f)
            );
            
            onFileProgress?.(uploadFile.id, progress);
          }

          // Mark as completed
          setUploadFiles(prev => 
            prev.map(f => f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100 } : f)
          );
          
          onFileComplete?.(uploadFile.id);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          
          setUploadFiles(prev => 
            prev.map(f => f.id === uploadFile.id ? { 
              ...f, 
              status: errorMessage.includes('cancelled') ? 'cancelled' : 'error',
              error: errorMessage 
            } : f)
          );
          
          onFileError?.(uploadFile.id, errorMessage);
        } finally {
          uploadControllers.current.delete(uploadFile.id);
        }
      });

      await Promise.allSettled(uploadPromises);
      
      // Call the actual upload function
      await onUpload(files);
      
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = (fileId: string) => {
    const controller = uploadControllers.current.get(fileId);
    if (controller) {
      controller.abort();
    }
  };

  const removeFile = (fileId: string) => {
    cancelUpload(fileId);
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
      case 'cancelled':
        return (
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-3 h-3 text-white" />
          </div>
        );
      case 'uploading':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return (
          <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
            <DocumentIcon className="w-3 h-3 text-gray-600" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`
          upload-zone relative transition-all duration-300 ease-in-out
          ${isDragActive ? 'dragover scale-[1.02] shadow-2xl' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
          accept={acceptedTypes.join(',')}
        />
        
        <div className="upload-zone-content">
          <div className={`upload-zone-icon ${isDragActive ? 'animate-bounce' : ''}`}>
            <CloudArrowUpIcon />
          </div>
          
          <h3 className="upload-zone-title">
            {isDragActive ? 'Drop files here' : 'Upload your files'}
          </h3>
          
          <p className="upload-zone-subtitle">
            {isDragActive 
              ? 'Release to start uploading' 
              : 'Drag and drop files here, or click to browse'
            }
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 mt-4">
            <span>Max file size: {formatFileSize(maxFileSize)}</span>
            <span>•</span>
            <span>Max files: {maxFiles}</span>
            {acceptedTypes.length > 0 && (
              <>
                <span>•</span>
                <span>Accepted: {acceptedTypes.slice(0, 3).join(', ')}{acceptedTypes.length > 3 ? '...' : ''}</span>
              </>
            )}
          </div>
        </div>

        {/* Animated background effect */}
        <div className={`
          absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-pink-400/10 
          rounded-2xl transition-opacity duration-300
          ${isDragActive ? 'opacity-100' : 'opacity-0'}
        `} />
      </div>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Progress ({uploadFiles.length} files)
            </h3>
            <div className="flex items-center space-x-2">
              {uploadFiles.some(f => f.status === 'completed') && (
                <button
                  onClick={clearCompleted}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear completed
                </button>
              )}
              {isUploading && (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </div>
              )}
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="p-4 border-b border-gray-50 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(uploadFile.status)}
                    <div className="flex-1 min-w-0">
                      <FilePreview file={uploadFile.file} className="border-0 bg-transparent p-0 hover:border-0" />
                      {uploadFile.error && (
                        <p className="text-xs text-red-500 mt-1">
                          {uploadFile.error}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {uploadFile.status === 'uploading' && (
                      <span className="text-sm text-gray-600">{uploadFile.progress}%</span>
                    )}
                    
                    {(uploadFile.status === 'uploading' || uploadFile.status === 'pending') && (
                      <button
                        onClick={() => cancelUpload(uploadFile.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Cancel upload"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                    
                    {(uploadFile.status === 'completed' || uploadFile.status === 'error' || uploadFile.status === 'cancelled') && (
                      <button
                        onClick={() => removeFile(uploadFile.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove file"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                {uploadFile.status === 'uploading' && (
                  <div className="progress-modern">
                    <div 
                      className="progress-fill-modern"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                )}
                
                {/* Status indicator for completed/error states */}
                {uploadFile.status === 'completed' && (
                  <div className="w-full bg-green-100 rounded-full h-2">
                    <div className="w-full h-2 bg-green-500 rounded-full" />
                  </div>
                )}
                
                {(uploadFile.status === 'error' || uploadFile.status === 'cancelled') && (
                  <div className="w-full bg-red-100 rounded-full h-2">
                    <div className="w-full h-2 bg-red-500 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}