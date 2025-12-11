import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import FileUploader from './FileUploader';
import FileGrid from './FileGrid';

interface FileItem {
  id: string;
  filename: string;
  size: number;
  mime: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string;
}

interface FileExplorerProps {
  className?: string;
}

export default function FileExplorer({ className = '' }: FileExplorerProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('');
  const [showMoreActions, setShowMoreActions] = useState(false);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch files
  const fetchFiles = async (pageNum: number = 1, search: string = '') => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const endpoint = search ? '/files/search' : '/files/list';
      const params: any = { page: pageNum, limit: 20 };
      
      if (search) {
        params.q = search;
      }

      const response = await axios.get(`${apiUrl}${endpoint}`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setFiles(response.data.items || []);
      setTotalPages(response.data.totalPages || 1);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    }
  }, [isAuthenticated]);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== '') {
        fetchFiles(1, searchQuery);
      } else {
        fetchFiles(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle file operations
  const handleFileDownload = async (file: FileItem) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${apiUrl}/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Open the download URL in a new tab
      window.open(response.data.downloadUrl, '_blank');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download file');
    }
  };

  const handleFileDelete = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${file.filename}"?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${apiUrl}/files/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSuccess(`${file.filename} moved to recycle bin`);
      await fetchFiles(page, searchQuery);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleFileShare = (file: FileItem) => {
    // TODO: Implement share modal
    alert(`Share functionality for ${file.filename} coming soon!`);
  };

  const handleFileClick = (file: FileItem) => {
    // Navigate to file viewer
    router.push(`/files/${file.id}`);
  };

  const handleUploadComplete = () => {
    fetchFiles(page, searchQuery);
  };

  // Sort files
  const sortedFiles = React.useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.filename.toLowerCase();
          bValue = b.filename.toLowerCase();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'date':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [files, sortBy, sortOrder]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="icon-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Files</h1>
              <p className="text-gray-600 flex items-center space-x-2">
                <span>{files.length} files</span>
                <span className="text-gray-400">•</span>
                <span>{user?.storageUsed ? Math.round((user.storageUsed / (1024 * 1024 * 1024)) * 100) / 100 : 0}GB used</span>
                <span className="text-gray-400">•</span>
                <span className="text-green-600 font-medium">5GB available</span>
              </p>
            </div>
          </div>

          {/* Enhanced Toolbar with Better Icon Placement and Grouping */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4">
            {/* Primary Actions Group - Better Icon Placement */}
            <div className="flex items-center gap-2">
              <button className="flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl group">
                <svg className="w-4 h-4 mr-2.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Files
              </button>
              
              <button className="flex items-center px-4 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-all duration-200 hover:border-gray-400 hover:shadow-md group">
                <svg className="w-4 h-4 mr-2.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Folder
              </button>

              {/* Quick Action Icons */}
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-300">
                <button 
                  className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                  title="Refresh"
                  onClick={() => fetchFiles(page, searchQuery)}
                >
                  <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                <button 
                  className="p-2.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 group"
                  title="Select All"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Enhanced Search Interface with Better Styling */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Improved Search with Advanced Features */}
              <div className="relative flex-1 max-w-lg">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search files, folders, and content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-16 py-3.5 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 hover:shadow-sm text-sm font-medium"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* Enhanced Search Actions */}
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                        title="Clear search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <button
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                      title="Advanced search filters"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Search Suggestions/Results Preview */}
                {searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-40 max-h-64 overflow-y-auto">
                    <div className="p-3 border-b border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search Results</div>
                    </div>
                    <div className="p-2">
                      <div className="text-sm text-gray-600 px-3 py-2">
                        {files.length > 0 ? `Found ${files.length} files` : 'No files found'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced File Type Filter */}
              <div className="relative">
                <select 
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-3.5 pr-10 text-sm font-semibold text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer min-w-[130px] hover:shadow-sm"
                >
                  <option value="">All Types</option>
                  <option value="image">📷 Images</option>
                  <option value="document">📄 Documents</option>
                  <option value="video">🎥 Videos</option>
                  <option value="audio">🎵 Audio</option>
                  <option value="archive">📦 Archives</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Better View Toggle and Sorting Controls */}
            <div className="flex items-center gap-3">
              {/* Enhanced View Mode Toggle with Better Styling */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center px-3.5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-blue-700 shadow-md ring-1 ring-blue-200 transform scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  title="Grid view"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center px-3.5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white text-blue-700 shadow-md ring-1 ring-blue-200 transform scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  title="List view"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  List
                </button>
              </div>

              {/* Enhanced Sort Options with Better Visual Design */}
              <div className="relative">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-3.5 pr-10 text-sm font-semibold text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer min-w-[150px] hover:shadow-sm"
                >
                  <option value="name-asc">📝 Name A-Z</option>
                  <option value="name-desc">📝 Name Z-A</option>
                  <option value="date-desc">🕒 Newest first</option>
                  <option value="date-asc">🕒 Oldest first</option>
                  <option value="size-desc">📊 Largest first</option>
                  <option value="size-asc">📊 Smallest first</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Enhanced More Actions Menu */}
              <div className="relative">
                <button 
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 group border border-gray-300 hover:border-gray-400 hover:shadow-sm"
                  title="More actions"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {/* Enhanced More Actions Dropdown */}
                {showMoreActions && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-scale-in">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">File Actions</div>
                    </div>
                    
                    <button className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 group">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors duration-200">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Select All</div>
                        <div className="text-xs text-gray-500">Select all visible files</div>
                      </div>
                    </button>
                    
                    <button className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:text-green-700 transition-all duration-200 group">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors duration-200">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Share Selected</div>
                        <div className="text-xs text-gray-500">Share files with others</div>
                      </div>
                    </button>
                    
                    <button className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 group">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors duration-200">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Download Selected</div>
                        <div className="text-xs text-gray-500">Download as ZIP archive</div>
                      </div>
                    </button>
                    
                    <div className="border-t border-gray-100 my-2"></div>
                    
                    <button className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200 group">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-200 transition-colors duration-200">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Delete Selected</div>
                        <div className="text-xs text-gray-500">Move to recycle bin</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Notifications */}
      {error && (
        <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-red-100 rounded-md flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            <button 
              onClick={clearMessages} 
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-900">Success</p>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
            <button 
              onClick={clearMessages} 
              className="p-2 text-green-400 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* File Uploader */}
      <FileUploader
        onUploadComplete={handleUploadComplete}
        maxFiles={10}
        maxSize={100 * 1024 * 1024} // 100MB
      />

      {/* Files Grid/List */}
      <FileGrid
        files={sortedFiles}
        loading={loading}
        viewMode={viewMode}
        onFileClick={handleFileClick}
        onFileDownload={handleFileDownload}
        onFileDelete={handleFileDelete}
        onFileShare={handleFileShare}
      />

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Showing page {page} of {totalPages} • {files.length} files
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchFiles(page - 1, searchQuery)}
                disabled={page <= 1}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:border-gray-400"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchFiles(pageNum, searchQuery)}
                      className={`w-10 h-10 text-sm font-semibold rounded-xl transition-all duration-200 ${
                        pageNum === page
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => fetchFiles(page + 1, searchQuery)}
                disabled={page >= totalPages}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:border-gray-400"
              >
                Next
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}