import { useState } from "react";
import UploadScreen from "./components/UploadScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  const [entries, setEntries] = useState(null);

  if (entries) {
    return <Dashboard entries={entries} onReset={() => setEntries(null)} />;
  }

  return <UploadScreen onParsed={setEntries} />;
}
