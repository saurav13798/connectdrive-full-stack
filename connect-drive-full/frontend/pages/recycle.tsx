import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../components/Layout';

interface RecycleItem {
  id: string;
  itemName: string;
  itemType: 'file' | 'folder';
  size: number;
  deletedAt: string;
  expiresAt: string;
  originalPath: string;
}

export default function RecyclePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecycleItems();
    }
  }, [isAuthenticated]);

  const loadRecycleItems = async () => {
    try {
      const response = await axios.get('/recycle');
      setItems(response.data || []);
    } catch (err: any) {
      setError('Failed to load recycle bin');
      console.error('Error loading recycle bin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (itemId: string) => {
    if (!confirm('Are you sure you want to restore this item?')) return;

    try {
      await axios.post(`/recycle/${itemId}/restore`);
      await loadRecycleItems();
      setError(null);
    } catch (err: any) {
      setError('Failed to restore item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePermanentDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) return;

    try {
      await axios.delete(`/recycle/${itemId}`);
      await loadRecycleItems();
      setError(null);
    } catch (err: any) {
      setError('Failed to delete item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEmptyRecycleBin = async () => {
    if (!confirm('Are you sure you want to empty the recycle bin? This will permanently delete all items and cannot be undone.')) return;

    try {
      await axios.delete('/recycle');
      await loadRecycleItems();
      setError(null);
    } catch (err: any) {
      setError('Failed to empty recycle bin: ' + (err.response?.data?.message || err.message));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recycle Bin</h1>
            <p className="text-gray-600 mt-2">
              Items are automatically deleted after 30 days.
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleEmptyRecycleBin}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Empty Recycle Bin
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Deleted Items</h2>
          </div>
          
          {items.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="text-6xl mb-4">🗑️</div>
              <div className="text-lg font-medium mb-2">Recycle bin is empty</div>
              <div>Deleted files and folders will appear here.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deleted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => {
                    const daysLeft = getDaysUntilExpiry(item.expiresAt);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                                <span className="text-gray-600 text-xs font-medium">
                                  {item.itemType === 'file' ? '📄' : '📁'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.itemName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.itemType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.originalPath || '/'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.itemType === 'file' ? formatFileSize(item.size) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.deletedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            daysLeft <= 3 
                              ? 'bg-red-100 text-red-800'
                              : daysLeft <= 7
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleRestore(item.id)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete Forever
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}