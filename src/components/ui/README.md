# Back Button Components

This directory contains reusable Back button components that follow the established design patterns in the Secure Nation Benefits Hub application.

## Components

### BackButton

A simple, reusable back button component with consistent styling.

#### Props

- `to?: string` - Route to navigate to (optional)
- `onClick?: () => void` - Custom click handler (optional)
- `variant?: 'ghost' | 'outline'` - Button variant (default: 'ghost')
- `size?: 'sm' | 'default'` - Button size (default: 'sm')
- `children?: React.ReactNode` - Button text (default: 'Back')
- `className?: string` - Additional CSS classes

#### Usage

```tsx
import { BackButton } from '@/components/ui';

// Simple back button (goes back in history)
<BackButton />

// Back button with custom text
<BackButton>Back to Dashboard</BackButton>

// Back button that navigates to specific route
<BackButton to="/dashboard">Go to Dashboard</BackButton>

// Back button with custom action
<BackButton onClick={() => handleCustomBack()}>Custom Back</BackButton>

// Back button with different variant
<BackButton variant="outline">Back</BackButton>
```

### BackNavigation

A comprehensive back navigation component that includes breadcrumb navigation and optional right-side content.

#### Props

- `to?: string` - Route to navigate to (optional)
- `onClick?: () => void` - Custom click handler (optional)
- `variant?: 'ghost' | 'outline'` - Button variant (default: 'ghost')
- `size?: 'sm' | 'default'` - Button size (default: 'sm')
- `backText?: string` - Back button text (default: 'Back')
- `breadcrumbs?: BreadcrumbItem[]` - Array of breadcrumb items
- `rightContent?: React.ReactNode` - Content to display on the right side
- `className?: string` - Additional CSS classes

#### BreadcrumbItem Interface

```tsx
interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}
```

#### Usage

```tsx
import { BackNavigation } from '@/components/ui';

// Simple back navigation
<BackNavigation backText="Back to Dashboard" />

// Back navigation with breadcrumbs
<BackNavigation
  backText="Back to Dashboard"
  breadcrumbs={[
    { label: 'Benefits Management' },
    { label: 'All Benefits', current: true }
  ]}
/>

// Back navigation with clickable breadcrumbs
<BackNavigation
  backText="Back to Profile"
  breadcrumbs={[
    { label: 'User Profile & Permissions', href: '/profile' },
    { label: 'Change Password', current: true }
  ]}
/>

// Back navigation with right content
<BackNavigation
  backText="Back to Compliance"
  breadcrumbs={[
    { label: 'Compliance & Audit' },
    { label: 'Audit Management', current: true }
  ]}
  rightContent={
    <Button variant="outline" size="sm">
      Export Report
    </Button>
  }
/>
```

## Design Patterns

These components follow the established design patterns found throughout the application:

1. **Consistent Styling**: Uses the same button variants and sizing as other UI components
2. **Icon Usage**: Includes the ArrowLeft icon from Lucide React
3. **Spacing**: Follows the established spacing patterns with proper gaps and padding
4. **Responsive Design**: Works well on both desktop and mobile devices
5. **Accessibility**: Proper focus states and keyboard navigation support

## Examples

See `src/components/examples/BackButtonExample.tsx` for comprehensive usage examples.

## Integration

These components are designed to replace the repetitive back button code found throughout the application. They maintain the same visual appearance while providing better reusability and consistency.
