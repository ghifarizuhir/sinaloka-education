import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { LogIn, Users, Settings, BarChart3, Plus } from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
  Label,
  Modal,
  Skeleton,
} from '../../components/UI';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInstitution,
  useInstitutionSummary,
} from '@/src/hooks/useInstitutions';
import { useAuth } from '@/src/hooks/useAuth';
import api from '@/src/lib/api';
import InstitutionForm from './InstitutionForm';

type Tab = 'general' | 'admins' | 'overview';

export default function InstitutionDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enterInstitution } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const { data: institution, isLoading } = useInstitution(id!);

  const handleEnter = () => {
    if (!institution) return;
    enterInstitution(institution.id, institution.name);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 dark:text-zinc-400">
          {t('common.noData')}
        </p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'general',
      label: t('superAdmin.tabs.general'),
      icon: <Settings size={16} />,
    },
    {
      key: 'admins',
      label: t('superAdmin.tabs.admins'),
      icon: <Users size={16} />,
    },
    {
      key: 'overview',
      label: t('superAdmin.tabs.overview'),
      icon: <BarChart3 size={16} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100">
            {institution.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1 font-mono">
            {institution.slug}
          </p>
        </div>
        <Button variant="secondary" onClick={handleEnter}>
          <LogIn size={16} />
          {t('superAdmin.enter')}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <InstitutionForm institution={institution} />
      )}
      {activeTab === 'admins' && <AdminsTab institution={institution} />}
      {activeTab === 'overview' && <OverviewTab institutionId={institution.id} />}
    </div>
  );
}

/* ─── Admins Tab ─── */
function AdminsTab({
  institution,
}: {
  institution: { id: string; users?: { id: string; name: string; email: string }[] };
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const admins = institution.users ?? [];

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      toast.error(t('superAdmin.form.adminRequired'));
      return;
    }

    setIsCreating(true);
    try {
      await api.post('/api/admin/users', {
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        role: 'ADMIN',
        institution_id: institution.id,
      });
      toast.success(t('superAdmin.toast.adminCreated'));
      setShowAddModal(false);
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    } catch {
      toast.error(t('superAdmin.toast.adminCreateError'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-zinc-100">
          {t('superAdmin.tabs.admins')}
        </h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          {t('superAdmin.addAdmin')}
        </Button>
      </div>

      <Card className="!p-0 overflow-hidden">
        {admins.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              {t('common.noData')}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                  {t('superAdmin.table.name')}
                </th>
                <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                  {t('superAdmin.form.email')}
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="p-4 font-medium dark:text-zinc-100">
                    {admin.name}
                  </td>
                  <td className="p-4 text-sm text-zinc-500">
                    {admin.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Add Admin Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('superAdmin.addAdmin')}
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newAdminName">
              {t('superAdmin.form.adminName')}{' '}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="newAdminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder={t('superAdmin.form.adminNamePlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newAdminEmail">
              {t('superAdmin.form.adminEmail')}{' '}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="newAdminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder={t('superAdmin.form.adminEmailPlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newAdminPassword">
              {t('superAdmin.form.adminPassword')}{' '}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="newAdminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? t('common.saving') : t('superAdmin.addAdmin')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ institutionId }: { institutionId: string }) {
  const { t } = useTranslation();
  const { data: summary, isLoading } = useInstitutionSummary(institutionId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: t('superAdmin.overview.students'),
      value: summary?.studentCount ?? 0,
    },
    {
      label: t('superAdmin.overview.tutors'),
      value: summary?.tutorCount ?? 0,
    },
    {
      label: t('superAdmin.overview.admins'),
      value: summary?.adminCount ?? 0,
    },
    {
      label: t('superAdmin.overview.activeClasses'),
      value: summary?.activeClassCount ?? 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="text-center">
          <p className="text-3xl font-bold dark:text-zinc-100">{stat.value}</p>
          <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
        </Card>
      ))}
    </div>
  );
}
