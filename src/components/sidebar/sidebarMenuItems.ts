
import { dashboardMenuItems } from './menuItems/dashboardMenuItems';
import { insuredPersonsMenuItems } from './menuItems/insuredPersonsMenuItems';
import { employersManagementMenuItems } from './menuItems/employersManagementMenuItems';
import { selfEmployedMenuItems } from './menuItems/selfEmployedMenuItems';
import { benefitsMenuItems } from './menuItems/benefitsMenuItems';
import { complianceMenuItems } from './menuItems/complianceMenuItems';
import { documentMenuItems } from './menuItems/documentMenuItems';
import { reportsMenuItems } from './menuItems/reportsMenuItems';
import { userMenuItems } from './menuItems/userMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';

export const menuItems = [
  ...dashboardMenuItems,
  ...insuredPersonsMenuItems,
  ...employersManagementMenuItems,
  ...selfEmployedMenuItems,
  ...benefitsMenuItems,
  ...complianceMenuItems,
  ...documentMenuItems,
  ...reportsMenuItems,
  ...userMenuItems,
  ...systemAdminMenuItems
];
