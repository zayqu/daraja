import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-dark-gray text-white py-4 px-6 fixed w-full top-0 z-10 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <img src="/logo.png" alt="DAR AJA Logo" className="h-10 mr-2" />
          <span className="text-xl font-bold">DAR AJA</span>
        </div>
        <nav>
          <ul className="flex space-x-6">
            <li><Link to="/" className="hover:text-teal">Home</Link></li>
            <li><a href="#services" className="hover:text-teal">Services</a></li>
            <li><a href="#portfolio" className="hover:text-teal">Portfolio</a></li>
            <li><a href="#jobs" className="hover:text-teal">Jobs</a></li>
            <li><a href="#cv-builder" className="hover:text-teal">CV Builder</a></li>
            <li><a href="#contact" className="hover:text-teal">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;