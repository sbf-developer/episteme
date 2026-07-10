import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { NotesPage } from "@/pages/NotesPage";
import { NoteEditorPage } from "@/pages/NoteEditorPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { ActionsPage } from "@/pages/ActionsPage";
import { GraphPage } from "@/pages/GraphPage";
import { AiPage } from "@/pages/AiPage";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/notes/:id" element={<NoteEditorPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/actions" element={<ActionsPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/ai" element={<AiPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
