# Sistema de Contas a Pagar e Receber - Enterprise Edition

## Overview

This is a comprehensive financial management system designed for enterprise-level accounts payable and receivable management. The system features an intelligent dashboard with real-time analytics, AI-powered insights, and automated financial process management. Built as a modern web application, it provides complete financial workflow management from basic account control to advanced predictive analytics and machine learning capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Single Page Application (SPA)**: Built with vanilla JavaScript using a class-based architecture (`SistemaContasApp`)
- **Tab-based Navigation**: Multi-section interface with dashboard, accounts payable/receivable, consolidated reports, agenda, logs, and file management
- **Responsive Design**: CSS custom properties for theming with dark/light mode support
- **Component System**: Modular approach with separate concerns for charts, modals, calendars, and file handling

### Backend Architecture
- **Database Layer**: PostgreSQL with connection pooling using `pg` library
- **Transaction Management**: Database class with transaction support and error handling
- **Setup Scripts**: Automated database initialization with schema creation and seed data

### Data Visualization
- **Chart Library**: ApexCharts integration for dynamic financial dashboards
- **Calendar System**: FullCalendar for agenda and scheduling features
- **Interactive UI**: SweetAlert2 for enhanced user notifications and confirmations

### File Management
- **Upload System**: Built-in file attachment and management capabilities
- **Sortable Interface**: SortableJS for drag-and-drop functionality

### State Management
- **Client-side State**: JavaScript object-based state management with local persistence
- **Event System**: Custom event handling for tab switching, modal management, and data updates
- **Pagination**: Built-in pagination system for logs and data tables

### Theme System
- **CSS Custom Properties**: Dynamic theming with dark/light mode toggle
- **Responsive Layout**: Mobile-first design approach with flexible grid systems

## External Dependencies

### Core Libraries
- **ApexCharts** (^4.7.0): Advanced charting and data visualization for financial dashboards and analytics
- **FullCalendar** (^6.1.17): Calendar component for agenda management and event scheduling
- **SweetAlert2** (^11.22.0): Enhanced modal dialogs and user notifications
- **SortableJS** (^1.15.6): Drag-and-drop functionality for interface elements

### Database
- **PostgreSQL**: Primary database via `pg` (^8.16.0) with connection pooling and transaction support

### Development Tools
- **Vite** (^5.4.8): Build tool and development server with hot module replacement

### Third-party Integrations
- **CDN Resources**: External CSS and font libraries loaded via CDN for styling components
- **Machine Learning Features**: Built-in AI analytics for financial predictions and insights (appears to be custom implementation)

### Browser APIs
- **File API**: For document upload and attachment management
- **LocalStorage**: For theme preferences and client-side data persistence
- **Fetch API**: For potential backend communications (architecture suggests future API integration)