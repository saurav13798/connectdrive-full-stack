import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
  children?: FolderItem[];
  fileCount?: number;
  isExpanded?: boolean;
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  className?: string;
}

export default function FolderTree({
  onFolderSelect,
  selectedFolderId,
  className = ''
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch folder tree
  const fetchFolders = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${apiUrl}/folders/tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFolders(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderClick = (folderId: string | null) => {
    onFolderSelect?.(folderId);
  };

  const renderFolder = (folder: FolderItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 group ${
            isSelected 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-50 text-gray-700'
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => handleFolderClick(folder.id)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="mr-2 p-1 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              <svg
                className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-5 h-5 mr-2"></div>
          )}

          {/* Folder Icon */}
          <div className={`mr-3 transition-colors duration-200 ${
            isSelected ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'
          }`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
            </svg>
          </div>

          {/* Folder Name */}
          <span className={`flex-1 text-sm font-medium truncate ${
            isSelected ? 'text-blue-900' : 'text-gray-900 group-hover:text-gray-900'
          }`}>
            {folder.name}
          </span>

          {/* File Count */}
          {folder.fileCount !== undefined && folder.fileCount > 0 && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              isSelected 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
            }`}>
              {folder.fileCount}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="animate-slide-in-up">
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-sm text-gray-600">Loading folders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-red-600 text-sm">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Root Folder */}
      <div
        className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 group ${
          selectedFolderId === null 
            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
            : 'hover:bg-gray-50 text-gray-700'
        }`}
        onClick={() => handleFolderClick(null)}
      >
        <div className="w-5 h-5 mr-2"></div>
        <div className={`mr-3 transition-colors duration-200 ${
          selectedFolderId === null ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'
        }`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
          </svg>
        </div>
        <span className={`flex-1 text-sm font-medium ${
          selectedFolderId === null ? 'text-blue-900' : 'text-gray-900 group-hover:text-gray-900'
        }`}>
          All Files
        </span>
      </div>

      {/* Folder Tree */}
      {folders.length > 0 ? (
        folders.map(folder => renderFolder(folder))
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          No folders yet
        </div>
      )}
    </div>
  );
}