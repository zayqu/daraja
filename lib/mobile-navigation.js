export function mobileDockEnabledPath() {
  // The mobile bottom dock is Daraja's single primary navigation owner.
  // Individual route groups must not re-introduce a second hamburger/menu.
  return true;
}
