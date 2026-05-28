import { useState, useRef } from 'react';
import { api } from '../../lib/api.js';
import { supabase } from '../../lib/supabase.js';

export default function FileUpload({ ticketId, tenantId, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  async function handleFiles(files) {
    if (!files?.length) return;
    setError('');
    setUploading(true);

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large. Max 10 MB per file.`);
        continue;
      }
      try {
        // 1. Get signed upload URL
        const { signedUrl, storagePath } = await api.post('/uploads/sign', {
          tenantId, ticketId,
          fileName: file.name, mimeType: file.type, fileSize: file.size,
        });

        // 2. Upload directly to Supabase Storage
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error('Upload failed');

        // 3. Confirm with backend
        await api.post('/uploads/confirm', {
          tenantId, ticketId, storagePath,
          fileName: file.name, fileSize: file.size, mimeType: file.type,
        });
      } catch (err) {
        setError(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    setUploading(false);
    if (onUploaded) onUploaded();
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center
                   cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-colors"
      >
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
        {uploading ? (
          <p className="text-sm text-brand-500 animate-pulse">Uploading…</p>
        ) : (
          <p className="text-sm text-slate-400">
            📎 Click or drag files here <span className="text-xs">(max 10 MB)</span>
          </p>
        )}
      </div>
    </div>
  );
}
