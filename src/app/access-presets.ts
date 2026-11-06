import { ApplicationRole, ApplicationUser, ALLOW_RIGHTS } from './application-access';

export function accessPresets(): { roles: ApplicationRole[]; users: ApplicationUser[] } {
  return {
    roles: [
      {
        id: 'visitor',
        preset: 'visitor',
        label: { de: 'Besucher', en: 'Visitor', fa: 'بازدیدکننده' },
        rights: { open: true, view: true, create: false, edit: false, delete: false },
        fieldMode: 'readonly',
      },
      {
        id: 'user',
        preset: 'user',
        label: { de: 'User', en: 'User', fa: 'کاربر' },
        rights: { open: true, view: true, create: true, edit: true, delete: false },
        fieldMode: 'editable',
      },
      {
        id: 'admin',
        preset: 'admin',
        label: { de: 'Admin', en: 'Admin', fa: 'مدیر' },
        rights: { ...ALLOW_RIGHTS },
        fieldMode: 'editable',
      },
    ],
    users: [
      {
        id: 'visitor-demo',
        name: { de: 'Demo-Besucher', en: 'Demo visitor', fa: 'بازدیدکنندهٔ نمونه' },
        roleId: 'visitor',
      },
      {
        id: 'user-demo',
        name: { de: 'Demo-User', en: 'Demo user', fa: 'کاربر نمونه' },
        roleId: 'user',
      },
      {
        id: 'admin-demo',
        name: { de: 'Demo-Admin', en: 'Demo admin', fa: 'مدیر نمونه' },
        roleId: 'admin',
      },
    ],
  };
}
