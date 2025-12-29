import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-dark-gray text-white py-8 px-6">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <img src="/logo.png" alt="DAR AJA Logo" className="h-8 mr-2" />
          <span className="text-lg font-bold">DAR AJA</span>
        </div>
        <p className="mb-4 md:mb-0">&copy; 2023 DAR AJA. All rights reserved.</p>
        <div className="flex space-x-4">
          <a href="#" className="hover:text-teal">Facebook</a>
          <a href="#" className="hover:text-teal">Twitter</a>
          <a href="#" className="hover:text-teal">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;