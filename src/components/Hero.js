import React from 'react';

const Hero = () => {
  return (
    <section className="bg-gradient-to-r from-teal to-dark-gray text-white py-20 px-6">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">Creative Solutions for Your Career & Business</h1>
        <p className="text-xl mb-8">Unlock your potential with our web design, graphic design, jobs platform, and CV building services.</p>
        <div className="space-x-4">
          <button className="bg-white text-teal px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">Get Started</button>
          <button className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-teal">See Services</button>
        </div>
      </div>
    </section>
  );
};

export default Hero;