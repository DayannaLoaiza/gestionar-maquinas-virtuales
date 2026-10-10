# shadcn/ui Component Selection Guide — apps/frontend

> **Aún no instalado:** shadcn/Radix. Esta guía decide qué componente usar en cuanto existan; los
> nombres son los wrappers de `src/components/ui/` (ver `component-imports.md`).

## Dialogs, Overlays, and Forms

| Need                                        | Component                            | Why                                                   |
| ------------------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| Confirm destructive action (delete a VM)    | `Dialog` with confirmation step      | Blocks until user decides                             |
| Quick modal form (2-3 fields, simple input) | `Dialog`                             | Interactive content, closes with Esc or click outside |
| Complex form (4+ fields, conditional logic) | Dedicated route (`/create`, `/edit`) | Full page, deeplinking, back button, consistency      |
| Side panel with long content                | `Sheet`                              | Doesn't fully hide context, scrollable                |
| Quick options positioned near a trigger     | `Popover`                            | Lightweight, non-blocking, positioned                 |

**Route-based forms pattern:** each CRUD module uses `/<module>/create` and `/<module>/[id]/edit`
as separate pages with dedicated form components: deeplinking, browser back button and Server
Component data loading.

## Menus and Navigation

| Need                                   | Component      | Why                                                                                      |
| -------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| Actions on an item (3 dots, user menu) | `DropdownMenu` | Keyboard nav, submenus, standard pattern                                                 |
| Search + select inside a control       | `Command`      | Live filtering                                                                           |
| Change a state by picking it           | `StatusSelect` | `DropdownMenu` + `RadioGroup` showing each state's color (e.g. VM power)                 |
| Selection from options (<10)           | `Select`       | Native: accessible, no JS, system picker on mobile                                       |
| Long list, with search or groups       | `Combobox`     | Accent-insensitive search and group headers; draws max 50 rows (cmdk doesn't virtualize) |

## Forms

| Need                         | Component                                     | Why                                                 |
| ---------------------------- | --------------------------------------------- | --------------------------------------------------- |
| Short text                   | `Input`                                       | Always with label, error state from react-hook-form |
| Long text                    | `Textarea`                                    | Same label, focus and error state as `Input`        |
| On/off in a form with submit | `Checkbox` (native `<input type="checkbox">`) | Submitted with the form                             |
| Exclusive options (2-5)      | Radio group (native)                          | All options visible                                 |

## Feedback

| Need                             | Component                  | Why                                                                  |
| -------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| Ephemeral notification           | `Sonner` (toast)           | Auto-dismiss, no action required                                     |
| Persistent in-page information   | Alert box (manual div)     | Stays visible, in-page context                                       |
| Status                           | `StatusBadge`              | One tone per state, always with the state's name (color never alone) |
| Category                         | Badge local to the feature | A shared one only once two features need it                          |
| Content loading with layout hint | `Skeleton`                 | Better UX than spinner                                               |
