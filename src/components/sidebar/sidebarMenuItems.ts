import { userMenuItems } from './menuItems/userMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';
import { masterDataMenuItems } from './menuItems/masterDataMenuItems';
import { bnMenuItems } from './menuItems/bnMenuItems';

// Administration menu items
export const menuItems = [
  ...userMenuItems,
  ...masterDataMenuItems,
  ...bnMenuItems,
  ...systemAdminMenuItems
];
