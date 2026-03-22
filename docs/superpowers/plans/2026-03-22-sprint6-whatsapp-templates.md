# Sprint 6: Custom WhatsApp Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to customize the WhatsApp payment reminder template with a split-view editor and live preview, with fallback to the hardcoded default.

**Architecture:** Database-backed template storage with per-institution override. Backend resolves template at send time (custom → fallback to default). Frontend provides split-view editor in a new "Templates" tab on the WhatsApp page with local interpolation for live preview.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, TanStack Query, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-22-sprint6-whatsapp-templates-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `sinaloka-backend/prisma/schema.prisma` | Add WhatsappTemplate model + Institution relation |
| Create | `sinaloka-backend/src/modules/whatsapp/whatsapp.constants.ts` | TEMPLATE_VARIABLES, DEFAULT_TEMPLATES, SAMPLE_DATA constants |
| Modify | `sinaloka-backend/src/modules/whatsapp/whatsapp.dto.ts` | Add UpdateTemplateSchema DTO |
| Modify | `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts` | Template CRUD methods + interpolateTemplate + update sendPaymentReminder |
| Modify | `sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts` | 4 new template endpoints |
| Modify | `sinaloka-platform/src/types/whatsapp.ts` | WhatsappTemplate interface |
| Modify | `sinaloka-platform/src/services/whatsapp.service.ts` | 3 template service methods |
| Modify | `sinaloka-platform/src/hooks/useWhatsapp.ts` | 3 template hooks |
| Create | `sinaloka-platform/src/pages/WhatsApp/TemplatesTab.tsx` | Split-view template editor + preview component |
| Modify | `sinaloka-platform/src/pages/WhatsApp.tsx` | Add Templates tab |
| Modify | `sinaloka-platform/src/locales/en.json` | Template i18n keys (EN) |
| Modify | `sinaloka-platform/src/locales/id.json` | Template i18n keys (ID) |

---

## Task 1: Database — Prisma schema + migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add WhatsappTemplate model to schema.prisma**

Add after the `WhatsappMessage` model (after line ~706):

```prisma
model WhatsappTemplate {
  id              String   @id @default(uuid())
  institution_id  String
  name            String
  body            String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  institution Institution @relation(fields: [institution_id], references: [id])

  @@unique([institution_id, name])
  @@map("whatsapp_templates")
}
```

Add to the `Institution` model (after the `whatsapp_messages` relation, around line 170):

```prisma
  whatsapp_templates WhatsappTemplate[]
```

- [ ] **Step 2: Generate migration**

Run: `cd sinaloka-backend && npx prisma migrate dev --name add_whatsapp_templates`
Expected: Migration created and applied successfully.

- [ ] **Step 3: Regenerate Prisma client**

Run: `npm run prisma:generate`

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(backend): add whatsapp_templates table"
```

---

## Task 2: Backend — Constants + interpolation utility

**Files:**
- Create: `sinaloka-backend/src/modules/whatsapp/whatsapp.constants.ts`

- [ ] **Step 1: Create whatsapp.constants.ts**

```typescript
export const TEMPLATE_VARIABLES: Record<string, string[]> = {
  payment_reminder: [
    'student_name',
    'institution_name',
    'amount',
    'due_date',
    'status',
    'checkout_url',
  ],
};

export const DEFAULT_TEMPLATES: Record<string, string> = {
  payment_reminder:
    "Assalamu'alaikum, Bapak/Ibu wali dari *{{student_name}}*.\n\n" +
    'Ini adalah pengingat pembayaran dari *{{institution_name}}*:\n' +
    '💰 Jumlah: Rp {{amount}}\n' +
    '📅 Jatuh tempo: {{due_date}}\n' +
    '📋 Status: {{status}}\n\n' +
    'Mohon segera melakukan pembayaran. Terima kasih.\n\n' +
    '📱 Bayar langsung: {{checkout_url}}',
};

