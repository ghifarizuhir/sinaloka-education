import React, { useState } from 'react';
import {
  Card, Button, Input, Label, Switch, Badge
} from '../components/UI';
import {
  Building2, CreditCard, GraduationCap, ShieldCheck,
  Puzzle, Globe, Palette, Clock, Calendar,
  Smartphone, Mail, MapPin, Save, Trash2,
  Plus, ExternalLink, Upload, CheckCircle2, AlertCircle, X, Tag, Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '@/src/hooks/useAuth';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [billingMode, setBillingMode] = useState('package');
  const [primaryColor, setPrimaryColor] = useState('#0f172a');

  const [rooms, setRooms] = useState([
    { id: 'R1', name: 'Room A (Main)', capacity: 20, type: 'Classroom', status: 'Available' },
    { id: 'R2', name: 'Science Lab', capacity: 15, type: 'Laboratory', status: 'Available' },
    { id: 'R3', name: 'Music Studio', capacity: 5, type: 'Studio', status: 'Maintenance' },
  ]);

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'integrations', label: 'Integrations', icon: Puzzle },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <Building2 size={20} className="text-zinc-400" />
                Institution Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label>Institution Name</Label>
                  <Input defaultValue={user?.institution?.name ?? ''} />
                </div>
                <div className="space-y-1.5">
                  <Label>Support Email</Label>
                  <Input type="email" defaultValue={user?.email ?? ''} />
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <select defaultValue="Asia/Jakarta (GMT+7)" className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100">
                    <option>Asia/Jakarta (GMT+7)</option>
                    <option>Asia/Singapore (GMT+8)</option>
                    <option>UTC</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <select defaultValue="English (US)" className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:text-zinc-100">
                    <option>English (US)</option>
                    <option>Bahasa Indonesia</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <Button className="gap-2">
                  <Save size={16} />
                  Save Changes
                </Button>
              </div>
            </Card>

            <Card className="border-rose-100 dark:border-rose-900/30">
              <h3 className="text-lg font-bold mb-2 text-rose-600 flex items-center gap-2">
                <AlertCircle size={20} />
                Danger Zone
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Permanently delete your institution data. This action is irreversible.
              </p>
              <Button variant="outline" className="text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-600 gap-2">
                <Trash2 size={16} />
                Delete Institution
              </Button>
            </Card>
          </div>
        );
      case 'billing':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <CreditCard size={20} className="text-zinc-400" />
                Billing Configuration
              </h3>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-zinc-400 uppercase tracking-widest text-[10px]">Billing Mode</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'pay-as-you-go', label: 'Pay-as-you-go', desc: 'Bill after attendance' },
                      { id: 'package', label: 'Package/Prepaid', desc: 'Deduct from credits' },
                      { id: 'subscription', label: 'Subscription', desc: 'Flat monthly fee' },
                    ].map((mode) => (
                      <div 
                        key={mode.id}
                        onClick={() => setBillingMode(mode.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all",
                          billingMode === mode.id 
                            ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800" 
                            : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200"
                        )}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm">{mode.label}</span>
                          {billingMode === mode.id && <CheckCircle2 size={16} className="text-zinc-900 dark:text-zinc-100" />}
                        </div>
                        <p className="text-xs text-zinc-500">{mode.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <select defaultValue="IDR (Rp)" className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-100">
                      <option>IDR (Rp)</option>
                      <option>USD ($)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Invoice Prefix</Label>
                    <Input defaultValue="INV-" />
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Late Payment Auto-Lock</p>
                    <p className="text-xs text-zinc-500">Lock enrollment if debt exceeds threshold</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Threshold:</span>
                      <Input className="w-24 h-8 text-xs" defaultValue="1000000" />
                    </div>
                    <Switch checked={true} onChange={() => {}} />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold dark:text-zinc-100 flex items-center gap-2">
                  <Tag size={20} className="text-zinc-400" />
                  Expense Categories
                </h3>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus size={14} />
                  Add Category
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Rent', 'Utilities', 'Marketing', 'Supplies', 'Software', 'Maintenance'].map(cat => (
                  <Badge key={cat} variant="default" className="gap-1 pr-1">
                    {cat}
                    <X size={10} className="cursor-pointer" />
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-4 italic">These categories will appear in the Operating Expenses menu.</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold dark:text-zinc-100 flex items-center gap-2">
                  <Building2 size={20} className="text-zinc-400" />
                  Bank Accounts (Self-Method)
                </h3>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus size={14} />
                  Add Account
                </Button>
              </div>
              <div className="space-y-3">
                {[
                  { bank: 'BCA', acc: '1234567890', name: 'Lumina Academy' },
                  { bank: 'Mandiri', acc: '0987654321', name: 'Lumina Academy' },
                ].map((acc, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs">
                        {acc.bank}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{acc.acc}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{acc.name}</p>
                      </div>
                    </div>
                    <button className="text-zinc-400 hover:text-rose-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      case 'branding':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <Palette size={20} className="text-zinc-400" />
                White-Labeling & Branding
              </h3>
              
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <Label>Institution Logo</Label>
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-zinc-400 transition-colors cursor-pointer">
                      <div className="w-16 h-16 rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400">
                        <Upload size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Click to upload logo</p>
                        <p className="text-xs text-zinc-500">Used for invoices and sidebar</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <Label>Primary Brand Color</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-16 rounded-2xl shadow-inner border border-zinc-200 dark:border-zinc-800"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <div className="flex-1 space-y-2">
                        <Input 
                          value={primaryColor} 
                          onChange={(e) => setPrimaryColor(e.target.value)} 
                          placeholder="#000000"
                        />
                        <p className="text-[10px] text-zinc-500">This updates buttons and active states across the app.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Custom Domain</Label>
                      <p className="text-xs text-zinc-500">Use your own domain for the student portal</p>
                    </div>
                    <Badge variant="outline">Pro Feature</Badge>
                  </div>
                  <div className="flex gap-3">
                    <Input placeholder="tutor.yourbrand.com" disabled />
                    <Button variant="outline" disabled className="gap-2">
                      <Globe size={16} />
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      case 'academic':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <Calendar size={20} className="text-zinc-400" />
                Regional & Operational Settings
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Working Days</Label>
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
                  <p className="text-[10px] text-zinc-500 italic">Unselected days will be hidden from the calendar view.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Subject Categories</Label>
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
                      <Label>Grade Levels</Label>
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
                      <h4 className="font-bold text-sm">Room Management</h4>
                      <p className="text-xs text-zinc-500">Define physical spaces and their student capacity.</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus size={14} />
                      Add Room
                    </Button>
                  </div>
                  
                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-900">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Room Name</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Type</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Capacity</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Action</th>
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
                                {room.status}
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
      case 'security':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck size={20} className="text-zinc-400" />
                Security & Access Control
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Two-Factor Authentication (2FA)</p>
                      <p className="text-xs text-zinc-500">Require a code from your phone to login</p>
                    </div>
                  </div>
                  <Switch checked={false} onChange={() => {}} />
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <Label>Password Policy</Label>
                  <div className="space-y-3">
                    {[
                      { label: 'Minimum 8 characters', active: true },
                      { label: 'Must include numbers', active: true },
                      { label: 'Must include special characters', active: false },
                      { label: 'Require password change every 90 days', active: false },
                    ].map((policy, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{policy.label}</span>
                        <Switch checked={policy.active} onChange={() => {}} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      case 'integrations':
        return (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold mb-6 dark:text-zinc-100 flex items-center gap-2">
                <Puzzle size={20} className="text-zinc-400" />
                Connected Services
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'WhatsApp API', desc: 'Send automated reminders', icon: Smartphone, status: 'Connected', color: 'text-emerald-500' },
                  { name: 'Midtrans', desc: 'Payment gateway integration', icon: CreditCard, status: 'Not Connected', color: 'text-zinc-400' },
                  { name: 'SendGrid', desc: 'Email SMTP for invoices', icon: Mail, status: 'Connected', color: 'text-emerald-500' },
                  { name: 'Google Calendar', desc: 'Sync teacher schedules', icon: Calendar, status: 'Not Connected', color: 'text-zinc-400' },
                ].map((service, i) => (
                  <div key={i} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between hover:border-zinc-200 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400">
                        <service.icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{service.name}</p>
                        <p className="text-[10px] text-zinc-500">{service.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-bold uppercase", service.color)}>{service.status}</span>
                      <ExternalLink size={12} className="text-zinc-300" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-100">Institution Settings</h2>
          <p className="text-zinc-500 text-sm">Define global rules and branding for your academy.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                  activeTab === tab.id 
                    ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};
