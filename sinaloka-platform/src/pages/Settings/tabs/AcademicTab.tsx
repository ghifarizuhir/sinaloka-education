import React from 'react';
import {
  Card, Button, Badge, Label
} from '../../../components/UI';
import {
  Calendar, Plus, ExternalLink, Trash2, X, Users
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SettingsPageState } from '../useSettingsPage';

type AcademicTabProps = Pick<SettingsPageState,
  't' | 'rooms'
>;

export const AcademicTab = ({
  t, rooms,
}: AcademicTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
          <Calendar size={20} className="text-zinc-400" />
          {t('settings.academic.regionalSettings')}
        </h3>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>{t('settings.academic.workingDays')}</Label>
            <div className="flex flex-wrap gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <button
                  key={day}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                    ['Sat', 'Sun'].includes(day)
                      ? "border-zinc-100 text-zinc-400 dark:border-zinc-800"
                      : "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 italic">{t('settings.academic.workingDaysNote')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('settings.academic.subjectCategories')}</Label>
                <Plus size={14} className="text-zinc-400 cursor-pointer" />
              </div>
              <div className="flex flex-wrap gap-2">
                {['Science', 'Mathematics', 'Languages', 'Arts'].map(cat => (
                  <Badge key={cat} variant="default" className="gap-1 pr-1">
                    {cat}
                    <X size={10} className="cursor-pointer" />
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('settings.academic.gradeLevels')}</Label>
                <Plus size={14} className="text-zinc-400 cursor-pointer" />
              </div>
              <div className="flex flex-wrap gap-2">
                {['Elementary', 'Middle School', 'High School', 'University'].map(grade => (
                  <Badge key={grade} variant="outline" className="gap-1 pr-1">
                    {grade}
                    <X size={10} className="cursor-pointer" />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-sm">{t('settings.academic.roomManagement')}</h4>
                <p className="text-xs text-zinc-500">{t('settings.academic.roomManagementDesc')}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus size={14} />
                {t('settings.academic.addRoom')}
              </Button>
            </div>

            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('settings.academic.roomName')}</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('settings.academic.type')}</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('settings.academic.capacity')}</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('settings.academic.status')}</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium dark:text-zinc-200">{room.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-500">{room.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-zinc-400" />
                          <span className="text-sm font-bold dark:text-zinc-100">{room.capacity}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={room.status === 'Available' ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {room.status === 'Available' ? t('settings.academic.available') : t('settings.academic.maintenance')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                            <ExternalLink size={14} />
                          </button>
                          <button className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