export const SAMPLE_DATA: Record<string, Record<string, string>> = {
  payment_reminder: {
    student_name: 'Ahmad Rizki',
    institution_name: 'Bimbel Cerdas',
    amount: '500.000',
    due_date: '25 Mar 2026',
    status: 'Menunggu',
    checkout_url: 'https://pay.sinaloka.com/abc123',
  },
};

/**
 * Interpolate template body with variables.
 * Unknown variables resolve to empty string.
 * Lines that become empty after interpolation are removed.
 */
export function interpolateTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  let result = body.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => variables[key] ?? '',
  );
  // Remove lines that are now empty after interpolation
  result = result.replace(/^\s*\n/gm, '');
  return result.trim();
}
```

- [ ] **Step 2: Build and verify**

Run: `cd sinaloka-backend && npm run build`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.constants.ts
git commit -m "feat(backend): add WhatsApp template constants and interpolation utility"
```

---

## Task 3: Backend — Template CRUD service methods

**Files:**
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.dto.ts` (append)
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts` (append + modify sendPaymentReminder)

- [ ] **Step 1: Add UpdateTemplateSchema to whatsapp.dto.ts**

Append after `UpdateWhatsappSettingsSchema` (after line 34):

```typescript

export const UpdateTemplateSchema = z.object({
  body: z
    .string()
    .min(1, 'Template body is required')
    .max(4000, 'Template body too long'),
});
export type UpdateTemplateDto = z.infer<typeof UpdateTemplateSchema>;
```

- [ ] **Step 2: Add template CRUD methods to whatsapp.service.ts**

Add imports at top of `whatsapp.service.ts`:

```typescript
import {
  TEMPLATE_VARIABLES,
  DEFAULT_TEMPLATES,
  SAMPLE_DATA,
  interpolateTemplate,
} from './whatsapp.constants.js';
import type { UpdateTemplateDto } from './whatsapp.dto.js';
```

Append these methods before `sendPaymentReminder` (before line 284):

```typescript
  // --- Template CRUD ---

  async getTemplates(institutionId: string) {
    const customs = await this.prisma.whatsappTemplate.findMany({
      where: { institution_id: institutionId },
    });
    const customMap = new Map(customs.map((c) => [c.name, c]));

    return {
      templates: Object.entries(DEFAULT_TEMPLATES).map(([name, defaultBody]) => {
        const custom = customMap.get(name);
        return {
          name,
          body: custom?.body ?? defaultBody,
          is_default: !custom,
          variables: TEMPLATE_VARIABLES[name] ?? [],
        };
      }),
    };
  }

  async getTemplate(institutionId: string, name: string) {
    if (!DEFAULT_TEMPLATES[name]) {
      throw new NotFoundException(`Template "${name}" not found`);
    }

    const custom = await this.prisma.whatsappTemplate.findUnique({
      where: { institution_id_name: { institution_id: institutionId, name } },
    });

    return {
      name,
      body: custom?.body ?? DEFAULT_TEMPLATES[name],
      is_default: !custom,
      variables: TEMPLATE_VARIABLES[name] ?? [],
      sample_data: SAMPLE_DATA[name] ?? {},
    };
  }

  async updateTemplate(institutionId: string, name: string, dto: UpdateTemplateDto) {
    if (!DEFAULT_TEMPLATES[name]) {
      throw new NotFoundException(`Template "${name}" not found`);
    }

    // Validate variables in body
    const usedVars = [...dto.body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    const allowed = TEMPLATE_VARIABLES[name] ?? [];
    const unknown = usedVars.filter((v) => !allowed.includes(v));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown variables: ${unknown.join(', ')}. Allowed: ${allowed.join(', ')}`,
      );
    }

    const template = await this.prisma.whatsappTemplate.upsert({
      where: { institution_id_name: { institution_id: institutionId, name } },
      create: { institution_id: institutionId, name, body: dto.body },
      update: { body: dto.body },
    });

    return {
      name: template.name,
      body: template.body,
      is_default: false,
    };
  }

  async deleteTemplate(institutionId: string, name: string) {
    if (!DEFAULT_TEMPLATES[name]) {
      throw new NotFoundException(`Template "${name}" not found`);
    }

    // Idempotent: deleteMany returns count 0 if nothing to delete (no error)
    await this.prisma.whatsappTemplate.deleteMany({
      where: { institution_id: institutionId, name },
    });

    return { message: 'Reset to default' };
  }
