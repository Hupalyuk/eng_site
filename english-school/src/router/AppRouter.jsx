import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/blog" element={<Blog />} />
      </Routes>
    </BrowserRouter>
  );
}