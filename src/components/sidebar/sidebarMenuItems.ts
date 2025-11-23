import { dashboardMenuItems } from './menuItems/dashboardMenuItems';
import { insuredPersonsMenuItems } from './menuItems/insuredPersonsMenuItems';
import { employersMenuItems } from './menuItems/employersMenuItems';
import { c3MenuItems } from './menuItems/c3MenuItems';
import { complianceMenuItems } from './menuItems/complianceMenuItems';
import { financeMenuItems } from './menuItems/financeMenuItems';
import { auditMenuItems } from './menuItems/auditMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';
import { nbenefitMenuItems } from './menuItems/nbenefitMenuItems';
import { correspondenceMenuItems } from './menuItems/correspondenceMenuItems';
import { legalManagementMenuItems } from './menuItems/legalManagementMenuItems';

export const menuItems = [
  ...dashboardMenuItems,
  ...insuredPersonsMenuItems,
  ...employersMenuItems,
  ...c3MenuItems,
  ...nbenefitMenuItems,
  ...complianceMenuItems,
  ...legalManagementMenuItems,
  ...financeMenuItems,
  ...auditMenuItems,
  ...correspondenceMenuItems,
  ...systemAdminMenuItems
];