```

- [ ] **Step 3: Update `sendPaymentReminder` to use template resolution**

Replace the hardcoded message construction (lines 340–366 of `whatsapp.service.ts`) with template-based interpolation. The full `sendPaymentReminder` method from line 340 onwards becomes:

Replace lines 340–366 (from `const message =` to `const fullMessage = message + paymentLink;`) with:

```typescript
    // Resolve template: custom from DB, or fallback to default
    const customTemplate = await this.prisma.whatsappTemplate.findUnique({
      where: {
        institution_id_name: {
          institution_id: institutionId,
          name: 'payment_reminder',
        },
      },
    });
    const templateBody =
      customTemplate?.body ?? DEFAULT_TEMPLATES['payment_reminder'];

    // Generate checkout URL if Midtrans is configured
    let checkoutUrl = '';
    try {
      const url =
        await this.paymentGatewayService.getOrCreateCheckoutUrl(
          paymentId,
          institutionId,
        );
      if (url) checkoutUrl = url;
    } catch (error) {
      this.logger.warn(
        `Failed to generate checkout URL for payment ${paymentId}`,
        error,
      );
    }

    // Build variables map
    const variables: Record<string, string> = {
      student_name: payment.student.name,
      institution_name: payment.institution.name,
      amount,
      due_date: dueDate,
      status: statusLabel,
      checkout_url: checkoutUrl,
    };

    const fullMessage = interpolateTemplate(templateBody, variables);
```

The rest of the method (lines 368+) stays the same — `this.sendMessage(...)` with `fullMessage`.

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-backend && npm run build`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/
git commit -m "feat(backend): add template CRUD service methods, update sendPaymentReminder to use custom templates"
```

---

## Task 4: Backend — Template controller endpoints

**Files:**
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts`

- [ ] **Step 1: Add imports**

Add to the DTO imports at top of controller:

```typescript
import {
  FonnteWebhookSchema,
  type FonnteWebhookDto,
  WhatsappMessagesQuerySchema,
  type WhatsappMessagesQueryDto,
  UpdateWhatsappSettingsSchema,
  type UpdateWhatsappSettingsDto,
  UpdateTemplateSchema,
  type UpdateTemplateDto,
} from './whatsapp.dto.js';
```

Add `Delete, Put` to the `@nestjs/common` imports. The current import (line 1) is missing these. Update to:

```typescript
import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
```

- [ ] **Step 2: Add 4 template endpoints**

Add after `updateSettings` (after line 108), before the closing brace:

```typescript
  // --- Template endpoints ---

  @Get('admin/whatsapp/templates')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getTemplates(@InstitutionId() institutionId: string) {
    return this.whatsappService.getTemplates(institutionId);
  }

  @Get('admin/whatsapp/templates/:name')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getTemplate(
    @InstitutionId() institutionId: string,
    @Param('name') name: string,
  ) {
    return this.whatsappService.getTemplate(institutionId, name);
  }

  @Put('admin/whatsapp/templates/:name')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateTemplate(
    @InstitutionId() institutionId: string,
    @Param('name') name: string,
    @Body(new ZodValidationPipe(UpdateTemplateSchema)) dto: UpdateTemplateDto,
  ) {
    return this.whatsappService.updateTemplate(institutionId, name, dto);
  }

  @Delete('admin/whatsapp/templates/:name')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async deleteTemplate(
    @InstitutionId() institutionId: string,
    @Param('name') name: string,
  ) {
    return this.whatsappService.deleteTemplate(institutionId, name);
  }
```

