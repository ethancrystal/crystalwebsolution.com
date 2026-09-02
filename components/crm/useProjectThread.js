import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { listProjectMessages } from '@/lib/crm/projects';
import {
  createAttachmentDownloadUrl,
  postProjectMessage,
  editProjectMessage,
  reserveAttachment,
  finalizeAttachment,
} from '@/app/actions/project-actions';

// Data half of the project Conversation panel: every piece of state, the
// read-model load, the Realtime subscription, and the mutation handlers.
// components/crm/ProjectThread.jsx is the presentation half and renders
// purely from what this returns. Split in Phase 4 of
// docs/plans/refactor-architecture-cleanup-2.md; the logic here is a
// verbatim move, guarded by tests/crm/project-thread-behaviour.test.jsx.
//
// Two invariants this hook exists to protect (both have bitten before, see
// STATUS.md):
//   - `load` depends on profile?.id / ?.role / ?.company_id, never the
//     profile object -- the parent page rebuilds that object on every
//     workspace action and the Realtime effect depends on `load`.
//   - Every async path re-checks activeProjectRef + projectGenerationRef
//     before touching state, so a response for a project the user has
//     already navigated away from can never land in the new project's UI.
export function useProjectThread({ projectId, profile }) {
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const fileInputRef = useRef(null);
  const listEndRef = useRef(null);
  const messageAttemptIdRef = useRef(null);
  const projectGenerationRef = useRef(0);
  const activeProjectRef = useRef(projectId);

  const load = useCallback(async () => {
    if (!projectId || activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;
      setUserId(user?.id || null);

      const result = await listProjectMessages(
        supabase,
        { profile },
        projectId,
        null,
        20,
      );
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;
      setMessages(result.messages || []);
      setNextCursor(result.nextCursor || null);
      setThreadId(result.threadId || null);
    } catch (err) {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) setError(err.message);
    } finally {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) setIsLoading(false);
    }
    // profile is read fresh from the closure above (requireViewer only ever
    // reads id/role/company_id from it), so depend on those stable
    // primitives rather than the profile object itself -- the parent page
    // creates a new profile object on every loadWorkspace() call, which
    // would otherwise churn this callback's identity (and the Realtime
    // subscription effect below that depends on it) on every unrelated
    // workspace action.
  }, [projectId, profile?.id, profile?.role, profile?.company_id]);

  useEffect(() => {
    activeProjectRef.current = projectId;
    projectGenerationRef.current += 1;
    setMessages([]);
    setThreadId(null);
    setNextCursor(null);
    setBody('');
    setStagedAttachments([]);
    setError(null);
    setIsLoading(true);
    setIsSending(false);
    setIsUploading(false);
    setIsSavingEdit(false);
    setEditingId(null);
    setEditBody('');
    messageAttemptIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime is an acceleration layer. Payloads contain identifiers only;
  // every refresh goes back through the visibility-filtered read model.
  useEffect(() => {
    if (!threadId) return undefined;

    const supabase = createClient();
    const visibilityTopics = profile?.role === 'client' ? ['shared'] : ['shared', 'internal'];
    const channels = visibilityTopics.map((visibility) => {
      const refreshForEvent = ({ payload }) => {
        if (
          payload?.project_id !== projectId ||
          payload?.visibility !== visibility
        ) {
          return;
        }
        void load();
      };

      return supabase
        .channel(`project:${projectId}:${visibility}`)
        .on('broadcast', { event: 'project_message_created' }, refreshForEvent)
        .on('broadcast', { event: 'project_message_updated' }, refreshForEvent)
        .subscribe();
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [projectId, profile?.role, threadId, load]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  function startEdit(message) {
    setEditingId(message.id);
    setEditBody(message.body);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody('');
  }

  async function handleSaveEdit(messageId) {
    const trimmed = editBody.trim();
    if (!trimmed || activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;

    setIsSavingEdit(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('messageId', messageId);
      formData.set('body', trimmed);

      const result = await editProjectMessage(formData);
      if (!result.ok) throw new Error(result.error || 'Unable to edit this message.');
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;

      setEditingId(null);
      setEditBody('');
      await load();
    } catch (err) {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setError(err.message);
      }
    } finally {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setIsSavingEdit(false);
      }
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const generation = projectGenerationRef.current;
    if (activeProjectRef.current !== projectId) return;
    const trimmed = body.trim();
    if (!trimmed || stagedAttachments.some((attachment) => attachment.status !== 'ready')) return;

    if (!messageAttemptIdRef.current) {
      messageAttemptIdRef.current = globalThis.crypto.randomUUID();
    }

    setIsSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('body', trimmed);
      formData.set('clientGeneratedId', messageAttemptIdRef.current);
      stagedAttachments
        .filter((attachment) => attachment.status === 'ready')
        .forEach((attachment) => formData.append('attachmentIds', attachment.attachmentId));

      const result = await postProjectMessage(formData);
      if (!result.ok) throw new Error(result.error || 'Unable to send this message.');
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;

      setBody('');
      setStagedAttachments([]);
      messageAttemptIdRef.current = null;
      await load();
    } catch {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setError('Unable to send this message. Your draft is preserved for retry.');
      }
    } finally {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setIsSending(false);
      }
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;
    const isCurrentProject = () =>
      activeProjectRef.current === projectId && generation === projectGenerationRef.current;

    setIsUploading(true);
    setError(null);
    let reservedAttachment = null;

    try {
      const reserveForm = new FormData();
      reserveForm.set('projectId', projectId);
      reserveForm.set('fileName', file.name);
      reserveForm.set('mimeType', file.type || 'application/octet-stream');
      reserveForm.set('sizeBytes', String(file.size));

      const reserved = await reserveAttachment(reserveForm);
      if (!reserved.ok) throw new Error(reserved.error || 'Unable to reserve this upload.');
      reservedAttachment = reserved.data;
      if (isCurrentProject()) {
        setStagedAttachments((current) => [
          ...current,
          { ...reserved.data, sourceFile: file, status: 'pending', uploaded: false },
        ]);
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(reserved.data.storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;
      if (!isCurrentProject()) return;
      setStagedAttachments((current) =>
        current.map((attachment) =>
          attachment.attachmentId === reserved.data.attachmentId
            ? { ...attachment, uploaded: true }
            : attachment,
        ),
      );

      const finalizeForm = new FormData();
      finalizeForm.set('projectId', projectId);
      finalizeForm.set('attachmentId', reserved.data.attachmentId);

      const finalized = await finalizeAttachment(finalizeForm);
      if (!finalized.ok) throw new Error(finalized.error || 'Unable to finalize this upload.');
      if (!isCurrentProject()) return;

      setStagedAttachments((current) =>
        current.map((attachment) =>
          attachment.attachmentId === reserved.data.attachmentId
            ? { ...attachment, status: 'ready', uploaded: true }
            : attachment,
        ),
      );
    } catch {
      if (!isCurrentProject()) return;
      if (reservedAttachment?.attachmentId) {
        setStagedAttachments((current) =>
          current.map((attachment) =>
            attachment.attachmentId === reservedAttachment.attachmentId
              ? { ...attachment, status: 'failed' }
              : attachment,
          ),
        );
      }
      setError('Unable to upload this file. The staged file can be retried.');
    } finally {
      if (isCurrentProject()) {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  }

  async function retryStagedAttachment(attachment) {
    if (!attachment?.sourceFile || attachment.status !== 'failed') return;
    if (activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;
    const isCurrentProject = () =>
      activeProjectRef.current === projectId && generation === projectGenerationRef.current;

    setIsUploading(true);
    setError(null);
    setStagedAttachments((current) =>
      current.map((item) =>
        item.attachmentId === attachment.attachmentId ? { ...item, status: 'pending' } : item,
      ),
    );

    try {
      if (!attachment.uploaded) {
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(attachment.storagePath, attachment.sourceFile, { upsert: false });
        if (uploadError) throw uploadError;
      }

      const finalizeForm = new FormData();
      finalizeForm.set('projectId', projectId);
      finalizeForm.set('attachmentId', attachment.attachmentId);
      const finalized = await finalizeAttachment(finalizeForm);
      if (!finalized.ok) throw new Error(finalized.error || 'Unable to finalize this upload.');
      if (!isCurrentProject()) return;

      setStagedAttachments((current) =>
        current.map((item) =>
          item.attachmentId === attachment.attachmentId
            ? { ...item, status: 'ready', uploaded: true }
            : item,
        ),
      );
    } catch {
      if (!isCurrentProject()) return;
      setStagedAttachments((current) =>
        current.map((item) =>
          item.attachmentId === attachment.attachmentId ? { ...item, status: 'failed' } : item,
        ),
      );
      setError('Unable to retry this file upload.');
    } finally {
      if (isCurrentProject()) setIsUploading(false);
    }
  }

  async function loadOlderMessages() {
    if (!nextCursor || isLoadingOlder || activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;
    setIsLoadingOlder(true);
    setError(null);

    try {
      const supabase = createClient();
      const result = await listProjectMessages(
        supabase,
        { profile },
        projectId,
        nextCursor,
        20,
      );
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;
      setMessages((current) => {
        const byId = new Map([...result.messages, ...current].map((message) => [message.id, message]));
        return [...byId.values()].sort((left, right) => {
          const timeCompare = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
          return timeCompare || left.id.localeCompare(right.id);
        });
      });
      setNextCursor(result.nextCursor || null);
    } catch {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setError('Unable to load older messages.');
      }
    } finally {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setIsLoadingOlder(false);
      }
    }
  }

  async function handleDownload(projectFile) {
    if (activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;
    setError(null);
    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('assetId', projectFile.id);
      formData.set('kind', 'attachment');

      const result = await createAttachmentDownloadUrl(formData);
      if (!result.ok) throw new Error(result.error || 'Unable to download this file.');
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;
      window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setError('Unable to download this file.');
      }
    }
  }

  return {
    userId,
    messages,
    isLoading,
    error,
    body,
    setBody,
    isSending,
    isUploading,
    stagedAttachments,
    nextCursor,
    isLoadingOlder,
    editingId,
    editBody,
    setEditBody,
    isSavingEdit,
    fileInputRef,
    listEndRef,
    startEdit,
    cancelEdit,
    handleSaveEdit,
    handleSend,
    handleFileChange,
    retryStagedAttachment,
    loadOlderMessages,
    handleDownload,
  };
}
