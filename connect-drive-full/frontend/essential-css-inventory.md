# Essential CSS Inventory - Must Preserve

## Critical Custom Classes Currently Used in Components

### 1. Button System (HIGH PRIORITY)
**Used in**: 15+ components across the application

```css
/* Base button - KEEP */
.btn {
  @apply inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Button variants - KEEP ALL */
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 px-4 py-2;
}

.btn-secondary {
  @apply bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 px-4 py-2;
}

.btn-ghost {
  @apply text-gray-600 hover:bg-gray-100 focus:ring-gray-500 px-3 py-2;
}

/* Button sizes - KEEP */
.btn-sm { @apply px-3 py-1.5 text-sm; }
.btn-md { @apply px-4 py-2 text-sm; }
.btn-lg { @apply px-6 py-3 text-base; }
.btn-xl { @apply px-8 py-4 text-lg; }
```

**Usage Locations**:
- `pages/index.tsx`: 4 instances
- `pages/upload.tsx`: 2 instances  
- `pages/share/[token].tsx`: 3 instances
- `pages/organization.tsx`: 5 instances
- `pages/dashboard.tsx`: 1 instance
- `components/ShareModal.tsx`: 2 instances
- `components/OrganizationModal.tsx`: 4 instances
- `components/ui/ContactInfo.tsx`: 2 instances

### 2. Modal System (HIGH PRIORITY)
**Used in**: ShareModal, OrganizationModal, ui/Modal

```css
/* Modal overlay with backdrop-filter - KEEP (cannot replicate with Tailwind) */
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4;
  backdrop-filter: blur(4px);
}

/* Modal content - KEEP */
.modal-content {
  @apply bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto;
}
```

**Usage Locations**:
- `components/ShareModal.tsx`: 2 instances
- `components/OrganizationModal.tsx`: 2 instances
- `components/ui/Modal.tsx`: 2 instances

### 3. Form Input System (HIGH PRIORITY)
**Used in**: 5+ components for form inputs

```css
/* Input field - KEEP */
.input-field {
  @apply block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200;
}
```

**Usage Locations**:
- `pages/share/[token].tsx`: 1 instance
- `pages/organization.tsx`: 1 instance
- `components/ShareModal.tsx`: 5 instances
- `components/OrganizationModal.tsx`: 3 instances

### 4. Breadcrumb System (MEDIUM PRIORITY)
**Used in**: ui/Breadcrumb component

```css
/* Breadcrumb navigation - KEEP */
.breadcrumb-modern {
  @apply flex items-center space-x-2 text-sm;
}

.breadcrumb-item-modern {
  @apply flex items-center;
}

.breadcrumb-link-modern {
  @apply text-gray-500 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-blue-50 font-medium;
}

.breadcrumb-current-modern {
  @apply text-gray-900 font-semibold px-3 py-2;
}

.breadcrumb-separator-modern {
  @apply w-4 h-4 text-gray-400 mx-1;
}
```

**Usage Locations**:
- `components/ui/Breadcrumb.tsx`: 5 instances

### 5. Accessibility Classes (HIGH PRIORITY)
**Used in**: Toast component and potentially others

```css
/* Screen reader only - KEEP */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Usage Locations**:
- `components/ui/Toast.tsx`: 1 instance

## Essential Animations (MEDIUM PRIORITY)

### Custom Keyframes - Cannot be replicated with Tailwind
```css
/* Fade in animation - KEEP */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide in up animation - KEEP */
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale in animation - KEEP */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Shimmer animation for loading states - KEEP */
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

/* Animation classes - KEEP */
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-slide-in-up { animation: slideInUp 0.3s ease-out; }
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
.animate-shimmer { animation: shimmer 1.5s infinite; }
```

## Essential Browser-Specific Styles (HIGH PRIORITY)

### Custom Scrollbar - Cannot be replicated with Tailwind
```css
/* Webkit scrollbar customization - KEEP */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded-full;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full hover:bg-gray-400 transition-colors duration-200;
}
```

### Selection Styles
```css
/* Text selection styling - KEEP */
::selection {
  background-color: rgba(59, 130, 246, 0.2);
  color: #1e40af;
}

::-moz-selection {
  background-color: rgba(59, 130, 246, 0.2);
  color: #1e40af;
}
```

## Essential Utility Classes (LOW-MEDIUM PRIORITY)

### Glassmorphism Effect - Cannot be replicated with Tailwind
```css
/* Glass effect - KEEP if used */
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### Loading States
```css
/* Skeleton loading - KEEP shimmer animation */
.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
```

## Essential Media Queries (HIGH PRIORITY)

### Print Styles
```css
/* Print optimization - KEEP */
@media print {
  .no-print { display: none !important; }
  .sidebar { display: none !important; }
  .main-content { margin-left: 0 !important; }
}
```

### Accessibility Support
```css
/* Reduced motion support - KEEP */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High contrast mode - KEEP */
@media (prefers-contrast: high) {
  .btn-primary {
    @apply bg-black text-white border-2 border-black;
  }
  
  .card {
    @apply border-2 border-gray-800;
  }
}
```

## Summary of Essential CSS (Final optimized globals.css)

**Total Essential Lines**: ~200-250 lines

### Structure:
1. **Tailwind imports** (3 lines)
2. **Component layer with essential classes** (~80 lines)
   - Button system (30 lines)
   - Modal system (10 lines)
   - Form system (8 lines)
   - Breadcrumb system (20 lines)
   - Accessibility (5 lines)
3. **Essential animations** (~40 lines)
   - Keyframes (25 lines)
   - Animation classes (15 lines)
4. **Browser-specific styles** (~30 lines)
   - Scrollbar (15 lines)
   - Selection (8 lines)
   - Glass effect (7 lines)
5. **Media queries** (~40 lines)
   - Print styles (15 lines)
   - Accessibility (25 lines)

### Files to Delete:
- `components.css` (800+ lines) - 95% unused
- `design-tokens.css` (1300+ lines) - 90% redundant with Tailwind
- `modern-components.css` (1000+ lines) - 99% unused
- `utilities.css` (500+ lines) - 95% redundant with Tailwind
- `animations.css` (400+ lines) - 85% unused
- `responsive.css` (300+ lines) - 95% redundant with Tailwind

**Total Reduction**: From ~5300 lines to ~250 lines = **95.3% reduction**