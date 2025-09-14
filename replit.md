# Sistema Financeiro de Contas a Pagar e Receber

## Overview

This is a comprehensive enterprise-grade financial management system built as a web application for managing accounts payable and receivable. The system provides intelligent cash flow management, predictive analytics, and process automation through a modern, responsive interface. It features a complete dashboard with real-time financial metrics, account management capabilities, consolidated reports, calendar integration, audit logs, and file management functionality.

The application follows a modular architecture with separate frontend and backend components, utilizing PostgreSQL for data persistence and modern web technologies for an optimal user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Vanilla JavaScript with ES6 modules, HTML5, CSS3 with CSS custom properties for theming
- **Module System**: Modular ES6 architecture with separate modules for Dashboard, Accounts Management, Consolidados (Reports), Agenda, Logs, and Files
- **UI Framework**: Custom CSS with Bootstrap 5.1.3 for responsive components
- **Chart Library**: ApexCharts 4.7.0 for data visualization and financial analytics
- **Calendar Integration**: FullCalendar 6.1.17 for scheduling and event management
- **Theme System**: Dark/light theme switching with CSS custom properties
- **Notifications**: SweetAlert2 11.22.0 for user feedback and confirmations

### Backend Architecture
- **Runtime**: Node.js with Express 5.1.0 framework
- **API Design**: RESTful API architecture with modular endpoint structure
- **Database Layer**: PostgreSQL with connection pooling and optimized queries
- **Security**: Helmet.js for security headers, CORS configuration, rate limiting with express-rate-limit
- **File Handling**: Multer 2.0.2 for file uploads with validation and type checking
- **Validation**: Joi 18.0.1 for request data validation and sanitization

### Data Storage
- **Primary Database**: PostgreSQL with connection pooling (max 10 connections)
- **File Storage**: Local file system with organized directory structure under wwwroot/files/upload
- **Database Design**: Normalized schema with tables for accounts payable/receivable, suppliers, clients, categories, and system logs
- **Connection Management**: Pool-based connections with automatic retry logic and health monitoring

### Authentication and Security
- **Security Headers**: Helmet.js implementation for XSS protection, content security policy
- **Rate Limiting**: Express rate limiting to prevent API abuse
- **Input Validation**: Server-side validation using Joi schemas for all API endpoints
- **File Security**: File type validation, size limits (200MB), and secure storage paths
- **Error Handling**: Comprehensive error handling with retry mechanisms and user-friendly error messages

## External Dependencies

### Core Dependencies
- **Express.js 5.1.0**: Web framework for REST API development
- **PostgreSQL (pg 8.16.0)**: Primary database with connection pooling
- **Vite 5.4.8**: Build tool and development server with HMR
- **CORS 2.8.5**: Cross-origin resource sharing configuration

### UI and Visualization
- **ApexCharts 4.7.0**: Advanced charting library for financial data visualization
- **FullCalendar 6.1.17**: Calendar component for scheduling and event management
- **SweetAlert2 11.22.0**: Modern alert and notification system
- **SortableJS 1.15.6**: Drag and drop functionality for UI interactions
- **Bootstrap 5.1.3**: CSS framework for responsive design components

### Security and Validation
- **Helmet 8.1.0**: Security middleware for Express applications
- **Joi 18.0.1**: Schema validation for API requests
- **express-rate-limit 8.1.0**: Rate limiting middleware for API protection

### File Management
- **Multer 2.0.2**: Multipart form data handling for file uploads
- **file-type 21.0.0**: File type detection and validation
- **crypto 1.0.1**: Cryptographic utilities for secure file handling

### Development Tools
- **Vite**: Modern build tool with hot module replacement for development
- **ES6 Modules**: Native JavaScript module system for code organization
- **CSS Custom Properties**: Modern CSS features for dynamic theming