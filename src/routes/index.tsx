import { createFileRoute } from "@tanstack/react-router";
import { Provider } from "react-redux";
import { store } from "@/store";
import { ComplaintForm } from "@/components/ComplaintForm";
import { AiPanel } from "@/components/AiPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Log Customer Complaint | Pharma QMS AI Intake" },
      {
        name: "description",
        content:
          "AI-powered customer complaint intake for API & FDF pharmaceutical manufacturing: extract complaint data from emails or documents and get instant QMS risk assessment.",
      },
      { property: "og:title", content: "Log Customer Complaint | Pharma QMS AI Intake" },
      {
        property: "og:description",
        content:
          "Upload a complaint email or document and let AI populate the QMS complaint form with risk, root cause and CAPA recommendations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Provider store={store}>
      <main className="min-h-screen bg-background">
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(380px,1fr)]">
          <ComplaintForm />
          <AiPanel />
        </div>
      </main>
    </Provider>
  );
}
