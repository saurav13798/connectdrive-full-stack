import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import EnhancedUploadZone from '../components/ui/EnhancedUploadZone';
import { ToastProvider, useToast } from '../components/ui/ToastContainer';
import axios from 'axios';

function UploadPageContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle multiple file upload
  const handleUpload = async (files: File[]) => {
    if (!files || files.length === 0) {
      addToast({
        type: 'error',
        title: 'No files selected',
        message: 'Please select files to upload'
      });
      return;
    }

    setUploadedFiles([]);

    try {
      addToast({
        type: 'info',
        title: 'Upload started',
        message: `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`
      });

      const uploadPromises = files.map(async (file) => {
        try {
          // Step 1: Get presigned upload URL
          const presignedResponse = await axios.post(
            `${apiUrl}/files/presigned-upload`,
            {
              filename: file.name,
              contentType: file.type,
            },
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
            }
          );

          const { uploadUrl } = presignedResponse.data;

          // Step 2: Upload to MinIO using presigned URL
          await axios.put(uploadUrl, file, {
            headers: { 'Content-Type': file.type },
          });

          // Step 3: Confirm upload
          await axios.post(
            `${apiUrl}/files/confirm-upload`,
            {
              filename: file.name,
              size: file.size,
              mime: file.type,
              folderId: null,
            },
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
            }
          );
          
          return file.name;
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          throw new Error(`Failed to upload ${file.name}: ${err.response?.data?.message || err.message}`);
        }
      });

      const results = await Promise.allSettled(uploadPromises);
      const successful = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);
      
      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason.message);

      setUploadedFiles(successful);
      
      if (successful.length > 0) {
        addToast({
          type: 'success',
          title: 'Upload completed',
          message: `Successfully uploaded ${successful.length} file${successful.length > 1 ? 's' : ''}`
        });
      }
      
      if (failed.length > 0) {
        addToast({
          type: 'error',
          title: 'Some uploads failed',
          message: `${failed.length} file${failed.length > 1 ? 's' : ''} failed to upload`
        });
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: 'Please try again or contact support if the problem persists'
      });
    }
  };

  const handleFileProgress = (fileId: string, progress: number) => {
    // Handle individual file progress if needed
    console.log(`File ${fileId} progress: ${progress}%`);
  };

  const handleFileComplete = (fileId: string) => {
    // Handle individual file completion if needed
    console.log(`File ${fileId} completed`);
  };

  const handleFileError = (fileId: string, error: string) => {
    // Handle individual file error if needed
    console.error(`File ${fileId} error:`, error);
    addToast({
      type: 'error',
      title: 'File upload failed',
      message: error
    });
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Upload Files</h1>
        <p className="text-gray-600">Upload single or multiple files to your storage</p>
      </div>

      {/* Enhanced Upload Zone */}
      <EnhancedUploadZone
        onUpload={handleUpload}
        onFileProgress={handleFileProgress}
        onFileComplete={handleFileComplete}
        onFileError={handleFileError}
        maxFileSize={100 * 1024 * 1024} // 100MB
        maxFiles={50}
        acceptedTypes={[
          'image/*',
          'video/*',
          'audio/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/*',
          'application/zip',
          'application/x-rar-compressed',
          'application/x-7z-compressed'
        ]}
      />

      {/* Success Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p className="font-medium mb-2">Recently uploaded files:</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            {uploadedFiles.map((fileName, index) => (
              <li key={index}>{fileName}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Supported File Types</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Documents: PDF, DOC, DOCX, TXT</li>
              <li>• Images: JPG, PNG, GIF, SVG</li>
              <li>• Videos: MP4, AVI, MOV</li>
              <li>• Archives: ZIP, RAR, 7Z</li>
              <li>• And many more...</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">File Limits</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Maximum file size: 100 MB</li>
              <li>• Maximum files per upload: 50</li>
              <li>• Total storage limit: 5 GB</li>
              <li>• Virus scanning enabled</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Pro Tip</p>
              <p className="text-sm text-blue-700 mt-1">
                You can select multiple files at once by holding Ctrl (Windows) or Cmd (Mac) while clicking files, 
                or simply drag and drop an entire folder to upload all files at once.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <button
          onClick={() => router.push('/files')}
          className="btn-secondary flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View My Files
        </button>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-ghost flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          Back to Dashboard
        </button>
      </div>
    </Layout>
  );
}

export default function UploadPage() {
  return (
    <ToastProvider>
      <UploadPageContent />
    </ToastProvider>
  );
}