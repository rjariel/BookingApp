import NavDropdown from './NavDropdown';

type Item = { href: string; label: string };

export default function SettingsDropdown({ items }: { items: Item[] }) {
  return <NavDropdown label="Settings" items={items} activePrefix="/admin/settings" />;
}
