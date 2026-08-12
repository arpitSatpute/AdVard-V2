import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  File,
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Search,
  HardDrive,
  Grid,
  List,
  Edit2,
  FolderDown,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  Sparkles,
  ChevronRight,
  FolderPlus,
  ArrowDownToLine,
  Eye,
  X,
  Maximize2,
  Info,
  Pause,
  Play,
  Square,
} from 'lucide-react';
import {
  listDirectory,
  createDirectory,
  deleteRemoteFile,
  renameRemoteFile,
  pushPaths,
  pullPathTo,
  pushFile,
  pushFolder,
  getPathForFile,
  getFilePreview,
  pauseTransfer,
  resumeTransfer,
  cancelTransfer,
} from '../services/electronApi';


import type { FileItem, FilePreviewData } from '../types/device';
import { useToast } from './Toast';


interface FileSharingSystemProps {
  serial: string;
}

// Quick shortcuts for common Android directories
const SHORTCUTS = [
  { name: 'Internal Storage', path: '/storage/emulated/0/', icon: HardDrive },
  { name: 'SD Card Symlink', path: '/sdcard/', icon: HardDrive },
  { name: 'Root (/)', path: '/', icon: Folder },
  { name: 'Downloads', path: '/storage/emulated/0/Download/', icon: FolderDown },
  { name: 'DCIM (Photos)', path: '/storage/emulated/0/DCIM/', icon: ImageIcon },
  { name: 'Pictures', path: '/storage/emulated/0/Pictures/', icon: ImageIcon },
  { name: 'Documents', path: '/storage/emulated/0/Documents/', icon: FileText },
  { name: 'Music', path: '/storage/emulated/0/Music/', icon: Music },
  { name: 'Movies', path: '/storage/emulated/0/Movies/', icon: Video },
];

