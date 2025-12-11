# CSS to Tailwind Mapping Guide

## Custom CSS to Tailwind Equivalents

### Button System Mapping

#### Current Custom CSS:
```css
.btn-modern {
  @apply inline-flex items-center justify-center rounded-xl font-semibold;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-all duration-200 ease-out;
  @apply relative overflow-hidden;
  @apply shadow-sm hover:shadow-md;
}
```

#### Tailwind Equivalent:
```tsx
className="inline-flex items-center justify-center rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out relative overflow-hidden shadow-sm hover:shadow-md"
```

#### Optimized Custom CSS (Keep):
```css
.btn {
  @apply inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 px-4 py-2;
}

.btn-secondary {
  @apply bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 px-4 py-2;
}

.btn-ghost {
  @apply text-gray-600 hover:bg-gray-100 focus:ring-gray-500 px-3 py-2;
}
```

### Layout System Mapping

#### Current Custom CSS:
```css
.sidebar {
  @apply w-64 bg-gray-50 border-r border-gray-200 h-screen fixed left-0 top-0;
}

.main-content {
  @apply ml-64 min-h-screen bg-white;
}
```

#### Replace with Tailwind in Components:
```tsx
// Sidebar
className="w-64 bg-gray-50 border-r border-gray-200 h-screen fixed left-0 top-0"

// Main Content
className="ml-64 min-h-screen bg-white"
```

### Card System Mapping

#### Current Custom CSS:
```css
.card {
  @apply bg-white rounded-xl shadow-sm border border-gray-200;
  @apply transition-all duration-300 ease-out;
  @apply hover:shadow-lg hover:-translate-y-1;
}

.card-interactive {
  @apply cursor-pointer;
  @apply hover:shadow-xl hover:-translate-y-2;
  @apply hover:border-blue-200;
}
```

#### Replace with Tailwind:
```tsx
// Basic Card
className="bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1"

// Interactive Card
className="bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-300 ease-out cursor-pointer hover:shadow-xl hover:-translate-y-2 hover:border-blue-200"
```

### Form System Mapping

#### Current Custom CSS:
```css
.form-input {
  @apply block w-full px-4 py-3 border border-gray-300 rounded-lg;
  @apply bg-white text-gray-900 placeholder-gray-500;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  @apply disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed;
  @apply transition-all duration-200 ease-out;
}
```

#### Optimized Custom CSS (Keep as input-field):
```css
.input-field {
  @apply block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200;
}
```

### Modal System Mapping

#### Current Custom CSS:
```css
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 z-50;
  @apply flex items-center justify-center p-4;
  backdrop-filter: blur(4px);
}

.modal-content {
  @apply bg-white rounded-2xl shadow-2xl max-w-lg w-full;
  @apply animate-scale-in;
  @apply max-h-[90vh] overflow-y-auto;
}
```

#### Keep as Custom CSS (backdrop-filter not in Tailwind):
```css
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4;
  backdrop-filter: blur(4px);
}

.modal-content {
  @apply bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto;
}
```

### Navigation System Mapping

#### Current Custom CSS:
```css
.nav-item {
  @apply flex items-center px-4 py-3 text-sm font-medium rounded-lg;
  @apply transition-all duration-200 ease-out;
  @apply hover:bg-gray-100 hover:text-gray-900;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.nav-item.active {
  @apply bg-gradient-to-r from-blue-50 to-blue-100;
  @apply text-blue-700 border-r-2 border-blue-600;
}
```

#### Replace with Tailwind:
```tsx
// Regular nav item
className="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"

// Active nav item
className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-2 border-blue-600"
```

### Typography System Mapping

#### Current Custom CSS:
```css
.text-gradient {
  @apply bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent;
}

.responsive-heading-1 {
  font-size: clamp(1.875rem, 5vw, 3rem);
  line-height: 1.2;
  font-weight: 700;
}
```

