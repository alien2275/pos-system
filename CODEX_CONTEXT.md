# POS System Project Summary

## Project Goal

Build a self-hosted POS and storefront platform for a small handmade goods business.

Primary products include:

* Handmade jewelry
* Stickers
* 3D prints
* Other handmade crafts

The system serves two purposes:

### 1. Vendor/Event POS

Used at:

* Craft fairs
* Vendor events
* Farmers markets
* Temporary booths

Requirements:

* Barcode scanning
* Inventory tracking
* Checkout
* Cash and card transactions
* Receipt printing
* Sales reporting

### 2. Online Storefront

Customers can:

* Visit a public store page
* Browse products
* View product images
* Purchase products outside events
* View upcoming events

The eventual goal is for QR codes on:

* Business cards
* Product tags
* Receipts

to direct customers to the online storefront.

---

# Current Infrastructure

## Hardware

Development environment:

* Raspberry Pi 4
* Ubuntu Server
* Tailscale for remote access

Management:

* VS Code Remote SSH
* GitHub repository

---

# Software Stack

Backend:

* Python
* FastAPI
* PostgreSQL

Frontend:

* React
* Vite
* React Router

Deployment:

* Docker
* Docker Compose

Administration:

* Adminer

---

# Current Database

## products

Stores inventory.

Current fields:

* id
* sku
* barcode
* name
* category
* description
* public_description
* image_url
* price_cents
* cost_cents
* quantity_on_hand
* reorder_level
* is_active
* is_public
* created_at
* updated_at

---

## inventory_transactions

Tracks inventory movement.

Stores:

* product_id
* quantity_change
* reason
* notes
* timestamp

Reasons include:

* Shipment
* Return
* Damage
* Adjustment
* Transfer

---

## sales

Stores completed sales.

Fields:

* id
* total_cents
* created_at

---

## sale_items

Stores individual line items associated with sales.

Used for:

* Receipts
* Sales history
* Product reporting

---

# Completed Features

## Dashboard

Working:

* Today's sales count
* Today's revenue

Purpose:

Quick business snapshot.

---

## Products Page

Working:

* Add product
* Edit product
* Deactivate product
* Reactivate inactive products
* SKU duplicate detection
* Barcode duplicate detection

Supports:

* Price in dollars
* Cost in dollars

Converted to cents automatically.

New storefront fields added:

* public_description
* image_url
* is_public

---

## Inventory Page

Working:

* Inventory adjustments
* Low stock reporting
* Inventory history
* Inventory transaction logging

---

## Checkout Page

Working:

* Barcode entry
* Shopping cart
* Quantity adjustment
* Remove items
* Cash transactions
* Card transactions
* Change calculation
* Sale completion

Completing a sale:

* Creates sale record
* Creates sale item records
* Reduces inventory

---

## Receipt System

Working:

* Receipt screen
* Sale summary
* Print button
* Email button
* New Sale workflow

Current print support:

* Browser print dialog

Future target:

* 58mm Bluetooth thermal printer

Printer candidate:

NETUM portable Bluetooth thermal receipt printer.

---

## Sales History

Working:

* Date range search
* Revenue totals
* Transaction totals
* Individual transaction detail view

Users can:

* Select date range
* View transactions
* Open transaction details
* View line items sold

---

# Current State

The POS side is largely functional.

A vendor could currently:

* Add products
* Track inventory
* Make sales
* Print receipts
* View sales history

The remaining work is primarily refinement and storefront development.

---

# Immediate Next Goal

## Product Images

Current:

image_url text field

Future:

Server-hosted image uploads.

Target structure:

/uploads/products/

Database stores file path rather than external URL.

Benefits:

* Self-hosted
* No third-party dependencies
* Easier management

---

# Next Major Goal

## Public Storefront

Create:

/store

Only display products where:

* is_active = true
* is_public = true
* quantity_on_hand > 0

Display:

* Product image
* Product name
* Public description
* Price
* Availability

Responsive design:

* Mobile
* Tablet
* Desktop

---

# Future Roadmap

## Storefront V1

* Product catalog
* Product detail page
* Responsive layout

## Storefront V2

* Shopping cart
* Shipping information
* Online ordering

## Business Features

* Event calendar
* Vendor schedule
* Featured products

## Receipt Improvements

* Thermal printer formatting
* Store branding
* QR code to storefront

## Administration

* Authentication
* User accounts
* Role permissions

---

# Long-Term Vision

A single self-hosted platform that manages:

* Inventory
* Vendor sales
* Online sales
* Product catalog
* Event information
* Customer engagement

with QR codes linking customers directly from physical products and events to the online storefront.


Implement server-hosted product image uploads using FastAPI, PostgreSQL, Docker, and React. Store uploaded files on disk, store file paths in PostgreSQL, and add image upload controls to the Products admin page.

Current Development Rules

- Prefer incremental changes over refactors.
- Do not rewrite working systems.
- Preserve existing database structure when possible.
- Prioritize business features over architecture cleanup.
- All new features should be compatible with eventual storefront use.