
import { dashboardMenuItems } from './menuItems/dashboardMenuItems';
import { employerMenuItems } from './menuItems/employerMenuItems';
import { insuredPersonsMenuItems } from './menuItems/insuredPersonsMenuItems';
import { benefitsMenuItems } from './menuItems/benefitsMenuItems';
import { complianceMenuItems } from './menuItems/complianceMenuItems';
import { reportsMenuItems } from './menuItems/reportsMenuItems';
import { documentMenuItems } from './menuItems/documentMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';

export const menuItems = [
  ...dashboardMenuItems,
  ...employerMenuItems,
  ...insuredPersonsMenuItems,
  ...benefitsMenuItems,
  ...complianceMenuItems,
  ...reportsMenuItems,
  ...documentMenuItems,
  ...systemAdminMenuItems
];
