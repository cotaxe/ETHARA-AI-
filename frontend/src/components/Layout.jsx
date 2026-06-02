import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Users, ShoppingCart } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
];

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>INVNTRY</h1>
          <span>Management System</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon className="icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
