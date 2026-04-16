import { userMenuItems } from './menuItems/userMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';
import { masterDataMenuItems } from './menuItems/masterDataMenuItems';
import { bnMenuItems } from './menuItems/bnMenuItems';

// Administration menu items
// Note: BeMA Compliance menu removed - consolidated into Compliance & Enforcement module
export const menuItems = [
  ...userMenuItems,
  ...masterDataMenuItems,
  ...bnMenuItems,
  ...systemAdminMenuItems
];
