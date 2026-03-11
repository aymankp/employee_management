import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} />

      <div style={{ 
        flex: 1,
        marginLeft: '280px',
        backgroundColor: 'var(--bg-color)',
        minHeight: '100vh'
      }}>

        <Header toggleSidebar={toggleSidebar} />

        <main style={{ padding: '24px' }}>
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default Layout;