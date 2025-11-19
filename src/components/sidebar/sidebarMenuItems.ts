import { dashboardMenuItems } from './menuItems/dashboardMenuItems';
import { insuredPersonsMenuItems } from './menuItems/insuredPersonsMenuItems';
import { employersMenuItems } from './menuItems/employersMenuItems';
import { c3MenuItems } from './menuItems/c3MenuItems';
import { benefitsMenuItems } from './menuItems/benefitsMenuItems';
import { complianceMenuItems } from './menuItems/complianceMenuItems';
import { financeMenuItems } from './menuItems/financeMenuItems';
import { auditMenuItems } from './menuItems/auditMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';

export const menuItems = [
  ...dashboardMenuItems,
  ...insuredPersonsMenuItems,
  ...employersMenuItems,
  ...c3MenuItems,
  ...benefitsMenuItems,
  ...complianceMenuItems,
  ...financeMenuItems,
  ...auditMenuItems,
  ...systemAdminMenuItems
];