function getFileIcon(fileName: string, isDirectory: boolean) {
  if (isDirectory) return <Folder className="w-5 h-5 text-amber-400 shrink-0" />;

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />;
    case 'mp4':
    case 'mkv':
    case 'avi':
    case 'mov':
    case 'webm':
      return <Video className="w-5 h-5 text-purple-400 shrink-0" />;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
    case 'ogg':
      return <Music className="w-5 h-5 text-pink-400 shrink-0" />;
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return <Archive className="w-5 h-5 text-amber-500 shrink-0" />;
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
      return <FileText className="w-5 h-5 text-blue-400 shrink-0" />;
    case 'js':
    case 'ts':
    case 'tsx':
    case 'json':
    case 'html':
    case 'css':
    case 'py':
      return <FileCode className="w-5 h-5 text-cyan-400 shrink-0" />;
    case 'apk':
      return <FileCheck className="w-5 h-5 text-green-400 shrink-0" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />;
    default:
      return <File className="w-5 h-5 text-gray-400 shrink-0" />;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileSharingSystem({ serial }: FileSharingSystemProps) {
  const [currentPath, setCurrentPath] = useState<string>('/storage/emulated/0/');
  const [editablePath, setEditablePath] = useState<string>('/storage/emulated/0/');
  const [isEditingPath, setIsEditingPath] = useState<boolean>(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const dragCounter = useRef<number>(0);

  // File Transfer Progress Status State
  const [transferStatus, setTransferStatus] = useState<{
    active: boolean;
    type: 'upload' | 'download';
    title: string;
    currentCount: number;
    totalCount: number;
    percentage: number;
    currentFile: string;
    destination: string;
  } | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const handlePauseTransfer = async () => {
    try {
      const res = await pauseTransfer();
      if (res.success) {
        setIsPaused(true);
        showToast('File transfer paused ⏸', 'info');
      }
    } catch {
      showToast('Could not pause transfer', 'error');
    }
  };

  const handleResumeTransfer = async () => {
    try {
      const res = await resumeTransfer();
      if (res.success) {
        setIsPaused(false);
        showToast('File transfer resumed ▶', 'success');
      }
    } catch {
      showToast('Could not resume transfer', 'error');
    }
  };

  const handleCancelTransfer = async () => {
    try {
      await cancelTransfer();
      setTransferStatus(null);
      setIsPaused(false);
      showToast('File transfer cancelled 🛑', 'error');
    } catch {
      showToast('Error cancelling transfer', 'error');
    }
  };



  // File & Folder Preview State
  const [previewItem, setPreviewItem] = useState<{
    file: FileItem;
    data?: FilePreviewData;
    loading: boolean;
  } | null>(null);
  const [showPreviewDrawer, setShowPreviewDrawer] = useState<boolean>(true);
  const [expandedImageModal, setExpandedImageModal] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchPreview = async (file: FileItem) => {
    if (file.isDirectory) {
      setPreviewItem({ file, loading: false, data: { type: 'binary' } });
      return;
    }
    setPreviewItem({ file, loading: true });
    try {
      const res = await getFilePreview(serial, file.path);
      if (res.success && res.data) {
        setPreviewItem({ file, loading: false, data: res.data });
      } else {
        setPreviewItem({ file, loading: false, data: { type: 'binary' } });
      }
    } catch {
      setPreviewItem({ file, loading: false, data: { type: 'binary' } });
    }
  };

  const loadFiles = async (dirPath: string) => {
    setIsLoading(true);
    setPreviewItem(null);
    try {
      let target = dirPath.trim();
      if (!target.endsWith('/')) target += '/';

      let res = await listDirectory(serial, target);

      // Fallback logic if /storage/emulated/0/ or /sdcard/ fails on specific ROMs
      if (!res.success && (target === '/storage/emulated/0/' || target === '/sdcard/')) {
        const altTarget = target === '/storage/emulated/0/' ? '/sdcard/' : '/storage/emulated/0/';
        res = await listDirectory(serial, altTarget);
        if (res.success) {
          target = altTarget;
        }
      }

      if (res.success && res.data) {
        setFiles(res.data);
        setCurrentPath(target);
        setEditablePath(target);
        setSelectedPaths([]);
      } else {
        showToast(res.error ?? `Failed to read directory: ${target}`, 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error reading folder', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles('/storage/emulated/0/');
  }, [serial]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.android?.onTransferProgress) {
      const cleanup = window.android.onTransferProgress((data) => {
        setTransferStatus((prev) => {
          if (!prev || !prev.active) return null;
          return {
            ...prev,
            percentage: data.percentage,
            currentFile: data.file || prev.currentFile,
          };
        });
      });
      return () => cleanup();
    }
  }, [currentPath]);



  const handleItemClick = (file: FileItem) => {
    fetchPreview(file);
    if (file.isDirectory) {
      loadFiles(file.path);
    } else {
      toggleSelect(file.path);
    }
  };


  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editablePath && editablePath.trim()) {
      loadFiles(editablePath.trim());
      setIsEditingPath(false);
    }
  };

  // Handle Drag & Drop events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    // Extract file/folder absolute local paths via getPathForFile (Electron webUtils)
    const localPaths: string[] = droppedFiles
      .map((f) => getPathForFile(f))
      .filter((p): p is string => Boolean(p && p.trim()));

    if (localPaths.length === 0) {
      showToast(
        'Could not resolve local file paths. Try using "Send to Phone" button to select files or folders.',
        'error'
      );
      return;
    }

    // Push local paths to current Android folder item by item for progress tracking
    try {
      for (let i = 0; i < localPaths.length; i++) {
        const lp = localPaths[i];
        const fileName = lp.split('/').pop() || lp;
        const startPercent = Math.round((i / localPaths.length) * 100);

        setTransferStatus({
          active: true,
          type: 'upload',
          title: `Sending Files to Phone`,
          currentCount: i + 1,
          totalCount: localPaths.length,
          percentage: startPercent,
          currentFile: fileName,
          destination: currentPath,
        });

        const res = await pushPaths(serial, [lp], currentPath);
        if (!res.success) {
          showToast(res.error ?? `Failed to transfer "${fileName}"`, 'error');
          break;
        }
      }

      showToast(`Successfully transferred ${localPaths.length} item(s) to phone!`, 'success');
      loadFiles(currentPath);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error transferring files', 'error');
    } finally {
      setTransferStatus(null);
    }
  };


  const handleNavigateUp = () => {
    if (currentPath === '/' || currentPath === '/storage/emulated/0/' || currentPath === '/sdcard/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/') + '/';
    loadFiles(parentPath);
  };

  const handleBreadcrumbClick = (index: number, parts: string[]) => {
    const targetPath = '/' + parts.slice(0, index + 1).join('/') + '/';
    loadFiles(targetPath);
  };

  const toggleSelect = (filePath: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setSelectedPaths((prev) =>
      prev.includes(filePath) ? prev.filter((p) => p !== filePath) : [...prev, filePath]
    );
  };

  const handleSelectAll = () => {

    if (selectedPaths.length === filteredFiles.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(filteredFiles.map((f) => f.path));
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

  const handleRename = async () => {
    if (selectedPaths.length !== 1) return;
    const item = files.find((f) => f.path === selectedPaths[0]);
    if (!item) return;

    const newName = prompt('Enter new name:', item.name);
    if (!newName || !newName.trim() || newName.trim() === item.name) return;

    const newPath = `${currentPath}${newName.trim()}${item.isDirectory ? '/' : ''}`;
    try {
      const res = await renameRemoteFile(serial, item.path, newPath);
      if (res.success) {
        showToast(`Renamed to "${newName.trim()}"`, 'success');
        loadFiles(currentPath);
      } else {
        showToast(res.error ?? 'Failed to rename', 'error');
      }
    } catch {
      showToast('Error renaming item', 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPaths.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedPaths.length} selected item(s) from phone?`
      )
    )
      return;

    setIsLoading(true);
    let successCount = 0;
    for (const p of selectedPaths) {
      try {
        const res = await deleteRemoteFile(serial, p);
        if (res.success) successCount++;
      } catch {
        // Continue
      }
    }
    showToast(`Deleted ${successCount} item(s)`, 'info');
    loadFiles(currentPath);
  };

  const handleManualUpload = async () => {
    setTransferStatus({
      active: true,
      type: 'upload',
      title: 'Sending Files to Phone',
      currentCount: 1,
      totalCount: 1,
      percentage: 50,
      currentFile: 'Selecting files for transfer…',
      destination: currentPath,
    });

    try {
      const res = await pushFile(serial, currentPath);
      if (res.success) {
        setTransferStatus((prev) => prev ? { ...prev, percentage: 100 } : null);
        showToast('Files transferred successfully to phone!', 'success');
        loadFiles(currentPath);
      } else if (res.error !== 'No files selected' && res.error !== 'No files or folders selected') {
        showToast(res.error ?? 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload error', 'error');
    } finally {
      setTransferStatus(null);
    }
  };

  const handleManualUploadFolder = async () => {
    setTransferStatus({
      active: true,
      type: 'upload',
      title: 'Sending Folder to Phone',
      currentCount: 1,
      totalCount: 1,
      percentage: 50,
      currentFile: 'Selecting folder for transfer…',
      destination: currentPath,
    });

    try {
      const res = await pushFolder(serial, currentPath);
      if (res.success) {
        setTransferStatus((prev) => prev ? { ...prev, percentage: 100 } : null);
        showToast('Folder transferred successfully to phone!', 'success');
        loadFiles(currentPath);
      } else if (res.error !== 'No folder selected') {
        showToast(res.error ?? 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload error', 'error');
    } finally {
      setTransferStatus(null);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedPaths.length === 0) return;

    try {
      let targetDest: string | undefined = undefined;

      for (let i = 0; i < selectedPaths.length; i++) {
        const remoteP = selectedPaths[i];
        const fileName = remoteP.split('/').pop() || remoteP;
        const startPercent = Math.round((i / selectedPaths.length) * 100);

        setTransferStatus({
          active: true,
          type: 'download',
          title: `Downloading to Laptop`,
          currentCount: i + 1,
          totalCount: selectedPaths.length,
          percentage: startPercent,
          currentFile: fileName,
          destination: targetDest || 'Laptop Downloads',
        });


        const res = await pullPathTo(serial, remoteP, targetDest);
        if (!res.success) {
          if (res.error !== 'Destination selection cancelled') {
            showToast(res.error ?? 'Download failed', 'error');
          }
          break;
        }
        if (!targetDest && res.data) {
          targetDest = res.data;
        }
      }
      showToast(`Downloaded ${selectedPaths.length} item(s) to laptop`, 'success');
    } catch {
      showToast('Download error', 'error');
    } finally {
      setTransferStatus(null);
    }
  };


  // Filter & Sort
  const filteredFiles = files
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Folders first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        cmp = a.size - b.size;
      } else if (sortBy === 'date') {
        cmp = a.modifiedDate.localeCompare(b.modifiedDate);
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="w-full flex flex-col">
      {/* Main File Sharing Container Window */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative bg-surface-800 rounded-3xl border border-surface-600 shadow-2xl flex flex-col h-[680px] overflow-hidden select-none"
      >

      {/* Visual Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-accent/90 backdrop-blur-md flex flex-col items-center justify-center text-white border-4 border-dashed border-white/60 m-2 rounded-2xl animate-pulse">
          <ArrowDownToLine className="w-16 h-16 mb-4 animate-bounce text-white" />
          <h2 className="text-2xl font-bold tracking-wide">Drop Files or Folders Here</h2>
          <p className="text-sm opacity-90 mt-1 font-mono">
            Transfer directly to phone: {currentPath}
          </p>
        </div>
      )}



      {/* Header bar */}
      <div className="p-4 border-b border-surface-600 bg-surface-900/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/20 border border-accent/40 text-accent-light">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              File Sharing & Phone Explorer
            </h2>
            <p className="text-[11px] text-gray-400">
              Drag & drop files or folders to transfer to Android device
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreviewDrawer(!showPreviewDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              showPreviewDrawer
                ? 'bg-accent/20 border-accent/40 text-accent-light'
                : 'bg-surface-700 hover:bg-surface-600 border-surface-500 text-gray-300'
            }`}
            title="Toggle File & Folder Preview Panel"
          >
            <Eye size={14} /> {showPreviewDrawer ? 'Hide Preview' : 'Show Preview'}
          </button>

          <button
            onClick={handleManualUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-medium shadow-md shadow-accent/20 transition-all"
            title="Transfer files to phone"
          >
            <Upload size={14} /> Send Files
          </button>

          <button
            onClick={handleManualUploadFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-200 text-xs font-medium transition-all"
            title="Transfer an entire folder to phone"
          >
            <FolderPlus size={14} className="text-accent-light" /> Send Folder
          </button>


          <button
            onClick={handleDownloadSelected}
            disabled={selectedPaths.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-200 text-xs font-medium disabled:opacity-40 transition-all"
          >
            <Download size={14} /> Get on Laptop
            {selectedPaths.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent text-[10px] text-white">
                {selectedPaths.length}
              </span>
            )}
          </button>
        </div>
      </div>


      {/* Main Content Area (Sidebar + File Browser) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Quick Shortcuts Sidebar */}
        <div className="w-52 bg-surface-900/50 border-r border-surface-600/70 p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">
            Phone Shortcuts
          </div>
          {SHORTCUTS.map((sc) => {
            const IconComponent = sc.icon;
            const isActive = currentPath === sc.path;
            return (
              <button
                key={sc.path}
                onClick={() => loadFiles(sc.path)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors text-left font-medium ${
                  isActive
                    ? 'bg-accent/20 text-accent-light border border-accent/30 font-semibold'
                    : 'text-gray-400 hover:bg-surface-700/60 hover:text-gray-200'
                }`}
              >
                <IconComponent size={15} className={isActive ? 'text-accent-light' : 'text-gray-500'} />
                <span className="truncate">{sc.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Browser Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-800/40">
          {/* Breadcrumbs & Editable Path Navigation Bar */}
          <div className="px-4 py-2.5 border-b border-surface-600 bg-surface-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={handleNavigateUp}
                disabled={currentPath === '/' || currentPath === '/storage/emulated/0/' || currentPath === '/sdcard/'}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-300 disabled:opacity-30 shrink-0"
                title="Parent Directory"
              >
                <ArrowLeft size={14} />
              </button>

              {/* Path Input Form / Breadcrumb Display */}
              <form onSubmit={handlePathSubmit} className="flex-1 flex items-center gap-1.5 min-w-0">
                <div className="flex-1 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-900 border border-surface-600/80 text-xs font-mono text-gray-300 overflow-x-auto">
                  <HardDrive size={14} className="text-accent-light shrink-0 mr-1" />
                  {isEditingPath ? (
                    <input
                      type="text"
                      value={editablePath}
                      onChange={(e) => setEditablePath(e.target.value)}
                      onBlur={() => {
                        if (!editablePath.trim()) setEditablePath(currentPath);
                      }}
                      autoFocus
                      className="w-full bg-transparent outline-none text-white font-mono text-xs"
                      placeholder="Type phone location e.g. /storage/emulated/0/"
                    />
                  ) : (
                    <div
                      onClick={() => setIsEditingPath(true)}
                      className="flex items-center gap-1 cursor-text w-full overflow-x-auto select-text"
                      title="Click to edit path"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadFiles('/');
                        }}
                        className="hover:text-accent-light text-gray-400"
                      >
                        /
                      </button>
                      {pathParts.map((part, idx) => (
                        <React.Fragment key={idx}>
                          <ChevronRight size={12} className="text-gray-600 shrink-0" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBreadcrumbClick(idx, pathParts);
                            }}
                            className="hover:text-accent-light truncate max-w-[140px] text-gray-200"
                          >
                            {part}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent-light text-xs font-medium shrink-0"
                >
                  Go
                </button>
              </form>
            </div>

            {/* View Mode & Folder Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleCreateFolder}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-300"
                title="New Folder"
              >
                <FolderPlus size={15} />
              </button>

              <button
                onClick={handleRename}
                disabled={selectedPaths.length !== 1}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-300 disabled:opacity-30"
                title="Rename Item"
              >
                <Edit2 size={15} />
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={selectedPaths.length === 0}
                className="p-1.5 rounded-lg bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30 disabled:opacity-30"
                title="Delete Selected"
              >
                <Trash2 size={15} />
              </button>

              <button
                onClick={() => loadFiles(currentPath)}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-300 disabled:opacity-30"
                title="Refresh"
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              </button>

              <div className="h-4 w-px bg-surface-600 mx-1" />

              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg border ${
                  viewMode === 'list'
                    ? 'bg-accent/20 border-accent/40 text-accent-light'
                    : 'bg-surface-700 border-surface-500 text-gray-400 hover:text-gray-200'
                }`}
                title="List View"
              >
                <List size={15} />
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg border ${
                  viewMode === 'grid'
                    ? 'bg-accent/20 border-accent/40 text-accent-light'
                    : 'bg-surface-700 border-surface-500 text-gray-400 hover:text-gray-200'
                }`}
                title="Grid View"
              >
                <Grid size={15} />
              </button>
            </div>
          </div>

          {/* Search & Sort Filter Bar */}
          <div className="px-4 py-2 bg-surface-900/40 border-b border-surface-600/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-surface-900/80 px-3 py-1.5 rounded-xl border border-surface-600">
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files or folders in current directory…"
                className="w-full bg-transparent text-xs text-gray-200 outline-none placeholder-gray-500"
              />
            </div>

            <div className="flex items-center gap-3 text-gray-400">
              <span className="text-[11px]">
                {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else {
                    setSortBy('name');
                    setSortOrder('asc');
                  }
                }}
                className={`hover:text-gray-200 ${sortBy === 'name' ? 'text-accent-light font-semibold' : ''}`}
              >
                Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'size') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else {
                    setSortBy('size');
                    setSortOrder('desc');
                  }
                }}
                className={`hover:text-gray-200 ${sortBy === 'size' ? 'text-accent-light font-semibold' : ''}`}
              >
                Size {sortBy === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </button>
            </div>
          </div>

          {/* File View Container */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-3">
                <RefreshCw size={24} className="animate-spin text-accent-light" />
                Loading phone directory...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
                <Folder className="w-12 h-12 stroke-[1] mb-2 opacity-40 text-gray-400" />
                <p className="text-sm font-medium text-gray-400">Folder is empty</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Drag and drop files or folders anywhere onto this window to send them to your phone.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              /* LIST VIEW */
              <div className="space-y-1">
                {/* List Header */}
                <div className="grid grid-cols-12 px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-surface-600/50">
                  <div className="col-span-7 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        filteredFiles.length > 0 &&
                        selectedPaths.length === filteredFiles.length
                      }
                      onChange={handleSelectAll}
                      className="rounded accent-accent"
                    />
                    <span>Name</span>
                  </div>
                  <span className="col-span-2">Size</span>
                  <span className="col-span-3 text-right">Modified</span>
                </div>

                {filteredFiles.map((file) => {
                  const isSelected = selectedPaths.includes(file.path);
                  return (
                    <div
                      key={file.path}
                      onClick={() => handleItemClick(file)}
                      className={`grid grid-cols-12 px-3 py-2.5 items-center text-xs rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-accent/20 border border-accent/40 text-white font-medium shadow-sm'
                          : 'hover:bg-surface-700/60 border border-transparent text-gray-300'
                      }`}
                    >
                      <div className="col-span-7 flex items-center gap-3 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelect(file.path, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded accent-accent"
                        />
                        {getFileIcon(file.name, file.isDirectory)}
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className="col-span-2 text-gray-400 font-mono text-[11px]">
                        {file.isDirectory ? 'Directory' : formatBytes(file.size)}
                      </span>
                      <span className="col-span-3 text-right text-gray-500 text-[11px] truncate">
                        {file.modifiedDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* GRID VIEW */
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {filteredFiles.map((file) => {
                  const isSelected = selectedPaths.includes(file.path);
                  return (
                    <div
                      key={file.path}
                      onClick={() => handleItemClick(file)}
                      className={`group relative p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-accent/20 border-accent text-white shadow-md'
                          : 'bg-surface-900/60 hover:bg-surface-700/80 border-surface-600/60 text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelect(file.path, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 left-2 rounded accent-accent opacity-70 group-hover:opacity-100"
                      />

                      <div className="my-2 p-3 rounded-2xl bg-surface-800/80 group-hover:scale-105 transition-transform">
                        {getFileIcon(file.name, file.isDirectory)}
                      </div>

                      <span className="text-xs font-medium truncate w-full px-1">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {file.isDirectory ? 'Folder' : formatBytes(file.size)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Preview Side Panel */}
        {showPreviewDrawer && (
          <div className="w-80 bg-surface-900/90 border-l border-surface-600/80 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 transition-all select-text">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-surface-600/80 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                <Info size={15} className="text-accent-light" />
                <span>Preview & Inspector</span>
              </div>
              <button
                onClick={() => setShowPreviewDrawer(false)}
                className="p-1 rounded-lg hover:bg-surface-700 text-gray-400 hover:text-gray-200"
                title="Close Inspector"
              >
                <X size={14} />
              </button>
            </div>

            {/* Panel Content */}
            {!previewItem ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500 gap-2">
                <Eye className="w-10 h-10 opacity-30 text-gray-400" />
                <p className="text-xs font-medium text-gray-400">No Item Selected</p>
                <p className="text-[11px] text-gray-500 max-w-[200px]">
                  Click any file or folder to view real-time live preview, image inspector, or text contents.
                </p>
              </div>
            ) : previewItem.loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs gap-3">
                <RefreshCw size={22} className="animate-spin text-accent-light" />
                Loading preview from phone...
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4">
                {/* File Header Card */}
                <div className="bg-surface-800/80 p-3.5 rounded-2xl border border-surface-600/80 flex flex-col items-center text-center">
                  <div className="p-3 rounded-2xl bg-surface-900 mb-2 border border-surface-600/50">
                    {getFileIcon(previewItem.file.name, previewItem.file.isDirectory)}
                  </div>
                  <h3 className="text-xs font-bold text-gray-100 break-all px-1">
                    {previewItem.file.name}
                  </h3>
                  <span className="text-[10px] font-mono text-accent-light bg-accent/15 px-2 py-0.5 rounded-full mt-1">
                    {previewItem.file.isDirectory
                      ? 'Directory Folder'
                      : previewItem.data?.type === 'image'
                      ? 'Image File'
                      : previewItem.data?.type === 'text'
                      ? 'Text Document'
                      : 'File'}
                  </span>
                </div>

                {/* Live Content Preview */}
                {previewItem.data?.type === 'image' && previewItem.data.content && (
                  <div className="group relative bg-black/60 rounded-2xl border border-surface-600 overflow-hidden flex items-center justify-center min-h-[160px] max-h-[220px]">
                    <img
                      src={previewItem.data.content}
                      alt={previewItem.file.name}
                      className="max-h-[220px] w-auto object-contain cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() => setExpandedImageModal(previewItem.data?.content || null)}
                    />
                    <button
                      onClick={() => setExpandedImageModal(previewItem.data?.content || null)}
                      className="absolute bottom-2 right-2 p-1.5 rounded-xl bg-black/70 text-white hover:bg-accent text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Maximize2 size={13} /> Zoom
                    </button>
                  </div>
                )}

                {previewItem.data?.type === 'text' && previewItem.data.content && (
                  <div className="bg-surface-900 p-3 rounded-2xl border border-surface-600/80 max-h-[220px] overflow-y-auto">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 border-b border-surface-700 pb-1">
                      Text Contents Preview
                    </div>
                    <pre className="text-[11px] font-mono text-gray-300 whitespace-pre-wrap leading-relaxed select-text">
                      {previewItem.data.content}
                    </pre>
                  </div>
                )}

                {/* Properties Table */}
                <div className="bg-surface-800/60 p-3 rounded-2xl border border-surface-600/60 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Item Metadata
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Path</span>
                    <span className="font-mono text-gray-200 truncate max-w-[170px]" title={previewItem.file.path}>
                      {previewItem.file.path}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Size</span>
                    <span className="font-mono text-gray-200">
                      {previewItem.file.isDirectory ? '—' : formatBytes(previewItem.file.size)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Permissions</span>
                    <span className="font-mono text-amber-400">{previewItem.file.permissions}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Modified</span>
                    <span className="text-gray-300 truncate max-w-[150px]">
                      {previewItem.file.modifiedDate}
                    </span>
                  </div>
                </div>

                {/* Context Action Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  {previewItem.file.isDirectory ? (
                    <button
                      onClick={() => loadFiles(previewItem.file.path)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-semibold shadow-md shadow-accent/20"
                    >
                      <Folder className="w-4 h-4" /> Open Folder
                    </button>
                  ) : null}

                  <button
                    onClick={async () => {
                      const res = await pullPathTo(serial, previewItem.file.path);
                      if (res.success) showToast(`Downloaded to ${res.data}`, 'success');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-surface-700 hover:bg-surface-600 text-gray-100 text-xs font-medium border border-surface-500"
                  >
                    <Download className="w-4 h-4 text-accent-light" /> Download to Laptop
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${previewItem.file.name}" from phone?`)) return;
                      const res = await deleteRemoteFile(serial, previewItem.file.path);
                      if (res.success) {
                        showToast(`Deleted ${previewItem.file.name}`, 'info');
                        setPreviewItem(null);
                        loadFiles(currentPath);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30 text-xs font-medium"
                  >
                    <Trash2 className="w-4 h-4" /> Delete from Phone
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Image Preview Modal */}
      {expandedImageModal && (
        <div
          onClick={() => setExpandedImageModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
        >
          <button
            onClick={() => setExpandedImageModal(null)}
            className="absolute top-4 right-4 p-2 rounded-2xl bg-surface-800 text-white hover:bg-surface-700"
          >
            <X size={20} />
          </button>
          <img
            src={expandedImageModal}
            alt="Full Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-surface-600"
          />
        </div>
      )}
      </div>

      {/* Background File Transfer Controls Dock (Positioned below main file sharing window) */}
      {transferStatus && transferStatus.active && (
        <div className="mt-4 bg-surface-900 border border-surface-600/90 rounded-2xl p-4 shadow-xl select-none">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-2xl border ${
                isPaused
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-accent/20 border-accent/40 text-accent-light'
              }`}>
                {transferStatus.type === 'upload' ? (
                  <Upload size={18} className={isPaused ? '' : 'animate-bounce'} />
                ) : (
                  <Download size={18} className={isPaused ? '' : 'animate-bounce'} />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-100">{transferStatus.title}</h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isPaused
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-accent/20 text-accent-light border-accent/30'
                  }`}>
                    {isPaused ? 'PAUSED ⏸' : transferStatus.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 font-mono truncate max-w-lg mt-0.5">
                  {transferStatus.currentFile}
                </p>
              </div>
            </div>

            {/* Controls (Pause, Resume, Cancel) */}
            <div className="flex items-center gap-2 shrink-0">
              {isPaused ? (
                <button
                  onClick={handleResumeTransfer}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                  title="Resume background transfer"
                >
                  <Play size={14} /> Resume
                </button>
              ) : (
                <button
                  onClick={handlePauseTransfer}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all"
                  title="Pause background transfer"
                >
                  <Pause size={14} /> Pause
                </button>
              )}

              <button
                onClick={handleCancelTransfer}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-danger/20 hover:bg-danger/30 text-danger border border-danger/40 text-xs font-semibold transition-all"
                title="Cancel background transfer"
              >
                <Square size={14} /> Cancel
              </button>

              <div className="ml-2 text-right">
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {transferStatus.percentage}%
                </span>
                <div className="text-[10px] text-gray-400 font-mono">
                  Item {transferStatus.currentCount} of {transferStatus.totalCount}
                </div>
              </div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-surface-950 border border-surface-600/80 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
                isPaused
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-accent via-accent-light to-emerald-400 shadow-md'
              }`}
              style={{ width: `${Math.max(4, transferStatus.percentage)}%` }}
            >
              {!isPaused && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



