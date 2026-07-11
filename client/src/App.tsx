import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { NotesPage } from "@/pages/NotesPage";
import { NoteEditorPage } from "@/pages/NoteEditorPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { GraphPage } from "@/pages/GraphPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { AiPage } from "@/pages/AiPage";
import { KpisPage } from "@/pages/KpisPage";
import { DoListPage } from "@/pages/DoListPage";
import { OnboardingPage } from "@/pages/OnboardingPage";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/notes/:id" element={<NoteEditorPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/kpis" element={<KpisPage />} />
              <Route path="/do-list" element={<DoListPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/ai" element={<AiPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
