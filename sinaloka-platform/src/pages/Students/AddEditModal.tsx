import React from 'react';
import { Modal, Button, Input, Label, Select } from '../../components/UI';
import { GRADE_GROUPS } from '../../lib/constants';
import type { Student } from '@/src/types/student';
import type { TFunction } from 'i18next';

interface AddEditModalProps {
  isOpen: boolean;
  editingStudent: Student | null;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  formName: string;
  setFormName: React.Dispatch<React.SetStateAction<string>>;
  formEmail: string;
  setFormEmail: React.Dispatch<React.SetStateAction<string>>;
  formPhone: string;
  setFormPhone: React.Dispatch<React.SetStateAction<string>>;
  formGrade: string;
  setFormGrade: React.Dispatch<React.SetStateAction<string>>;
  formStatus: 'ACTIVE' | 'INACTIVE';
  setFormStatus: React.Dispatch<React.SetStateAction<'ACTIVE' | 'INACTIVE'>>;
  formParentName: string;
  setFormParentName: React.Dispatch<React.SetStateAction<string>>;
  formParentPhone: string;
  setFormParentPhone: React.Dispatch<React.SetStateAction<string>>;
  formParentEmail: string;
  setFormParentEmail: React.Dispatch<React.SetStateAction<string>>;
  formCustomGrade: string;
  setFormCustomGrade: React.Dispatch<React.SetStateAction<string>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  t: TFunction;
}

export const AddEditModal: React.FC<AddEditModalProps> = ({
  isOpen,
  editingStudent,
  onClose,
  onSubmit,
  isPending,
  formName,
  setFormName,
  formEmail,
  setFormEmail,
  formPhone,
  setFormPhone,
  formGrade,
  setFormGrade,
  formStatus,
  setFormStatus,
  formParentName,
  setFormParentName,
  formParentPhone,
  setFormParentPhone,
  formParentEmail,
  setFormParentEmail,
  formCustomGrade,
  setFormCustomGrade,
  formErrors,
  setFormErrors,
  t,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingStudent ? t('students.modal.editTitle') : t('students.modal.addTitle')}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-name">{t('students.form.fullName')}</Label>
          <Input
            id="new-name"
            placeholder={t('students.form.namePlaceholder')}
            value={formName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFormName(e.target.value);
              if (formErrors.name) setFormErrors(prev => { const { name, ...rest } = prev; return rest; });
            }}
          />
          {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-email">{t('students.form.emailAddress')}</Label>
            <Input
              id="new-email"
              type="email"
              placeholder={t('students.form.emailPlaceholder')}
              value={formEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormEmail(e.target.value);
                if (formErrors.email) setFormErrors(prev => { const { email, ...rest } = prev; return rest; });
              }}
            />
            {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-phone">{t('students.form.phoneNumber')}</Label>
            <Input
              id="new-phone"
              placeholder={t('students.form.phonePlaceholder')}
              value={formPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormPhone(e.target.value);
                if (formErrors.phone) setFormErrors(prev => { const { phone, ...rest } = prev; return rest; });
              }}
            />
            {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('students.form.grade')}</Label>
            <Select
              value={formGrade}
              onChange={(val) => {
                setFormGrade(val);
                if (val !== '__custom__') setFormCustomGrade('');
                if (formErrors.grade) setFormErrors(prev => { const { grade, ...rest } = prev; return rest; });
              }}
              placeholder="Pilih kelas..."
              className="w-full"
              options={[
                ...GRADE_GROUPS.map(group => ({
                  label: group.label,
                  options: group.options,
                })),
                { value: '__custom__', label: 'Lainnya...' },
              ]}
            />
            {formGrade === '__custom__' && (
              <Input
                placeholder="Masukkan kelas..."
                value={formCustomGrade}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormCustomGrade(e.target.value);
                  if (formErrors.grade) setFormErrors(prev => { const { grade, ...rest } = prev; return rest; });
                }}
                className="mt-1.5"
              />
            )}
            {formErrors.grade && <p className="text-red-500 text-sm mt-1">{formErrors.grade}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t('students.form.status')}</Label>
            <Select
              value={formStatus}
              onChange={(val) => setFormStatus(val as 'ACTIVE' | 'INACTIVE')}
              className="w-full"
              options={[
                { value: 'ACTIVE', label: t('common.active') },
                { value: 'INACTIVE', label: t('common.inactive') },
              ]}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-parent-name">{t('students.form.parentName')}</Label>
          <Input
            id="new-parent-name"
            placeholder={t('students.form.parentNamePlaceholder')}
            value={formParentName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFormParentName(e.target.value);
              if (formErrors.parent_name) setFormErrors(prev => { const { parent_name, ...rest } = prev; return rest; });
            }}
          />
          {formErrors.parent_name && <p className="text-red-500 text-sm mt-1">{formErrors.parent_name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-parent-phone">{t('students.form.parentPhone')}</Label>
          <Input
            id="new-parent-phone"
            placeholder={t('students.form.parentPhonePlaceholder')}
            value={formParentPhone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFormParentPhone(e.target.value);
              if (formErrors.parent_phone) setFormErrors(prev => { const { parent_phone, ...rest } = prev; return rest; });
            }}
          />
          {formErrors.parent_phone && <p className="text-red-500 text-sm mt-1">{formErrors.parent_phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-parent-email">{t('students.form.parentEmail')}</Label>
          <Input
            id="new-parent-email"
            type="email"
            placeholder={t('students.form.parentEmailPlaceholder')}
            value={formParentEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFormParentEmail(e.target.value);
              if (formErrors.parent_email) setFormErrors(prev => { const { parent_email, ...rest } = prev; return rest; });
            }}
          />
          {formErrors.parent_email && <p className="text-red-500 text-sm mt-1">{formErrors.parent_email}</p>}
        </div>
        <div className="flex items-center gap-3 mt-8">
          <Button
            variant="outline"
            className="flex-1 justify-center"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            className="flex-1 justify-center"
            onClick={onSubmit}
            disabled={isPending}
          >
            {editingStudent ? t('students.modal.updateStudent') : t('students.modal.createStudent')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
