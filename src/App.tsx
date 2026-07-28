import Navbar from "./components/navbar";
import FormList from "./pages/formlist";
import Home from "./pages/homepage";

function App() {
  return (
    <div className="bg-second min-h-screen">
      <Navbar />
      <Home />
      <FormList />
    </div>
  );
}

export default App;