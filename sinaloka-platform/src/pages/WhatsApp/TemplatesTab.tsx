import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWhatsappTemplate, useUpdateWhatsappTemplate, useDeleteWhatsappTemplate } from '@/src/hooks/useWhatsapp';
import { Skeleton } from '@/src/components/UI';

function interpolatePreview(body: string, sampleData: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] ?? match);
}

function renderPreviewHtml(text: string): string {
  let html = text.replace(/\*(.*?)\*/g, '<b>$1</b>');
  html = html.replace(/\{\{\w+\}\}/g, '<span style="color:#ef4444">$&</span>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

export function TemplatesTab() {
  const { t } = useTranslation();
  const { data: template, isLoading } = useWhatsappTemplate('payment_reminder');
  const updateTemplate = useUpdateWhatsappTemplate();
  const deleteTemplate = useDeleteWhatsappTemplate();

  const [body, setBody] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (template) {
      setBody(template.body);
      setHasChanges(false);
    }
  }, [template]);

  const handleBodyChange = (newBody: string) => {
    setBody(newBody);
    setHasChanges(true);
  };

  const insertVariable = (varName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = `{{${varName}}}`;
    const newBody = body.slice(0, start) + text + body.slice(end);
    handleBodyChange(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const handleSave = async () => {
    try {
      await updateTemplate.mutateAsync({ name: 'payment_reminder', body });
      setHasChanges(false);
      toast.success(t('whatsapp.templates.saveSuccess', 'Template saved'));
    } catch {
      toast.error(t('common.error', 'Something went wrong'));
    }
  };

  const handleReset = async () => {
    try {
      await deleteTemplate.mutateAsync('payment_reminder');
      setConfirmReset(false);
      toast.success(t('whatsapp.templates.resetSuccess', 'Template reset to default'));
    } catch {
      toast.error(t('common.error', 'Something went wrong'));
    }
  };

  const previewHtml = useMemo(() => {
    if (!template?.sample_data) return '';
    const interpolated = interpolatePreview(body, template.sample_data);
    return renderPreviewHtml(interpolated);
  }, [body, template?.sample_data]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-32" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('whatsapp.templates.title', 'Templates')}</h3>
          <p className="text-sm text-muted-foreground">payment_reminder</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${template?.is_default ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
          {template?.is_default ? t('whatsapp.templates.badge.default', 'Default') : t('whatsapp.templates.badge.customized', 'Customized')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('whatsapp.templates.variables', 'Available Variables')}</p>
            <div className="flex flex-wrap gap-1.5">
              {(template?.variables ?? []).map((v) => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground font-mono transition-colors"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            className="w-full h-64 p-4 text-sm font-mono rounded-xl border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Template body..."
          />
          <p className="text-xs text-muted-foreground">
            {t('whatsapp.templates.charCount', '{{count}} characters', { count: body.length })}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setConfirmReset(true)}
              disabled={template?.is_default || deleteTemplate.isPending}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              {t('whatsapp.templates.resetToDefault', 'Reset to Default')}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateTemplate.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {updateTemplate.isPending ? '...' : t('whatsapp.templates.save', 'Save Template')}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('whatsapp.templates.preview', 'Preview')}</p>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#075E54' }}>
            <div className="p-4 min-h-[300px]">
              <div
                className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed"
                style={{ backgroundColor: '#DCF8C6', color: '#303030' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">{t('whatsapp.templates.resetToDefault', 'Reset to Default')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('whatsapp.templates.resetConfirm', 'Reset this template to the default version? Your customizations will be lost.')}
            </p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted" onClick={() => setConfirmReset(false)}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                disabled={deleteTemplate.isPending}
                onClick={handleReset}
              >
                {deleteTemplate.isPending ? '...' : t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
