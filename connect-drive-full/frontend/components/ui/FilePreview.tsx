import React from 'react';
import { 
  DocumentIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  MusicalNoteIcon,
  ArchiveBoxIcon,
  CodeBracketIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface FilePreviewProps {
  file: File;
  className?: string;
}

export default function FilePreview({ file, className = '' }: FilePreviewProps) {
  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();

    // Images
    if (type.startsWith('image/')) {
      return <PhotoIcon className="w-6 h-6 text-purple-500" />;
    }

    // Videos
    if (type.startsWith('video/')) {
      return <VideoCameraIcon className="w-6 h-6 text-pink-500" />;
    }

    // Audio
    if (type.startsWith('audio/')) {
      return <MusicalNoteIcon className="w-6 h-6 text-indigo-500" />;
    }

    // Documents
    if (type.includes('pdf')) {
      return <DocumentIcon className="w-6 h-6 text-red-500" />;
    }

    if (type.includes('word') || type.includes('document')) {
      return <DocumentIcon className="w-6 h-6 text-blue-500" />;
    }

    if (type.includes('sheet') || type.includes('excel')) {
      return <DocumentIcon className="w-6 h-6 text-green-500" />;
    }

    if (type.includes('presentation') || type.includes('powerpoint')) {
      return <DocumentIcon className="w-6 h-6 text-orange-500" />;
    }

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return <ArchiveBoxIcon className="w-6 h-6 text-yellow-500" />;
    }

    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'php'].includes(extension || '')) {
      return <CodeBracketIcon className="w-6 h-6 text-green-600" />;
    }

    // Text files
    if (type.startsWith('text/') || ['txt', 'md', 'rtf'].includes(extension || '')) {
      return <DocumentTextIcon className="w-6 h-6 text-gray-500" />;
    }

    // Default
    return <DocumentIcon className="w-6 h-6 text-gray-400" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileTypeLabel = (file: File): string => {
    const type = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('audio/')) return 'Audio';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'Document';
    if (type.includes('sheet') || type.includes('excel')) return 'Spreadsheet';
    if (type.includes('presentation') || type.includes('powerpoint')) return 'Presentation';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) return 'Archive';
    if (type.startsWith('text/')) return 'Text';
    
    return extension?.toUpperCase() || 'File';
  };

  return (
    <div className={`flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${className}`}>
      <div className="flex-shrink-0">
        {getFileIcon(file)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{getFileTypeLabel(file)}</span>
          <span>•</span>
          <span>{formatFileSize(file.size)}</span>
        </div>
      </div>
    </div>
  );
}