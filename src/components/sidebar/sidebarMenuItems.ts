import { userMenuItems } from './menuItems/userMenuItems';
import { systemAdminMenuItems } from './menuItems/systemAdminMenuItems';

// Administration menu items
export const menuItems = [
  ...userMenuItems,
  ...systemAdminMenuItems
];
