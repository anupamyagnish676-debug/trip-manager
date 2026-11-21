'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Folder,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Loader2,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Trip, Member } from '@/types';

interface UploadMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  currentMember: Member;
  onUpdateTrip?: (updatedTrip: Trip) => void;
}

interface SelectedFileItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  driveFileUrl?: string;
}

export function UploadMemoriesModal({
  isOpen,
  onClose,
  trip,
  currentMember,
  onUpdateTrip,
}: UploadMemoriesModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallStatus, setOverallStatus] = useState<string>('');
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [webhookInput, setWebhookInput] = useState(
    trip.driveUploadWebhookUrl || trip.paymentMethods?.driveUploadWebhookUrl || ''
  );
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Determine member's sequential index and assigned subfolder name
  const memberIndex = trip.members.findIndex((m) => m.id === currentMember.id);
  const assignedPrefix = memberIndex >= 0 ? `${memberIndex + 1}. ` : '';
  const memberSubfolderName = `📁 ${assignedPrefix}${currentMember.name}`;

  // Direct link for the member: their custom subfolder URL or main folder
  const memberDirectDriveLink =
    currentMember.driveFolderUrl || trip.driveFolderUrl || '';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const newItems: SelectedFileItem[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '',
      status: 'idle',
    }));

    setSelectedFiles((prev) => [...prev, ...newItems]);
    // Reset file input so re-selecting same file works
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setOverallStatus(`Preparing to upload ${selectedFiles.length} item(s)...`);

    const webhookToUse =
      webhookInput.trim() ||
      trip.driveUploadWebhookUrl ||
      trip.paymentMethods?.driveUploadWebhookUrl ||
      '';

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      if (item.status === 'success') {
        successCount++;
        continue;
      }

      // Mark this file as uploading
      setSelectedFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f))
      );
      setOverallStatus(
        `Uploading ${i + 1} of ${selectedFiles.length}: "${item.file.name}"...`
      );

      try {
        const base64Data = await convertFileToBase64(item.file);

        const response = await fetch('/api/upload-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            fileName: item.file.name,
            mimeType: item.file.type,
            memberName: currentMember.name,
            memberId: currentMember.id,
            folderUrl: trip.driveFolderUrl,
            subfolderName: `${assignedPrefix}${currentMember.name}`,
            webhookUrl: webhookToUse,
            tripId: trip.id,
          }),
        });

        const data = await response.json();

        if (data.success) {
          successCount++;
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: 'success',
                    driveFileUrl: data.fileUrl,
                  }
                : f
            )
          );
        } else if (data.code === 'WEBHOOK_NOT_CONFIGURED') {
          failCount++;
          setIsSetupOpen(true);
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: 'error',
                    errorMessage:
                      'Webhook not configured. See quick 1-min setup below or tap "Open My Subfolder" to drag & drop.',
                  }
                : f
            )
          );
          setOverallStatus('Google Apps Script Webhook is required for direct upload.');
          break; // Stop loop so user can configure or open Drive directly
        } else {
          failCount++;
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: 'error',
                    errorMessage: data.error || 'Upload failed',
                  }
                : f
            )
          );
        }
      } catch (err: any) {
        failCount++;
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'error',
                  errorMessage: err?.message || 'Network error',
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);
    if (successCount === selectedFiles.length) {
      setOverallStatus(
        `🎉 All ${successCount} item(s) saved directly into Google Drive: ${memberSubfolderName}!`
      );
    } else if (successCount > 0) {
      setOverallStatus(
        `Uploaded ${successCount} file(s). ${failCount} failed or pending.`
      );
    }
  };

  const handleSaveWebhook = () => {
    if (!onUpdateTrip) return;
    setIsSavingWebhook(true);
    const updated: Trip = {
      ...trip,
      driveUploadWebhookUrl: webhookInput.trim() || undefined,
      paymentMethods: {
        ...(trip.paymentMethods || {}),
        driveUploadWebhookUrl: webhookInput.trim() || undefined,
      },
    };
    onUpdateTrip(updated);
    setTimeout(() => {
      setIsSavingWebhook(false);
      alert('Google Apps Script Webhook URL saved successfully!');
    }, 400);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyAppsScript = () => {
    const code = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var mainFolder;
    if (data.folderId) {
      try { mainFolder = DriveApp.getFolderById(data.folderId); } catch(err) {}
    }
    if (!mainFolder) {
      var folders = DriveApp.getFoldersByName("ODISHA GHUMMING 2026 - All Memories");
      mainFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder("ODISHA GHUMMING 2026 - All Memories");
    }
    var targetFolder = mainFolder;
    var subfolderName = (data.subfolderName || data.memberName || "General").toString().trim();
    if (subfolderName) {
      var subIter = mainFolder.getFoldersByName(subfolderName);
      if (subIter.hasNext()) {
        targetFolder = subIter.next();
      } else {
        targetFolder = mainFolder.createFolder(subfolderName);
      }
    }
    var base64Str = data.fileBase64.indexOf('base64,') > -1 ? data.fileBase64.split('base64,')[1] : data.fileBase64;
    var decoded = Utilities.base64Decode(base64Str);
    var blob = Utilities.newBlob(decoded, data.mimeType || "image/jpeg", data.fileName || "photo.jpg");
    var file = targetFolder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(i){}
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: file.getName(),
      subfolder: targetFolder.getName()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(code);
    alert('Google Apps Script code copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-sky-500/10 via-teal-500/10 to-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white shadow-md">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Upload Trip Memories</span>
                <Sparkles className="h-4 w-4 text-amber-500 fill-amber-400" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[240px] sm:max-w-none">
                {trip.name} • Google Drive Vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Member & Destination Subfolder Badge */}
          <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-black shadow-sm flex-shrink-0 ${currentMember.avatarColor}`}
              >
                {currentMember.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-sky-700 dark:text-sky-300 font-bold uppercase tracking-wider">
                  Target Google Drive Subfolder
                </p>
                <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {memberSubfolderName}
                </p>
              </div>
            </div>

            {memberDirectDriveLink && (
              <a
                href={memberDirectDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs font-bold transition-all shadow-sm flex-shrink-0"
                title="Open Folder Directly in Google Drive"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open in Drive</span>
              </a>
            )}
          </div>

          {/* Drag & Drop File Picker Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sky-300 dark:border-sky-800 hover:border-sky-500 dark:hover:border-sky-600 rounded-3xl p-5 sm:p-6 text-center cursor-pointer transition-all bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/40 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 mb-2.5 group-hover:scale-110 transition-transform">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Tap to choose photos & 4K videos
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Supports multiple photos from Camera, Gallery, or Files
            </p>
          </div>

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                <span>Selected Photos ({selectedFiles.length})</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  disabled={isUploading}
                  className="text-rose-500 hover:text-rose-700 disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {selectedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-400">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px] sm:max-w-[240px]">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === 'uploading' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </span>
                      )}
                      {item.status === 'success' && (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Saved</span>
                          </span>
                          {item.driveFileUrl && (
                            <a
                              href={item.driveFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="View in Drive"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                      {item.status === 'error' && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold text-rose-500 max-w-[120px] truncate"
                          title={item.errorMessage}
                        >
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Failed</span>
                        </span>
                      )}
                      {item.status !== 'uploading' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Message */}
          {overallStatus && (
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
              {overallStatus}
            </div>
          )}

          {/* 1-Tap Direct Google Drive Subfolder Access */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800/80 p-3.5 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                Direct Google Drive Access
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                You can also drop photos directly into your personal subfolder:
              </p>
            </div>
            {memberDirectDriveLink && (
              <a
                href={memberDirectDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex-shrink-0 touch-manipulation active:scale-95"
              >
                <Folder className="h-4 w-4" />
                <span>Open Drive</span>
              </a>
            )}
          </div>

          {/* Collapsible Google Apps Script Automated Sync Setup */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsSetupOpen(!isSetupOpen)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Automated Google Drive Sync Setup (Optional 1-Min)
                </span>
              </div>
              {isSetupOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {isSetupOpen && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  To allow friends to upload directly from this modal without leaving the app,
                  deploy a free Web App under <strong>triphisab@gmail.com</strong>:
                </p>

                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>
                    Open{' '}
                    <a
                      href="https://script.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 underline font-semibold"
                    >
                      script.google.com
                    </a>{' '}
                    under <strong>triphisab@gmail.com</strong>.
                  </li>
                  <li>Click <strong>+ New project</strong> and paste the uploader script.</li>
                  <li>Click <strong>Deploy → New deployment → Web app</strong>.</li>
                  <li>Set <em>Execute as:</em> <strong>Me</strong> and <em>Who has access:</em> <strong>Anyone</strong>.</li>
                  <li>Copy the resulting Web App URL and paste it below:</li>
                </ol>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyAppsScript}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy Script Code</span>
                  </button>
                </div>

                <div className="pt-2 flex gap-2">
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveWebhook}
                    disabled={isSavingWebhook}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSavingWebhook ? 'Saving...' : 'Save URL'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all min-h-[40px]"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleUploadAll}
            disabled={selectedFiles.length === 0 || isUploading}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white px-5 py-2.5 text-xs font-black shadow-lg shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation active:scale-95 min-h-[40px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading to Drive...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>
                  Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} to Google Drive
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
