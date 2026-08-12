import { useState, useEffect } from 'react';
import {
  Folder,
  File,
  ArrowLeft,
  Upload,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  HardDrive,
} from 'lucide-react';
import {
  listDirectory,
  createDirectory,
  deleteRemoteFile,
  pushFile,
  pullFile,
} from '../services/electronApi';
import type { FileItem } from '../types/device';
import { useToast } from './Toast';

interface FileManagerProps {
  serial: string;
}

export function FileManager({ serial }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState<string>('/sdcard/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const { showToast } = useToast();

  const loadFiles = async (dirPath: string) => {
    setIsLoading(true);
    try {
      const res = await listDirectory(serial, dirPath);
      if (res.success && res.data) {
        setFiles(res.data);
        setCurrentPath(dirPath.endsWith('/') ? dirPath : `${dirPath}/`);
        setSelectedFile(null);
      } else {
        showToast(res.error ?? 'Failed to read directory', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error reading folder', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles('/sdcard/');
  }, [serial]);

  const handleNavigateUp = () => {
    if (currentPath === '/' || currentPath === '/sdcard/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/') + '/';
    loadFiles(parentPath);
  };

  const handleItemClick = (file: FileItem) => {
    setSelectedFile(file);
    if (file.isDirectory) {
      loadFiles(file.path);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;

    const newDirPath = `${currentPath}${folderName.trim()}/`;
    try {
      const res = await createDirectory(serial, newDirPath);
      if (res.success) {
        showToast(`Created folder "${folderName}"`, 'success');
        loadFiles(currentPath);
      } else {
        showToast(res.error ?? 'Failed to create folder', 'error');
      }
    } catch {
      showToast('Error creating folder', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    if (!confirm(`Are you sure you want to delete "${selectedFile.name}"?`)) return;

    try {
      const res = await deleteRemoteFile(serial, selectedFile.path);
      if (res.success) {
        showToast(`Deleted ${selectedFile.name}`, 'info');
        loadFiles(currentPath);
      } else {
        showToast(res.error ?? 'Failed to delete file', 'error');
      }
    } catch {
      showToast('Error deleting file', 'error');
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const res = await pushFile(serial, currentPath);
      if (res.success) {
        showToast('File uploaded successfully!', 'success');
        loadFiles(currentPath);
      } else if (res.error !== 'No file selected') {
        showToast(res.error ?? 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload error', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedFile || selectedFile.isDirectory) return;

    setIsDownloading(true);
    try {
      const res = await pullFile(serial, selectedFile.path);
      if (res.success) {
        showToast(`Saved to ${res.data}`, 'success');
      } else if (res.error !== 'Save cancelled') {
        showToast(res.error ?? 'Download failed', 'error');
      }
    } catch {
      showToast('Download error', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 overflow-hidden flex flex-col h-[520px]">
      {/* Top Action Bar */}
      <div className="p-3 border-b border-surface-600 bg-surface-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={handleNavigateUp}
            disabled={currentPath === '/sdcard/' || currentPath === '/'}
            className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-300 disabled:opacity-30"
            title="Go Parent Directory"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-900 border border-surface-600 text-xs font-mono text-gray-300 flex-1 overflow-x-auto">
            <HardDrive size={13} className="text-accent-light shrink-0" />
            <span className="truncate">{currentPath}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/40 text-accent-light hover:bg-accent/30 text-xs font-medium"
          >
            <Upload size={13} /> Upload
          </button>

          <button
            onClick={handleDownload}
            disabled={!selectedFile || selectedFile.isDirectory || isDownloading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-200 text-xs font-medium disabled:opacity-40"
          >
            <Download size={13} /> Download
          </button>

          <button
            onClick={handleCreateFolder}
            className="p-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-300"
            title="New Folder"
          >
            <Plus size={14} />
          </button>

          <button
            onClick={handleDelete}
            disabled={!selectedFile}
            className="p-1.5 rounded-lg bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30 disabled:opacity-30"
            title="Delete File"
          >
            <Trash2 size={14} />
          </button>

          <button
            onClick={() => loadFiles(currentPath)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-300 disabled:opacity-30"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="px-3 py-2 bg-surface-800/50 border-b border-surface-600 flex items-center gap-2">
        <Search size={13} className="text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter files in directory…"
          className="w-full bg-transparent text-xs text-gray-200 outline-none placeholder-gray-600"
        />
      </div>

      {/* File List Header */}
      <div className="grid grid-cols-12 px-4 py-2 border-b border-surface-600 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-surface-800/80">
        <span className="col-span-6">Name</span>
        <span className="col-span-3">Size</span>
        <span className="col-span-3 text-right">Modified</span>
      </div>

      {/* File List Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-600/40">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
            <RefreshCw size={18} className="animate-spin text-accent-light" />
            Loading folder contents…
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            Empty folder or no search matches found.
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = selectedFile?.path === file.path;
            return (
              <div
                key={file.path}
                onClick={() => handleItemClick(file)}
                className={`grid grid-cols-12 px-4 py-2.5 items-center text-xs cursor-pointer transition-colors ${isSelected
                    ? 'bg-accent/15 text-white font-medium'
                    : 'hover:bg-surface-600/50 text-gray-300'
                  }`}
              >
                <div className="col-span-6 flex items-center gap-2 truncate pr-2">
                  {file.isDirectory ? (
                    <Folder size={15} className="text-amber-400 shrink-0" />
                  ) : (
                    <File size={15} className="text-blue-400 shrink-0" />
                  )}
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="col-span-3 text-gray-400 font-mono text-[11px]">
                  {file.isDirectory ? '—' : `${(file.size / 1024).toFixed(1)} KB`}
                </span>
                <span className="col-span-3 text-right text-gray-500 text-[11px] truncate">
                  {file.modifiedDate}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
