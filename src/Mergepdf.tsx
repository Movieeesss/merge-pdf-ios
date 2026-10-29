import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────
interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: string;
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ─────────────────────────────────────────────────────────────
//  SortableItem
// ─────────────────────────────────────────────────────────────
const SortableItem = ({
  file,
  index,
  onRemove,
}: {
  file: PdfFile;
  index: number;
  onRemove: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: file.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-item">
      {/* Order badge */}
      <span className="order-badge">{index + 1}</span>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="drag-handle"
        aria-label="Drag to reorder"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 3h2v2H9zm4 0h2v2h-2zM9 7h2v2H9zm4 0h2v2h-2zM9 11h2v2H9zm4 0h2v2h-2zM9 15h2v2H9zm4 0h2v2h-2zM9 19h2v2H9zm4 0h2v2h-2z"/>
        </svg>
      </div>

      {/* PDF icon */}
      <div className="pdf-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <path d="M9 13h6M9 17h3"/>
        </svg>
      </div>

      {/* File info */}
      <div className="file-info">
        <span className="file-name">{file.name}</span>
        <span className="file-size">{file.size}</span>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        className="remove-btn"
        aria-label={`Remove ${file.name}`}
      >
        ×
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────
export default function MergePDF() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // ── Add files ──────────────────────────────────────────────
  const addFiles = useCallback((incoming: File[]) => {
    const pdfFiles = incoming.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfFiles.length < incoming.length) {
      alert(`Only PDF files are accepted. ${incoming.length - pdfFiles.length} file(s) skipped.`);
    }
    const mapped: PdfFile[] = pdfFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: formatBytes(file.size),
    }));
    setFiles((prev) => [...prev, ...mapped]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  // ── Drag & Drop zone ──────────────────────────────────────
  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  // ── Reorder ───────────────────────────────────────────────
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // ── Core merge logic ──────────────────────────────────────
  const mergePDFs = async (): Promise<File> => {
    const merged = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
      setProgress(`Processing ${i + 1} of ${files.length}…`);
      const bytes = await files[i].file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    setProgress('Saving…');
    const pdfBytes = await merged.save();
    return new File([pdfBytes], `Merged_${Date.now()}.pdf`, { type: 'application/pdf' });
  };

  // ── Download ──────────────────────────────────────────────
  const onDownload = async () => {
    if (files.length < 2) { alert('Please add at least 2 PDF files.'); return; }
    setLoading(true);
    try {
      const file = await mergePDFs();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      setProgress('');
    } catch (err) {
      console.error(err);
      alert('Failed to merge PDFs. Check that all files are valid.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // ── Share (WhatsApp / native) ─────────────────────────────
  const onShare = async () => {
    if (files.length < 2) { alert('Please add at least 2 PDF files.'); return; }
    setLoading(true);
    try {
      const file = await mergePDFs();
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Merged PDF' });
      } else {
        // Fallback – just download
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        alert('Direct sharing not supported on this device. File downloaded instead.');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error(err);
        alert('Share failed. Please try Download instead.');
      }
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const totalPages = files.length;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <span className="header-title">MERGE PDF</span>
      </header>

      <div className="content">
        {/* Drop Zone */}
        <label
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleZoneDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div className="drop-zone-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0070c0" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <span className="drop-zone-label">TAP OR DROP PDF FILES</span>
          <span className="drop-zone-hint">Select multiple files at once</span>
        </label>

        {/* File List */}
        {files.length > 0 && (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="file-list">
                  {files.map((f, i) => (
                    <SortableItem
                      key={f.id}
                      file={f}
                      index={i}
                      onRemove={(id) => setFiles((prev) => prev.filter((x) => x.id !== id))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Stats bar */}
            <div className="stats-bar">
              <span>📄 {totalPages} {totalPages === 1 ? 'file' : 'files'} selected</span>
              <span>Drag ☰ to reorder</span>
            </div>

            {/* Progress */}
            {loading && progress && (
              <div className="progress-bar">
                <div className="progress-text">{progress}</div>
              </div>
            )}

            {/* Action buttons */}
            <div className="actions">
              <button onClick={onDownload} disabled={loading} className="btn btn-download">
                {loading ? (
                  <><span className="spinner" /> MERGING…</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> DOWNLOAD MERGED PDF</>
                )}
              </button>

              <button onClick={onShare} disabled={loading} className="btn btn-share">
                {loading ? (
                  <><span className="spinner spinner-dark" /> PREPARING…</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.99 0C5.364 0 0 5.364 0 11.99c0 2.11.547 4.087 1.502 5.802L.057 23.943l6.303-1.652A11.953 11.953 0 0011.99 24c6.626 0 11.99-5.364 11.99-11.99C23.98 5.364 18.616 0 11.99 0z"/></svg> SHARE TO WHATSAPP</>
                )}
              </button>

              <button onClick={() => setFiles([])} className="btn-clear">
                Clear All Files
              </button>
            </div>
          </>
        )}

        {files.length === 0 && (
          <div className="empty-hint">
            <p>Add 2 or more PDF files to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
