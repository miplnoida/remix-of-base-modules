import { dashboardMenuItems } from './menuItems/dashboardMenuItems';
import { insuredPersonsMenuItems } from './menuItems/insuredPersonsMenuItems';
import { c3MenuItems } from './menuItems/c3MenuItems';
import { auditMenuItems } from './menuItems/auditMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';
import { cashierMenuItems } from './menuItems/cashierMenuItems';
export const menuItems = [
  ...dashboardMenuItems,
  ...insuredPersonsMenuItems,
  ...c3MenuItems,
  ...auditMenuItems,
  ...cashierMenuItems,
  ...systemAdminMenuItems
];
