# NetGuard AI - Network Security Monitoring Dashboard

## Overview

NetGuard AI is a real-time network security monitoring dashboard that combines machine learning-based anomaly detection with traditional network traffic analysis. The application provides security administrators with comprehensive insights into network activity, threat detection, and system performance through an intuitive web interface.

The system features a React-based frontend with real-time data visualization, a Node.js/Express backend API, PostgreSQL database for data persistence, and WebSocket connections for live updates. It includes ML-powered anomaly detection using TensorFlow.js to identify suspicious network patterns and potential security threats.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration for live data streaming
- **Charts**: Recharts library for data visualization and analytics dashboards
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with structured error handling
- **Real-time Communication**: WebSocket server for live data broadcasting
- **Session Management**: Express sessions with PostgreSQL storage
- **Request Logging**: Custom middleware for API request/response logging

### Database Layer
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Connection**: @neondatabase/serverless for optimized serverless connections

### Data Models
The system tracks five core entities:
- **Users**: Authentication and user management
- **Network Traffic**: Source/destination IPs, protocols, ports, byte counts, risk scores
- **Alerts**: Security notifications with severity levels and acknowledgment status
- **System Metrics**: Performance data including CPU, memory, and traffic volume
- **ML Model Configuration**: Anomaly detection parameters and thresholds

### Machine Learning Integration
- **Framework**: TensorFlow.js for client-side anomaly detection
- **Model Architecture**: Sequential neural network with dense layers and dropout
- **Detection Strategy**: Hybrid approach combining ML predictions with rule-based fallbacks
- **Training Data**: Synthetic data generation for model initialization
- **Real-time Processing**: Live traffic analysis with configurable risk scoring

### Security Features
- **Anomaly Detection**: ML-based identification of suspicious network patterns
- **Risk Scoring**: Numerical assessment of traffic threat levels (0-10 scale)
- **Alert System**: Tiered notifications (CRITICAL, WARNING, INFO) with acknowledgment tracking
- **Traffic Classification**: Automatic categorization as ALLOWED, BLOCKED, or FLAGGED
- **Real-time Monitoring**: Continuous analysis with WebSocket-based updates

### Development Workflow
- **Development Server**: Vite dev server with HMR and Express API proxy
- **Production Build**: Static frontend assets with bundled Node.js backend
- **Database Migrations**: Drizzle push for schema updates
- **Type Safety**: End-to-end TypeScript with shared schema definitions

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection driver
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **express**: Web application framework for Node.js
- **@tanstack/react-query**: Server state management and caching
- **@tensorflow/tfjs**: Machine learning library for anomaly detection

### UI Component Libraries
- **@radix-ui/react-\***: Headless UI primitives for accessible components
- **class-variance-authority**: Utility for managing component variants
- **tailwindcss**: Utility-first CSS framework
- **recharts**: Chart library for data visualization
- **lucide-react**: Icon library for consistent iconography

### Real-time Communication
- **ws**: WebSocket library for real-time data streaming
- **wouter**: Lightweight routing library for React

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **esbuild**: JavaScript bundler for production builds
- **drizzle-kit**: Database migration and schema management tool

### Authentication & Session Management
- **connect-pg-simple**: PostgreSQL session store for Express
- **express-session**: Session middleware for user authentication

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx**: Conditional className utility
- **zod**: Runtime type validation for API schemas