import React from 'react';
import {
  Card, Button, Badge, Label, Input, Modal, ConfirmDialog, Select, EmptyState, Spinner
} from '../../../components/UI';
import {
  Calendar, Plus, Pencil, Trash2, X, Users, Building2
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SettingsPageState } from '../useSettingsPage';
import type { RoomType, RoomStatus } from '../../../types/settings';

type AcademicTabProps = Pick<SettingsPageState,
  't' | 'rooms' | 'subjects' | 'gradeLevels' | 'workingDays' |
  'isLoadingAcademic' | 'updateAcademic' |
  'showRoomModal' | 'setShowRoomModal' | 'editingRoom' | 'setEditingRoom' |
  'roomFormName' | 'setRoomFormName' | 'roomFormType' | 'setRoomFormType' |
  'roomFormCapacity' | 'setRoomFormCapacity' | 'roomFormStatus' | 'setRoomFormStatus' |
  'handleOpenRoomModal' | 'handleSaveRoom' |
  'roomToDelete' | 'setRoomToDelete' | 'handleDeleteRoom' |
  'showCategoryInput' | 'setShowCategoryInput' | 'newCategoryName' | 'setNewCategoryName' |
  'handleAddSubjectCategory' | 'handleRemoveSubjectCategory' |
  'showGradeInput' | 'setShowGradeInput' | 'newGradeName' | 'setNewGradeName' |
  'handleAddGrade' | 'handleRemoveGrade' |
  'handleToggleWorkingDay' | 'handleSaveWorkingDays'
>;

const DAYS = [
  { num: 1, label: 'Mon' },
  { num: 2, label: 'Tue' },
  { num: 3, label: 'Wed' },
  { num: 4, label: 'Thu' },
  { num: 5, label: 'Fri' },
  { num: 6, label: 'Sat' },
  { num: 0, label: 'Sun' },
];