- [ ] **Step 3: Build and verify**

Run: `cd sinaloka-backend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts
git commit -m "feat(backend): add template CRUD endpoints to WhatsApp controller"
```

---

## Task 5: Frontend — Types, service, hooks

**Files:**
- Modify: `sinaloka-platform/src/types/whatsapp.ts`
- Modify: `sinaloka-platform/src/services/whatsapp.service.ts`
- Modify: `sinaloka-platform/src/hooks/useWhatsapp.ts`

- [ ] **Step 1: Add WhatsappTemplate type**

Append to `sinaloka-platform/src/types/whatsapp.ts`:

```typescript

export interface WhatsappTemplate {
  name: string;
  body: string;
  is_default: boolean;
  variables: string[];
  sample_data?: Record<string, string>;
}
```

- [ ] **Step 2: Add template service methods**

Append to the `whatsappService` object in `sinaloka-platform/src/services/whatsapp.service.ts`:

```typescript
  getTemplate: (name: string) =>
    api.get<WhatsappTemplate>(`/api/admin/whatsapp/templates/${name}`).then((r) => r.data),
  updateTemplate: (name: string, body: string) =>
    api.put<WhatsappTemplate>(`/api/admin/whatsapp/templates/${name}`, { body }).then((r) => r.data),
  deleteTemplate: (name: string) =>
    api.delete<{ message: string }>(`/api/admin/whatsapp/templates/${name}`).then((r) => r.data),
```

Add to imports: `import type { WhatsappMessage, WhatsappStats, WhatsappSettings, WhatsappMessageQueryParams, WhatsappTemplate } from '@/src/types/whatsapp';`

- [ ] **Step 3: Add template hooks**

Append to `sinaloka-platform/src/hooks/useWhatsapp.ts`:

```typescript
export function useWhatsappTemplate(name: string) {
  return useQuery({
    queryKey: ['whatsapp-template', name],
    queryFn: () => whatsappService.getTemplate(name),
  });
}
export function useUpdateWhatsappTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: string }) => whatsappService.updateTemplate(name, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-template'] }),
  });
}
export function useDeleteWhatsappTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => whatsappService.deleteTemplate(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-template'] }),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/types/whatsapp.ts sinaloka-platform/src/services/whatsapp.service.ts sinaloka-platform/src/hooks/useWhatsapp.ts
git commit -m "feat(platform): add WhatsApp template types, service methods, and hooks"
```

---

## Task 6: Frontend — TemplatesTab component

**Files:**
- Create: `sinaloka-platform/src/pages/WhatsApp/TemplatesTab.tsx`

- [ ] **Step 1: Create TemplatesTab component**

Create the file. Note: the existing WhatsApp page is at `src/pages/WhatsApp.tsx` (single file). Create a `WhatsApp/` directory and put the new component there. The main page file stays where it is.

```tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWhatsappTemplate, useUpdateWhatsappTemplate, useDeleteWhatsappTemplate } from '@/src/hooks/useWhatsapp';
import { Skeleton } from '@/src/components/UI';

function interpolatePreview(body: string, sampleData: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] ?? match);
}

function renderPreviewHtml(text: string): string {
  // Bold: *text* → <b>text</b>
  let html = text.replace(/\*(.*?)\*/g, '<b>$1</b>');
  // Highlight unresolved {{variables}} in red
  html = html.replace(/\{\{\w+\}\}/g, '<span style="color:#ef4444">$&</span>');
  // Newlines → <br>
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

  // Sync template data to local state
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
    // Restore cursor after the inserted text
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('whatsapp.templates.title', 'Templates')}</h3>
          <p className="text-sm text-muted-foreground">payment_reminder</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${template?.is_default ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
          {template?.is_default ? t('whatsapp.templates.badge.default', 'Default') : t('whatsapp.templates.badge.customized', 'Customized')}
        </span>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="space-y-3">
          {/* Variable Chips */}
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

          {/* Textarea */}
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

          {/* Actions */}
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

        {/* Preview */}
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

      {/* Reset Confirmation Modal */}
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
```

