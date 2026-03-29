import { userMenuItems } from './menuItems/userMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';
import { masterDataMenuItems } from './menuItems/masterDataMenuItems';

// Administration menu items
export const menuItems = [
  ...userMenuItems,
  ...masterDataMenuItems,
  ...systemAdminMenuItems
];