export const AcademicTab = ({
  t, rooms, subjects, gradeLevels, workingDays,
  isLoadingAcademic, updateAcademic,
  showRoomModal, setShowRoomModal, editingRoom, setEditingRoom,
  roomFormName, setRoomFormName, roomFormType, setRoomFormType,
  roomFormCapacity, setRoomFormCapacity, roomFormStatus, setRoomFormStatus,
  handleOpenRoomModal, handleSaveRoom,
  roomToDelete, setRoomToDelete, handleDeleteRoom,
  showCategoryInput, setShowCategoryInput, newCategoryName, setNewCategoryName,
  handleAddSubjectCategory, handleRemoveSubjectCategory,
  showGradeInput, setShowGradeInput, newGradeName, setNewGradeName,
  handleAddGrade, handleRemoveGrade,
  handleToggleWorkingDay, handleSaveWorkingDays,
}: AcademicTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold mb-6 text-foreground flex items-center gap-2">
          <Calendar size={20} className="text-muted-foreground" />
          {t('settings.academic.regionalSettings')}
        </h3>

        <div className="space-y-6">
          {/* Working Days */}
          <div className="space-y-4">
            <Label>{t('settings.academic.workingDays')}</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Working days">
              {DAYS.map((day) => {
                const isActive = workingDays.includes(day.num);
                return (
                  <button
                    key={day.num}
                    onClick={() => handleToggleWorkingDay(day.num)}
                    aria-pressed={isActive}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4">
              <p className="text-[10px] text-muted-foreground italic">{t('settings.academic.workingDaysNote')}</p>
              <Button variant="outline" size="sm" onClick={handleSaveWorkingDays} disabled={updateAcademic.isPending}>
                {updateAcademic.isPending && <Spinner size="sm" className="mr-2" />}
                {t('settings.academic.saveWorkingDays')}
              </Button>
            </div>
          </div>

          {/* Subject Categories & Grade Levels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
            {/* Subject Categories */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('settings.academic.subjectCategories')}</Label>
                <button
                  onClick={() => setShowCategoryInput(true)}
                  aria-label={t('settings.academic.addCategory')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.length === 0 && !showCategoryInput && (
                  <p className="text-sm text-muted-foreground">{t('settings.academic.noCategories')}</p>
                )}
                {subjects.map(cat => (
                  <Badge key={cat.id} variant="default" className="gap-1 pr-1">
                    {cat.name}
                    <button
                      onClick={() => handleRemoveSubjectCategory(cat.id)}
                      aria-label={`Remove ${cat.name}`}
                      className="hover:text-destructive transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
                {showCategoryInput && (
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubjectCategory();
                      if (e.key === 'Escape') setShowCategoryInput(false);
                    }}
                    autoFocus
                    placeholder="Category name"
                    className="w-40 h-7 text-xs"
                  />
                )}
              </div>
            </div>

            {/* Grade Levels */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('settings.academic.gradeLevels')}</Label>
                <button
                  onClick={() => setShowGradeInput(true)}
                  aria-label={t('settings.academic.addGrade')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {gradeLevels.length === 0 && !showGradeInput && (
                  <p className="text-sm text-muted-foreground">{t('settings.academic.noGrades')}</p>
                )}
                {gradeLevels.map(grade => (
                  <Badge key={grade.id} variant="outline" className="gap-1 pr-1">
                    {grade.name}
                    <button
                      onClick={() => handleRemoveGrade(grade.id)}
                      aria-label={`Remove ${grade.name}`}
                      className="hover:text-destructive transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
                {showGradeInput && (
                  <Input
                    value={newGradeName}
                    onChange={(e) => setNewGradeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddGrade();
                      if (e.key === 'Escape') setShowGradeInput(false);
                    }}
                    autoFocus
                    placeholder="Grade level"
                    className="w-40 h-7 text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Room Management */}
          <div className="pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-sm">{t('settings.academic.roomManagement')}</h4>
                <p className="text-xs text-muted-foreground">{t('settings.academic.roomManagementDesc')}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenRoomModal()}>
                <Plus size={14} />
                {t('settings.academic.addRoom')}
              </Button>
            </div>

            {rooms.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={t('settings.academic.noRooms')}
                description={t('settings.academic.noRoomsDesc')}
                action={
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenRoomModal()}>
                    <Plus size={14} />
                    {t('settings.academic.addRoom')}
                  </Button>
                }
              />
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('settings.academic.roomName')}</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('settings.academic.type')}</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('settings.academic.capacity')}</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('settings.academic.status')}</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-foreground">{room.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{room.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-muted-foreground" />
                            <span className="text-sm font-bold text-foreground">
                              {room.capacity !== null ? room.capacity : t('settings.academic.unlimited')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={room.status === 'Available' ? 'success' : room.status === 'Maintenance' ? 'warning' : 'error'}
                            className="text-[10px]"
                          >
                            {room.status === 'Available'
                              ? t('settings.academic.available')
                              : room.status === 'Maintenance'
                                ? t('settings.academic.maintenance')
                                : t('settings.academic.unavailable')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => handleOpenRoomModal(room)}
                              aria-label={`Edit ${room.name}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => setRoomToDelete(room)}
                              aria-label={`Delete ${room.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Room Form Modal */}
      <Modal
        isOpen={showRoomModal}
        onClose={() => { setShowRoomModal(false); setEditingRoom(null); }}
        title={editingRoom ? t('settings.academic.editRoom') : t('settings.academic.addRoom')}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="roomName">{t('settings.academic.roomName')}</Label>
            <Input id="roomName" value={roomFormName} onChange={(e) => setRoomFormName(e.target.value)} placeholder="e.g. Room A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roomType">{t('settings.academic.type')}</Label>
            <Select
              value={roomFormType}
              onChange={(val) => setRoomFormType(val as RoomType)}
              options={[
                { value: 'Classroom', label: 'Classroom' },
                { value: 'Laboratory', label: 'Laboratory' },
                { value: 'Studio', label: 'Studio' },
                { value: 'Online', label: 'Online' },
              ]}
            />
          </div>
          {roomFormType !== 'Online' && (
            <div className="space-y-1.5">
              <Label htmlFor="roomCapacity">{t('settings.academic.capacity')}</Label>
              <Input id="roomCapacity" type="number" min="1" value={roomFormCapacity} onChange={(e) => setRoomFormCapacity(e.target.value)} placeholder="Max students" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="roomStatus">{t('settings.academic.status')}</Label>
            <Select
              value={roomFormStatus}
              onChange={(val) => setRoomFormStatus(val as RoomStatus)}
              options={[
                { value: 'Available', label: 'Available' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Unavailable', label: 'Unavailable' },
              ]}
            />
          </div>
        </div>
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => setShowRoomModal(false)}>{t('settings.academic.discard')}</Button>
          <Button onClick={handleSaveRoom} disabled={!roomFormName.trim() || updateAcademic.isPending}>
            {updateAcademic.isPending && <Spinner size="sm" className="mr-2" />}
            {editingRoom ? t('settings.academic.updateRoom') : t('settings.academic.saveRoom')}
          </Button>
        </div>
      </Modal>

      {/* Room Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={handleDeleteRoom}
        title={t('settings.academic.deleteRoom')}
        description={roomToDelete ? t('settings.academic.deleteRoomConfirmSimple', { name: roomToDelete.name }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('settings.academic.keepRoom')}
        variant="danger"
        isLoading={updateAcademic.isPending}
      />
    </div>
  );
};
