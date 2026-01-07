import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./modules/components/ProtectedRoute";
import { AppLayout } from "./modules/components/AppLayout";
import { LoginPage } from "./modules/pages/LoginPage";
import { RegisterPage } from "./modules/pages/RegisterPage";
import { MapPage } from "./modules/pages/MapPage";
import { ListPage } from "./modules/pages/ListPage";
import { PlaceDetailPage } from "./modules/pages/PlaceDetailPage";
import { AddPlacePage } from "./modules/pages/AddPlacePage";
import { GroupPage } from "./modules/pages/GroupPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/map" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="map" element={<MapPage />} />
        <Route path="list" element={<ListPage />} />
        <Route path="place/:id" element={<PlaceDetailPage />} />
        <Route path="add" element={<AddPlacePage />} />
        <Route path="group" element={<GroupPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/map" replace />} />
    </Routes>
  );
}
