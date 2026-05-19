import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, RouterProvider } from "react-router-dom" 
import CoOccurrenceGraph from './features/CoOccurrence.jsx'
import GeofenceAlerts from './features/GeofenceAlerts.jsx'
import HeatmapView from './features/HeatmapView.jsx'
import NotificationsPanel from './features/NotificationsPanel.jsx'
const router = createBrowserRouter([
  {
    path: '/',
    element: <App/>,
    // children: [
    //   {
    //     path: "",
    //     element: <Home />
    //   },
    //   {
    //     path: "about",
    //     element: <About />
    //   },
    //   {
    //     path: "contact",
    //     element: <Contact />
    //   }
    // ]
  },
  {
    path: '/a',
    element: <CoOccurrenceGraph />
  },
  {
    path: '/b',
    element: <GeofenceAlerts />
  },
  {
    path: '/c',
    element: <HeatmapView />
  },
  {
    path: '/d',
    element: <NotificationsPanel />
  }
])
createRoot(document.getElementById('root')).render(
  <StrictMode>
      <RouterProvider router={router} />
  </StrictMode>
)
