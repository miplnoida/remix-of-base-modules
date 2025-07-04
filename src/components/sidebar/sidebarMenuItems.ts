
import { dashboardMenuItems } from './menuItems/dashboardMenuItems';
import { employersManagementMenuItems } from './menuItems/employersManagementMenuItems';
import { selfEmployedMenuItems } from './menuItems/selfEmployedMenuItems';
import { complianceMenuItems } from './menuItems/complianceMenuItems';
import { registrationMenuItems } from './menuItems/registrationMenuItems';
import { userMenuItems } from './menuItems/userMenuItems';
import { insuredPersonsMenuItems } from './menuItems/insuredPersonsMenuItems';
import { benefitsMenuItems } from './menuItems/benefitsMenuItems';
import { reportsMenuItems } from './menuItems/reportsMenuItems';
import { documentMenuItems } from './menuItems/documentMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';

export const menuItems = [
  ...dashboardMenuItems,
  ...employersManagementMenuItems,
  ...selfEmployedMenuItems,
  ...complianceMenuItems,
  ...registrationMenuItems,
  ...insuredPersonsMenuItems,
  ...benefitsMenuItems,
  ...reportsMenuItems,
  ...documentMenuItems,
  ...userMenuItems,
  ...systemAdminMenuItems
];
