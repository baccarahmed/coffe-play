# Coffee Play

A comprehensive web-based management system for PlayStation café networks with two locations.

## Overview

This platform manages two PlayStation café locations (Café A and Café B), handling game sessions, product inventory, billing, and comprehensive analytics.

## Features

### User Roles
- **Worker**: Access to their assigned café only - game sessions, inventory, sales recording
- **Admin/Manager**: Access to both cafés - comprehensive analytics, system management

### Core Modules
1. **Game Sessions**: Timed billing (30min/1hr) with per-game pricing
2. **Product Management**: beverages and inventory control with supplements
3. **Billing & Revenue**: Real-time accounting and reporting
4. **Analytics**: Business intelligence dashboard with live updates

### Technology Stack
- Frontend: React with Framer Motion for animations
- Backend: Node.js/Express
- Database: PostgreSQL with real-time updates
- Payments: Stripe/Razorpay integration
- Real-time: WebSocket/Webhooks

## User Guide

### For Workers
1. Login with credentials to access your café only
2. Start/stop game sessions with pricing calculator
3. Record product sales and check inventory
4. Report stock issues

### For Admins
1. Login to access both cafés
2. View comprehensive analytics dashboard
3. Manage prices, inventory, and user accounts
4. Export data for reporting

## Setup

1. Install dependencies: `npm install`
2. Configure environment variables
3. Set up database and payment providers
4. Deploy to production

## Documentation

- API Documentation: Available in the codebase
- User Manuals: Included in the application
- Admin Guide: Provided for management
- Development Guide: For technical team