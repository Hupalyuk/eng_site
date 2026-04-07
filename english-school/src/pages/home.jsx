// src/pages/Home.jsx
import React from "react";

function Home() {
  return (
    <main className="home">
      <section className="home-hero">

        <div className="home-hero-body" id="home">
          <div className="home-hero-copy">
            <h1>
              <span className="home-eyebrow">Studying </span>
               Online is now much easier
            </h1>
            <p className="home-hero-desc">
              TOTC is an interesting platform that will teach you in a more interactive way.
            </p>
            <button className="btn btn-accent">Join for free</button>
          </div>
          <div className="home-hero-media" aria-hidden="true">
            <div className="home-hero-image">
              <img src="/images/home/student2.png" alt="Student" />
            </div>
          </div>
        </div>

        <div className="home-hero-curve" aria-hidden="true"></div>
      </section>

      <section className="cloud" id="courses">
        <p className="cloud-title">All-In-One Cloud Software.</p>
        <p className="cloud-sub">
          TOTC is one powerful online software suite that combines all the tools needed to run a successful school or office.
        </p>

        <div className="cloud-cards">
          <article className="cloud-card">
            <div className="icon badge-purple">ðŸ“„</div>
            <h3>Online Billing, Invoicing, &amp; Contracts</h3>
            <p>
              Simple and secure control of your organization's financial and legal transactions. Send customized invoices and contracts.
            </p>
          </article>
          <article className="cloud-card">
            <div className="icon badge-teal">ðŸ“…</div>
            <h3>Easy Scheduling &amp; Attendance Tracking</h3>
            <p>
              Schedule and reserve classrooms at one campus or multiple campuses. Keep detailed records of student attendance.
            </p>
          </article>
          <article className="cloud-card">
            <div className="icon badge-blue">ðŸ‘¥</div>
            <h3>Customer Tracking</h3>
            <p>
              Automate and track emails to individuals or groups. Skilline's built-in system helps organize your organization.
            </p>
          </article>
        </div>
      </section>

      <section className="about" id="about">
        <h2>What is TOTC?</h2>
        <p>
          TOTC is a platform that allows educators to create online classes whereby
          they can store the course materials online; manage assignments, quizzes
          and exams; monitor due dates, grade results and provide students with
          feedback all in one place.
        </p>
      </section>

      {/* Features Sections */}
      <section className="features" id="features">
        <div className="features-head">
          <h2>Our <span>Features</span></h2>
          <p>This very extraordinary feature can make learning activities more efficient</p>
        </div>

        <div className="features-body">
          <div className="feature-media" aria-hidden="true">
            <div className="feature-image">
              <img src="/images/home/user-interface.png" alt="user-interface" />
            </div>
          </div>

          <div className="feature-copy">
            <h3>A <span>user interface</span> designed for the classroom</h3>
            <ul>
              <li>
                <span className="dot dot-purple"></span>
                <p>Teachers donâ€™t get lost in the grid view and have a dedicated Podium space.</p>
              </li>
              <li>
                <span className="dot dot-orange"></span>
                <p>TAâ€™s and presenters can be moved to the front of the class.</p>
              </li>
              <li>
                <span className="dot dot-indigo"></span>
                <p>Teachers can easily see all students and class data at one time.</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-body">
          <div className="feature-copy-2">
            <h3>A <span>user interface</span> designed for the classroom</h3>
            <p>
              Class has a dynamic set of teaching tools built to be deployed and used during class.
              Teachers can handout assignments in real-time for students to complete and submit.
            </p>
          </div>

          <div className="feature-media" aria-hidden="true">
            <div className="feature-image">
              <img src="/images/home/student2.png" alt="student2" />
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-body">
          <div className="feature-media" aria-hidden="true">
            <div className="feature-image">
              <img src="/images/home/tests.png" alt="tests" />
            </div>
          </div>

          <div className="feature-copy-2">
            <h3>Assessments <span>Quizzes</span>, Tests</h3>
            <p>
              Easily launch live assignments, quizzes, and tests.
              Student results are automatically entered in the online gradebook.
            </p>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-body">
          <div className="feature-copy-2">
            <h3><span>Class Management</span> Tools for Educators</h3>
            <p>
              Class provides tools to help run and manage the class such as Class Roster, Attendance, and more. 
              With the Gradebook, teachers can review and grade tests and quizzes in real-time.
            </p>
          </div>

          <div className="feature-media" aria-hidden="true">
            <div className="feature-image">
              <img src="/images/home/gradebook.png" alt="gradebook" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
