import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  SearchInput,
  Skeleton,
  Modal,
  Input,
  Label,
  Switch,
  PasswordInput,
} from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import { useUsers, useCreateUser, useUpdateUser } from '@/src/hooks/useUsers';
import { useInstitutions } from '@/src/hooks/useInstitutions';
import type { AdminUser } from '@/src/services/users.service';
import { toast } from 'sonner';

const ROLE_BADGE: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'outline'; className?: string }> = {
  ADMIN: { variant: 'default', className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  TUTOR: { variant: 'default', className: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
  PARENT: { variant: 'default', className: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  SUPER_ADMIN: { variant: 'default', className: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
};

const selectClass =
  'h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200';

export default function SuperAdminUsers() {
  const { t, i18n } = useTranslation();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createInstitutionId, setCreateInstitutionId] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editActive, setEditActive] = useState(true);

  const { data, isLoading } = useUsers({
    page,
    limit,
    ...(searchQuery ? { search: searchQuery } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(institutionFilter ? { institution_id: institutionFilter } : {}),
    ...(statusFilter ? { is_active: statusFilter === 'active' } : {}),
  });

  const { data: institutionsData } = useInstitutions({ limit: 100 });
  const institutions = institutionsData?.data ?? [];

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const users = data?.data ?? [];
  const meta = data?.meta;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim() || !createInstitutionId) {
      toast.error(t('superAdmin.createAdminModal.fieldsRequired'));
      return;
    }
    try {
      await createUser.mutateAsync({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: 'ADMIN',
        institution_id: createInstitutionId,
      });
      toast.success(t('superAdmin.toast.adminCreated'));
      setShowCreateModal(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateInstitutionId('');
    } catch {
      toast.error(t('superAdmin.toast.adminCreateError'));
    }
  };

  const openEditModal = (user: AdminUser) => {
    if (user.role !== 'ADMIN') return;
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditActive(user.is_active);
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await updateUser.mutateAsync({
        id: editUser.id,
        data: {
          name: editName.trim(),
          email: editEmail.trim(),
          is_active: editActive,
        },
      });
      toast.success(t('superAdmin.toast.userUpdated'));
      setShowEditModal(false);
      setEditUser(null);
    } catch {
      toast.error(t('superAdmin.toast.userUpdateError'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100">
            {t('superAdmin.users')}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t('superAdmin.usersSubtitle')}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          {t('superAdmin.createAdmin')}
        </Button>
      </div>

      {/* Search + Filters */}
      <Card className="!p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <SearchInput
              placeholder={t('superAdmin.searchUsersPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className={selectClass}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t('superAdmin.allRoles')}</option>
            <option value="ADMIN">Admin</option>
            <option value="TUTOR">Tutor</option>
            <option value="PARENT">Parent</option>
          </select>
          <select
            className={selectClass}
            value={institutionFilter}
            onChange={(e) => { setInstitutionFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t('superAdmin.allInstitutions')}</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t('superAdmin.allStatuses')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              {t('common.noResults')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.userTable.name')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.userTable.email')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.userTable.role')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.userTable.institution')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.userTable.status')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('superAdmin.userTable.lastLogin')}
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleBadge = ROLE_BADGE[user.role] ?? { variant: 'default' as const };
                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        'border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors',
                        user.role === 'ADMIN' && 'cursor-pointer'
                      )}
                      onClick={() => openEditModal(user)}
                    >
                      <td className="p-4">
                        <span className="font-medium dark:text-zinc-100">
                          {user.name}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {user.email}
                      </td>
                      <td className="p-4">
                        <Badge variant={roleBadge.variant} className={roleBadge.className}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {user.institution?.name ?? t('superAdmin.noInstitution')}
                      </td>
                      <td className="p-4">
                        <Badge variant={user.is_active ? 'success' : 'default'}>
                          {user.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-zinc-500">
                        {user.last_login_at
                          ? formatDate(user.last_login_at, i18n.language)
                          : t('superAdmin.neverLoggedIn')}
                      </td>
                      <td className="p-4">
                        {user.role === 'ADMIN' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              openEditModal(user);
                            }}
                          >
                            <Pencil size={14} />
                            {t('common.edit')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
          <span className="text-xs text-zinc-500">
            {t('common.page')}{' '}
            <span className="font-bold">{page}</span>{' '}
            {t('common.of')}{' '}
            <span className="font-bold">{meta?.totalPages ?? 1}</span>
            {' '}&bull;{' '}
            <span className="font-bold">{meta?.total ?? 0}</span>{' '}
            {t('common.total')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta?.hasPreviousPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              {t('common.prev')}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from(
                { length: meta?.totalPages ?? 1 },
                (_, i) => i + 1
              )
                .filter((p) => Math.abs(p - page) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                      page === p
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                  >
                    {p}
                  </button>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta?.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('common.next')}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Admin Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('superAdmin.createAdminModal.title')}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('superAdmin.createAdminModal.name')}</Label>
            <Input
              placeholder={t('superAdmin.createAdminModal.namePlaceholder')}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('superAdmin.createAdminModal.email')}</Label>
            <Input
              type="email"
              placeholder={t('superAdmin.createAdminModal.emailPlaceholder')}
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('superAdmin.createAdminModal.password')}</Label>
            <PasswordInput
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('superAdmin.createAdminModal.institution')}</Label>
            <select
              className="w-full h-10 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100"
              value={createInstitutionId}
              onChange={(e) => setCreateInstitutionId(e.target.value)}
            >
              <option value="">{t('superAdmin.createAdminModal.selectInstitution')}</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditUser(null); }}
        title={t('superAdmin.editUserModal.title')}
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('superAdmin.createAdminModal.name')}</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('superAdmin.createAdminModal.email')}</Label>
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('superAdmin.editUserModal.active')}</Label>
            <Switch checked={editActive} onChange={setEditActive} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowEditModal(false); setEditUser(null); }}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
