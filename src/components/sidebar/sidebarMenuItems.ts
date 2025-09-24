
import { dashboardMenuItems } from './menuItems/dashboardMenuItems';
import { insuredPersonsMenuItems } from './menuItems/insuredPersonsMenuItems';
import { employersManagementMenuItems } from './menuItems/employersManagementMenuItems';
import { c3MenuItems } from './menuItems/c3MenuItems';
import { selfEmployedMenuItems } from './menuItems/selfEmployedMenuItems';
import { benefitsMenuItems } from './menuItems/benefitsMenuItems';
import { complianceMenuItems } from './menuItems/complianceMenuItems';
import { documentMenuItems } from './menuItems/documentMenuItems';
import { reportsMenuItems } from './menuItems/reportsMenuItems';
import { userMenuItems } from './menuItems/userMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';
import { testMenuItems } from './menuItems/testMenuItems';
import { legalMenuItems } from './menuItems/legalMenuItems';

export const menuItems = [
  ...dashboardMenuItems,
  ...insuredPersonsMenuItems,
  ...employersManagementMenuItems,
  ...c3MenuItems,
  ...selfEmployedMenuItems,
  ...benefitsMenuItems,
  ...complianceMenuItems,
  ...legalMenuItems,
  ...documentMenuItems,
  ...reportsMenuItems,
  ...userMenuItems,
  ...systemAdminMenuItems,
  ...testMenuItems
];