- [ ] **Step 2: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/WhatsApp/
git commit -m "feat(platform): add TemplatesTab component with split-view editor and WhatsApp preview"
```

---

## Task 7: Frontend — Wire TemplatesTab into WhatsApp page + i18n

**Files:**
- Modify: `sinaloka-platform/src/pages/WhatsApp.tsx`
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add Templates tab to WhatsApp page**

In `WhatsApp.tsx`:

Add import at top:
```typescript
import { TemplatesTab } from './WhatsApp/TemplatesTab';
```

Update tab state type (line 22):
```typescript
const [activeTab, setActiveTab] = useState<'messages' | 'paymentReminders' | 'settings' | 'templates'>('messages');
```

Add to the `items` array in the `<Tabs>` component (after the settings tab item, around line 128):
```typescript
{ value: 'templates', label: t('whatsapp.tabs.templates') },
// NOTE: deliberately NO `disabled` prop — per spec, Templates tab is always enabled
// so admins can prepare templates before connecting Fonnte
```

Add the tab content block after the settings tab content (after the settings section, around line 478):
```tsx
{activeTab === 'templates' && <TemplatesTab />}
```

- [ ] **Step 2: Add i18n keys to en.json**

In the `whatsapp` namespace, add `tabs.templates` and the `templates` block:

Add to `whatsapp.tabs`:
```json
"templates": "Templates"
```

Add the `templates` block to the `whatsapp` namespace:
```json
"templates": {
  "title": "Templates",
  "editor": "Editor",
  "preview": "Preview",
  "save": "Save Template",
  "resetToDefault": "Reset to Default",
  "resetConfirm": "Reset this template to the default version? Your customizations will be lost.",
  "resetSuccess": "Template reset to default",
  "saveSuccess": "Template saved",
  "badge": {
    "default": "Default",
    "customized": "Customized"
  },
  "variables": "Available Variables",
  "charCount": "{{count}} characters",
  "invalidVariable": "Unknown variable: {{name}}. Allowed: {{allowed}}"
}
```

- [ ] **Step 3: Add i18n keys to id.json**

Same structure in Indonesian:

Add to `whatsapp.tabs`:
```json
"templates": "Template"
```

Add the `templates` block:
```json
"templates": {
  "title": "Template",
  "editor": "Editor",
  "preview": "Pratinjau",
  "save": "Simpan Template",
  "resetToDefault": "Kembalikan ke Default",
  "resetConfirm": "Kembalikan template ke versi default? Perubahan Anda akan hilang.",
  "resetSuccess": "Template dikembalikan ke default",
  "saveSuccess": "Template disimpan",
  "badge": {
    "default": "Default",
    "customized": "Disesuaikan"
  },
  "variables": "Variabel Tersedia",
  "charCount": "{{count}} karakter",
  "invalidVariable": "Variabel tidak dikenal: {{name}}. Tersedia: {{allowed}}"
}
```

- [ ] **Step 4: Build and verify**

Run: `cd sinaloka-platform && npm run lint && npm run build`

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/WhatsApp.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): wire Templates tab into WhatsApp page with i18n"
```

---

## Task 8: Final build check

- [ ] **Step 1: Build all apps**

```bash
cd sinaloka-backend && npm run build
cd ../sinaloka-platform && npm run build
```

Both must compile without errors.

- [ ] **Step 2: Run backend tests**

```bash
cd sinaloka-backend && npm run test -- --ci
```

Check for regressions (pre-existing failures are OK).

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from Sprint 6 integration"
```