#### Replace with Tailwind + Custom:
```tsx
// Text gradient - keep as custom
className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"

// Responsive heading - use Tailwind responsive classes
className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
```

### Animation System Mapping

#### Keep Essential Animations:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-slide-in-up { animation: slideInUp 0.3s ease-out; }
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
```

#### Remove (Use Tailwind):
- `animate-pulse` → `animate-pulse` (Tailwind built-in)
- `animate-spin` → `animate-spin` (Tailwind built-in)
- `animate-bounce` → `animate-bounce` (Tailwind built-in)

### Utility Classes Mapping

#### Current Custom Utilities:
```css
.hover-lift {
  @apply transition-all duration-300;
}
.hover-lift:hover {
  @apply -translate-y-1 shadow-lg;
}

.loading-skeleton {
  @apply bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200;
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
```

#### Replace with Tailwind:
```tsx
// Hover lift
className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"

// Loading skeleton - keep shimmer animation as custom
className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse"
```

### Status and Badge System Mapping

#### Current Custom CSS:
```css
.status-indicator {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.status-online {
  @apply bg-green-100 text-green-800 border border-green-200;
}
```

#### Replace with Tailwind:
```tsx
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
```

## Classes to Remove Completely

### Unused Component Classes:
- `.file-grid-modern`, `.file-list-modern`, `.file-item-modern`
- `.table-container-modern`, `.table-modern`, `.table-header-modern`
- `.search-container-modern`, `.search-input-modern`, `.search-results-modern`
- `.notification-modern`, `.toast-modern`
- `.progress-container-modern`, `.progress-bar-modern`
- `.auth-container-modern`, `.auth-card-modern`, `.auth-form-modern`
- `.avatar-modern`, `.dropdown-modern`

### Redundant Utility Classes:
- `.container-fluid`, `.container-narrow`, `.container-wide` (use Tailwind containers)
- `.text-fluid`, `.text-fluid-lg` (use Tailwind responsive text)
- `.space-y-fluid`, `.space-x-fluid` (use Tailwind spacing)
- `.bg-pattern-dots`, `.bg-pattern-grid` (create with Tailwind if needed)
- `.shadow-soft`, `.shadow-medium`, `.shadow-large` (use Tailwind shadows)

### Redundant Animation Classes:
- `.hover-scale`, `.hover-glow`, `.hover-rotate` (use Tailwind transforms)
- `.loading-dots`, `.loading-spinner` (use Tailwind + simple custom)
- `.transition-all`, `.transition-colors` (use Tailwind transitions)

## Implementation Strategy

### Step 1: Update Component Usage
Replace custom classes with Tailwind equivalents in components:

```tsx
// Before
<button className="btn-modern btn-modern-primary btn-modern-lg">

// After  
<button className="btn btn-primary px-6 py-3 text-base">
```

### Step 2: Create Minimal Custom CSS
Keep only essential custom classes that cannot be replicated with Tailwind:

```css
/* Essential custom classes only */
.btn { /* base button styles */ }
.btn-primary { /* primary button variant */ }
.btn-secondary { /* secondary button variant */ }
.btn-ghost { /* ghost button variant */ }
.modal-overlay { /* modal with backdrop-filter */ }
.modal-content { /* modal content */ }
.input-field { /* form input */ }
.animate-fade-in { /* custom animation */ }
.animate-slide-in-up { /* custom animation */ }
.animate-scale-in { /* custom animation */ }
.glass { /* glassmorphism effect */ }
.sr-only { /* accessibility */ }
```

### Step 3: Remove Unused Files
Delete the following CSS files:
- `components.css`
- `design-tokens.css`
- `modern-components.css`
- `utilities.css`
- `animations.css`
- `responsive.css`

### Step 4: Update Imports
Update `globals.css` to remove imports of deleted files and keep only essential custom styles.

This mapping will reduce CSS from ~5300 lines to ~250 lines while maintaining all functionality.