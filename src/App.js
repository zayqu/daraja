import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Portfolio from './components/Portfolio';
import Jobs from './components/Jobs';
import CVBuilder from './components/CVBuilder';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import BackToTop from './components/BackToTop';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Header />
        <div className="pt-16"> {/* Add padding to account for fixed header */}
          <Routes>
            <Route path="/" element={
              <>
                <Hero />
                <Services />
                <Portfolio />
                <Jobs />
                <CVBuilder />
                <Testimonials />
                <Contact />
              </>
            } />
          </Routes>
        </div>
        <Footer />
        <BackToTop />
      </div>
    </Router>
  );
}

export default App;

