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
- **File Upload Server**: Express.js backend (port 3000) with Multer for handling file uploads
- **File Storage**: Physical files stored in `/wwwroot/files` directory

### Data Visualization
- **Chart Library**: ApexCharts integration for dynamic financial dashboards
- **Calendar System**: FullCalendar for agenda and scheduling features
- **Interactive UI**: SweetAlert2 for enhanced user notifications and confirmations

### File Management
- **Upload System**: Real file upload via Express/Multer backend to `/wwwroot/files`
- **Storage**: Files physically saved with unique names to prevent conflicts
- **API Endpoints**: `/api/upload` (POST) for uploads, `/api/files/:filename` (DELETE) for deletion
- **File Serving**: Static file serving from `/files/` path
- **Validation**: Max 50MB per file, support for PDFs, images, documents, spreadsheets, text files, and compressed files
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

### Backend Services
- **Express** (^5.1.0): HTTP server for file upload API
- **Multer** (^2.0.2): Middleware for handling multipart/form-data file uploads
- **CORS** (^2.8.5): Cross-Origin Resource Sharing support

### Development Tools
- **Vite** (^5.4.8): Build tool and development server with hot module replacement (HMR disabled for stability)

### Third-party Integrations
- **CDN Resources**: External CSS and font libraries loaded via CDN for styling components
- **Machine Learning Features**: Built-in AI analytics for financial predictions and insights (appears to be custom implementation)

### Browser APIs
- **File API**: For document upload and attachment management
- **LocalStorage**: For theme preferences and client-side data persistence
- **Fetch API**: For backend communications with file upload server (http://localhost:3000)

## Recent Changes

### 2025-10-04: Real File Upload Implementation
- ✅ Created `/wwwroot/files` directory for physical file storage
- ✅ Implemented Express.js backend server for file uploads (port 3000)
- ✅ Modified frontend to send files via FormData/fetch instead of mock simulation
- ✅ Configured dual-server workflow: Backend (port 3000) + Frontend (port 5000)
- ✅ Files are now permanently saved to disk with unique names
- ✅ Added file deletion endpoint and static file serving

### 2025-10-04: Agenda Event Editing Bug Fix
- ✅ Fixed event duplication issue when editing events in the calendar
- ✅ Removed duplicate `showEventDetails` function
- ✅ Implemented in-place event updates using FullCalendar's `setProp` methods
- ✅ Added proper `editingEventId` state management