
import { dashboardMenuItems } from './menuItems/dashboardMenuItems';
import { insuredPersonsMenuItems } from './menuItems/insuredPersonsMenuItems';
import { employersManagementMenuItems } from './menuItems/employersManagementMenuItems';
import { c3MenuItems } from './menuItems/c3MenuItems';
import { selfEmployedMenuItems } from './menuItems/selfEmployedMenuItems';
import { benefitsMenuItems } from './menuItems/benefitsMenuItems';
import { newBenefitMenuItems } from './menuItems/newBenefitMenuItems';
import { complianceMenuItems } from './menuItems/complianceMenuItems';
import { auditMenuItems } from './menuItems/auditMenuItems';
import { documentMenuItems } from './menuItems/documentMenuItems';
import { reportsMenuItems } from './menuItems/reportsMenuItems';
import { userMenuItems } from './menuItems/userMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';
import { testMenuItems } from './menuItems/testMenuItems';
import { legalMenuItems } from './menuItems/legalMenuItems';
import { legalFinalMenuItems } from './menuItems/legalFinalMenuItems';
import { ssbLegalMenuItems } from './menuItems/ssbLegalMenuItems';
import { cashierMenuItems } from './menuItems/cashierMenuItems';
import { notificationMenuItems } from './menuItems/notificationMenuItems';
import { bemaComplianceMenuItems } from './menuItems/bemaComplianceMenuItems';
import { financeMenuItems } from './menuItems/financeMenuItems';

export const menuItems = [
  ...dashboardMenuItems,
  ...insuredPersonsMenuItems,
  ...employersManagementMenuItems,
  ...c3MenuItems,
  ...selfEmployedMenuItems,
  ...benefitsMenuItems,
  ...newBenefitMenuItems,
  ...complianceMenuItems,
  ...auditMenuItems,
  ...legalMenuItems,
  ...legalFinalMenuItems,
  ...ssbLegalMenuItems,
  ...cashierMenuItems,
  ...notificationMenuItems,
  ...bemaComplianceMenuItems,
  ...financeMenuItems,
  ...documentMenuItems,
  ...reportsMenuItems,
  ...userMenuItems,
  ...systemAdminMenuItems,
  ...testMenuItems
];
