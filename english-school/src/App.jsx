import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/home.jsx";
import Blog from "./pages/blog.jsx";
import Login from "./pages/login.jsx";
import Sign from "./pages/sign.jsx";
import CreatePost from "./pages/create-post.jsx";
import EditPost from "./pages/edit-post.jsx";
import Courses from "./pages/courses.jsx";
import CourseEnroll from "./pages/course-enroll.jsx";
import ClassPage from "./pages/class.jsx";
import AdminUsers from "./pages/admin-users.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId/enroll" element={<CourseEnroll />} />
          <Route path="/class" element={<ClassPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/edit-post/:id" element={<EditPost />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Sign />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
