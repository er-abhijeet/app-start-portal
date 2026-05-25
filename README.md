# AI Photo Gallery - Web Portal

This repository contains the web portal for the AI Photo Gallery system. Built with React and Vite, this portal provides a geographic visualization layer, allowing administrators or users to view photos mapped out based on where they were taken.

## 🗺️ Features

- **Interactive Maps:** Integrates `Leaflet` and `react-leaflet` to render a dynamic, navigable world map.
- **Location Heatmaps:** Utilizes `leaflet.heat` to visually cluster and display the density of photos taken in specific geographic areas.
- **Fast Performance:** Bootstrapped with Vite for instant server start and lightning-fast Hot Module Replacement (HMR).
- **Responsive Web Design:** Ensures the map and dashboard are fully accessible on desktop and tablet browsers.

## 🛠️ Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite
- **Mapping:** Leaflet, React-Leaflet, Leaflet.heat
- **Routing:** React Router DOM

## 🚀 Getting Started

### Prerequisites
- Node.js
- npm or yarn

### Installation

1. Clone this repository.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the local server URL provided in the terminal (usually `http://localhost:5173`).

## 🧩 How it connects to the system
This is **3 of 3** repositories in the AI Photo Gallery ecosystem. 
- It consumes data generated and processed by the **Backend Server**.
- It complements the **Mobile App** by offering a top-down, map-based perspective of the user's photo collection and system activity.
