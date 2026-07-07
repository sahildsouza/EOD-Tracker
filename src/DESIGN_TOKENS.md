# EOD Tracker — Design Tokens

All tokens are defined in `src/index.css` under `:root` (light) and `[data-theme='dark']` (dark).

## Color Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-page` | `#F5F5F5` | `#0A0A0A` | Page background, table header bg |
| `--bg-surface` | `#FFFFFF` | `#141414` | Card/panel backgrounds |
| `--border-color` | `#E0E0E0` | `#2A2A2A` | All borders |
| `--text-primary` | `#1A1A1A` | `#F5F5F5` | Headings, body text, values |
| `--text-secondary` | `#6B7280` | `#9CA3AF` | Labels, captions, muted text |
| `--accent-color` | `#2563EB` | `#3B82F6` | Primary buttons, links, focus |
| `--accent-hover` | `#1D4ED8` | `#60A5FA` | Primary button hover |
| `--danger-color` | `#DC2626` | `#EF4444` | Danger buttons, error states |
| `--danger-hover` | `#B91C1C` | `#F87171` | Danger hover |
| `--success-color` | `#16A34A` | `#22C55E` | Success states, shift badges |
| `--warning-color` | `#D97706` | `#F59E0B` | Warning states, leave badges |

### Semantic Colors (same in both themes)

| Token | Value | Usage |
|---|---|---|
| `--color-blue` | `#3B82F6` | KPI icons, employee badges |
| `--color-green` | `#10B981` | KPI icons, shift indicators |
| `--color-amber` | `#F59E0B` | KPI icons, leave indicators |
| `--color-red` | `#EF4444` | KPI icons, defaulter indicators |
| `--color-purple` | `#8B5CF6` | Avatar gradients, location icons |
| `--color-teal` | `#14B8A6` | Week-off calendar dots |

### Category Colors

| Token | Value | Usage |
|---|---|---|
| `--category-meeting` | `#2563EB` | Meeting log badges |
| `--category-support` | `#16A34A` | Support log badges |
| `--category-troubleshooting` | `#D97706` | Troubleshooting log badges |
| `--category-break` | `#64748B` | Break log badges |
| `--category-activity` | `#7C3AED` | Activity log badges |
| `--category-others` | `#6B7280` | Others log badges |

## Spacing Scale

| Token | Value | rem |
|---|---|---|
| `--space-1` | `4px` | `0.25rem` |
| `--space-2` | `8px` | `0.5rem` |
| `--space-3` | `12px` | `0.75rem` |
| `--space-4` | `16px` | `1rem` |
| `--space-5` | `20px` | `1.25rem` |
| `--space-6` | `24px` | `1.5rem` |
| `--space-8` | `32px` | `2rem` |

## Radius Scale

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Small badges, scrollbar thumb |
| `--radius-md` | `8px` | Buttons, inputs, search boxes, avatar badges |
| `--radius-lg` | `12px` | Cards, panels, modals, hero cards |
| `--radius-pill` | `9999px` | Pill-shaped badges |

## Shadow Scale

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.04)` | `...0.12)` | Subtle elevation |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.04)` | `...0.16)` | Cards at rest |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.08)` | `...0.24)` | Hover / elevated |
| `--shadow-xl` | `0 20px 40px rgba(0,0,0,0.15)` | `...0.4)` | Modals / dialogs |
| `--ring-focus` | `0 0 0 3px rgba(37,99,235,0.12)` | `...0.2)` | Focus rings |

## Typography Scale

| Token | Value | Usage |
|---|---|---|
| `--text-xs` | `0.75rem` | Table headers, tiny labels |
| `--text-sm` | `0.82rem` | Filter labels, badge text, captions |
| `--text-base` | `0.875rem` | Body text, form labels, buttons |
| `--text-md` | `1rem` | Item names, settings |
| `--text-lg` | `1.15rem` | Card titles, section headers |
| `--text-xl` | `1.25rem` | Page titles (desktop) |
| `--text-2xl` | `1.5rem` | Hero titles |

## Motion

| Token | Value | Usage |
|---|---|---|
| `--transition-fast` | `150ms ease` | Hovers, focus, color changes |
| `--transition-normal` | `200ms ease` | Layout shifts, panel transitions |

## Canonical Breakpoints

| Name | Value | Usage |
|---|---|---|
| xs | `480px` | Small phone tweaks |
| sm | `768px` | Tablet / mobile layout switch |
| md | `1024px` | Desktop layout switch |
